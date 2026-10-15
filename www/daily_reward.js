// =====================================================================
// DAILY LOGIN REWARD SYSTEM  v3 — Floaty Shooter
// =====================================================================
(function () {
    var DR_KEY = 'fs_daily_reward_v1';
    var _countdownTimerId = null;

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

    // Mystery box prizes (Cycle 1 Day 7)
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
        var cycle = Math.floor((state.streak || 0) / 7);
        if (cycle === 0) return DAILY_REWARDS;

        var weekNum = cycle;
        var rewards = [];
        for (var i = 0; i < 6; i++) {
            var idx = Math.floor(seededRand(weekNum * 13 + i) * BONUS_POOL.length);
            var base = BONUS_POOL[idx];
            rewards.push({ day: i + 1, type: base.type, icon: base.icon, label: base.label, value: base.value });
        }
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

    // ── Live Countdown Timer ─────────────────────────────────────────────
    function startCountdownTimer(nextDayNum, nextRewardLabel) {
        stopCountdownTimer();
        updateCountdownDisplay(nextDayNum, nextRewardLabel);
        _countdownTimerId = setInterval(function () {
            updateCountdownDisplay(nextDayNum, nextRewardLabel);
        }, 1000);
    }

    function stopCountdownTimer() {
        if (_countdownTimerId) {
            clearInterval(_countdownTimerId);
            _countdownTimerId = null;
        }
    }

    function updateCountdownDisplay(nextDayNum, nextRewardLabel) {
        var el = document.getElementById('dr-countdown-time');
        var now = new Date();
        var midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
        var diff = Math.max(0, midnight - now);
        var h = Math.floor(diff / 3600000);
        var m = Math.floor((diff % 3600000) / 60000);
        var s = Math.floor((diff % 60000) / 1000);
        var str = (h < 10 ? '0' : '') + h + 'h ' + (m < 10 ? '0' : '') + m + 'm ' + (s < 10 ? '0' : '') + s + 's';
        if (el) el.textContent = str;

        var subEl = document.getElementById('dr-tomorrow-sub');
        if (subEl && nextDayNum) {
            subEl.textContent = 'Come back tomorrow to unlock Day ' + nextDayNum + (nextRewardLabel ? ' (' + nextRewardLabel + ')' : '') + '!';
        }
    }

    // ── Public API ──────────────────────────────────────────────────────

    window.checkDailyRewardOnLoad = function () {
        var state = getDRState();
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

        // Always render the complete 7-day progression view
        renderDailyRewardUI(state);
    };

    window.closeDailyReward = function () {
        var popup = document.getElementById('daily-reward-popup');
        if (popup) popup.classList.add('hidden');
        stopCountdownTimer();

        var cratesEl = document.getElementById('dr-crates');
        if (cratesEl) cratesEl.style.display = '';
        var claimBtn = document.getElementById('dr-claim-btn');
        if (claimBtn) claimBtn.style.display = '';
        var streakEl = document.getElementById('dr-streak-info');
        if (streakEl) streakEl.style.display = '';
    };

    // Called when user clicks today's crate or claim button
    window.openDailyRewardBox = function () {
        var state = getDRState();
        if (hasClaimedToday(state)) return;

        var btn = document.getElementById('dr-claim-btn');
        if (btn) btn.disabled = true;

        var todayCard = document.querySelector('.dr-crate.today');
        if (todayCard) {
            todayCard.classList.add('opening');
        }

        setTimeout(function () {
            _grantAndReveal(state);
        }, 650);
    };

    function _grantAndReveal(state) {
        if (isStreakBroken(state)) state.streak = 0;

        var dayIndex = getDayIndex(state);
        var activeRewards = getActiveRewards(state);
        var reward = activeRewards[dayIndex];
        var actual = reward;

        // Mystery box
        if (reward.type === 'mystery') {
            var pool = getMysteryPrizes(state);
            actual = pool[Math.floor(Math.random() * pool.length)];
        }

        // Grant item
        if (actual.type === 'coins'   && window.addCoins)  window.addCoins(actual.value);
        else if (actual.type === 'missile' && window.addItem) window.addItem('missile', actual.value);
        else if (actual.type === 'shield'  && window.addItem) window.addItem('shield', actual.value);
        else if (actual.type === 'double'  && window.addItem) window.addItem('doubleBullet', actual.value);

        // Persist
        state.lastClaimed = getTodayStr();
        state.streak = (state.streak || 0) + 1;
        state.lastReward = { type: actual.type, icon: actual.icon, label: actual.label, value: actual.value };
        saveDRState(state);

        // Celebration particles
        spawnRewardParticles(actual.icon);

        // Missile reveal overlay if missile
        if (actual.type === 'missile') {
            showMissileReveal(actual);
        }

        // Toast feedback
        if (window.showToast) window.showToast('🎁 Daily Reward Claimed: +' + actual.label + '!');

        // Update inventory HUD
        if (window.updateInventoryUI) window.updateInventoryUI();

        // Immediately update card to show claimed status and preview upcoming rewards!
        renderDailyRewardUI(state);
    }

    // ─── Render Daily Reward Cards ───────────────────────────────────────
    function renderDailyRewardUI(state) {
        var container = document.getElementById('dr-crates');
        if (!container) return;
        var claimed = hasClaimedToday(state);

        var streak = state.streak || 0;
        var todayIdx = claimed
            ? Math.max(0, (streak - 1)) % 7
            : getDayIndex(state);

        var activeRewards = getActiveRewards(state);
        var bonus = isBonus(state);
        var weekNum = getWeekNum(state);

        var nextDayIdx = (todayIdx + 1) % 7;
        var nextDayNum = nextDayIdx + 1;
        var nextReward = activeRewards[nextDayIdx];

        container.innerHTML = '';

        // Streak status header
        var streakEl = document.getElementById('dr-streak-info');
        if (streakEl) {
            if (claimed) {
                streakEl.textContent = '🔥 DAY ' + streak + ' STREAK • NEXT SUPPLY CRATE TOMORROW';
            } else {
                streakEl.textContent = '🎁 DAY ' + (todayIdx + 1) + ' READY • TAP TODAY\'S BOX TO OPEN!';
            }
        }

        // Toggle bonus theme
        var popupBox = document.querySelector('.daily-reward-box');
        if (popupBox) popupBox.classList.toggle('bonus-week', bonus);

        var titleEl = document.querySelector('.dr-title');
        var subtitleEl = document.querySelector('.dr-subtitle');
        if (titleEl) {
            titleEl.textContent = bonus ? 'BONUS WEEK ' + weekNum : 'DAILY LOGIN REWARD';
        }
        if (subtitleEl) {
            if (claimed) {
                subtitleEl.textContent = 'Today\'s reward claimed! Remaining supply crates are previewed below.';
            } else {
                subtitleEl.textContent = bonus
                    ? '⚡ Bigger randomized rewards — resets every 7 days!'
                    : '🎯 Tap today\'s box to unlock your daily supply crate!';
            }
        }

        // 7 Crates
        activeRewards.forEach(function (reward, i) {
            var isPast = i < todayIdx;
            var isToday = i === todayIdx;
            var isUpcoming = i > todayIdx;

            var status = isPast ? 'claimed'
                       : (isToday ? (claimed ? 'claimed claimed-today' : 'today')
                       : 'upcoming');
            var special = (i === 6) ? ' day-7-special' : '';
            var card = document.createElement('div');
            card.className = 'dr-crate type-' + reward.type + ' ' + status + special;

            var boxContent;
            var labelText;
            var tagText = '';

            if (isToday && !claimed) {
                // Today ready to open
                boxContent =
                    '<div class="dr-crate-box-wrap">' +
                        '<div class="dr-box-lid">🎁</div>' +
                    '</div>';
                labelText = 'TAP!';
                tagText = '<div class="dr-crate-tag" style="color:var(--gold); font-weight:800;">READY</div>';
            } else if (isToday && claimed) {
                // Today claimed
                boxContent = '<div class="dr-crate-box">' + reward.icon + '</div>';
                labelText = reward.label;
                tagText = '<div class="dr-crate-tag" style="color:#2ecc71; font-weight:800;">✓ CLAIMED</div>';
            } else if (isPast) {
                // Past claimed
                boxContent = '<div class="dr-crate-box">' + reward.icon + '</div>';
                labelText = reward.label;
                tagText = '<div class="dr-crate-tag" style="color:#2ecc71;">✓ DONE</div>';
            } else {
                // Upcoming: reward unlocked and clearly previewed
                boxContent = '<div class="dr-crate-box">' + reward.icon + '</div>';
                labelText = reward.label;
                tagText = '<div class="dr-crate-tag">UPCOMING</div>';
            }

            card.innerHTML =
                '<div class="dr-crate-day">DAY ' + reward.day + '</div>' +
                boxContent +
                '<div class="dr-crate-label">' + labelText + '</div>' +
                tagText;

            // Clickable only for "today" before claiming
            if (isToday && !claimed) {
                card.style.cursor = 'pointer';
                card.onclick = function() { window.openDailyRewardBox(); };
            }
            container.appendChild(card);
        });

        // Banner and Claim Button
        var banner = document.getElementById('dr-tomorrow-banner');
        var btn = document.getElementById('dr-claim-btn');
        var closeBtn = document.getElementById('dr-close-btn');

        if (claimed) {
            if (banner) {
                banner.classList.remove('hidden');
                banner.style.display = 'flex';
                startCountdownTimer(nextDayNum, nextReward ? nextReward.label : '');
            }
            if (btn) {
                btn.disabled = false;
                btn.className = 'btn primary dr-claim-btn dr-claimed-btn';
                btn.innerHTML = '⏰ COME BACK TOMORROW';
                btn.onclick = function() { window.closeDailyReward(); };
            }
            if (closeBtn) closeBtn.style.display = 'block';
        } else {
            if (banner) {
                banner.classList.add('hidden');
                banner.style.display = 'none';
                stopCountdownTimer();
            }
            if (btn) {
                btn.disabled = false;
                btn.className = 'btn primary dr-claim-btn';
                btn.innerHTML = '🎁 TAP BOX TO OPEN';
                btn.onclick = function() { window.openDailyRewardBox(); };
            }
            if (closeBtn) closeBtn.style.display = 'none';
        }
    }

    // Kept for backward-compat
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
        for (var i = 0; i < 24; i++) {
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

    function showMissileReveal(actual) {
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
                    '<div class="dr-missile-sub">INCOMING MISSILES ARMED!</div>' +
                    '<button class="dr-missile-close" onclick="document.getElementById(\'dr-missile-overlay\').classList.add(\'hidden\')">AWESOME! 🔥</button>' +
                '</div>';
            document.body.appendChild(overlay);
        } else {
            var countEl = overlay.querySelector('.dr-missile-count');
            if (countEl) countEl.textContent = '+' + actual.value;
            overlay.classList.remove('hidden');
        }

        overlay.classList.remove('hidden');
        overlay.classList.remove('dr-missile-animate');
        void overlay.offsetWidth;
        overlay.classList.add('dr-missile-animate');
    }
})();
