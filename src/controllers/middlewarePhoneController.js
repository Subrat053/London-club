import { getUserFromAuthToken } from '../services/sessionService';

const unauthorizedMessage = 'Unauthorized';

const requireVerifiedPhoneApi = async (req, res, next) => {
    try {
        const auth = req.cookies?.auth;
        const user = await getUserFromAuthToken(auth, { requireActive: true });

        if (!user) {
            return res.status(200).json({
                message: unauthorizedMessage,
                status: false,
                redirect: '/login',
            });
        }

        req.authUser = req.authUser || user;
        return next();
    } catch (error) {
        return res.status(200).json({
            message: unauthorizedMessage,
            status: false,
            redirect: '/login',
        });
    }
};

const requireVerifiedPhonePage = async (req, res, next) => {
    try {
        const auth = req.cookies?.auth;
        const user = await getUserFromAuthToken(auth, { requireActive: true });

        if (!user) {
            return res.redirect('/login');
        }

        req.authUser = req.authUser || user;
        return next();
    } catch (error) {
        return res.redirect('/login');
    }
};

module.exports = {
    requireVerifiedPhoneApi,
    requireVerifiedPhonePage,
};
