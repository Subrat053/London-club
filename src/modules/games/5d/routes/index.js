import { requireAuth } from '../../../../core/middlewares/auth';
import { k5Controller } from '../controllers';

const register5dRoutes = (router) => {
    router.get('/games/5d', requireAuth, k5Controller.K5DPage);
    router.post('/api/user/games/5d/join', requireAuth, k5Controller.betK5D);
};

export {
    register5dRoutes,
};
