const pokeImg = document.querySelector('#poke-img');
const pokeDescription = document.querySelector('#desc')
const pokeDmg = document.querySelector('#dmg');//owo
const pokeDef = document.querySelector('#dfs');;//:0
const pokeSpeed = document.querySelector("#speed");
const pokeSpDef = document.querySelector("#sp-def"); //:l
const pokeSpAtck = document.querySelector("#sp-atck");
const pokePS = document.querySelector("#ps"); //:o
const pokemonsList = document.querySelector("#pokemons");
const pokeEvol = document.querySelector("#evol");
const pokeName = document.querySelector('#name');
const BASE_API = 'https://pokeapi.co/api/v2/';
const pokemon_API = `${BASE_API}pokemon`;
let currentPokemon; //uwu
let sprites = []; //80 va a guardar todos los valores de las img y se´r más facil iterar
let currentSprite = 0;//90
let listPokemons ="";//p3

const fetchData = (API) => {
    return  fetch(API)
        .then(res => res.json())
        .then(data => data)
};

const writeDescription = (API, node) => {
    fetchData(API).then((specie) => {
      node.textContent = specie.flavor_text_entries[0].flavor_text
    });
  };

// fetchData(`${pokemon_API}/1`)
//vamos a mostrarlo en nuestro HTML
const printPokemon = (pokemon) => {
    const data = fetchData(`${pokemon_API}/${pokemon}`).then(data =>{
        if(sprites.length > 0){
            sprites = []
        }
        currentPokemon = data; //uwu aqui puedes conectar el buscador
        // console.log(currentPokemon);
        pokeImg.src = data.sprites.other["official-artwork"].front_default;
        pokePS.textContent = data.stats[0].base_stat; //:o
        pokePS.style.width = `${data.stats[0].base_stat/2}%`;
        pokeDmg.textContent = data.stats[1].base_stat;//owo
        pokeDmg.style.width = `${data.stats[1].base_stat/2}%`;
        pokeDef.textContent = data.stats[2].base_stat;//:0
        pokeDef.style.width = `${data.stats[2].base_stat/2}%`;//:0
        pokeSpDef.textContent = data.stats[4].base_stat;
        pokeSpDef.style.width =`${data.stats[4].base_stat/2}%`;
        pokeSpeed.textContent = data.stats[5].base_stat;
        pokeSpeed.style.width =  `${data.stats[5].base_stat/2}%`;
        writeDescription(data.species.url, pokeDescription)
        pokeName.textContent = data.name;
        const pokeSprites = currentPokemon.sprites//80
        for (const key in pokeSprites) {//80
            if(typeof pokeSprites[key] === "string")
                sprites.push(pokeSprites[key]);
        }
        console.log(sprites);
    });
    // console.log(data)
};

//P2
const printPokemons = (API) => {
    const loader = document.createElement('li');
    loader.classList.add('loader');
    pokemonsList.append(loader);
    fetchData(API) //fetchData llama a la Api de la url actual
    .then((pokemons) => {
        loader.remove();
        // console.log(pokemons)
        listPokemons = pokemons;
        pokemons.results.map((pokemon)=> {
            const listItem = document.createElement('li')
            fetchData(pokemon.url) //llamamos a la api con url /pokemon/nombre te dejo la captura en la documentación 
            .then((details) => {
                // console.log(details.types.map((type) => type.type.name)); //solo es para ver en consola si se esta llamando bien
                // listItem.classList.add(details.types[0].type.name)//este me va a dar el color de las targetas que cubran toda la targeta
                listItem.innerHTML = `
                <div class="card me-2 card-container-poke2" >
                <img src=${details.sprites.other["official-artwork"].front_default} alt=${details.name} class="card-img-top">
                <p>#${details.id}</p>
                <div class="card-body" >
                <h3 class="card-title">${details.name}</h3>
                ${details.types.map((type) => `<span class=${type.type.name}>${type.type.name}</span>`)}
                <p id="${details.name}" class="card-text m-3"></p>
                <button onclick=printPokemon(${details.id}) class="btn btn-primary">Show Pokemon</button>
                </div>
                </div>
                `;
                const detailsPokemon = document.querySelector(`#${details.name}`);
                // console.log(detailsPokemon);
                writeDescription(details.species.url, detailsPokemon);
            });
            pokemonsList.appendChild(listItem)
        });
    })
}

const prevImg = () =>{
    // pokeImg.src = currentPokemon.sprites.back_default;
    if(currentSprite === 0){ //90 si estamos en el limite hacia atras, tenemos que volver a la pposition más grande del array
        currentSprite = sprites.length - 1;// le restamos 1 porque esta API  no cuenta el cero
    }else{//si es > 0 
        currentSprite --;
    }
    pokeImg.src = sprites[currentSprite];
}

const nextImg = () =>{
    if(currentSprite === sprites.length - 1){ //90 
        currentSprite = 0;// le restamos 1 porque esta API  no cuenta el cero
    }else{//si es > 0 
        currentSprite ++
    }
    pokeImg.src = sprites[currentSprite];
}

const prevPokemon = () => {
    if(currentPokemon.id === 1){
        currentPokemon.id = 250;
    }
    printPokemon(currentPokemon.id - 1)
}

const nextPokemon = () => {
    printPokemon(currentPokemon.id + 1)
}

const nextPokemons = () => {
    pokemonsList.innerHTML = "";//quitar los pokemones anteriores de la lista
    fetchData(listPokemons.next)
    .then(newData => {
        // console.log(newData);
        printPokemons(newData.next)
    });
}

const prevPokemons = () =>{
    pokemonsList.innerHTML = "";
    fetchData(listPokemons.previous)
    .then(newData => {
        printPokemons(newData.previous)
        // console.log(newData.previous)
        
    });
}

const searchPokemon = () =>{
    event.preventDefault();//buscar en google, pero creo es para evitar que te redireccione
    // console.log(event.target.search); //name del input es search, me trae la etiqueta que tiene el input
    const input = event.target.search;
    // console.log(input.value); //imprime el valor del input
    fetchData(`${BASE_API}pokemon/${input.value}`)
    .then((data) =>
    // console.log(data)
    printPokemon(data.name))
}

printPokemon(1)
printPokemons(`${BASE_API}pokemon?limit=500&offset=0`);
