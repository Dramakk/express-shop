var http = require('http');
var express = require('express');
var app = express();
var serverUtlis = require('./lib/serverUtils');
var cookieParser = require('cookie-parser');

app.set('view engine', 'ejs');
app.set('views', './views');
app.disable('etag');
app.use(cookieParser());
app.use(express.urlencoded({
    extended: true
}));
app.use(express.urlencoded({ extended: true }));

var session = require('express-session');

app.get('/', (req, res) => {
    serverUtlis.logConnection("Got connection... ", req.connection.remoteAddress);
    res.render('home.ejs');
});


http.createServer(app).listen(3000);