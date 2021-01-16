const registerClient = function (postParams, bcrypt, postgres, callback) {
    let email = postParams.email.replace(/(<([^>]+)>)/gi, ""),
        password = postParams.password.replace(/(<([^>]+)>)/gi, ""),
        passwordCheck = postParams.passwordCheck.replace(/(<([^>]+)>)/gi, "");

    if (password !== passwordCheck) {
        callback(null, { userAlreadyExists: true });
    }

    postgres.query(`SELECT email FROM users WHERE email='${email}'`, function (err, result) {
        if (err) {
            throw (err);
        }
        let row = result.rows[0];

        if (row) {
            callback(null, { userAlreadyExists: true });
        }
        else {
            bcrypt.hash(password, 10, (error, result) => {
                postgres.query(`INSERT INTO users(email, password, isadmin) VALUES ('${email}', '${result}', FALSE) RETURNING id`, function (err, result) {
                    if (err) {
                        throw (err);
                    }
                    callback(null, {userId: result.rows[0].id, userAlreadyExists: false });
                });
            });
        }
    });
}

const loginClient = function (postParams, bcrypt, postgres, callback) {
    let email = postParams.email.replace(/(<([^>]+)>)/gi, ""),
        password = postParams.password.replace(/(<([^>]+)>)/gi, "");

    postgres.query(`SELECT id, email, password FROM users WHERE email='${email}'`, function (err, result) {
        if (err) {
            throw (err);
        }

        let row = result.rows[0];

        if (row) {
            bcrypt.compare(password, row.password, function (err, result) {
                if (err) {
                    throw err;
                }
                else {
                    callback(null, { userId: row.id, validPassword: result });
                }
            });
        }
        else {
            callback(null, { userId: null, validPassword: false });
        }
    });
}

const deleteAccount = function (req, bcrypt, postgres, callback) {
    bcrypt.compare(toString(req.session.userId), req.body.validation, (error, result) => {
        if (result) {
            postgres.query(`DELETE FROM orderedItems WHERE orderId IN (SELECT id FROM orders WHERE userId = ${req.session.userId})`, function (err, result) {
                if (err) {
                    throw (err);
                }
                postgres.query(`DELETE FROM orders WHERE userid = ${req.session.userId}`, function (err, result) {
                    if (err) {
                        throw (err);
                    }
                    postgres.query(`DELETE FROM users WHERE id = ${req.session.userId}`, function (err, result) {
                        if (err) {
                            throw (err);
                        }
                        callback(null, 1);
                    });
                });
            });
        }
        else {
            callback(null, -1);
        }
    });
}

const changePassword = function (req, bcrypt, postgres, callback) {
    bcrypt.compare(toString(req.session.userId), req.body.validation, (error, result) => {
        if (result) {
            let id = req.session.userId,
                oldPassword = req.body.oldPassword.replace(/(<([^>]+)>)/gi, ""),
                newPassword = req.body.password.replace(/(<([^>]+)>)/gi, ""),
                newPasswordCheck = req.body.passwordCheck.replace(/(<([^>]+)>)/gi, "");

            if (newPassword !== newPasswordCheck) {
                callback(null, 0);
            }
            else {
                postgres.query(`SELECT password FROM users WHERE id=${id}`, function (err, result) {
                    if (err) {
                        throw (err);
                    }
                    let row = result.rows[0];
                    if (row) {
                        bcrypt.compare(oldPassword, row.password, function (err, result) {
                            if (err) {
                                throw err;
                            }
                            if (result) {
                                bcrypt.hash(newPassword, 10, (error, result) => {
                                    postgres.query(`UPDATE users SET password='${result}' WHERE id = ${id}`, function (err, result) {
                                        if (err) {
                                            throw (err);
                                        }
                                        callback(null, 1);
                                    });
                                });
                            }
                            else {
                                callback(null, 0);
                            }
                        });
                    }
                    else {
                        callback(null, 0);
                    }
                });
            }
        }
        else {
            callback(null, -1);
        }
    });
}

module.exports = {loginClient, deleteAccount, registerClient, changePassword}