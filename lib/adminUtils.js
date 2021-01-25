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

const getPopularProducts = async function(postgres, limit = 5){
    let popularProducts = [];

    try{
        popularProducts = await postgres.query(`SELECT * FROM (SELECT id, SUM(amount) 
            FROM ordereditems JOIN item ON ordereditems.itemid = item.id GROUP BY id ORDER BY sum DESC LIMIT ${limit}) as popular 
            JOIN item ON item.id = popular.id ORDER BY sum DESC`);
    }catch(error){
        throw error;
    }
    return popularProducts.rows;
}
module.exports = {getLastOrders, getPopularProducts}