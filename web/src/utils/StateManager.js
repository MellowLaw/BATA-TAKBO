/**
 * StateManager — Global state & event bus
 * Centralized state management with pub/sub events
 */
class StateManager {
  constructor() {
    this._state = {
      currentScreen: null,
      gestureModel: null,
      gestureModelTrained: false,
      settings: this._loadSettings(),
      user: null,
      isAuthenticated: !this._isGuest(),
      tutorialComplete: this._loadTutorialState(),
      gestureSetupComplete: this._loadGestureSetupState(),
      practiceTutorialComplete: this._loadPracticeTutorialState(),
      bestiary: this._loadBestiary(),
      chapterProgress: this._loadChapterProgress(),
    };
    this._listeners = new Map();
  }

  /**
   * Get a state value by key
   */
  get(key) {
    return this._state[key];
  }

  /**
   * Set a state value and emit change event
   */
  set(key, value) {
    const oldValue = this._state[key];
    this._state[key] = value;
    this.emit(`${key}:changed`, { key, value, oldValue });
    this.emit('state:changed', { key, value, oldValue });
  }

  /**
   * Subscribe to an event
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from an event
   */
  off(event, callback) {
    if (this._listeners.has(event)) {
      this._listeners.get(event).delete(callback);
    }
  }

  /**
   * Emit an event with data
   */
  emit(event, data = null) {
    if (this._listeners.has(event)) {
      this._listeners.get(event).forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in event listener for "${event}":`, err);
        }
      });
    }
  }

  /**
   * Save settings to localStorage
   */
  async saveSettings(sync = true) {
    try {
      localStorage.setItem('bata_takbo_settings', JSON.stringify(this._state.settings));
      if (sync) await this._syncToServer();
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }

  /**
   * Load settings with defaults
   */
  _loadSettings() {
    const defaults = {
      camera: {
        privacyMode: false,
        position: 'bottom-left',
        showSkeleton: true,
        quality: 'medium',
        deviceId: '',
      },
      audio: {
        master: 0.8,
        music: 0.7,
        sfx: 0.9,
        muted: false,
      },
      gesture: {
        sensitivity: 0.60,
        debounce: 60,
        preferredHand: 'any',
      },
      display: {
        screenShake: true,
        particles: true,
        showFps: false,
        panelPosition: 'left',
      },
    };

    try {
      const saved = localStorage.getItem('bata_takbo_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Deep merge with defaults
        return this._deepMerge(defaults, parsed);
      }
    } catch (e) {
      console.warn('Failed to load settings, using defaults:', e);
    }
    return defaults;
  }

  _loadTutorialState() {
    try {
      const saved = localStorage.getItem('bata_takbo_tutorial');
      if (saved) {
        const parsed = JSON.parse(saved);
        const val = typeof parsed === 'boolean' ? parsed
          : (typeof parsed === 'object' && parsed !== null ? parsed.gameplayComplete || false : false);
        return val;
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  _loadGestureSetupState() {
    try {
      const saved = localStorage.getItem('bata_takbo_gesture_setup');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed === true;
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  _loadPracticeTutorialState() {
    try {
      const saved = localStorage.getItem('bata_takbo_practice_tutorial');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed === true;
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  async savePracticeTutorialState(sync = true) {
    try {
      localStorage.setItem('bata_takbo_practice_tutorial', JSON.stringify(this._state.practiceTutorialComplete));
      if (sync) await this._syncToServer();
    } catch (e) { /* ignore */ }
  }

  async saveGestureSetupState(sync = true) {
    try {
      localStorage.setItem('bata_takbo_gesture_setup', JSON.stringify(this._state.gestureSetupComplete));
      if (sync) await this._syncToServer();
    } catch (e) { /* ignore */ }
  }

  _loadBestiary() {
    try {
      const saved = localStorage.getItem('bata_takbo_bestiary');
      if (saved) return JSON.parse(saved);
    } catch (e) { /* ignore */ }
    return {};
  }

  _loadChapterProgress() {
    try {
      const saved = localStorage.getItem('bata_takbo_progress');
      if (saved) return JSON.parse(saved);
    } catch (e) { /* ignore */ }
    return { chaptersUnlocked: [1], chaptersCompleted: [], bestScores: {} };
  }

  async saveTutorialState(sync = true) {
    try {
      localStorage.setItem('bata_takbo_tutorial', JSON.stringify(this._state.tutorialComplete));
      if (sync) await this._syncToServer();
    } catch (e) { /* ignore */ }
  }



  async saveBestiary(sync = true) {
    try {
      localStorage.setItem('bata_takbo_bestiary', JSON.stringify(this._state.bestiary));
      if (sync) await this._syncToServer();
    } catch (e) { /* ignore */ }
  }

  async saveChapterProgress(sync = true) {
    try {
      localStorage.setItem('bata_takbo_progress', JSON.stringify(this._state.chapterProgress));
      if (sync) await this._syncToServer();
    } catch (e) { /* ignore */ }
  }

  async logout() {
    // ── Step 1: Persist state BEFORE invalidating the JWT ─────────────────
    // _syncToServer() uses the JWT cookie. If we call /auth/logout first,
    // the token is blacklisted and the subsequent save will fail with 401.
    let isRegistered = false;
    try {
      const stored = localStorage.getItem('guest_session');
      if (stored) {
        const session = JSON.parse(stored);
        if (session && session.is_guest === false) isRegistered = true;
      }
    } catch (e) {}

    if (isRegistered) {
      // Run final sync in background to prevent UI freeze if backend is sluggish
      this._syncToServer().catch(() => {});
    } else {
      fetch('/auth/guest-scores', { method: 'DELETE' }).catch(() => {});
    }

    // ── Step 2: Invalidate JWT ─────────────────────────────────────────────
    fetch('/auth/logout', {
      method: 'POST',
      credentials: 'include'
    }).catch((e) => console.warn('Logout request failed:', e));

    // ── Step 3: Clear local state ──────────────────────────────────────────
    sessionStorage.removeItem('admin_test_token');
    sessionStorage.removeItem('admin_test_mode');
    localStorage.removeItem('guest_session');
    try {
      localStorage.removeItem('bata_takbo_settings');
      localStorage.removeItem('bata_takbo_tutorial');
      localStorage.removeItem('bata_takbo_bestiary');
      localStorage.removeItem('bata_takbo_progress');
    } catch(e) {}

    try {
      localStorage.removeItem('bata_takbo_gesture_setup');
      localStorage.removeItem('bata_takbo_practice_tutorial');
      localStorage.removeItem('bata_takbo_preset_avatar');
    } catch(e) {}

    // Wipe IDB gesture model in background so we transition instantly
    if (window.__gestureController) {
      window.__gestureController.resetAllGestures().catch(() => {});
    }

    // Reset in-memory state so it doesn't bleed to the next user
    this._state.settings = this._loadSettings();
    this._state.tutorialComplete = false;
    this._state.gestureSetupComplete = false;
    this._state.practiceTutorialComplete = false;
    this._state.bestiary = {};
    this._state.chapterProgress = { chaptersUnlocked: [1], chaptersCompleted: [], bestScores: {} };



    this.set('isAuthenticated', false);
    try { localStorage.removeItem('guest_session'); } catch(e) {}
    this.set('user', null);

    if (window.__screenManager) {
      window.__screenManager.history = [];
      window.__screenManager.navigate('login-screen', {}, false);
    }
  }

  _deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this._deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  _isGuest() {
    try {
      const stored = localStorage.getItem('guest_session');
      if (stored) {
        const session = JSON.parse(stored);
        if (session && session.is_guest === false) return false;
      }
    } catch(e) {}
    return true;
  }

  async _syncToServer(syncGesture = false) {
    if (this._isGuest()) {
      return;
    }

    this.set('isAuthenticated', true);

    let gestureModel = null;
    if (syncGesture && window.__gestureController && window.__gestureController.classifier) {
      const exported = window.__gestureController.classifier.exportData();
      // Only include if it has actual data — never overwrite server with null/empty
      if (exported && Object.keys(exported).length > 0) {
        gestureModel = exported;
      }
    }

    const payload = {
      settings: this._state.settings,
      tutorialComplete: this._state.tutorialComplete,
      gestureSetupComplete: this._state.gestureSetupComplete,
      practiceTutorialComplete: this._state.practiceTutorialComplete,
      chapterProgress: this._state.chapterProgress,
      bestiary: this._state.bestiary,
    };

    // Only attach gestureModel if we actually have one to avoid wiping server data
    if (gestureModel) payload.gestureModel = gestureModel;

    try {
      const res = await fetch('/auth/save-data', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn(`[SAVE] FAILED status=${res.status}`, err);
        return;
      }
      // Server echoes back the stored gameData so we can verify.
    } catch (e) {
      console.warn('[SAVE] network error —', e.message);
    }
  }

  /**
   * Reset all per-account state to defaults. Called before hydrating from
   * the server so we never leak values across accounts.
   */
  _resetAccountState() {
    this._state.tutorialComplete = false;
    this._state.gestureSetupComplete = false;
    this._state.practiceTutorialComplete = false;
    this._state.chapterProgress = { chaptersUnlocked: [1], chaptersCompleted: [], bestScores: {} };
    this._state.bestiary = {};
    // settings deliberately not reset — user UI prefs persist across accounts on same device.
    // Also wipe localStorage so stale values never leak to a different account on the same device.
    try {
      localStorage.removeItem('bata_takbo_tutorial');
      localStorage.removeItem('bata_takbo_gesture_setup');
      localStorage.removeItem('bata_takbo_practice_tutorial');
      localStorage.removeItem('bata_takbo_progress');
      localStorage.removeItem('bata_takbo_bestiary');
    } catch(e) {}
  }

  /**
   * Authoritative load: hits GET /auth/me and applies whatever the server
   * has stored for this account. Called by LoginScreen after a successful
   * login to override anything that may have leaked from a previous session.
   */
  async hydrateFromServer(isLoginTransition = false) {
    if (this._isGuest()) {
      return;
    }

    this.set('isAuthenticated', true);

    // Wipe any leftover state so a stale value can never satisfy `state.get(...)`.
    this._resetAccountState();

    try {
      const res = await fetch('/auth/me', { method: 'GET', credentials: 'include' });
      if (!res.ok) {
        console.warn(`[LOAD] /auth/me FAILED status=${res.status}`);
        return false;
      }
      const { gameData } = await res.json();

      if (!gameData) {
        // Brand-new account — clear any leftover guest gesture model from IDB only on login transition
        if (isLoginTransition && window.__gestureController) {
          try { await window.__gestureController.resetAllGestures(); } catch(e) {}
        }
        return true;
      }

      // Strict boolean coercion
      const tutorialComplete = gameData.tutorialComplete === true || gameData.tutorialComplete === 'true';
      const practiceTutorialComplete = gameData.practiceTutorialComplete === true || gameData.practiceTutorialComplete === 'true';
      const hasGestureModel = !!gameData.gestureModel;
      const gestureSetupComplete =
        gameData.gestureSetupComplete === true ||
        gameData.gestureSetupComplete === 'true' ||
        hasGestureModel; // legacy: if a model exists, gestures are set up

      this.set('tutorialComplete', tutorialComplete);
      this.set('practiceTutorialComplete', practiceTutorialComplete);
      this.set('gestureSetupComplete', gestureSetupComplete);

      if (gameData.chapterProgress) this.set('chapterProgress', gameData.chapterProgress);
      if (gameData.bestiary) this.set('bestiary', gameData.bestiary);
      if (gameData.settings) {
        this.set('settings', this._deepMerge(this._state.settings, gameData.settings));
      }

      if (gameData.gestureModel && window.__gestureController) {
        try {
          window.__gestureController.classifier.importData(gameData.gestureModel);
          await window.__gestureController.saveModel();
        } catch (e) {
          console.error('[LOAD] failed to import gesture model:', e);
        }
      } else if (!gameData.gestureModel && window.__gestureController) {
        // Account exists but has no saved gesture model — wipe IDB only if this is a fresh login transition
        // so stale gestures from another account or guest session don't bleed through.
        if (isLoginTransition) {
          try { await window.__gestureController.resetAllGestures(); } catch(e) {}
        }
      }

      // Mirror to localStorage WITHOUT triggering another server round-trip.
      try {
        localStorage.setItem('bata_takbo_tutorial', JSON.stringify(this._state.tutorialComplete));
        localStorage.setItem('bata_takbo_practice_tutorial', JSON.stringify(this._state.practiceTutorialComplete));
        localStorage.setItem('bata_takbo_gesture_setup', JSON.stringify(this._state.gestureSetupComplete));
        localStorage.setItem('bata_takbo_progress', JSON.stringify(this._state.chapterProgress));
        localStorage.setItem('bata_takbo_bestiary', JSON.stringify(this._state.bestiary));
        localStorage.setItem('bata_takbo_settings', JSON.stringify(this._state.settings));
      } catch (e) { /* ignore */ }

      return true;
    } catch (e) {
      console.warn('[LOAD] network error —', e.message);
      return false;
    }
  }
}

// Singleton
export const state = new StateManager();
