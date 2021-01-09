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

const getVariations = function (productId, productName, postgres, callback) {
    postgres.query(`SELECT id, itemname, color, dimensions, width, height, depth, picture 
                    FROM item where id <> ${productId} AND itemname = '${productName}' ORDER BY RANDOM() LIMIT 6`,
        function (err, result) {
            if (err) {
                throw (err);
            }

            let returnData = [];

            if (result) {
                result.rows.forEach(element => {
                    element = composeDimension(element);

                    returnData.push(element);
                });

                callback(null, returnData);
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

            getVariations(productId, row.itemname, postgres, (error, variations) => {
                callback(null, { productData: row, variations: variations });
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
    postgres.query(`SELECT email FROM users WHERE email='${email}'`, function (err, result) {
        if (err) {
            throw (err);
        }
        let row = result.rows[0];

        if (row) {
            callback(null, {userAlreadyExists: true});
        }
        else {
            bcrypt.hash(password, 10, (error, result) => {
                postgres.query(`INSERT INTO users(email, password, isadmin) VALUES ('${email}', '${result}', FALSE)`, function (err, result) {
                    if (err) {
                        throw (err);
                    }
                    
                    callback(null, {userAlreadyExists: false, userId: result.rows[0].id});
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

module.exports = { logConnection, convertCategoryName, getPopularProducts, getProductData, loginClient, registerClient };
