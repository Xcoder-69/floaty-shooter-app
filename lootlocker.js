/**
 * Floaty Shooter — Official LootLocker SDK & REST Integration Module
 * 
 * Features:
 * - Persistent Guest Authentication (UUID preserved in localStorage)
 * - Automatic Session Recovery & Expired Token Auto-Refresh
 * - Top 100 Global Leaderboard Fetching & Formatting
 * - Member / Individual Player Rank Retrieval
 * - Score Submission with Duplicate Protection & Validation
 * - Pilot Callsign (Player Name) Synchronization
 * - Zero Unhandled Exceptions: Safe Offline & Error Handling
 */

(function(window) {
    'use strict';

    // Unique Storage Keys
    const STORAGE_KEY_UID = 'floaty_ll_player_uid';
    const STORAGE_KEY_TOKEN = 'floaty_ll_session_token';
    const STORAGE_KEY_PLAYER_ID = 'floaty_ll_player_id';
    const STORAGE_KEY_LAST_SCORE = 'floaty_ll_last_score';
    const STORAGE_KEY_TOKEN_TIME = 'floaty_ll_token_time';

    const LootLocker = {
        config: {
            domainKey: 'by2b5awt',
            baseUrl: 'https://by2b5awt.api.lootlocker.com',
            gameKey: 'dev_fed0997724b84e998903aea6b5150022',
            gameVersion: '2.0.0',
            leaderboardId: '37213',
            sessionMaxAgeMs: 20 * 60 * 60 * 1000 // 20 hours (tokens normally valid for 24h)
        },

        state: {
            sessionToken: null,
            playerId: null,
            publicUid: null,
            playerIdentifier: null,
            status: 'uninitialized', // 'uninitialized' | 'authenticating' | 'authenticated' | 'offline' | 'error'
            lastError: null,
            isConfigIssue: false,
            initPromise: null,
            lastSubmittedScore: 0,
            lastSubmitTimestamp: 0
        },

        /**
         * Generate a standard RFC4122 v4 UUID
         */
        _generateUUID: function() {
            if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
                return crypto.randomUUID();
            }
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },

        /**
         * Get or create a permanent player identifier
         */
        getOrCreatePlayerIdentifier: function() {
            try {
                let uid = localStorage.getItem(STORAGE_KEY_UID);
                if (!uid || typeof uid !== 'string' || uid.length < 8) {
                    uid = 'fs_' + this._generateUUID();
                    localStorage.setItem(STORAGE_KEY_UID, uid);
                }
                this.state.playerIdentifier = uid;
                return uid;
            } catch (e) {
                if (!this.state.playerIdentifier) {
                    this.state.playerIdentifier = 'fs_temp_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
                }
                return this.state.playerIdentifier;
            }
        },

        /**
         * Load cached session data from storage
         */
        _loadCachedSession: function() {
            try {
                const token = localStorage.getItem(STORAGE_KEY_TOKEN);
                const pid = localStorage.getItem(STORAGE_KEY_PLAYER_ID);
                const time = parseInt(localStorage.getItem(STORAGE_KEY_TOKEN_TIME) || '0', 10);
                const lastScore = parseInt(localStorage.getItem(STORAGE_KEY_LAST_SCORE) || '0', 10);

                if (token && pid && (Date.now() - time < this.config.sessionMaxAgeMs)) {
                    this.state.sessionToken = token;
                    this.state.playerId = pid;
                    this.state.lastSubmittedScore = lastScore;
                    this.state.status = 'authenticated';
                    return true;
                }
            } catch (e) {}
            return false;
        },

        /**
         * Save active session data to storage
         */
        _saveSession: function(token, playerId, publicUid) {
            this.state.sessionToken = token;
            this.state.playerId = playerId;
            this.state.publicUid = publicUid;
            this.state.status = 'authenticated';
            this.state.lastError = null;
            this.state.isConfigIssue = false;

            try {
                localStorage.setItem(STORAGE_KEY_TOKEN, token);
                localStorage.setItem(STORAGE_KEY_PLAYER_ID, String(playerId));
                localStorage.setItem(STORAGE_KEY_TOKEN_TIME, String(Date.now()));
            } catch (e) {}
        },

        /**
         * Initialize or restore Guest Session
         * @param {boolean} forceRefresh - If true, ignores cached token and mints fresh session
         */
        initSession: function(forceRefresh = false) {
            if (!forceRefresh && this.state.sessionToken && this.state.status === 'authenticated') {
                return Promise.resolve({
                    success: true,
                    sessionToken: this.state.sessionToken,
                    playerId: this.state.playerId,
                    cached: true
                });
            }

            if (!forceRefresh && this._loadCachedSession()) {
                return Promise.resolve({
                    success: true,
                    sessionToken: this.state.sessionToken,
                    playerId: this.state.playerId,
                    cached: true
                });
            }

            if (this.state.initPromise) {
                return this.state.initPromise;
            }

            const identifier = this.getOrCreatePlayerIdentifier();
            this.state.status = 'authenticating';

            this.state.initPromise = (async () => {
                try {
                    const res = await fetch(`${this.config.baseUrl}/game/v2/session/guest`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'domain-key': this.config.domainKey
                        },
                        body: JSON.stringify({
                            game_key: this.config.gameKey,
                            game_version: this.config.gameVersion,
                            player_identifier: identifier
                        })
                    });

                    const data = await res.json().catch(() => ({}));

                    if (res.ok && data && data.session_token) {
                        this._saveSession(data.session_token, data.player_id, data.public_uid);
                        
                        // Sync existing local pilot name if player customized it
                        const savedName = localStorage.getItem('floaty_player_name');
                        if (savedName && savedName !== 'CYBER_PILOT') {
                            this.setPlayerName(savedName).catch(() => {});
                        }

                        return {
                            success: true,
                            sessionToken: data.session_token,
                            playerId: data.player_id,
                            publicUid: data.public_uid
                        };
                    }

                    // Handle known error scenarios
                    const errorMsg = data.message || data.error || `HTTP ${res.status}`;
                    this.state.status = 'error';
                    this.state.lastError = errorMsg;
                    this.state.isConfigIssue = (errorMsg.indexOf('Platform not enabled') !== -1);

                    console.warn('[LootLocker] Authentication failed:', errorMsg);
                    return {
                        success: false,
                        error: errorMsg,
                        isConfigIssue: this.state.isConfigIssue
                    };

                } catch (networkError) {
                    this.state.status = 'offline';
                    this.state.lastError = networkError.message || 'Network connection failed';
                    return {
                        success: false,
                        error: this.state.lastError,
                        isOffline: true
                    };
                } finally {
                    this.state.initPromise = null;
                }
            })();

            return this.state.initPromise;
        },

        /**
         * Authenticated Fetch Helper with Auto-Retry on Expired Session
         */
        _authenticatedFetch: async function(url, options = {}, retried = false) {
            const session = await this.initSession();
            if (!session.success || !this.state.sessionToken) {
                return { success: false, error: session.error || 'Authentication required', isConfigIssue: session.isConfigIssue };
            }

            options.headers = options.headers || {};
            options.headers['domain-key'] = this.config.domainKey;
            options.headers['x-session-token'] = this.state.sessionToken;

            try {
                const res = await fetch(url, options);

                // Handle session token expiration (401 / 403 token invalid)
                if ((res.status === 401 || res.status === 403) && !retried) {
                    console.warn('[LootLocker] Session expired or rejected, refreshing token...');
                    const refresh = await this.initSession(true);
                    if (refresh.success) {
                        return this._authenticatedFetch(url, options, true);
                    }
                }

                const data = await res.json().catch(() => ({}));
                return {
                    success: res.ok,
                    status: res.status,
                    data: data,
                    error: res.ok ? null : (data.message || data.error || `HTTP ${res.status}`)
                };
            } catch (err) {
                return {
                    success: false,
                    error: err.message || 'Network request failed',
                    isOffline: true
                };
            }
        },

        /**
         * Update Player Callsign / Display Name
         * @param {string} name
         */
        setPlayerName: async function(name) {
            let clean = String(name || '').replace(/[^A-Za-z0-9_ -]/g, '').trim().slice(0, 16);
            if (!clean || clean.length < 2) clean = 'PILOT';

            const res = await this._authenticatedFetch(`${this.config.baseUrl}/game/player/name`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'LL-Version': '2021-03-01'
                },
                body: JSON.stringify({ name: clean })
            });

            if (res.success) {
                try {
                    localStorage.setItem('floaty_player_name', clean);
                } catch (e) {}
                return { success: true, name: clean };
            }
            return { success: false, error: res.error };
        },

        /**
         * Submit High Score to Leaderboard
         * @param {number} score
         * @param {number} chapter
         */
        submitScore: async function(score, chapter = 1) {
            const numScore = parseInt(score, 10);
            if (isNaN(numScore) || numScore <= 0 || numScore > 50000000) {
                return { success: false, error: 'Invalid score value' };
            }

            // Debounce rapid duplicate score submissions (must wait at least 2s)
            const now = Date.now();
            if (now - this.state.lastSubmitTimestamp < 2000 && numScore <= this.state.lastSubmittedScore) {
                return { success: true, skippedDuplicate: true };
            }
            this.state.lastSubmitTimestamp = now;

            const res = await this._authenticatedFetch(`${this.config.baseUrl}/game/leaderboards/${this.config.leaderboardId}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    score: numScore,
                    metadata: JSON.stringify({ chapter: chapter || 1, clientVersion: this.config.gameVersion })
                })
            });

            if (res.success && res.data) {
                this.state.lastSubmittedScore = Math.max(this.state.lastSubmittedScore, numScore);
                try {
                    localStorage.setItem(STORAGE_KEY_LAST_SCORE, String(this.state.lastSubmittedScore));
                } catch (e) {}

                return {
                    success: true,
                    rank: res.data.rank,
                    score: res.data.score,
                    memberId: res.data.member_id
                };
            }

            return {
                success: false,
                error: res.error,
                isConfigIssue: res.isConfigIssue
            };
        },

        /**
         * Retrieve Top Scores from Leaderboard (up to count)
         * @param {number} count - default 100
         */
        getTopScores: async function(count = 100) {
            const safeCount = Math.min(100, Math.max(1, count));
            const res = await this._authenticatedFetch(
                `${this.config.baseUrl}/game/leaderboards/${this.config.leaderboardId}/list?count=${safeCount}`,
                { method: 'GET' }
            );

            if (res.success && res.data) {
                const rawItems = (res.data.items || []).filter(item => {
                    const name = (item.player && item.player.name ? item.player.name : '').toUpperCase();
                    return !name.includes('PILOT_TEST') && !name.startsWith('TEST_');
                });
                const formatted = rawItems.map((item, idx) => {
                    let pilotName = 'PILOT';
                    if (item.player && item.player.name && item.player.name.trim()) {
                        pilotName = item.player.name.trim();
                    } else if (item.member_id) {
                        pilotName = `PILOT_${item.member_id}`;
                    }

                    let chapter = 1;
                    if (item.metadata) {
                        try {
                            const meta = JSON.parse(item.metadata);
                            if (meta && meta.chapter) chapter = parseInt(meta.chapter, 10) || 1;
                        } catch (e) {}
                    }

                    const score = parseInt(item.score, 10) || 0;
                    return {
                        rank: idx + 1,
                        memberId: String(item.member_id),
                        score: score,
                        name: pilotName,
                        chapter: chapter,
                        tag: score > 100000 ? 'ACE' : score > 50000 ? 'ELITE' : score > 20000 ? 'HUNTER' : 'PILOT',
                        playerId: item.player ? String(item.player.id) : null,
                        isMe: Boolean(this.state.playerId && item.player && String(item.player.id) === String(this.state.playerId))
                    };
                });

                return {
                    success: true,
                    total: res.data.pagination ? res.data.pagination.total : formatted.length,
                    items: formatted
                };
            }

            return {
                success: false,
                error: res.error || 'Failed to retrieve rankings',
                isConfigIssue: res.isConfigIssue,
                isOffline: res.isOffline
            };
        },

        /**
         * Retrieve Individual Player's Rank & Score
         */
        getPlayerRank: async function() {
            if (!this.state.playerId) {
                const session = await this.initSession();
                if (!session.success || !this.state.playerId) {
                    return { success: false, error: 'Player identity not established' };
                }
            }

            const res = await this._authenticatedFetch(
                `${this.config.baseUrl}/game/leaderboards/${this.config.leaderboardId}/member/${this.state.playerId}`,
                { method: 'GET' }
            );

            if (res.success && res.data) {
                return {
                    success: true,
                    rank: res.data.rank,
                    score: res.data.score,
                    memberId: res.data.member_id
                };
            }

            return {
                success: false,
                error: res.error,
                notFound: res.status === 404
            };
        }
    };

    // Auto-init session in background without delaying gameplay or blocking initial load
    if (typeof window !== 'undefined') {
        window.LootLocker = LootLocker;

        // Start non-blocking guest session after page load
        if (typeof document !== 'undefined') {
            if (document.readyState === 'complete') {
                setTimeout(() => LootLocker.initSession().catch(() => {}), 200);
            } else {
                window.addEventListener('load', () => {
                    setTimeout(() => LootLocker.initSession().catch(() => {}), 200);
                });
            }
        }
    }

})(typeof window !== 'undefined' ? window : this);
