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

module.exports = {
    logConnection, convertCategoryName, getPopularProducts
};
