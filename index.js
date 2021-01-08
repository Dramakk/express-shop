var http = require('http');
var express = require('express');
var app = express();
var serverUtils = require('./lib/serverUtils');
var cookieParser = require('cookie-parser');

app.set('view engine', 'ejs');
app.set('views', './views');
app.disable('etag');
app.use(cookieParser());
app.use(express.urlencoded({
    extended: true
}));

app.use(express.urlencoded({ extended: true }));
app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist/'));
app.use('/styles', express.static(__dirname + '/views/styles/'));
app.use('/js', express.static(__dirname + '/views/js/'));
app.use('/images', express.static(__dirname + '/views/images/'));

var session = require('express-session');
var FileStore = require('session-file-store')(session);

app.use(session({
    store: new FileStore(),
    secret: "73D1B1B1BC1DABFB97F216D897B7968E44B06457920F00F2DC6C1ED3BE25AD4C",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge : 1800 }
}));

var Pool = require('pg').Pool
var pool = new Pool({
  user: 'student',
  host: 'localhost',
  database: 'sklep',
  password: '',
  port: 5432,
})

app.get('/', (req, res) => {
    serverUtils.logConnection("Got connection... ", req.connection.remoteAddress);

    const NUM_POPULAR = 15

    serverUtils.getPopularProducts(num_popular, pool, (error, results) => {
        if (error) {
            throw error;
        }
        res.render('home.ejs', { popularProducts: [num_popular, results] });
    })
});

app.get('/list', (req, res) => {
    serverUtils.logConnection(`Accessing category: ${req.params.category} `, req.connection.remoteAddress);
    res.render('products-list.ejs');
});

app.get('/list/:category', (req, res) => {
    serverUtils.logConnection(`Accessing category: ${req.params.category} `, req.connection.remoteAddress);    
    res.render('products-list.ejs', {categoryName: serverUtils.convertCategoryName(req.params.category)});
});

app.get('/products/:id', (req, res) => {
    serverUtils.logConnection(`Accessing product: ${req.params.id} `, req.connection.remoteAddress);
    
    res.render('product-page.ejs', {productData: []});
});

app.get('/login', (req, res) => {
    serverUtils.logConnection("Accessing login page... ", req.connection.remoteAddress);
    
    res.render('login.ejs');
});

app.get('/register', (req, res) => {
    serverUtils.logConnection("Accessing register page... ", req.connection.remoteAddress);
    
    res.render('register.ejs');
});


app.get('*', function(req, res){
    res.status(404).send('Podana strona nie istnieje!');
});

http.createServer(app).listen(3000);