import { registerPortalRoutes } from './modules/portalRoutes';
import { registerAuthRoutes } from '../modules/auth/routes';
import { registerUserRoutes } from '../modules/user/routes';
import { registerManagerRoutes } from '../modules/manager/routes';
import { registerAdminRoutes } from '../modules/admin/routes';
import { registerWingoRoutes } from '../modules/games/wingo/routes';
import { registerK3Routes } from '../modules/games/k3/routes';
import { registerK5Routes } from '../modules/games/k5/routes';

const registerRouteGroups = (router) => {
    registerPortalRoutes(router);
    registerAuthRoutes(router);
    registerUserRoutes(router);
    registerWingoRoutes(router);
    registerK3Routes(router);
    registerK5Routes(router);
    registerManagerRoutes(router);
    registerAdminRoutes(router);
};

export {
    registerRouteGroups,
};
