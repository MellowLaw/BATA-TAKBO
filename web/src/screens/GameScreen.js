/**
 * GameScreen — The bridge between the web UI and the Phaser Engine
 */
import * as Phaser from 'phaser';
import { state } from '../utils/StateManager.js';
import { audioManager } from '../game/AudioManager.js';
import { GameScene } from '../game/GameScene.js';
import { HUDScene } from '../game/HUDScene.js';
import { ChapterLoadingScreen } from './ChapterLoadingScreen.js';
import { gestureController } from '../gesture/GestureController.js';

export const GameScreen = {
  render() {
    return `
      <div class="game-screen screen">
        ${ChapterLoadingScreen.render()}
        <!-- Phaser engine mounts here -->
        <div id="phaser-container" style="width: 100%; height: 100%;"></div>
        
        <!-- Live Camera feed overlay (positioned by HUDScene over the bottom-left box) -->
        <div class="game-screen__camera-pip" id="game-camera-pip" style="
          position: absolute; 
          bottom: 40px; 
          left: 40px;
          width: 200px;
          height: 200px;
          border: none;
          overflow: hidden;
          background: #000;
          z-index: 50;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.5s ease;
        ">
          <video id="game-video" style="width: 100%; height: 100%; object-fit: contain;"></video>
          <canvas id="game-canvas" width="640" height="480" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain;"></canvas>
        </div>

        <!-- Timer Display (positioned by HUDScene) -->
        <div id="game-timer-dom" style="
          position: absolute; 
          top: 8px; 
          left: 60px;
          z-index: 50;
          padding: 4px 8px;
          font-family: 'VCR', monospace;
          font-size: 16px;
          color: #f0e6d3;
          pointer-events: none;
        ">00:00</div>

        <!-- DOM Pause button — sits above Phaser canvas, works reliably on mobile -->
        <button id="btn-pause-dom" style="
          position: absolute;
          top: 10px;
          left: 10px;
          z-index: 60;
          background: transparent;
          border: none;
          color: #f0e6d3;
          font-family: 'DungeonFont', sans-serif;
          font-size: 22px;
          padding: 12px 16px;
          cursor: pointer;
          min-width: 48px;
          min-height: 48px;
          line-height: 1;
          touch-action: manipulation;
        ">&#9612;&#9612;</button>

        <!-- ⚠️ DEBUG ONLY — Admin-only force-end buttons -->
        <div id="debug-toolbar" style="
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 9999;
          display: none;
          gap: 8px;
        ">
          <button id="btn-debug-lose" style="
            font-family: monospace;
            font-size: 11px;
            padding: 4px 10px;
            background: rgba(180,0,0,0.85);
            color: white;
            border: 1px solid red;
            cursor: pointer;
            border-radius: 4px;
          ">💀 FORCE LOSE</button>
          <button id="btn-debug-win" style="
            font-family: monospace;
            font-size: 11px;
            padding: 4px 10px;
            background: rgba(0,140,0,0.85);
            color: white;
            border: 1px solid lime;
            cursor: pointer;
            border-radius: 4px;
          ">🏆 FORCE WIN</button>
        </div>

        <div id="pause-menu" class="hidden" style="
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image: url('/assets/ui/backgrounds/paused_background.png');
          background-size: cover;
          background-position: center;
          z-index: 100;
          display: flex;
          align-items: center;
          padding-left: 12%;
        ">
          <div class="pause-content" style="display: flex; flex-direction: column; align-items: flex-start; width: clamp(200px, 40vw, 450px); z-index: 2;">
            <h2 class="pause-title" style="font-family: 'DirtyHarold', sans-serif; font-size: clamp(3rem, 8vw, 8rem); color: white; margin-bottom: clamp(0.8rem, 2vh, 2rem); margin-left: 10px; text-shadow: 4px 4px 0px #000, 0 0 20px rgba(255,255,255,0.2); letter-spacing: 2px; line-height: 1;">PAUSED</h2>
            
            <div class="pause-btn-group" style="display: flex; flex-direction: column; align-items: flex-start; gap: 0.2rem; margin-bottom: clamp(0.8rem, 2vh, 2rem);">
              <button class="menu-btn" id="btn-resume" style="padding: 0.2rem 0 !important; padding-left: 0 !important; margin: 0 !important; text-align: left !important; font-size: clamp(1rem, 2.5vw, 1.5rem); color: white; text-shadow: 1px 1px 2px #000; letter-spacing: 1px; min-width: 0;">RESUME</button>
              <button class="menu-btn" id="btn-restart" style="padding: 0.2rem 0 !important; padding-left: 0 !important; margin: 0 !important; text-align: left !important; font-size: clamp(1rem, 2.5vw, 1.5rem); color: white; text-shadow: 1px 1px 2px #000; letter-spacing: 1px; min-width: 0;">RESTART</button>
              <button class="menu-btn" id="btn-quit" style="padding: 0.2rem 0 !important; padding-left: 0 !important; margin: 0 !important; text-align: left !important; font-size: clamp(1rem, 2.5vw, 1.5rem); color: white; text-shadow: 1px 1px 2px #000; letter-spacing: 1px; min-width: 0;">QUIT TO MENU</button>
            </div>

            <!-- Audio Toggles -->
            <div style="display: flex; gap: clamp(12px,3vw,28px); margin-bottom: clamp(0.6rem,1.5vh,1.2rem);">
              <button id="btn-pause-music" class="menu-btn" style="
                padding: 0.15rem 0.7rem !important; margin: 0 !important;
                font-family: var(--font-display); font-size: clamp(0.65rem,1.4vw,0.9rem);
                letter-spacing: 1px; border: 1.5px solid rgba(255,255,255,0.45);
                border-radius: 3px; color: white; background: transparent;
                min-width: 0; min-height: 0; line-height: 1.6;
                transition: color 0.2s, border-color 0.2s;
              ">♪ MUSIC: ON</button>
              <button id="btn-pause-sfx" class="menu-btn" style="
                padding: 0.15rem 0.7rem !important; margin: 0 !important;
                font-family: var(--font-display); font-size: clamp(0.65rem,1.4vw,0.9rem);
                letter-spacing: 1px; border: 1.5px solid rgba(255,255,255,0.45);
                border-radius: 3px; color: white; background: transparent;
                min-width: 0; min-height: 0; line-height: 1.6;
                transition: color 0.2s, border-color 0.2s;
              ">♪ SFX: ON</button>
            </div>

            <!-- Settings Panel -->
            <div class="pause-settings" style="width: 100%; max-width: 380px; display: flex; flex-direction: column; gap: var(--space-md); padding-left: 0;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                 <span style="color: white; font-family: var(--font-display); font-size: var(--text-sm); letter-spacing: 1px;">Gesture Sensitivity</span>
                 <span id="pause-val-sensitivity" style="color: white; font-family: var(--font-display); font-size: var(--text-sm); font-weight: bold;">${Math.round(state.get('settings').gesture.sensitivity * 100)}%</span>
              </div>
              <input type="range" class="slider" id="pause-slider-sensitivity" min="40" max="95" value="${Math.round(state.get('settings').gesture.sensitivity * 100)}" style="width: 100%;">
              
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: var(--space-xs);">
                 <span style="color: white; font-family: var(--font-display); font-size: var(--text-sm); letter-spacing: 1px;">Gesture Debounce</span>
                 <span id="pause-val-debounce" style="color: white; font-family: var(--font-display); font-size: var(--text-sm); font-weight: bold;">${state.get('settings').gesture.debounce}ms</span>
              </div>
              <input type="range" class="slider" id="pause-slider-debounce" min="50" max="300" step="10" value="${state.get('settings').gesture.debounce}" style="width: 100%;">
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async onEnter(el, params) {
    this.container = el.querySelector('#phaser-container');
    this.videoEl = el.querySelector('#game-video');
    this.canvasEl = el.querySelector('#game-canvas');
    this.pauseMenu = el.querySelector('#pause-menu');
    this.isPaused = false;
    
    // Set random loading tip for the overlay
    const tipEl = el.querySelector('#loading-tip-chapter');
    if (tipEl) {
      tipEl.textContent = ChapterLoadingScreen.tips[Math.floor(Math.random() * ChapterLoadingScreen.tips.length)];
    }

    // Hide overlay when Phaser is completely ready and assets are loaded
    this.unsubGameReady = state.on('game:scene_created', () => {
      const overlay = el.querySelector('#game-loading-overlay');
      if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 500);
      }
    });
    
    const chapterId = params.chapterId || 1;
    this.chapterId = chapterId;
    const isTutorial = params.isTutorial || false;
    const isPracticeTutorial = params.isPracticeTutorial || false;
    const isEndless = params.isEndless || false;
    const character = params.character || state.get('selectedCharacter') || 'male';
    const control = params.control || state.get('selectedControl') || 'keyboard';
    state.set('selectedCharacter', character);
    state.set('selectedControl', control);

    // Anti-cheat Game Session Initialization
    let sessionId = null;
    if (isEndless && state.get('isAuthenticated')) {
      try {
        const response = await fetch('/leaderboard/start-endless', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chapterId })
        });
        if (response.ok) {
          const data = await response.json();
          sessionId = data.sessionId;
          console.log('[Anti-Cheat] Game session established:', sessionId);
        }
      } catch (err) {
        console.warn('[Anti-Cheat] Failed to establish game session:', err);
      }
    }

    // 1. Boot up ML Gestures only if gesture control was selected
    const pip = el.querySelector('#game-camera-pip');
    if (control === 'gesture') {
      try {
        await gestureController.initialize(this.videoEl, this.canvasEl);
        await gestureController.startCamera();
      } catch (e) {
        console.warn('Camera failed to start in game', e);
      }

      // Camera permission popup exits fullscreen — restore on next touch
      if (window.__scheduleRestoreFullscreen) window.__scheduleRestoreFullscreen();

      // 2. Adjust PiP view depending on settings
      const currentSettings = state.get('settings');
      if (currentSettings && currentSettings.camera && !currentSettings.camera.showSkeleton && currentSettings.camera.privacyMode) {
        pip.style.display = 'none';
      }
    } else {
      // Keyboard/D-pad: hide camera PiP entirely
      if (pip) pip.style.display = 'none';
    }

    // 3. Initialize Game Engine
    // FIX: Don't auto-start scenes. Add them manually to prevent double-creation.
    const config = {
      type: Phaser.AUTO,
      parent: 'phaser-container',
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: '100%',
        height: '100%'
      },
      pixelArt: true,
      transparent: true,
      physics: {
        default: 'arcade',
        arcade: { debug: false }
      },
      scene: [] // Empty — we add scenes manually below
    };

    this.game = new Phaser.Game(config);

    // Refresh Phaser scale on viewport changes (fullscreen toggle, window resize, orientation)
    this._onWindowResize = () => {
      if (!this.game || !this.game.scale) return;
      // Immediate refresh for resize events
      this.game.scale.refresh();
    };

    this._onFullscreenChange = () => {
      if (!this.game || !this.game.scale) return;
      // Delay refresh on fullscreen change — browser needs time to update viewport
      // dimensions before Phaser reads them, otherwise black bars appear
      const doRefresh = () => {
        if (!this.game || !this.game.scale) return;
        // Force container to fill new viewport
        if (this.container) {
          this.container.style.width  = '100%';
          this.container.style.height = '100%';
        }
        this.game.scale.refresh();
      };
      setTimeout(doRefresh, 50);
      setTimeout(doRefresh, 200); // second pass for slow browsers
    };

    window.addEventListener('resize', this._onWindowResize);
    window.addEventListener('orientationchange', this._onFullscreenChange);
    document.addEventListener('fullscreenchange', this._onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this._onFullscreenChange);

    // Add scenes manually ONCE with the correct data, preventing double-start
    this.game.events.on('ready', () => {
      this.game.scene.add('GameScene', GameScene, true, { chapterId, isTutorial, isPracticeTutorial, isEndless, character, control, sessionId });
      this.game.scene.add('HUDScene', HUDScene, false);
      // GameScene.create() will call scene.launch('HUDScene') when ready
    });
    
    state.set('currentScreen', 'game');

    // 4. Bind UI Controls
    const domPauseBtn = el.querySelector('#btn-pause-dom');
    if (domPauseBtn) {
      domPauseBtn.addEventListener('click', () => state.emit('game:pause'));
    }

    this.unsubGamePause = state.on('game:pause', () => {
      if (domPauseBtn) domPauseBtn.style.display = 'none';
      this.togglePause(true);
    });
    el.querySelector('#btn-resume').addEventListener('click', () => {
      if (domPauseBtn) domPauseBtn.style.display = '';
      this.togglePause(false);
    });

    // ⚠️ DEBUG — Force lose/win (admin only)
    const debugToolbar = el.querySelector('#debug-toolbar');
    if (debugToolbar && state.get('isAuthenticated')) {
      fetch('/admin/check', { credentials: 'include' })
        .then(r => r.ok ? r.json() : { isAdmin: false })
        .then(data => {
          if (data && data.isAdmin) {
            debugToolbar.style.display = 'flex';
          }
        })
        .catch(() => { /* not admin / offline — keep hidden */ });
    }

    // Debug buttons (only in full GameScreen layout)
    const btnDebugLose = el.querySelector('#btn-debug-lose');
    const btnDebugWin = el.querySelector('#btn-debug-win');
    if (btnDebugLose) {
      btnDebugLose.addEventListener('click', () => {
        const gs = this.game && this.game.scene.getScene('GameScene');
        if (gs && !gs.isGameOver) gs.showGameOver(false);
      });
    }
    if (btnDebugWin) {
      btnDebugWin.addEventListener('click', () => {
        const gs = this.game && this.game.scene.getScene('GameScene');
        if (gs && !gs.isGameOver) gs.showGameOver(true);
      });
    }
    
    // Wire up Pause Audio Toggles
    const btnPauseMusic = el.querySelector('#btn-pause-music');
    const btnPauseSfx   = el.querySelector('#btn-pause-sfx');

    const _savedMusicVol = { v: state.get('settings').audio.music };

    const _updateMusicBtn = () => {
      const off = state.get('settings').audio.music === 0;
      if (!btnPauseMusic) return;
      btnPauseMusic.textContent = off ? '♪ MUSIC: OFF' : '♪ MUSIC: ON';
      btnPauseMusic.style.color = off ? 'rgba(255,255,255,0.35)' : 'white';
      btnPauseMusic.style.borderColor = off ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.45)';
    };
    const _updateSfxBtn = () => {
      const off = state.get('settings').audio.muted;
      if (!btnPauseSfx) return;
      btnPauseSfx.textContent = off ? '♪ SFX: OFF' : '♪ SFX: ON';
      btnPauseSfx.style.color = off ? 'rgba(255,255,255,0.35)' : 'white';
      btnPauseSfx.style.borderColor = off ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.45)';
    };

    _updateMusicBtn();
    _updateSfxBtn();

    if (btnPauseMusic) {
      btnPauseMusic.addEventListener('click', () => {
        const s = state.get('settings');
        if (s.audio.music > 0) {
          _savedMusicVol.v = s.audio.music;
          s.audio.music = 0;
        } else {
          s.audio.music = _savedMusicVol.v > 0 ? _savedMusicVol.v : 0.7;
        }
        state.set('settings', s);
        state.saveSettings();
        _updateMusicBtn();
      });
    }

    if (btnPauseSfx) {
      btnPauseSfx.addEventListener('click', () => {
        const s = state.get('settings');
        s.audio.muted = !s.audio.muted;
        state.set('settings', s);
        state.saveSettings();
        audioManager.setMuted(s.audio.muted);
        _updateSfxBtn();
      });
    }

    // Wire up Pause Menu Live Setting Sliders (only in full layout)
    const sensSlider = el.querySelector('#pause-slider-sensitivity');
    const sensVal = el.querySelector('#pause-val-sensitivity');
    if (sensSlider && sensVal) {
      sensSlider.addEventListener('input', (e) => {
          const raw = parseInt(e.target.value);
          sensVal.textContent = `${raw}%`;
          const s = state.get('settings');
          s.gesture.sensitivity = raw / 100;
          state.set('settings', s);
          state.saveSettings();
      });
    }

    const debSlider = el.querySelector('#pause-slider-debounce');
    const debVal = el.querySelector('#pause-val-debounce');
    if (debSlider && debVal) {
      debSlider.addEventListener('input', (e) => {
          const raw = parseInt(e.target.value);
          debVal.textContent = `${raw}ms`;
          const s = state.get('settings');
          s.gesture.debounce = raw;
          state.set('settings', s);
          state.saveSettings();
      });
    }
    
    // Restart/Quit buttons (with null checks for PracticeTutorial)
    const btnRestart = el.querySelector('#btn-restart');
    const btnQuit = el.querySelector('#btn-quit');
    if (btnRestart) {
      btnRestart.addEventListener('click', () => {
        window.__screenManager.navigate('game-screen', { chapterId, character, control, isEndless }, false);
      });
    }
    if (btnQuit) {
      btnQuit.addEventListener('click', () => {
        window.__screenManager.navigate('main-menu', {}, false);
      });
    }
  },

  onLeave() {
    if (this.unsubGameReady) {
      this.unsubGameReady();
      this.unsubGameReady = null;
    }
    if (this.unsubGamePause) {
      this.unsubGamePause();
      this.unsubGamePause = null;
    }
    if (this.game) {
      this.game.destroy(true);
      this.game = null;
    }
    if (this._onWindowResize) {
      window.removeEventListener('resize', this._onWindowResize);
      this._onWindowResize = null;
    }
    if (this._onFullscreenChange) {
      window.removeEventListener('orientationchange', this._onFullscreenChange);
      document.removeEventListener('fullscreenchange', this._onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', this._onFullscreenChange);
      this._onFullscreenChange = null;
    }
    if (state.get('selectedControl') === 'gesture') gestureController.stopCamera();
    state.set('currentScreen', null);
  },

  togglePause(shouldPause) {
    this.isPaused = shouldPause;
    const isCh1to3 = this.chapterId >= 1 && this.chapterId <= 3;
    
    if (shouldPause) {
      this.pauseMenu.classList.remove('hidden');
      // Trigger entrance animation
      this.pauseMenu.classList.remove('animating-in');
      void this.pauseMenu.offsetWidth; // force reflow to restart animation
      this.pauseMenu.classList.add('animating-in');
      if (this.game) {
        this.game.scene.pause('GameScene');
        this.game.scene.pause('HUDScene');
      }
      if (isCh1to3) audioManager.pauseMusicWithFade(500);
    } else {
      this.pauseMenu.classList.add('hidden');
      this.pauseMenu.classList.remove('animating-in');
      if (this.game) {
        this.game.scene.resume('GameScene');
        this.game.scene.resume('HUDScene');
      }
      if (isCh1to3) audioManager.resumeMusicWithFade(500);
    }
  }
};
