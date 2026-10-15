// =====================================================================
// FLOATY SHOOTER — Campaign Game Engine
// =====================================================================
// =====================================================================
// FLOATY SHOOTER — Campaign Game Engine
// =====================================================================
// Anti-Debugging Hook Removed for better performance and stability on mobile
// =====================================================================
// =====================================================================
if(!CanvasRenderingContext2D.prototype.roundRect){CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){if(w<2*r)r=w/2;if(h<2*r)r=h/2;this.beginPath();this.moveTo(x+r,y);this.arcTo(x+w,y,x+w,y+h,r);this.arcTo(x+w,y+h,x,y+h,r);this.arcTo(x,y+h,x,y,r);this.arcTo(x,y,x+w,y,r);this.closePath();return this;}}

(function() {
// -------- WEB AUDIO ENGINE --------
class AudioEngine {
    constructor() {
        this.ctx = null;
        this.buffers = {};
        this.music = null;
        this.musicEnabled = true;
        this.sfxEnabled = true;
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.music = document.createElement('audio');
        this.music.src = 'music/background.mp3';
        this.music.loop = true;
        this.music.volume = 0.8;
    }

    async load(name, url) {
        try {
            const resp = await fetch(url);
            const arrayBuffer = await resp.arrayBuffer();
            this.buffers[name] = await this.ctx.decodeAudioData(arrayBuffer);
        } catch (e) { console.error("Failed to load sound:", url); }
    }

    play(name, vol = 0.5) {
        if (!this.sfxEnabled || !this.ctx || !this.buffers[name]) return;
        const source = this.ctx.createBufferSource();
        source.buffer = this.buffers[name];
        const gainNode = this.ctx.createGain();
        gainNode.gain.value = vol;
        source.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        source.start(0);
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        this.sfxEnabled = this.musicEnabled;
        if (this.music) {
            if (this.musicEnabled) { if(typeof isPlaying !== 'undefined' && !isPlaying) this.music.play().catch(()=>{}); }
            else { this.music.pause(); }
        }
        const b1 = document.getElementById('music-toggle-btn');
        if (b1) b1.textContent = this.musicEnabled ? '🔊 Music: ON' : '🔇 Music: OFF';
        const hudBtn = document.getElementById('btn-sound-hud');
        if (hudBtn) hudBtn.textContent = this.musicEnabled ? '🔊' : '🔇';
    }

    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
}

const audio = new AudioEngine();
window._gameAudioEngine = audio; // Exposed for startup audio unlock


// -------- ASSET LOADER --------
const gameAssets = {
    images: {},
    loadImg(name, src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => { this.images[name] = img; resolve(); };
            img.onerror = () => { console.error("Failed to load image:", src); resolve(); };
            img.src = src;
        });
    }
};

// Load initial sounds and images
window.addEventListener('load', () => {
    audio.init();
    audio.load('shoot', 'music/1stplane.ogg');
    audio.load('enemyDeath', 'music/anime_crash.ogg');
    audio.load('enemyShoot', 'music/anime_fire.ogg');
    audio.load('playerDeath', 'music/shooter_destoyed.ogg');
    
    // Load Images
    gameAssets.loadImg('doubleBullet', 'image/double_fire.png');
    gameAssets.loadImg('coin', 'image/coin.png');
    gameAssets.loadImg('shield', 'image/shield.png');
    gameAssets.loadImg('missile', 'image/missile.png');
    gameAssets.loadImg('fullHp', 'image/full_hp.png');
});

window.playCustomSound = (filename, max, vol) => audio.load(filename, 'game music/' + filename.replace(' (2)', '_2')).then(() => audio.play(filename, vol));
const musicEnabled = () => audio.musicEnabled;
const sfxEnabled = () => audio.sfxEnabled;
window.toggleMusic = () => audio.toggleMusic();

function tryPlayBg() {
    audio.init();
    audio.resume();
    if (audio.musicEnabled && audio.music && audio.music.paused) {
        audio.music.play().catch(()=>{});
    }
}
['mousedown','touchstart','keydown'].forEach(e => window.addEventListener(e, tryPlayBg, {capture:true, once:true}));
// If audio was already unlocked by startup script before game.js loaded
if (window._audioUnlocked) { window.addEventListener('load', ()=>{ setTimeout(tryPlayBg, 200); }); }


// -------- MATRIX BACKGROUND --------
const bgCanvas=document.getElementById('bgCanvas'),bgCtx=bgCanvas.getContext('2d');
const CHARS='01アイウエカキクABCDEF#$@!01010';let matrixCols=[];
function initBg(){bgCanvas.width=window.innerWidth;bgCanvas.height=window.innerHeight;const c=Math.ceil(bgCanvas.width/16);matrixCols=Array.from({length:c},()=>({x:Math.random()*bgCanvas.width,y:Math.random()*bgCanvas.height,speed:0.8+Math.random()*2}));}
function drawBg(){bgCtx.fillStyle='rgba(2,11,20,0.18)';bgCtx.fillRect(0,0,bgCanvas.width,bgCanvas.height);bgCtx.font='13px monospace';bgCtx.textAlign='left';for(const c of matrixCols){const r=Math.random();if(r>0.9)c.char=CHARS[Math.floor(r*CHARS.length)];bgCtx.fillStyle=r>0.99?'#ffffff':r>0.9?'#00eaff':'rgba(0,234,255,0.25)';bgCtx.fillText(c.char||'0',c.x,c.y);c.y+=c.speed;if(c.y>bgCanvas.height){c.y=-20;c.x=Math.random()*bgCanvas.width;c.speed=0.8+Math.random()*2;}}}
initBg();(function bgLoop(){drawBg();requestAnimationFrame(bgLoop)})();

// -------- CANVAS & STATE --------
let canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
let isPlaying=false,isPaused=false;
let particles=[];      // Active particles
let particlePool=[];   // Inactive recycled particles
const camera={x:0,y:0},keys={w:false,a:false,s:false,d:false};
const mouse={x:0,y:0,aimAngle:null,useMobileAim:false};
let isShooting=false,lastShootTime=0,currentZoom=1,screenShake=0,hitFlash=0;
const MAX_SPEED=55,ACCEL=280,DECAY=12.0;

// -------- OBJECT POOLING --------
const bulletPool = [];
const enemyPool = [];
function acquireBullet() { return bulletPool.length > 0 ? bulletPool.pop() : {}; }
function releaseBullet(b) { if (bulletPool.length < 500) bulletPool.push(b); }
function acquireEnemy() { return enemyPool.length > 0 ? enemyPool.pop() : {}; }
function releaseEnemy(e) { if (enemyPool.length < 100) enemyPool.push(e); }
function acquireParticle() { return particlePool.length > 0 ? particlePool.pop() : {}; }
function releaseParticle(p) { if (particlePool.length < 1000) particlePool.push(p); }

function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function resize(){canvas.width=window.innerWidth;canvas.height=window.innerHeight;}
resize();window.addEventListener('resize',()=>{initBg();resize();});

// -------- SCREEN NAVIGATION --------
    window.showScreen = function(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));const el=document.getElementById(id);if(el)el.classList.add('active');};
    window.goToStart = function(){window.showScreen('screen-start');};
    window.goToMainMenu = function(){try{window.renderChapterCards();}catch(e){console.error('renderChapterCards error:',e);}window.showScreen('screen-chapters');try{window.updateInventoryUI();}catch(e){}};
    window.goToChapterSelect = function(){try{window.renderChapterCards();}catch(e){console.error('renderChapterCards error:',e);}window.showScreen('screen-chapters');};
    window.handlePlayButton = function(){
        const screenName = document.getElementById('screen-name');
        const savedName = localStorage.getItem('floaty_player_name');
        if (screenName && (!savedName || savedName.trim() === '')) {
            window.showScreen('screen-name');
            const input = document.getElementById('player-name-input');
            if (input) setTimeout(() => input.focus(), 100);
        } else {
            window.goToMainMenu();
        }
    };
    window.confirmPlayerName = function(){
        const input = document.getElementById('player-name-input');
        const name = input && input.value.trim() ? input.value.trim() : 'PILOT';
        localStorage.setItem('floaty_player_name', name);
        window.goToMainMenu();
    };

    window.toggleSettings = function(){const p=document.getElementById('settings-panel'); if(p)p.classList.toggle('hidden');};
    window.showControls = function(){window.closeAllPopups();document.getElementById('controls-popup').classList.remove('hidden');};
    window.showHistory = function(){window.closeAllPopups();window.renderHistoryUI();document.getElementById('history-popup').classList.remove('hidden');};
    window.showStats = function(){window.closeAllPopups();window.renderStatsUI();document.getElementById('stats-popup').classList.remove('hidden');};
    window.showPrivacy = function(){window.closeAllPopups();document.getElementById('privacy-popup').classList.remove('hidden');};
    window.openLeaderboard = function(){
        window.closeAllPopups();
        const p = document.getElementById('leaderboard-popup');
        if (p) {
            p.classList.remove('hidden');
            const list = document.getElementById('leaderboard-list');
            if (list) {
                const history = window.getHistory ? window.getHistory() : [];
                const playerName = localStorage.getItem('floaty_player_name') || 'PILOT';
                const sorted = [...history].sort((a,b) => (b.score||0) - (a.score||0)).slice(0, 10);
                if (sorted.length === 0) {
                    list.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-dim);font-family:var(--font-head);font-size:0.85rem;">NO MISSIONS RECORDED YET<br><span style="font-size:0.75rem;color:var(--cyan);">Play campaign levels to set high scores!</span></div>`;
                } else {
                    list.innerHTML = sorted.map((h, i) => `
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0.8rem;background:rgba(255,255,255,0.03);border:1px solid rgba(0,234,255,0.15);border-radius:8px;margin-bottom:0.4rem;font-family:var(--font-head);">
                            <span style="color:var(--cyan);font-weight:700;font-size:0.85rem;">#${i+1} ${playerName}</span>
                            <span style="font-size:0.8rem;color:var(--text-dim);">CH.${h.chapter} LVL.${h.level}</span>
                            <span style="color:#ffcc00;font-weight:700;font-size:0.85rem;">★ ${h.score||0}</span>
                        </div>
                    `).join('');
                }
            }
        }
    };
    window.openPopup = function(id){window.closeAllPopups();document.getElementById(id).classList.remove('hidden');};
    window.closePopup = function(id){document.getElementById(id).classList.add('hidden');};
    window.closeAllPopups = function(){
        ['controls-popup','history-popup','stats-popup','privacy-popup','terms-popup','store-overlay','fun-level-popup','trial-popup','leaderboard-popup'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.add('hidden');});
        if(document.getElementById('settings-panel')) document.getElementById('settings-panel').classList.add('hidden');
    };
    window.openStore = function(){document.getElementById('store-overlay').classList.remove('hidden');document.getElementById('store-coins-display').textContent=window.getSaveData().coins;window.updateStoreUI();};
    window.closeStore = function(){document.getElementById('store-overlay').classList.add('hidden');};

// Close popups on outside click
document.addEventListener('click', (e) => {
    // If the click is inside a popup box, settings panel, or a button meant to open them, ignore it
    const isInsidePopup = e.target.closest('.popup-box');
    const isInsideSettings = e.target.closest('.settings-panel');
    const isOpenBtn = e.target.closest('.start-gear-btn') || e.target.closest('.cs-gear-btn') || e.target.closest('.lm-gear') || e.target.closest('.lm-store-btn') || e.target.closest('.cs-store-btn') || e.target.closest('.cs-trial-btn');
    
    if (isInsidePopup || isInsideSettings || isOpenBtn) return;
    
    // Check if what they clicked had an onclick that explicitly opens something
    if (e.target.closest('[onclick^="openPopup"]') || e.target.closest('[onclick^="show"]') || e.target.closest('[onclick^="openTrial"]')) return;
    
    closeAllPopups();
});

// -------- CHAPTER SELECT SCREEN --------
let selectedChapter=1;

// Chapter card hues (unique look per chapter)
function renderChapterCards(){
    const cardsEl=document.getElementById('cs-chapter-cards');
    if(!cardsEl) return;
    cardsEl.innerHTML='';
    const _sd = window.getSaveData();

    CHAPTERS.forEach((ch,i)=>{
        const unlocked=window.isChapterUnlocked(ch.id);
        const progress=_sd.chapterProgress[ch.id]||0;
        const pct=Math.floor((progress/ch.levels)*100);
        const card=document.createElement('div');
        card.className='cs-stage-card'+(unlocked?'':' cs-stage-locked');

        const imgUrl = `url('image/chapter${ch.id}.png')`;
        card.style.backgroundImage = imgUrl;


        let inner='';
        if(!unlocked) inner+=`<div class="cs-lock-icon">🔒</div>`;
        inner+=`<div class="cs-stage-label">`;
        inner+=`<div class="cs-stage-name">CHAPTER ${ch.id}</div>`;
        inner+=`<div class="cs-stage-sub">${ch.name}</div>`;

        if(unlocked && pct>0){
            inner+=`<div class="cs-stage-stars"><span class="cs-stage-star earned">⭐</span></div>`;
            inner+=`<div class="cs-stage-progress-text">${pct}% · ${progress}/${ch.levels}</div>`;
        } else if(unlocked){
            inner+=`<div class="cs-stage-progress-text" style="color:var(--cyan);">${ch.levels} LEVELS</div>`;
        } else {
            inner+=`<div class="cs-unlock-text">LOCKED</div>`;
        }
        inner+=`</div>`;
        card.innerHTML=inner;

        if(unlocked) card.onclick=()=>openLevelPath(ch.id);
        cardsEl.appendChild(card);
    });

    updateInventoryUI();
}
window.renderChapterCards = renderChapterCards;

// -------- LEVEL MAP SCREEN --------
function openLevelPath(chapterId){
    selectedChapter=chapterId;
    const ch=CHAPTERS[chapterId-1];
    const _sd = window.getSaveData();
    const progress=_sd.chapterProgress[chapterId]||0;

    // Update navbar
    document.getElementById('lm-ch-name').textContent='CHAPTER '+ch.id;
    document.getElementById('lm-ch-sub').textContent=ch.name.toUpperCase();
    document.getElementById('lm-star-count').textContent=progress;
    document.getElementById('lm-star-total').textContent=ch.levels;
    const lmC=document.getElementById('lm-coins');if(lmC) lmC.textContent=_sd.coins;
    const lmM=document.getElementById('lm-missiles');if(lmM) lmM.textContent=_sd.missiles;
    const lmS=document.getElementById('lm-shields');if(lmS) lmS.textContent=_sd.shields||0;
    const lmD=document.getElementById('lm-dbl');if(lmD) lmD.textContent=_sd.doubleBullet||0;

    showScreen('screen-levels');
    updateInventoryUI();

    // Calculate node positions dynamically based on the container width
    const area = document.getElementById('lm-area');
    // Ensure we have a valid width, fallback to window width
    const areaW = area.clientWidth > 100 ? area.clientWidth : window.innerWidth;
    
    // Always use 4 nodes per row since chapters now have 12 levels.
    // This perfectly fills 3 full rows with no empty space.
    const NODES_PER_ROW = 4;
    const PAD_X = Math.max(120, areaW * 0.15); // Larger padding so curves fit inside
    const NODE_GAP_X = Math.max(100, (areaW - PAD_X * 2) / (NODES_PER_ROW - 1));
    const NODE_GAP_Y = 160; 
    const PAD_Y = 130;

    const totalLevels = ch.levels;
    const totalRows = Math.ceil(totalLevels/NODES_PER_ROW);
    const mapW = areaW; 
    const mapH = PAD_Y * 2 + (totalRows - 1) * NODE_GAP_Y + 80;

    const positions = [];
    let goRight = true;
    for(let l = 0; l < totalLevels; l++){
        const row = Math.floor(l/NODES_PER_ROW);
        const posInRow = l % NODES_PER_ROW;
        const col = goRight ? posInRow : (NODES_PER_ROW - 1 - posInRow);
        const x = PAD_X + col * NODE_GAP_X;
        const y = PAD_Y + row * NODE_GAP_Y;
        positions.push({x, y, level: l + 1});
        if((l + 1) % NODES_PER_ROW === 0) goRight = !goRight;
    }

    // Build SVG dashed path with smooth curves
    const svg = document.getElementById('lm-svg');
    svg.setAttribute('width', mapW);
    svg.setAttribute('height', mapH);
    svg.setAttribute('viewBox', `0 0 ${mapW} ${mapH}`);
    svg.innerHTML = '';

    let pathD = '';
    const curveRadius = NODE_GAP_Y / 2;
    for(let i = 0; i < positions.length; i++){
        const p = positions[i];
        if(i === 0){ pathD += `M ${p.x} ${p.y}`; continue; }
        const prev = positions[i - 1];
        const prevRow = Math.floor((i - 1)/NODES_PER_ROW);
        const curRow = Math.floor(i/NODES_PER_ROW);

        if(prevRow !== curRow){
            // Row transition — U-turn curve
            const direction = (i - 1) % (NODES_PER_ROW * 2) < NODES_PER_ROW ? 1 : -1;
            
            // Draw line to just before the curve starts
            pathD += ` L ${prev.x + (direction * (PAD_X * 0.2))} ${prev.y}`;
            
            // Curve points pushing out into the padding area
            const outX = prev.x + (direction * (PAD_X * 0.7));
            const outY = prev.y + (NODE_GAP_Y / 2);
            
            pathD += ` Q ${outX} ${prev.y}, ${outX} ${outY}`;
            pathD += ` Q ${outX} ${p.y}, ${prev.x + (direction * (PAD_X * 0.2))} ${p.y}`;
            
            pathD += ` L ${p.x} ${p.y}`;
        } else {
            pathD += ` L ${p.x} ${p.y}`;
        }
    }

    // Dashed path line
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg','path');
    pathEl.setAttribute('d', pathD);
    pathEl.setAttribute('fill', 'none');
    pathEl.setAttribute('stroke', 'rgba(180,190,200,0.3)');
    pathEl.setAttribute('stroke-width', '5');
    pathEl.setAttribute('stroke-dasharray', '15 10');
    pathEl.setAttribute('stroke-linecap', 'round');
    svg.appendChild(pathEl);

    // Glow path (behind)
    const glowEl = document.createElementNS('http://www.w3.org/2000/svg','path');
    glowEl.setAttribute('d', pathD);
    glowEl.setAttribute('fill', 'none');
    glowEl.setAttribute('stroke', 'rgba(0,234,255,0.06)');
    glowEl.setAttribute('stroke-width', '20');
    glowEl.setAttribute('stroke-linecap', 'round');
    svg.insertBefore(glowEl, pathEl);

    // Render nodes
    const nodesEl = document.getElementById('lm-nodes');
    nodesEl.innerHTML = '';
    nodesEl.style.width = mapW + 'px';
    nodesEl.style.height = mapH + 'px';

    let currentNodeEl = null;
    positions.forEach((pos)=>{
        const l = pos.level;
        const completed = l <= progress, current = l === progress + 1, locked = l > progress + 1;
        const node = document.createElement('div');
        node.className = 'lm-node'+(completed ? ' lm-node-done' : current ? ' lm-node-current' : ' lm-node-locked');
        node.style.left = pos.x + 'px';
        node.style.top = pos.y + 'px';

        node.innerHTML = `<span class="lm-label">${l}</span>`;

        if(!locked) node.onclick = () => startLevel(chapterId, l);
        if(current) currentNodeEl = node;
        nodesEl.appendChild(node);
    });

    // Auto-scroll to focus on current level
    requestAnimationFrame(()=>{
        if(currentNodeEl){
            const area=document.getElementById('lm-area');
            const nodeY=parseInt(currentNodeEl.style.top);
            const nodeX=parseInt(currentNodeEl.style.left);
            area.scrollTo({
                left:Math.max(0,nodeX-area.clientWidth/2),
                top:Math.max(0,nodeY-area.clientHeight/2+30),
                behavior:'smooth'
            });
        }
    });
}

function renderHistoryUI(){
    const list=document.getElementById('history-list');const history=getHistory();list.innerHTML='';
    if(!history.length){list.innerHTML='<div style="text-align:center;opacity:.4;padding:20px;font-size:.8em">No matches yet.</div>';return;}
    history.forEach(r=>{const row=document.createElement('div');row.className='history-row';const c=r.result==='VICTORY'?'var(--gold)':'var(--red)';row.innerHTML=`<div><div class="result" style="color:${c}">${r.result}</div><div class="date">${r.date||''}</div></div><div class="detail">Ch.${r.chapter} Lv.${r.level}<br>Score:${r.score||0}</div>`;list.appendChild(row);});
}
function renderStatsUI(){
    const s=window.getSaveData().stats;const el=document.getElementById('stats-content');
    const items=[['💀',s.totalKills,'Total Kills'],['💥',s.totalDeaths,'Deaths'],['<img src="image/coin.png" class="ui-icon">',s.totalCoins,'Coins Earned'],['⭐',s.totalScore,'Total Score'],['🎖️',s.chaptersCompleted,'Chapters Done'],['📊',s.levelsCompleted,'Levels Done']];
    el.innerHTML=items.map(([i,v,l])=>`<div class="stat-item"><div class="stat-value">${i} ${v}</div><div class="stat-label">${l}</div></div>`).join('');
}

// =====================================================================
// GAME STATE
// =====================================================================
let game={
    chapter:1,level:1,player:null,
    enemies:[],       // Changed to Array for performance
    bullets:[],       // Active bullets
    pickups:[],
    clones:[],score:0,levelKills:0,totalKills:0,coinsEarned:0,
    state:'playing',spawnTimer:0,safeTimer:0,
    combo:{count:0,timer:0,multiplier:1},
    mission:null,missionProgress:0,missionTimer:0,noDamageTimer:0,
    doubleBulletTimer:0,speedBoostTimer:0,speedBoostAmount:0,
    shieldActive:false,shieldHits:0,shieldTimer:0,
    levelStartTime:0,lastTime:0,
    trialShipId: null, // Session-only trial ship ID
    isQrActive: false, // Flag to prevent multiple QR popups
    activeMissileStrike: null // Track cinematic missile strike
};

    function createPlayer(ch){
        const _esd = window.getSaveData ? window.getSaveData() : {};
        const eqCh = (window.game && window.game.trialShipId) || (_esd.equippedShip !== null ? _esd.equippedShip : (window.game && window.game.chapter) || ch || 1);
        const chapter=CHAPTERS[eqCh-1];const hp=getPlayerMaxHp(eqCh);
        const p = {x:MAP_W/2,y:MAP_H/2,vx:0,vy:0,angle:0,radius:22,hp,maxHp:hp,_hpM:hp, // Shadow HP Mirror
            eqCh: eqCh,
            color:chapter.shooterColor,fireColor:chapter.fireColor,fireShadow:chapter.fireShadow,
            doubleFireMode:chapter.doubleFireMode||'parallel',
            spiralOffset:0,
            lastShootTime:0};
        return p;
    }

// =====================================================================
// PLAYER BULLET SPAWNING — unique per chapter
// =====================================================================
function spawnPlayerBullets(p, angle, isDouble){
    const bspd = 20;
    const fc = p.fireColor, fs = p.fireShadow;
    const ox = p.x + Math.cos(angle) * (p.radius + 6);
    const oy = p.y + Math.sin(angle) * (p.radius + 6);
    const addBullet = (a, ox2, oy2, spd, size, shape) => {
        const b = acquireBullet();
        b.x = ox2 !== undefined ? ox2 : ox;
        b.y = oy2 !== undefined ? oy2 : oy;
        const s = spd || bspd;
        b.vx = Math.cos(a) * s;
        b.vy = Math.sin(a) * s;
        b.life = 90;
        b.ownerType = 'player';
        b.color = fc;
        b.shadow = fs;
        b.size = size || 5;
        b.shapeType = shape || (p.doubleFireMode === 'parallel' ? 'dash' : p.doubleFireMode === 'vfork' ? 'line' : 'circle');
        game.bullets.push(b);
    };

    if (!isDouble) {
        switch(p.doubleFireMode) {
            case 'parallel': addBullet(angle, ox, oy, 22, 5); break;
            case 'vfork':    addBullet(angle, ox, oy, 26, 4); break;
            case 'triangle': addBullet(angle, ox, oy, 18, 7); break;
            case 'spiral':   addBullet(angle, ox, oy, 14, 9); break;
            case 'dualhull': addBullet(angle, ox, oy, 23, 5.5); break;
            case 'starburst':addBullet(angle, ox, oy, 21, 6); break;
            default:         addBullet(angle); break;
        }
    } else {
        switch(p.doubleFireMode) {
            case 'parallel': {
                const perp = angle + Math.PI / 2;
                const d = 10;
                addBullet(angle, p.x + Math.cos(perp) * d + Math.cos(angle) * (p.radius + 6), p.y + Math.sin(perp) * d + Math.sin(angle) * (p.radius + 6));
                addBullet(angle, p.x - Math.cos(perp) * d + Math.cos(angle) * (p.radius + 6), p.y - Math.sin(perp) * d + Math.sin(angle) * (p.radius + 6));
                break;
            }
            case 'vfork':
                addBullet(angle);
                addBullet(angle + 0.38);
                addBullet(angle - 0.38);
                break;
            case 'triangle':
                addBullet(angle);
                addBullet(angle + 0.52);
                addBullet(angle - 0.52);
                break;
            case 'spiral':
                p.spiralOffset = (p.spiralOffset || 0) + 0.2;
                for (let i = 0; i < 4; i++) addBullet(angle + (i * Math.PI / 2) + p.spiralOffset, p.x, p.y, bspd * 0.9);
                break;
            case 'dualhull': {
                const perp = angle + Math.PI / 2, hOff = p.radius * 0.75;
                addBullet(angle, p.x + Math.cos(perp) * hOff + Math.cos(angle) * (p.radius * 0.5 + 6), p.y + Math.sin(perp) * hOff + Math.sin(angle) * (p.radius * 0.5 + 6));
                addBullet(angle, p.x - Math.cos(perp) * hOff + Math.cos(angle) * (p.radius * 0.5 + 6), p.y - Math.sin(perp) * hOff + Math.sin(angle) * (p.radius * 0.5 + 6));
                break;
            }
            case 'starburst':
                for (let i = 0; i < 6; i++) addBullet(angle + (i * Math.PI / 3), p.x, p.y, bspd * 0.85);
                break;
            default:
                addBullet(angle);
                addBullet(angle + 0.15);
                addBullet(angle - 0.15);
        }
    }
}

function spawnEnemy(ch,lvl,type){
    const et=ENEMY_TYPES[type];const p=game.player;
    const px=p?p.x:MAP_W/2,py=p?p.y:MAP_H/2;
    let bx,by,bestGap=-1;
    for(let a=0;a<8;a++){const ang=Math.random()*Math.PI*2;const d=300+Math.random()*300;
        const cx=Math.max(50,Math.min(MAP_W-50,px+Math.cos(ang)*d));
        const cy=Math.max(50,Math.min(MAP_H-50,py+Math.sin(ang)*d));
        let gap=Infinity;
        for(let i=0; i<game.enemies.length; i++){
            const e=game.enemies[i];const dist=Math.hypot(e.x-cx,e.y-cy);if(dist<gap)gap=dist;
        }
        if(gap>bestGap){bestGap=gap;bx=cx;by=cy;}if(gap>=140)break;}
    const cfg=getEnemyConfig(ch,lvl);
    let hp=et.hp;
    if(type==='tank')hp=Math.ceil(et.hp*cfg.tankHpMult);
    if(type==='miniboss')hp=et.hp+ch*3;
    if(type==='bossTankA'||type==='bossTankB')hp=Math.ceil(et.hp*(0.8+ch*0.25));
    
    const e = acquireEnemy();
    e.id='e_'+Math.random().toString(36).substr(2,8);
    e.x=bx; e.y=by; e.vx=0; e.vy=0; e.angle=0; e.radius=et.radius; e.hp=hp; e.maxHp=hp;
    e.speed=et.speed*cfg.speedMult; e.fireRate=Math.ceil(et.fireRate*cfg.fireRateMult);
    e.shootCooldown=Math.floor(Math.random()*60)+60; e.type=type;
    e.color=et.color; e.bodyColor=et.bodyColor; e.accentColor=et.accentColor;
    e.isTank=et.isTank||false; e.isMiniboss=et.isMiniboss||false; e.isBossTank=et.isBossTank||false;
    
    game.enemies.push(e);
    
    if(e.isBossTank) {
        game.bossAlert = true;
        game.bossAlertTime = performance.now();
        screenShake = 30;
    }
}

function spawnPickup(x,y,type){
    const cfg=POWERUP_CONFIG[type];if(!cfg)return;
    game.pickups.push({x,y,type,icon:cfg.icon,color:cfg.color,name:cfg.name,
        spawnTime:performance.now(),life:PICKUP_DESPAWN_TIME});
}

// =====================================================================
// START / RETRY / EXIT
// =====================================================================
    window.startLevel = function(chapter,level){
        game.chapter=chapter;game.level=level;
        game.player=createPlayer(chapter);
        game.enemies=[]; game.bullets=[]; game.pickups=[]; game.clones=[];
        game.score=0;game.levelKills=0;game.totalKills=0;game.coinsEarned=0;game.state='playing';
        game.combo={count:0,timer:0,multiplier:1};
        game.doubleBulletTimer=0;game.speedBoostTimer=0;game.shieldActive=false;game.shieldHits=0;game.shieldTimer=0;
        game.safeTimer=SAFE_START_DELAY;game.lastTime=0;game.levelStartTime=performance.now();
        game.mission=getMissionForLevel(chapter,level);game.missionProgress=0;game.missionTimer=0;game.noDamageTimer=0;
        game.activeMissileStrike = null;
        
        const cfg=getEnemyConfig(chapter,level);    game.enemiesPending = cfg.count;
    game.enemiesConfig = cfg;
    
    if (game.mission) {
        if (game.mission.id === 'survive_time' || game.mission.id === 'pacifist' || game.mission.id === 'no_damage' || game.mission.id === 'time_kill') {
            game.enemiesPending = Infinity; // Infinite spawn until time is up or objective met
        } else if (game.mission.id === 'kill_count') {
            game.enemiesPending = Math.max(cfg.count, game.mission.target);
        }
    }

    let spawned=0;
    if(cfg.hasTank){spawnEnemy(chapter,level,'tank');game.enemiesPending--;spawned++;}
    if(cfg.hasMiniboss){spawnEnemy(chapter,level,'miniboss');game.enemiesPending--;spawned++;}
    // Random boss tanks (ch2+): Iron Colossus or Shadow Goliath
    if(cfg.hasBossTank && cfg.bossTankType){
        spawnEnemy(chapter,level,cfg.bossTankType);
        game.enemiesPending--;
        spawned++;
    }
    
    // Spawn up to max concurrent (6 + 1 every 5 levels)
    game.maxConcurrentEnemies = Math.min(6 + Math.floor(level/5), game.mission ? 8 : cfg.count);
    for(let i=spawned;i<game.maxConcurrentEnemies && game.enemiesPending>0;i++){
        const t=cfg.types[Math.floor(Math.random()*cfg.types.length)];
        spawnEnemy(chapter,level,t);
        game.enemiesPending = Math.max(0, game.enemiesPending - 1); // Safety clamp
    }
    // Check mission - already initialized
    // UI setup
    document.getElementById('hud').classList.remove('hidden');
    canvas.style.display='block';showScreen('');isPlaying=true;isPaused=false;
    document.getElementById('pause-overlay').classList.add('hidden');
    document.getElementById('game-over-overlay').classList.add('hidden');
    document.getElementById('level-complete-overlay').classList.add('hidden');
    document.getElementById('chapter-complete-overlay').classList.add('hidden');
    camera.x=game.player.x-canvas.width/2;camera.y=game.player.y-canvas.height/2;
    setupMobileControls();
    // Mission popup (Bypass for Level 1 to prevent stalling)
    if(game.level > 1 && game.mission){
        game.state='mission_popup';
        document.getElementById('fun-level-title').textContent = 'LEVEL ' + game.level + ' MISSION';
        document.getElementById('fun-level-objective').textContent=game.mission.displayText;
        document.getElementById('fun-level-popup').classList.remove('hidden');
        updateMissionHUD();
        audio.music.pause();
    } else {
        showLevelIntro(game.chapter, game.level);
    }
    requestAnimationFrame(gameLoop);
}

function showLevelIntro(ch, lv) {
    const introEl = document.getElementById('level-intro-text');
    if(!introEl) return;
    document.getElementById('intro-level-num').textContent = 'LEVEL ' + lv;
    document.getElementById('intro-chapter-name').textContent = CHAPTERS[ch-1].name.toUpperCase();
    introEl.classList.remove('hidden', 'animating');
    void introEl.offsetWidth;
    introEl.classList.add('animating');
    setTimeout(() => { introEl.classList.remove('animating'); introEl.classList.add('hidden'); }, 2500);
}

function resumeFromFunLevel(){
    document.getElementById('fun-level-popup').classList.add('hidden');
    game.state='playing';
    showLevelIntro(game.chapter, game.level);
    if(audio.musicEnabled) audio.music.play().catch(()=>{});
}
function retryLevel(){startLevel(game.chapter,game.level);}
function exitToMenu(){isPlaying=false;isPaused=false;audio.music.pause();document.getElementById('hud').classList.add('hidden');canvas.style.display='none';document.querySelectorAll('.big-overlay').forEach(o=>o.classList.add('hidden'));goToMainMenu();}
function togglePause(){if(game.state==='gameOver')return;isPaused=!isPaused;document.getElementById('pause-overlay').classList.toggle('hidden',!isPaused);}
function watchAdToRespawn(){
    if (window.adManager && typeof window.adManager.showRetryReward === 'function') {
        window.adManager.showRetryReward(ok => {
            if(ok){
                game.player.hp=game.player.maxHp;
                game.player._hpM=game.player.maxHp; // Update shadow
                game.state='playing';
                document.getElementById('game-over-overlay').classList.add('hidden');
                showToast("SYSTEMS REBOOTED: Respawn Successful!");
            }
        });
    } else {
        // Fallback for non-android/old logic
        showRespawnAd(ok=>{
            if(ok){
                game.player.hp=game.player.maxHp;
                game.player._hpM=game.player.maxHp;
                game.state='playing';
                document.getElementById('game-over-overlay').classList.add('hidden');
            }
        });
    }
}

function useMissile(){
    if(game.activeMissileStrike) return;
    if(!useItem('missile'))return;
    
    // Start 2-second cinematic strike
    game.activeMissileStrike = {
        startTime: performance.now(),
        duration: 2000,
        missiles: []
    };
    
    if(window.showToast) window.showToast("🚀 MISSILE STRIKE INITIALIZED!");
    screenShake=20;
    updateHudInventory();
}

function processMissileStrike(now) {
    if(!game.activeMissileStrike) return;
    const strike = game.activeMissileStrike;
    const elapsed = now - strike.startTime;
    const progress = Math.min(1, elapsed / strike.duration);
    
    // Periodically spawn visual missiles
    if(Math.random() < 0.15 && progress < 0.9) {
        strike.missiles.push({
            x: -100, y: Math.random() * canvas.height * 0.5,
            tx: canvas.width + 100, ty: canvas.height * 0.5 + Math.random() * canvas.height * 0.5,
            speed: 15 + Math.random() * 10,
            startTime: now
        });
    }
    
    // Progressively destroy enemies as waves pass
    for(let i = game.enemies.length - 1; i >= 0; i--) {
        const e = game.enemies[i];
        // If enemy is "behind" the strike progress
        const screenX = e.x - camera.x;
        const scanline = (progress * 1.5 - 0.25) * canvas.width;
        if(screenX < scanline) {
            spawnExplosion(e.x, e.y, e.color);
            game.levelKills++; game.totalKills++; addKill();
            const coins=getCoinsOnKill(game.chapter, game.level, e.type);
            game.coinsEarned+=coins; addCoins(coins);
            game.score+=getScoreOnKill(game.chapter, game.level, e.type);
            if(game.mission && (game.mission.id === 'kill_count' || game.mission.id === 'time_kill')) game.missionProgress++;
            if(game.mission && game.mission.id === 'pacifist'){
                showToast('❌ RULE BROKEN — You killed an enemy! Mission failed.');
                game.mission = null;
                triggerGameOver();
            }
            releaseEnemy(e);
            game.enemies.splice(i, 1);
            screenShake = 15;
            audio.play('enemyDeath');
        }
    }
    
    if(progress >= 1) {
        game.activeMissileStrike = null;
    }
}

function useShield(){
    if(game.shieldActive)return;
    if(!useItem('shield'))return;
    game.shieldActive=true;game.shieldHits=3;game.shieldTimer=15000;
    if(window.showToast) window.showToast("🛡️ SHIELD ACTIVATED (15 SECS)");
}

// =====================================================================
// GAME LOOP
// =====================================================================
function gameLoop(timestamp){
    if(!isPlaying)return;
    if(game.lastTime===0){game.lastTime=timestamp;requestAnimationFrame(gameLoop);return;}
    const rawDt=(timestamp-game.lastTime)/1000;
    let dt=Math.min(rawDt,0.05); // Base clamp
    if (rawDt > 0.15) dt = 0.016; // Anti-Speedhack hook
    game.lastTime=timestamp;
    if(game.activeMissileStrike) processMissileStrike(timestamp);
    if(isPaused||game.state==='mission_popup'||game.state==='gameOver'||game.state==='levelComplete'){
        renderFrame(dt,timestamp);requestAnimationFrame(gameLoop);return;}
    const p=game.player;
    // ---- Player Movement ----
    const spdMult=game.speedBoostTimer>0?1+game.speedBoostAmount:1;
    const maxSpd=MAX_SPEED*spdMult;const accel=ACCEL*dt;
    const mx=(keys.d?1:0)-(keys.a?1:0),my=(keys.s?1:0)-(keys.w?1:0);
    if(mx||my){const len=Math.hypot(mx,my);p.vx+=(mx/len)*accel;p.vy+=(my/len)*accel;}
    const spd=Math.hypot(p.vx,p.vy);if(spd>maxSpd){const s=maxSpd/spd;p.vx*=s;p.vy*=s;}
    const fric=Math.exp(-DECAY*dt);p.vx*=fric;p.vy*=fric;
    // Aim
    const scx=p.x-camera.x,scy=p.y-camera.y;
    p.angle=(mouse.useMobileAim&&mouse.aimAngle!=null)?mouse.aimAngle:Math.atan2(mouse.y-scy,mouse.x-scx);
    // Move
    const nx=p.x+p.vx*dt*60,ny=p.y+p.vy*dt*60;
    if(nx<p.radius||nx>MAP_W-p.radius)p.vx*=-0.35;
    if(ny<p.radius||ny>MAP_H-p.radius)p.vy*=-0.35;
    
    // ---- Integrity Check ----
    if(p.hp !== p._hpM) {
        console.error("HP Integrity failure.");
        p.hp = 0; p._hpM = 0;
        triggerGameOver();
    }
    p._hpM = p.hp; // Keep shadow updated
    
    p.x=Math.max(p.radius,Math.min(MAP_W-p.radius,p.x+p.vx*dt*60));
    p.y=Math.max(p.radius,Math.min(MAP_H-p.radius,p.y+p.vy*dt*60));
    // Shoot — per-chapter unique fire patterns
    const fireMs=game.doubleBulletTimer>0?80:120;
    if(isShooting&&timestamp-p.lastShootTime>fireMs){
        p.lastShootTime=timestamp;
        const isDouble = game.doubleBulletTimer > 0;
        spawnPlayerBullets(p, p.angle, isDouble);
        spawnMuzzleFlash(p.x,p.y,p.angle);
        if(isDouble) playCustomSound('music/double_firemain.ogg', 8, 0.4);
        else playCustomSound('music/chapter_'+(game.trialShipId || p.eqCh || game.chapter)+'shooter.ogg', 8, 0.4);
        p.vx-=Math.cos(p.angle)*0.8;p.vy-=Math.sin(p.angle)*0.8;
    }
    // Timers
    if(game.doubleBulletTimer>0)game.doubleBulletTimer-=dt*1000;
    if(game.speedBoostTimer>0)game.speedBoostTimer-=dt*1000;
    if(game.shieldActive){game.shieldTimer-=dt*1000;if(game.shieldTimer<=0||game.shieldHits<=0){game.shieldActive=false;}}
    if(game.safeTimer>0)game.safeTimer-=dt*1000;
    // Combo timer
    if(game.combo.count>0){game.combo.timer-=dt*1000;if(game.combo.timer<=0){game.combo.count=0;game.combo.multiplier=1;}}
    // Mission timers
    if(game.mission){
        if(game.mission.id==='survive_time'){game.missionTimer+=dt;game.missionProgress=Math.floor(game.missionTimer);}
        if(game.mission.id==='no_damage'){game.noDamageTimer+=dt;game.missionProgress=Math.floor(game.noDamageTimer);}
        // ★ RULE ENFORCEMENT: Time Attack — fail if 60s passes without hitting kill target
        if(game.mission.id==='time_kill'){
            game.missionTimer+=dt;
            if(game.missionTimer>=60 && game.missionProgress<game.mission.target && !game.mission._failed){
                game.mission._failed = true;
                showToast("❌ TIME'S UP — Kill target not reached! Mission failed.");
                game.mission = null;
                triggerGameOver();
            }
        }
        // ★ Pacifist timer tracks time (for progress HUD) — kill fail handled at kill site
        if(game.mission.id==='pacifist'){game.missionTimer+=dt;game.missionProgress=Math.floor(game.missionTimer);}
    }
    // Camera
    camera.x+=(p.x-canvas.width/2-camera.x)*0.1;camera.y+=(p.y-canvas.height/2-camera.y)*0.1;

    // ---- Enemies ----
    for(let i=game.enemies.length-1; i>=0; i--){
        const e=game.enemies[i];
        const dx=p.x-e.x,dy=p.y-e.y,dist=Math.hypot(dx,dy);
        e.angle=Math.atan2(dy,dx);
        const eAccel=(18+e.speed*12)*dt,eMax=75+e.speed*35;
        e.vx+=Math.cos(e.angle)*eAccel;e.vy+=Math.sin(e.angle)*eAccel;
        const es=Math.hypot(e.vx,e.vy);if(es>eMax){e.vx*=eMax/es;e.vy*=eMax/es;}
        const ef=Math.exp(-5.5*dt);e.vx*=ef;e.vy*=ef;
        e.x=Math.max(e.radius,Math.min(MAP_W-e.radius,e.x+e.vx*dt*60));
        e.y=Math.max(e.radius,Math.min(MAP_H-e.radius,e.y+e.vy*dt*60));
        // Body collision
        const cd=e.radius+p.radius;
        if(dist<cd&&dist>0){
            const ol=cd-dist,nvx=dx/(dist||1),nvy=dy/(dist||1);
            e.x-=nvx*ol*0.5;e.y-=nvy*ol*0.5;p.x+=nvx*ol*0.5;p.y+=nvy*ol*0.5;
            e.vx -= nvx * 250; e.vy -= nvy * 250; 
            p.vx += nvx * 250; p.vy += nvy * 250;
            if(!game.shieldActive){
                p.hp--; hitFlash=0.45; screenShake=8;
                spawnHitSpark(p.x, p.y, '#ff3a22');
                if(game.mission && game.mission.id==='no_damage'){
                    showToast('❌ RULE BROKEN — Enemy rammed into you! Mission failed.');
                    game.mission = null;
                    triggerGameOver();
                }
                if(p.hp<=0){spawnExplosion(p.x,p.y,p.color); audio.play('playerDeath', 1.0); triggerGameOver();}
            }
        }
        // Enemy shoot
        if(game.safeTimer<=0){e.shootCooldown--;
            if(dist<650&&e.shootCooldown<=0){e.shootCooldown=e.fireRate;
                const bs=8.5+Math.min(game.level*0.15, 5.0); // Faster, arcade-speed enemy bullets
                const shootAngle=Math.atan2(p.y-e.y, p.x-e.x); // Aim directly at player's current position
                const eox=e.x+Math.cos(shootAngle)*(e.radius+6), eoy=e.y+Math.sin(shootAngle)*(e.radius+6);

                const addEnemyBullet = (ang, color, shadow, shape, spd) => {
                    const b = acquireBullet();
                    b.x = eox; b.y = eoy;
                    const s = spd || bs;
                    b.vx = Math.cos(ang) * s;
                    b.vy = Math.sin(ang) * s;
                    b.life = 180; // Extended lifetime ensures bullets cross full screen and hit player
                    b.ownerType = 'enemy';
                    b.color = color; b.shadow = shadow;
                    b.size = shape === 'bossBeam' ? 8 : 5;
                    b.shapeType = shape;
                    game.bullets.push(b);
                };

                if(e.type==='bossTankA') {
                    [-0.5,-0.25,0,0.25,0.5].forEach(a => addEnemyBullet(shootAngle+a, '#ff5500', '#ff2200', 'bossBeam', bs*1.15));
                    spawnMuzzleFlash(e.x,e.y,shootAngle);
                    if (game.chapter >= 5) playCustomSound('music/tank5,6.ogg', 5, 0.7);
                    else if (game.chapter >= 2) playCustomSound('music/tank4,3,2.ogg', 5, 0.7);
                    else audio.play('enemyShoot');
                } else if(e.type==='bossTankB') {
                    for(let burst=0;burst<3;burst++) addEnemyBullet(shootAngle+(Math.random()-0.5)*0.12, '#cc66ff', '#8800ff', 'shadowVolt', bs*1.3);
                    spawnMuzzleFlash(e.x,e.y,shootAngle);
                    if (game.chapter >= 5) playCustomSound('music/tank5,6.ogg', 5, 0.7);
                    else playCustomSound('music/tank4,3,2.ogg', 5, 0.7);
                } else {
                    addEnemyBullet(shootAngle, '#ff3a22', '#ff0000', 'redDash');
                    spawnMuzzleFlash(e.x,e.y,shootAngle);
                    if (e.type === 'tank') {
                        if (game.chapter >= 5) playCustomSound('music/tank5,6.ogg', 5, 0.7);
                        else playCustomSound('music/tank4,3,2.ogg', 5, 0.7);
                    } else {
                        if (game.level % 2 === 0) playCustomSound('music/enemy2.ogg', 8, 0.6);
                        else playCustomSound('music/enemy.ogg', 8, 0.6);
                    }
                    if(e.isMiniboss || e.type==='boss'){
                        (e.type==='boss' ? [-0.6,-0.3,0.3,0.6] : [-0.3,0.3]).forEach(a => addEnemyBullet(shootAngle+a, e.type==='boss'?'#ff3a5c':'#ff66ff', e.type==='boss'?'#ff0000':'#ff00ff', 'redDash', bs*1.05));
                        if(e.type==='boss'&&Math.random()<0.3) for(let j=0;j<8;j++) addEnemyBullet(j*Math.PI/4, '#ff3a5c', '#ff0000', 'redDash', bs*0.9);
                    }
                }
            }
        }
    }
    // Enemy-enemy collision
    for(let i=0;i<game.enemies.length;i++){for(let j=i+1;j<game.enemies.length;j++){
        const ea=game.enemies[i],eb=game.enemies[j];
        const dx=eb.x-ea.x,dy=eb.y-ea.y,dist=Math.hypot(dx,dy),md=ea.radius+eb.radius;
        if(dist<md&&dist>0){const ol=(md-dist)/2,nx=dx/dist,ny=dy/dist;ea.x-=nx*ol;ea.y-=ny*ol;eb.x+=nx*ol;eb.y+=ny*ol;
            const dvx=ea.vx-eb.vx,dvy=ea.vy-eb.vy,dot=dvx*nx+dvy*ny;
            if(dot>0){ea.vx-=dot*nx;ea.vy-=dot*ny;eb.vx+=dot*nx;eb.vy+=dot*ny;}}}}

    // ---- Bullets ----
    for(let i=game.bullets.length-1;i>=0;i--){
        const b=game.bullets[i];b.x+=b.vx;b.y+=b.vy;b.life--;
        let dead=b.life<=0||b.x<0||b.x>MAP_W||b.y<0||b.y>MAP_H;
        if(b.ownerType==='player'){
            for(let j=game.enemies.length-1; j>=0; j--){
                const e=game.enemies[j];
                if(Math.hypot(e.x-b.x,e.y-b.y)<e.radius+5){
                    e.hp--;dead=true;spawnHitSpark(b.x,b.y,b.color);
                    if(e.hp<=0){spawnExplosion(e.x,e.y,e.color);audio.play('enemyDeath');screenShake=8;if(navigator.vibrate)navigator.vibrate(30);
                        const coins=getCoinsOnKill(game.chapter,game.level,e.type);
                        const score=getScoreOnKill(game.chapter,game.level,e.type)*game.combo.multiplier;
                        const hpGain=getHpOnKill(game.chapter,game.level,e.type);
                        game.coinsEarned+=coins;addCoins(coins);game.score+=score;addScore(score);
                        game.levelKills++;game.totalKills++;addKill();
                        p.hp=Math.min(p.hp+hpGain,p.maxHp);
                        game.combo.count++;game.combo.timer=COMBO_CONFIG.timeWindow;
                        const ct=COMBO_CONFIG.thresholds;for(let t=ct.length-1;t>=0;t--){if(game.combo.count>=ct[t].combo){game.combo.multiplier=ct[t].multiplier;break;}}
                        const drop=getEnemyDrop(game.chapter,game.level,e.type);
                        if(drop)spawnPickup(e.x,e.y,drop);
                        if(game.chapter>1&&Math.random()<0.05)spawnPickup(e.x,e.y,Math.random()<0.5?'speedBoost':'shield');
                        if(game.mission&&(game.mission.id==='kill_count'||game.mission.id==='time_kill'))game.missionProgress++;
                        // ★ RULE ENFORCEMENT: Pacifist — instant fail on any kill
                        if(game.mission&&game.mission.id==='pacifist'){
                            showToast('❌ RULE BROKEN — You killed an enemy! Mission failed.');
                            game.mission = null; // prevent re-trigger
                            triggerGameOver();
                        }
                        spawnCoinFloat(e.x-camera.x,e.y-camera.y,coins);
                        releaseEnemy(e);
                        game.enemies.splice(j, 1);
                    }break;
                }
            }
        }else{
            const prevX = b.x - b.vx, prevY = b.y - b.vy;
            const hitDist = distToSegment(p.x, p.y, prevX, prevY, b.x, b.y);
            const hitThreshold = p.radius + (b.size || 5) + (game.shieldActive ? 15 : 4);
            if(hitDist <= hitThreshold){
                if(game.shieldActive){
                    game.shieldHits--; screenShake=6;
                    // REFLECTION LOGIC: Rebound fire back at enemies
                    b.ownerType = 'player';
                    b.vx *= -1.4; b.vy *= -1.4; // Reflect with speed boost
                    b.color = '#00eaff'; b.shadow = '#00ffff'; // Shield energy color
                    b.life = 90; // Reset life
                    dead = false; // Stay alive to hit enemies
                    spawnHitSpark(b.x, b.y, '#00eaff');
                    audio.play('shoot', 0.3); // "Ping" reflection sound
                } else {
                    dead=true;
                    p.hp--; hitFlash=0.45; screenShake=6;
                    spawnHitSpark(b.x, b.y, b.color || '#ff3a22');
                    if(navigator.vibrate)navigator.vibrate(40);
                    if(window.playCustomSound) playCustomSound('music/shooter_destoyed.ogg', 4, 0.5);
                    // ★ RULE ENFORCEMENT: Untouchable — instant fail on ANY damage
                    if(game.mission && game.mission.id==='no_damage'){
                        showToast('❌ RULE BROKEN — You took damage! Mission failed.');
                        game.mission = null; // prevent re-trigger
                        triggerGameOver();
                    }
                    if(p.hp<=0){spawnExplosion(p.x,p.y,p.color); audio.play('playerDeath', 1.0); triggerGameOver();}
                }
            }
        }
        if(dead){ releaseBullet(b); game.bullets.splice(i,1); }
    }

    // ---- Pickups ----
    for(let i=game.pickups.length-1;i>=0;i--){
        const pk=game.pickups[i];pk.life-=dt*1000;if(pk.life<=0){game.pickups.splice(i,1);continue;}
        if(Math.hypot(p.x-pk.x,p.y-pk.y)<p.radius+20){
            // Collect
            switch(pk.type){
                case'doubleBullet':game.doubleBulletTimer=POWERUP_CONFIG.doubleBullet.duration; playCustomSound('music/double_fire.ogg', 3, 0.8); break;
                case'fullHp':p.hp=p.maxHp;break;
                case'missile':addItem('missile');break;
                case'speedBoost':game.speedBoostTimer=POWERUP_CONFIG.speedBoost.duration;game.speedBoostAmount=POWERUP_CONFIG.speedBoost.boostMin+Math.random()*(POWERUP_CONFIG.speedBoost.boostMax-POWERUP_CONFIG.speedBoost.boostMin);break;
                case'shield':game.shieldActive=true;game.shieldHits=POWERUP_CONFIG.shield.hits;game.shieldTimer=POWERUP_CONFIG.shield.duration;break;
            }
            game.pickups.splice(i,1);screenShake=4;
        }
    }

    // ---- Clones (combo x3+) ----
    if(game.combo.count>=COMBO_CONFIG.cloneSpawnThreshold&&game.clones.length<COMBO_CONFIG.cloneMaxCount){
        game.clones.push({x:p.x+(Math.random()-0.5)*80,y:p.y+(Math.random()-0.5)*80,angle:Math.random()*Math.PI*2,shootTimer:0});
    }
    if(game.combo.count<COMBO_CONFIG.cloneSpawnThreshold)game.clones=[];
    for(const cl of game.clones){
        cl.x+=(Math.random()-0.5)*COMBO_CONFIG.cloneSpeed*60*dt;cl.y+=(Math.random()-0.5)*COMBO_CONFIG.cloneSpeed*60*dt;
        cl.angle+=0.02;cl.shootTimer-=dt*1000;
        if(cl.shootTimer<=0){cl.shootTimer=COMBO_CONFIG.cloneFireRate;const ch=CHAPTERS[game.chapter-1];
            game.bullets.push({x:cl.x+Math.cos(cl.angle)*28,y:cl.y+Math.sin(cl.angle)*28,vx:Math.cos(cl.angle)*15,vy:Math.sin(cl.angle)*15,life:60,ownerType:'player',color:ch.fireColor,shadow:ch.fireShadow});
        }
    }

    // ---- Wave Spawning check ----
    const currentECount = game.enemies.length;
    if (currentECount < game.maxConcurrentEnemies && game.enemiesPending > 0) {
        if(Math.random() < 0.05) { // staggered spawn
            const t=game.enemiesConfig.types[Math.floor(Math.random()*game.enemiesConfig.types.length)];
            spawnEnemy(game.chapter, game.level, t);
            game.enemiesPending--;
        }
    }

    // ---- Level complete check ----
    let timeUp = false;
    if (game.mission) {
        if (game.mission.id === 'survive_time' || game.mission.id === 'pacifist') {
            if (game.missionProgress >= game.mission.target) timeUp = true;
        } else if (game.mission.id === 'no_damage') {
            if (game.noDamageTimer >= game.mission.target) timeUp = true;
        } else if (game.mission.id === 'time_kill') {
            if (game.missionProgress >= game.mission.target) timeUp = true;
        } else if (game.mission.id === 'kill_count') {
            if (game.missionProgress >= game.mission.target && currentECount === 0) timeUp = true;
        }
    }

    if((currentECount===0 && game.enemiesPending<=0 && game.safeTimer<=0) || timeUp){
        // Check mission complete
        let missionComplete = true;
        if(game.mission){
            if(game.mission.id==='kill_count' && game.missionProgress < game.mission.target) missionComplete = false;
            if(game.mission.id==='survive_time' && game.missionProgress < game.mission.target) missionComplete = false;
            if(game.mission.id==='no_damage' && game.noDamageTimer < game.mission.target) missionComplete = false;
            if(game.mission.id==='time_kill' && game.missionProgress < game.mission.target) missionComplete = false;
            if(game.mission.id==='pacifist' && game.missionProgress < game.mission.target) missionComplete = false;
        }

        if(!missionComplete){
            showToast('❌ RULE BROKEN — Mission objective failed! Game Over.');
            game.mission = null;
            triggerGameOver();
            return;
        }

        if(game.mission){
            const bonus = 20 * game.chapter;
            addCoins(bonus);
            game.coinsEarned += bonus;
        }
        triggerLevelComplete();
    }

    updateHUD();renderFrame(dt,timestamp);requestAnimationFrame(gameLoop);
}

// =====================================================================
// TRIGGERS
// =====================================================================
function triggerLevelComplete(){
    game.state='levelComplete';completeLevel(game.chapter,game.level);
    addToHistory({chapter:game.chapter,level:game.level,score:game.score,kills:game.levelKills,result:'VICTORY',coins:game.coinsEarned});
    const ch=CHAPTERS[game.chapter-1];const isChapterDone=game.level>=ch.levels;
    document.getElementById('level-complete-title').textContent = '⭐ LEVEL '+game.level+' COMPLETE!';
    document.getElementById('level-complete-score').textContent='Score: '+game.score;
    document.getElementById('level-complete-coins').textContent='Coins: +'+game.coinsEarned;
    if(isChapterDone){
        document.getElementById('chapter-win-title').textContent=ch.icon+' '+ch.name+' COMPLETE!';
        document.getElementById('chapter-win-sub').textContent='You conquered all '+ch.levels+' levels!';
        document.getElementById('chapter-complete-overlay').classList.remove('hidden');
    }else{
        const nl=game.level+1;document.getElementById('next-level-text').textContent='Entering Level '+nl+'...';
        const bar=document.getElementById('overlay-countdown-bar');bar.style.animation='none';
        requestAnimationFrame(()=>{bar.style.animation='';});
        document.getElementById('level-complete-overlay').classList.remove('hidden');
        setTimeout(()=>{document.getElementById('level-complete-overlay').classList.add('hidden');startLevel(game.chapter,game.level+1);},2500);
    }
}

function triggerGameOver(){
    game.state='gameOver';addDeath();
    setTimeout(() => playCustomSound('music/game_over.ogg', 1, 1.0), 900);
    addToHistory({chapter:game.chapter,level:game.level,score:game.score,kills:game.levelKills,result:'DEFEAT',coins:game.coinsEarned});
    document.getElementById('go-chapter').textContent=game.chapter;
    document.getElementById('go-level').textContent=game.level;
    document.getElementById('go-score').textContent=game.score;
    document.getElementById('go-kills').textContent=game.levelKills;
    document.getElementById('game-over-overlay').classList.remove('hidden');
}

// =====================================================================
// HUD
// =====================================================================
function updateHUD(){
    const p=game.player;if(!p)return;
    const pct=Math.max(0,p.hp/p.maxHp)*100;
    document.getElementById('hp-bar').style.width=pct+'%';
    document.getElementById('hp-text').textContent=Math.max(0,p.hp)+'/'+p.maxHp;
    document.getElementById('hud-coins').textContent=window.getSaveData().coins;
    document.getElementById('hud-chapter-text').textContent='CH.'+game.chapter;
    document.getElementById('hud-level-text').textContent='LVL '+game.level;
    document.getElementById('hud-enemies-text').textContent=game.enemies.length+' enemies';
    document.getElementById('hud-score-text').textContent=game.score;
    // Combo
    const cd=document.getElementById('combo-display');
    if(game.combo.count>=2){cd.classList.remove('hidden');document.getElementById('combo-text').textContent='x'+game.combo.multiplier;}else{cd.classList.add('hidden');}
    // Mission
    updateMissionHUD();
    // Missile btn
    const mb = document.getElementById('hud-missile-btn');
    const _sd = window.getSaveData();
    if (_sd.missiles > 0) {
        mb.classList.remove('hidden');
        mb.querySelector('.missile-count').textContent = _sd.missiles;
        const img = mb.querySelector('img');
        if (img) img.src = 'image/missile.png';
    } else {
        mb.classList.add('hidden');
    }
    const mmb = document.getElementById('btn-missile-mobile');
    if (mmb) {
        if (_sd.missiles > 0) mmb.classList.remove('hidden');
        else mmb.classList.add('hidden');
    }
}
function updateMissionHUD(){
    const md=document.getElementById('mission-display');
    if(!game.mission){md.classList.add('hidden');return;}
    md.classList.remove('hidden');
    document.getElementById('mission-icon').textContent=game.mission.icon;
    document.getElementById('mission-text').textContent=game.mission.displayText;
    
    const mp=document.getElementById('mission-progress');
    const formatTime = (secs) => `${Math.max(0, Math.ceil(secs))}s`;
    
    if(game.mission.id==='kill_count') mp.textContent=game.missionProgress+'/'+game.mission.target;
    else if(game.mission.id==='survive_time' || game.mission.id==='no_damage' || game.mission.id==='pacifist') mp.textContent=formatTime(game.mission.target - game.missionProgress);
    else if(game.mission.id==='time_kill') mp.textContent=`${game.missionProgress}/${game.mission.target} (${formatTime(60 - game.missionTimer)})`;
    else mp.textContent=game.missionProgress+'/'+game.mission.target;
}

// =====================================================================
// RENDERER
// =====================================================================
function renderFrame(dt,now){
    updateParticles(dt);if(hitFlash>0)hitFlash=Math.max(0,hitFlash-dt*2.5);
    ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();
    ctx.translate(canvas.width/2,canvas.height/2);ctx.scale(currentZoom,currentZoom);ctx.translate(-canvas.width/2,-canvas.height/2);
    if(screenShake>0.5){ctx.translate((Math.random()-0.5)*screenShake,(Math.random()-0.5)*screenShake);screenShake*=0.87;}
    // Map tint
    const ch=CHAPTERS[game.chapter-1];ctx.fillStyle=ch.mapTint;ctx.fillRect(-camera.x,-camera.y,MAP_W,MAP_H);
    // Border
    ctx.strokeStyle='rgba(255,0,0,0.55)';ctx.lineWidth=6;ctx.strokeRect(-camera.x,-camera.y,MAP_W,MAP_H);
    // Player
    const p=game.player;
    if(p&&game.state!=='gameOver'){
        const dx=p.x-camera.x,dy=p.y-camera.y;
        if(game.shieldActive)drawShield(dx,dy,p.radius,now);
        drawShip(dx,dy,p.angle,p.radius,p.color,true,false, 'player');
        drawHPBar(dx,dy,p.hp,p.maxHp,p.radius,true);
    }
    // Clones
    for(const cl of game.clones){
        const dx=cl.x-camera.x,dy=cl.y-camera.y;
        ctx.globalAlpha=0.35;drawShip(dx,dy,cl.angle,18,p?p.color:'#00eaff',false,false);ctx.globalAlpha=1;
    }
    // Enemies
    for(const eid in game.enemies){const e=game.enemies[eid];drawShip(e.x-camera.x,e.y-camera.y,e.angle,e.radius,e.bodyColor,false,true,e.type);drawHPBar(e.x-camera.x,e.y-camera.y,e.hp,e.maxHp,e.radius,false,e.type);}
    // Pickups
    for(const pk of game.pickups){
        const dx=pk.x-camera.x,dy=pk.y-camera.y;const bounce=Math.sin(now*PICKUP_BOUNCE_SPEED)*4;
        ctx.save();ctx.shadowBlur=PICKUP_GLOW_SIZE;ctx.shadowColor=pk.color;
        
        // Try to draw image first
        const img = gameAssets.images[pk.type];
        if (img && img.complete) {
            ctx.drawImage(img, dx - 18, dy - 18 + bounce, 36, 36);
        } else {
            ctx.font='1.2rem sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(pk.icon,dx,dy+bounce);
        }
        ctx.restore();
    }
    // Bullets
    for(const b of game.bullets){
        const bx=b.x-camera.x,by=b.y-camera.y;
        ctx.save();ctx.shadowBlur=12;ctx.shadowColor=b.shadow||b.color;ctx.fillStyle=b.color;ctx.strokeStyle=b.color;
        const angle=Math.atan2(b.vy,b.vx);
        ctx.translate(bx,by);ctx.rotate(angle);
        
        if (b.shapeType === 'dash') {
            ctx.beginPath();ctx.roundRect(-10, -4, 20, 8, 4);ctx.fill();
        } else if (b.shapeType === 'line') {
            ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-18,0);ctx.lineTo(8,0);ctx.stroke();
            ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
        } else if (b.shapeType === 'redDash') {
            ctx.beginPath();ctx.roundRect(-10, -3, 20, 6, 3);ctx.fill();
            ctx.fillStyle='#fff';ctx.globalAlpha=0.7;ctx.fillRect(0,-1,6,2);
        } else if (b.shapeType === 'bossBeam') {
            ctx.lineWidth=14;ctx.beginPath();ctx.moveTo(-b.vx*3,0);ctx.lineTo(10,0);ctx.stroke();
            ctx.strokeStyle='#fff';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-b.vx*3,0);ctx.lineTo(8,0);ctx.stroke();
        } else if (b.shapeType === 'shadowVolt') {
            ctx.beginPath();ctx.moveTo(-15,-5);ctx.lineTo(0,-2);ctx.lineTo(-10,2);ctx.lineTo(5,0);ctx.stroke();
        } else {
            ctx.beginPath();ctx.arc(0,0,b.ownerType==='enemy'?4:5,0,Math.PI*2);ctx.fill();
            ctx.strokeStyle=b.color+'66';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-b.vx*2.5,0);ctx.stroke();
        }
        ctx.restore();
    }
    // Particles
    for(const pt of particles){ctx.globalAlpha=Math.min(pt.life,1);ctx.fillStyle=pt.color;ctx.beginPath();ctx.arc(pt.x-camera.x,pt.y-camera.y,pt.size,0,Math.PI*2);ctx.fill();}
    ctx.globalAlpha=1;ctx.restore();
    // Hit flash
    if(hitFlash>0){ctx.fillStyle=`rgba(255,58,92,${hitFlash*0.35})`;ctx.fillRect(0,0,canvas.width,canvas.height);}

    // BOSS ALERT UI
    if (game.bossAlert && now - game.bossAlertTime < 3000) {
        const alpha = elapsed < 500 ? elapsed / 500 : elapsed > 2500 ? (3000 - elapsed) / 500 : 1;
        ctx.save();
        ctx.fillStyle = `rgba(255, 30, 0, ${alpha * 0.2})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height); // Red screen tint
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // pulsing "WARNING" title
        const pulse = Math.sin(now * 0.01) * 0.1 + 1;
        ctx.font = `900 ${40 * pulse}px var(--font-head)`;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff3a5c';
        ctx.fillStyle = '#fff';
        ctx.fillText('⚠️ WARNING: BOSS DETECTED ⚠️', canvas.width / 2, canvas.height / 2 - 20);
        
        ctx.font = '700 18px var(--font-head)';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.letterSpacing = '4px';
        ctx.fillText('HEAVY COMBAT UNIT INBOUND', canvas.width / 2, canvas.height / 2 + 35);
        ctx.restore();
    } else if (game.bossAlert && now - game.bossAlertTime >= 3000) {
        game.bossAlert = false;
    }

    if (window.location.search.includes('show=all')) {
        ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0,0,canvas.width,canvas.height);
        window.overrideCh = null;
        drawShip(canvas.width*0.2, 530, Math.PI/2, 30, '#ff2222', false, true, 'basic');
        ctx.fillText('NORMAL ENEMY', canvas.width*0.2, 620);
        drawShip(canvas.width*0.4, 530, Math.PI/2, 40, '#ff4400', false, true, 'tank');
        ctx.fillText('TANK ENEMY', canvas.width*0.4, 620);
        drawShip(canvas.width*0.6, 530, Math.PI/2, 45, '#cc44ff', false, true, 'bossTankB');
        ctx.fillText('SHADOW GOLIATH', canvas.width*0.6, 620);
        drawShip(canvas.width*0.8, 530, Math.PI/2, 55, '#ff2200', false, true, 'bossTankA');
        ctx.fillText('COLOSSUS RING BOSS', canvas.width*0.8, 620);
        ctx.restore();
    }

    // --- NEW: Powerup Timers & Missile Strike Visuals ---
    updatePowerupTimers();

    if(game.activeMissileStrike) {
        const strike = game.activeMissileStrike;
        const progress = Math.min(1, (now - strike.startTime) / strike.duration);
        
        ctx.save();
        // Render Scanline
        const scanX = (progress * 1.5 - 0.25) * canvas.width;
        const grad = ctx.createLinearGradient(scanX - 100, 0, scanX, 0);
        grad.addColorStop(0, 'rgba(0, 234, 255, 0)');
        grad.addColorStop(1, 'rgba(0, 234, 255, 0.4)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, scanX, canvas.height);
        
        ctx.strokeStyle = '#00eaff';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00eaff';
        ctx.beginPath();
        ctx.moveTo(scanX, 0);
        ctx.lineTo(scanX, canvas.height);
        ctx.stroke();
        
        // Render Strike Missiles
        strike.missiles.forEach(m => {
            const mProg = Math.min(1, (now - m.startTime) / 800);
            const curX = m.x + (m.tx - m.x) * mProg;
            const curY = m.y + (m.ty - m.y) * mProg;
            
            ctx.save();
            ctx.translate(curX, curY);
            ctx.rotate(Math.atan2(m.ty - m.y, m.tx - m.x));
            
            // Missile trail
            const trailGrad = ctx.createLinearGradient(-40, 0, 0, 0);
            trailGrad.addColorStop(0, 'rgba(255, 100, 0, 0)');
            trailGrad.addColorStop(1, 'rgba(255, 200, 0, 0.6)');
            ctx.fillStyle = trailGrad;
            ctx.fillRect(-60, -2, 60, 4);
            
            // Missile body
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-10, 6); ctx.lineTo(-10, -6); ctx.closePath(); ctx.fill();
            ctx.restore();
        });
        ctx.restore();
    }
}

// =====================================================================
// DRAW HELPERS
// =====================================================================
function drawShip(x,y,angle,radius,color,isMe,isEnemy,type){
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);
    const r=radius;
    let carColor=isEnemy?color:(color||'#00eaff');
    let accent=isEnemy?'#ff6644':carColor;
    let dark=isEnemy?'#440000':'#0a1520';
    if(!isEnemy){carColor=color;accent=color;dark='#0a1520';}
    ctx.shadowBlur=isMe?16:isEnemy?12:6;
    ctx.shadowColor=isEnemy?'rgba(255,50,0,0.5)':carColor+'80';

    const _esd = (window.getSaveData ? window.getSaveData() : {});
    // If equippedShip is NOT null, respect it. If null, use the chapter-specific default.
    const ch = window.overrideCh || (isMe ? (game.trialShipId || (_esd.equippedShip !== null ? _esd.equippedShip : game.chapter)) : game.chapter) || 1;

    if(isEnemy) {
        if(type==='bossTankA' || type==='boss') {
            const time = Date.now() * 0.001;
            for(let i=0; i<8; i++) {
                ctx.save();
                ctx.rotate((i * Math.PI) / 4);
                ctx.fillStyle = '#222830'; ctx.beginPath(); ctx.roundRect(r*1.1, -12, r*0.4, 24, 4); ctx.fill();
                ctx.fillStyle = '#ff2222'; ctx.fillRect(r*1.3, -13, 6, 26);
                ctx.fillStyle = '#11151a'; ctx.beginPath(); ctx.roundRect(r*1.4, -8, r*0.2, 16, 2); ctx.fill();
                ctx.shadowBlur = 15; ctx.shadowColor = '#ff2222';
                ctx.fillStyle = '#ff5544'; ctx.fillRect(r*1.55, -5, 6, 10);
                ctx.restore();
            }
            ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.fillStyle = '#3a4454'; ctx.beginPath(); ctx.arc(0,0,r*1.2,0,Math.PI*2); ctx.fill();
            for(let i=0; i<16; i++) {
                ctx.save(); ctx.rotate((i * Math.PI) / 8 + 0.1);
                ctx.strokeStyle = '#ff3333'; ctx.lineWidth = 2; ctx.shadowBlur = 10; ctx.shadowColor = '#ff0000';
                ctx.beginPath(); ctx.moveTo(r*0.9, 0); ctx.lineTo(r*1.18, 0); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(r*1.05, 0); ctx.lineTo(r*1.1, 8); ctx.stroke(); ctx.restore();
            }
            ctx.shadowBlur = 0; ctx.fillStyle = '#1e242b'; ctx.beginPath(); ctx.arc(0,0,r*0.9,0,Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#4488ff'; ctx.lineWidth = 4; ctx.shadowBlur = 15; ctx.shadowColor = '#0055ff';
            ctx.beginPath(); ctx.arc(0,0,r*0.75,0,Math.PI*2); ctx.stroke();
            ctx.shadowBlur = 40; ctx.shadowColor = '#ff2200';
            const corePulse = Math.sin(time * 3) * 0.05 + 1;
            const grad = ctx.createRadialGradient(0,0,r*0.2, 0,0,r*0.75 * corePulse);
            grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
            grad.addColorStop(0.2, 'rgba(255, 200, 0, 1)');
            grad.addColorStop(0.6, 'rgba(255, 50, 0, 0.8)');
            grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
            ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0,0,r*0.75 * corePulse,0,Math.PI*2); ctx.fill();
            ctx.fillStyle = '#ffcc00'; ctx.beginPath(); ctx.arc(0,0,r*0.4,0,Math.PI*2); ctx.fill();
            ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0,0,r*0.2,0,Math.PI*2); ctx.fill();
        } else if(type==='bossTankB') {
            // Shadow Goliath — elongated stealth wedge
            ctx.shadowBlur=28;ctx.shadowColor='rgba(160,50,255,0.85)';
            ctx.fillStyle=carColor; ctx.beginPath();
            ctx.moveTo(r*1.6,0);ctx.lineTo(r*0.5,r*0.9);ctx.lineTo(-r*1.2,r*0.6);
            ctx.lineTo(-r*1.4,0);ctx.lineTo(-r*1.2,-r*0.6);ctx.lineTo(r*0.5,-r*0.9);
            ctx.closePath();ctx.fill();
            ctx.fillStyle=dark; ctx.beginPath();
            ctx.moveTo(r*1.0,0);ctx.lineTo(r*0.1,r*0.5);ctx.lineTo(-r*0.8,r*0.35);
            ctx.lineTo(-r*1.0,0);ctx.lineTo(-r*0.8,-r*0.35);ctx.lineTo(r*0.1,-r*0.5);
            ctx.closePath();ctx.fill();
            ctx.fillStyle=accent;ctx.beginPath();ctx.roundRect(r*0.8,-4,r*0.85,8,4);ctx.fill();
            ctx.fillStyle='#cc44ff';ctx.beginPath();ctx.arc(0,0,r*0.28,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(0,0,r*0.12,0,Math.PI*2);ctx.fill();
        } else if(type==='miniboss') {
            ctx.fillStyle=carColor;ctx.fillRect(-r*1.0,-r*0.8,r*2.0,r*1.6);
            ctx.fillStyle=dark;ctx.fillRect(-r*0.4,-r*0.5,r*1.2,r*1.0);
            ctx.fillStyle=accent;ctx.beginPath();ctx.arc(r*0.2,0,r*0.15,0,Math.PI*2);ctx.fill();
        } else if(type==='tank') { // Reference Image 4 (Round Core Drone)
            ctx.shadowBlur=15;ctx.shadowColor=carColor;
            // Side thrusters
            ctx.fillStyle='#333b44';
            ctx.beginPath();ctx.roundRect(-r*0.2, -r*0.85, r*0.5, r*1.7, 5);ctx.fill();
            // Main round body
            ctx.fillStyle='#4a5058';
            ctx.beginPath();ctx.arc(0,0,r*0.85,0,Math.PI*2);ctx.fill();
            ctx.strokeStyle='#1a2026'; ctx.lineWidth=4; ctx.stroke();
            // Gun nozzle
            ctx.fillStyle='#2a3036';
            ctx.fillRect(r*0.6, -r*0.25, r*0.5, r*0.5);
            ctx.strokeStyle=carColor; ctx.lineWidth=2; ctx.strokeRect(r*0.6, -r*0.25, r*0.5, r*0.5);
            // Brilliant core
            ctx.fillStyle=carColor; ctx.shadowBlur=25; ctx.shadowColor=carColor;
            ctx.beginPath();ctx.arc(0,0,r*0.45,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#fff'; ctx.shadowBlur=10;
            ctx.beginPath();ctx.arc(0,0,r*0.15,0,Math.PI*2);ctx.fill();
        } else { // Normal enemy (Glitch Stealth Drone)
            const glitchOffset = (Math.random() < 0.1) ? (Math.random() * 4 - 2) : 0; 
            ctx.save(); ctx.translate(glitchOffset, 0);
            ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
            ctx.beginPath(); ctx.moveTo(r*1.0 + 3, 0); ctx.lineTo(r*0.3 + 3, r*0.9); ctx.lineTo(-r*0.6 + 3, r*0.9); ctx.lineTo(-r*0.2 + 3, 0); ctx.lineTo(-r*0.6 + 3, -r*0.9); ctx.lineTo(r*0.3 + 3, -r*0.9); ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.beginPath(); ctx.moveTo(r*1.0 - 3, 0); ctx.lineTo(r*0.3 - 3, r*0.9); ctx.lineTo(-r*0.6 - 3, r*0.9); ctx.lineTo(-r*0.2 - 3, 0); ctx.lineTo(-r*0.6 - 3, -r*0.9); ctx.lineTo(r*0.3 - 3, -r*0.9); ctx.closePath(); ctx.fill();

            ctx.fillStyle = 'rgba(200, 210, 220, 0.6)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(r*1.0, 0); ctx.lineTo(r*0.3, r*0.9); ctx.lineTo(-r*0.6, r*0.9); ctx.lineTo(-r*0.2, 0); ctx.lineTo(-r*0.6, -r*0.9); ctx.lineTo(r*0.3, -r*0.9); ctx.closePath(); ctx.fill(); ctx.stroke();

            ctx.fillStyle = 'rgba(100, 110, 120, 0.5)';
            ctx.beginPath(); ctx.moveTo(r*0.8, 0); ctx.lineTo(r*0.2, r*0.6); ctx.lineTo(-r*0.4, r*0.6); ctx.lineTo(0, 0); ctx.lineTo(-r*0.4, -r*0.6); ctx.lineTo(r*0.2, -r*0.6); ctx.closePath(); ctx.fill();

            ctx.shadowBlur = 20; ctx.shadowColor = '#ff2222'; ctx.fillStyle = '#ff2222';
            ctx.fillRect(-r*0.15, -r*0.15, r*0.3, r*0.3);
            ctx.shadowBlur = 5; ctx.strokeStyle = '#ff2222'; ctx.lineWidth = 1.5; ctx.beginPath();
            ctx.moveTo(r*0.2, 0); ctx.lineTo(r*0.5, 0);
            ctx.moveTo(r*0.2, -r*0.1); ctx.lineTo(r*0.4, -r*0.2); ctx.lineTo(r*0.6, -r*0.2);
            ctx.moveTo(r*0.2, r*0.1); ctx.lineTo(r*0.4, r*0.2); ctx.lineTo(r*0.6, r*0.2);
            ctx.moveTo(-r*0.15, -r*0.15); ctx.lineTo(-r*0.3, -r*0.3); ctx.lineTo(-r*0.6, -r*0.3);
            ctx.moveTo(-r*0.15, r*0.15); ctx.lineTo(-r*0.3, r*0.3); ctx.lineTo(-r*0.6, r*0.3); ctx.stroke();

            ctx.shadowBlur = 10; ctx.strokeStyle = 'rgba(255, 50, 50, 0.8)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(r*1.0, 0); ctx.lineTo(r*3.0, 0); ctx.stroke();
            ctx.restore();
        }
    } else {
        // --- PLAYER SHIPS ---
        if(ch === 1) { // Reference Image 2 (Sleek Jet Fighter)
            ctx.shadowBlur=22;ctx.shadowColor=carColor;
            // Back swept wings
            ctx.fillStyle=carColor; 
            ctx.beginPath();ctx.moveTo(r*0.5,0);ctx.lineTo(-r*1.2,r*1.1);ctx.lineTo(-r*0.6,0);ctx.lineTo(-r*1.2,-r*1.1);ctx.closePath();ctx.fill();
            // Main sleek core (white/cyan)
            ctx.fillStyle='#e8faff';
            ctx.beginPath();ctx.moveTo(r*1.4,0);ctx.lineTo(-r*0.4,r*0.35);ctx.lineTo(-r*0.8,0);ctx.lineTo(-r*0.4,-r*0.35);ctx.closePath();ctx.fill();
            // Inner angular lines
            ctx.strokeStyle=dark; ctx.lineWidth=2;
            ctx.beginPath();ctx.moveTo(r*0.8,0);ctx.lineTo(-r*0.2,r*0.2);ctx.stroke();
            ctx.beginPath();ctx.moveTo(r*0.8,0);ctx.lineTo(-r*0.2,-r*0.2);ctx.stroke();
        }
        else if(ch === 2) { // Reference Image 1 & 3 (Round Node Ship)
            // Energy shield/thruster backdrop
            ctx.fillStyle = 'rgba(0,234,255,0.15)';
            ctx.beginPath();ctx.arc(0,0,r*1.4,0,Math.PI*2);ctx.fill();
            ctx.strokeStyle = 'rgba(0,234,255,0.5)'; ctx.lineWidth = 2; ctx.stroke();
            // Gun barrel
            ctx.fillStyle = '#445566';
            ctx.fillRect(r*0.5, -r*0.25, r*0.7, r*0.5);
            ctx.strokeStyle = '#0a1520'; ctx.lineWidth = 2; ctx.strokeRect(r*0.5, -r*0.25, r*0.7, r*0.5);
            // Main circular body
            ctx.fillStyle=carColor; ctx.shadowBlur=15; ctx.shadowColor=carColor;
            ctx.beginPath();ctx.arc(0,0,r*0.9,0,Math.PI*2);ctx.fill();
            ctx.strokeStyle = '#00eaff'; ctx.lineWidth = 3; ctx.stroke();
            // Cyan Nodes
            ctx.fillStyle=accent; ctx.shadowBlur=10; ctx.shadowColor=accent;
            for(let i=0; i<8; i++){
                const a = i * Math.PI/4;
                ctx.beginPath();ctx.arc(Math.cos(a)*r*0.9, Math.sin(a)*r*0.9, r*0.2, 0, Math.PI*2);ctx.fill();
                ctx.strokeStyle='#0a1520'; ctx.lineWidth=1.5; ctx.stroke();
            }
        }
        else if(ch === 3) { // Heavy Hexagons
            ctx.fillStyle=carColor;ctx.shadowBlur=18;
            ctx.beginPath();for(let i=0;i<6;i++){const a=(i*Math.PI/3);ctx.lineTo(Math.cos(a)*r*1.3,Math.sin(a)*r*1.3);}ctx.closePath();ctx.fill();
            ctx.fillStyle=dark;ctx.beginPath();ctx.arc(0,0,r*0.6,0,Math.PI*2);ctx.fill();
            // Heavy armor plates
            ctx.strokeStyle=accent;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,-r*0.8);ctx.lineTo(r*1.5,0);ctx.lineTo(0,r*0.8);ctx.stroke();
        }
        else if(ch === 4) { // Void - Saucer
            const pulse = 1 + Math.sin(Date.now()*0.005)*0.1;
            ctx.fillStyle=dark;ctx.beginPath();ctx.arc(0,0,r*pulse,0,Math.PI*2);ctx.fill();
            ctx.strokeStyle=carColor;ctx.lineWidth=5;ctx.stroke();
            ctx.fillStyle=accent;ctx.beginPath();ctx.arc(0,0,r*0.45,0,Math.PI*2);ctx.fill();
            // Rotating lights
            const rot = (Date.now()*0.002) % (Math.PI*2);
            ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(Math.cos(rot)*r*0.8, Math.sin(rot)*r*0.8, r*0.2, 0, Math.PI*2);ctx.fill();
        }
        else if(ch === 5) { // Toxic Twin hulls
            ctx.fillStyle=carColor;ctx.shadowBlur=15;
            ctx.fillRect(-r*0.8,-r*1.2,r*1.8,r*0.5);ctx.fillRect(-r*0.8,r*0.7,r*1.8,r*0.5);
            ctx.strokeStyle=accent;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-r*0.2,-r*0.7);ctx.lineTo(-r*0.2,r*0.7);ctx.stroke();
            ctx.fillStyle=dark;ctx.beginPath();ctx.arc(0,0,r*0.5,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#fff';ctx.fillRect(r*0.9,-r*1.1,r*0.6,r*0.3);ctx.fillRect(r*0.9,r*0.8,r*0.6,r*0.3);
        }
        else if(ch >= 6) { // Celestial Starburst
            ctx.shadowBlur=30;ctx.shadowColor='#fff';
            ctx.fillStyle=carColor;
            ctx.beginPath();
            for(let i=0;i<8;i++){
                const a=(i*Math.PI/4), len=i%2===0?r*1.6:r*0.6;
                ctx.lineTo(Math.cos(a)*len,Math.sin(a)*len);
            }
            ctx.closePath();ctx.fill();
            ctx.fillStyle=dark;ctx.beginPath();ctx.arc(0,0,r*0.5,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,r*0.2,0,Math.PI*2);ctx.fill();
        }
    }

    ctx.restore();
    // Indicator ring — boss tanks get a dramatic pulsing orange/purple ring
    ctx.save();ctx.translate(x,y);
    let ringColor = isMe ? carColor : isEnemy ? 'rgba(255,60,60,0.6)' : 'rgba(255,255,255,0.2)';
    if(type==='bossTankA') ringColor='rgba(255,130,0,0.8)';
    if(type==='bossTankB') ringColor='rgba(160,50,255,0.8)';
    ctx.strokeStyle=ringColor;ctx.lineWidth=isMe?2:type==='bossTankA'||type==='bossTankB'?3:1;
    ctx.setLineDash(isMe?[]:[4,6]);ctx.beginPath();ctx.arc(0,0,radius+12,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.restore();
}
function drawHPBar(x,y,hp,maxHp,radius,isMe,type){
    const bw=radius*2.2,bh=5,bx=x-bw/2,by=y-radius-22;
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(bx,by,bw,bh);
    const pct=Math.max(0,hp/maxHp);
    ctx.fillStyle=pct>0.6?'#00ff9f':pct>0.3?'#fbbf24':'#ff3a5c';
    ctx.fillRect(bx,by,bw*pct,bh);
    ctx.strokeStyle=isMe?'#00eaff':'rgba(255,255,255,0.25)';
    ctx.lineWidth=1;ctx.strokeRect(bx,by,bw,bh);

    // Show floating HP numeric labels on Tanks, Minibosses, Bosses, and Boss Tanks
    if(type==='tank'||type==='miniboss'||type==='boss'||type==='bossTankA'||type==='bossTankB') {
        ctx.save();
        ctx.fillStyle = type==='bossTankA'?'#ffaa44':type==='bossTankB'?'#cc88ff':'#ffffff';
        ctx.font='bold 11px sans-serif';
        ctx.textAlign='center';
        ctx.textBaseline='bottom';
        const displayHp = Math.ceil(hp);
        const label = type==='bossTankA'?`⚔️${displayHp}/${maxHp}`:type==='bossTankB'?`💥${displayHp}/${maxHp}`:`${displayHp}/${maxHp}`;
        ctx.fillText(label, x, by - 3);
        ctx.restore();
    }
}
function drawShield(x,y,radius,now){
    ctx.save();
    ctx.translate(x,y);
    
    // Orbital Arcs
    const rot = now * 0.002;
    for(let i=0; i<3; i++) {
        ctx.save();
        ctx.rotate(rot + (i * Math.PI * 2 / 3));
        ctx.strokeStyle = `rgba(0, 234, 255, ${0.4 + Math.sin(now*0.005 + i)*0.2})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, radius + 22, 0, Math.PI * 0.6);
        ctx.stroke();
        
        // Orbital spark
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(radius + 22, 0, 2, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    }
    
    // Main Pulse
    ctx.strokeStyle = 'rgba(0, 220, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 10]);
    ctx.beginPath();
    ctx.arc(0, 0, radius + 15 + Math.sin(now * 0.01) * 3, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
}

// =====================================================================
// PARTICLES
// =====================================================================
function spawnExplosion(x,y,color){
    for(let i=0;i<20;i++){
        const a=Math.random()*Math.PI*2, s=2+Math.random()*5;
        const p = acquireParticle();
        p.x=x; p.y=y; p.vx=Math.cos(a)*s; p.vy=Math.sin(a)*s;
        p.life=0.8+Math.random()*0.6; p.color=color; p.size=2+Math.random()*4;
        particles.push(p);
    }
}
function spawnMuzzleFlash(x,y,angle){
    for(let i=0;i<6;i++){
        const sp=(Math.random()-0.5)*0.4, s=4+Math.random()*4;
        const p = acquireParticle();
        p.x=x+Math.cos(angle)*32; p.y=y+Math.sin(angle)*32;
        p.vx=Math.cos(angle+sp)*s; p.vy=Math.sin(angle+sp)*s;
        p.life=0.12+Math.random()*0.12; p.color='#fbbf24'; p.size=2+Math.random()*3;
        particles.push(p);
    }
}
function spawnHitSpark(x,y,color){
    for(let i=0;i<4;i++){
        const a=Math.random()*Math.PI*2, s=1+Math.random()*3;
        const p = acquireParticle();
        p.x=x; p.y=y; p.vx=Math.cos(a)*s; p.vy=Math.sin(a)*s;
        p.life=0.2+Math.random()*0.15; p.color=color||'#ffaa00'; p.size=1.5+Math.random()*2;
        particles.push(p);
    }
}
function updateParticles(dt){
    for(let i=particles.length-1;i>=0;i--){
        const p=particles[i]; p.x+=p.vx; p.y+=p.vy; p.vx*=0.9; p.vy*=0.9; p.life-=dt;
        if(p.life<=0){ releaseParticle(p); particles.splice(i,1); }
    }
}
function spawnCoinFloat(sx,sy,amount){const el=document.createElement('div');el.className='coin-float';el.innerHTML='+'+amount+' <img src="image/coin.png" style="width:18px; height:18px; vertical-align:middle; margin-left:2px; filter:drop-shadow(0 0 5px gold);">';el.style.left=sx+'px';el.style.top=sy+'px';document.body.appendChild(el);setTimeout(()=>el.remove(),1000);}

// =====================================================================
// INPUT
// =====================================================================
window.addEventListener('keydown',e=>{
    if(e.code==='Space'&&document.activeElement.tagName!=='INPUT'){e.preventDefault();if(isPlaying)isShooting=true;}
    const k=e.key.toLowerCase();
    if(k==='w'||k==='arrowup')keys.w=true;if(k==='a'||k==='arrowleft')keys.a=true;
    if(k==='s'||k==='arrowdown')keys.s=true;if(k==='d'||k==='arrowright')keys.d=true;
    if(k==='p'&&isPlaying)togglePause();
    if(k==='m'&&isPlaying)useMissile();
    if(k==='r'&&game.state==='gameOver')retryLevel();
});
window.addEventListener('keyup',e=>{if(e.code==='Space')isShooting=false;const k=e.key.toLowerCase();if(k==='w'||k==='arrowup')keys.w=false;if(k==='a'||k==='arrowleft')keys.a=false;if(k==='s'||k==='arrowdown')keys.s=false;if(k==='d'||k==='arrowright')keys.d=false;});
window.addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY;});
window.addEventListener('mousedown',e=>{if(e.button===0&&isPlaying)isShooting=true;});
window.addEventListener('mouseup',e=>{if(e.button===0)isShooting=false;});

// =====================================================================
// MOBILE CONTROLS
// =====================================================================
function setupMobileControls(){
    const mc=document.getElementById('mobile-controls');
    mc.classList.remove('hidden'); // Always show — game is mobile/tablet only
    const jZone=document.getElementById('joystick-zone'),jBase=document.getElementById('joystick-base'),jHandle=document.getElementById('joystick-handle');
    const btnFire=document.getElementById('btn-fire'),btnMissile=document.getElementById('btn-missile-mobile');
    const canvas=document.getElementById('gameCanvas');
    const MAX=33;let jId=null;
    
    // DRAG SYSTEM STATE
    let dragId=null;
    let lastTouchX=0, lastTouchY=0;

    function moveJ(cx,cy){const r=jBase.getBoundingClientRect(),bx=r.left+r.width/2,by=r.top+r.height/2;const dx=cx-bx,dy=cy-by;const dist=Math.min(Math.hypot(dx,dy),MAX),ang=Math.atan2(dy,dx);const ox=Math.cos(ang)*dist,oy=Math.sin(ang)*dist;jHandle.style.transform=`translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))`;const t=0.3;keys.a=ox/MAX<-t;keys.d=ox/MAX>t;keys.w=oy/MAX<-t;keys.s=oy/MAX>t;mouse.aimAngle=ang;mouse.useMobileAim=true;}
    function resetJ(){jHandle.style.transform='translate(-50%,-50%)';keys.a=keys.d=keys.w=keys.s=false;mouse.useMobileAim=false;}
    
    jZone.addEventListener('touchstart',e=>{e.preventDefault();jId=e.changedTouches[0].identifier;moveJ(e.changedTouches[0].clientX,e.changedTouches[0].clientY);},{passive:false});
    jZone.addEventListener('touchmove',e=>{e.preventDefault();for(const t of e.changedTouches)if(t.identifier===jId)moveJ(t.clientX,t.clientY);},{passive:false});
    jZone.addEventListener('touchend',e=>{e.preventDefault();resetJ();},{passive:false});
    
    // TOUCH DRAG SYSTEM (Direct Movement)
    canvas.addEventListener('touchstart', e => {
        if (!isPlaying || jId !== null) return;
        const t = e.changedTouches[0];
        dragId = t.identifier;
        lastTouchX = t.clientX;
        lastTouchY = t.clientY;
    }, {passive:true});

    canvas.addEventListener('touchmove', e => {
        if (!isPlaying || dragId === null) return;
        for (const t of e.changedTouches) {
            if (t.identifier === dragId) {
                const dx = t.clientX - lastTouchX;
                const dy = t.clientY - lastTouchY;
                if (game.player) {
                    game.player.x += dx;
                    game.player.y += dy;
                    // Keep in bounds
                    if (game.player.x < 20) game.player.x = 20;
                    if (game.player.x > MAP_W - 20) game.player.x = MAP_W - 20;
                    if (game.player.y < 20) game.player.y = 20;
                    if (game.player.y > MAP_H - 20) game.player.y = MAP_H - 20;
                }
                lastTouchX = t.clientX;
                lastTouchY = t.clientY;
            }
        }
    }, {passive:true});

    canvas.addEventListener('touchend', e => {
        for (const t of e.changedTouches) if (t.identifier === dragId) dragId = null;
    }, {passive:true});

    btnFire.addEventListener('touchstart',e=>{e.preventDefault();isShooting=true;},{passive:false});
    btnFire.addEventListener('touchend',e=>{e.preventDefault();isShooting=false;},{passive:false});
    if(btnMissile){btnMissile.addEventListener('touchstart',e=>{e.preventDefault();useMissile();},{passive:false});}
}

// =====================================================================
// INIT
// =====================================================================
const sd = window.getSaveData();
musicEnabled = sd.musicEnabled !== false;
if(!musicEnabled){const b=document.getElementById('music-toggle-btn');if(b)b.textContent='🔇 Music: OFF';}
updateInventoryUI();

// =====================================================================
// INTRO & LOADING LOGIC
// =====================================================================
function initIntroLogic() {
    console.log("Initializing Intro Logic...");
    const introObj = document.getElementById('intro-video-overlay');
    const vid = document.getElementById('intro-video');
    const loader = document.getElementById('loading-overlay');
    
    if(!introObj || !vid){
        console.log("Intro elements not found, bypassing.");
        if(loader){loader.style.opacity='0';setTimeout(()=>loader.remove(),500);}
        return;
    }

    let transitioned = false;
    function transitionToLoader() {
        if (transitioned) return;
        transitioned = true;
        console.log("Action: Transitioning to loader...");

        // KILL VIDEO AUDIO
        try {
            vid.pause();
            vid.src = "";
            vid.load();
        } catch(e) { console.error("Error stopping video:", e); }

        // Remove the prompt
        const p = document.querySelector('.intro-tap-prompt');
        if(p) p.remove();

        // Fade out intro
        introObj.style.opacity = '0';
        introObj.style.pointerEvents = 'none';

        setTimeout(() => {
            introObj.style.display = 'none';
            introObj.remove();
            console.log("Intro overlay removed.");

            if(loader) {
                loader.style.display = 'flex';
                loader.style.opacity = '1';
                const bar = loader.querySelector('.loader-bar');
                if(bar) {
                    bar.style.transition = 'width 1.2s ease-out';
                    bar.style.width = '100%';
                }
                
                setTimeout(() => {
                    loader.style.opacity = '0';
                    setTimeout(() => {
                        loader.remove();
                        console.log("Loader removed. Game starting.");
                        if(audio.musicEnabled && typeof tryPlayBg === 'function') tryPlayBg();
                    }, 500);
                }, 1300);
            } else {
                if(audio.musicEnabled && typeof tryPlayBg === 'function') tryPlayBg();
            }
        }, 800);
    }

    vid.addEventListener('ended', transitionToLoader);
    vid.addEventListener('error', (e) => {
        console.error("Video Error:", e);
        transitionToLoader();
    });

    // TAP TO AUDIO PROMPT
    function showIntroTapPrompt() {
        if(document.querySelector('.intro-tap-prompt')) return;
        const prompt = document.createElement('div');
        prompt.className = "intro-tap-prompt";
        prompt.style.cssText = "position:fixed; inset:0; z-index:10001; display:flex; align-items:center; justify-content:center; color:#fff; font-family:var(--font-head); text-shadow:0 0 10px #00eaff; cursor:pointer;";
        prompt.innerHTML = "<div style='background:rgba(0,0,0,0.6); padding:20px; border:1px solid #00eaff; border-radius:8px;'>NEURAL LINK ESTABLISHED<br>TAP TO INITIALIZE</div>";
        prompt.onclick = (e) => {
            e.stopPropagation();
            vid.muted = false;
            vid.play().catch(() => {});
            prompt.remove();
        };
        document.body.appendChild(prompt);
    }

    // Try starting the video
    vid.play().then(() => {
        showIntroTapPrompt();
    }).catch(e => {
        console.warn("Autoplay blocked:", e);
        showIntroTapPrompt();
        // If it's completely stuck, move on after 2s
        setTimeout(() => { if(!transitioned && vid.paused) transitionToLoader(); }, 2000);
    });

    // Safety timeout - bypass no matter what after 4s
    setTimeout(() => {
        if(!transitioned) {
            console.log("Safety bypass triggered.");
            transitionToLoader();
        }
    }, 4000);

    // Clicking the background skips too
    introObj.onclick = () => {
        console.log("Overlay background clicked.");
        transitionToLoader();
    };
}

// Run intro logic as soon as DOM is ready, don't wait for 'load' (which waits for all images/fonts)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIntroLogic);
} else {
    initIntroLogic();
}

// ======================== TRIAL SYSTEM JS ========================
window.openTrialPopup = function() {
    console.log("openTrialPopup called");
    if(window.closeAllPopups) window.closeAllPopups();
    const p = document.getElementById('trial-popup');
    if(p) {
        p.classList.remove('hidden');
        console.log("trial-popup unhidden");
        window.renderTrialGrid();
    } else {
        console.error("trial-popup element not found!");
    }
};

window.renderTrialGrid = function() {
    console.log("renderTrialGrid starting");
    const grid = document.getElementById('trial-grid');
    if(!grid) {
        console.error("trial-grid element not found!");
        return;
    }

    try {
        grid.innerHTML = CHAPTERS.map(ch => {
            const unlocked = window.isChapterUnlocked(ch.id);
            const isActive = game.trialShipId === ch.id;
            
            let btnHtml = '';
            if (unlocked) {
                btnHtml = `<button class="trial-action-btn" onclick="window.equipShip(${ch.id}); window.closePopup('trial-popup');">OWNED (EQUIP)</button>`;
            } else if (isActive) {
                btnHtml = `<button class="trial-action-btn active" disabled>TRIAL ACTIVE</button>`;
            } else {
                btnHtml = `<button class="trial-action-btn ad-btn" onclick="window.activateTrialShip(${ch.id})">WATCH AD TO USE</button>`;
            }

            const canvasId = `trial-ship-canvas-${ch.id}`;

            return `
                <div class="trial-ship-item ${isActive ? 'active' : ''}">
                    <div class="ship-icon" style="display:flex; justify-content:center; align-items:center; height:100px; margin-bottom:10px;">
                        <canvas id="${canvasId}" width="100" height="100" style="width:100px; height:100px;"></canvas>
                    </div>
                    <div class="ship-name">${ch.name}</div>
                    <div class="ship-status">${unlocked ? 'COLLECTED' : 'LOCKED'}</div>
                    ${btnHtml}
                </div>
            `;
        }).join('');

        // Now draw each ship on its canvas using the real drawShip function
        CHAPTERS.forEach(ch => {
            const c = document.getElementById(`trial-ship-canvas-${ch.id}`);
            if (!c) return;
            const tCtx = c.getContext('2d');
            if (!tCtx) return;
            tCtx.clearRect(0, 0, 100, 100);
            
            // Temporarily replace the global context as the drawShip function expects it
            const origCtx = ctx;
            ctx = tCtx;
            const oldOverride = window.overrideCh;
            window.overrideCh = ch.id;
            
            try {
                drawShip(50, 55, -Math.PI/2, 22, ch.shooterColor, true, false, null);
            } catch (e) {
                console.error("Error drawing ship in trial:", e);
            }
            
            window.overrideCh = oldOverride;
            ctx = origCtx;
        });
    } catch (err) {
        console.error("renderTrialGrid error:", err);
    }
};

window.activateTrialShip = function(id) {
    window.showRespawnAd(ok => {
        if(ok) {
            game.trialShipId = id;
            window.showToast("TRIAL ACTIVATED: Ship Lease Started!");
            window.renderTrialGrid();
            // Also notify the player drawing immediately
            if(game.player) {
                const oldPos = { x: game.player.x, y: game.player.y };
                game.player = createPlayer(game.chapter);
                Object.assign(game.player, oldPos);
            }
        }
    });
};

// ======================== TOAST & SECRETS ========================
function showToast(msg) {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => { if(toast.parentNode) toast.parentNode.removeChild(toast); }, 3000);
}

let titleTaps = 0;
let lastTapTime = 0;
function handleTitleTap() {
    const now = Date.now();
    // Reset taps if more than 2 seconds between taps
    if(now - lastTapTime > 2000) titleTaps = 0;
    lastTapTime = now;
    titleTaps++;
    
    if(titleTaps >= 5) {
        // Unlock all chapters via store API
        CHAPTERS.forEach(ch => { window.completeLevel(ch.id, ch.levels); });
        showToast("🌟 TRUE MODE ACTIVE: ALL CHAPTERS UNLOCKED!");
        titleTaps = 0;
    }
}

function updatePowerupTimers() {
    const container = document.getElementById('hud-powerup-timers');
    if (!container) return;

    const activePowerups = [];
    if (game.doubleBulletTimer > 0) {
        activePowerups.push({
            id: 'double-fire',
            name: 'DOUBLE FIRE',
            timer: game.doubleBulletTimer,
            max: (POWERUP_CONFIG.doubleBullet && POWERUP_CONFIG.doubleBullet.duration) || 10000,
            icon: 'image/double_fire.png',
            color: '#ff6600'
        });
    }
    if (game.shieldActive && game.shieldTimer > 0) {
        activePowerups.push({
            id: 'shield',
            name: 'SHIELD',
            timer: game.shieldTimer,
            max: 15000,
            icon: 'image/shield.png',
            color: '#00eaff'
        });
    }

    // Stable DOM management
    const currentItems = Array.from(container.querySelectorAll('.hud-timer-item'));
    const activeIds = activePowerups.map(p => p.id);

    // Remove expired
    currentItems.forEach(el => {
        if (!activeIds.includes(el.dataset.id)) el.remove();
    });

    // Add or Update
    activePowerups.forEach(p => {
        let el = container.querySelector(`[data-id="${p.id}"]`);
        if (!el) {
            el = document.createElement('div');
            el.className = 'hud-timer-item';
            el.dataset.id = p.id;
            el.innerHTML = `
                <div class="hud-timer-icon-wrap"><img src="${p.icon}"></div>
                <div class="hud-timer-bar-wrap">
                    <div class="hud-timer-bar" style="background:${p.color}"></div>
                </div>
                <span class="hud-timer-val">0s</span>
            `;
            container.appendChild(el);
        }
        const bar = el.querySelector('.hud-timer-bar');
        const val = el.querySelector('.hud-timer-val');
        const pct = (p.timer / p.max) * 100;
        bar.style.width = pct + '%';
        val.textContent = Math.ceil(p.timer / 1000) + 's';
    });
}

window.game = game;
window.handleTitleTap = handleTitleTap;
window.showToast = showToast;

// BATTERY & CPU OPTIMIZATION: Pause on background
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (isPlaying && !isPaused) togglePause();
        if (audio.music) audio.music.pause();
    } else {
        if (audio.musicEnabled && typeof tryPlayBg === 'function') tryPlayBg();
    }
});
})();
