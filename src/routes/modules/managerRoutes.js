import { requireManager } from '../../core/middlewares/auth';
import { dailyController } from '../../modules/manager/controllers';

const registerManagerRoutes = (router) => {
    // Normalized manager routes
    router.get('/manager/panel', requireManager, dailyController.managerPortalPage);
    router.get('/manager/dashboard', requireManager, dailyController.dailyPage);
    router.get('/manager/users', requireManager, dailyController.listMeber);
    router.get('/manager/user/:identifier', requireManager, dailyController.pageInfo);
    router.post('/api/manager/members/list', requireManager, dailyController.listMember);
    router.post('/api/manager/buff', requireManager, dailyController.buffMoney);
    router.post('/api/manager/statistics', requireManager, dailyController.statistical);

    router.get('/manager', dailyController.middlewareDailyController, dailyController.managerPortalPage);
    router.get('/manager/index', dailyController.middlewareDailyController, dailyController.dailyPage);
    router.get('/manager/listRecharge', dailyController.middlewareDailyController, dailyController.listRecharge);
    router.get('/manager/listWithdraw', dailyController.middlewareDailyController, dailyController.listWithdraw);
    router.get('/manager/members', dailyController.middlewareDailyController, dailyController.listMeber);
    router.get('/manager/profileMember', dailyController.middlewareDailyController, dailyController.profileMember);
    router.get('/manager/settings', dailyController.middlewareDailyController, dailyController.settingPage);
    router.get('/manager/gifts', dailyController.middlewareDailyController, dailyController.giftPage);
    router.get('/manager/support', dailyController.middlewareDailyController, dailyController.support);
    router.get('/manager/member/info/:phone', dailyController.middlewareDailyController, dailyController.pageInfo);
    router.get('/manager/member/info-by/:identifier', dailyController.middlewareDailyController, dailyController.pageInfo);

    router.post('/manager/member/info/:phone', dailyController.middlewareDailyController, dailyController.userInfo);
    router.post('/manager/member/listRecharge/:phone', dailyController.middlewareDailyController, dailyController.listRechargeMem);
    router.post('/manager/member/listWithdraw/:phone', dailyController.middlewareDailyController, dailyController.listWithdrawMem);
    router.post('/manager/member/redenvelope/:phone', dailyController.middlewareDailyController, dailyController.listRedenvelope);
    router.post('/manager/member/bet/:phone', dailyController.middlewareDailyController, dailyController.listBet);
    router.post('/manager/member/info-by/:identifier', dailyController.middlewareDailyController, dailyController.userInfo);
    router.post('/manager/member/listRecharge-by/:identifier', dailyController.middlewareDailyController, dailyController.listRechargeMem);
    router.post('/manager/member/listWithdraw-by/:identifier', dailyController.middlewareDailyController, dailyController.listWithdrawMem);
    router.post('/manager/member/redenvelope-by/:identifier', dailyController.middlewareDailyController, dailyController.listRedenvelope);
    router.post('/manager/member/bet-by/:identifier', dailyController.middlewareDailyController, dailyController.listBet);

    router.post('/manager/settings/list', dailyController.middlewareDailyController, dailyController.settings);
    router.post('/manager/createBonus', dailyController.middlewareDailyController, dailyController.createBonus);
    router.post('/manager/listRedenvelops', dailyController.middlewareDailyController, dailyController.listRedenvelops);

    router.post('/manager/listRecharge', dailyController.middlewareDailyController, dailyController.listRechargeP);
    router.post('/manager/listWithdraw', dailyController.middlewareDailyController, dailyController.listWithdrawP);

    router.post('/api/webapi/statistical', dailyController.middlewareDailyController, dailyController.statistical);
    router.post('/manager/infoCtv', dailyController.middlewareDailyController, dailyController.infoCtv);
    router.post('/manager/infoCtv/select', dailyController.middlewareDailyController, dailyController.infoCtv2);
    router.post('/api/webapi/manager/listMember', dailyController.middlewareDailyController, dailyController.listMember);

    router.post('/api/webapi/manager/buff', dailyController.middlewareDailyController, dailyController.buffMoney);
};

export {
    registerManagerRoutes,
};
