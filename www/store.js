(function() {
    const SAVE_KEY = 'flux_FS_v4_p0';
    
    // Dynamic Salt Generator: Harder to grep in source code
    const _s = [102, 108, 117, 120, 95, 112, 114, 111, 116, 101, 99, 116]; 
    const _getS = () => _s.map(c => String.fromCharCode(c)).join('') + "v" + (7*14);

    // ======================== DEFAULT SAVE STATE ========================
    function getDefaultSave() {
        return {
            coins: 0,
            _cM: 0, // Shadow coin mirror
            missiles: 0,
            shields: 0,
            doubleBullets: 0,
            equippedShip: null,
            chapterProgress: { 1: 0 },
            stats: { totalKills: 0, totalDeaths: 0, totalCoins: 0, totalScore: 0, totalTimePlayed: 0, chaptersCompleted: 0, levelsCompleted: 0 },
            history: [],
            missileAdTimestamps: [],
            musicEnabled: true,
            collectedShips: { 1: true }
        };
    }

    function generateHash(str) {
        let hash = 0;
        const s = str + _getS();
        for (let i = 0; i < s.length; i++) {
            hash = ((hash << 5) - hash) + s.charCodeAt(i);
            hash |= 0;
        }
        return hash.toString(16);
    }

    // Integrity Check: Prevent memory editing of coins
    function verifyIntegrity(data) {
        if (data.coins !== data._cM) {
            console.error("Critical integrity failure detected.");
            data.coins = 0;
            data._cM = 0;
            return false;
        }
        return true;
    }

    function loadSave() {
        try {
            const rawData = localStorage.getItem(SAVE_KEY);
            if (!rawData) return getDefaultSave();
            
            const parts = rawData.split('.');
            if (parts.length !== 2) throw new Error("Invalid format");
            
            const jsonStr = atob(parts[0]);
            if (generateHash(jsonStr) !== parts[1]) throw new Error("Checksum mismatch");
            
            const parsed = JSON.parse(jsonStr);
            verifyIntegrity(parsed);
            
            const defaults = getDefaultSave();
            return { ...defaults, ...parsed, stats: { ...defaults.stats, ...parsed.stats } };
        } catch (e) {
            console.warn('Sync ignored: Using defaults.');
            return getDefaultSave();
        }
    }

    function saveSave(data) {
        try {
            data._cM = data.coins; // Update mirror before saving
            const jsonStr = JSON.stringify(data);
            const encoded = btoa(jsonStr);
            const checksum = generateHash(jsonStr);
            localStorage.setItem(SAVE_KEY, `${encoded}.${checksum}`);
        } catch (e) {}
    }

    // Encapsulated data
    let saveData = loadSave();

    window.getSaveData = () => { 
        if (window.DEBUG_MODE) {
            const d = getDefaultSave();
            d.coins = 99999;
            d.missiles = 99;
            d.shields = 99;
            d.doubleBullets = 99;
            // Unlock all chapters
            CHAPTERS.forEach(ch => { d.chapterProgress[ch.id] = ch.levels; d.collectedShips[ch.id] = true; });
            d.stats.chaptersCompleted = CHAPTERS.length;
            d.stats.levelsCompleted = CHAPTERS.reduce((a,b)=>a+b.levels, 0);
            d.equippedShip = saveData.equippedShip;
            return d;
        }
        return { ...saveData }; 
    };

    // ======================== PUBLIC API ========================
    window.addCoins = function(amount) {
        saveData.coins += amount;
        saveData.stats.totalCoins += amount;
        saveSave(saveData);
        window.updateInventoryUI();
    };

    window.spendCoins = function(amount) {
        if (saveData.coins < amount) return false;
        saveData.coins -= amount;
        saveSave(saveData);
        window.updateInventoryUI();
        return true;
    };

    window.addItem = function(itemType, count = 1) {
        if (itemType === 'missile') saveData.missiles += count;
        else if (itemType === 'shield') saveData.shields += count;
        else if (itemType === 'doubleBullet') saveData.doubleBullets += count;
        saveSave(saveData);
        window.updateInventoryUI();
    };

    window.useItem = function(itemType) {
        let used = false;
        if (itemType === 'missile' && saveData.missiles > 0) { saveData.missiles--; used = true; }
        else if (itemType === 'shield' && saveData.shields > 0) { saveData.shields--; used = true; }
        else if (itemType === 'doubleBullet' && saveData.doubleBullets > 0) { saveData.doubleBullets--; used = true; }
        
        if (used) {
            saveSave(saveData);
            window.updateInventoryUI();
            return true;
        }
        return false;
    };

    window.buyItem = function(itemType) {
        const price = STORE_PRICES[itemType];
        if (price && window.spendCoins(price)) {
            window.addItem(itemType);
            return true;
        }
        return false;
    };

    window.completeLevel = function(chapter, level) {
        const current = saveData.chapterProgress[chapter] || 0;
        if (level > current) saveData.chapterProgress[chapter] = level;
        
        const ch = CHAPTERS[chapter - 1];
        if (saveData.chapterProgress[chapter] >= ch.levels) {
            if (window.game && window.game.trialShipId === chapter) {
                saveData.collectedShips[window.game.trialShipId] = true;
                if (window.showToast) window.showToast("🏆 TRIAL MASTERED: Ship Unlocked!");
            }
            if (chapter < CHAPTERS.length && !saveData.chapterProgress[chapter + 1]) {
                saveData.chapterProgress[chapter + 1] = 0;
            }
        }
        saveData.stats.levelsCompleted++;
        if (saveData.chapterProgress[chapter] >= ch.levels) {
            saveData.stats.chaptersCompleted = Math.max(saveData.stats.chaptersCompleted, chapter);
        }
        saveSave(saveData);
    };

    window.equipShip = function(chapterId) {
        if (!window.isChapterUnlocked(chapterId)) return;
        saveData.equippedShip = parseInt(chapterId);
        saveSave(saveData);
        window.renderCollectionUI();
        if (window.game && window.game.player) {
             const p = window.game.player;
             const old = { x: p.x, y: p.y, vx: p.vx, vy: p.vy, angle: p.angle, hp: p.hp };
             window.game.player = window.createPlayer(chapterId);
             Object.assign(window.game.player, old);
        }
    };

    window.isChapterUnlocked = function(chapter) {
        if (chapter === 1) return true;
        const prevProgress = saveData.chapterProgress[chapter - 1] || 0;
        return prevProgress >= CHAPTERS[chapter - 2].levels;
    };

    window.getCurrentLevel = function(chapter) {
        return Math.min((saveData.chapterProgress[chapter] || 0) + 1, CHAPTERS[chapter - 1].levels);
    };

    window.getHistory = () => saveData.history || [];
    window.addToHistory = (runData) => {
        runData.date = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        saveData.history.unshift(runData);
        if (saveData.history.length > 20) saveData.history.pop();
        saveSave(saveData);
    };

    window.addKill = () => { saveData.stats.totalKills++; saveSave(saveData); };
    window.addDeath = () => { saveData.stats.totalDeaths++; saveSave(saveData); };
    window.addScore = (p) => { saveData.stats.totalScore += p; saveSave(saveData); };

    window.updateInventoryUI = function() {
        const ids = { 'inv-coins': saveData.coins, 'inv-missiles': saveData.missiles, 'inv-shields': saveData.shields, 'inv-double': saveData.doubleBullets };
        for (const id in ids) { const el = document.getElementById(id); if (el) el.textContent = ids[id]; }
        window.updateStoreUI();
        window.updateHudInventory();
    };

    window.updateStoreUI = function() {
        ['missile', 'shield', 'doubleBullet'].forEach(it => {
            const btn = document.getElementById('buy-' + it);
            if (btn) btn.disabled = saveData.coins < STORE_PRICES[it];
        });
        const adM = document.getElementById('ad-missile');
        if (adM) {
            const can = (saveData.missileAdTimestamps.filter(t => Date.now() - t < MISSILE_AD_WINDOW).length < MISSILE_AD_LIMIT);
            adM.disabled = !can;
            adM.textContent = can ? '📺 Watch Ad' : '⏰ Ad Limit Reached';
        }
    };

    window.updateHudInventory = function() {
        const hc = document.getElementById('hud-coins'); if (hc) hc.textContent = saveData.coins;
        const hb = document.getElementById('hud-missile-btn');
        if (hb) {
            if (saveData.missiles > 0) { hb.classList.remove('hidden'); hb.querySelector('.missile-count').textContent = saveData.missiles; }
            else hb.classList.add('hidden');
        }
    };

    window.renderStatsUI = function() {
        const container = document.getElementById('stats-content'); if (!container) return;
        const s = saveData.stats;
        const cards = [
            { label: 'TOTAL KILLS', val: s.totalKills, icon: '💀' },
            { label: 'TOTAL DEATHS', val: s.totalDeaths, icon: '💥' },
            { label: 'COINS EARNED', val: s.totalCoins, icon: '<img src="image/coin.png" class="ui-icon">' },
            { label: 'TOTAL SCORE', val: s.totalScore.toLocaleString(), icon: '⭐' },
            { label: 'LEVELS DONE', val: s.levelsCompleted, icon: '🏆' },
            { label: 'TIME PLAYED', val: Math.round(s.totalTimePlayed / 60) + ' Mins', icon: '⏱️' }
        ];
        container.innerHTML = cards.map(c => `<div class="stats-card"><span class="stats-icon">${c.icon}</span><div class="stats-val">${c.val}</div><div class="stats-label">${c.label}</div></div>`).join('');
    };

    window.renderCollectionUI = function() {
        const grid = document.getElementById('collection-grid'); if (!grid) return;
        grid.innerHTML = CHAPTERS.map(ch => {
            const unlocked = window.isChapterUnlocked(ch.id);
            const currentCh = (window.game && window.game.chapter) || 1;
            const isEquipped = saveData.equippedShip ? (saveData.equippedShip === ch.id) : (currentCh === ch.id);
            const btn = !unlocked ? `<button class="ci-btn locked" disabled>LOCKED</button>` : isEquipped ? `<button class="ci-btn equipped" disabled>ACTIVE</button>` : `<button class="ci-btn equip-action" onclick="equipShip(${ch.id})">EQUIP</button>`;
            const shipSvg = `
                <svg viewBox="-50 -50 100 100" style="width:100%; height:100%; filter:drop-shadow(0 0 10px ${ch.shooterColor});">
                    <g fill="${ch.shooterColor}" stroke="${ch.shooterColor}" stroke-width="2">
                        ${ch.shipSVG}
                    </g>
                    <path d="M0 -16 L16 16 L0 8 L-16 16 Z" fill="#0a1520" />
                </svg>`;
            return `<div class="collection-item ${unlocked ? '' : 'locked'} ${isEquipped ? 'active' : ''}"><div class="ci-preview" style="background:${ch.themeGradient[0]}; border-color:${ch.accent}"><div class="ci-ship-icon" style="display:flex; justify-content:center; align-items:center; width:60px; height:60px;">${shipSvg}</div></div><div class="ci-info"><div class="ci-text"><span class="ci-name">${ch.name}</span><span class="ci-status">${unlocked ? 'COLLECTED' : 'LOCKED'}</span></div>${btn}</div></div>`;
        }).join('');
    };

    window.showRewardAd = function(itemType, cb) {
        const overlay = document.getElementById('ad-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            let timer = 3;
            const interval = setInterval(() => {
                if (--timer <= 0) {
                    clearInterval(interval);
                    overlay.classList.add('hidden');
                    if (itemType === 'missile') saveData.missileAdTimestamps.push(Date.now());
                    window.addItem(itemType);
                    if (cb) cb(true);
                }
            }, 1000);
        } else { window.addItem(itemType); if (cb) cb(true); }
    };

    window.showRespawnAd = function(cb) {
        const overlay = document.getElementById('ad-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            let timer = 3;
            const interval = setInterval(() => {
                if (--timer <= 0) { clearInterval(interval); overlay.classList.add('hidden'); if (cb) cb(true); }
            }, 1000);
        } else if (cb) cb(true);
    };

    // Developer keyword hidden check
    window.addEventListener('DOMContentLoaded', () => {
        if (new URLSearchParams(window.location.search).has('fluxDev')) {
            CHAPTERS.forEach(ch => saveData.chapterProgress[ch.id] = ch.levels);
            saveSave(saveData);
            window.renderCollectionUI();
            window.renderStatsUI();
        }
    });

    // Initial load
    window.updateInventoryUI();
    window.renderStatsUI();
    window.renderCollectionUI();
})();
