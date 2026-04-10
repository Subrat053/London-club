import { requireAdmin, requireAuth, requireManager } from '../../core/middlewares/auth';
import portalController from '../../modules/user/controllers/portalController';

const registerPortalRoutes = (router) => {
    router.get('/portal', requireAuth, portalController.portalIndex);
    router.get('/portal/user', requireAuth, portalController.userPortalPage);
    router.get('/portal/manager', requireManager, portalController.managerPortalPage);
    router.get('/portal/admin', requireAdmin, portalController.adminPortalPage);
    router.get('/api/webapi/portal/me', requireAuth, portalController.getPortalDefinition);
};

export {
    registerPortalRoutes,
};
