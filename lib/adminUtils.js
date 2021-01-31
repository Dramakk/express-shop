const convertOrdersStatus = function (orders) {
    orders.map(order => {
        let status = 'Koszyk';

        switch (order.orderstatus) {
            case 1:
                status = 'Złożone';
                break;
            case 2:
                status = 'Opłacone';
                break;
            case 3:
                status = 'Wysłane';
                break;
        }
        order.orderStatusConverted = status;
    });

    return orders;
}

const getLastOrders = function (postgres, callback, limit = 5) {
    postgres.query(`SELECT * FROM orders LIMIT ${limit}`, function (err, result) {
        if (err) {
            throw (err);
        }
        callback(null, convertOrdersStatus(result.rows));
    });
}

const getPopularProducts = async function (postgres, limit = 5) {
    let popularProducts = [];

    try {
        popularProducts = await postgres.query(`SELECT * FROM (SELECT id, SUM(amount) 
            FROM ordereditems JOIN item ON ordereditems.itemid = item.id GROUP BY id ORDER BY sum DESC LIMIT ${limit}) as popular 
            JOIN item ON item.id = popular.id ORDER BY sum DESC`);
    } catch (error) {
        throw error;
    }
    return popularProducts.rows;
}

const getAllProducts = async function (postgres) {
    let allProducts = [];

    try {
        allProducts = await postgres.query(`SELECT * FROM item WHERE isdeleted = false ORDER BY itemname`);
    } catch (error) {
        throw error;
    }
    return allProducts.rows;
}

const deleteItem = function (id, postgres, callback) {
    postgres.query(`UPDATE item SET isdeleted = true WHERE id = ${id}`, (error, result) => {
        if (error) {
            throw error;
        }
        else {
            //Check all carts and remove deleted item
            postgres.query(`DELETE FROM ordereditems WHERE itemid IN 
                            (SELECT itemid FROM (ordereditems JOIN orders ON ordereditems.orderid = orders.id) 
                            WHERE orderstatus = 0 AND itemid IN 
                            (SELECT itemid FROM ordereditems JOIN item on ordereditems.itemid = item.id 
                                WHERE item.isdeleted = true AND item.id = ${id}))`, (error, result) => {
                if (error) {
                    throw error;
                }
                else {
                    callback(null, 1);
                }
            });
        }
    });
}

const updateProductData = function (productData, picturePath, itemId, postgres, callback) {
    if (picturePath === null) {
        postgres.query(`UPDATE item SET
                    itemname = '${productData.itemname}',
                    description = '${productData.description}',
                    dimensions = ${parseInt(productData.dimensions)},
                    color = '${productData.color}',
                    width = ${parseFloat(productData.width)},
                    height = ${parseFloat(productData.height)},
                    depth = ${parseFloat(productData.depth)},
                    price = ${parseFloat(productData.price) * 100}
                    WHERE id = ${parseInt(itemId)}`,
            function (err, results) {
                if (err) {
                    throw (err);
                }
                else {
                    callback(null, 1);
                }
            });
    }
    else {
        postgres.query(`UPDATE item SET
                    itemname = '${productData.itemname}',
                    description = '${productData.description}',
                    dimensions = ${parseInt(productData.dimensions)},
                    color = '${productData.color}',
                    width = ${parseFloat(productData.width)},
                    height = ${parseFloat(productData.height)},
                    depth = ${parseFloat(productData.depth)},
                    price = ${parseFloat(productData.price) * 100},
                    picture = '${picturePath}'
                    WHERE id = ${parseInt(itemId)}`,
            function (err, results) {
                if (err) {
                    throw (err);
                }
                else {
                    callback(null, 1);
                }
            });
    }
}

const createProduct = function (productData, file, postgres, path, fs, callback) {
    postgres.query(`INSERT INTO item (itemname, description, dimensions, color, width, height, depth, price, picture, isdeleted) VALUES
                    ('${productData.itemname}',
                    '${productData.description}',
                    ${parseInt(productData.dimensions)},
                    '${productData.color}',
                    ${parseFloat(productData.width)},
                    ${parseFloat(productData.height)},
                    ${parseFloat(productData.depth)},
                    ${parseFloat(productData.price) * 100},
                    '',
                    false) RETURNING id`,
        function (err, results) {
            if (err) {
                throw (err);
            }
            else {
                let tempPath = file.path;
                let targetPath = path.join(__dirname, "../views/images/" + results.rows[0].id + ".png");

                if (path.extname(file.originalname).toLowerCase() === ".png") {
                    fs.rename(tempPath, targetPath, err => {
                        if (err) throw err;
                        postgres.query(`UPDATE item SET picture = ${results.rows[0].id} WHERE id = ${results.rows[0].id}`, (error, result) => {
                            if (error) {
                                throw error;
                            } else {
                                callback(null, 1);
                            }
                        });
                    });
                } else {
                    fs.unlink(tempPath, err => {
                        if (err) throw err;
                        callback(null, -1);
                    });
                }
            }
        });
}

const getUsers = function (postgres, callback) {
    postgres.query(`SELECT * FROM users JOIN 
                    (SELECT users.id, COUNT(orders.id) FROM users JOIN 
                    orders ON users.id = orders.userid GROUP BY users.id) 
                    as users2 ON users.id = users2.id;`, function (err, result) {
        if (err) {
            throw (err);
        }
        callback(null, result.rows);
    });
}

const changeOrderStatus = function(status, orderId, postgres, callback){
    postgres.query(`UPDATE orders SET orderstatus = ${status} WHERE id = ${orderId}`, function (err, result) {
        if (err) {
            throw (err);
        }
        callback(null, 1);
    });
}
module.exports = { getLastOrders, getPopularProducts, getAllProducts, deleteItem, updateProductData, createProduct, getUsers, changeOrderStatus }