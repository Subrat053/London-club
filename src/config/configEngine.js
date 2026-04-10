import express from 'express';

const moduleViewPaths = [
    './src/modules/user/views',
    './src/modules/admin/views',
    './src/modules/manager/views',
    './src/modules/auth/views',
    './src/modules/games/wingo/views',
    './src/modules/games/k3/views',
    './src/modules/games/k5/views',
    './src/modules/games/5d/views',
];

const modulePublicPaths = [
    './src/modules/user/public',
    './src/modules/admin/public',
    './src/modules/manager/public',
    './src/modules/auth/public',
];

const configViewEngine = (app) => {
    app.use(express.static('./src/public'));
    modulePublicPaths.forEach((publicPath) => {
        app.use(express.static(publicPath));
    });

    app.set('view engine', "ejs");
    app.set('views', [
        './src/views',
        ...moduleViewPaths,
    ]);
}

export default configViewEngine;