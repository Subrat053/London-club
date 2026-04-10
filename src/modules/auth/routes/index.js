import connection from '../../../config/connectDB';
import jwt from 'jsonwebtoken';
import md5 from 'md5';
import { requireAuth } from '../../../core/middlewares/auth';
import googleAuthService from '../../../services/googleAuthService';

const randomString = (length) => {
	let result = '';
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
	for (let i = 0; i < length; i += 1) {
		result += characters.charAt(Math.floor(Math.random() * characters.length));
	}
	return result;
};

const randomNumber = (min, max) => String(Math.floor(Math.random() * (max - min + 1)) + min);

const ipAddress = (req) => {
	if (req.headers['x-forwarded-for']) {
		return req.headers['x-forwarded-for'].split(',')[0];
	}
	if (req.connection && req.connection.remoteAddress) {
		return req.connection.remoteAddress;
	}
	return req.ip || '127.0.0.1';
};

const createAuthTokens = async (user) => {
	const timeNow = Date.now();
	const secret = process.env.JWT_ACCESS_TOKEN || 'baba-games-jwt-secret';
	const { password, money, ip, veri, ip_address, status, time, ...others } = user;
	const accessToken = jwt.sign(
		{
			user: { ...others },
			timeNow,
		},
		secret,
		{ expiresIn: '1d' }
	);

	const tokenHash = md5(accessToken);
	await connection.query(
		'UPDATE users SET token = ?, last_login = ?, status = 1, veri = 1 WHERE id = ?',
		[tokenHash, timeNow, user.id]
	);

	return {
		accessToken,
		tokenHash,
		timeNow,
	};
};

const generateUniqueCode = async () => {
	for (let i = 0; i < 8; i += 1) {
		const code = `G${randomString(2).toUpperCase()}${randomNumber(10000, 99999)}`;
		const [rows] = await connection.query('SELECT id FROM users WHERE code = ? LIMIT 1', [code]);
		if (!rows.length) {
			return code;
		}
	}

	return `G${Date.now().toString().slice(-8)}`;
};

const upsertGoogleUser = async (googleProfile, req) => {
	const email = String(googleProfile.email || '').trim().toLowerCase();
	const googleId = String(googleProfile.googleId || '').trim();
	const displayName = String(googleProfile.name || email.split('@')[0] || `Member${randomNumber(1000, 9999)}`);
	const avatarUrl = String(googleProfile.picture || '').trim();
	const loginTime = Date.now();
	const timeString = String(loginTime);

	const [existingRows] = await connection.query(
		'SELECT * FROM users WHERE google_id = ? OR email = ? LIMIT 1',
		[googleId, email]
	);

	if (existingRows.length) {
		const user = existingRows[0];
		await connection.query(
			`UPDATE users
			 SET google_id = ?,
				 email = ?,
				 auth_provider = 'google',
				 email_verified = '1',
				 full_name = ?,
				 avatar_url = ?,
				 status = 1,
				 veri = 1,
				 last_login = ?
			 WHERE id = ?`,
			[googleId, email, displayName, avatarUrl, loginTime, user.id]
		);

		const [updatedRows] = await connection.query('SELECT * FROM users WHERE id = ? LIMIT 1', [user.id]);
		return updatedRows[0];
	}

	const idUser = randomNumber(10000, 99999);
	const code = await generateUniqueCode();
	const passwordSeed = md5(`${googleId}:${email}:${loginTime}`);

	const [insertResult] = await connection.query(
		`INSERT INTO users (
			id_user,
			phone,
			google_id,
			email,
			auth_provider,
			email_verified,
			phone_verified,
			is_profile_completed,
			token,
			name_user,
			full_name,
			avatar_url,
			password,
			plain_password,
			money,
			total_money,
			vip_level,
			roses_f1,
			roses_f,
			roses_today,
			level,
			is_admin,
			is_manager,
			rank,
			code,
			invite,
			ctv,
			veri,
			otp,
			ip_address,
			status,
			today,
			time,
			time_otp,
			user_level,
			last_login
		) VALUES (?, ?, ?, ?, 'google', '1', '0', '0', ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0, '0', '0', 0, ?, '0', '0', 1, '000000', ?, 1, NOW(), ?, ?, 0, ?)`,
		[
			idUser,
			null,
			googleId,
			email,
			'',
			displayName,
			displayName,
			avatarUrl,
			passwordSeed,
			'',
			code,
			ipAddress(req),
			timeString,
			timeString,
			loginTime,
		]
	);

	const [rows] = await connection.query('SELECT * FROM users WHERE id = ? LIMIT 1', [insertResult.insertId]);
	return rows[0];
};

const googleSignIn = async (req, res) => {
	try {
		const idToken = String(
			req.body?.credential || req.body?.idToken || req.body?.googleToken || ''
		).trim();

		if (!idToken) {
			return res.status(200).json({
				message: 'Google credential is required',
				status: false,
			});
		}

		const googleProfile = await googleAuthService.verifyGoogleIdToken(idToken);
		if (!googleProfile?.email || !googleProfile?.googleId) {
			return res.status(200).json({
				message: 'Invalid Google account payload',
				status: false,
			});
		}

		const user = await upsertGoogleUser(googleProfile, req);
		const session = await createAuthTokens(user);

		// Keep compatibility with existing frontend expectations (`token` + `auth`).
		res.cookie('token', session.accessToken, { maxAge: 24 * 60 * 60 * 1000, path: '/' });
		res.cookie('auth', session.tokenHash, { maxAge: 24 * 60 * 60 * 1000, path: '/' });
		res.clearCookie('admin_auth', { path: '/' });

		return res.status(200).json({
			message: 'Login Successfully!',
			status: true,
			token: session.accessToken,
			value: session.tokenHash,
			provider: 'google',
		});
	} catch (error) {
		console.log('googleSignIn error', error);
		return res.status(200).json({
			message: 'Google sign-in failed',
			status: false,
		});
	}
};

const logout = async (req, res) => {
	try {
		const authToken = String(req.cookies?.auth || '').trim();
		if (authToken) {
			await connection.query('UPDATE users SET token = ? WHERE token = ?', ['', authToken]);
		}
	} catch (error) {
		console.log('logout error', error);
	}

	res.clearCookie('token', { path: '/' });
	res.clearCookie('auth', { path: '/' });
	res.clearCookie('admin_auth', { path: '/' });

	if (req.path === '/admin/logout') {
		return res.redirect('/admin/login');
	}

	if (req.path === '/logout') {
		return res.redirect('/login');
	}

	return res.status(200).json({
		message: 'Logout successfully',
		status: true,
	});
};

const legacyLoginProxy = async (req, res) => {
	const hasGoogleCredential = Boolean(req.body?.credential || req.body?.idToken || req.body?.googleToken);

	if (hasGoogleCredential) {
		return googleSignIn(req, res);
	}

	return res.status(200).json({
		message: 'Only Google sign-in is enabled. Please continue with Google.',
		status: false,
	});
};

const sendCompleteProfileOtp = async (req, res) => {
	try {
		const user = req.authUser;
		const phone = String(req.body?.phone || '').trim();

		if (!/^\d{9,10}$/.test(phone)) {
			return res.status(200).json({
				message: 'phone error',
				status: false,
			});
		}

		const [takenPhoneRows] = await connection.query(
			'SELECT id FROM users WHERE phone = ? AND id <> ? AND veri = 1 LIMIT 1',
			[phone, user.id]
		);

		if (takenPhoneRows.length) {
			return res.status(200).json({
				message: 'Phone number already in use',
				status: false,
			});
		}

		const otp = randomNumber(100000, 999999);
		const timeEnd = Date.now() + (2 * 60 * 1000);

		await connection.query(
			'UPDATE users SET phone = ?, otp = ?, time_otp = ? WHERE id = ?',
			[phone, otp, String(timeEnd), user.id]
		);

		return res.status(200).json({
			message: 'OTP sent successfull',
			status: true,
			timeEnd,
		});
	} catch (error) {
		console.log('sendCompleteProfileOtp error', error);
		return res.status(200).json({
			message: 'Something went wrong.',
			status: false,
		});
	}
};

const completeGoogleProfile = async (req, res) => {
	try {
		const user = req.authUser;
		const phone = String(req.body?.phone || '').trim();
		const otp = String(req.body?.otp || '').trim();

		if (!/^\d{9,10}$/.test(phone) || !/^\d{6}$/.test(otp)) {
			return res.status(200).json({
				message: 'Invalid phone or OTP',
				status: false,
			});
		}

		const [rows] = await connection.query(
			'SELECT id, otp, time_otp, phone FROM users WHERE id = ? LIMIT 1',
			[user.id]
		);

		if (!rows.length) {
			return res.status(200).json({
				message: 'Account not found',
				status: false,
			});
		}

		const row = rows[0];
		const now = Date.now();
		const expiresAt = Number(row.time_otp || 0);

		if (row.phone !== phone || String(row.otp) !== otp || !expiresAt || expiresAt < now) {
			return res.status(200).json({
				message: 'OTP code is incorrect or expired',
				status: false,
			});
		}

		await connection.query(
			`UPDATE users
			 SET phone_verified = '1',
				 is_profile_completed = '1',
				 veri = 1,
				 otp = '000000'
			 WHERE id = ?`,
			[user.id]
		);

		return res.status(200).json({
			message: 'Profile completed successfully',
			status: true,
			redirect: '/home',
		});
	} catch (error) {
		console.log('completeGoogleProfile error', error);
		return res.status(200).json({
			message: 'Unable to complete profile',
			status: false,
		});
	}
};

const registerAuthRoutes = (router) => {
	// Google-first sign-in routes.
	router.post('/api/webapi/auth/google', googleSignIn);
	router.post('/api/auth/google', googleSignIn);
	router.post('/api/webapi/admin/login', legacyLoginProxy);
	router.post('/api/admin/login', legacyLoginProxy);

	// Keep the legacy login URL but enforce Google-only sign-in.
	router.post('/api/webapi/login', legacyLoginProxy);

	// Profile completion flow for Google users (bind phone, wallet unlock).
	router.get('/BindPhone', requireAuth, (req, res) => res.render('account/bindPhone.ejs'));
	router.post('/api/webapi/auth/complete-profile/send-otp', requireAuth, sendCompleteProfileOtp);
	router.post('/api/webapi/auth/complete-profile', requireAuth, completeGoogleProfile);

	// Logout aliases
	router.post('/api/webapi/logout', logout);
	router.post('/api/auth/logout', logout);
	router.get('/logout', logout);
	router.get('/admin/logout', logout);
};

export {
	registerAuthRoutes,
};

