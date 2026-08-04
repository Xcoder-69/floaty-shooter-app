// =====================================================================
// DAILY LOGIN REWARD SYSTEM  v2 — Floaty Shooter
// =====================================================================
(function () {
    var DR_KEY = 'fs_daily_reward_v1';

    // ── Cycle 1: Fixed 7-day schedule ────────────────────────────────────
    var DAILY_REWARDS = [
        { day: 1, type: 'coins',   icon: '🪙', label: '100 Coins',     value: 100 },
        { day: 2, type: 'shield',  icon: '🛡️', label: '2 Shields',     value: 2   },
        { day: 3, type: 'coins',   icon: '🪙', label: '200 Coins',     value: 200 },
        { day: 4, type: 'double',  icon: '⚡',  label: '3 Double Fire', value: 3   },
        { day: 5, type: 'missile', icon: '🚀', label: '2 Missiles',    value: 2   },
        { day: 6, type: 'shield',  icon: '🛡️', label: '3 Shields',     value: 3   },
        { day: 7, type: 'mystery', icon: '🎁', label: 'MYSTERY BOX',   value: 0   }
    ];

    // Mystery box prizes (Cycle 1 Day 7 + Cycle 1 mystery)
    var MYSTERY_PRIZES = [
        { type: 'coins',   icon: '🪙', label: '500 Coins',     value: 500  },
        { type: 'missile', icon: '🚀', label: '3 Missiles',    value: 3    },
        { type: 'shield',  icon: '🛡️', label: '5 Shields',     value: 5    },
        { type: 'double',  icon: '⚡',  label: '5 Double Fire', value: 5    },
        { type: 'coins',   icon: '🪙', label: '1000 Coins',    value: 1000 }
    ];

    // ── Cycle 2+: Random bonus reward pool ───────────────────────────────
    var BONUS_POOL = [
        { type: 'coins',   icon: '🪙', label: '150 Coins',     value: 150  },
        { type: 'coins',   icon: '🪙', label: '250 Coins',     value: 250  },
        { type: 'coins',   icon: '🪙', label: '400 Coins',     value: 400  },
        { type: 'coins',   icon: '🪙', label: '600 Coins',     value: 600  },
        { type: 'shield',  icon: '🛡️', label: '2 Shields',     value: 2    },
        { type: 'shield',  icon: '🛡️', label: '3 Shields',     value: 3    },
        { type: 'shield',  icon: '🛡️', label: '4 Shields',     value: 4    },
        { type: 'double',  icon: '⚡',  label: '2 Double Fire', value: 2    },
        { type: 'double',  icon: '⚡',  label: '3 Double Fire', value: 3    },
        { type: 'double',  icon: '⚡',  label: '4 Double Fire', value: 4    },
        { type: 'missile', icon: '🚀', label: '1 Missile',     value: 1    },
        { type: 'missile', icon: '🚀', label: '2 Missiles',    value: 2    },
        { type: 'missile', icon: '🚀', label: '3 Missiles',    value: 3    },
    ];

    // Grand mystery prizes for bonus week Day 7
    var GRAND_MYSTERY_PRIZES = [
        { type: 'coins',   icon: '🪙', label: '1000 Coins',    value: 1000 },
        { type: 'coins',   icon: '🪙', label: '2000 Coins',    value: 2000 },
        { type: 'missile', icon: '🚀', label: '5 Missiles',    value: 5    },
        { type: 'shield',  icon: '🛡️', label: '8 Shields',     value: 8    },
        { type: 'double',  icon: '⚡',  label: '8 Double Fire', value: 8    },
    ];

    // ── Seeded pseudo-random (deterministic per week) ─────────────────────
    function seededRand(seed) {
        var x = Math.sin(seed * 9301 + 49297) * 233280;
        return x - Math.floor(x);
    }

    // Returns the 7-reward array for the current week
    function getActiveRewards(state) {
        var cycle = Math.floor((state.streak || 0) / 7); // 0 = first week
        if (cycle === 0) return DAILY_REWARDS;

        // Bonus week: generate random rewards seeded by week number
        var weekNum = cycle; // unique per week
        var rewards = [];
        for (var i = 0; i < 6; i++) {
            var idx = Math.floor(seededRand(weekNum * 13 + i) * BONUS_POOL.length);
            var base = BONUS_POOL[idx];
            rewards.push({ day: i + 1, type: base.type, icon: base.icon, label: base.label, value: base.value });
        }
        // Day 7 always a grand mystery box in bonus weeks
        rewards.push({ day: 7, type: 'mystery', icon: '🎁', label: 'GRAND BOX', value: 0 });
        return rewards;
    }

    function isBonus(state) {
        return Math.floor((state.streak || 0) / 7) > 0;
    }

    function getWeekNum(state) {
        return Math.floor((state.streak || 0) / 7) + 1;
    }

    function getMysteryPrizes(state) {
        return isBonus(state) ? GRAND_MYSTERY_PRIZES : MYSTERY_PRIZES;
    }

    function getDRState() {
        try { return JSON.parse(localStorage.getItem(DR_KEY)) || {}; }
        catch (e) { return {}; }
    }
    function saveDRState(s) {
        try { localStorage.setItem(DR_KEY, JSON.stringify(s)); } catch (e) {}
    }
    function getTodayStr() {
        var d = new Date();
        return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    }
    function getDayIndex(state) {
        return (state.streak || 0) % 7;
    }
    function hasClaimedToday(state) {
        return state.lastClaimed === getTodayStr();
    }
    function isStreakBroken(state) {
        if (!state.lastClaimed) return false;
        var last = new Date(state.lastClaimed);
        var today = new Date(getTodayStr());
        return (today - last) / 86400000 > 1;
    }


    // ── Public API ──────────────────────────────────────────────────────

    window.checkDailyRewardOnLoad = function () {
        var state = getDRState();
        // Only auto-pop if today's reward hasn't been claimed yet
        if (!hasClaimedToday(state)) {
            setTimeout(function () { window.showDailyReward(); }, 1200);
        }
    };

    window.showDailyReward = function () {
        var state = getDRState();
        if (isStreakBroken(state)) { state.streak = 0; saveDRState(state); }

        var popup = document.getElementById('daily-reward-popup');
        if (popup) popup.classList.remove('hidden');
        var sp = document.getElementById('settings-panel');
        if (sp) sp.classList.add('hidden');

        // If already claimed today and we have the last reward saved, skip the
        // grid and jump straight to the reward reveal view.
        if (hasClaimedToday(state) && state.lastReward) {
            _showClaimedView(state);
        } else {
            renderDailyRewardUI(state);
        }
    };

    window.closeDailyReward = function () {
        var popup = document.getElementById('daily-reward-popup');
        if (popup) popup.classList.add('hidden');
        // Reset any visibility overrides so the popup is clean next time it opens
        var cratesEl = document.getElementById('dr-crates');
        if (cratesEl) cratesEl.style.display = '';
        var claimBtn = document.getElementById('dr-claim-btn');
        if (claimBtn) claimBtn.style.display = '';
        var streakEl = document.getElementById('dr-streak-info');
        if (streakEl) streakEl.style.display = '';
    };

    // Called when user clicks the today's crate (box-opening flow)
    window.openDailyRewardBox = function () {
        var state = getDRState();
        if (hasClaimedToday(state)) return;

        // Start the box-opening animation FIRST, then grant reward after
        var btn = document.getElementById('dr-claim-btn');
        if (btn) btn.disabled = true;

        var todayCard = document.querySelector('.dr-crate.today');
        if (todayCard) {
            todayCard.classList.add('opening');
        }

        // After box-open animation completes, grant and reveal
        setTimeout(function () {
            _grantAndReveal(state);
        }, 700);
    };

    function _grantAndReveal(state) {
        if (isStreakBroken(state)) state.streak = 0;

        var dayIndex = getDayIndex(state);
        var activeRewards = getActiveRewards(state);
        var reward = activeRewards[dayIndex];
        var actual = reward;

        // Mystery box — pick a random prize from appropriate pool
        if (reward.type === 'mystery') {
            var pool = getMysteryPrizes(state);
            actual = pool[Math.floor(Math.random() * pool.length)];
        }

        // Grant item
        if (actual.type === 'coins'   && window.addCoins)  window.addCoins(actual.value);
        else if (actual.type === 'missile' && window.addItem) window.addItem('missile', actual.value);
        else if (actual.type === 'shield'  && window.addItem) window.addItem('shield', actual.value);
        else if (actual.type === 'double'  && window.addItem) window.addItem('doubleBullet', actual.value);

        // Persist — also save the actual reward so we can re-show it later
        state.lastClaimed = getTodayStr();
        state.streak = (state.streak || 0) + 1;
        state.lastReward = { type: actual.type, icon: actual.icon, label: actual.label, value: actual.value };
        saveDRState(state);

        // Switch to reveal-only view: hide grid and button, show only the reward
        _switchToRevealView(state, actual);

        // Toast
        if (window.showToast) window.showToast('🎁 Daily Reward: +' + actual.label + '!');

        // Update inventory HUD
        if (window.updateInventoryUI) window.updateInventoryUI();
    }

    // ─── Switch popup to reveal-only view (used after claiming AND when reopening) ─
    function _switchToRevealView(state, actual) {
        // Hide the crates grid and claim button — show only the reward
        var cratesEl = document.getElementById('dr-crates');
        if (cratesEl) cratesEl.style.display = 'none';

        var claimBtn = document.getElementById('dr-claim-btn');
        if (claimBtn) claimBtn.style.display = 'none';

        // Hide the streak-info row (no duplicate lines)
        var streakEl = document.getElementById('dr-streak-info');
        if (streakEl) streakEl.style.display = 'none';

        // Set subtitle to streak message — one clean line
        var subtitleEl = document.querySelector('.dr-subtitle');
        if (subtitleEl) subtitleEl.textContent = '🔥 DAY ' + (state.streak || 1) + ' STREAK — COME BACK TOMORROW!';

        // Show the reward reveal
        if (actual.type === 'missile') {
            showMissileReveal(actual);
        } else {
            showNormalReveal(actual);
        }

        // Show close button
        var closeBtn = document.getElementById('dr-close-btn');
        if (closeBtn) closeBtn.style.display = 'block';
    }

    // ─── Show "already claimed" view (opened from Settings after today's claim) ──
    function _showClaimedView(state) {
        _switchToRevealView(state, state.lastReward);
    }

    // ─── Normal reward reveal ──────────────────────────────────────────
    function showNormalReveal(actual) {
        var reveal = document.getElementById('dr-reveal');
        var iconEl = document.getElementById('dr-reveal-icon');
        var textEl = document.getElementById('dr-reveal-text');
        if (!reveal || !iconEl || !textEl) return;

        iconEl.textContent = actual.icon;
        textEl.textContent = '+' + actual.label.toUpperCase();
        reveal.classList.remove('hidden');
        reveal.classList.remove('dr-reveal-animate');
        void reveal.offsetWidth; // force reflow
        reveal.classList.add('dr-reveal-animate');

        // Particle burst
        spawnRewardParticles(actual.icon);
    }

    // ─── Missile MEGA reveal ───────────────────────────────────────────
    function showMissileReveal(actual) {
        // Show the big missile congratulation overlay
        var overlay = document.getElementById('dr-missile-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'dr-missile-overlay';
            overlay.className = 'dr-missile-overlay';
            overlay.innerHTML =
                '<div class="dr-missile-bg-flash"></div>' +
                '<div class="dr-missile-inner">' +
                    '<div class="dr-missile-stars">★ ★ ★ ★ ★</div>' +
                    '<div class="dr-missile-emoji">🚀</div>' +
                    '<div class="dr-missile-title">MISSILES!</div>' +
                    '<div class="dr-missile-count">+' + actual.value + '</div>' +
                    '<div class="dr-missile-congrats">CONGRATULATIONS!</div>' +
                    '<div class="dr-missile-sub">INCOMING MISSILES LAUNCHED!</div>' +
                    '<button class="dr-missile-close" onclick="document.getElementById(\'dr-missile-overlay\').classList.add(\'hidden\')">AWESOME! 🔥</button>' +
                '</div>';
            document.body.appendChild(overlay);
        } else {
            // Update count
            var countEl = overlay.querySelector('.dr-missile-count');
            if (countEl) countEl.textContent = '+' + actual.value;
            overlay.classList.remove('hidden');
        }

        overlay.classList.remove('hidden');
        overlay.classList.remove('dr-missile-animate');
        void overlay.offsetWidth;
        overlay.classList.add('dr-missile-animate');

        // Extra particles
        spawnMissileParticles();

        // Also show the normal reveal area
        showNormalReveal(actual);
    }

    // ── Internal helpers ────────────────────────────────────────────────

    function renderDailyRewardUI(state) {
        var container = document.getElementById('dr-crates');
        if (!container) return;
        var claimed  = hasClaimedToday(state);

        // When claimed today: point to the day JUST claimed (streak-1)
        // When not yet claimed: point to the day TO claim today (streak%7)
        var streak = state.streak || 0;
        var todayIdx = claimed
            ? Math.max(0, (streak - 1)) % 7
            : getDayIndex(state);

        container.innerHTML = '';

        // Update streak info
        var streakEl = document.getElementById('dr-streak-info');
        if (streakEl) {
            if (claimed) {
                streakEl.textContent = '🔥 DAY ' + streak + ' STREAK — COME BACK TOMORROW!';
            } else {
                streakEl.textContent = '🎁 TAP THE GLOWING BOX TO REVEAL YOUR REWARD!';
            }
        }

        var activeRewards = getActiveRewards(state);
        var bonus = isBonus(state);
        var weekNum = getWeekNum(state);

        // Toggle bonus-week visual theme on the popup box
        var popupBox = document.querySelector('.daily-reward-box');
        if (popupBox) popupBox.classList.toggle('bonus-week', bonus);

        // Update header title + subtitle for bonus weeks
        var titleEl = document.querySelector('.dr-title');
        var subtitleEl = document.querySelector('.dr-subtitle');
        if (titleEl) {
            titleEl.textContent = bonus ? 'BONUS WEEK ' + weekNum : 'DAILY REWARD';
            titleEl.style.background = bonus
                ? 'linear-gradient(90deg,#00eaff,#9b59ff,#00eaff)'
                : 'linear-gradient(90deg,#f39c12,#ffe066,#f39c12)';
            titleEl.style.backgroundSize = '200%';
            titleEl.style.webkitBackgroundClip = 'text';
            titleEl.style.webkitTextFillColor = 'transparent';
        }
        if (subtitleEl) {
            subtitleEl.textContent = bonus
                ? '⚡ Bigger randomized rewards — resets every 7 days!'
                : '🎯 Tap today\'s box to open your reward!';
            subtitleEl.style.color = bonus ? 'rgba(0,234,255,0.6)' : '';
        }

        activeRewards.forEach(function (reward, i) {
            var status = (i < todayIdx) ? 'claimed'
                       : (i === todayIdx) ? (claimed ? 'claimed' : 'today')
                       : 'locked';
            var special = (i === 6) ? ' day-7-special' : '';
            var card = document.createElement('div');
            card.className = 'dr-crate type-' + reward.type + ' ' + status + special;

            // For "today" unclaimed: show only a sealed gift box — reward hidden until opened
            var boxContent;
            if (status === 'today' && !claimed) {
                // Only show the gift box, NO reward peek
                boxContent =
                    '<div class="dr-crate-box-wrap">' +
                        '<div class="dr-box-lid">🎁</div>' +
                    '</div>';
            } else if (status === 'claimed') {
                boxContent = '<div class="dr-crate-box">' + reward.icon + '</div>';
            } else {
                // Locked: show question mark
                boxContent = '<div class="dr-crate-box dr-box-locked">❓</div>';
            }

            card.innerHTML =
                '<div class="dr-crate-day">DAY ' + reward.day + '</div>' +
                boxContent +
                '<div class="dr-crate-label">' +
                    (status === 'today' && !claimed ? 'TAP!' :
                     status === 'locked' ? '???' :
                     reward.type === 'mystery' ? '???' :
                     reward.label) +
                '</div>';

            // Clickable only for "today" before claiming
            if (status === 'today' && !claimed) {
                card.style.cursor = 'pointer';
                card.onclick = function() { window.openDailyRewardBox(); };
            }
            container.appendChild(card);
        });

        // Update claim button
        var btn = document.getElementById('dr-claim-btn');
        var closeBtn = document.getElementById('dr-close-btn');
        var reveal = document.getElementById('dr-reveal');

        if (btn) {
            if (claimed) {
                btn.disabled = true;
                btn.innerHTML = '✅ Already Claimed Today';
                if (closeBtn) closeBtn.style.display = 'block';
            } else {
                btn.disabled = false;
                btn.innerHTML = '<span class="dr-claim-shine"></span>🎁 TAP BOX TO OPEN';
                if (closeBtn) closeBtn.style.display = 'none';
            }
        }
        if (reveal) reveal.classList.add('hidden');
    }

    // Kept for backward-compat (settings button "Claim Reward")
    window.claimDailyReward = function () {
        window.openDailyRewardBox();
    };

    function spawnRewardParticles(emoji) {
        var popup = document.getElementById('daily-reward-popup');
        if (!popup) return;
        var box = popup.querySelector('.daily-reward-box');
        if (!box) return;
        var rect = box.getBoundingClientRect();
        var cx = rect.left + rect.width  / 2;
        var cy = rect.top  + rect.height / 2;
        var pool = [emoji, '✨', '⭐', '💫', '🌟'];
        for (var i = 0; i < 20; i++) {
            var el = document.createElement('div');
            el.className = 'dr-particle';
            el.textContent = pool[Math.floor(Math.random() * pool.length)];
            var angle = Math.random() * Math.PI * 2;
            var dist  = 80 + Math.random() * 200;
            el.style.left = cx + 'px';
            el.style.top  = cy + 'px';
            el.style.setProperty('--tx', (Math.cos(angle) * dist) + 'px');
            el.style.setProperty('--ty', (Math.sin(angle) * dist - 80) + 'px');
            el.style.animationDelay = (Math.random() * 0.4) + 's';
            el.style.fontSize = (0.9 + Math.random() * 1.2) + 'rem';
            document.body.appendChild(el);
            setTimeout(function (node) { return function () { node.remove(); }; }(el), 1600);
        }
    }

    function spawnMissileParticles() {
        var pool = ['🚀','💥','⭐','✨','🔥','💫','🌟'];
        for (var i = 0; i < 35; i++) {
            var el = document.createElement('div');
            el.className = 'dr-particle';
            el.textContent = pool[Math.floor(Math.random() * pool.length)];
            var cx = window.innerWidth / 2;
            var cy = window.innerHeight / 2;
            var angle = Math.random() * Math.PI * 2;
            var dist  = 120 + Math.random() * 280;
            el.style.left = cx + 'px';
            el.style.top  = cy + 'px';
            el.style.setProperty('--tx', (Math.cos(angle) * dist) + 'px');
            el.style.setProperty('--ty', (Math.sin(angle) * dist - 100) + 'px');
            el.style.animationDelay = (Math.random() * 0.6) + 's';
            el.style.fontSize = (1.0 + Math.random() * 2.0) + 'rem';
            document.body.appendChild(el);
            setTimeout(function (node) { return function () { node.remove(); }; }(el), 2000);
        }
    }

    // NOTE: Do NOT auto-trigger here on page load.
    // checkDailyRewardOnLoad() is called by goToMainMenu() in game.js,
    // so the popup only appears AFTER the player reaches the chapter select screen.
})();
