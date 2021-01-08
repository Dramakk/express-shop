function controlSlider(sliderId){
    $(".carousel").carousel({
        interval: 7500,
        pause: false,
        ride: "carousel"
    })
}

$(document).ready(function (){
    controlSlider("#sliderMainPage");
});