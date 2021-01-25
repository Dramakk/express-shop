module.exports = function (app, serverUtils, userUtils, cookieParser, bcrypt, pool) {
    //User authentication routes
    app.get('/my-account', (req, res) => {
        if (req.session.guest) {
            res.redirect('/login');
            return
        }

        bcrypt.genSalt(10, (error, salt) => {
            bcrypt.hash(toString(req.session.userId), salt, (error, hash) => {
                let changePasswordAlert = req.session.passwordChanged;

                if (changePasswordAlert === 0 || changePasswordAlert === 1) {
                    res.render('my-account', { currentUser: hash, changePasswordAlert: changePasswordAlert });
                    delete req.session.passwordChanged;
                    req.session.save();
                }
                else {
                    res.render('my-account', { currentUser: hash, changePasswordAlert: -1 });
                }
            });
        });
    });

    app.get('/logout', (req, res) => {
        serverUtils.logConnection(`User with id: ${req.session.userId} has logged out `, req.connection.remoteAddress);
        req.session.destroy();
        res.redirect('/');
    });

    app.get('/login', (req, res) => {
        serverUtils.logConnection("Accessing login page... ", req.connection.remoteAddress);

        if (!req.session.guest) {
            res.redirect('/my-account');
        }

        res.render('login.ejs', { isUserLogged: !req.session.guest });
    });

    app.post('/login', (req, res) => {
        serverUtils.logConnection("Trying to login... ", req.connection.remoteAddress);
        userUtils.loginClient(req.body, bcrypt, pool, (error, result) => {
            if (result.validPassword === true) {
                req.session.userId = result.userId;
                req.session.logged = true;
                req.session.guest = 0;
                req.session.isAdmin = false;
                
                req.session.save((error) => {
                    if (error) {
                        throw error;
                    }

                    res.redirect('/my-account');
                });

                serverUtils.logConnection(`User with id: ${result.userId} has logged in `, req.connection.remoteAddress);
            }
            else {
                res.render('login.ejs', { error: "Błędny login lub hasło!", isUserLogged: !req.session.guest });
            }
        });
    });

    app.get('/register', (req, res) => {
        serverUtils.logConnection("Accessing register page... ", req.connection.remoteAddress);

        res.render('register.ejs', { isUserLogged: !req.session.guest });
    });

    app.post('/register', (req, res) => {
        serverUtils.logConnection("Accessing register page... ", req.connection.remoteAddress);

        userUtils.registerClient(req.body, bcrypt, pool, (error, result) => {
            if (result.userAlreadyExists === false) {
                serverUtils.logConnection(`User with id: ${result.userId} has been registered `, req.connection.remoteAddress);
                res.redirect('/login');
            }
            else {
                res.render('register.ejs', { error: "Użytkownik o podanym adresie email już istnieje!", isUserLogged: !req.session.guest });
            }
        });
    });

    app.get('/deleteAccount', (req, res) => {
        if (req.session.guest) {
            res.redirect('/login');
            return
        }
        serverUtils.logConnection(`User with id: ${req.session.userId} clicked delete account `, req.connection.remoteAddress);
        bcrypt.genSalt(10, (error, salt) => {
            bcrypt.hash(toString(req.session.userId), salt, (error, hash) => {
                res.render('delete-account', { currentUser: hash });
            });
        })
    });

    app.post('/deleteAccount/confirm', (req, res) => {
        if (req.session.guest) {
            res.redirect('/login');
            return
        }

        userUtils.deleteAccount(req, bcrypt, pool, (error, result) => {
            if (result) {
                serverUtils.logConnection(`User with id: ${req.session.userId} deleted account `, req.connection.remoteAddress);
                req.session.destroy();
            }
            res.redirect('/');
        })
    });

    app.post('/changePassword', (req, res) => {
        if (req.session.guest) {
            res.redirect('/login');
            return
        }

        userUtils.changePassword(req, bcrypt, pool, (error, result) => {
            if(result === -1){
                req.session.destroy();
                res.redirect('/');
                return;
            }

            let status = result ? "success" : "fail";

            serverUtils.logConnection(`User with id: ${req.session.userId} changed password with status: ${status} `, req.connection.remoteAddress);
            req.session.passwordChanged = result;
            req.session.save((error) => {
                if(error) throw error;
                res.redirect('/my-account');
            });
        })
    });
}