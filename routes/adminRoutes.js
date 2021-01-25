module.exports = function (app, serverUtils, userUtils, adminUtils, productUtils, cookieParser, bcrypt, pool) {
    app.get('/admin', (req, res) => {
        serverUtils.logConnection("Getting admin connection ", req.connection.remoteAddress);

        if(req.session.isAdmin === 1){
            res.redirect('/admin/dashboard');
        }

        else{
            res.render('admin-login');
        }
    });

    app.get('/admin/dashboard', (req, res) => {
        serverUtils.logConnection("Displaying admin dashboard ", req.connection.remoteAddress);

        if(req.session.isAdmin !== 1){
            res.redirect('/admin');
        }

        else{
            adminUtils.getLastOrders(pool, (error, result) => {
                if(error){
                    throw error;
                }

                else {
                    adminUtils.getPopularProducts(pool, 10).then((popularProducts) => {
                        popularProducts.map((element) => {
                            element = productUtils.composeDimension(element);
                        });
                        res.render('admin-dashboard', {lastOrders: result, popularProducts: popularProducts});
                    });                    
                }
            });
        }
    });

    app.post('/admin/login', (req, res) => {
        serverUtils.logConnection("Logging in to admin account ", req.connection.remoteAddress);

        userUtils.loginClient(req.body, bcrypt, pool, (error, result) => {
            if (result.validPassword === true) {
                req.session.isAdmin = 1;

                req.session.save((error) => {
                    if (error) {
                        throw error;
                    }

                    res.redirect('/admin/dashboard');
                });

                serverUtils.logConnection(`Admin has logged in `, req.connection.remoteAddress);
            }
            else {
                res.render('admin-login.ejs', { error: "Błędny login lub hasło!"});
            }
        }, true);
    });
}