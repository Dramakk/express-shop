function controlSlider(sliderId){
    $(".carousel").carousel({
        interval: 7500,
        pause: false,
        ride: "carousel"
    })
}

$(document).ready(function (){
    let $passwordInput = $('input[name="password"]'),
        $passwordCheck = $('input[name="passwordCheck"]'),
        $alert = $('#alertP');

    if($passwordInput.length !== 0){
        $('#checkP').on('submit', (e) => {
            if($passwordCheck[0].value !== $passwordInput[0].value){
                e.preventDefault();
                $alert.text('Upewnij się, że oba hasła się zgadzają.');
                $alert.show();
            }
        });
    }
    controlSlider("#sliderMainPage");
});