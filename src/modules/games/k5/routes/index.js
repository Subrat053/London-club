import { register5dRoutes } from '../../5d/routes';

const registerK5Routes = (router) => {
    // Current K5 implementation maps to 5D game controllers.
    register5dRoutes(router);
};

export {
    registerK5Routes,
};
