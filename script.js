var $ = function(id) { return document.getElementById(id); };

var petEl = $('pet');
var petImg = $('pet-img');
var msgEl = $('message');
var notifEl = $('notification');
var roleBadge = $('role-badge');
var dliDisplay = $('dli-display');
var dliAmount = $('dli-amount');
var sleepZz = $('sleep-zz');
var poopsArea = $('poops-area');
var hatchHint = $('hatch-hint');
var gameoverEl = $('gameover');
var deathMsgEl = $('death-msg');
var characterList = $('character-list');
var addCharBtn = $('add-char-btn');
var fileInput = $('file-input');
var screenInner = document.querySelector('.screen-inner');
var statusLabel = $('status-label');

var statEls = {
    hp:   $('bar-hp'),
    food: $('bar-food'),
    nrg:  $('bar-nrg'),
    happy:$('bar-happy')
};

var btnIds = ['btn-eat', 'btn-drink', 'btn-play', 'btn-sleep', 'btn-bath', 'btn-tip'];

var ROLES = {
    egg:     { next: 'dliever', age: 0,   label: 'NEWCOMER', color: '#64748B', scale: 0.85 },
    dliever: { next: 'dcoded',  age: 40,  label: 'DLIEVER',  color: '#10B981', scale: 1.0 },
    dcoded:  { next: 'dco',     age: 120, label: 'DCODED',   color: '#3B82F6', scale: 1.1 },
    dco:     { next: null,       age: 250, label: 'DCO',      color: '#8B5CF6', scale: 1.2 }
};

var DEFAULT_CHARACTERS = ['dlicom-mascot.png', 'cat-pet.png', 'robot-pet.png'];
var state = {};
var cooldown = false;
var msgTimeout = null;
var notifTimeout = null;

// Audio Engine
var AudioEngine = {
    ctx: null,
    initialized: false,
    init: function() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch(e) {}
    },
    play: function(type) {
        if (!this.initialized || !this.ctx) return;
        try {
            var osc = this.ctx.createOscillator();
            var gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            var now = this.ctx.currentTime;
            switch(type) {
                case 'click':
                    osc.frequency.setValueAtTime(800, now);
                    gain.gain.setValueAtTime(0.1, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                    osc.start(now);
                    osc.stop(now + 0.08);
                    break;
                case 'eat':
                    osc.frequency.setValueAtTime(400, now);
                    osc.frequency.linearRampToValueAtTime(600, now + 0.15);
                    gain.gain.setValueAtTime(0.12, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                    osc.start(now); osc.stop(now + 0.2);
                    break;
                case 'happy':
                    osc.frequency.setValueAtTime(523, now);
                    osc.frequency.setValueAtTime(659, now + 0.1);
                    osc.frequency.setValueAtTime(784, now + 0.2);
                    gain.gain.setValueAtTime(0.1, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                    osc.start(now); osc.stop(now + 0.35);
                    break;
                case 'hurt':
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(200, now);
                    osc.frequency.linearRampToValueAtTime(80, now + 0.3);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                    osc.start(now); osc.stop(now + 0.3);
                    break;
                case 'evolve':
                    osc.frequency.setValueAtTime(523, now);
                    osc.frequency.setValueAtTime(659, now + 0.15);
                    osc.frequency.setValueAtTime(784, now + 0.3);
                    osc.frequency.setValueAtTime(1047, now + 0.45);
                    gain.gain.setValueAtTime(0.12, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
                    osc.start(now); osc.stop(now + 0.6);
                    break;
                case 'die':
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(400, now);
                    osc.frequency.linearRampToValueAtTime(50, now + 0.8);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
                    osc.start(now); osc.stop(now + 0.8);
                    break;
                case 'tip':
                    osc.frequency.setValueAtTime(600, now);
                    osc.frequency.setValueAtTime(800, now + 0.08);
                    osc.frequency.setValueAtTime(1000, now + 0.16);
                    gain.gain.setValueAtTime(0.08, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                    osc.start(now); osc.stop(now + 0.25);
                    break;
                case 'wake':
                    osc.frequency.setValueAtTime(400, now);
                    osc.frequency.linearRampToValueAtTime(700, now + 0.2);
                    gain.gain.setValueAtTime(0.1, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                    osc.start(now); osc.stop(now + 0.25);
                    break;
                case 'sleep':
                    osc.frequency.setValueAtTime(700, now);
                    osc.frequency.linearRampToValueAtTime(400, now + 0.3);
                    gain.gain.setValueAtTime(0.08, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
                    osc.start(now); osc.stop(now + 0.4);
                    break;
                default:
                    osc.frequency.setValueAtTime(500, now);
                    gain.gain.setValueAtTime(0.08, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                    osc.start(now); osc.stop(now + 0.1);
            }
        } catch(e) {}
    }
};

// Particle System
var Particles = {
    canvas: null,
    ctx: null,
    particles: [],
    running: false,
    animFrame: null,
    init: function() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'particles';
        this.ctx = this.canvas.getContext('2d');
        screenInner.appendChild(this.canvas);
    },
    resize: function() {
        if (!this.canvas) return;
        this.canvas.width = this.canvas.parentElement.offsetWidth || 340;
        this.canvas.height = this.canvas.parentElement.offsetHeight || 320;
    },
    emit: function(x, y, count, colors) {
        if (!this.ctx) return;
        if (!colors) colors = ['#8B5CF6', '#3B82F6', '#06B6D4', '#EC4899', '#F59E0B'];
        for (var i = 0; i < count; i++) {
            this.particles.push({
                x: x !== undefined ? x : this.canvas.width / 2,
                y: y !== undefined ? y : this.canvas.height / 2,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6 - 2,
                size: 2 + Math.random() * 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 1,
                decay: 0.015 + Math.random() * 0.025,
                gravity: 0.05 + Math.random() * 0.05
            });
        }
        if (!this.running) this.start();
    },
    emitAtPet: function(count, colors) {
        var rect = petImg.getBoundingClientRect();
        var parentRect = screenInner.getBoundingClientRect();
        var x = rect.left - parentRect.left + rect.width / 2;
        var y = rect.top - parentRect.top + rect.height / 2;
        this.emit(x, y, count, colors);
    },
    start: function() {
        this.running = true;
        this.resize();
        this.update();
    },
    update: function() {
        var self = this;
        var ctx = this.ctx;
        var cw = this.canvas.width;
        var ch = this.canvas.height;

        ctx.clearRect(0, 0, cw, ch);

        for (var i = this.particles.length - 1; i >= 0; i--) {
            var p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.vx *= 0.98;
            p.life -= p.decay;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        if (this.particles.length > 0 || this.running) {
            this.animFrame = requestAnimationFrame(function() { self.update(); });
        } else {
            this.running = false;
        }
    },
    stop: function() {
        this.running = false;
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
        this.particles = [];
        if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
};

// Floating Text
function showFloatingText(text, color) {
    if (!color) color = '#F59E0B';
    var el = document.createElement('div');
    el.className = 'floating-text';
    el.textContent = text;
    el.style.color = color;
    el.style.left = '50%';
    el.style.top = '45%';
    el.style.transform = 'translateX(-50%)';
    screenInner.appendChild(el);
    setTimeout(function() { el.remove(); }, 1200);
}

function initState() {
    state = {
        alive: true,
        hatched: false,
        sleeping: false,
        lightsOn: true,
        role: 'egg',
        age: 0,
        hp: 100,
        food: 80,
        nrg: 100,
        happy: 70,
        dliTokens: 0,
        poopCount: 0,
        poopElements: [],
        staking: false,
        stakedDLI: 0,
        selectedChar: localStorage.getItem('dlicom-pet-char') || 'characters/dlicom-mascot.png'
    };
}

function clamp(v, lo, hi) {
    if (lo === undefined) lo = 0;
    if (hi === undefined) hi = 100;
    return Math.max(lo, Math.min(hi, v));
}

function updateBars() {
    var data = [
        ['hp',   state.hp],
        ['food', state.food],
        ['nrg',  state.nrg],
        ['happy',state.happy]
    ];
    for (var i = 0; i < data.length; i++) {
        var key = data[i][0];
        var val = data[i][1];
        var el = statEls[key];
        el.style.width = Math.max(0, val) + '%';
        if (val <= 20) el.classList.add('critical');
        else el.classList.remove('critical');
    }
}

function updateDLI() {
    var prev = parseInt(dliAmount.textContent);
    dliAmount.textContent = Math.floor(state.dliTokens);
    if (Math.floor(state.dliTokens) > prev) {
        dliDisplay.style.transform = 'translateX(-50%) scale(1.05)';
        setTimeout(function() { dliDisplay.style.transform = 'translateX(-50%) scale(1)'; }, 300);
    }
}

function showMsg(text, duration) {
    if (duration === undefined) duration = 1800;
    if (msgTimeout) clearTimeout(msgTimeout);
    msgEl.textContent = text;
    msgEl.classList.add('show');
    msgTimeout = setTimeout(function() { msgEl.classList.remove('show'); }, duration);
}

function showNotif(text, duration) {
    if (duration === undefined) duration = 2500;
    if (notifTimeout) clearTimeout(notifTimeout);
    notifEl.textContent = text;
    notifEl.classList.add('show');
    notifTimeout = setTimeout(function() { notifEl.classList.remove('show'); }, duration);
}

function setPetAnim(cls, duration) {
    if (duration === undefined) duration = 800;
    petEl.className = 'pet';
    if (cls) {
        petEl.classList.add(cls);
        if (duration > 0) {
            setTimeout(function() {
                if (state.alive && !state.sleeping) petEl.className = 'pet bounce';
                else if (state.sleeping) petEl.className = 'pet sleep';
                else if (!state.alive) petEl.className = 'pet dead';
            }, duration);
        }
    }
}

function randomPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function updateRole() {
    var data = ROLES[state.role];
    if (!data) return;
    roleBadge.textContent = data.label;
    roleBadge.style.background = 'linear-gradient(135deg, ' + data.color + ' 0%, ' + data.color + '88 100%)';
    var scale = data.scale;
    petImg.style.transform = 'scale(' + scale + ')';
}

function tryEvolve() {
    var data = ROLES[state.role];
    if (!data || !data.next) return false;
    var nextData = ROLES[data.next];
    if (state.age >= nextData.age) {
        state.role = data.next;
        updateRole();
        setPetAnim('happy', 1500);
        AudioEngine.play('evolve');
        Particles.emitAtPet(20, ['#8B5CF6', '#3B82F6', '#06B6D4', '#F59E0B', '#EC4899']);
        var evolvedLabel = ROLES[state.role].label;
        showMsg('\u2728 EVOLVED \u2192 ' + evolvedLabel + '!');
        showNotif('Role upgraded! \u2728');
        state.dliTokens += 50;
        updateDLI();
        return true;
    }
    return false;
}

function hatch() {
    if (state.hatched) return;
    state.hatched = true;
    state.role = 'dliever';
    hatchHint.style.display = 'none';
    setPetAnim('hatch', 1500);
    updateRole();
    AudioEngine.play('evolve');
    Particles.emitAtPet(25, ['#10B981', '#34D399', '#6EE7B7', '#8B5CF6']);
    showMsg('Dlicom Pet is active!');
    showNotif('+10 $DLI Welcome Bonus');
    state.dliTokens += 10;
    updateDLI();
    updateButtons();
}

function updateStatusLabel() {
    if (!state.alive) { statusLabel.textContent = 'Dead'; return; }
    if (state.sleeping) { statusLabel.textContent = 'Sleeping'; return; }
    statusLabel.textContent = 'Active';
}

function die(reason) {
    state.alive = false;
    state.sleeping = false;
    petEl.className = 'pet dead';
    sleepZz.classList.remove('show');
    AudioEngine.play('die');
    Particles.emitAtPet(30, ['#EF4444', '#DC2626', '#F87171']);
    deathMsgEl.textContent = reason;
    gameoverEl.classList.add('show');
    updateStatusLabel();
    setAllButtons(false);
}

function addPoop() {
    if (state.poopCount >= 5) return;
    state.poopCount++;
    var el = document.createElement('div');
    el.className = 'poop';
    el.textContent = '\uD83D\uDCA9';
    el.style.left = (15 + Math.random() * 60) + '%';
    poopsArea.appendChild(el);
    state.poopElements.push(el);
}

function clearPoops() {
    state.poopCount = 0;
    for (var i = 0; i < state.poopElements.length; i++) {
        state.poopElements[i].remove();
    }
    state.poopElements = [];
}

function setAllButtons(enabled) {
    for (var i = 0; i < btnIds.length; i++) {
        $(btnIds[i]).disabled = !enabled;
    }
}

function updateButtons() {
    if (!state.alive) { setAllButtons(false); return; }
    if (!state.hatched) {
        setAllButtons(false);
        $('btn-eat').disabled = false;
        $('btn-drink').disabled = false;
        $('btn-play').disabled = false;
        $('btn-sleep').disabled = false;
        $('btn-bath').disabled = false;
        $('btn-tip').disabled = false;
        return;
    }
    var sleeping = state.sleeping;
    $('btn-eat').disabled = sleeping;
    $('btn-drink').disabled = sleeping;
    $('btn-play').disabled = sleeping || state.nrg < 10;
    $('btn-bath').disabled = sleeping;
    $('btn-tip').disabled = sleeping || state.dliTokens < 5;
    $('btn-sleep').disabled = false;
    var sleepLabel = $('btn-sleep').querySelector('span:last-child');
    var sleepIcon = $('btn-sleep').querySelector('.btn-icon');
    if (sleeping) {
        sleepLabel.textContent = 'Wake Up';
        sleepIcon.innerHTML = '\u23F0';
    } else {
        sleepLabel.textContent = 'Sleep';
        sleepIcon.innerHTML = '\uD83D\uDE34';
    }
}

function startCooldown(ms) {
    if (ms === undefined) ms = 400;
    cooldown = true;
    setAllButtons(true);
    $('btn-sleep').disabled = false;
    setTimeout(function() {
        cooldown = false;
        updateButtons();
    }, ms);
}

function doAction(action) {
    if (!state.alive) return;
    if (!state.hatched) {
        hatch();
        startCooldown(1200);
        return;
    }
    if (cooldown) return;
    AudioEngine.play('click');
    switch (action) {
        case 'eat':
            if (state.sleeping) return;
            state.food = clamp(state.food + 25);
            state.hp = clamp(state.hp + 3);
            state.happy = clamp(state.happy + 5);
            setPetAnim('eat', 600);
            AudioEngine.play('eat');
            showMsg(randomPick(['Yummy!', 'Delicious~', '\uD83C\uDF5C', 'Nom nom!']));
            state.dliTokens += 2;
            showFloatingText('+25 FOOD', '#8B5CF6');
            Particles.emitAtPet(8, ['#8B5CF6', '#A78BFA']);
            break;
        case 'drink':
            if (state.sleeping) return;
            state.food = clamp(state.food + 10);
            state.nrg = clamp(state.nrg + 8);
            state.hp = clamp(state.hp + 3);
            setPetAnim('eat', 500);
            AudioEngine.play('eat');
            showMsg(randomPick(['Slurp!', 'Refreshing~', '\uD83E\uDDC3', 'Thirst quenched!']));
            state.dliTokens += 1;
            showFloatingText('+8 NRG', '#3B82F6');
            Particles.emitAtPet(6, ['#3B82F6', '#60A5FA']);
            break;
        case 'play':
            if (state.sleeping) return;
            if (state.nrg < 10) {
                showMsg('Too tired to play...');
                setPetAnim('hurt', 400);
                AudioEngine.play('hurt');
                return;
            }
            state.happy = clamp(state.happy + 25);
            state.nrg = clamp(state.nrg - 12);
            state.food = clamp(state.food - 8);
            state.hp = clamp(state.hp + 2);
            setPetAnim('happy', 800);
            AudioEngine.play('happy');
            showMsg(randomPick(['Whee!', 'Fun!', '\u26BD', 'Play more!']));
            state.dliTokens += 5;
            showFloatingText('+25 HAPPY', '#F59E0B');
            Particles.emitAtPet(12, ['#F59E0B', '#FBBF24', '#EC4899']);
            break;
        case 'sleep':
            if (state.sleeping) {
                state.sleeping = false;
                petEl.className = 'pet bounce';
                sleepZz.classList.remove('show');
                AudioEngine.play('wake');
                updateStatusLabel();
                showMsg(randomPick(['Wake up!', 'Morning~', '\uD83D\uDE34']));
            } else {
                state.sleeping = true;
                petEl.className = 'pet sleep';
                sleepZz.classList.add('show');
                AudioEngine.play('sleep');
                updateStatusLabel();
                showMsg(randomPick(['Zzz...', '\uD83D\uDCD6', 'Good night~']));
            }
            updateButtons();
            startCooldown(600);
            return;
        case 'bath':
            if (state.sleeping) return;
            clearPoops();
            state.hp = clamp(state.hp + 8);
            state.happy = clamp(state.happy + 10);
            setPetAnim('eat', 500);
            AudioEngine.play('happy');
            showMsg(randomPick(['Clean!', 'Fresh~', '\uD83E\uDDF6', 'Sparkling!']));
            state.dliTokens += 3;
            showFloatingText('+8 HP', '#10B981');
            Particles.emitAtPet(10, ['#10B981', '#34D399']);
            break;
        case 'tip':
            if (state.sleeping) return;
            if (state.dliTokens < 5) {
                showMsg('Not enough DLI to tip!');
                return;
            }
            state.dliTokens -= 5;
            state.happy = clamp(state.happy + 15);
            state.hp = clamp(state.hp + 5);
            setPetAnim('happy', 800);
            AudioEngine.play('tip');
            showMsg(randomPick(['\u2764\uFE0F Tip 5 $DLI!', 'Generosity +1', '\uD83D\uDCB0', 'Tipping!']));
            showNotif('-5 $DLI | Happy +15');
            showFloatingText('-5 DLI', '#EF4444');
            Particles.emitAtPet(15, ['#EC4899', '#F472B6', '#EF4444']);
            break;
    }
    updateBars();
    updateDLI();
    updateButtons();
    startCooldown(400);
}

function gameTick() {
    if (!state.alive) return;
    if (!state.hatched) return;
    if (state.sleeping) {
        state.nrg  = clamp(state.nrg + 4);
        state.hp   = clamp(state.hp + 1);
        state.food = clamp(state.food - 0.5);
        if (state.staking) state.dliTokens += 0.5;
    } else {
        state.nrg   = clamp(state.nrg - 0.8);
        state.food  = clamp(state.food - 1.2);
        state.happy = clamp(state.happy - 0.5);
        if (!state.lightsOn) state.happy = clamp(state.happy - 0.5);
        if (state.staking) state.dliTokens += 0.2;
    }
    if (state.poopCount > 0) {
        state.hp    = clamp(state.hp - state.poopCount * 0.5);
        state.happy = clamp(state.happy - state.poopCount * 0.3);
    }
    if (state.food <= 0) {
        state.hp = clamp(state.hp - 3);
        if (Math.random() < 0.15) showMsg(randomPick(['\uD83E\uDD24', 'Feed me!', '\uD83C\uDF56']));
    }
    if (state.nrg <= 0) {
        state.hp = clamp(state.hp - 2);
        if (Math.random() < 0.15) showMsg(randomPick(['\uD83E\uDD71', '\uD83D\uDE34', 'Need sleep...']));
    }
    if (state.happy <= 10) {
        state.hp = clamp(state.hp - 1);
    }
    if (Math.random() < 0.03 && !state.sleeping) {
        addPoop();
    }
    if (state.food > 50 && state.nrg > 30 && state.happy > 40) {
        state.hp = clamp(state.hp + 0.5);
    }
    if (state.hp <= 0) {
        die('Your pet ran out of HP...');
        return;
    }
    state.age++;
    $('age').textContent = state.age;
    if (!tryEvolve()) {
        if (!state.sleeping && state.happy > 50 && Math.random() < 0.08) {
            setPetAnim('happy', 500);
            showMsg(randomPick(['Happy~', '\u2665', '\uD83D\uDE0A', '^_^']));
        }
        if (state.hp <= 30 && Math.random() < 0.1) {
            showMsg(randomPick(['Sick...', '\uD83E\uDE7A', '\uD83E\uDD12']));
            setPetAnim('hurt', 400);
            AudioEngine.play('hurt');
        }
    }
    updateBars();
    updateDLI();
    updateButtons();
}

function restart() {
    initState();
    petImg.src = state.selectedChar;
    petImg.style.opacity = '1';
    petImg.style.filter = 'none';
    petImg.style.transform = 'scale(0.85)';
    petEl.className = 'pet bounce';
    sleepZz.classList.remove('show');
    clearPoops();
    hatchHint.style.display = '';
    gameoverEl.classList.remove('show');
    $('age').textContent = '0';
    Particles.stop();
    updateRole();
    updateBars();
    updateDLI();
    updateButtons();
    updateStatusLabel();
}

// Character Selector
function loadCharacters() {
    var saved = localStorage.getItem('dlicom-custom-chars') || '[]';
    var customChars = JSON.parse(saved);
    var allChars = DEFAULT_CHARACTERS.concat(customChars);
    characterList.innerHTML = '';
    allChars.forEach(function(char) {
        var btn = document.createElement('button');
        btn.className = 'char-btn';
        var charPath = 'characters/' + char;
        if (charPath === state.selectedChar || char === state.selectedChar) {
            btn.classList.add('active');
        }
        btn.setAttribute('data-char', char);
        btn.innerHTML = '<img src="' + charPath + '" alt="Pet">';
        btn.onclick = function() { selectCharacter(char); };
        characterList.appendChild(btn);
    });
}

function selectCharacter(char) {
    var path = 'characters/' + char;
    state.selectedChar = path;
    petImg.src = path;
    localStorage.setItem('dlicom-pet-char', path);
    document.querySelectorAll('.char-btn').forEach(function(btn) {
        btn.classList.remove('active');
        if (btn.getAttribute('data-char') === char) {
            btn.classList.add('active');
        }
    });
}

function addCustomCharacter(files) {
    var saved = localStorage.getItem('dlicom-custom-chars') || '[]';
    var customChars = JSON.parse(saved);
    Array.from(files).forEach(function(file) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var fileName = 'custom-' + Date.now() + '-' + file.name;
            var img = new Image();
            img.onload = function() {
                var canvas = document.createElement('canvas');
                canvas.width = 200;
                canvas.height = 200;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, 200, 200);
                var dataUrl = canvas.toDataURL('image/png');
                localStorage.setItem('dlicom-char-' + fileName, dataUrl);
                customChars.push(fileName);
                localStorage.setItem('dlicom-custom-chars', JSON.stringify(customChars));
                loadCharacters();
                showNotif('Character added!');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Init Audio on first interaction
function initAudio() {
    if (!AudioEngine.initialized) AudioEngine.init();
    document.removeEventListener('click', initAudio);
    document.removeEventListener('touchstart', initAudio);
}
document.addEventListener('click', initAudio);
document.addEventListener('touchstart', initAudio);

// Event Listeners
addCharBtn.addEventListener('click', function() { fileInput.click(); });
fileInput.addEventListener('change', function(e) {
    if (e.target.files.length > 0) addCustomCharacter(e.target.files);
});

// Initialize
Particles.init();
Particles.resize();
window.addEventListener('resize', function() { Particles.resize(); });

initState();
petImg.src = state.selectedChar;
updateBars();
updateDLI();
updateButtons();
updateRole();
loadCharacters();

setInterval(gameTick, 1000);
