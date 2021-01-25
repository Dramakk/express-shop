function controlSlider(sliderId) {
    $(".carousel").carousel({
        interval: 7500,
        pause: false,
        ride: "carousel"
    })
}

function checkPassword() {
    let $passwordInput = $('input[name="password"]'),
        $passwordCheck = $('input[name="passwordCheck"]'),
        $alert = $('#alertP');

    if ($passwordInput.length !== 0) {
        $('#checkP').on('submit', (e) => {
            if($passwordInput[0].value.length < 5){
                e.preventDefault();
                $alert.text('Hasło powinno mieć conajmniej 5 znaków.');
                $alert.show();
            }
            if ($passwordCheck[0].value !== $passwordInput[0].value) {
                e.preventDefault();
                $alert.text('Upewnij się, że oba hasła się zgadzają.');
                $alert.show();
            }
        });
    }
}

function appendSearchItem(element, $resultsList){
    $resultsList.append(`
    <li class="search-item">
        <img class="search-item-image" src="/images/${element.picture}.png" alt="${element.itemname}">
        <a href="/products/${element.id}">${element.itemname}</a>
    </li>`);
}

function getSearchResults(searchString, $resultsList){
    if(searchString.length >= 4){
        $.ajax({
            url: '/search?isAjax=1&searchString='+searchString,
            method: "GET"
        }).done(function(data){
            $resultsList.empty();
            $resultsList.show();
            data.forEach(element => {
                appendSearchItem(element, $resultsList);
            });
        })
    }
}

function searchBarControl(){
    let $searchInput = $('input[name="searchString"]'),
        $resultsList = $('.search-items');

    if($searchInput.length !== 0){
        $searchInput = $searchInput[0];
        
        $('input[name="searchString"]').on('focusin', (e) =>{
        getSearchResults($searchInput.value, $resultsList);
        });

        $('input[name="searchString"]').on('keyup', (e) =>{
            getSearchResults($searchInput.value, $resultsList);
        });

        $('input[name="searchString"]').on('focusout', (e) =>{
        $resultsList.empty();
        $resultsList.hide();
        });
    }
}

$(document).ready(function () {
    searchBarControl();
    checkPassword();
    controlSlider("#sliderMainPage");
});
