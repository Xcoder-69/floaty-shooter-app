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
        shipSVG: '<path d="M0 -45 L35 40 L0 25 L-35 40 Z" />',
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
        shipSVG: '<path d="M0 -45 L35 -15 L35 40 L0 20 L-35 40 L-35 -15 Z" />',
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
        shipSVG: '<path d="M38 0 L19 33 L-19 33 L-38 0 L-19 -33 L 19 -33 Z" />',
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
        missionCount: 5,
        shipSVG: '<circle cx="0" cy="0" r="35" />',
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
        missionCount: 6,
        shipSVG: '<path d="M-35 -45 L35 -45 L35 -20 L-35 -20 Z M-35 20 L 35 20 L 35 45 L-35 45 Z" />',
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
        missionCount: 8,
        shipSVG: '<path d="M0 -45 L12 -15 L45 -15 L18 10 L30 45 L0 25 L-30 45 L-18 10 L-45 -15 L-12 -15 Z" />',
    },
];

// ======================== ENEMY TYPES ========================
const ENEMY_TYPES = {
    basic: {
        name: 'Scout',
        hp: 2,
        speed: 0.32,       // base multiplier (was 0.4)
        fireRate: 320,     // frames between shots (was 250)
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
        speed: 0.52,       // was 0.7
        fireRate: 260,     // was 200
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
        hp: 5,              // was 6
        speed: 0.20,        // was 0.25
        fireRate: 340,      // was 300
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
        hp: 12,             // was 15
        speed: 0.25,        // was 0.3
        fireRate: 200,      // was 150
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
        hp: 38,              // was 50
        speed: 0.15,
        fireRate: 110,       // was 80
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
    // ---- RANDOM BOSS TANKS (appear after chapter 2) ----
    bossTankA: {
        name: 'Iron Colossus',
        hp: 26,              // was 35
        speed: 0.16,         // was 0.18
        fireRate: 140,       // was 110
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
        hp: 22,              // was 28
        speed: 0.26,         // was 0.32
        fireRate: 95,        // was 70
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
    const ch = CHAPTERS[chapter - 1] || CHAPTERS[0]; // fallback
    let count = 3;
    let types = ['basic'];
    let speedMult = 0.55;
    let fireRateMult = 1.35;
    let tankHpMult = 1.0;
    let hasTank = false;
    let hasMiniboss = false;

    // Strict, balanced per-chapter progression matching game lore & difficulty curve
    switch (chapter) {
        case 1: // Genesis Protocol (10 levels) — Beginner training, basic combat only
            types = ['basic'];
            hasTank = false;
            hasMiniboss = false;
            speedMult = 0.55;       // Slow and easy to maneuver around
            fireRateMult = 1.35;    // Enemies shoot 35% slower
            tankHpMult = 1.0;
            if (level <= 2) count = 3;
            else if (level <= 4) count = 4;
            else if (level <= 7) count = 5;
            else if (level <= 9) count = 6;
            else count = 7;         // Level 10 has Boss
            break;

        case 2: // Neon Uprising (15 levels) — Fast strikers appear, no tanks
            types = level <= 3 ? ['basic', 'basic', 'fast'] : ['basic', 'fast'];
            hasTank = false;
            hasMiniboss = (level === 10); // Mini-boss encounter only on level 10
            speedMult = 0.70;
            fireRateMult = 1.20;
            tankHpMult = 1.0;
            if (level <= 5) count = 4;
            else if (level <= 10) count = 5;
            else count = 6;
            break;

        case 3: // Crimson Siege (20 levels) — Tanks enter the field
            types = ['basic', 'fast'];
            hasTank = (level >= 4 && (level % 3 === 0 || level === ch.levels));
            hasMiniboss = (level === 10);
            if (hasTank) types.push('tank');
            speedMult = 0.80;
            fireRateMult = 1.10;
            tankHpMult = 0.85;
            if (level <= 6) count = 4 + Math.floor(Math.random() * 2);
            else if (level <= 12) count = 5 + Math.floor(Math.random() * 2);
            else count = 6 + Math.floor(Math.random() * 2);
            break;

        case 4: // Void Dominion (25 levels) — Mixed tactical threats
            types = ['basic', 'fast', 'tank'];
            hasTank = (level % 2 === 0);
            hasMiniboss = (level === 12 || level === 20);
            speedMult = 0.90;
            fireRateMult = 1.0;
            tankHpMult = 1.0;
            if (level <= 8) count = 5 + Math.floor(Math.random() * 2);
            else if (level <= 17) count = 6 + Math.floor(Math.random() * 2);
            else count = 7 + Math.floor(Math.random() * 2);
            break;

        case 5: // Inferno Core (30 levels) — Swarms & intense combat
            types = ['basic', 'fast', 'tank'];
            hasTank = (level % 2 === 1);
            hasMiniboss = (level === 10 || level === 20);
            speedMult = 1.0;
            fireRateMult = 0.95;
            tankHpMult = 1.25;
            if (level <= 10) count = 6 + Math.floor(Math.random() * 2);
            else if (level <= 20) count = 7 + Math.floor(Math.random() * 2);
            else count = 8 + Math.floor(Math.random() * 2);
            break;

        case 6: // Omega Extinction (40 levels) — Mini-bosses guard every 10th level
            types = ['basic', 'fast', 'tank'];
            hasTank = (level % 2 === 0);
            hasMiniboss = (level % 10 === 0 && level < ch.levels); // Levels 10, 20, 30
            speedMult = 1.10;
            fireRateMult = 0.88;
            tankHpMult = 1.5;
            if (level <= 15) count = 6 + Math.floor(Math.random() * 2);
            else if (level <= 30) count = 7 + Math.floor(Math.random() * 3);
            else count = 8 + Math.floor(Math.random() * 3);
            break;
    }

    // BOSS logic for final level of any chapter
    if (level === ch.levels) {
        if (!types.includes('boss')) types.push('boss');
        count = Math.max(count, 5); // Ensure enough enemies spawn with boss
    }

    // RANDOM BOSS TANKS: spawn rarely in chapters 3-6 (not on final level or when miniboss is present)
    let hasBossTank = false;
    let bossTankType = null;
    if (chapter >= 3 && level < ch.levels && !hasMiniboss && !types.includes('boss')) {
        if (Math.random() < 0.08) {
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

    // Regular enemies: frequent helpful drops
    const dropChance = 0.12 + (level * 0.006); // 12% base, +0.6% per level
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
        getTarget: (ch, lvl) => Math.min(25, 6 + ch * 2 + Math.floor(lvl * 0.5)),
        icon: '💀',
        image: 'image/mission_kill.png',
    },
    {
        id: 'survive_time',
        name: 'Endurance',
        description: 'Survive for {time} seconds',
        getTarget: (ch, lvl) => 20 + ch * 5,
        icon: '⏱️',
        image: 'image/mission_time.png',
    },
    {
        id: 'no_damage',
        name: 'Untouchable',
        description: 'Take no damage for {time} seconds',
        getTarget: (ch, lvl) => 8 + ch * 2, // 10s on ch1, accessible and achievable!
        icon: '🛡️',
        image: 'image/mission_time.png', // Fallback to time/survive icon
    },
    {
        id: 'time_kill',
        name: 'Time Attack',
        description: 'Kill {count} enemies in 60s',
        getTarget: (ch, lvl) => Math.min(20, 8 + ch * 2),
        icon: '⏳',
        image: 'image/mission_time.png',
    },
    {
        id: 'pacifist',
        name: 'Pacifist',
        description: 'Survive {time}s without killing',
        getTarget: (ch, lvl) => 10 + ch * 2,
        icon: '🕊️',
        image: 'image/mission_pacifist.png',
    }
];

// ======================== FUN LEVEL SCHEDULE ========================
// Exact fun level positions per chapter — matches fun_levels.txt exactly
// Scaling: 10 levels -> 2, 15 -> 3, 20 -> 4, 25 -> 5, 30 -> 6, 40 -> 8
// Fun levels NEVER appear on Level 1 of any chapter or on the final Boss level
const FUN_LEVEL_SCHEDULE = {
    1: [4, 8],
    2: [4, 8, 12],
    3: [5, 9, 14, 18],
    4: [5, 9, 14, 18, 22],
    5: [4, 9, 14, 19, 24, 28],
    6: [4, 8, 14, 18, 24, 28, 34, 38],
};

// Fun Level Mission Assignments per chapter and level
const FUN_LEVEL_MISSIONS = {
    1: { 4: 'no_damage', 8: 'time_kill' },
    2: { 4: 'pacifist', 8: 'survive_time', 12: 'kill_count' },
    3: { 5: 'no_damage', 9: 'time_kill', 14: 'pacifist', 18: 'kill_count' },
    4: { 5: 'survive_time', 9: 'time_kill', 14: 'no_damage', 18: 'pacifist', 22: 'kill_count' },
    5: { 4: 'no_damage', 9: 'pacifist', 14: 'survive_time', 19: 'time_kill', 24: 'kill_count', 28: 'no_damage' },
    6: { 4: 'pacifist', 8: 'no_damage', 14: 'survive_time', 18: 'time_kill', 24: 'kill_count', 28: 'no_damage', 34: 'survive_time', 38: 'time_kill' },
};

const FUN_LEVEL_MISSION_ROTATION = [
    'no_damage',
    'pacifist',
    'survive_time',
    'time_kill',
    'kill_count',
];

function getMissionLevels(chapter) {
    return FUN_LEVEL_SCHEDULE[chapter] || [];
}

function getMissionForLevel(chapter, level) {
    if (level <= 1) return null; // FIX: Never on Level 1 of any chapter
    const schedule = FUN_LEVEL_SCHEDULE[chapter] || [];
    const idx = schedule.indexOf(level);
    if (idx === -1) return null; // Not a fun level

    const chMissions = FUN_LEVEL_MISSIONS[chapter];
    const missionId = (chMissions && chMissions[level]) || FUN_LEVEL_MISSION_ROTATION[idx % FUN_LEVEL_MISSION_ROTATION.length];
    const missionTemplate = MISSION_TYPES.find(m => m.id === missionId);
    if (!missionTemplate) return null;

    const mission = { ...missionTemplate };
    const target = mission.getTarget(chapter, level);
    mission.target = target;

    if (mission.id === 'kill_count' || mission.id === 'time_kill') {
        mission.displayText = mission.description.replace('{count}', target);
    } else {
        mission.displayText = mission.description.replace('{time}', target);
    }
    return mission;
}

// ======================== PLAYER BASE STATS ========================
function getPlayerMaxHp(chapter) {
    switch (chapter) {
        case 1: return 35; // increased from 20 for beginner-friendly survivability
        case 2: return 45;
        case 3: return 55;
        case 4: return 65;
        case 5: return 75;
        case 6: return 85;
        default: return 85 + (chapter - 6) * 10;
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
const SAFE_START_DELAY = 2000; // 2.0 seconds before enemies start firing

// ======================== PICKUP CONFIG ========================
const PICKUP_DESPAWN_TIME = 8000; // 8 seconds
const PICKUP_BOUNCE_SPEED = 0.003; // visual bounce frequency
const PICKUP_GLOW_SIZE = 28;

// ======================== MAP SIZE ========================
const MAP_W = 2400;
const MAP_H = 2400;
