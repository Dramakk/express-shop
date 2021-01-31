module.exports = function (app, serverUtils, userUtils, adminUtils, productUtils, multer, path, fs, cookieParser, bcrypt, pool) {
    app.get('/admin', (req, res) => {
        serverUtils.logConnection("Getting admin connection ", req.connection.remoteAddress);

        if (req.session.isAdmin === 1) {
            res.redirect('/admin/dashboard');
        }

        else {
            res.render('admin/admin-login');
        }
    });

    app.get('/admin/dashboard', (req, res) => {
        serverUtils.logConnection("Displaying admin dashboard ", req.connection.remoteAddress);

        if (req.session.isAdmin !== 1) {
            res.redirect('/admin');
        }

        else {
            adminUtils.getLastOrders(pool, (error, result) => {
                if (error) {
                    throw error;
                }

                else {
                    adminUtils.getPopularProducts(pool, 10).then((popularProducts) => {
                        popularProducts.map((element) => {
                            element = productUtils.composeDimension(element);
                        });
                        res.render('admin/admin-dashboard', { lastOrders: result, popularProducts: popularProducts });
                    });
                }
            });
        }
    });

    app.get('/admin/products', (req, res) => {
        serverUtils.logConnection("Accessing admin products page ", req.connection.remoteAddress);

        if (req.session.isAdmin !== 1) {
            res.redirect('/admin');
        }
        else {
            adminUtils.getAllProducts(pool).then((allProducts) => {
                allProducts.map((element) => {
                    element = productUtils.composeDimension(element);
                });
                res.render('admin/admin-products', { products: allProducts });
            });
        }
    });

    app.get('/admin/products/delete/:id', (req, res) => {
        serverUtils.logConnection(`Deleting product with id ${req.params.id} `, req.connection.remoteAddress);

        if (req.session.isAdmin !== 1) {
            res.redirect('/admin');
        }
        else {
            adminUtils.deleteItem(req.params.id, pool, (error, result) => {
                if (result) {
                    res.redirect('/admin/products');
                }
            });
        }
    });

    app.get('/admin/products/:id', (req, res) => {
        if (req.session.isAdmin !== 1) {
            res.redirect('/admin');
        }
        else {
            if (req.query.error) {
                productUtils.getProductData(req.params.id, pool, (error, result) => {
                    res.render("admin/admin-view-product", { product: result.productData, error: "Nie udało się zaktualizować informacji o produkcie." });
                });
            }
            else {
                productUtils.getProductData(req.params.id, pool, (error, result) => {
                    res.render("admin/admin-view-product", { product: result.productData });
                });
            }
        }
    });

    app.post('/admin/products/change/:id', multer.single('productImage'), (req, res) => {
        if (req.session.isAdmin === -1) {
            res.redirect('/admin');
        }
        if (req.file) {
            let tempPath = req.file.path;
            let targetPath = path.join(__dirname, "../views/images/" + req.params.id + ".png");

            if (path.extname(req.file.originalname).toLowerCase() === ".png") {
                fs.rename(tempPath, targetPath, err => {
                    if (err) throw err;
                    adminUtils.updateProductData(req.body, req.params.id, req.params.id, pool, (error, result) => {
                        if (result === 1) {
                            res.redirect('/admin/products');
                        }
                        else {
                            res.redirect(`/admin/products/${req.params.id}?error=1`, { error: "Nie udało się zaktualizować informacji o produkcie." });
                        }
                    });
                });
            } else {
                fs.unlink(tempPath, err => {
                    if (err) throw err;
                    res.redirect(`/admin/products/${req.params.id}?error=1`);
                });
            }
        }
        else {
            adminUtils.updateProductData(req.body, null, req.params.id, pool, (error, result) => {
                if (result === 1) {
                    res.redirect('/admin/products');
                }
                else {
                    res.redirect(`/admin/products/change/${req.params.id}`, { error: "Nie udało się zaktualizować informacji o produkcie." });
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
                res.render('admin/admin-login.ejs', { error: "Błędny login lub hasło!" });
            }
        }, true);
    });
}