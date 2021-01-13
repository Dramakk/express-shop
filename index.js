var http = require('http');
var express = require('express');
var app = express();
var serverUtils = require('./lib/serverUtils');
var cookieParser = require('cookie-parser');
var bcrypt = require('bcrypt');
var session = require('express-session');
var FileStore = require('session-file-store')(session);
var Pool = require('pg').Pool
var pool = new Pool({
    user: 'student',
    host: 'localhost',
    database: 'sklep',
    password: '',
    port: 5432,
})

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


require('./routes/accountRoutes.js')(app, serverUtils, cookieParser, bcrypt, pool);
require('./routes/productRoutes.js')(app, serverUtils, cookieParser, bcrypt, pool);

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
        res.render('home.ejs', { popularProducts: [NUM_POPULAR, results], isUserLogged: !req.session.guest });
    })
});

//Error 404
app.get('*', function (req, res) {
    res.status(404).send('Podana strona nie istnieje!');
});

http.createServer(app).listen(3000);