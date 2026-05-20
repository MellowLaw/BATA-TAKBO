/**
 * Settings — Camera, Audio, Gesture, and Display settings
 * Redesigned to match the Profile screen two-panel layout.
 */
import { state } from '../utils/StateManager.js';
import { audioManager } from '../game/AudioManager.js';
import { updateMenuVolume } from './MainMenu.js';

export const Settings = {
  render() {
    const s = state.get('settings');

    return `
      <div class="settings-screen screen" id="settings-container">
        <div class="settings-screen__content" id="settings-content-wrapper" style="background: transparent; border: none; box-shadow: none;">

          <!-- SIDEBAR NAVIGATION -->
          <div class="profile-sidebar">
            <button class="back-btn" id="btn-settings-back">
              BACK TO MENU
            </button>
            <button class="profile-tab-btn active" data-target="settings-panel-camera">CAMERA &amp; PRIVACY</button>
            <button class="profile-tab-btn" data-target="settings-panel-audio">AUDIO</button>
            <button class="profile-tab-btn" data-target="settings-panel-gesture">GESTURE</button>
            <button class="profile-tab-btn" data-target="settings-panel-display">DISPLAY</button>
            <button class="profile-tab-btn" data-target="settings-panel-other">OTHER</button>
          </div>

          <!-- MAIN CONTENT AREA -->
          <div class="profile-content-area scrollable">

            <!-- CAMERA & PRIVACY PANEL -->
            <div id="settings-panel-camera" class="profile-panel active">
              <h2 style="font-family:var(--font-display); color:#111; margin-bottom:var(--space-md); border-bottom:3px solid #111; padding-bottom:8px; letter-spacing:2px;">Camera &amp; Privacy</h2>

              <div class="profile-card" style="flex-direction: column; align-items: stretch; gap: var(--space-md);">

                <div class="setting-row" style="color:#111;">
                  <div>
                    <h3 style="color:#111; font-family:'VCR',monospace; font-size:var(--text-sm); text-transform:uppercase; letter-spacing:1px;">Privacy Mode</h3>
                    <p style="font-family:'VCR',monospace; font-size:11px; margin-top:4px; color:#444;">Hides the webcam feed during gameplay</p>
                  </div>
                  <div class="toggle ${s.camera.privacyMode ? 'active' : ''}" id="toggle-privacy" data-key="camera.privacyMode">
                    <div class="toggle__knob"></div>
                  </div>
                </div>

                <div class="setting-row" style="color:#111;">
                  <div>
                    <h3 style="color:#111; font-family:'VCR',monospace; font-size:var(--text-sm); text-transform:uppercase; letter-spacing:1px;">Show Hand Skeleton</h3>
                    <p style="font-family:'VCR',monospace; font-size:11px; margin-top:4px; color:#444;">Overlays joint tracking on the camera feed</p>
                  </div>
                  <div class="toggle ${s.camera.showSkeleton ? 'active' : ''}" id="toggle-skeleton" data-key="camera.showSkeleton">
                    <div class="toggle__knob"></div>
                  </div>
                </div>

                <div class="setting-row" style="color:#111; flex-direction: column; align-items: stretch; gap: var(--space-sm);">
                  <div>
                    <h3 style="color:#111; font-family:'VCR',monospace; font-size:var(--text-sm); text-transform:uppercase; letter-spacing:1px;">Camera Device</h3>
                    <p style="font-family:'VCR',monospace; font-size:11px; margin-top:4px; color:#444;">Select your active webcam from connected devices</p>
                  </div>
                  <select id="select-camera-device" style="
                    width: 100%;
                    background: #111;
                    color: #f0e6d3;
                    font-family: 'VCR', monospace;
                    font-size: var(--text-sm);
                    padding: var(--space-sm) var(--space-md);
                    border: 2px solid #444;
                    border-radius: 4px;
                    cursor: pointer;
                    outline: none;
                    appearance: none;
                    -webkit-appearance: none;
                  ">
                    <option value="">Loading cameras...</option>
                  </select>
                </div>

                <div class="setting-row" style="color:#111; flex-direction: column; align-items: stretch; gap: var(--space-sm);">
                  <div>
                    <h3 style="color:#111; font-family:'VCR',monospace; font-size:var(--text-sm); text-transform:uppercase; letter-spacing:1px;">Camera Quality</h3>
                    <p style="font-family:'VCR',monospace; font-size:11px; margin-top:4px; color:#444;">Lower quality reduces lag on weaker devices</p>
                  </div>
                  <div style="display:flex; gap: var(--space-sm);">
                    <button class="settings-quality-btn ${(s.camera.quality || 'medium') === 'low' ? 'active' : ''}" data-quality="low" style="flex:1;">LOW</button>
                    <button class="settings-quality-btn ${(s.camera.quality || 'medium') === 'medium' ? 'active' : ''}" data-quality="medium" style="flex:1;">MEDIUM</button>
                    <button class="settings-quality-btn ${(s.camera.quality || 'medium') === 'high' ? 'active' : ''}" data-quality="high" style="flex:1;">HIGH</button>
                  </div>
                </div>

              </div>
            </div>

            <!-- AUDIO PANEL -->
            <div id="settings-panel-audio" class="profile-panel">
              <h2 style="font-family:var(--font-display); color:#111; margin-bottom:var(--space-md); border-bottom:3px solid #111; padding-bottom:8px; letter-spacing:2px;">Audio</h2>

              <div class="profile-card" style="flex-direction: column; align-items: stretch; gap: var(--space-md);">

                <div class="setting-row" style="color:#111;">
                  <div style="min-width:80px;">
                    <h3 style="color:#111; font-family:'VCR',monospace; font-size:var(--text-sm); text-transform:uppercase; letter-spacing:1px;">Master</h3>
                  </div>
                  <div class="slider-container" style="flex:1; display:flex; align-items:center; gap:var(--space-sm);">
                    <input type="range" class="slider" id="slider-master"
                           min="0" max="100" value="${Math.round(s.audio.master * 100)}"
                           data-key="audio.master" style="flex:1;" />
                    <span class="slider-value" id="val-master" style="min-width:40px; text-align:right; color:#111; font-family:'VCR',monospace;">${Math.round(s.audio.master * 100)}%</span>
                  </div>
                </div>

                <div class="setting-row" style="color:#111;">
                  <div style="min-width:80px;">
                    <h3 style="color:#111; font-family:'VCR',monospace; font-size:var(--text-sm); text-transform:uppercase; letter-spacing:1px;">Music</h3>
                  </div>
                  <div class="slider-container" style="flex:1; display:flex; align-items:center; gap:var(--space-sm);">
                    <input type="range" class="slider" id="slider-music"
                           min="0" max="100" value="${Math.round(s.audio.music * 100)}"
                           data-key="audio.music" style="flex:1;" />
                    <span class="slider-value" id="val-music" style="min-width:40px; text-align:right; color:#111; font-family:'VCR',monospace;">${Math.round(s.audio.music * 100)}%</span>
                  </div>
                </div>

                <div class="setting-row" style="color:#111;">
                  <div style="min-width:80px;">
                    <h3 style="color:#111; font-family:'VCR',monospace; font-size:var(--text-sm); text-transform:uppercase; letter-spacing:1px;">SFX</h3>
                  </div>
                  <div class="slider-container" style="flex:1; display:flex; align-items:center; gap:var(--space-sm);">
                    <input type="range" class="slider" id="slider-sfx"
                           min="0" max="100" value="${Math.round(s.audio.sfx * 100)}"
                           data-key="audio.sfx" style="flex:1;" />
                    <span class="slider-value" id="val-sfx" style="min-width:40px; text-align:right; color:#111; font-family:'VCR',monospace;">${Math.round(s.audio.sfx * 100)}%</span>
                  </div>
                </div>

                <div class="setting-row" style="color:#111;">
                  <div>
                    <h3 style="color:#111; font-family:'VCR',monospace; font-size:var(--text-sm); text-transform:uppercase; letter-spacing:1px;">Mute All</h3>
                    <p style="font-family:'VCR',monospace; font-size:11px; margin-top:4px; color:#444;">Silences all game audio instantly</p>
                  </div>
                  <div class="toggle ${s.audio.muted ? 'active' : ''}" id="toggle-mute" data-key="audio.muted">
                    <div class="toggle__knob"></div>
                  </div>
                </div>

              </div>
            </div>

            <!-- GESTURE PANEL -->
            <div id="settings-panel-gesture" class="profile-panel">
              <h2 style="font-family:var(--font-display); color:#111; margin-bottom:var(--space-md); border-bottom:3px solid #111; padding-bottom:8px; letter-spacing:2px;">Gesture Control</h2>

              <div class="profile-card" style="flex-direction: column; align-items: stretch; gap: var(--space-md);">

                <div class="setting-row" style="color:#111;">
                  <div style="min-width:120px;">
                    <h3 style="color:#111; font-family:'VCR',monospace; font-size:var(--text-sm); text-transform:uppercase; letter-spacing:1px;">Sensitivity</h3>
                    <p style="font-family:'VCR',monospace; font-size:11px; margin-top:4px; color:#444;">Higher = triggers on less confident gesture reads</p>
                  </div>
                  <div class="slider-container" style="flex:1; display:flex; align-items:center; gap:var(--space-sm);">
                    <input type="range" class="slider" id="slider-sensitivity"
                           min="50" max="95" value="${Math.round(s.gesture.sensitivity * 100)}"
                           data-key="gesture.sensitivity" style="flex:1;" />
                    <span class="slider-value" id="val-sensitivity" style="min-width:40px; text-align:right; color:#111; font-family:'VCR',monospace;">${Math.round(s.gesture.sensitivity * 100)}%</span>
                  </div>
                </div>

              </div>
            </div>

            <!-- DISPLAY PANEL -->
            <div id="settings-panel-display" class="profile-panel">
              <h2 style="font-family:var(--font-display); color:#111; margin-bottom:var(--space-md); border-bottom:3px solid #111; padding-bottom:8px; letter-spacing:2px;">Display</h2>

              <div class="profile-card" style="flex-direction: column; align-items: stretch; gap: var(--space-md);">

                <div class="setting-row" style="color:#111;">
                  <div>
                    <h3 style="color:#111; font-family:'VCR',monospace; font-size:var(--text-sm); text-transform:uppercase; letter-spacing:1px;">Screen Shake</h3>
                    <p style="font-family:'VCR',monospace; font-size:11px; margin-top:4px; color:#444;">Camera shake on boss attacks and impacts</p>
                  </div>
                  <div class="toggle ${s.display.screenShake ? 'active' : ''}" id="toggle-shake" data-key="display.screenShake">
                    <div class="toggle__knob"></div>
                  </div>
                </div>

                <div class="setting-row" style="color:#111;">
                  <div>
                    <h3 style="color:#111; font-family:'VCR',monospace; font-size:var(--text-sm); text-transform:uppercase; letter-spacing:1px;">Particle Effects</h3>
                    <p style="font-family:'VCR',monospace; font-size:11px; margin-top:4px; color:#444;">Colored particle bursts on pickups and hits</p>
                  </div>
                  <div class="toggle ${s.display.particles ? 'active' : ''}" id="toggle-particles" data-key="display.particles">
                    <div class="toggle__knob"></div>
                  </div>
                </div>

                <div class="setting-row" style="color:#111; flex-direction: column; align-items: stretch; gap: var(--space-sm);">
                  <div>
                    <h3 style="color:#111; font-family:'VCR',monospace; font-size:var(--text-sm); text-transform:uppercase; letter-spacing:1px;">Panel Position</h3>
                    <p style="font-family:'VCR',monospace; font-size:11px; margin-top:4px; color:#444;">Position of the boss info panel during gameplay</p>
                  </div>
                  <div style="display:flex; gap: var(--space-sm);">
                    <button class="settings-quality-btn ${(s.display.panelPosition || 'left') === 'left' ? 'active' : ''}" data-panel-position="left" style="flex:1; ${(s.display.panelPosition || 'left') === 'left' ? 'border: 3px solid #ff6b1a; box-shadow: 0 0 12px rgba(255,107,26,0.4);' : ''}">
                      ${(s.display.panelPosition || 'left') === 'left' ? '✓ ' : ''}LEFT
                    </button>
                    <button class="settings-quality-btn ${(s.display.panelPosition || 'left') === 'right' ? 'active' : ''}" data-panel-position="right" style="flex:1; ${(s.display.panelPosition || 'left') === 'right' ? 'border: 3px solid #ff6b1a; box-shadow: 0 0 12px rgba(255,107,26,0.4);' : ''}">
                      ${(s.display.panelPosition || 'left') === 'right' ? '✓ ' : ''}RIGHT
                    </button>
                  </div>
                </div>

              </div>
            </div>

            <!-- OTHER PANEL -->
            <div id="settings-panel-other" class="profile-panel">
              <h2 style="font-family:var(--font-display); color:#111; margin-bottom:var(--space-md); border-bottom:3px solid #111; padding-bottom:8px; letter-spacing:2px;">Other</h2>

              <div class="profile-card" style="flex-direction: column; align-items: stretch; gap: var(--space-md);">
                <div>
                  <h3 style="color:#111; font-family:'VCR',monospace; font-size:var(--text-sm); text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Reset Tutorial</h3>
                  <p style="font-family:'VCR',monospace; font-size:11px; color:#444; margin-bottom:var(--space-md);">The tutorial will play again the next time you click Play. Your gesture setup will not be affected.</p>
                  <button class="menu-btn" id="btn-reset-tutorial" style="font-size: var(--text-sm); padding: var(--space-sm) var(--space-md);">
                    Reset Tutorial
                  </button>
                </div>
                
                <div id="settings-pwa-install-section" style="margin-top: 16px; padding-top: 16px; border-top: 1px dashed rgba(0,0,0,0.15); display: none;">
                  <h3 style="color:#111; font-family:'VCR',monospace; font-size:var(--text-sm); text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">App Installation</h3>
                  <p style="font-family:'VCR',monospace; font-size:11px; color:#444; margin-bottom:var(--space-md);">Install Bata, Takbo! to your home screen for full-screen immersive play and quick offline access.</p>
                  <button class="menu-btn" id="btn-install-pwa" style="font-size: var(--text-sm); padding: var(--space-sm) var(--space-md);">
                    Install App
                  </button>
                </div>

                <div id="settings-push-notification-section" style="margin-top: 16px; padding-top: 16px; border-top: 1px dashed rgba(0,0,0,0.15); display: none;">
                  <h3 style="color:#111; font-family:'VCR',monospace; font-size:var(--text-sm); text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Push Notifications</h3>
                  <p style="font-family:'VCR',monospace; font-size:11px; color:#444; margin-bottom:var(--space-md);">Get updates about new chapters, leaderboards, and game events directly on your device.</p>
                  <button class="menu-btn" id="btn-enable-notifications" style="font-size: var(--text-sm); padding: var(--space-sm) var(--space-md);">
                    Enable Notifications
                  </button>
                </div>
              </div>
            </div>

          </div> <!-- end profile-content-area -->
        </div> <!-- end settings-content-wrapper -->
      </div>
    `;
  },

  async onEnter(el) {
    // Back button
    el.querySelector('#btn-settings-back').addEventListener('click', () => {
      window.__screenManager.back();
    });

    // Tab navigation — same logic as Profile screen
    const tabBtns = el.querySelectorAll('.profile-tab-btn');
    const panels = el.querySelectorAll('.profile-panel');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        if (!target) return;
        tabBtns.forEach(b => b.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const panel = el.querySelector(`#${target}`);
        if (panel) panel.classList.add('active');
      });
    });

    // Toggle switches
    el.querySelectorAll('.toggle').forEach(toggle => {
      toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        const key = toggle.dataset.key;
        const isActive = toggle.classList.contains('active');
        this._updateSetting(key, isActive);
      });
    });

    // Sliders
    el.querySelectorAll('.slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const key = slider.dataset.key;
        const raw = parseInt(e.target.value);
        const valEl = slider.parentElement.querySelector('.slider-value');
        valEl.textContent = `${raw}%`;
        this._updateSetting(key, raw / 100);
      });
    });

    // Camera Quality buttons
    el.querySelectorAll('[data-quality]').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('[data-quality]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._updateSetting('camera.quality', btn.dataset.quality);
      });
    });

    // Panel Position buttons
    el.querySelectorAll('[data-panel-position]').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('[data-panel-position]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._updateSetting('display.panelPosition', btn.dataset.panelPosition);
      });
    });

    // Reset tutorial
    el.querySelector('#btn-reset-tutorial').addEventListener('click', () => {
      this._showResetConfirmModal(el);
    });

    // PWA Programmatic Install prompt integration
    const installSection = el.querySelector('#settings-pwa-install-section');
    const installBtn = el.querySelector('#btn-install-pwa');

    const updateInstallUI = () => {
      if (window.deferredPrompt) {
        installSection.style.display = 'block';
      } else {
        installSection.style.display = 'none';
      }
    };

    updateInstallUI();
    window.addEventListener('pwa-installable', updateInstallUI);
    window.addEventListener('pwa-installed', updateInstallUI);

    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        const promptEvent = window.deferredPrompt;
        if (!promptEvent) return;
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        console.log(`[PWA] Install choice outcome: ${outcome}`);
        window.deferredPrompt = null;
        updateInstallUI();
      });
    }

    // Push Notifications subscription flow
    const pushSection = el.querySelector('#settings-push-notification-section');
    const pushBtn = el.querySelector('#btn-enable-notifications');

    const updatePushUI = () => {
      const sessionData = localStorage.getItem('guest_session');
      let isRegistered = false;
      if (sessionData) {
        try {
          const parsed = JSON.parse(sessionData);
          if (parsed && parsed.is_guest === false) {
            isRegistered = true;
          }
        } catch (e) {}
      }

      const isSupported = ('Notification' in window) && ('serviceWorker' in navigator) && ('PushManager' in window);
      if (isRegistered && isSupported) {
        pushSection.style.display = 'block';
        if (Notification.permission === 'granted') {
          pushBtn.textContent = 'Notifications Enabled ✓';
          pushBtn.disabled = true;
          pushBtn.style.opacity = '0.7';
          pushBtn.style.cursor = 'default';
        } else if (Notification.permission === 'denied') {
          pushBtn.textContent = 'Blocked ⚠️';
          pushBtn.disabled = true;
          pushBtn.style.opacity = '0.7';
          pushBtn.style.cursor = 'default';
        } else {
          pushBtn.textContent = 'Enable Notifications';
          pushBtn.disabled = false;
          pushBtn.style.opacity = '1';
          pushBtn.style.cursor = 'pointer';
        }
      } else {
        pushSection.style.display = 'none';
      }
    };

    updatePushUI();

    if (pushBtn) {
      pushBtn.addEventListener('click', async () => {
        try {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            this._showSuccessToast(el, 'Notification permission denied/dismissed.');
            updatePushUI();
            return;
          }

          pushBtn.textContent = 'Subscribing...';
          pushBtn.disabled = true;

          const reg = await navigator.serviceWorker.ready;
          
          // Get VAPID public key from server
          const keyRes = await fetch('/api/notifications/vapid-public-key');
          if (!keyRes.ok) throw new Error('Failed to fetch public key');
          const { publicKey } = await keyRes.json();

          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
          });

          // Send to server
          const subRes = await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: sub })
          });

          if (!subRes.ok) throw new Error('Failed to save subscription on server');

          this._showSuccessToast(el, 'Successfully subscribed to push notifications!');
          updatePushUI();
        } catch (err) {
          console.error('[PUSH] Subscription flow failed:', err);
          this._showSuccessToast(el, 'Failed to subscribe to notifications.');
          updatePushUI();
        }
      });
    }

    // Populate camera device dropdown
    await this._populateCameraDevices(el);
  },

  async _populateCameraDevices(el) {
    const select = el.querySelector('#select-camera-device');
    if (!select) return;

    try {
      // Request permission first so labels are available
      await navigator.mediaDevices.getUserMedia({ video: true }).then(s => s.getTracks().forEach(t => t.stop())).catch(() => {});
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');

      const s = state.get('settings');
      const savedId = s.camera?.deviceId || '';

      select.innerHTML = videoDevices.length
        ? videoDevices.map((d, i) =>
            `<option value="${d.deviceId}" ${d.deviceId === savedId ? 'selected' : ''}>
              ${d.label || `Camera ${i + 1}`}
            </option>`
          ).join('')
        : '<option value="">No cameras found</option>';

      select.addEventListener('change', () => {
        this._updateSetting('camera.deviceId', select.value);
      });
    } catch (err) {
      select.innerHTML = '<option value="">Camera access denied</option>';
    }
  },

  _showResetConfirmModal(el) {
    const modal = document.createElement('div');
    modal.id = 'reset-tutorial-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.85);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease forwards;
    `;

    modal.innerHTML = `
      <div id="reset-modal-card" style="
        background: var(--bg-panel, #100c04);
        border: 2px solid var(--accent-orange, #ff6b1a);
        border-radius: var(--radius-lg, 12px);
        padding: clamp(1rem, 4vw, 2rem);
        max-width: min(400px, 85vw);
        width: 90%;
        text-align: center;
        animation: modalScaleIn 0.3s ease forwards;
        box-shadow: 0 0 40px rgba(255, 107, 26, 0.3);
        margin: 16px;
      ">
        <h3 style="
          font-family: 'GigaSaturn', sans-serif;
          color: var(--accent-orange, #ff6b1a);
          font-size: clamp(1rem, 4vw, 1.4rem);
          margin-bottom: clamp(0.75rem, 2vw, 1rem);
          text-transform: uppercase;
          letter-spacing: 2px;
          line-height: 1.2;
        ">Reset Tutorial?</h3>
        <p style="
          font-family: 'VCR', monospace;
          color: var(--text-primary, #f0e6d3);
          font-size: clamp(0.8rem, 3vw, 1rem);
          line-height: 1.5;
          margin-bottom: clamp(1rem, 3vw, 1.5rem);
        ">
          Are you sure you want to reset the tutorial? It will play again the next time you click Play. Your gesture setup will NOT be affected.
        </p>
        <div style="display:flex; gap: clamp(0.5rem, 2vw, 1rem); justify-content: center; flex-wrap: wrap;">
          <button id="modal-confirm-reset" class="menu-btn" style="min-width: 120px;">Yes, Reset</button>
          <button id="modal-cancel-reset" class="menu-btn menu-btn--subtle" style="min-width: 120px; opacity: 0.7;">Cancel</button>
        </div>
      </div>
    `;

    el.appendChild(modal);

    modal.querySelector('#modal-confirm-reset').addEventListener('click', async () => {
      state.set('tutorialComplete', false);
      state.set('practiceTutorialComplete', false);
      await state.saveTutorialState();
      await state.savePracticeTutorialState();
      modal.remove();
      this._showSuccessToast(el, 'Tutorial has been reset! Go back and click Play to replay it.');
    });

    modal.querySelector('#modal-cancel-reset').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  },

  _showSuccessToast(el, message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: clamp(16px, 5vh, 40px);
      left: 50%;
      transform: translateX(-50%);
      background: var(--accent-green-dark, #1a8a4a);
      color: white;
      padding: clamp(12px, 3vw, 16px) clamp(16px, 4vw, 24px);
      border-radius: var(--radius-md, 8px);
      font-family: 'VCR', monospace;
      font-size: clamp(0.75rem, 2.5vw, 0.9rem);
      z-index: 10001;
      animation: slideUpFade 0.4s ease forwards;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.2);
      max-width: min(90vw, 400px);
      text-align: center;
      line-height: 1.4;
    `;
    toast.textContent = message;
    el.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  _updateSetting(keyPath, value) {
    const settings = state.get('settings');
    const keys = keyPath.split('.');
    let obj = settings;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    state.set('settings', settings);
    state.saveSettings();

    if (keyPath.startsWith('audio.')) {
      audioManager.updateVolume();
      updateMenuVolume();
    }
  },
};

// Helper utility for push notifications base64 conversion
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
