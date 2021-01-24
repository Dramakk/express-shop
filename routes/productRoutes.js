module.exports = function (app, serverUtils, cartUtils, productUtils, cookieParser, bcrypt, pool) {
    //Category routes
    app.get('/list', (req, res) => {
        serverUtils.logConnection(`Accessing category: ${req.params.category} `, req.connection.remoteAddress);
        res.render('products-list.ejs', { isUserLogged: !req.session.guest });
    });

    app.get('/list/:category', (req, res) => {
        serverUtils.logConnection(`Accessing category: ${req.params.category} `, req.connection.remoteAddress);

        let categoryName = serverUtils.convertCategoryName(req.params.category);

        if (categoryName === -1) {
            res.redirect('/list/');
        }
        else {
            res.render('products-list.ejs', { categoryName: serverUtils.convertCategoryName(req.params.category), isUserLogged: !req.session.guest });
        }
    });

    app.get('/cart', (req, res) => {
        if (req.session.guest) {
            res.redirect('/');
            return;
        }
        else {
            serverUtils.logConnection(`Accessing cart for user: ${req.session.userId} `, req.connection.remoteAddress);

            cartUtils.getCartFromDatabase(req.session.userId, pool, (error, result) =>{
                if(error){
                    throw (error);
                }
                console.log(result.orderedItems)
                res.render('cart.ejs', {itemsInCart: result.orderedItems, valueOfOrder: result.valueOfOrder});
            });
        }

    });

    app.get('/cart/add/:id', (req, res) => {
        serverUtils.logConnection(`Adding product to cart with id: ${req.params.id} `, req.connection.remoteAddress);
        if (req.session.guest) {
            res.redirect('/');
        }
        else {
            cartUtils.addItemToCart(req.params.id, req.session.userId, pool, (error, result) => {
                if (result === -1) {
                    res.redirect('/');
                }
                else {
                    res.redirect('/cart')
                }
            });
        }
    });


    //Products routes
    app.get('/products/:id', (req, res) => {
        serverUtils.logConnection(`Accessing product: ${req.params.id} `, req.connection.remoteAddress);

        productUtils.getProductData(parseInt(req.params.id), pool, (error, result) => {
            if (error) {
                throw (error);
            }
            if (result === -1) {
                res.redirect('/list/');
            }
            else {
                if (result.variations) {
                    res.render('product-page.ejs', {
                        productData: result.productData,
                        variations: result.variations,
                        hasVariations: true,
                        colorsLength: Object.keys(result.variations).length,
                        colors: result.colors,
                        isUserLogged: !req.session.guest
                    });
                }
                else {
                    res.render('product-page.ejs', {
                        productData: result.productData,
                        variations: [],
                        hasVariations: false,
                        colorsLength: 0,
                        colors: [],
                        isUserLogged: !req.session.guest
                    });
                }
            }
        })
    });
}