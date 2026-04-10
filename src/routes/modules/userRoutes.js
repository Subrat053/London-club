import { requireAuth } from '../../core/middlewares/auth';
import middlewarePhoneController from '../../controllers/middlewarePhoneController';
import {
    homeController,
    userController,
    paymentController,
} from '../../modules/user/controllers';

const registerUserRoutes = (router) => {
    // Normalized user pages
    router.get('/user/profile', requireAuth, homeController.myProfilePage);
    router.get('/user/wallet', requireAuth, homeController.walletPage);
    router.get('/user/wallet/recharge', requireAuth, middlewarePhoneController.requireVerifiedPhonePage, homeController.rechargePage);
    router.get('/user/wallet/withdraw', requireAuth, middlewarePhoneController.requireVerifiedPhonePage, homeController.withdrawalPage);

    // Normalized user API aliases
    router.get('/api/user/me', requireAuth, userController.userInfo);
    router.put('/api/user/profile', requireAuth, userController.changeUser);
    router.put('/api/user/password', requireAuth, userController.changePassword);
    router.post('/api/user/wallet/recharge', requireAuth, middlewarePhoneController.requireVerifiedPhoneApi, userController.recharge);
    router.post('/api/user/wallet/withdraw', requireAuth, middlewarePhoneController.requireVerifiedPhoneApi, userController.withdrawal3);
    router.post('/api/user/wallet/transfer', requireAuth, middlewarePhoneController.requireVerifiedPhoneApi, userController.transfer);
    router.get('/api/user/wallet/recharge/list', requireAuth, userController.listRecharge);
    router.get('/api/user/wallet/withdraw/list', requireAuth, userController.listWithdraw);

    // Normalized payment aliases
    router.post('/api/user/payments/manual_upi', requireAuth, middlewarePhoneController.requireVerifiedPhoneApi, paymentController.addManualUPIPaymentRequest);
    router.post('/api/user/payments/manual_usdt', requireAuth, middlewarePhoneController.requireVerifiedPhoneApi, paymentController.addManualUSDTPaymentRequest);
};

export {
    registerUserRoutes,
};
