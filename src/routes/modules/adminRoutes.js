import { requireAdmin } from '../../core/middlewares/auth';
import { adminController } from '../../modules/admin/controllers';

const registerAdminRoutes = (router) => {
    router.get('/admin', requireAdmin, adminController.adminPortalPage);
    router.get('/admin/dashboard', requireAdmin, adminController.adminPortalPage);
    router.get('/admin/panel', requireAdmin, adminController.adminPortalPage);
    // Normalized admin routes (new model)
    router.get('/admin/members', requireAdmin, adminController.membersPage);
    router.get('/admin/member/:id', requireAdmin, adminController.infoMember);
    router.get('/admin/recharge', requireAdmin, adminController.rechargePage);
    router.get('/admin/withdraw', requireAdmin, adminController.withdraw);
    router.get('/admin/statistics', requireAdmin, adminController.statistical);
    router.get('/admin/settings', requireAdmin, adminController.settings);
    router.get('/admin/content', requireAdmin, adminController.contentManagerPage);
    router.get('/admin/games/wingo', requireAdmin, adminController.adminPage);
    router.get('/admin/games/5d', requireAdmin, adminController.adminPage5d);
    router.get('/admin/games/k3', requireAdmin, adminController.adminPageK3);

    router.get('/admin/manager/index', adminController.middlewareAdminController, adminController.adminPage);
    router.get('/admin/manager/index/3', adminController.middlewareAdminController, adminController.adminPage3);
    router.get('/admin/manager/index/5', adminController.middlewareAdminController, adminController.adminPage5);
    router.get('/admin/manager/index/10', adminController.middlewareAdminController, adminController.adminPage10);

    router.get('/admin/manager/5d', adminController.middlewareAdminController, adminController.adminPage5d);
    router.get('/admin/manager/k3', adminController.middlewareAdminController, adminController.adminPageK3);

    router.get('/admin/manager/members', adminController.middlewareAdminController, adminController.membersPage);
    router.get('/admin/manager/createBonus', adminController.middlewareAdminController, adminController.giftPage);
    router.get('/admin/manager/ctv', adminController.middlewareAdminController, adminController.ctvPage);
    router.get('/admin/manager/ctv/profile/:phone', adminController.middlewareAdminController, adminController.ctvProfilePage);

    router.get('/admin/manager/settings', adminController.middlewareAdminController, adminController.settings);
    router.get('/admin/manager/content', adminController.middlewareAdminController, adminController.contentManagerPage);
    router.get('/admin/manager/listRedenvelops', adminController.middlewareAdminController, adminController.listRedenvelops);
    router.post('/admin/manager/infoCtv', adminController.middlewareAdminController, adminController.infoCtv);
    router.post('/admin/manager/infoCtv/select', adminController.middlewareAdminController, adminController.infoCtv2);
    router.post('/admin/manager/settings/bank', adminController.middlewareAdminController, adminController.settingBank);
    router.post('/admin/manager/settings/cskh', adminController.middlewareAdminController, adminController.settingCskh);
    router.post('/admin/manager/settings/buff', adminController.middlewareAdminController, adminController.settingbuff);
    router.post('/admin/manager/create/ctv', adminController.middlewareAdminController, adminController.register);
    router.post('/admin/manager/settings/get', adminController.middlewareAdminController, adminController.settingGet);
    router.post('/admin/manager/createBonus', adminController.middlewareAdminController, adminController.createBonus);
    router.get('/api/webapi/admin/content/home', adminController.middlewareAdminController, adminController.getHomeContentSettings);
    router.post('/api/webapi/admin/content/home', adminController.middlewareAdminController, adminController.saveHomeContentSettings);

    router.post('/admin/member/listRecharge/:phone', adminController.middlewareAdminController, adminController.listRechargeMem);
    router.post('/admin/member/listWithdraw/:phone', adminController.middlewareAdminController, adminController.listWithdrawMem);
    router.post('/admin/member/redenvelope/:phone', adminController.middlewareAdminController, adminController.listRedenvelope);
    router.post('/admin/member/bet/:phone', adminController.middlewareAdminController, adminController.listBet);
    router.post('/admin/member/listRecharge-by/:identifier', adminController.middlewareAdminController, adminController.listRechargeMem);
    router.post('/admin/member/listWithdraw-by/:identifier', adminController.middlewareAdminController, adminController.listWithdrawMem);
    router.post('/admin/member/redenvelope-by/:identifier', adminController.middlewareAdminController, adminController.listRedenvelope);
    router.post('/admin/member/bet-by/:identifier', adminController.middlewareAdminController, adminController.listBet);

    router.get('/admin/manager/recharge-bonus', adminController.middlewareAdminController, adminController.rechargeBonus);
    router.get('/api/webapi/recharge-bonus', adminController.middlewareAdminController, adminController.getRechargeBonus);
    router.get('/api/webapi/recharge-bonus/:id', adminController.middlewareAdminController, adminController.rechargeBonusById);
    router.get('/admin/manager/recharge', adminController.middlewareAdminController, adminController.rechargePage);
    router.get('/admin/manager/withdraw', adminController.middlewareAdminController, adminController.withdraw);
    router.get('/admin/manager/levelSetting', adminController.middlewareAdminController, adminController.levelSetting);
    router.get('/admin/manager/CreatedSalaryRecord', adminController.middlewareAdminController, adminController.CreatedSalaryRecord);
    router.get('/admin/manager/rechargeRecord', adminController.middlewareAdminController, adminController.rechargeRecord);
    router.get('/admin/manager/withdrawRecord', adminController.middlewareAdminController, adminController.withdrawRecord);
    router.get('/admin/manager/statistical', adminController.middlewareAdminController, adminController.statistical);
    router.get('/admin/member/info/:id', adminController.middlewareAdminController, adminController.infoMember);
    router.get('/admin/member/info-by/:identifier', adminController.middlewareAdminController, adminController.infoMember);
    router.get('/api/webapi/admin/getLevelInfo', adminController.middlewareAdminController, adminController.getLevelInfo);
    router.get('/api/webapi/admin/getSalary', adminController.middlewareAdminController, adminController.getSalary);
    // Normalized API aliases
    router.post('/api/admin/members/list', requireAdmin, adminController.listMember);
    router.post('/api/admin/member/info', requireAdmin, adminController.userInfo);
    router.post('/api/admin/recharge', requireAdmin, adminController.recharge);
    router.post('/api/admin/withdraw', requireAdmin, adminController.handlWithdraw);
    router.post('/api/admin/statistics', requireAdmin, adminController.statistical2);
    router.get('/api/admin/content/home', requireAdmin, adminController.getHomeContentSettings);
    router.post('/api/admin/content/home', requireAdmin, adminController.saveHomeContentSettings);

    router.post('/api/webapi/admin/updateLevel', adminController.middlewareAdminController, adminController.updateLevel);
    router.post('/api/webapi/admin/CreatedSalary', adminController.middlewareAdminController, adminController.CreatedSalary);
    router.post('/api/webapi/admin/listMember', adminController.middlewareAdminController, adminController.listMember);
    router.post('/api/webapi/admin/listctv', adminController.middlewareAdminController, adminController.listCTV);
    router.post('/api/webapi/admin/withdraw', adminController.middlewareAdminController, adminController.handlWithdraw);
    router.post('/api/webapi/admin/recharge', adminController.middlewareAdminController, adminController.recharge);
    router.post('/api/webapi/admin/rechargeDuyet', adminController.middlewareAdminController, adminController.rechargeDuyet);
    router.post('/api/webapi/admin/member/info', adminController.middlewareAdminController, adminController.userInfo);
    router.post('/api/webapi/admin/statistical', adminController.middlewareAdminController, adminController.statistical2);

    router.post('/api/webapi/admin/banned', adminController.middlewareAdminController, adminController.banned);
    router.post('/api/webapi/admin/deleteMember', adminController.middlewareAdminController, adminController.deleteMember);

    router.post('/api/webapi/admin/totalJoin', adminController.middlewareAdminController, adminController.totalJoin);
    router.post('/api/webapi/admin/change', adminController.middlewareAdminController, adminController.changeAdmin);
    router.post('/api/webapi/admin/profileUser', adminController.middlewareAdminController, adminController.profileUser);

    router.post('/api/webapi/admin/5d/listOrders', adminController.middlewareAdminController, adminController.listOrderOld);
    router.post('/api/webapi/admin/k3/listOrders', adminController.middlewareAdminController, adminController.listOrderOldK3);
    router.post('/api/webapi/admin/5d/editResult', adminController.middlewareAdminController, adminController.editResult);
    router.post('/api/webapi/admin/k3/editResult', adminController.middlewareAdminController, adminController.editResult2);
};

export {
    registerAdminRoutes,
};
