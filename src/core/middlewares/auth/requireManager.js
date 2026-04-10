import { getUserFromAuthToken, isManagerUser } from '../../../services/sessionService';

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
	return req.path.startsWith('/api/') || acceptHeader.includes('application/json') || req.xhr;
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

const denyForbidden = (req, res, message = 'Manager access required') => {
	if (expectsJsonResponse(req)) {
		return res.status(200).json({
			message,
			status: false,
		});
	}

	return res.redirect('/home');
};

const requireManager = async (req, res, next) => {
	const authToken = getAuthTokenFromRequest(req);
	if (!authToken) {
		return denyUnauthorized(req, res);
	}

	try {
		const user = await getUserFromAuthToken(authToken, { requireActive: true });
		if (!user) {
			return denyUnauthorized(req, res);
		}

		if (!isManagerUser(user)) {
			return denyForbidden(req, res);
		}

		req.authUser = user;
		res.locals.authUser = user;
		return next();
	} catch (error) {
		console.log('requireManager error', error);
		return denyUnauthorized(req, res);
	}
};

export default requireManager;

