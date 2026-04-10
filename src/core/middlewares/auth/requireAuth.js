import { getUserFromAuthToken } from '../../../services/sessionService';

const getAuthTokenFromRequest = (req) => {
	const cookieToken = String(req.cookies?.auth || '').trim();
	if (cookieToken) {
		return cookieToken;
	}

	const headerToken = String(req.headers?.['x-auth-token'] || req.headers?.authorization || '').trim();
	if (!headerToken) {
		return '';
	}

	if (headerToken.toLowerCase().startsWith('bearer ')) {
		return headerToken.slice(7).trim();
	}

	return headerToken;
};

const expectsJsonResponse = (req) => {
	const acceptHeader = String(req.headers?.accept || '').toLowerCase();
	return req.path.startsWith('/api/') || req.path.startsWith('/wowpay/') || acceptHeader.includes('application/json') || req.xhr;
};

const denyUnauthorized = (req, res, message = 'Authorization required') => {
	if (expectsJsonResponse(req)) {
		return res.status(200).json({
			message,
			status: false,
			redirect: '/login',
		});
	}

	return res.redirect('/login');
};

const requireAuth = async (req, res, next) => {
	const authToken = getAuthTokenFromRequest(req);
	if (!authToken) {
		return denyUnauthorized(req, res);
	}

	try {
		const user = await getUserFromAuthToken(authToken, { requireActive: true });
		if (!user) {
			return denyUnauthorized(req, res);
		}

		req.authUser = user;
		res.locals.authUser = user;
		return next();
	} catch (error) {
		console.log('requireAuth error', error);
		return denyUnauthorized(req, res);
	}
};

export default requireAuth;

