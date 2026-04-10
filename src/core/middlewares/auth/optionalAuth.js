import { getUserFromAuthToken } from '../../../services/sessionService';

const optionalAuth = async (req, res, next) => {
    const auth = req.cookies?.auth;
    if (!auth) {
        req.authUser = null;
        return next();
    }

    try {
        const user = await getUserFromAuthToken(auth, { requireActive: true });
        req.authUser = user || null;
    } catch (error) {
        req.authUser = null;
    }

    return next();
};

export default optionalAuth;
