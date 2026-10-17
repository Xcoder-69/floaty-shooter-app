// ======================== ADMOB MANAGER ========================
// Optimized for Capacitor Community AdMob & Browser Simulation
// ===============================================================

let AdMob = null;
try { AdMob = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob; } catch(e) {}

const AD_UNITS = {
    BANNER: "ca-app-pub-5141258475616427/9880126743", // Standard bottom banner
    REWARD: "ca-app-pub-5141258475616427/7167087924", // Reward for trials/respawns
};

let rewardedReady = false;

// ---- INITIALIZATION ----
async function initializeAd() {
    if (!AdMob) { 
        console.log("No AdMob detected — Using Simulated Ad Mode."); 
        return; 
    }
    try {
        await AdMob.initialize();
        console.log("AdMob Initialized.");
        setTimeout(showBanner, 2000); // Small delay to let UI settle
        preloadReward();
    } catch (e) { console.error("AdMob Init Failed:", e); }
}

async function showBanner() {
    if (!AdMob) return;
    try {
        await AdMob.showBanner({
            adId: AD_UNITS.BANNER,
            position: 'BOTTOM_CENTER',
            margin: 0
        });
    } catch (e) { console.warn("Banner show failed:", e); }
}

async function preloadReward() {
    if (!AdMob) return;
    try {
        await AdMob.prepareRewardVideoAd({ adId: AD_UNITS.REWARD });
        rewardedReady = true;
    } catch(e) { rewardedReady = false; }
}

// ---- UNIFIED REWARD AD FUNCTION ----
window.showRewardAd = async function(type, onReward) {
    if (AdMob) {
        try {
            if (!rewardedReady) await preloadReward();
            const reward = await AdMob.showRewardVideoAd();
            rewardedReady = false;
            setTimeout(preloadReward, 3000);
            if (reward && reward.type) {
                if (onReward) onReward(true);
            } else {
                if (onReward) onReward(false);
            }
        } catch (e) {
            console.warn("Mobile Ad failed, falling back to simulation...");
            runSimulatedAd(onReward);
        }
        return;
    }
    runSimulatedAd(onReward);
};

function runSimulatedAd(cb) {
    const overlay = document.getElementById('simulated-ad-overlay');
    if (!overlay) { if(cb) cb(true); return; }

    overlay.classList.remove('hidden');
    const bar = overlay.querySelector('.ad-progress');
    if (bar) {
        bar.classList.remove('active');
        void bar.offsetWidth; // Force reflow
        bar.classList.add('active');
    }

    setTimeout(() => {
        overlay.classList.add('hidden');
        if (cb) cb(true);
    }, 2800);
}

// Global accessor for old logic
window.adManager = {
    showRetryReward: (cb) => window.showRewardAd('retry', cb),
    isAdReady: () => rewardedReady || !AdMob
};

document.addEventListener('DOMContentLoaded', initializeAd);
