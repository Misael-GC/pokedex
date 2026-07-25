const pokeImg = document.querySelector('#poke-img');
const pokeDescription = document.querySelector('#desc');
const pokeDmg = document.querySelector('#dmg');
const pokeDef = document.querySelector('#dfs');
const pokeSpeed = document.querySelector('#speed');
const pokeSpDef = document.querySelector('#sp-def');
const pokePS = document.querySelector('#ps');
const pokemonsList = document.querySelector('#pokemons');
const pokeName = document.querySelector('#name');

const BASE_API = 'https://pokeapi.co/api/v2/';
const pokemon_API = `${BASE_API}pokemon`;

let currentPokemon = null;
let sprites = [];
let currentSprite = 0;

// Pagination and Filtering State
let activeFilterType = 'all';
let activeFilterGen = 'all';
let currentOffset = 0;
const limit = 20;
let filteredPokemonList = []; // Holds matching pokemons when filtering

// Cyber Beep Synthesizer (Web Audio API)
const playSound = (type) => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        if (type === 'click') {
            osc.frequency.setValueAtTime(750, now);
            osc.frequency.exponentialRampToValueAtTime(1100, now + 0.07);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
            osc.start(now);
            osc.stop(now + 0.07);
        } else if (type === 'scan') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(450, now);
            osc.frequency.exponentialRampToValueAtTime(1400, now + 0.2);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'error') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(130, now);
            osc.frequency.linearRampToValueAtTime(80, now + 0.15);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        }
    } catch (e) {
        console.log("AudioContext not permitted or supported yet.");
    }
};

const fetchData = (API) => {
    return fetch(API)
        .then(res => {
            if (!res.ok) throw new Error('Response error');
            return res.json();
        });
};

// Play current pokemon cry
const playCry = () => {
    if (!currentPokemon || !currentPokemon.cries) return;
    playSound('scan');
    const cryUrl = currentPokemon.cries.latest || currentPokemon.cries.legacy;
    if (cryUrl) {
        const audio = new Audio(cryUrl);
        audio.volume = 0.35;
        audio.play().catch(e => console.log('Audio cry error:', e));
    }
};

// Render Type effectiveness
const printTypeEffectiveness = (types) => {
    const container = document.querySelector('#effectiveness-container');
    if (!container) return;

    container.innerHTML = `<div class="loader-sm"></div>`;

    const allTypes = [
        'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison',
        'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
    ];
    
    // Initialize multipliers
    const multipliers = {};
    allTypes.forEach(t => multipliers[t] = 1.0);

    const fetchPromises = types.map(t => fetchData(`${BASE_API}type/${t.type.name}`));

    Promise.all(fetchPromises)
        .then(results => {
            results.forEach(res => {
                const relations = res.damage_relations;
                relations.double_damage_from.forEach(t => multipliers[t.name] *= 2.0);
                relations.half_damage_from.forEach(t => multipliers[t.name] *= 0.5);
                relations.no_damage_from.forEach(t => multipliers[t.name] *= 0.0);
            });

            container.innerHTML = '';
            
            // Separate into weaknesses and resistances
            const weaknesses = [];
            const resistances = [];
            const immunities = [];

            for (const type in multipliers) {
                const mult = multipliers[type];
                if (mult > 1) {
                    weaknesses.push({ type, mult });
                } else if (mult > 0 && mult < 1) {
                    resistances.push({ type, mult });
                } else if (mult === 0) {
                    immunities.push({ type });
                }
            }

            let html = '';
            if (weaknesses.length > 0) {
                html += `
                    <div class="matchup-block">
                        <span class="matchup-title">// DEBILIDADES:</span>
                        <div class="types-container">
                            ${weaknesses.map(w => `<span class="type-badge ${w.type}">${w.type} <span class="mult-label">${w.mult}x</span></span>`).join('')}
                        </div>
                    </div>
                `;
            }
            if (resistances.length > 0) {
                html += `
                    <div class="matchup-block">
                        <span class="matchup-title">// RESISTENCIAS:</span>
                        <div class="types-container">
                            ${resistances.map(r => `<span class="type-badge ${r.type}">${r.type} <span class="mult-label">${r.mult}x</span></span>`).join('')}
                        </div>
                    </div>
                `;
            }
            if (immunities.length > 0) {
                html += `
                    <div class="matchup-block">
                        <span class="matchup-title">// INMUNIDADES:</span>
                        <div class="types-container">
                            ${immunities.map(i => `<span class="type-badge ${i.type}">${i.type} <span class="mult-label">0x</span></span>`).join('')}
                        </div>
                    </div>
                `;
            }

            container.innerHTML = html || '<p class="status-pill">Sin debilidades notables.</p>';
        })
        .catch(err => {
            console.error('Error fetching type damage relations:', err);
            container.innerHTML = 'Error de diagnóstico de efectividad.';
        });
};

// Traverse and print evolution chain
const printEvolutionChain = (speciesUrl) => {
    const container = document.querySelector('#evolutions-list');
    if (!container) return;

    container.innerHTML = `<div class="loader-sm"></div>`;

    fetchData(speciesUrl)
        .then(species => fetchData(species.evolution_chain.url))
        .then(chainData => {
            const steps = [];
            const traverse = (node) => {
                if (!node) return;
                steps.push({
                    name: node.species.name,
                    id: node.species.url.split('/').filter(Boolean).pop()
                });
                if (node.evolves_to && node.evolves_to.length > 0) {
                    node.evolves_to.forEach(next => traverse(next));
                }
            };
            traverse(chainData.chain);
            
            // Build elements
            container.innerHTML = '';
            
            const fetchStepsDetails = steps.map(step => fetchData(`${pokemon_API}/${step.id}`));
            
            Promise.all(fetchStepsDetails).then(pokes => {
                pokes.forEach(poke => {
                    const isActive = poke.id === currentPokemon.id ? 'active-evo' : '';
                    const wrapper = document.createElement('div');
                    wrapper.className = `evolution-node ${isActive}`;
                    wrapper.onclick = () => {
                        playSound('click');
                        printPokemon(poke.id);
                    };
                    wrapper.innerHTML = `
                        <img src="${poke.sprites.front_default || poke.sprites.other["official-artwork"].front_default}" alt="${poke.name}">
                        <span class="evo-name">${poke.name}</span>
                    `;
                    container.appendChild(wrapper);
                });
            });
        })
        .catch(err => {
            console.error('Error loading evolution chain:', err);
            container.innerHTML = 'Cadena evolutiva no disponible.';
        });
};

const writeDescription = (API, node) => {
    fetchData(API)
        .then((specie) => {
            const entry = specie.flavor_text_entries.find(e => e.language.name === 'es') ||
                          specie.flavor_text_entries.find(e => e.language.name === 'en') ||
                          specie.flavor_text_entries[0];
            if (entry && node) {
                node.textContent = entry.flavor_text.replace(/[\n\f\r]/g, ' ');
            }
        })
        .catch(err => {
            if (node) node.textContent = 'No description available.';
        });
};

const printPokemon = (pokemon) => {
    fetchData(`${pokemon_API}/${pokemon}`)
        .then(data => {
            currentPokemon = data;
            sprites = [];
            currentSprite = 0;
            
            // Set image
            pokeImg.src = data.sprites.other["official-artwork"].front_default || data.sprites.front_default;
            
            // Set Stats
            const statsMap = {
                'hp': pokePS,
                'attack': pokeDmg,
                'defense': pokeDef,
                'special-defense': pokeSpDef,
                'speed': pokeSpeed
            };
            
            data.stats.forEach(statInfo => {
                const statName = statInfo.stat.name;
                const element = statsMap[statName];
                if (element) {
                    element.textContent = statInfo.base_stat;
                    const percent = Math.min((statInfo.base_stat / 150) * 100, 100);
                    element.style.width = `${percent}%`;
                }
            });
            
            writeDescription(data.species.url, pokeDescription);
            
            // Set name + ID
            pokeName.textContent = `#${data.id} - ${data.name}`;

            // Reset and print types inside title container if desired, or build badges next to name
            const existingBadges = document.querySelector('.info-header .types-container');
            if (existingBadges) existingBadges.remove();
            
            const badgeContainer = document.createElement('div');
            badgeContainer.className = 'types-container';
            badgeContainer.style.marginTop = '8px';
            badgeContainer.innerHTML = data.types.map((type) => `<span class="type-badge ${type.type.name}">${type.type.name}</span>`).join('');
            document.querySelector('.info-header').appendChild(badgeContainer);
            
            // Gather all sprites
            const pokeSprites = data.sprites;
            const getSpritesRecursive = (obj) => {
                for (const key in obj) {
                    if (obj[key] && typeof obj[key] === 'string') {
                        sprites.push(obj[key]);
                    } else if (obj[key] && typeof obj[key] === 'object' && key !== 'other') {
                        getSpritesRecursive(obj[key]);
                    }
                }
            };
            getSpritesRecursive(pokeSprites);
            
            if (data.sprites.other["official-artwork"].front_default) {
                sprites = sprites.filter(s => s !== data.sprites.other["official-artwork"].front_default);
                sprites.unshift(data.sprites.other["official-artwork"].front_default);
            }

            // Load extra tabs
            printTypeEffectiveness(data.types);
            printEvolutionChain(data.species.url);
        })
        .catch(err => {
            console.error('Error printing pokemon:', err);
        });
};

// Generation ID boundary mapping
const getGenBoundaries = (gen) => {
    switch (gen) {
        case '1': return { min: 1, max: 151 };
        case '2': return { min: 152, max: 251 };
        case '3': return { min: 252, max: 386 };
        case '4': return { min: 387, max: 493 };
        case '5': return { min: 494, max: 649 };
        case '6': return { min: 650, max: 721 };
        case '7': return { min: 722, max: 809 };
        case '8': return { min: 810, max: 898 };
        case '9': return { min: 899, max: 1025 };
        default: return null;
    }
};

// Core Filtering engine
const loadPokemonList = () => {
    pokemonsList.innerHTML = `<div class="loader"></div>`;
    
    // Case 1: No filters active (Type=all, Gen=all) -> Use normal API pagination
    if (activeFilterType === 'all' && activeFilterGen === 'all') {
        const apiURL = `${pokemon_API}?limit=${limit}&offset=${currentOffset}`;
        fetchData(apiURL)
            .then(data => {
                pokemonsList.innerHTML = '';
                renderListItems(data.results);
            })
            .catch(err => console.error('Error loading list:', err));
        return;
    }

    // Case 2: Filters are active
    const proceedWithFiltering = (allCandidates) => {
        // Apply Gen bounds if needed
        let filtered = allCandidates;
        const bounds = getGenBoundaries(activeFilterGen);
        if (bounds) {
            filtered = filtered.filter(p => {
                const id = parseInt(p.url.split('/').filter(Boolean).pop());
                return id >= bounds.min && id <= bounds.max;
            });
        }
        
        filteredPokemonList = filtered;
        
        // Paginate local results slice
        const slice = filteredPokemonList.slice(currentOffset, currentOffset + limit);
        pokemonsList.innerHTML = '';
        if (slice.length === 0) {
            pokemonsList.innerHTML = '<span class="status-pill" style="margin: 20px auto;">SIN COINCIDENCIAS</span>';
        } else {
            renderListItems(slice);
        }
    };

    if (activeFilterType !== 'all') {
        // Query by Type first
        fetchData(`${BASE_API}type/${activeFilterType}`)
            .then(data => {
                const candidates = data.pokemon.map(p => p.pokemon);
                proceedWithFiltering(candidates);
            })
            .catch(err => console.error('Type filter fetch error:', err));
    } else {
        // Query all pokemons up to 1025 to filter by Gen locally
        fetchData(`${pokemon_API}?limit=1025&offset=0`)
            .then(data => {
                proceedWithFiltering(data.results);
            })
            .catch(err => console.error('Gen filter fetch error:', err));
    }
};

const renderListItems = (list) => {
    list.forEach(pokemon => {
        const listItem = document.createElement('li');
        fetchData(pokemon.url)
            .then(details => {
                listItem.innerHTML = `
                    <div class="card card-container-poke2" onclick="playSound('click'); printPokemon(${details.id})">
                        <div class="card-img-wrapper">
                            <img src="${details.sprites.front_default || details.sprites.other["official-artwork"].front_default}" alt="${details.name}" class="card-img-top">
                        </div>
                        <span class="pokemon-id">#${details.id}</span>
                        <div class="card-body">
                            <h3 class="card-title">${details.name}</h3>
                            <div class="types-container">
                                ${details.types.map((type) => `<span class="type-badge ${type.type.name}">${type.type.name}</span>`).join('')}
                            </div>
                        </div>
                    </div>
                `;
            })
            .catch(err => console.error('Detail error:', err));
        pokemonsList.appendChild(listItem);
    });
};

const prevImg = () => {
    playSound('click');
    if (sprites.length === 0) return;
    if (currentSprite === 0) {
        currentSprite = sprites.length - 1;
    } else {
        currentSprite--;
    }
    pokeImg.src = sprites[currentSprite];
};

const nextImg = () => {
    playSound('click');
    if (sprites.length === 0) return;
    if (currentSprite === sprites.length - 1) {
        currentSprite = 0;
    } else {
        currentSprite++;
    }
    pokeImg.src = sprites[currentSprite];
};

const prevPokemon = () => {
    playSound('click');
    if (!currentPokemon) return;
    let prevId = currentPokemon.id - 1;
    if (prevId < 1) prevId = 1025;
    printPokemon(prevId);
};

const nextPokemon = () => {
    playSound('click');
    if (!currentPokemon) return;
    let nextId = currentPokemon.id + 1;
    if (nextId > 1025) nextId = 1;
    printPokemon(nextId);
};

// Pagination of list
const nextPokemons = () => {
    playSound('click');
    if (activeFilterType === 'all' && activeFilterGen === 'all') {
        currentOffset += limit;
        loadPokemonList();
    } else {
        if (currentOffset + limit < filteredPokemonList.length) {
            currentOffset += limit;
            loadPokemonList();
        }
    }
};

const prevPokemons = () => {
    playSound('click');
    if (currentOffset - limit >= 0) {
        currentOffset -= limit;
        loadPokemonList();
    }
};

const searchPokemon = (e) => {
    if (e) e.preventDefault();
    const searchForm = document.querySelector('#search-form');
    const input = searchForm.querySelector('input[name="search"]');
    const query = input.value.trim().toLowerCase();
    
    if (!query) return;
    
    fetchData(`${BASE_API}pokemon/${query}`)
        .then((data) => {
            playSound('scan');
            printPokemon(data.id);
            input.value = '';
        })
        .catch(() => {
            playSound('error');
            alert('Pokémon no encontrado. Intenta con otro nombre o ID.');
        });
};

// Connect Filter UI Event Listeners
const setupFilters = () => {
    const filterType = document.getElementById('filter-type');
    const filterGen = document.getElementById('filter-gen');

    if (filterType) {
        filterType.addEventListener('change', (e) => {
            playSound('click');
            activeFilterType = e.target.value;
            currentOffset = 0;
            loadPokemonList();
        });
    }

    if (filterGen) {
        filterGen.addEventListener('change', (e) => {
            playSound('click');
            activeFilterGen = e.target.value;
            currentOffset = 0;
            loadPokemonList();
        });
    }
};

// Initial load
printPokemon(1);
loadPokemonList();
setupFilters();
