var http = require('http');
var port = process.env.PORT || 3000;
var express = require('express');
var app = express();
var serverUtils = require('./lib/serverUtils');
var cartUtils = require('./lib/cartUtils');
var productUtils = require('./lib/productUtils');
var userUtils = require('./lib/userUtils');
var adminUtils = require('./lib/adminUtils');
var cookieParser = require('cookie-parser');
var bcrypt = require('bcrypt');
var session = require('express-session');
var FileStore = require('session-file-store')(session);
var Pool = require('pg').Pool
var multer = require('multer');
var upload = multer({ dest: __dirname + '/views/tmp' });
var path = require('path');
var fs = require('fs');

var pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

app.set('view engine', 'ejs');
app.set('views', './views');
app.disable('etag');
app.use(cookieParser());
app.use(express.urlencoded({
    extended: true
}));

app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist/'));
app.use('/styles', express.static(__dirname + '/views/styles/'));
app.use('/js', express.static(__dirname + '/views/js/'));
app.use('/images', express.static(__dirname + '/views/images/'));

app.use(session({
    store: new FileStore(),
    secret: "73D1B1B1BC1DABFB97F216D897B7968E44B06457920F00F2DC6C1ED3BE25AD4C",
    resave: true,
    saveUninitialized: true,
    reapInterval: 600,
}));


require('./routes/accountRoutes.js')(app, serverUtils, userUtils, cookieParser, bcrypt, pool);
require('./routes/productRoutes.js')(app, serverUtils, cartUtils, productUtils, cookieParser, bcrypt, pool);
require('./routes/adminRoutes')(app, serverUtils, userUtils, adminUtils, productUtils, upload, path, fs, cookieParser, bcrypt, pool);

//Homepage
app.get('/', (req, res) => {
    serverUtils.logConnection("Got connection... ", req.connection.remoteAddress);
    //Create session on first connection and make user a guest
    if (req.session.guest === undefined) {
        req.session.guest = 1;
        req.session.save();
    }

    const NUM_POPULAR = 15

    serverUtils.getPopularProducts(NUM_POPULAR, pool, (error, results) => {
        if (error) {
            throw error;
        }
        res.render('home.ejs', { popularProducts: [NUM_POPULAR, results, results.length], isUserLogged: !req.session.guest });
    })
});

app.get('/search', (req, res) => {
    serverUtils.logConnection(`Searching for items with querry: ${req.query.searchString} `, req.connection.remoteAddress);

    productUtils.searchForProducts(req.query.searchString, pool, (error, result) => {
        if (error) {
            throw (error);
        }
        else {
            if (req.query.isAjax) {
                res.send(result);
            }
            else {
                res.render('search', { searchResult: { howManyItems: result.length, items: result }, isUserLogged: !req.session.guest });
            }
        }
    });
})

//Error 404
app.get('*', function (req, res) {
    res.status(404).send('Podana strona nie istnieje!');
});

http.createServer(app).listen(port);
