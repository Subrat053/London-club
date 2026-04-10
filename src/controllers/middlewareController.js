import { requireAuth } from '../core/middlewares/auth';

const middlewareController = (req, res, next) => {
    return requireAuth(req, res, next);
}

export default middlewareController;