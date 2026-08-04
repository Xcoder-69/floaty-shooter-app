// =====================================================================
// DATA.JS — All Game Configuration Data
// =====================================================================

// ======================== CHAPTERS ========================
const CHAPTERS = [
    {
        id: 1,
        name: 'Genesis Protocol',
        levels: 10,
        shooterColor: '#00eaff',
        fireColor: '#88eeff',
        fireShadow: '#00ccff',
        // Normal fire: single cyan beam. Double fire: two wide parallel side beams
        doubleFireMode: 'parallel',   // offsets two bullets side-by-side perpendicularly
        themeGradient: ['#020b14', '#0a1a2e'],
        accent: '#00eaff',
        mapTint: 'rgba(0,30,80,0.15)',
        description: 'Begin your training. Learn the basics of combat.',
        icon: '🌀',
        enemyTypes: ['basic'],
        missionCount: 2,
    },
    {
        id: 2,
        name: 'Neon Uprising',
        levels: 15,
        shooterColor: '#ffd700',
        fireColor: '#ffee44',
        fireShadow: '#ffaa00',
        // Normal fire: gold bolt. Double fire: wide V-fork split (±0.38 rad)
        doubleFireMode: 'vfork',
        themeGradient: ['#0a0800', '#1a1200'],
        accent: '#ffd700',
        mapTint: 'rgba(40,30,0,0.18)',
        description: 'Rebels strike back. Fast enemies appear.',
        icon: '⚡',
        enemyTypes: ['basic', 'fast'],
        missionCount: 3,
    },
    {
        id: 3,
        name: 'Crimson Siege',
        levels: 20,
        shooterColor: '#ff3366',
        fireColor: '#ff2244',
        fireShadow: '#cc0022',
        // Normal fire: red spike. Double fire: triangle burst (center + ±45°)
        doubleFireMode: 'triangle',
        themeGradient: ['#140008', '#200010'],
        accent: '#ff3366',
        mapTint: 'rgba(60,0,20,0.20)',
        description: 'The siege begins. Tank enemies enter the field.',
        icon: '🔥',
        enemyTypes: ['basic', 'fast', 'tank'],
        missionCount: 4,
    },
    {
        id: 4,
        name: 'Void Dominion',
        levels: 25,
        shooterColor: '#9b59ff',
        fireColor: '#cc88ff',
        fireShadow: '#6600ff',
        // Normal fire: purple plasma. Double fire: rotating spiral (4 bullets, clock-spread)
        doubleFireMode: 'spiral',
        themeGradient: ['#080014', '#120028'],
        accent: '#9b59ff',
        mapTint: 'rgba(30,0,60,0.22)',
        description: 'Mixed threats converge. Adapt or perish.',
        icon: '🌑',
        enemyTypes: ['basic', 'fast', 'tank'],
        missionCount: 3,
    },
    {
        id: 5,
        name: 'Inferno Core',
        levels: 30,
        shooterColor: '#ff6600',
        fireColor: '#ffaa22',
        fireShadow: '#ff4400',
        // Normal fire: orange plasma from top hull. Double fire: both hull barrels fire simultaneously
        doubleFireMode: 'dualhull',
        themeGradient: ['#140800', '#281000'],
        accent: '#ff6600',
        mapTint: 'rgba(60,20,0,0.24)',
        description: 'The core burns. Multiple enemy types swarm.',
        icon: '☄️',
        enemyTypes: ['basic', 'fast', 'tank'],
        missionCount: 5,
    },
    {
        id: 6,
        name: 'Omega Extinction',
        levels: 40,
        shooterColor: '#ffffff',
        fireColor: '#eeeeff',
        fireShadow: '#aaddff',
        // Normal fire: white prismatic. Double fire: 6-way starburst ring
        doubleFireMode: 'starburst',
        themeGradient: ['#000000', '#0a0a14'],
        accent: '#ffffff',
        mapTint: 'rgba(10,10,20,0.28)',
        description: 'The final stand. Mini-bosses guard every 10th level.',
        icon: '💀',
        enemyTypes: ['basic', 'fast', 'tank', 'miniboss'],
        missionCount: 7,
    },
];

// ======================== ENEMY TYPES ========================
const ENEMY_TYPES = {
    basic: {
        name: 'Scout',
        hp: 2,
        speed: 0.4,       // base multiplier
        fireRate: 250,     // frames between shots
        radius: 22,
        color: '#ff4444',
        bodyColor: '#cc2200',
        accentColor: '#ff6644',
        coinReward: 2,
        scoreReward: 5,
        hpDrop: 1,         // small HP on kill
    },
    fast: {
        name: 'Striker',
        hp: 1,
        speed: 0.7,
        fireRate: 200,
        radius: 18,
        color: '#ffaa00',
        bodyColor: '#cc8800',
        accentColor: '#ffdd44',
        coinReward: 3,
        scoreReward: 8,
        hpDrop: 1,
    },
    tank: {
        name: 'Juggernaut',
        hp: 6,              // base, scales with chapter
        speed: 0.25,
        fireRate: 300,
        radius: 30,
        color: '#44ff88',
        bodyColor: '#228844',
        accentColor: '#66ffaa',
        coinReward: 10,
        scoreReward: 25,
        hpDrop: 2,
        isTank: true,
    },
    miniboss: {
        name: 'Overlord',
        hp: 15,
        speed: 0.3,
        fireRate: 150,
        radius: 38,
        color: '#ff00ff',
        bodyColor: '#880088',
        accentColor: '#ff66ff',
        coinReward: 25,
        scoreReward: 50,
        hpDrop: 3,
        isTank: true,
        isMiniboss: true,
    },
    boss: {
        name: 'THE OVERLORD',
        hp: 50,              // Massive HP
        speed: 0.15,         // Slow and intimidating
        fireRate: 80,        // Rapid fire barrages
        radius: 54,
        color: '#ff0044',
        bodyColor: '#440011',
        accentColor: '#ff0000',
        coinReward: 200,
        scoreReward: 1000,
        hpDrop: 10,
        isTank: true,
        isBoss: true,
    },
    // ---- RANDOM BOSS TANKS (appear after chapter 1) ----
    bossTankA: {
        name: 'Iron Colossus',
        hp: 35,
        speed: 0.18,
        fireRate: 110,
        radius: 46,
        color: '#ff6600',
        bodyColor: '#992200',
        accentColor: '#ff9900',
        coinReward: 120,
        scoreReward: 400,
        hpDrop: 5,
        isTank: true,
        isBossTank: true,
        firePattern: 'fiveWay',   // 5-way forward spread
    },
    bossTankB: {
        name: 'Shadow Goliath',
        hp: 28,
        speed: 0.32,
        fireRate: 70,
        radius: 40,
        color: '#aa44ff',
        bodyColor: '#330066',
        accentColor: '#dd88ff',
        coinReward: 100,
        scoreReward: 350,
        hpDrop: 4,
        isTank: true,
        isBossTank: true,
        firePattern: 'rapidBurst',  // 3-shot rapid burst
    },
};

// ======================== ENEMY RATIOS PER CHAPTER ========================
// Returns { count, types[] } for a given chapter and level
function getEnemyConfig(chapter, level) {
    let count = 3;
    let types = ['basic'];
    const ch = CHAPTERS[chapter - 1] || CHAPTERS[0]; // fallback
    let speedMult = 1.0;
    let fireRateMult = 1.0;
    let tankHpMult = 1.0;
    let hasTank = false;
    let hasMiniboss = false;

    // Define common enemy pool for all chapters
    types = ['basic', 'fast'];
    hasTank = true;
    if (level > 5 || chapter > 1) hasMiniboss = true;

    // Chapter-specific variations (Difficulty Scaling only)
    switch (chapter) {
        case 1: // 10 levels - Learning Phase
            if (level <= 3) count = 3 + Math.floor(Math.random() * 2);
            else if (level <= 6) count = 4 + Math.floor(Math.random() * 3);
            else count = 6 + Math.floor(Math.random() * 3);
            speedMult = 0.7; // slow movement
            break;

        case 2: // 15 levels
            if (level <= 5) count = 4 + Math.floor(Math.random() * 2);
            else if (level <= 10) count = 5 + Math.floor(Math.random() * 2);
            else count = 6 + Math.floor(Math.random() * 2);
            speedMult = 0.85;
            break;

        case 3: // 20 levels
            if (level <= 7) count = 5 + Math.floor(Math.random() * 2);
            else if (level <= 14) count = 6 + Math.floor(Math.random() * 3);
            else count = 7 + Math.floor(Math.random() * 3);
            speedMult = 0.95;
            fireRateMult = 0.9;
            tankHpMult = 1.0;
            break;

        case 4: // 25 levels
            if (level <= 8) count = 6 + Math.floor(Math.random() * 3);
            else if (level <= 17) count = 7 + Math.floor(Math.random() * 3);
            else count = 8 + Math.floor(Math.random() * 3);
            speedMult = 1.0;
            fireRateMult = 0.85;
            tankHpMult = 1.5;
            break;

        case 5: // 30 levels
            if (level <= 10) count = 7 + Math.floor(Math.random() * 3);
            else if (level <= 20) count = 8 + Math.floor(Math.random() * 3);
            else count = 9 + Math.floor(Math.random() * 3);
            speedMult = 1.1;
            fireRateMult = 0.8;
            tankHpMult = 2.4;
            break;

        case 6: // 40 levels
            if (level <= 15) count = 8 + Math.floor(Math.random() * 3);
            else if (level <= 30) count = 9 + Math.floor(Math.random() * 3);
            else count = 10 + Math.floor(Math.random() * 3);
            speedMult = 1.25;
            fireRateMult = 0.7;
            tankHpMult = 3.5;
            break;
    }

    // BOSS logic for final level of any chapter
    if (level === ch.levels) {
        if (!types.includes('boss')) types.push('boss');
        count = Math.max(count, 5); // Ensure enough enemies spawn with boss
    }

    // RANDOM BOSS TANKS: spawn randomly in chapters 2-6 (not on final level)
    // 15% chance per level; mutually exclusive with hasMiniboss/boss
    let hasBossTank = false;
    let bossTankType = null;
    if (chapter >= 2 && level < ch.levels && !hasMiniboss && !types.includes('boss')) {
        if (Math.random() < 0.15) {
            hasBossTank = true;
            bossTankType = Math.random() < 0.5 ? 'bossTankA' : 'bossTankB';
        }
    }

    return { count, types, speedMult, fireRateMult, hasTank, hasMiniboss, tankHpMult, hasBossTank, bossTankType };
}

// ======================== DROP TABLES ========================
// Returns what an enemy might drop. null = no drop
function getEnemyDrop(chapter, level, enemyType) {
    // Tank always drops a gift
    if (enemyType === 'tank' || enemyType === 'miniboss') {
        return getTankDrop(chapter);
    }

    // Regular enemies: rare drops
    const dropChance = 0.08 + (level * 0.005); // 8% base, +0.5% per level
    if (Math.random() > dropChance) return null;

    const roll = Math.random();
    if (roll < 0.6) return 'doubleBullet';
    return 'fullHp';
}

function getTankDrop(chapter) {
    const roll = Math.random();
    // Free missile rarity depends on chapter
    const missileChance = chapter <= 2 ? 0.05 : chapter <= 4 ? 0.1 : 0.15;

    if (roll < missileChance) return 'missile';
    if (roll < missileChance + 0.45) return 'doubleBullet';
    return 'fullHp';
}

// ======================== HP RECOVERY ========================
function getHpOnKill(chapter, level, enemyType) {
    const base = ENEMY_TYPES[enemyType]?.hpDrop || 1;
    // Scale slightly with chapter
    const chapterBonus = Math.floor((chapter - 1) * 0.3);
    return Math.min(base + chapterBonus, 3);
}

// ======================== COIN REWARDS ========================
function getCoinsOnKill(chapter, level, enemyType) {
    const base = ENEMY_TYPES[enemyType]?.coinReward || 2;
    // Slight increase with level
    return base + Math.floor(level / 5);
}

// ======================== SCORE REWARDS ========================
function getScoreOnKill(chapter, level, enemyType) {
    const base = ENEMY_TYPES[enemyType]?.scoreReward || 5;
    return base + Math.floor(level / 3);
}

// ======================== MISSION SYSTEM ========================
const MISSION_TYPES = [
    {
        id: 'kill_count',
        name: 'Elimination',
        description: 'Kill {count} enemies',
        getTarget: (ch, lvl) => 15 + ch * 5 + lvl * 2,
        icon: '💀',
    },
    {
        id: 'survive_time',
        name: 'Endurance',
        description: 'Survive for {time} seconds',
        getTarget: (ch, lvl) => 60 + ch * 15,
        icon: '⏱️',
    },
    {
        id: 'no_damage',
        name: 'Untouchable',
        description: 'Take no damage for {time} seconds',
        getTarget: (ch, lvl) => 20 + ch * 3,
        icon: '🛡️',
    },
    {
        id: 'time_kill',
        name: 'Time Attack',
        description: 'Kill {count} enemies in 60s',
        getTarget: (ch, lvl) => 30,
        icon: '⏳',
    },
    {
        id: 'pacifist',
        name: 'Pacifist',
        description: 'Survive {time}s without killing',
        getTarget: (ch, lvl) => 20,
        icon: '🕊️',
    }
];

// Pre-determine which levels in each chapter are "Fun Levels"
// Uses a seeded approach so it's consistent
function getMissionLevels(chapter) {
    const ch = CHAPTERS[chapter - 1];
    const count = ch.missionCount;
    const totalLevels = ch.levels;
    const levels = [];

    // Spread missions roughly evenly, avoid level 1
    const spacing = Math.floor(totalLevels / (count + 1));
    for (let i = 0; i < count; i++) {
        let lvl = spacing * (i + 1);
        // Don't put on last level
        if (lvl >= totalLevels) lvl = totalLevels - 1;
        if (lvl < 2) lvl = 2;
        levels.push(lvl);
    }
    return levels;
}

function getMissionForLevel(chapter, level) {
    if (level === 1) return null; // FIX: No missions/fun levels on Level 1
    const missionLevels = getMissionLevels(chapter);
    if (!missionLevels.includes(level)) return null;

    // Pick a mission type based on level seed
    const seed = (chapter * 100 + level) % MISSION_TYPES.length;
    const mission = { ...MISSION_TYPES[seed] };
    const target = mission.getTarget(chapter, level);

    if (mission.id === 'kill_count' || mission.id === 'time_kill') {
        mission.displayText = mission.description.replace('{count}', target);
    } else {
        mission.displayText = mission.description.replace('{time}', target);
    }
    mission.target = target;
    return mission;
}

// ======================== PLAYER BASE STATS ========================
function getPlayerMaxHp(chapter) {
    switch (chapter) {
        case 1: return 20;
        case 2: return 40;
        case 3: return 50;
        case 4: return 60;
        case 5: return 70;
        case 6: return 80;
        default: return 80 + (chapter - 6) * 10;
    }
}

// ======================== POWERUP DURATIONS ========================
const POWERUP_CONFIG = {
    doubleBullet: {
        duration: 10000,    // 10 seconds
        name: 'Double Fire',
        icon: '🔥',
        image: 'image/double_fire.png',
        color: '#ff6600',
    },
    speedBoost: {
        duration: 10000,    // 10 seconds
        boostMin: 0.30,
        boostMax: 0.50,
        name: 'Speed Boost',
        icon: '⚡',
        color: '#ffdd00',
        unlockedAfterChapter: 1,
    },
    shield: {
        duration: 15000,    // 15 seconds
        hits: 3,
        name: 'Shield',
        icon: '🛡️',
        image: 'image/shield.png',
        color: '#00ddff',
        unlockedAfterChapter: 1,
    },
    fullHp: {
        name: 'Full HP',
        icon: '❤️',
        color: '#ff3366',
    },
    missile: {
        name: 'Missile',
        icon: '🚀',
        image: 'image/missile.png',
        color: '#ff4444',
    },
    coin: {
        name: 'Coin',
        icon: '🪙',
        image: 'image/coin.png',
        color: '#ffd700',
    }
};

// ======================== STORE PRICES ========================
const STORE_PRICES = {
    missile: 100,
    shield: 75,
    doubleBullet: 50,
};

// ======================== MISSILE AD LIMITS ========================
const MISSILE_AD_LIMIT = 3;       // max 3 ads per window
const MISSILE_AD_WINDOW = 2 * 60 * 60 * 1000; // 2 hours in ms

// ======================== COMBO CONFIG ========================
const COMBO_CONFIG = {
    timeWindow: 2000, // ms between kills to maintain combo
    thresholds: [
        { combo: 2, multiplier: 2, label: 'x2' },
        { combo: 4, multiplier: 3, label: 'x3' },
        { combo: 7, multiplier: 5, label: 'x5' },
    ],
    cloneSpawnThreshold: 3, // spawn shadow clones at x3+
    cloneMaxCount: 2,
    cloneSpeed: 0.4,        // slow movement multiplier
    cloneFireRate: 800,     // ms between clone shots
};

// ======================== SAFE START DELAY ========================
const SAFE_START_DELAY = 1500; // 1.5 seconds before enemies start firing

// ======================== PICKUP CONFIG ========================
const PICKUP_DESPAWN_TIME = 8000; // 8 seconds
const PICKUP_BOUNCE_SPEED = 0.003; // visual bounce frequency
const PICKUP_GLOW_SIZE = 28;

// ======================== MAP SIZE ========================
const MAP_W = 2400;
const MAP_H = 2400;
