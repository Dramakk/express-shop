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

const searchForProducts = function (searchString, postgres, callback) {
    let safeSearchString = searchString.replace(/(<([^>]+)>)/gi, ""),
        itemNameSearch = safeSearchString.toLowerCase();

    postgres.query(`SELECT DISTINCT ON (itemname) picture, itemname, id, price FROM item 
        WHERE itemname LIKE '%${itemNameSearch}%' OR description LIKE '%${safeSearchString}%'`, (error, result) => {
        if (error) {
            callback(error, -1);
        }
        else {
            callback(null, result.rows);
        }
    });
};

const categoryNameToDimension = function (categoryName) {
    switch (categoryName) {
        case "2dshapes":
            return 2;
        case "3dshapes":
            return 3;
        case "sets":
            return 1;
    };
};

const getProductsByCategory = function (category, postgres, callback) {
    if (category === -1) {
        postgres.query(`SELECT DISTINCT ON (itemname) * FROM item`, (error, result) => {
            if (error) {
                throw error;
            }
            else {
                callback(null, result.rows);
            }
        });
    }
    else {
        let dim = categoryNameToDimension(category);

        postgres.query(`SELECT DISTINCT ON (itemname) * FROM item WHERE dimensions=${dim}`, (error, result) => {
            if (error) {
                throw error;
            }
            else {
                callback(null, result.rows);
            }
        });
    }
};


module.exports = { getProductData, searchForProducts, getProductsByCategory };