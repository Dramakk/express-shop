const { post } = require("jquery");

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
                throw(err);
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
        })
}

const getProductData = function (productId, postgres, callback) {
    postgres.query(`SELECT * FROM item where id =${productId}`, function (err, result) {
        if (err) {
            throw(err);
        }

        let row = result.rows[0];

        if (row) {
            row = composeDimension(row);

            getVariations(productId, row.itemname, postgres, (error, variations) =>{
                callback(null, {productData: row, variations: variations});
            });
        }
        else {
            callback(null, -1);
        }
    })
}

module.exports = { logConnection, convertCategoryName, getProductData };