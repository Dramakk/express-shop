const logConnection = function(message, ip){
    console.log(message + "from IP: " + ip);
}

const convertCategoryName = function(categoryName){
    switch (categoryName){
        case "2dshapes":
            return "Figury 2D"
        case "3dshapes":
            return "Figury 3D"
        case "sets":
            return "Zestawy figur"
        default:
            return "Nieznana kategoria"
    }
}
module.exports = {logConnection, convertCategoryName};