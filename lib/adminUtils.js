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
module.exports = { getLastOrders, getPopularProducts, getAllProducts, deleteItem, updateProductData }