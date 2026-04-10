import { getUserPortalMatrix } from '../../../services/sessionService';
import { USER_TYPE_ADMIN, USER_TYPE_MANAGER, USER_TYPES } from '../../../core/constants/roles';

const buildPortalCards = (matrix = {}) => {
    const cards = [
        {
            type: 'user',
            title: 'User Portal',
            description: 'Wallet, bets, promotions, profile and rewards.',
            route: '/portal/user',
            enabled: true,
        },
        {
            type: 'manager',
            title: 'Manager Portal',
            description: 'Daily operations, user requests and manager reports.',
            route: '/portal/manager',
            enabled: Boolean(matrix.hasManagerPortal),
        },
        {
            type: 'admin',
            title: 'Admin Portal',
            description: 'Platform controls, settings, content and auditing.',
            route: '/portal/admin',
            enabled: Boolean(matrix.hasAdminPortal),
        },
    ];

    return cards;
};

const portalIndex = async (req, res) => {
    const matrix = getUserPortalMatrix(req.authUser || {});

    if (matrix.currentType === USER_TYPE_ADMIN) {
        return res.redirect('/portal/admin');
    }
    if (matrix.currentType === USER_TYPE_MANAGER) {
        return res.redirect('/portal/manager');
    }
    return res.redirect('/portal/user');
};

const userPortalPage = async (req, res) => {
    const matrix = getUserPortalMatrix(req.authUser || {});
    return res.render('portal/user/index.ejs', {
        userTypes: USER_TYPES,
        portalCards: buildPortalCards(matrix),
        currentType: matrix.currentType,
    });
};

const managerPortalPage = async (req, res) => {
    const matrix = getUserPortalMatrix(req.authUser || {});
    return res.render('portal/manager/index.ejs', {
        userTypes: USER_TYPES,
        portalCards: buildPortalCards(matrix),
        currentType: matrix.currentType,
    });
};

const adminPortalPage = async (req, res) => {
    const matrix = getUserPortalMatrix(req.authUser || {});
    return res.render('portal/admin/index.ejs', {
        userTypes: USER_TYPES,
        portalCards: buildPortalCards(matrix),
        currentType: matrix.currentType,
    });
};

const getPortalDefinition = async (req, res) => {
    const matrix = getUserPortalMatrix(req.authUser || {});
    return res.status(200).json({
        message: 'Success',
        status: true,
        data: {
            userTypes: USER_TYPES,
            currentType: matrix.currentType,
            portals: buildPortalCards(matrix),
        },
    });
};

const portalController = {
    portalIndex,
    userPortalPage,
    managerPortalPage,
    adminPortalPage,
    getPortalDefinition,
};

export default portalController;
