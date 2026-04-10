import { requireAuth } from '../../../../core/middlewares/auth';
import { winGoController } from '../controllers';

const registerWingoRoutes = (router) => {
    router.get('/games/wingo', requireAuth, winGoController.winGoPage);
    router.post('/api/user/games/wingo/join', requireAuth, winGoController.betWinGo);
};

export {
    registerWingoRoutes,
};
