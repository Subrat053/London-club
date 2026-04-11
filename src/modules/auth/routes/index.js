import connection from '../../../config/connectDB';
import jwt from 'jsonwebtoken';
import md5 from 'md5';
import { requireAuth } from '../../../core/middlewares/auth';
import googleAuthService from '../../../services/googleAuthService';
import { isAdminUser } from '../../../services/sessionService';

const randomString = (length) => {
	let result = '';
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
	for (let i = 0; i < length; i += 1) {
		result += characters.charAt(Math.floor(Math.random() * characters.length));
	}
	return result;
};

const randomNumber = (min, max) => String(Math.floor(Math.random() * (max - min + 1)) + min);

const isBadFieldError = (error) => error?.code === 'ER_BAD_FIELD_ERROR';

const GOOGLE_SCHEMA_COLUMNS = [
	'google_id',
	'email',
	'auth_provider',
	'email_verified',
	'phone_verified',
	'is_profile_completed',
	'full_name',
	'avatar_url',
	'last_login',
	'is_admin',
	'is_manager',
];

const isGoogleSchemaMigrationError = (error) => {
	if (!isBadFieldError(error)) {
		return false;
	}

	const message = String(error?.sqlMessage || error?.message || '').toLowerCase();
	return GOOGLE_SCHEMA_COLUMNS.some((column) => message.includes(column));
};

const hasGoogleClientId = () => Boolean(String(process.env.GOOGLE_CLIENT_ID || '').trim());

const googleSetupErrorMessage = 'Google sign-in server setup incomplete. Set GOOGLE_CLIENT_ID and run Google auth migrations.';

const isPhoneNullConstraintError = (error) => {
	if (error?.code !== 'ER_BAD_NULL_ERROR') {
		return false;
	}

	const message = String(error?.sqlMessage || error?.message || '').toLowerCase();
	return message.includes('phone');
};

const createGooglePlaceholderPhone = () => `g${Date.now().toString().slice(-8)}${randomNumber(1000, 9999)}`;

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

const setAuthCookies = (res, session) => {
	res.cookie('token', session.accessToken, { maxAge: 24 * 60 * 60 * 1000, path: '/' });
	res.cookie('auth', session.tokenHash, { maxAge: 24 * 60 * 60 * 1000, path: '/' });
	res.clearCookie('admin_auth', { path: '/' });
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

const findExistingGoogleUser = async (googleId, email) => {
	try {
		const [rows] = await connection.query(
			'SELECT * FROM users WHERE google_id = ? OR email = ? LIMIT 1',
			[googleId, email]
		);
		return rows[0] || null;
	} catch (error) {
		if (!isBadFieldError(error)) {
			throw error;
		}
	}

	try {
		const [fallbackRows] = await connection.query(
			'SELECT * FROM users WHERE email = ? LIMIT 1',
			[email]
		);
		return fallbackRows[0] || null;
	} catch (error) {
		if (!isBadFieldError(error)) {
			throw error;
		}
	}

	return null;
};

const insertGoogleUser = async ({ idUser, phone, googleId, email, displayName, avatarUrl, passwordSeed, code, requestIp, timeString, loginTime }) => {
	return connection.query(
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
			phone,
			googleId,
			email,
			'',
			displayName,
			displayName,
			avatarUrl,
			passwordSeed,
			'',
			code,
			requestIp,
			timeString,
			timeString,
			loginTime,
		]
	);
};

const upsertGoogleUser = async (googleProfile, req) => {
	const email = String(googleProfile.email || '').trim().toLowerCase();
	const googleId = String(googleProfile.googleId || '').trim();
	const displayName = String(googleProfile.name || email.split('@')[0] || `Member${randomNumber(1000, 9999)}`);
	const avatarUrl = String(googleProfile.picture || '').trim();
	const loginTime = Date.now();
	const timeString = String(loginTime);
	const requestIp = ipAddress(req);

	const existingUser = await findExistingGoogleUser(googleId, email);

	if (existingUser) {
		try {
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
				[googleId, email, displayName, avatarUrl, loginTime, existingUser.id]
			);
		} catch (error) {
			if (!isBadFieldError(error)) {
				throw error;
			}
		}

		const [updatedRows] = await connection.query('SELECT * FROM users WHERE id = ? LIMIT 1', [existingUser.id]);
		return updatedRows[0];
	}

	const idUser = randomNumber(10000, 99999);
	const code = await generateUniqueCode();
	const passwordSeed = md5(`${googleId}:${email}:${loginTime}`);
	let insertId = null;

	try {
		const [insertResult] = await insertGoogleUser({
			idUser,
			phone: null,
			googleId,
			email,
			displayName,
			avatarUrl,
			passwordSeed,
			code,
			requestIp,
			timeString,
			loginTime,
		});

		insertId = insertResult.insertId;
	} catch (error) {
		if (isPhoneNullConstraintError(error)) {
			const [insertResult] = await insertGoogleUser({
				idUser,
				phone: createGooglePlaceholderPhone(),
				googleId,
				email,
				displayName,
				avatarUrl,
				passwordSeed,
				code,
				requestIp,
				timeString,
				loginTime,
			});

			insertId = insertResult.insertId;
		} else if (error?.code === 'ER_DUP_ENTRY') {
			const racedUser = await findExistingGoogleUser(googleId, email);
			if (racedUser) {
				return racedUser;
			}

			throw error;
		} else {
			throw error;
		}
	}

	const [rows] = await connection.query('SELECT * FROM users WHERE id = ? LIMIT 1', [insertId]);
	return rows[0];
};

const googleSignIn = async (req, res) => {
	try {
		if (!hasGoogleClientId()) {
			return res.status(200).json({
				message: googleSetupErrorMessage,
				status: false,
			});
		}

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
		if (!googleProfile?.email) {
			return res.status(200).json({
				message: 'Invalid Google account payload',
				status: false,
			});
		}

		const normalizedProfile = {
			...googleProfile,
			email: String(googleProfile.email || '').trim().toLowerCase(),
			googleId: String(googleProfile.googleId || md5(String(googleProfile.email || '').trim().toLowerCase())).trim(),
		};

		const user = await upsertGoogleUser(normalizedProfile, req);
		const session = await createAuthTokens(user);

		// Keep compatibility with existing frontend expectations (`token` + `auth`).
		setAuthCookies(res, session);

		return res.status(200).json({
			message: 'Login Successfully!',
			status: true,
			token: session.accessToken,
			value: session.tokenHash,
			provider: 'google',
		});
	} catch (error) {
		console.log('googleSignIn error', error);
		if (isGoogleSchemaMigrationError(error)) {
			return res.status(200).json({
				message: 'Database migration missing for Google login. Run 20260408_google_auth_users.sql, 20260409_email_centric_users.sql, and 20260409_role_flags_users.sql.',
				status: false,
			});
		}

		return res.status(200).json({
			message: 'Google sign-in failed',
			status: false,
		});
	}
};

const findUserByLoginIdentifier = async (identifier) => {
	const normalizedIdentifier = String(identifier || '').trim();
	if (!normalizedIdentifier) {
		return null;
	}

	try {
		const [rows] = await connection.query(
			`SELECT * FROM users
			 WHERE email = ? OR phone = ? OR code = ? OR id_user = ? OR CAST(id AS CHAR) = ?
			 LIMIT 1`,
			[
				normalizedIdentifier,
				normalizedIdentifier,
				normalizedIdentifier,
				normalizedIdentifier,
				normalizedIdentifier,
			]
		);
		return rows[0] || null;
	} catch (error) {
		if (!isBadFieldError(error)) {
			throw error;
		}
	}

	const [fallbackRows] = await connection.query(
		`SELECT * FROM users
		 WHERE phone = ? OR code = ? OR id_user = ? OR CAST(id AS CHAR) = ?
		 LIMIT 1`,
		[
			normalizedIdentifier,
			normalizedIdentifier,
			normalizedIdentifier,
			normalizedIdentifier,
		]
	);
	return fallbackRows[0] || null;
};

const isPasswordMatch = (user, plainPassword) => {
	const normalizedPlain = String(plainPassword || '');
	if (!normalizedPlain) {
		return false;
	}

	const hashed = md5(normalizedPlain);
	return String(user?.password || '') === hashed || String(user?.plain_password || '') === normalizedPlain;
};

const adminLogin = async (req, res) => {
	try {
		const hasGoogleCredential = Boolean(req.body?.credential || req.body?.idToken || req.body?.googleToken);
		if (hasGoogleCredential) {
			if (!hasGoogleClientId()) {
				return res.status(200).json({
					message: googleSetupErrorMessage,
					status: false,
				});
			}

			const idToken = String(req.body?.credential || req.body?.idToken || req.body?.googleToken || '').trim();
			const googleProfile = await googleAuthService.verifyGoogleIdToken(idToken);

			if (!googleProfile?.email) {
				return res.status(200).json({
					message: 'Invalid Google account payload',
					status: false,
				});
			}

			const normalizedProfile = {
				...googleProfile,
				email: String(googleProfile.email || '').trim().toLowerCase(),
				googleId: String(googleProfile.googleId || md5(String(googleProfile.email || '').trim().toLowerCase())).trim(),
			};

			const user = await upsertGoogleUser(normalizedProfile, req);
			if (!isAdminUser(user)) {
				return res.status(200).json({
					message: 'Admin access required',
					status: false,
				});
			}

			const session = await createAuthTokens(user);
			setAuthCookies(res, session);

			return res.status(200).json({
				message: 'Login Successfully!',
				status: true,
				token: session.accessToken,
				value: session.tokenHash,
				provider: 'google',
			});
		}

		const identifier = String(req.body?.identifier || req.body?.email || req.body?.phone || '').trim();
		const password = String(req.body?.password || req.body?.pwd || '').trim();

		if (!identifier || !password) {
			return res.status(200).json({
				message: 'Email/phone and password are required',
				status: false,
			});
		}

		const user = await findUserByLoginIdentifier(identifier);
		if (!user || !isPasswordMatch(user, password)) {
			return res.status(200).json({
				message: 'Invalid credentials',
				status: false,
			});
		}

		if (!isAdminUser(user)) {
			return res.status(200).json({
				message: 'Admin access required',
				status: false,
			});
		}

		if (Number(user.status || 0) !== 1) {
			return res.status(200).json({
				message: 'Account is disabled',
				status: false,
			});
		}

		const session = await createAuthTokens(user);
		setAuthCookies(res, session);

		return res.status(200).json({
			message: 'Login Successfully!',
			status: true,
			token: session.accessToken,
			value: session.tokenHash,
			provider: 'password',
		});
	} catch (error) {
		console.log('adminLogin error', error);
		if (isGoogleSchemaMigrationError(error)) {
			return res.status(200).json({
				message: 'Database migration missing for Google login. Run 20260408_google_auth_users.sql, 20260409_email_centric_users.sql, and 20260409_role_flags_users.sql.',
				status: false,
			});
		}

		return res.status(200).json({
			message: 'Admin login failed',
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
	router.post('/api/webapi/admin/login', adminLogin);
	router.post('/api/admin/login', adminLogin);

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

