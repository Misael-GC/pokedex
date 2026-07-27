const BASE_API = 'https://pokeapi.co/api/v2/';
const pokemon_API = `${BASE_API}pokemon`;

// Teams State
let squadA = []; // Player
let squadB = []; // CPU

let battleState = {
    activeA: 0,
    activeB: 0,
    pokemonA: null, // Detailed combat stats
    pokemonB: null,
    turn: '', // 'player' or 'cpu'
    isProcessing: false
};

// Synth sounds
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
        } else if (type === 'faint') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.linearRampToValueAtTime(50, now + 0.4);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
        } else if (type === 'win') {
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
            osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
            osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        }
    } catch (e) {
        console.log("AudioContext blocked or unsupported.");
    }
};

const fetchData = (API) => {
    return fetch(API)
        .then(res => {
            if (!res.ok) throw new Error('Response error');
            return res.json();
        });
};

// Cyber Modal System
const showCyberModal = (title, message) => {
    const modal = document.getElementById('cyber-modal');
    const titleEl = document.getElementById('cyber-modal-title');
    const msgEl = document.getElementById('modal-message-cyber');
    if (modal && titleEl && msgEl) {
        titleEl.textContent = title;
        msgEl.textContent = message;
        modal.classList.add('active');
        playSound('error');
    }
};

window.closeCyberModal = () => {
    const modal = document.getElementById('cyber-modal');
    if (modal) {
        modal.classList.remove('active');
        playSound('click');
    }
};

// Add Member
const addSquadMember = (e, team) => {
    if (e) e.preventDefault();
    const form = document.getElementById(`add-member-${team.toLowerCase()}`);
    const input = form.querySelector('input[name="pokemon"]');
    const query = input.value.trim().toLowerCase();

    if (!query) return;

    const squad = team === 'A' ? squadA : squadB;
    if (squad.length >= 3) {
        showCyberModal('ALERTA SQUAD', 'El escuadrón ya está al límite (máximo 3 Pokémon).');
        return;
    }

    fetchData(`${pokemon_API}/${query}`)
        .then(data => {
            playSound('click');
            squad.push({
                id: data.id,
                name: data.name,
                sprite: data.sprites.front_default || data.sprites.other["official-artwork"].front_default,
                types: data.types,
                stats: data.stats,
                moves: data.moves
            });
            input.value = '';
            renderSquadPreviews();
            checkStartButton();
        })
        .catch(() => {
            playSound('error');
            showCyberModal('ERROR DE ESCANEO', 'Pokémon no encontrado en la base de datos de PokeAPI.');
        });
};

// Autogenerate Squad B
const autoGenerateOpponents = () => {
    playSound('scan');
    squadB = [];
    renderSquadPreviews();
    checkStartButton();

    const fetchPromises = Array.from({ length: 3 }, () => {
        const randomId = Math.floor(Math.random() * 898) + 1; // Gen 1-8 random range
        return fetchData(`${pokemon_API}/${randomId}`);
    });

    Promise.all(fetchPromises)
        .then(results => {
            results.forEach(data => {
                squadB.push({
                    id: data.id,
                    name: data.name,
                    sprite: data.sprites.front_default || data.sprites.other["official-artwork"].front_default,
                    types: data.types,
                    stats: data.stats,
                    moves: data.moves
                });
            });
            renderSquadPreviews();
            checkStartButton();
        })
        .catch(err => {
            console.error('Error auto-generating opponents:', err);
            showCyberModal('ERROR EN ENLACE', 'Fallo al conectar con la PokeAPI.');
        });
};

const removeSquadMember = (team, index) => {
    playSound('error');
    if (team === 'A') {
        squadA.splice(index, 1);
    } else {
        squadB.splice(index, 1);
    }
    renderSquadPreviews();
    checkStartButton();
};

const renderSquadPreviews = () => {
    const listA = document.getElementById('squad-a-list');
    const listB = document.getElementById('squad-b-list');

    const render = (squad, container, team) => {
        container.innerHTML = '';
        squad.forEach((poke, idx) => {
            const previewCard = document.createElement('div');
            previewCard.className = 'card-container-poke2';
            previewCard.style.width = '100px';
            previewCard.style.padding = '8px';
            previewCard.style.position = 'relative';
            previewCard.innerHTML = `
                <button type="button" onclick="removeSquadMember('${team}', ${idx})" style="position: absolute; top: 2px; right: 2px; background: transparent; border: none; color: var(--neon-red); font-size: 0.8rem; cursor: pointer;">&times;</button>
                <div class="card-img-wrapper" style="height: 50px;">
                    <img src="${poke.sprite}" alt="${poke.name}" style="max-height: 45px;">
                </div>
                <span class="pokemon-id" style="font-size: 0.55rem;">#${poke.id}</span>
                <span style="font-family: var(--font-cyber); font-size: 0.55rem; color: #fff; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; display: block; text-align: center;">${poke.name}</span>
            `;
            container.appendChild(previewCard);
        });
    };

    render(squadA, listA, 'A');
    render(squadB, listB, 'B');
};

const checkStartButton = () => {
    const startBtn = document.getElementById('start-arena-btn');
    if (startBtn) {
        startBtn.disabled = !(squadA.length === 3 && squadB.length === 3);
    }
};

// ==========================================================================
// ARENA COMBAT ENGINE
// ==========================================================================

const initializeArenaFight = () => {
    playSound('scan');
    // Hide selector phase
    document.getElementById('selection-phase').style.display = 'none';
    // Show battle phase
    document.getElementById('battle-phase').style.display = 'block';

    battleState.activeA = 0;
    battleState.activeB = 0;
    battleState.isProcessing = false;

    const log = document.getElementById('arena-log');
    if (log) log.innerHTML = `<p class="log-entry system-msg">[SISTEMA] INICIANDO ARENA DE COMBATE 3V3...</p>`;

    // Render reserve indicator dots
    renderReservePills();

    // Load first fighters
    loadActiveFighters().then(() => {
        // Randomize first turn
        battleState.turn = Math.random() > 0.5 ? 'player' : 'cpu';
        appendArenaLog(`DECIDIENDO TURNO INICIAL DE FORMA ALEATORIA...`);
        
        setTimeout(() => {
            if (battleState.turn === 'player') {
                appendArenaLog(`[TURNO] ¡EL JUGADOR INICIA EL PRIMER ATAQUE!`);
                renderPlayerAttackControls();
            } else {
                appendArenaLog(`[TURNO] ¡EL OPONENTE RIVAL TOMA LA INICIATIVA!`);
                triggerCPUTurn();
            }
        }, 1200);
    });
};

const renderReservePills = () => {
    const reserveA = document.getElementById('reserve-a-pills');
    const reserveB = document.getElementById('reserve-b-pills');

    const renderPills = (squad, activeIdx, container) => {
        container.innerHTML = '';
        squad.forEach((poke, idx) => {
            const pill = document.createElement('span');
            pill.style.width = '8px';
            pill.style.height = '8px';
            pill.style.borderRadius = '50%';
            
            if (idx < activeIdx) {
                // Fainted
                pill.style.backgroundColor = 'var(--neon-red)';
                pill.style.boxShadow = '0 0 5px var(--neon-red)';
            } else if (idx === activeIdx) {
                // Active
                pill.style.backgroundColor = 'var(--neon-cyan)';
                pill.style.boxShadow = '0 0 8px var(--neon-cyan)';
            } else {
                // Reserve alive
                pill.style.backgroundColor = 'var(--neon-green)';
                pill.style.boxShadow = '0 0 5px var(--neon-green)';
            }
            container.appendChild(pill);
        });
    };

    renderPills(squadA, battleState.activeA, reserveA);
    renderPills(squadB, battleState.activeB, reserveB);
};

const loadActiveFighters = () => {
    const memberA = squadA[battleState.activeA];
    const memberB = squadB[battleState.activeB];

    if (!memberA || !memberB) return Promise.resolve();

    // Setup Detailed Player Stats
    battleState.pokemonA = {
        name: memberA.name,
        sprite: memberA.sprite,
        hpMax: memberA.stats[0].base_stat * 2, // Double stats for longer battle
        hpCur: memberA.stats[0].base_stat * 2,
        attack: memberA.stats[1].base_stat,
        defense: memberA.stats[2].base_stat,
        types: memberA.types.map(t => t.type.name),
        moves: []
    };

    // Setup Detailed CPU Stats
    battleState.pokemonB = {
        name: memberB.name,
        sprite: memberB.sprite,
        hpMax: memberB.stats[0].base_stat * 2,
        hpCur: memberB.stats[0].base_stat * 2,
        attack: memberB.stats[1].base_stat,
        defense: memberB.stats[2].base_stat,
        types: memberB.types.map(t => t.type.name),
        moves: []
    };

    // Load UI
    document.getElementById('fighter-a-img').src = battleState.pokemonA.sprite;
    document.getElementById('fighter-a-name').textContent = `#${memberA.id} - ${battleState.pokemonA.name.toUpperCase()}`;
    updateHPBar('A');

    document.getElementById('fighter-b-img').src = battleState.pokemonB.sprite;
    document.getElementById('fighter-b-name').textContent = `#${memberB.id} - ${battleState.pokemonB.name.toUpperCase()}`;
    updateHPBar('B');

    // Load Movesets
    const rawMovesA = memberA.moves.slice(0, 4);
    const rawMovesB = memberB.moves.slice(0, 4);

    const promisesA = rawMovesA.map(m => fetchData(m.move.url));
    const promisesB = rawMovesB.map(m => fetchData(m.move.url));

    return Promise.all([...promisesA, ...promisesB]).then(results => {
        const movesA = results.slice(0, promisesA.length);
        const movesB = results.slice(promisesA.length);

        battleState.pokemonA.moves = movesA.map(m => ({
            name: m.name,
            type: m.type.name,
            power: m.power || 40
        }));

        battleState.pokemonB.moves = movesB.map(m => ({
            name: m.name,
            type: m.type.name,
            power: m.power || 40
        }));
    });
};

const updateHPBar = (team) => {
    const poke = team === 'A' ? battleState.pokemonA : battleState.pokemonB;
    const hpBar = document.getElementById(`fighter-${team.toLowerCase()}-hp`);
    const hpText = document.getElementById(`fighter-${team.toLowerCase()}-hp-text`);

    if (poke && hpBar && hpText) {
        const percent = (poke.hpCur / poke.hpMax) * 100;
        hpBar.style.width = `${percent}%`;
        hpText.textContent = `${poke.hpCur} / ${poke.hpMax} HP`;
    }
};

const renderPlayerAttackControls = () => {
    const container = document.getElementById('arena-actions');
    const title = document.getElementById('action-panel-title');
    if (!container || !battleState.pokemonA) return;

    title.textContent = `// SELECCIONAR ACCIÓN: ${battleState.pokemonA.name.toUpperCase()}`;
    container.innerHTML = '';

    battleState.pokemonA.moves.forEach(move => {
        const btn = document.createElement('button');
        btn.className = `cyber-btn-sm type-badge ${move.type}`;
        btn.style.cursor = 'pointer';
        btn.style.textTransform = 'uppercase';
        btn.textContent = move.name.replace(/-/g, ' ');
        btn.onclick = () => {
            if (battleState.isProcessing || battleState.turn !== 'player') return;
            executeAttack('player', move);
        };
        container.appendChild(btn);
    });
};

// Core Combat Turn
const executeAttack = (attackerSide, move) => {
    battleState.isProcessing = true;
    const isPlayerAttacking = attackerSide === 'player';
    
    const attacker = isPlayerAttacking ? battleState.pokemonA : battleState.pokemonB;
    const defender = isPlayerAttacking ? battleState.pokemonB : battleState.pokemonA;
    const defenderTeam = isPlayerAttacking ? 'B' : 'A';

    playSound('click');

    // Calculate base damage
    let baseDmg = Math.floor(((attacker.attack / 7) + (move.power / 6)) + (Math.random() * 4));
    
    // Type matchup calculation mock
    // Simple checks: super effective if fire -> grass, water -> fire, grass -> water etc.
    let mult = 1.0;
    const typeAdvantages = {
        fire: ['grass', 'ice', 'bug', 'steel'],
        water: ['fire', 'ground', 'rock'],
        grass: ['water', 'ground', 'rock'],
        electric: ['water', 'flying'],
        ice: ['grass', 'ground', 'flying', 'dragon'],
        fighting: ['normal', 'ice', 'rock', 'dark', 'steel'],
        poison: ['grass', 'fairy'],
        ground: ['fire', 'electric', 'poison', 'rock', 'steel'],
        flying: ['grass', 'fighting', 'bug'],
        psychic: ['fighting', 'poison'],
        bug: ['grass', 'psychic', 'dark'],
        rock: ['fire', 'ice', 'flying', 'bug'],
        ghost: ['psychic', 'ghost'],
        dragon: ['dragon'],
        dark: ['psychic', 'ghost'],
        steel: ['ice', 'rock', 'fairy'],
        fairy: ['fighting', 'dragon', 'dark']
    };

    defender.types.forEach(defType => {
        if (typeAdvantages[move.type] && typeAdvantages[move.type].includes(defType)) {
            mult *= 1.5;
        }
    });

    let damage = Math.floor(baseDmg * mult);
    const isCritical = Math.random() > 0.88;
    if (isCritical) damage = Math.floor(damage * 1.5);

    // Apply damage
    defender.hpCur = Math.max(0, defender.hpCur - damage);
    updateHPBar(defenderTeam);

    let effectMsg = '';
    if (mult > 1) effectMsg = ' ¡Es súper efectivo!';
    if (isCritical) effectMsg += ' ¡GOLPE CRÍTICO!';

    appendArenaLog(`${attacker.name.toUpperCase()} usó ${move.name.toUpperCase()} e infligió ${damage} dmg.${effectMsg}`);

    // Check Faint
    if (defender.hpCur <= 0) {
        playSound('faint');
        appendArenaLog(`[¡CAÍDO!] ${defender.name.toUpperCase()} se ha debilitado.`);
        
        setTimeout(() => {
            handleSquadRelevo(defenderTeam);
        }, 1000);
        return;
    }

    // Switch turns
    setTimeout(() => {
        battleState.isProcessing = false;
        if (isPlayerAttacking) {
            battleState.turn = 'cpu';
            triggerCPUTurn();
        } else {
            battleState.turn = 'player';
            renderPlayerAttackControls();
        }
    }, 1000);
};

const triggerCPUTurn = () => {
    const container = document.getElementById('arena-actions');
    const title = document.getElementById('action-panel-title');
    if (container) container.innerHTML = '<span class="status-pill" style="grid-column: 1 / -1; text-align: center; color: var(--neon-red); border-color: rgba(255,0,91,0.25);">PROCESANDO TURNO DE OPONENTE...</span>';
    if (title) title.textContent = '// TURNO DEL OPONENTE';

    setTimeout(() => {
        if (battleState.opponentHP <= 0 || battleState.playerHP <= 0 || battleState.isProcessing) return;
        
        // Pick random move
        const moves = battleState.pokemonB.moves;
        const randomMove = moves[Math.floor(Math.random() * moves.length)];
        executeAttack('cpu', randomMove);
    }, 1200);
};

const handleSquadRelevo = (team) => {
    if (team === 'A') {
        battleState.activeA++;
        renderReservePills();
        if (battleState.activeA >= squadA.length) {
            // Player lost
            endBattleSimulation(false);
        } else {
            appendArenaLog(`[RELEVO] ¡Sale ${squadA[battleState.activeA].name.toUpperCase()} al campo de batalla!`);
            loadActiveFighters().then(() => {
                battleState.isProcessing = false;
                battleState.turn = 'cpu'; // CPU strikes
                triggerCPUTurn();
            });
        }
    } else {
        battleState.activeB++;
        renderReservePills();
        if (battleState.activeB >= squadB.length) {
            // Player won
            endBattleSimulation(true);
        } else {
            appendArenaLog(`[RELEVO RIVAL] ¡El oponente envía a ${squadB[battleState.activeB].name.toUpperCase()}!`);
            loadActiveFighters().then(() => {
                battleState.isProcessing = false;
                battleState.turn = 'player'; // Player turn
                renderPlayerAttackControls();
            });
        }
    }
};

const endBattleSimulation = (playerWon) => {
    battleState.isProcessing = true;
    
    if (playerWon) {
        playSound('win');
        showCyberModal('¡VICTORIA EN ARENA!', 'Has derrotado a todas las unidades del escuadrón rival de la CPU. Simulación de combate exitosa.');
        appendArenaLog(`[SISTEMA] SIMULACIÓN COMPLETADA: ¡VICTORIA TOTAL JUGADOR!`);
    } else {
        playSound('error');
        showCyberModal('¡DERROTA EN ARENA!', 'Tus 3 unidades de combate han sido destruidas. El escuadrón rival se declara ganador.');
        appendArenaLog(`[SISTEMA] SIMULACIÓN COMPLETADA: DETECTADA DERROTA.`);
    }

    // Reset controls
    const container = document.getElementById('arena-actions');
    if (container) {
        container.innerHTML = `
            <button class="cyber-btn" onclick="resetArenaToSelection()" style="grid-column: 1 / -1; width: 100%; border-color: var(--neon-cyan); color: var(--neon-cyan);">
                REINICIAR ARENA DE COMBATE
            </button>
        `;
    }
};

const resetArenaToSelection = () => {
    playSound('click');
    document.getElementById('battle-phase').style.display = 'none';
    document.getElementById('selection-phase').style.display = 'block';
    
    squadA = [];
    squadB = [];
    renderSquadPreviews();
    checkStartButton();
};

const appendArenaLog = (msg) => {
    const log = document.getElementById('arena-log');
    if (log) {
        const entry = document.createElement('p');
        entry.className = 'log-entry';
        entry.textContent = `> ${msg}`;
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
    }
};
