const pokebolaOpen = document.querySelector('.pokebola-prymary');
const tapaPokedex = document.querySelector('.tapa');
const pokeLink = document.querySelector('.pokebola');
const pokeClose = document.querySelector('.pokebola-close');


// pokebolaOpen.addEventListener('click', toggleOpenPokedex);
// pokeClose.addEventListener('click', toggleClosePokedex)

function toggleOpenPokedex(){
    const toggle = tapaPokedex.classList.toggle('inactive');
    const apperPokebolaLink = pokeLink.classList.remove('inactive');
}

function toggleClosePokedex(){
    const inactivePokedex = tapaPokedex.classList.remove('inactive');
}