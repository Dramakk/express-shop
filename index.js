var http = require('http');
var express = require('express');
var app = express();
var serverUtils = require('./lib/serverUtils');
var cookieParser = require('cookie-parser');
var bcrypt = require('bcrypt');

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

var session = require('express-session');
var FileStore = require('session-file-store')(session);

app.use(session({
    store: new FileStore(),
    secret: "73D1B1B1BC1DABFB97F216D897B7968E44B06457920F00F2DC6C1ED3BE25AD4C",
    resave: true,
    saveUninitialized: true,
    reapInterval: 600,
}));

var Pool = require('pg').Pool
var pool = new Pool({
  user: 'student',
  host: 'localhost',
  database: 'sklep',
  password: '',
  port: 5432,
})

//Homepage
app.get('/', (req, res) => {
    serverUtils.logConnection("Got connection... ", req.connection.remoteAddress);
    //Create session on first connection and make user a guest
    if(req.session.guest === undefined){
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

//Category routes
app.get('/list', (req, res) => {
    serverUtils.logConnection(`Accessing category: ${req.params.category} `, req.connection.remoteAddress);
    res.render('products-list.ejs', {isUserLogged: !req.session.guest});
});

app.get('/list/:category', (req, res) => {
    serverUtils.logConnection(`Accessing category: ${req.params.category} `, req.connection.remoteAddress);
    
    let categoryName = serverUtils.convertCategoryName(req.params.category);

    if(categoryName === -1){
        res.redirect('/list/');
    }
    else{
        res.render('products-list.ejs', {categoryName: serverUtils.convertCategoryName(req.params.category), isUserLogged: !req.session.guest});
    }
});

//Products routes
app.get('/products/:id', (req, res) => {
    serverUtils.logConnection(`Accessing product: ${req.params.id} `, req.connection.remoteAddress);

    serverUtils.getProductData(parseInt(req.params.id), pool, (error, result) => {
        if (error){
            throw(error);
        }
        if(result === -1){
            res.redirect('/list/');
        }
        else{
            if(result.variations){
                res.render('product-page.ejs', {
                    productData: result.productData, 
                    variations: result.variations,
                    hasVariations: true,
                    variationsLength: Object.keys(result.variations).length,
                    isUserLogged: !req.session.guest
                });
            }
            else{
                res.render('product-page.ejs', {
                    productData: result.productData, 
                    variations: [],
                    hasVariations: false,
                    variationsLength: 0,
                    isUserLogged: !req.session.guest
                });
            }
        }
    })
});

//User authentication routes
app.get('/my-account', (req, res) => {
    res.render('my-account', {isUserLogged: !req.session.guest});
});

app.get('/login', (req, res) => {
    serverUtils.logConnection("Accessing login page... ", req.connection.remoteAddress);

    if(!req.session.guest){
        res.redirect('/my-account');
    }

    res.render('login.ejs', {isUserLogged: !req.session.guest});
});

app.post('/login', (req, res) => {
    serverUtils.logConnection("Accessing login page... ", req.connection.remoteAddress);
    serverUtils.loginClient(req.body, bcrypt, pool, (error, result) =>{
        if(result.validPassword === true){
            req.session.userId = result.userId;
            req.session.logged = true;
            req.session.guest = 0;

            req.session.save((error) => {
                if(error){
                    throw error;
                }

                res.redirect('/');
            });
        }
        else{
            res.render('login.ejs', {error: "Błędny login lub hasło!", isUserLogged: !req.session.guest});
        }
    });
});

app.get('/register', (req, res) => {
    serverUtils.logConnection("Accessing register page... ", req.connection.remoteAddress);
    
    res.render('register.ejs', {isUserLogged: !req.session.guest});
});

app.post('/register', (req, res) => {
    serverUtils.logConnection("Accessing register page... ", req.connection.remoteAddress);
    
    serverUtils.registerClient(req.body, bcrypt, pool, (error, result) =>{
        if(result.userAlreadyExists === false){
            req.session.userId = result.userId;
            req.session.logged = true;
            req.session.guest = 0;

            req.session.save((error) => {
                if(error){
                    throw error;
                }

                res.redirect('/login');
            });
        }
        else{
            res.render('register.ejs', {error: "Użytkownik o podanym adresie email już istnieje!", isUserLogged: !req.session.guest});
        }
    });
});
//Error 404
app.get('*', function(req, res){
    res.status(404).send('Podana strona nie istnieje!');
});

http.createServer(app).listen(3000);