/**
 * GestureTraining — Hand gesture training screen
 * Connects to GestureController for real-time Mediapipe/KNN training
 */
import { gestureController } from '../gesture/GestureController.js';
import { state } from '../utils/StateManager.js';
import { TutorialManager } from '../utils/TutorialManager.js';

export const GestureTraining = {
  render() {
    return `
      <div class="gesture-screen screen">
        <button class="back-btn" id="btn-gesture-back">Back</button>

        <h1 class="screen-title gesture-screen__title" style="animation: fadeInUp 0.4s ease forwards;">
          Gesture Setup
        </h1>

        <button id="btn-gesture-help" title="How to set up gestures" style="
          position: absolute; top: 16px; right: 16px;
          background: transparent; border: 2px solid rgba(255,255,255,0.4);
          color: #f0e6d3; font-family: 'VCR', monospace; font-size: 18px;
          width: 38px; height: 38px; border-radius: 50%; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          z-index: 10; transition: border-color 0.2s, color 0.2s;
        ">?</button>

        <!-- 50/50 split wrapper: camera left, controls right on mobile landscape -->
        <div class="gesture-screen__layout">

          <!-- LEFT: Camera -->
          <div class="gesture-screen__left" style="flex-direction: column; width: 100%;">
            <div class="camera-wrapper" style="width: 100%; max-width: 640px; margin: 0 auto; display: flex; flex-direction: column; align-items: center;">
              
              <div class="gesture-screen__camera" id="gesture-camera" style="width: 100%;">
                <video id="webcam-video" style="display: none;"></video>
                <canvas id="webcam-canvas"></canvas>
                <div id="camera-loading" class="placeholder-content" style="position: absolute; top:0; left:0; height: 100%; width: 100%; pointer-events:none; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                  <div class="loading-spinner"></div>
                  <span class="placeholder-text" style="font-size: var(--text-xs); margin-top: 8px;">Initializing Camera...</span>
                </div>
              </div>
              
              <div class="gesture-screen__hint text-center" style="width: 100%; margin-top: var(--space-sm); animation: fadeInUp 0.4s ease 0.1s forwards;">
                <p style="font-size: clamp(0.75rem, 2vw, 0.95rem); color: white; margin-bottom: 6px; line-height: 1.3;">
                  Train the game to recognize YOUR gestures!<br>
                  Select a direction, make a pose, and hold Record.
                </p>
                <div style="color: var(--accent-gold); font-size: clamp(0.6rem, 1.5vw, 0.8rem); margin-bottom: 6px; display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 10px; line-height: 1.3;">
                  <span>Min: 200</span> <span style="opacity: 0.5;">|</span>
                  <span>Good: 500</span> <span style="opacity: 0.5;">|</span>
                  <span>Best: 1000+</span>
                </div>
                <p style="color: #999; font-size: clamp(0.55rem, 1.2vw, 0.7rem); line-height: 1.3; max-width: 95%; margin: 0 auto;">
                  Tip: Train both hands, use good lighting, and slightly move your hand while recording for best accuracy.
                </p>
              </div>

            </div>
          </div>

          <!-- RIGHT: Controls -->
          <div class="gesture-screen__right">
            <div class="controls-wrapper" style="width: 100%; max-width: 450px; display: flex; flex-direction: column; align-items: flex-start; margin: 0 auto;">

              <div class="gesture-directions" style="width: 100%; justify-content: space-between; gap: var(--space-xs); animation: fadeInUp 0.4s ease 0.15s forwards;">
                <button class="gesture-dir-btn active" data-dir="up" id="dir-up" style="flex: 1;">
                  <span class="gesture-dir-btn__arrow">▲</span>
                  <span class="gesture-dir-btn__label">UP</span>
                  <span class="gesture-dir-btn__count">0</span>
                </button>
                <button class="gesture-dir-btn" data-dir="down" id="dir-down" style="flex: 1;">
                  <span class="gesture-dir-btn__arrow">▼</span>
                  <span class="gesture-dir-btn__label">DOWN</span>
                  <span class="gesture-dir-btn__count">0</span>
                </button>
                <button class="gesture-dir-btn" data-dir="left" id="dir-left" style="flex: 1;">
                  <span class="gesture-dir-btn__arrow">◄</span>
                  <span class="gesture-dir-btn__label">LEFT</span>
                  <span class="gesture-dir-btn__count">0</span>
                </button>
                <button class="gesture-dir-btn" data-dir="right" id="dir-right" style="flex: 1;">
                  <span class="gesture-dir-btn__arrow">►</span>
                  <span class="gesture-dir-btn__label">RIGHT</span>
                  <span class="gesture-dir-btn__count">0</span>
                </button>
                <button class="gesture-dir-btn" data-dir="idle" id="dir-idle" style="flex: 1;">
                  <span class="gesture-dir-btn__arrow"><img src="/assets/ui/hand.png" alt="Rest" class="gesture-dir-btn__icon" /></span>
                  <span class="gesture-dir-btn__label">REST</span>
                  <span class="gesture-dir-btn__count">0</span>
                </button>
              </div>

              <div class="progress-bar" style="width: 100%; animation: fadeInUp 0.4s ease 0.2s forwards;">
                <div class="progress-bar__fill" style="width: 0%;" id="gesture-progress"></div>
              </div>
              <p class="text-primary" style="font-size: var(--text-xs); margin-bottom: var(--space-md); width: 100%; text-align: center;">
                <span id="progress-label">0 / 20</span> &mdash; Minimum samples
              </p>

              <button class="gesture-record-btn" id="btn-record" style="width: 100%; animation: fadeInUp 0.4s ease 0.25s forwards;">
                HOLD TO RECORD
              </button>

              <div class="gesture-screen__actions" style="width: 100%; justify-content: space-between; animation: fadeInUp 0.4s ease 0.3s forwards;">
                <button class="menu-btn" id="btn-test-gestures" style="font-size: var(--text-xs); padding: 0;">
                  TEST MY GESTURES
                </button>
                <button class="menu-btn" id="btn-export-gestures" style="font-size: var(--text-xs); padding: 0;">
                  EXPORT
                </button>
                <button class="menu-btn" id="btn-import-gestures" style="font-size: var(--text-xs); padding: 0;">
                  IMPORT
                </button>
                <input type="file" id="import-file-input" accept=".json" style="display: none;" />
                <button class="menu-btn text-red" id="btn-reset-gestures" style="font-size: var(--text-xs); padding: 0;">
                  RESET
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>
    `;
  },

  async onEnter(el, params = {}) {
    this.videoEl = el.querySelector('#webcam-video');
    this.canvasEl = el.querySelector('#webcam-canvas');
    this.loadingUi = el.querySelector('#camera-loading');
    this.activeDir = 'up'; // default
    // If true: user was sent here from Play (old flow, now unused but kept for safety)
    this.fromPlay = params.fromPlay || false;
    // If true: came from CharacterSelect — go back there after setup
    this.fromCharSelect = params.fromCharSelect || false;
    this.returnChapterId = params.chapterId || 1;
    this.returnGender = params.gender || null;
    this.returnIsEndless = params.isEndless || false;

    // Force canvas size to match video aspect locally
    this.canvasEl.width = 640;
    this.canvasEl.height = 480;

    // Back button — use touchend on mobile so async handler isn't swallowed
    const backBtn = el.querySelector('#btn-gesture-back');
    const handleBack = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      backBtn.removeEventListener('touchend', handleBack);
      backBtn.removeEventListener('click', handleBack);
      try { await gestureController.saveModel({ syncToServer: true }); } catch (e) { console.warn('[GestureTraining] saveModel on back failed:', e); }
      try { gestureController.stopCamera(); } catch (e) { console.warn('[GestureTraining] stopCamera on back failed:', e); }
      if (window.__screenManager.canGoBack()) {
        window.__screenManager.back();
      } else {
        window.__screenManager.navigate('main-menu');
      }
    };
    backBtn.addEventListener('touchend', handleBack, { passive: false });
    backBtn.addEventListener('click', handleBack);

    // Initialize controller and start camera
    try {
      await gestureController.initialize(this.videoEl, this.canvasEl);
      await gestureController.startCamera();
      // Camera permission popup exits fullscreen — restore on next touch
      if (window.__scheduleRestoreFullscreen) window.__scheduleRestoreFullscreen();
      // Hide loading spinner
      this.loadingUi.style.display = 'none';
      this._updateUIFromCounts();

      // Only start tutorial if camera is actually running and no gestures trained yet
      const counts = gestureController.getSampleCounts();
      const hasTrainedGestures = Object.values(counts).some(c => c >= 10);
      if (!hasTrainedGestures && !gestureController.isTesting) {
        this._startTutorial(el);
      }

    } catch (e) {
      console.error('[GestureTraining] Camera failed:', e);
      this.loadingUi.style.display = 'flex';
      this.loadingUi.innerHTML = `
        <div style="text-align:center; padding: 1rem;">
          <p style="color:#ef4444; font-family:'GigaSaturn',sans-serif; font-size:clamp(0.7rem,2vw,0.9rem); margin-bottom:0.75rem;">
            ⚠ Camera access was denied or unavailable.
          </p>
          <p style="color:#a89b8c; font-family:'GigaSaturn',sans-serif; font-size:clamp(0.6rem,1.5vw,0.75rem); line-height:1.6;">
            To use gesture controls, allow camera access in your browser settings, then refresh this page.
          </p>
        </div>
      `;
      // Do NOT start tutorial — user can't train without camera
    }

    // Direction buttons
    const dirBtns = el.querySelectorAll('.gesture-dir-btn');
    dirBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // Drop test mode if clicking directions
        if (gestureController.isTesting) {
          this._toggleTestMode(el, false);
        }

        dirBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeDir = btn.dataset.dir;
        this._updateProgressUI(el);
      });

      // Right-click to reset a single direction
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this._showResetModal(el, btn.dataset.dir);
      });

      // Long-press for mobile (600ms)
      let longPressTimer = null;
      btn.addEventListener('touchstart', (e) => {
        longPressTimer = setTimeout(() => {
          longPressTimer = null;
          this._showResetModal(el, btn.dataset.dir);
        }, 600);
      }, { passive: true });
      btn.addEventListener('touchend', () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } });
      btn.addEventListener('touchmove', () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } });
    });

    // Record button bindings
    const recordBtn = el.querySelector('#btn-record');
    
    const startRec = (e) => {
      if(e) e.preventDefault();
      // Cannot record while testing
      if (gestureController.isTesting) return;

      recordBtn.classList.add('recording');
      recordBtn.textContent = 'Recording...';
      gestureController.startRecording(this.activeDir);
    };

    const stopRec = (e) => {
      if(e) e.preventDefault();
      recordBtn.classList.remove('recording');
      recordBtn.textContent = 'Hold to Record';
      gestureController.stopRecording();
      // Auto-save briefly on stop
      gestureController.saveModel();
    };

    recordBtn.addEventListener('mousedown', startRec);
    window.addEventListener('mouseup', stopRec); // Catch release outside
    recordBtn.addEventListener('touchstart', startRec);
    window.addEventListener('touchend', stopRec);

    // Event listener for incoming sample counts
    this.unsubSampleAdded = state.on('gesture:sampleAdded', (data) => {
      this._updateUIFromCounts(data.counts);
      if (this.tutorialManager) {
        this.tutorialManager.update('sampleAdded', data.counts);
      }
    });

    // Event listener for gesture testing
    this.unsubGestureDetected = state.on('gesture:detected', (detectedDir) => {
      if (!gestureController.isTesting) return;

      // Reset styles
      dirBtns.forEach(b => b.classList.remove('active', 'trained'));

      const targetBtn = el.querySelector(`#dir-${detectedDir}`);
      if (targetBtn) {
        targetBtn.classList.add('active', 'trained');
        targetBtn.style.animation = 'glowPulse 0.5s ease';
        setTimeout(() => { targetBtn.style.animation = ''; }, 500);
      }
    });

    // ? Help button — replay tutorial at any time
    const helpBtn = el.querySelector('#btn-gesture-help');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => {
        if (this.tutorialManager) {
          this.tutorialManager.skip();
          this.tutorialManager = null;
        }
        this._startTutorial(el);
      });
    }

    // Test gestures Mode Toggle
    const testBtn = el.querySelector('#btn-test-gestures');
    testBtn.addEventListener('click', () => {
      this._toggleTestMode(el, !gestureController.isTesting);
    });

    // Reset gestures
    el.querySelector('#btn-reset-gestures').addEventListener('click', () => {
      this._showResetModal(el);
    });
    
    // Export gestures
    el.querySelector('#btn-export-gestures').addEventListener('click', async () => {
      if (gestureController.exportModelJSON) {
        await gestureController.exportModelJSON();
      }
    });
    
    // Import gestures
    const importInput = el.querySelector('#import-file-input');
    el.querySelector('#btn-import-gestures').addEventListener('click', () => {
      importInput.click();
    });
    
    importInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files[0]) {
        if (gestureController.importModelJSON) {
          try {
            await gestureController.importModelJSON(e.target.files[0]);
            alert('Gestures imported successfully!');
            this._updateUIFromCounts();
          } catch (err) {
            alert('Failed to import gestures. Invalid file format.');
            console.error(err);
          }
        }
      }
      importInput.value = ''; // Reset input
    });
  },

  onLeave() {
    if (this.unsubSampleAdded) this.unsubSampleAdded();
    if (this.unsubGestureDetected) this.unsubGestureDetected();

    this._hideRecordingHint();

    if (this.tutorialManager) {
      this.tutorialManager.skip();
      this.tutorialManager = null;
    }

    gestureController.isTesting = false;
    gestureController.stopRecording();
    // Safety sync
    gestureController.saveModel();
  },

  _updateUIFromCounts(overrideCounts = null) {
    const counts = overrideCounts || gestureController.getSampleCounts();
    const dirs = ['up', 'down', 'left', 'right', 'idle'];
    
    dirs.forEach(dir => {
      const count = counts[dir] || 0;
      const btn = document.querySelector(`#dir-${dir}`);
      if (btn) {
        btn.querySelector('.gesture-dir-btn__count').textContent = count;
        if (count >= 200) {
          btn.classList.add('trained');
        } else {
          btn.classList.remove('trained');
        }
      }
    });

    this._updateProgressUI(document);
  },

  _updateProgressUI(el) {
    const counts = gestureController.getSampleCounts();
    const count = counts[this.activeDir] || 0;
    const progressFill = el.querySelector('#gesture-progress');
    const progressLabel = el.querySelector('#progress-label');

    if (progressFill && progressLabel) {
      const target = 1000;
      const pct = Math.min((count / target) * 100, 100);
      progressFill.style.width = `${pct}%`;
      let color, quality;
      if (count >= 1000)      { color = 'var(--accent-green)';  quality = 'Good'; }
      else if (count >= 500)  { color = 'var(--accent-gold)';   quality = 'Recommended'; }
      else if (count >= 200)  { color = 'linear-gradient(90deg, var(--accent-orange), var(--accent-gold))'; quality = 'Minimum'; }
      else                    { color = 'var(--accent-red, #ef4444)'; quality = 'Need more'; }
      progressFill.style.background = color;
      progressLabel.textContent = `${count} / ${target} — ${quality}`;
    }
  },

  _toggleTestMode(el, active) {
    const testBtn = el.querySelector('#btn-test-gestures');
    const recordBtn = el.querySelector('#btn-record');
    
    gestureController.isTesting = active;

    if (active) {
      testBtn.style.color = 'var(--accent-red)';
      testBtn.textContent = 'Stop Testing';
      
      // hide record button
      recordBtn.classList.add('hidden');
    } else {
      testBtn.style.backgroundColor = '';
      testBtn.style.color = '';
      testBtn.textContent = 'Test My Gestures';
      
      // show record button
      recordBtn.classList.remove('hidden');

      // Reselect the previous active tab
      const dirBtns = el.querySelectorAll('.gesture-dir-btn');
      dirBtns.forEach(b => b.classList.remove('active', 'trained'));
      el.querySelector(`#dir-${this.activeDir}`).classList.add('active');
    }
  },

  _showResetModal(el, preselectedDir = null) {
    const existing = document.getElementById('gesture-reset-modal');
    if (existing) existing.remove();

    const dirs = [
      { dir: 'up',    label: 'UP',    icon: '▲' },
      { dir: 'down',  label: 'DOWN',  icon: '▼' },
      { dir: 'left',  label: 'LEFT',  icon: '◄' },
      { dir: 'right', label: 'RIGHT', icon: '►' },
      { dir: 'idle',  label: 'REST',  icon: '✋' },
    ];

    const counts = gestureController.getSampleCounts();

    const overlay = document.createElement('div');
    overlay.id = 'gesture-reset-modal';
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.75);
      display: flex; align-items: center; justify-content: center;
      z-index: 99998; animation: fsFadeIn 0.2s ease forwards;
    `;

    overlay.innerHTML = `
      <div style="
        background: #1a1510; border: 2px solid #555; border-radius: 14px;
        padding: 20px 18px 16px; max-width: 340px; width: 92vw;
        font-family: 'VCR', sans-serif; color: #e4cfc0;
        display: flex; flex-direction: column; gap: 14px;
      ">
        <div style="text-align: center;">
          <h3 style="margin: 0 0 4px; font-size: clamp(0.9rem, 3.5vw, 1.1rem); letter-spacing: 2px; text-transform: uppercase;">
            Reset Gestures
          </h3>
          <p style="font-size: clamp(0.6rem, 2.2vw, 0.72rem); color: #888; margin: 0; letter-spacing: 1px;">
            Tap to select, then confirm.
          </p>
        </div>

        <div id="reset-dir-list" style="
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
        ">
          ${dirs.map(({ dir, label, icon }) => {
            const count = counts[dir] || 0;
            const isSelected = preselectedDir === dir;
            const borderStyle = isSelected ? '2px solid #e4cfc0' : '2px solid #444';
            const bgStyle = isSelected ? 'rgba(228,207,192,0.1)' : 'rgba(255,255,255,0.04)';
            const iconHtml = dir === 'idle'
              ? `<img src="/assets/ui/hand.png" style="width:28px;height:28px;object-fit:contain;image-rendering:pixelated;" />`
              : `<span style="font-size:1.3rem;line-height:1;">${icon}</span>`;
            return `
              <div class="reset-tile" data-dir="${dir}" data-selected="${isSelected ? '1' : '0'}" style="
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                gap: 5px; padding: 10px 4px 8px;
                background: ${bgStyle}; border: ${borderStyle};
                border-radius: 10px; cursor: pointer;
                transition: border-color 0.15s, background 0.15s;
                user-select: none; -webkit-user-select: none;
                touch-action: manipulation;
              ">
                ${iconHtml}
                <span style="font-size: clamp(0.55rem, 2vw, 0.68rem); letter-spacing: 1px;">${label}</span>
                <span style="font-size: clamp(0.5rem, 1.5vw, 0.6rem); color: ${count > 0 ? '#aaa' : '#555'};">${count}</span>
              </div>
            `;
          }).join('')}
        </div>

        <button id="reset-select-all" style="
          background: transparent; border: 1px solid #555; color: #e74c3c;
          font-family: 'VCR', sans-serif; padding: 7px; cursor: pointer;
          border-radius: 6px; font-size: clamp(0.65rem, 2.2vw, 0.75rem);
          letter-spacing: 1px; width: 100%; touch-action: manipulation;
        ">SELECT ALL</button>

        <p id="reset-modal-msg" style="
          font-size: clamp(0.6rem, 2vw, 0.7rem); color: #e74c3c; text-align: center;
          min-height: 14px; margin: -6px 0 -4px;
        "></p>

        <div style="display: flex; gap: 8px;">
          <button id="reset-modal-cancel" style="
            flex: 1; background: transparent; border: 2px solid #555; color: #aaa;
            font-family: 'VCR', sans-serif; padding: 10px 6px; cursor: pointer;
            border-radius: 6px; font-size: clamp(0.65rem, 2.5vw, 0.8rem); letter-spacing: 1px;
            touch-action: manipulation;
          ">CANCEL</button>
          <button id="reset-modal-confirm" style="
            flex: 1; background: #e74c3c; border: 2px solid #111; color: #fff;
            font-family: 'VCR', sans-serif; font-weight: bold; padding: 10px 6px;
            cursor: pointer; border-radius: 6px; font-size: clamp(0.65rem, 2.5vw, 0.8rem); letter-spacing: 1px;
            touch-action: manipulation;
          ">RESET</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const tiles = overlay.querySelectorAll('.reset-tile');
    const selectAllBtn = overlay.querySelector('#reset-select-all');
    const msg = overlay.querySelector('#reset-modal-msg');

    const isSelected = (tile) => tile.dataset.selected === '1';

    const setTile = (tile, selected) => {
      tile.dataset.selected = selected ? '1' : '0';
      tile.style.border = selected ? '2px solid #e4cfc0' : '2px solid #444';
      tile.style.background = selected ? 'rgba(228,207,192,0.12)' : 'rgba(255,255,255,0.04)';
    };

    const updateSelectAllLabel = () => {
      const allSelected = [...tiles].every(t => isSelected(t));
      selectAllBtn.textContent = allSelected ? 'DESELECT ALL' : 'SELECT ALL';
      selectAllBtn.style.borderColor = allSelected ? '#e74c3c' : '#555';
    };
    updateSelectAllLabel();

    tiles.forEach(tile => {
      const toggle = (e) => {
        e.preventDefault();
        setTile(tile, !isSelected(tile));
        msg.textContent = '';
        updateSelectAllLabel();
      };
      tile.addEventListener('click', toggle);
      tile.addEventListener('touchend', toggle, { passive: false });
    });

    selectAllBtn.addEventListener('click', () => {
      const allSelected = [...tiles].every(t => isSelected(t));
      tiles.forEach(t => setTile(t, !allSelected));
      msg.textContent = '';
      updateSelectAllLabel();
    });

    const close = () => overlay.remove();
    overlay.querySelector('#reset-modal-cancel').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    overlay.querySelector('#reset-modal-confirm').addEventListener('click', async () => {
      const selected = [...tiles].filter(t => isSelected(t)).map(t => t.dataset.dir);
      if (selected.length === 0) {
        msg.textContent = 'Select at least one gesture to reset.';
        return;
      }

      const confirmBtn = overlay.querySelector('#reset-modal-confirm');
      confirmBtn.textContent = 'RESETTING...';
      confirmBtn.disabled = true;

      if (selected.length === dirs.length) {
        await gestureController.resetAllGestures();
        this._updateUIFromCounts({});
      } else {
        for (const dir of selected) {
          await gestureController.resetGestureClass(dir);
        }
        this._updateUIFromCounts();
      }

      close();
      const names = selected.map(d => d.toUpperCase()).join(', ');
      this._showToast(`Cleared: ${names}`);
    });
  },

  _showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.85); color: white; padding: 10px 20px;
      border-radius: 8px; font-family: 'GigaSaturn', sans-serif;
      font-size: clamp(0.6rem,2vw,0.8rem); z-index: 99999;
      pointer-events: none; letter-spacing: 1px;
      animation: fsFadeIn 0.3s ease forwards;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'fsFadeOut 0.4s ease forwards';
      setTimeout(() => toast.remove(), 400);
    }, 2500);
  },

  _startTutorial(el) {
    this.tutorialManager = new TutorialManager('screen-container');
    const portrait = '/assets/entity/character-icon/character.png';

    const steps = [
      {
        text: "Welcome to Bata, Takbo! Before we begin, let's set up your hand gestures. You'll use your webcam to teach the game how you move!",
        portrait: portrait,
        position: 'center',
        buttons: [
          { label: 'Start Tutorial', action: 'next', style: 'primary' },
          { label: 'Skip', action: 'skip', style: 'subtle' }
        ]
      },
      {
        text: "This is your camera view. Make sure your hand is clearly visible inside the frame!",
        portrait: portrait,
        position: 'center',
        highlight: '#gesture-camera',
        buttons: [{ label: 'Got it', action: 'next' }]
      },
      {
        text: "These are the gesture buttons. You will select a direction before you start recording.",
        portrait: portrait,
        position: 'center',
        highlight: '.gesture-directions',
        buttons: [{ label: 'Next', action: 'next' }]
      },
      {
        text: "Let's train the UP gesture. Make a clear upward hand signal, then press and hold the Record button until the bar fills.",
        portrait: portrait,
        position: 'center',
        buttons: [{ label: '▶ Start Recording', action: 'next' }]
      },
      {
        hideDialogue: true,
        onEnter: () => {
          el.querySelector('#dir-up').click();
          this._showRecordingHint(el, '▲ UP', 'Hold the Record button with your UP gesture. Try using both hands for better accuracy!');
        },
        autoAdvance: {
          type: 'sampleAdded',
          check: (counts) => { if (counts.up >= 200) { this._hideRecordingHint(); return true; } return false; }
        }
      },
      {
        text: "Great! Now do the same for DOWN. Make a downward signal and hold record.",
        portrait: portrait,
        position: 'center',
        buttons: [{ label: '▶ Record DOWN', action: 'next' }]
      },
      {
        hideDialogue: true,
        onEnter: () => {
          el.querySelector('#dir-down').click();
          this._showRecordingHint(el, '▼ DOWN', 'Hold the Record button with your DOWN gesture. Try using both hands for better accuracy!');
        },
        autoAdvance: {
          type: 'sampleAdded',
          check: (counts) => { if (counts.down >= 200) { this._hideRecordingHint(); return true; } return false; }
        }
      },
      {
        text: "Now point LEFT.",
        portrait: portrait,
        position: 'center',
        buttons: [{ label: '▶ Record LEFT', action: 'next' }]
      },
      {
        hideDialogue: true,
        onEnter: () => {
          el.querySelector('#dir-left').click();
          this._showRecordingHint(el, '◀ LEFT', 'Hold the Record button with your LEFT gesture. Try using both hands for better accuracy!');
        },
        autoAdvance: {
          type: 'sampleAdded',
          check: (counts) => { if (counts.left >= 200) { this._hideRecordingHint(); return true; } return false; }
        }
      },
      {
        text: "And point RIGHT.",
        portrait: portrait,
        position: 'center',
        buttons: [{ label: '▶ Record RIGHT', action: 'next' }]
      },
      {
        hideDialogue: true,
        onEnter: () => {
          el.querySelector('#dir-right').click();
          this._showRecordingHint(el, '▶ RIGHT', 'Hold the Record button with your RIGHT gesture. Try using both hands for better accuracy!');
        },
        autoAdvance: {
          type: 'sampleAdded',
          check: (counts) => { if (counts.right >= 200) { this._hideRecordingHint(); return true; } return false; }
        }
      },
      {
        text: "One more — make your REST pose. This is what your hand looks like when you are NOT moving (e.g., an open palm or fist).",
        portrait: portrait,
        position: 'center',
        buttons: [{ label: '▶ Record REST', action: 'next' }]
      },
      {
        hideDialogue: true,
        onEnter: () => {
          el.querySelector('#dir-idle').click();
          this._showRecordingHint(el, '✋ REST', 'Hold the Record button with your REST / idle pose. Try using both hands for better accuracy!');
        },
        autoAdvance: {
          type: 'sampleAdded',
          check: (counts) => { if (counts.idle >= 200) { this._hideRecordingHint(); return true; } return false; }
        }
      },
      {
        text: "Perfect! Let's test it. Click 'Test My Gestures', move your hand, and see if the arrows highlight correctly.",
        highlight: "#btn-test-gestures",
        portrait: portrait,
        position: 'center',
        buttons: [{ label: 'Done Testing', action: 'next' }]
      },
      {
        text: this.fromCharSelect
          ? "Your gesture model has been saved! Head back and pick your character to start playing."
          : "You're all set! Your gesture model has been saved. You can come back anytime to retrain. Tap the ? button to replay this tutorial.",
        portrait: portrait,
        position: 'center',
        buttons: [{ label: this.fromCharSelect ? 'Back to Character Select' : 'Done', action: 'next' }]
      }
    ];

    this.tutorialManager.start(steps, {
      onComplete: () => this._completeTutorial(),
      onSkip: () => this._skipTutorial()
    });
  },

  _showRecordingHint(el, direction, instruction) {
    this._hideRecordingHint(); // remove any existing
    const hint = document.createElement('div');
    hint.id = 'gesture-recording-hint';
    hint.innerHTML = `
      <span style="font-size:1.4em; display:block; margin-bottom:4px;">${direction}</span>
      <span style="font-size:0.75em; opacity:0.85; letter-spacing:1px;">${instruction}</span>
    `;
    hint.style.cssText = `
      position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
      background: rgba(255,107,26,0.92); color: white;
      padding: 8px 20px; border-radius: 20px;
      font-family: 'GigaSaturn', sans-serif;
      font-size: clamp(0.8rem, 2.5vw, 1rem);
      text-align: center; z-index: 10001;
      pointer-events: none; letter-spacing: 2px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.4);
      animation: fsFadeIn 0.25s ease forwards;
      white-space: nowrap;
    `;
    document.body.appendChild(hint);
  },

  _hideRecordingHint() {
    const existing = document.getElementById('gesture-recording-hint');
    if (existing) existing.remove();
  },

  async _skipTutorial() {
    // Stay on screen — show brief toast
    const toast = document.createElement('div');
    toast.textContent = 'Tutorial skipped. Train your gestures manually below.';
    toast.style.cssText = `
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.85); color: white; padding: 10px 20px;
      border-radius: 8px; font-family: 'GigaSaturn', sans-serif;
      font-size: clamp(0.6rem,2vw,0.8rem); z-index: 99999;
      pointer-events: none; letter-spacing: 1px;
      animation: fsFadeIn 0.3s ease forwards;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'fsFadeOut 0.4s ease forwards';
      setTimeout(() => toast.remove(), 400);
    }, 2500);
  },

  async _completeTutorial() {
    await gestureController.saveModel({ syncToServer: true });
    state.set('gestureSetupComplete', true);
    state.set('selectedControl', 'gesture');
    await state.saveGestureSetupState();

    if (this.fromCharSelect) {
      // Came from CharacterSelect — stop camera and go back with context restored
      gestureController.stopCamera();
      window.__screenManager.navigate('character-select', {
        chapterId: this.returnChapterId,
        isEndless: this.returnIsEndless
      }, false);
    }
    // else: opened Gesture Setup directly — stay on screen, model is saved
  }
};
