const logConnection = function (message, ip) {
    console.log(message + "from IP: " + ip);
}

const convertCategoryName = function (categoryName) {
    switch (categoryName) {
        case "2dshapes":
            return "Figury 2D"
        case "3dshapes":
            return "Figury 3D"
        case "sets":
            return "Zestawy figur"
        default:
            return -1
    }
}

const composeDimension = function (row) {
    let dim = row.dimensions;

    switch (dim) {
        case 0:
            row.categoryName = "Zestaw";
            row.dimComposed = "Nie dotyczy";
        case 2:
            row.categoryName = "Figury 2D";
            row.dimComposed = `${row.height} x ${row.width} cm`;
        case 3:
            row.categoryName = "Figury 3D";
            row.dimComposed = `${row.height} x ${row.width} x ${row.depth} cm`;
    }

    return row;
}

const composeVariationsWithColors = function (colors, variationsData) {
    let colorsTableWithVariations = [];

    colors.forEach(element => {
        colorsTableWithVariations[element.color] = [];
    })

    variationsData.forEach(element => {
        element = composeDimension(element);

        colorsTableWithVariations[element.color].push(element);
    })

    return colorsTableWithVariations;
}

const composeVariations = function (colors, productId, productName, postgres, callback) {
    let colorClause = "";

    colors.forEach(element => {
        colorClause += `'${element.color}',`
    });
    colorClause = colorClause.slice(0, -1);

    postgres.query(`SELECT id, height, width, depth, dimensions, color FROM item where id <> ${productId} AND itemname = '${productName}' AND color IN (${colorClause})`,
        function (err, result) {
            if (err) {
                throw (err);
            }
            if (result) {
                let variationsData = [];
                result.rows.forEach(element => {
                    element = composeDimension(element);

                    variationsData.push(element);
                });

                callback(null, composeVariationsWithColors(colors, variationsData), colors);
            }
            else {
                callback(null, -1);
            }
        });
}

const getVariations = function (productId, productName, postgres, callback) {
    postgres.query(`SELECT color FROM item where id <> ${productId} AND itemname = '${productName}' GROUP BY color`,
        function (err, result) {
            if (err) {
                throw (err);
            }

            if (result) {
                composeVariations(result.rows, productId, productName, postgres, callback);
            }
            else {
                callback(null, -1);
            }
        });
}


const getProductData = function (productId, postgres, callback) {
    postgres.query(`SELECT * FROM item where id =${productId}`, function (err, result) {
        if (err) {
            throw (err);
        }

        let row = result.rows[0];

        if (row) {
            row = composeDimension(row);

            getVariations(productId, row.itemname, postgres, (error, variations, colors) => {
                callback(null, { productData: row, variations: variations, colors: colors });
            });
        }
        else {
            callback(null, -1);
        }
    });
}

const getPopularProducts = function (amountOfProducts, postgres, callback) {

    postgres.query(
        `SELECT * FROM item LIMIT ${amountOfProducts}`,
        function (error, result) {
            if (error) {
                return callback(error);
            }
            callback(null, result.rows);
        });
}

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
                postgres.query(`INSERT INTO users(email, password, isadmin) VALUES ('${email}', '${result}', FALSE)`, function (err, result) {
                    if (err) {
                        throw (err);
                    }
                    callback(null, { userAlreadyExists: false });
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

const getCartFromDatabase = function (userId, postgres, callback) {
    // -1 - empty cart else [0:-2] - items [-1] - price
    postgres.query(`SELECT * FROM orders WHERE userid=${userId} and orderstatus=0`, function (err, resultOrder) {
        if (err) {
            throw (err);
        }
        if (!resultOrder.rows[0]) {
            callback(null, -1);
        }
        else {
            let price = parseInt(resultOrder.rows[0].valueoforder)
            let orderId = parseInt(resultOrder.rows[0].id)
            postgres.query(`SELECT * FROM ordereditems WHERE orderid=${orderId}`), function (err, result) {
                if (err) {
                    throw (err);
                }
                callback(null, { orderedItems: result, valueOfOrder: price});
            }
        }
    })
}

const addItemToCartTable = function (productId, orderId, postgres, callback) {
    // check if product in cart
    postgres.query(`SELECT * from ordereditems where orderid=${orderId} and itemid=${productId}`, function (err, resultOrder) {
        if (err) {
            throw (err);
        }
        //no product in cart
        if (!resultOrder.rows[0]) {
            postgres.query(`INSERT INTO ordereditems (orderid, itemid, amount) 
                            VALUES (${orderId}, ${productId}, 1)`, function (err, result) {
                if (err) {
                    throw (err);
                }
                callback(null, 1);
            })
        }
        // product in cart
        else {
            postgres.query(`UPDATE ordereditems SET amount = amount + 1 where orderid = ${orderId} and itemid=${productId}`, function (err, result) {
                if (err) {
                    throw (err);
                }
                callback(null, 1);
            })
        }
        
    })
}


const addItemToCart = function (productId, userId, postgres, callback) {

    // checking if item is in database and getting its price
    postgres.query(`SELECT price FROM item WHERE id=${productId}`, function (err, resultsItem) {
        if (err) {
            throw (err);
        }
        if (!resultsItem.rows[0]) {
            callback(null, -1);
        }
        else {
            let productPrice = resultsItem.rows[0].price

            postgres.query(`SELECT * FROM orders WHERE userid=${userId} and orderstatus=0`, function (err, resultOrder) {
                if (err) {
                    throw (err);
                }
                // if user doesn't have a cart
                if (!resultOrder.rows[0]) {
                    postgres.query(`INSERT INTO orders (userid, orderstatus, valueoforder) VALUES 
                                  (${userId}, 0, ${productPrice}) RETURNING id`, function (err, result) {
                        if (err) {
                            throw (err);
                        }
                        let orderId = parseInt(result.rows[0].id);
                        addItemToCartTable(productId, orderId, postgres, callback);
                    })
                }
                // else
                else {
                    postgres.query(`UPDATE orders SET valueoforder = valueoforder + ${productPrice}
                                    WHERE userid=${userId} and orderstatus=0 RETURNING id`, function (err, result) {
                        if (err) {
                            throw (err);
                        }
                        let orderId = parseInt(result.rows[0].id);
                        addItemToCartTable(productId, orderId, postgres, callback);
                    })
                }
            })
        }
    })
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

module.exports = {
    logConnection, convertCategoryName, getPopularProducts, getProductData, loginClient,
    registerClient, deleteAccount, changePassword, addItemToCart, getCartFromDatabase
};
