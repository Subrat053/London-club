import { requireAuth } from '../../../../core/middlewares/auth';
import { k3Controller } from '../controllers';

const registerK3Routes = (router) => {
    router.get('/games/k3', requireAuth, k3Controller.K3Page);
    router.post('/api/user/games/k3/join', requireAuth, k3Controller.betK3);
};

export {
    registerK3Routes,
};
