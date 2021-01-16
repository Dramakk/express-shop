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
            let price = parseInt(resultOrder.rows[0].valueoforder);
            let orderId = parseInt(resultOrder.rows[0].id);

            postgres.query(`SELECT * FROM ordereditems INNER JOIN item ON item.id=ordereditems.itemid WHERE orderid=${orderId}`, function (err, result) {
                if (err) {
                    throw (err);
                }
                callback(null, { orderedItems: result.rows, valueOfOrder: price});
            })
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
    if(userId === undefined){
        callback(null, -1);
    }
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

module.exports = {getCartFromDatabase, addItemToCart}