import { state } from '../utils/StateManager.js';

export const LoginScreen = {
  render() {
    return `
      <div class="login-screen screen" id="login-container" style="background-image: url('/assets/ui/backgrounds/login_background.png'); background-size: cover; background-position: center; width: 100%; height: 100%;">
        ${this.renderWelcomeCard()}
      </div>
    `;
  },

  renderWelcomeCard() {
    return `
      <div class="login-reference-layout" id="welcome-card" style="width: 100%; height: 100%; position: relative;">
        <img src="/assets/ui/main-title.png" alt="Bata, Takbo!" class="login-logo" />

        <div style="position: absolute; right: 8%; bottom: 10%; display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-end; width: 45%; min-width: 280px; max-width: 500px;">
          
          <h1 style="font-family: 'GigaSaturn', sans-serif; font-size: clamp(1.8rem, 5vw, 4rem); color: white; text-align: right; margin-bottom: clamp(1rem, 3vh, 1.5rem); line-height: 1; letter-spacing: 2px;">
            HANDA KA NA BA?
          </h1>
          
          <div style="display: flex; flex-direction: column; gap: clamp(0.8rem, 2.5vh, 1.2rem); align-items: flex-end; width: 100%;">
            <button id="btn-goto-login" style="font-family: 'GigaSaturn', sans-serif; font-size: clamp(1.2rem, 4vw, 2rem); color: white; background: transparent; border: none; cursor: pointer; transition: transform 0.2s; letter-spacing: 2px; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">LOGIN</button>
            <button id="btn-goto-register" style="font-family: 'GigaSaturn', sans-serif; font-size: clamp(1.2rem, 4vw, 2rem); color: white; background: transparent; border: none; cursor: pointer; transition: transform 0.2s; letter-spacing: 2px; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">REGISTER</button>
            <button id="btn-guest" style="font-family: 'GigaSaturn', sans-serif; font-size: clamp(1.2rem, 4vw, 2rem); color: var(--text-dim); background: transparent; border: none; cursor: pointer; transition: transform 0.2s; letter-spacing: 2px; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">PLAY AS GUEST</button>
          </div>

          <p style="font-family: 'VCR', sans-serif; font-size: clamp(0.4rem, 1vw, 0.55rem); color: white; margin-top: clamp(0.4rem, 1.5vh, 0.6rem); text-align: right; letter-spacing: 0.5px; text-shadow: 1px 1px 2px rgba(0,0,0,0.8); max-width: 100%;">
            BY JOINING, YOU AGREE TO OUR <a href="#" id="link-terms-welcome" style="color: var(--accent-orange); text-decoration: underline;">PRIVACY POLICY AND TERMS OF SERVICE</a>
          </p>
        </div>
      </div>
    `;
  },

  renderLoginCard() {
    return `
      <div class="login-reference-layout" id="login-card" style="width: 100%; height: 100%; position: relative;">
        <img src="/assets/ui/main-title.png" alt="Bata, Takbo!" class="login-logo" />

        <div class="login-ref-panel">
          <h1 class="login-ref-panel__title">LOGIN</h1>

          <div style="display: flex; flex-direction: column; gap: 0.6rem; width: 100%;">
            <input
              class="login-ref-input"
              type="text"
              id="login-username"
              placeholder="USERNAME OR EMAIL"
              autocomplete="username"
              maxlength="255"
            />
            <div class="login-ref-input-wrap">
              <input
                class="login-ref-input"
                type="password"
                id="login-password"
                placeholder="PASSWORD"
                autocomplete="current-password"
                maxlength="50"
              />
              <button type="button" id="login-toggle-pw" class="login-ref-toggle-btn">
                <img src="/assets/ui/eye_closed.png" style="width: 22px; height: 22px; opacity: 0.8;" alt="Toggle" />
              </button>
            </div>
          </div>

          <p class="login-card__privacy text-red hidden" id="login-error-msg" style="margin-top: 0.4rem; font-family: 'GigaSaturn', sans-serif; font-size: 0.85rem; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.8); text-align: center; width: 100%;"></p>

          <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; width: 100%; margin-top: 0.4rem; gap: 0; white-space: nowrap; overflow: hidden;">
            <button type="button" id="btn-forgot-pw" style="background: transparent; border: none; color: white; font-family: 'VCR', sans-serif; font-size: clamp(0.38rem, 0.9vw, 0.62rem); cursor: pointer; text-decoration: underline; text-transform: uppercase; letter-spacing: 0.5px; padding: 0; flex-shrink: 0;">FORGOT PASSWORD?</button>
            <button type="button" id="btn-forgot-username" style="background: transparent; border: none; color: white; font-family: 'VCR', sans-serif; font-size: clamp(0.38rem, 0.9vw, 0.62rem); cursor: pointer; text-decoration: underline; text-transform: uppercase; letter-spacing: 0.5px; padding: 0; flex-shrink: 0;">FORGOT USERNAME?</button>
            <button type="button" id="btn-goto-register-from-login" style="background: transparent; border: none; color: var(--accent-orange); font-family: 'VCR', sans-serif; font-size: clamp(0.38rem, 0.9vw, 0.62rem); cursor: pointer; text-decoration: underline; text-transform: uppercase; letter-spacing: 0.5px; padding: 0; flex-shrink: 0;">DON'T HAVE AN ACCOUNT? REGISTER</button>
          </div>

          <div class="login-ref-actions">
            <button id="btn-back-login" class="login-ref-action-btn">BACK</button>
            <button id="btn-submit-login" class="login-ref-action-btn">LOGIN</button>
          </div>
        </div>
      </div>
    `;
  },

  renderRegisterCard() {
    return `
      <div class="login-reference-layout" id="register-card" style="width: 100%; height: 100%; position: relative;">
        <img src="/assets/ui/main-title.png" alt="Bata, Takbo!" class="login-logo" />

        <div class="login-ref-panel">
          <h1 class="login-ref-panel__title">CREATE ACCOUNT</h1>

          <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 100%;">
            <input
              class="login-ref-input"
              type="text"
              placeholder="USERNAME"
              autocomplete="off"
              maxlength="20"
              id="reg-username"
            />
            <div id="username-status" style="width: 100%; text-align: right; font-family: 'GigaSaturn', sans-serif; font-size: 0.6rem; margin-top: -0.3rem; min-height: 0; line-height: 1; transition: opacity 0.2s;"></div>

            <input
              class="login-ref-input"
              type="email"
              placeholder="EMAIL"
              autocomplete="off"
              maxlength="255"
              id="reg-email"
            />
            <div style="width: 100%; text-align: center; font-family: 'VCR', sans-serif; font-size: clamp(0.6rem, 1.1vw, 0.75rem); color: #a89b8c; margin-top: -0.2rem; line-height: 1.4;">Use an email you can access — needed to recover your account if you forget your password.</div>

            <div class="login-ref-input-wrap">
              <input
                class="login-ref-input"
                type="password"
                placeholder="PASSWORD"
                maxlength="50"
                autocomplete="new-password"
                id="reg-password"
              />
              <button type="button" id="reg-toggle-pw" class="login-ref-toggle-btn">
                <img src="/assets/ui/eye_closed.png" style="width: 22px; height: 22px; opacity: 0.8;" alt="Toggle" />
              </button>
            </div>
            <div id="pw-requirements" class="pw-requirements-grid">
              <span id="req-length">✗ 8 CHARACTERS MINIMUM</span>
              <span id="req-number" class="pw-req-right">✗ 1 NUMBER</span>
              <span id="req-special">✗ 1 SPECIAL CHARACTER</span>
              <span id="req-upper" class="pw-req-right">✗ 1 UPPERCASE LETTER</span>
            </div>
            <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-bottom: 0.3rem; overflow: hidden;">
              <div id="pw-strength-bar" style="height: 100%; width: 0%; border-radius: 2px; transition: width 0.3s ease, background 0.3s ease;"></div>
            </div>

            <div class="login-ref-input-wrap">
              <input
                class="login-ref-input"
                type="password"
                placeholder="CONFIRM PASSWORD"
                maxlength="50"
                autocomplete="new-password"
                id="reg-confirm"
              />
              <button type="button" id="reg-toggle-confirm" class="login-ref-toggle-btn">
                <img src="/assets/ui/eye_closed.png" style="width: 22px; height: 22px; opacity: 0.8;" alt="Toggle" />
              </button>
            </div>
            <div id="reg-confirm-match" style="width: 100%; text-align: right; font-family: 'GigaSaturn', sans-serif; font-size: 0.6rem; margin-top: -0.3rem; min-height: 0; line-height: 1; transition: opacity 0.2s;"></div>

            <label class="reg-terms-label">
              <input type="checkbox" id="reg-privacy" style="accent-color: var(--accent-orange);" />
              <span>I HAVE READ AND AGREE TO THE <a href="#" id="link-terms-register" style="color: var(--accent-orange); text-decoration: underline;">PRIVACY POLICY AND TERMS OF SERVICE</a>.</span>
            </label>
            <button type="button" id="btn-goto-login-from-reg" class="reg-login-link">ALREADY HAVE AN ACCOUNT? LOGIN</button>
            <p class="login-card__privacy text-red hidden" id="reg-error-msg" style="margin-top: 0.2rem; font-family: 'GigaSaturn', sans-serif; font-size: 0.85rem; font-weight: bold; text-align: center; margin-bottom: 0; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);"></p>
          </div>

          <div class="login-ref-actions">
            <button id="btn-cancel-reg" class="login-ref-action-btn">CANCEL</button>
            <button id="btn-create-account" class="login-ref-action-btn">CREATE ACCOUNT</button>
          </div>
        </div>
      </div>
    `;
  },

  renderForgotPasswordCard() {
    return `
      <div class="login-reference-layout" id="forgot-pw-card" style="width: 100%; height: 100%; position: relative;">
        <img src="/assets/ui/main-title.png" alt="Bata, Takbo!" class="login-logo" />
        <div class="login-ref-panel">

          <!-- STEP 1: EMAIL -->
          <div id="frp-step-email" style="width: 100%;">
            <h1 class="login-ref-panel__title">FORGOT PASSWORD</h1>
            <p style="font-family: 'VCR', sans-serif; font-size: clamp(0.6rem, 1.2vw, 0.85rem); color: #a89b8c; text-align: center; margin-bottom: 1rem; line-height: 1.6; letter-spacing: 1px;">Enter the email you used when you created your account.<br>We will send a 6-digit code to that address.</p>
            <input class="login-ref-input" type="email" id="frp-email" placeholder="ENTER YOUR EMAIL" autocomplete="off" maxlength="255" style="margin-bottom: 0.4rem;" />
            <p id="frp-email-msg" style="font-family: 'GigaSaturn', sans-serif; font-size: 0.75rem; font-weight: bold; min-height: 1.2em; text-align: center; margin: 0.3rem 0;"></p>
            <div class="login-ref-actions">
              <button id="frp-back" class="login-ref-action-btn">BACK</button>
              <button id="frp-send" class="login-ref-action-btn">SEND CODE</button>
            </div>
          </div>

          <!-- STEP 2: CODE -->
          <div id="frp-step-code" style="display:none; width:100%; text-align:center;">
            <h1 class="login-ref-panel__title">CHECK YOUR EMAIL</h1>
            <p id="frp-code-hint" style="font-family: 'GigaSaturn', sans-serif; font-size: clamp(0.55rem, 1.1vw, 0.7rem); color: #a89b8c; text-align: center; margin-bottom: 1rem; line-height: 1.6;"></p>
            <input type="text" id="frp-code" placeholder="6-DIGIT CODE" maxlength="6" autocomplete="off" inputmode="numeric" style="width: 100%; height: clamp(46px, 7vh, 58px); margin-bottom: 0.4rem; background: rgba(0,0,0,0.3); border: 2px solid white; color: white; font-family: 'GigaSaturn', sans-serif; font-size: clamp(1.4rem, 3vw, 2rem); text-align: center; letter-spacing: 8px; outline: none; box-shadow: 0 4px 6px rgba(0,0,0,0.5); box-sizing: border-box;" />
            <p id="frp-countdown" style="font-family: 'GigaSaturn', sans-serif; font-size: 0.62rem; color: #5a5068; text-align: center; margin: 0.3rem 0;"></p>
            <p id="frp-code-msg" style="font-family: 'GigaSaturn', sans-serif; font-size: 0.75rem; font-weight: bold; min-height: 1.2em; text-align: center; margin: 0.3rem 0;"></p>
            <button id="frp-resend" style="display:none; background: transparent; border: none; color: #a89b8c; font-family: 'GigaSaturn', sans-serif; font-size: 0.7rem; cursor: pointer; text-decoration: underline; letter-spacing: 1px; margin-bottom: 0.5rem;">RESEND CODE</button>
            <div class="login-ref-actions">
              <button id="frp-code-back" class="login-ref-action-btn">BACK</button>
              <button id="frp-verify" class="login-ref-action-btn">VERIFY</button>
            </div>
          </div>

          <!-- STEP 3: NEW PASSWORD -->
          <div id="frp-step-reset" style="display:none; width:100%;">
            <h1 class="login-ref-panel__title">NEW PASSWORD</h1>
            <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 100%;">
              <div class="login-ref-input-wrap">
                <input class="login-ref-input" type="password" id="frp-pw" placeholder="NEW PASSWORD" maxlength="50" autocomplete="new-password" />
                <button type="button" id="frp-toggle-pw" class="login-ref-toggle-btn"><img src="/assets/ui/eye_closed.png" style="width: 22px; height: 22px; opacity: 0.8;" /></button>
              </div>
              <div style="width: 100%; text-align: left; font-family: 'VCR', sans-serif; font-size: clamp(0.6rem, 1.1vw, 0.8rem); color: #a89b8c; margin-bottom: 0.1rem; display: grid; grid-template-columns: 1fr 1fr; gap: 2px 8px;">
                <span id="frp-req-length">✗ 8 CHARACTERS MINIMUM</span>
                <span id="frp-req-number">✗ 1 NUMBER</span>
                <span id="frp-req-special">✗ 1 SPECIAL CHARACTER</span>
                <span id="frp-req-upper">✗ 1 UPPERCASE LETTER</span>
              </div>
              <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;">
                <div id="frp-strength-bar" style="height: 100%; width: 0%; border-radius: 2px; transition: width 0.3s ease, background 0.3s ease;"></div>
              </div>
              <div class="login-ref-input-wrap">
                <input class="login-ref-input" type="password" id="frp-confirm" placeholder="CONFIRM NEW PASSWORD" maxlength="50" autocomplete="new-password" />
                <button type="button" id="frp-toggle-confirm" class="login-ref-toggle-btn"><img src="/assets/ui/eye_closed.png" style="width: 22px; height: 22px; opacity: 0.8;" /></button>
              </div>
            </div>
            <p id="frp-reset-msg" style="font-family: 'GigaSaturn', sans-serif; font-size: 0.8rem; font-weight: bold; min-height: 1.2em; text-align: center; margin: 0.4rem 0;"></p>
            <div class="login-ref-actions">
              <button id="frp-reset-back" class="login-ref-action-btn">CANCEL</button>
              <button id="frp-submit" class="login-ref-action-btn">RESET</button>
            </div>
          </div>

        </div>
      </div>
    `;
  },

  renderForgotUsernameCard() {
    return `
      <div class="login-reference-layout" id="forgot-username-card" style="width: 100%; height: 100%; position: relative;">
        <img src="/assets/ui/main-title.png" alt="Bata, Takbo!" class="login-logo" />
        <div class="login-ref-panel">
          <h1 class="login-ref-panel__title">FORGOT USERNAME</h1>
          <p style="font-family: 'VCR', sans-serif; font-size: clamp(0.6rem, 1.2vw, 0.85rem); color: #a89b8c; text-align: center; margin-bottom: 1rem; line-height: 1.6; letter-spacing: 1px;">Enter the email you used when you created your account.<br>We'll send your username to that address.</p>
          <input class="login-ref-input" type="email" id="fu-email" placeholder="ENTER YOUR EMAIL" maxlength="255" autocomplete="off" style="margin-bottom: 0.4rem;" />
          <p id="fu-msg" style="font-family: 'GigaSaturn', sans-serif; font-size: 0.75rem; font-weight: bold; min-height: 1.2em; text-align: center; margin: 0.3rem 0;"></p>
          <div class="login-ref-actions">
            <button id="fu-back" class="login-ref-action-btn">BACK</button>
            <button id="fu-send" class="login-ref-action-btn">SEND</button>
          </div>
        </div>
      </div>
    `;
  },

  renderResetPasswordCard() {
    return `
      <div class="login-reference-layout" id="reset-pw-card" style="width: 100%; height: 100%; position: relative;">
        <img src="/assets/ui/main-title.png" alt="Bata, Takbo!" class="login-logo" />
        <div class="login-ref-panel">
          <h1 class="login-ref-panel__title">RESET PASSWORD</h1>
          <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 100%;">
            <div class="login-ref-input-wrap">
              <input class="login-ref-input" type="password" id="reset-pw" placeholder="NEW PASSWORD" maxlength="50" autocomplete="new-password" />
              <button type="button" id="reset-toggle-pw" class="login-ref-toggle-btn">
                <img src="/assets/ui/eye_closed.png" style="width: 22px; height: 22px; opacity: 0.8;" alt="Toggle" />
              </button>
            </div>
            <div id="reset-pw-requirements" style="width: 100%; text-align: left; font-family: 'VCR', sans-serif; font-size: clamp(0.6rem, 1.1vw, 0.8rem); color: #a89b8c; margin-bottom: 0.2rem; display: grid; grid-template-columns: 1fr 1fr; gap: 2px 8px;">
              <span id="reset-req-length">✗ 8 CHARACTERS MINIMUM</span>
              <span id="reset-req-number">✗ 1 NUMBER</span>
              <span id="reset-req-special">✗ 1 SPECIAL CHARACTER</span>
              <span id="reset-req-upper">✗ 1 UPPERCASE LETTER</span>
            </div>
            <div class="login-ref-input-wrap">
              <input class="login-ref-input" type="password" id="reset-confirm" placeholder="CONFIRM NEW PASSWORD" maxlength="50" autocomplete="new-password" />
              <button type="button" id="reset-toggle-confirm" class="login-ref-toggle-btn">
                <img src="/assets/ui/eye_closed.png" style="width: 22px; height: 22px; opacity: 0.8;" alt="Toggle" />
              </button>
            </div>
          </div>
          <p class="login-card__privacy text-red hidden" id="reset-error-msg" style="margin-top: 0.4rem; font-family: 'GigaSaturn', sans-serif; font-size: 0.85rem; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.8); text-align: center;"></p>
          <div class="login-ref-actions">
            <button id="btn-back-reset" class="login-ref-action-btn">CANCEL</button>
            <button id="btn-submit-reset" class="login-ref-action-btn">RESET</button>
          </div>
        </div>
      </div>
    `;
  },

  async onEnter(el, data) {
    this.container = el;
    this.bindWelcomeEvents();
  },

  bindWelcomeEvents() {
    const btnLogin = this.container.querySelector('#btn-goto-login');
    const btnRegister = this.container.querySelector('#btn-goto-register');
    const btnGuest = this.container.querySelector('#btn-guest');
    const linkTerms = this.container.querySelector('#link-terms-welcome');

    if (linkTerms) {
      linkTerms.addEventListener('click', (e) => {
        e.preventDefault();
        window.__screenManager.navigate('terms-screen');
      });
    }

    if (btnLogin) {
      btnLogin.addEventListener('click', () => {
        this.container.innerHTML = this.renderLoginCard();
        this.bindLoginEvents();
      });
    }

    if (btnRegister) {
      btnRegister.addEventListener('click', () => {
        this.container.innerHTML = this.renderRegisterCard();
        this.bindRegisterEvents();
      });
    }

    if (btnGuest) {
      btnGuest.addEventListener('click', async () => {
        btnGuest.innerHTML = 'JOINING...';
        btnGuest.disabled = true;

        const guestName = 'Guest_' + Math.floor(Math.random() * 9000 + 1000);

        setTimeout(async () => {
          const sessionData = JSON.stringify({
            username: guestName,
            is_guest: true
          });

          const secretKeyStr = "BATA_TAKBO_SECRET_KEY_256BIT_000";
          const enc = new TextEncoder();
          const keyData = enc.encode(secretKeyStr);

          try {
            const key = await window.crypto.subtle.importKey(
              "raw", keyData, { name: "AES-GCM" }, false, ["encrypt"]
            );
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const encryptedBuffer = await window.crypto.subtle.encrypt(
              { name: "AES-GCM", iv: iv }, key, enc.encode(sessionData)
            );

            const encryptedArray = new Uint8Array(encryptedBuffer);
            const combined = new Uint8Array(12 + encryptedArray.length);
            combined.set(iv, 0);
            combined.set(encryptedArray, 12);

            const encryptedBase64 = btoa(String.fromCharCode.apply(null, combined));
            localStorage.setItem('guest_session', encryptedBase64);
          } catch (err) {
            console.error('Failed to encrypt session:', err);
          }

          state._resetAccountState();

          if (window.__screenManager) {
            window.__screenManager.navigate('loading-screen', { target: 'main-menu' });
          }
        }, 500);
      });
    }
  },

  bindLoginEvents() {
    const backBtn = this.container.querySelector('#btn-back-login');
    const loginBtn = this.container.querySelector('#btn-submit-login');
    const userIn = this.container.querySelector('#login-username');
    const passIn = this.container.querySelector('#login-password');
    const errorMsg = this.container.querySelector('#login-error-msg');
    const forgotBtn = this.container.querySelector('#btn-forgot-pw');

    if (!backBtn || !loginBtn || !userIn || !passIn) return;

    if (forgotBtn) {
      forgotBtn.addEventListener('click', () => {
        this.container.innerHTML = this.renderForgotPasswordCard();
        this.bindForgotPasswordEvents();
      });
    }

    const forgotUsernameBtn = this.container.querySelector('#btn-forgot-username');
    if (forgotUsernameBtn) {
      forgotUsernameBtn.addEventListener('click', () => {
        this.container.innerHTML = this.renderForgotUsernameCard();
        this.bindForgotUsernameEvents();
      });
    }

    const gotoRegBtn = this.container.querySelector('#btn-goto-register-from-login');
    if (gotoRegBtn) {
      gotoRegBtn.addEventListener('click', () => {
        this.container.innerHTML = this.renderRegisterCard();
        this.bindRegisterEvents();
      });
    }

    backBtn.addEventListener('click', () => {
      this.container.innerHTML = this.renderWelcomeCard();
      this.bindWelcomeEvents();
    });

    const toggleBtn = this.container.querySelector('#login-toggle-pw');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const type = passIn.getAttribute('type') === 'password' ? 'text' : 'password';
        passIn.setAttribute('type', type);
        const img = toggleBtn.querySelector('img');
        if (img) img.src = type === 'password' ? '/assets/ui/eye_closed.png' : '/assets/ui/eye_open.png';
      });
    }

    const handleLogin = async () => {
      const username = userIn.value.trim();
      const password = passIn.value;

      if (!username || !password) {
        errorMsg.textContent = 'Please enter both username and password.';
        errorMsg.classList.remove('hidden');
        return;
      }

      try {
        loginBtn.innerHTML = 'LOGGING IN...';
        loginBtn.disabled = true;
        errorMsg.classList.add('hidden');

        const res = await fetch('/auth/login', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok && data.success && data.mfaRequired) {
          // MFA challenge — show verification card
          this._mfaTempToken = data.tempToken;
          this._mfaUsername = data.username || username;
          this.container.innerHTML = this.renderMfaVerifyCard();
          this.bindMfaVerifyEvents();
          return;
        } else if (res.ok && data.success) {
          localStorage.setItem('guest_session', JSON.stringify({ is_guest: false, username }));
          await state.hydrateFromServer();
          if (window.__screenManager) {
            window.__screenManager.navigate('loading-screen', { target: 'main-menu' });
          }
        } else if (res.status === 403 && data.error === 'BANNED') {
          // BANNED OVERLAY
          loginBtn.innerHTML = 'LOGIN';
          loginBtn.disabled = false;
          
          const overlay = document.createElement('div');
          overlay.style.cssText = 'position:fixed;inset:0;background:black;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;font-family:"VCR",sans-serif;text-align:center;padding:2rem;';
          
          const isPending = data.appeal_status === 'pending';
          
          overlay.innerHTML = `
            <h1 style="font-family:'GigaSaturn',sans-serif;color:#ef4444;font-size:clamp(2rem,6vw,4rem);margin-bottom:1rem;letter-spacing:4px;">YOU ARE BANNED</h1>
            <p style="font-size:1.2rem;margin-bottom:2rem;max-width:600px;line-height:1.5;">${data.reason ? 'Reason: ' + data.reason : 'Violation of Terms of Service'}</p>
            
            ${isPending ? `
              <div style="background:rgba(255,255,255,0.1);padding:1.5rem;border-radius:8px;border:2px solid #fbbf24;max-width:500px;">
                <h3 style="color:#fbbf24;margin-bottom:0.5rem;font-family:'GigaSaturn',sans-serif;">APPEAL PENDING</h3>
                <p>Your appeal has been submitted and is currently being reviewed by an admin. Please check back later.</p>
              </div>
            ` : `
              <div style="width:100%;max-width:500px;background:rgba(255,255,255,0.05);padding:1.5rem;border-radius:8px;border:1px solid rgba(255,255,255,0.2);">
                <h3 style="margin-bottom:1rem;font-family:'GigaSaturn',sans-serif;font-size:1.2rem;">SUBMIT AN APPEAL</h3>
                <textarea id="ban-appeal-text" placeholder="Explain why you should be unbanned..." style="width:100%;height:100px;background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.3);color:white;padding:0.5rem;font-family:'VCR',sans-serif;margin-bottom:1rem;resize:none;"></textarea>
                <button id="btn-submit-appeal" style="width:100%;padding:12px;background:#ef4444;color:white;border:none;font-family:'GigaSaturn',sans-serif;font-size:1.2rem;cursor:pointer;letter-spacing:2px;border-radius:4px;">SUBMIT APPEAL</button>
                <p id="appeal-msg" style="margin-top:0.5rem;font-size:0.8rem;font-weight:bold;"></p>
              </div>
            `}
            
            <button id="btn-close-ban" style="margin-top:2rem;background:transparent;border:none;color:#a89b8c;font-family:'VCR',sans-serif;text-decoration:underline;cursor:pointer;">Return to Login</button>
          `;
          
          document.body.appendChild(overlay);
          
          overlay.querySelector('#btn-close-ban').addEventListener('click', () => {
            overlay.remove();
          });
          
          if (!isPending) {
            const submitBtn = overlay.querySelector('#btn-submit-appeal');
            const msgEl = overlay.querySelector('#appeal-msg');
            const textEl = overlay.querySelector('#ban-appeal-text');
            
            submitBtn.addEventListener('click', async () => {
              const appeal = textEl.value.trim();
              if (!appeal) {
                msgEl.textContent = 'Please enter an appeal reason.';
                msgEl.style.color = '#ef4444';
                return;
              }
              
              submitBtn.disabled = true;
              submitBtn.textContent = 'SUBMITTING...';
              
              try {
                const appealRes = await fetch('/auth/appeal-ban', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ username: data.username || username, password, appeal })
                });
                const appealData = await appealRes.json();
                
                if (appealRes.ok) {
                  msgEl.textContent = 'Appeal submitted successfully.';
                  msgEl.style.color = '#4ade80';
                  submitBtn.style.display = 'none';
                  textEl.style.display = 'none';
                  setTimeout(() => overlay.remove(), 3000);
                } else {
                  msgEl.textContent = appealData.error || 'Failed to submit appeal.';
                  msgEl.style.color = '#ef4444';
                  submitBtn.disabled = false;
                  submitBtn.textContent = 'SUBMIT APPEAL';
                }
              } catch (e) {
                msgEl.textContent = 'Network error.';
                msgEl.style.color = '#ef4444';
                submitBtn.disabled = false;
                submitBtn.textContent = 'SUBMIT APPEAL';
              }
            });
          }
        } else {
          errorMsg.textContent = data.error || 'Incorrect username or password.';
          errorMsg.classList.remove('hidden');
          loginBtn.innerHTML = 'LOGIN';
          loginBtn.disabled = false;
        }
      } catch (err) {
        console.error('Login request failed:', err);
        errorMsg.textContent = 'Network error. Try again.';
        errorMsg.classList.remove('hidden');
        loginBtn.innerHTML = 'LOGIN';
        loginBtn.disabled = false;
      }
    };

    loginBtn.addEventListener('click', handleLogin);

    passIn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
    userIn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') passIn.focus();
    });

    setTimeout(() => userIn.focus(), 50);
  },

  bindForgotPasswordEvents() {
    let _email = '';
    let _code = '';
    let _countdownInterval = null;
    let _resendTimeout = null;

    const showStep = (step) => {
      ['frp-step-email', 'frp-step-code', 'frp-step-reset'].forEach(id => {
        const el = this.container.querySelector('#' + id);
        if (el) el.style.display = 'none';
      });
      const target = this.container.querySelector('#frp-step-' + step);
      if (target) target.style.display = 'block';
    };

    const startCountdown = (seconds) => {
      const countdownEl = this.container.querySelector('#frp-countdown');
      const resendBtn = this.container.querySelector('#frp-resend');
      if (_countdownInterval) clearInterval(_countdownInterval);
      if (_resendTimeout) clearTimeout(_resendTimeout);
      if (resendBtn) resendBtn.style.display = 'none';

      let remaining = seconds;
      const update = () => {
        if (!countdownEl) return;
        const m = Math.floor(remaining / 60);
        const s = String(remaining % 60).padStart(2, '0');
        countdownEl.textContent = `Code expires in ${m}:${s}`;
        if (remaining <= 60) countdownEl.style.color = '#ef4444';
        else countdownEl.style.color = '#5a5068';
        remaining--;
        if (remaining < 0) {
          clearInterval(_countdownInterval);
          countdownEl.textContent = 'Code expired. Please resend.';
          countdownEl.style.color = '#ef4444';
        }
      };
      update();
      _countdownInterval = setInterval(update, 1000);

      _resendTimeout = setTimeout(() => {
        if (resendBtn) resendBtn.style.display = 'inline-block';
      }, 30000);
    };

    const sendCode = async (email) => {
      const res = await fetch('/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      return res;
    };

    // BACK button (step 1)
    const backBtn = this.container.querySelector('#frp-back');
    if (backBtn) backBtn.addEventListener('click', () => {
      if (_countdownInterval) clearInterval(_countdownInterval);
      if (_resendTimeout) clearTimeout(_resendTimeout);
      this.container.innerHTML = this.renderLoginCard();
      this.bindLoginEvents();
    });

    // SEND CODE (step 1)
    const sendBtn = this.container.querySelector('#frp-send');
    const emailIn = this.container.querySelector('#frp-email');
    const emailMsg = this.container.querySelector('#frp-email-msg');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const doSend = async () => {
      const email = emailIn ? emailIn.value.trim() : '';
      if (!email || !emailRegex.test(email)) {
        if (emailMsg) { emailMsg.textContent = 'Please enter a valid email address.'; emailMsg.style.color = '#ef4444'; }
        return;
      }
      _email = email;
      if (sendBtn) { sendBtn.textContent = 'SENDING...'; sendBtn.disabled = true; }
      try {
        await sendCode(email);
        const hintEl = this.container.querySelector('#frp-code-hint');
        if (hintEl) hintEl.textContent = `A 6-digit code was sent to ${email}. Enter it below.`;
        showStep('code');
        startCountdown(15 * 60);
        setTimeout(() => { const ci = this.container.querySelector('#frp-code'); if (ci) ci.focus(); }, 50);
      } catch (e) {
        if (emailMsg) { emailMsg.textContent = 'Network error. Try again.'; emailMsg.style.color = '#ef4444'; }
      } finally {
        if (sendBtn) { sendBtn.textContent = 'SEND CODE'; sendBtn.disabled = false; }
      }
    };

    if (sendBtn) sendBtn.addEventListener('click', doSend);
    if (emailIn) emailIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSend(); });
    setTimeout(() => { if (emailIn) emailIn.focus(); }, 50);

    // RESEND
    const resendBtn = this.container.querySelector('#frp-resend');
    if (resendBtn) resendBtn.addEventListener('click', async () => {
      resendBtn.textContent = 'SENDING...';
      resendBtn.disabled = true;
      const codeMsg = this.container.querySelector('#frp-code-msg');
      try {
        await sendCode(_email);
        if (codeMsg) { codeMsg.textContent = 'New code sent! Check your inbox.'; codeMsg.style.color = '#4ade80'; }
        startCountdown(15 * 60);
      } catch (e) {
        if (codeMsg) { codeMsg.textContent = 'Network error. Try again.'; codeMsg.style.color = '#ef4444'; }
      } finally {
        resendBtn.textContent = 'RESEND CODE';
        resendBtn.disabled = false;
      }
    });

    // BACK (step 2 → step 1)
    const codeBackBtn = this.container.querySelector('#frp-code-back');
    if (codeBackBtn) codeBackBtn.addEventListener('click', () => {
      if (_countdownInterval) clearInterval(_countdownInterval);
      if (_resendTimeout) clearTimeout(_resendTimeout);
      showStep('email');
      setTimeout(() => { if (emailIn) emailIn.focus(); }, 50);
    });

    // VERIFY code (step 2 → step 3)
    const verifyBtn = this.container.querySelector('#frp-verify');
    const codeIn = this.container.querySelector('#frp-code');
    const codeMsg = this.container.querySelector('#frp-code-msg');

    const doVerify = async () => {
      const code = codeIn ? codeIn.value.trim() : '';
      if (!code || code.length !== 6) {
        if (codeMsg) { codeMsg.textContent = 'Enter the 6-digit code from your email.'; codeMsg.style.color = '#ef4444'; }
        return;
      }
      if (verifyBtn) { verifyBtn.textContent = 'CHECKING...'; verifyBtn.disabled = true; }
      try {
        const res = await fetch('/auth/verify-reset-code', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: _email, code })
        });
        const data = await res.json();
        if (res.ok) {
          _code = code;
          if (_countdownInterval) clearInterval(_countdownInterval);
          if (_resendTimeout) clearTimeout(_resendTimeout);
          showStep('reset');
          setTimeout(() => { const pw = this.container.querySelector('#frp-pw'); if (pw) pw.focus(); }, 50);
          this._bindFrpResetStep(_email, _code);
        } else if (data.error === 'expired') {
          if (codeMsg) { codeMsg.textContent = 'Code expired. Click Resend to get a new one.'; codeMsg.style.color = '#ef4444'; }
          const rb = this.container.querySelector('#frp-resend');
          if (rb) rb.style.display = 'inline-block';
        } else {
          if (codeMsg) { codeMsg.textContent = data.error || 'Incorrect code. Try again.'; codeMsg.style.color = '#ef4444'; }
        }
      } catch (e) {
        if (codeMsg) { codeMsg.textContent = 'Network error. Try again.'; codeMsg.style.color = '#ef4444'; }
      } finally {
        if (verifyBtn) { verifyBtn.textContent = 'VERIFY'; verifyBtn.disabled = false; }
      }
    };

    if (verifyBtn) verifyBtn.addEventListener('click', doVerify);
    if (codeIn) {
      codeIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') doVerify(); });
      codeIn.addEventListener('input', () => { codeIn.value = codeIn.value.replace(/\D/g, '').slice(0, 6); });
    }
  },

  _bindFrpResetStep(email, code) {
    const pwIn = this.container.querySelector('#frp-pw');
    const confirmIn = this.container.querySelector('#frp-confirm');
    const msgEl = this.container.querySelector('#frp-reset-msg');
    const submitBtn = this.container.querySelector('#frp-submit');
    const strengthBar = this.container.querySelector('#frp-strength-bar');
    const reqLength = this.container.querySelector('#frp-req-length');
    const reqNumber = this.container.querySelector('#frp-req-number');
    const reqSpecial = this.container.querySelector('#frp-req-special');

    const togglePw = this.container.querySelector('#frp-toggle-pw');
    if (togglePw) togglePw.addEventListener('click', () => {
      const t = pwIn.getAttribute('type') === 'password' ? 'text' : 'password';
      pwIn.setAttribute('type', t);
      const img = togglePw.querySelector('img');
      if (img) img.src = t === 'password' ? '/assets/ui/eye_closed.png' : '/assets/ui/eye_open.png';
    });

    const toggleConfirm = this.container.querySelector('#frp-toggle-confirm');
    if (toggleConfirm) toggleConfirm.addEventListener('click', () => {
      const t = confirmIn.getAttribute('type') === 'password' ? 'text' : 'password';
      confirmIn.setAttribute('type', t);
      const img = toggleConfirm.querySelector('img');
      if (img) img.src = t === 'password' ? '/assets/ui/eye_closed.png' : '/assets/ui/eye_open.png';
    });

    if (pwIn) pwIn.addEventListener('input', () => {
      const v = pwIn.value;
      const okL = v.length >= 8, okN = /\d/.test(v), okS = /[^a-zA-Z0-9]/.test(v), okU = /[A-Z]/.test(v);
      if (reqLength) { reqLength.textContent = (okL ? '\u2713' : '\u2717') + ' 8 CHARACTERS MINIMUM'; reqLength.style.color = okL ? '#4ade80' : '#a89b8c'; }
      if (reqNumber) { reqNumber.textContent = (okN ? '\u2713' : '\u2717') + ' 1 NUMBER'; reqNumber.style.color = okN ? '#4ade80' : '#a89b8c'; }
      if (reqSpecial) { reqSpecial.textContent = (okS ? '\u2713' : '\u2717') + ' 1 SPECIAL CHARACTER'; reqSpecial.style.color = okS ? '#4ade80' : '#a89b8c'; }
      if (reqUpper) { reqUpper.textContent = (okU ? '\u2713' : '\u2717') + ' 1 UPPERCASE LETTER'; reqUpper.style.color = okU ? '#4ade80' : '#a89b8c'; }
      const score = (okL ? 1 : 0) + (okN ? 1 : 0) + (okS ? 1 : 0) + (okU ? 1 : 0);
      if (strengthBar) { strengthBar.style.width = ['0%','25%','50%','75%','100%'][score]; strengthBar.style.background = ['transparent','#e63946','#ff9a4a','#ffd700','#2ecc71'][score]; }
    });

    const resetBackBtn = this.container.querySelector('#frp-reset-back');
    if (resetBackBtn) resetBackBtn.addEventListener('click', () => {
      this.container.innerHTML = this.renderLoginCard();
      this.bindLoginEvents();
    });

    const doReset = async () => {
      const newPassword = pwIn ? pwIn.value : '';
      const confirm = confirmIn ? confirmIn.value : '';
      if (newPassword.length < 8 || !/\d/.test(newPassword) || !/[^a-zA-Z0-9]/.test(newPassword)) {
        if (msgEl) { msgEl.textContent = 'Password does not meet requirements.'; msgEl.style.color = '#ef4444'; }
        return;
      }
      if (newPassword !== confirm) {
        if (msgEl) { msgEl.textContent = 'Passwords do not match.'; msgEl.style.color = '#ef4444'; }
        return;
      }
      if (submitBtn) { submitBtn.textContent = 'RESETTING...'; submitBtn.disabled = true; }
      try {
        const res = await fetch('/auth/reset-password', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code, newPassword })
        });
        const data = await res.json();
        if (res.ok) {
          if (msgEl) { msgEl.textContent = 'Password reset! You can now log in.'; msgEl.style.color = '#4ade80'; }
          setTimeout(() => { this.container.innerHTML = this.renderLoginCard(); this.bindLoginEvents(); }, 2000);
        } else if (data.error === 'expired') {
          if (msgEl) { msgEl.textContent = 'Code expired. Please start over.'; msgEl.style.color = '#ef4444'; }
          setTimeout(() => { this.container.innerHTML = this.renderForgotPasswordCard(); this.bindForgotPasswordEvents(); }, 2500);
        } else {
          if (msgEl) { msgEl.textContent = data.error || 'Something went wrong. Try again.'; msgEl.style.color = '#ef4444'; }
        }
      } catch (e) {
        if (msgEl) { msgEl.textContent = 'Network error. Try again.'; msgEl.style.color = '#ef4444'; }
      } finally {
        if (submitBtn) { submitBtn.textContent = 'RESET'; submitBtn.disabled = false; }
      }
    };

    if (submitBtn) submitBtn.addEventListener('click', doReset);
    if (confirmIn) confirmIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') doReset(); });
  },

  bindForgotUsernameEvents() {
    const backBtn = this.container.querySelector('#fu-back');
    const sendBtn = this.container.querySelector('#fu-send');
    const emailIn = this.container.querySelector('#fu-email');
    const msg = this.container.querySelector('#fu-msg');

    const goBack = () => {
      this.container.innerHTML = this.renderLoginCard();
      this.bindLoginEvents();
    };

    backBtn.addEventListener('click', goBack);

    const sendEmail = async () => {
      const email = emailIn.value.trim();
      if (!email) {
        msg.textContent = 'Email is required.';
        msg.style.color = '#ef4444';
        return;
      }
      sendBtn.textContent = 'SENDING...';
      sendBtn.disabled = true;
      msg.textContent = '';
      try {
        const res = await fetch('/auth/forgot-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (res.ok) {
          msg.textContent = data.message || 'Username sent to your email!';
          msg.style.color = '#4ade80';
          sendBtn.textContent = 'SENT';
        } else {
          msg.textContent = data.error || 'Failed to send. Try again.';
          msg.style.color = '#ef4444';
          sendBtn.textContent = 'SEND';
          sendBtn.disabled = false;
        }
      } catch (e) {
        msg.textContent = 'Network error. Try again.';
        msg.style.color = '#ef4444';
        sendBtn.textContent = 'SEND';
        sendBtn.disabled = false;
      }
    };

    sendBtn.addEventListener('click', sendEmail);
    emailIn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendEmail();
      if (e.key === 'Escape') goBack();
    });

    setTimeout(() => emailIn.focus(), 50);
  },

  bindResetPasswordEvents(resetToken) {
    const backBtn = this.container.querySelector('#btn-back-reset');
    const submitBtn = this.container.querySelector('#btn-submit-reset');
    const pwIn = this.container.querySelector('#reset-pw');
    const confirmIn = this.container.querySelector('#reset-confirm');
    const msgEl = this.container.querySelector('#reset-error-msg');
    
    if (!backBtn || !submitBtn || !pwIn || !confirmIn) return;

    backBtn.addEventListener('click', () => {
      // Clean URL if we came from a link
      window.history.replaceState({}, document.title, window.location.pathname);
      this.container.innerHTML = this.renderLoginCard();
      this.bindLoginEvents();
    });

    const togglePw = this.container.querySelector('#reset-toggle-pw');
    if (togglePw) {
      togglePw.addEventListener('click', () => {
        const type = pwIn.getAttribute('type') === 'password' ? 'text' : 'password';
        pwIn.setAttribute('type', type);
        const img = togglePw.querySelector('img');
        if (img) img.src = type === 'password' ? '/assets/ui/eye_closed.png' : '/assets/ui/eye_open.png';
      });
    }

    const toggleConfirm = this.container.querySelector('#reset-toggle-confirm');
    if (toggleConfirm) {
      toggleConfirm.addEventListener('click', () => {
        const type = confirmIn.getAttribute('type') === 'password' ? 'text' : 'password';
        confirmIn.setAttribute('type', type);
        const img = toggleConfirm.querySelector('img');
        if (img) img.src = type === 'password' ? '/assets/ui/eye_closed.png' : '/assets/ui/eye_open.png';
      });
    }

    const reqLength = this.container.querySelector('#reset-req-length');
    const reqNumber = this.container.querySelector('#reset-req-number');
    const reqSpecial = this.container.querySelector('#reset-req-special');
    const reqUpper = this.container.querySelector('#reset-req-upper');

    pwIn.addEventListener('input', () => {
      const val = pwIn.value;
      const okL = val.length >= 8, okN = /\d/.test(val), okS = /[^a-zA-Z0-9]/.test(val), okU = /[A-Z]/.test(val);
      reqLength.textContent = (okL ? '✓' : '✗') + ' 8 CHARACTERS MINIMUM'; reqLength.style.color = okL ? '#4ade80' : '#a89b8c';
      reqNumber.textContent = (okN ? '✓' : '✗') + ' 1 NUMBER'; reqNumber.style.color = okN ? '#4ade80' : '#a89b8c';
      reqSpecial.textContent = (okS ? '✓' : '✗') + ' 1 SPECIAL CHARACTER'; reqSpecial.style.color = okS ? '#4ade80' : '#a89b8c';
      if (reqUpper) { reqUpper.textContent = (okU ? '✓' : '✗') + ' 1 UPPERCASE LETTER'; reqUpper.style.color = okU ? '#4ade80' : '#a89b8c'; }
    });

    const handleReset = async () => {
      const newPassword = pwIn.value;
      const confirm = confirmIn.value;

      if (!newPassword || newPassword.length < 8) {
        msgEl.textContent = 'Password must be at least 8 characters long.';
        msgEl.style.color = '#ef4444';
        msgEl.classList.remove('hidden');
        return;
      }
      if (!/\d/.test(newPassword)) {
        msgEl.textContent = 'Password must contain at least one number.';
        msgEl.style.color = '#ef4444';
        msgEl.classList.remove('hidden');
        return;
      }
      if (!/[^a-zA-Z0-9]/.test(newPassword)) {
        msgEl.textContent = 'Password must contain at least one special character.';
        msgEl.style.color = '#ef4444';
        msgEl.classList.remove('hidden');
        return;
      }
      if (/\s/.test(newPassword)) {
        msgEl.textContent = 'Password cannot contain spaces.';
        msgEl.style.color = '#ef4444';
        msgEl.classList.remove('hidden');
        return;
      }
      if (newPassword !== confirm) {
        msgEl.textContent = 'Passwords do not match.';
        msgEl.style.color = '#ef4444';
        msgEl.classList.remove('hidden');
        return;
      }

      submitBtn.innerHTML = 'RESETTING...';
      submitBtn.disabled = true;

      try {
        const res = await fetch('/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetToken, newPassword })
        });
        
        const data = await res.json();
        if (res.ok && data.success) {
          msgEl.textContent = data.message || 'Password reset successfully.';
          msgEl.style.color = '#4ade80';
          msgEl.classList.remove('hidden');
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
          setTimeout(() => {
            this.container.innerHTML = this.renderLoginCard();
            this.bindLoginEvents();
          }, 2000);
        } else {
          msgEl.textContent = data.error || 'Reset failed.';
          msgEl.style.color = '#ef4444';
          msgEl.classList.remove('hidden');
          submitBtn.innerHTML = 'RESET';
          submitBtn.disabled = false;
        }
      } catch(err) {
        msgEl.textContent = 'Network error. Try again.';
        msgEl.style.color = '#ef4444';
        msgEl.classList.remove('hidden');
        submitBtn.innerHTML = 'RESET';
        submitBtn.disabled = false;
      }
    };

    submitBtn.addEventListener('click', handleReset);
    confirmIn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleReset();
    });

    setTimeout(() => pwIn.focus(), 50);
  },

  bindRegisterEvents() {
    const cancelBtn = this.container.querySelector('#btn-cancel-reg');
    const createBtn = this.container.querySelector('#btn-create-account');
    const userIn = this.container.querySelector('#reg-username');
    const emailIn = this.container.querySelector('#reg-email');
    const passIn = this.container.querySelector('#reg-password');
    const confirmIn = this.container.querySelector('#reg-confirm');
    const privacyCheck = this.container.querySelector('#reg-privacy');
    const errorMsg = this.container.querySelector('#reg-error-msg');
    const linkTerms = this.container.querySelector('#link-terms-register');

    if (linkTerms) {
      linkTerms.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.__screenManager.navigate('terms-screen');
      });
    }

    if (!cancelBtn || !createBtn || !userIn || !passIn) return;

    const usernameStatus = this.container.querySelector('#username-status');
    let usernameCheckTimeout = null;
    let isUsernameTaken = false;
    let isCheckingUsername = false;

    userIn.addEventListener('input', () => {
      const username = userIn.value.trim();

      if (usernameCheckTimeout) clearTimeout(usernameCheckTimeout);

      const userRegex = /^[a-zA-Z0-9_-]+$/;
      if (username.length < 3 || username.length > 20 || !userRegex.test(username)) {
        usernameStatus.textContent = '';
        isUsernameTaken = false;
        isCheckingUsername = false;
        return;
      }

      usernameStatus.textContent = 'Checking...';
      usernameStatus.style.color = '#a89b8c';
      isCheckingUsername = true;

      usernameCheckTimeout = setTimeout(async () => {
        try {
          const res = await fetch('/auth/check-username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
          });

          if (res.status === 200) {
            const data = await res.json();
            if (data.exists) {
              usernameStatus.textContent = '✗ Username already taken';
              usernameStatus.style.color = '#ef4444';
              isUsernameTaken = true;
            }
          } else if (res.status === 404) {
            usernameStatus.textContent = '✓ Username available';
            usernameStatus.style.color = '#4ade80';
            isUsernameTaken = false;
          } else {
            usernameStatus.textContent = '';
            isUsernameTaken = false;
          }
        } catch (err) {
          usernameStatus.textContent = '';
        } finally {
          isCheckingUsername = false;
        }
      }, 500);
    });

    // Real-time password sanitation/requirements
    const pwReqLength = this.container.querySelector('#req-length');
    const pwReqNumber = this.container.querySelector('#req-number');
    const pwReqSpecial = this.container.querySelector('#req-special');
    const pwReqUpper = this.container.querySelector('#req-upper');

    const confirmMatchEl = this.container.querySelector('#reg-confirm-match');

    const updateConfirmMatch = () => {
      if (!confirmIn.value) { confirmMatchEl.textContent = ''; return; }
      if (passIn.value === confirmIn.value) {
        confirmMatchEl.textContent = '✓ Passwords match';
        confirmMatchEl.style.color = '#4ade80';
      } else {
        confirmMatchEl.textContent = '✗ Passwords do not match';
        confirmMatchEl.style.color = '#ef4444';
      }
    };

    const pwStrengthBar = this.container.querySelector('#pw-strength-bar');

    passIn.addEventListener('input', () => {
      const val = passIn.value;
      const okLength = val.length >= 8;
      const okNumber = /\d/.test(val);
      const okSpecial = /[^a-zA-Z0-9]/.test(val);
      const okUpper = /[A-Z]/.test(val);

      pwReqLength.textContent = (okLength ? '✓' : '✗') + ' 8 CHARACTERS MINIMUM';
      pwReqLength.style.color = okLength ? '#4ade80' : '#a89b8c';
      pwReqNumber.textContent = (okNumber ? '✓' : '✗') + ' 1 NUMBER';
      pwReqNumber.style.color = okNumber ? '#4ade80' : '#a89b8c';
      pwReqSpecial.textContent = (okSpecial ? '✓' : '✗') + ' 1 SPECIAL CHARACTER';
      pwReqSpecial.style.color = okSpecial ? '#4ade80' : '#a89b8c';
      if (pwReqUpper) { pwReqUpper.textContent = (okUpper ? '✓' : '✗') + ' 1 UPPERCASE LETTER'; pwReqUpper.style.color = okUpper ? '#4ade80' : '#a89b8c'; }

      const score = (okLength ? 1 : 0) + (okNumber ? 1 : 0) + (okSpecial ? 1 : 0) + (okUpper ? 1 : 0);
      const widths = ['0%', '25%', '50%', '75%', '100%'];
      const colors = ['transparent', '#e63946', '#ff9a4a', '#ffd700', '#2ecc71'];
      if (pwStrengthBar) { pwStrengthBar.style.width = widths[score]; pwStrengthBar.style.background = colors[score]; }

      updateConfirmMatch();
    });

    confirmIn.addEventListener('input', updateConfirmMatch);

    cancelBtn.addEventListener('click', () => {
      this.container.innerHTML = this.renderWelcomeCard();
      this.bindWelcomeEvents();
    });

    const gotoLoginBtn = this.container.querySelector('#btn-goto-login-from-reg');
    if (gotoLoginBtn) {
      gotoLoginBtn.addEventListener('click', () => {
        this.container.innerHTML = this.renderLoginCard();
        this.bindLoginEvents();
      });
    }

    const togglePw = this.container.querySelector('#reg-toggle-pw');
    if (togglePw) {
      togglePw.addEventListener('click', () => {
        const type = passIn.getAttribute('type') === 'password' ? 'text' : 'password';
        passIn.setAttribute('type', type);
        const img = togglePw.querySelector('img');
        if (img) img.src = type === 'password' ? '/assets/ui/eye_closed.png' : '/assets/ui/eye_open.png';
      });
    }

    const toggleConfirm = this.container.querySelector('#reg-toggle-confirm');
    if (toggleConfirm) {
      toggleConfirm.addEventListener('click', () => {
        const type = confirmIn.getAttribute('type') === 'password' ? 'text' : 'password';
        confirmIn.setAttribute('type', type);
        const img = toggleConfirm.querySelector('img');
        if (img) img.src = type === 'password' ? '/assets/ui/eye_closed.png' : '/assets/ui/eye_open.png';
      });
    }

    const handleRegister = async () => {
      const username = userIn.value.trim();
      const email = emailIn.value.trim();
      const password = passIn.value;
      const confirm = confirmIn.value;

      const userRegex = /^[a-zA-Z0-9_-]+$/;
      if (username.length < 3 || username.length > 20 || !userRegex.test(username)) {
        errorMsg.textContent = 'Username must be 3-20 chars (A-Z, 0-9, -, _).';
        errorMsg.classList.remove('hidden');
        return;
      }

      if (isCheckingUsername) {
        errorMsg.textContent = 'Still checking username availability. Please wait.';
        errorMsg.classList.remove('hidden');
        return;
      }

      if (isUsernameTaken) {
        errorMsg.textContent = 'That username is already taken.';
        errorMsg.classList.remove('hidden');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email) || email.length > 255) {
        errorMsg.textContent = 'Please enter a valid email address.';
        errorMsg.classList.remove('hidden');
        return;
      }

      // Password Sanitization and Requirements
      if (!password || password.length < 8) {
        errorMsg.textContent = 'Password must be at least 8 characters long.';
        errorMsg.classList.remove('hidden');
        return;
      }

      const hasNumber = /\d/;
      if (!hasNumber.test(password)) {
        errorMsg.textContent = 'Password must contain at least one number.';
        errorMsg.classList.remove('hidden');
        return;
      }

      const hasSpecial = /[^a-zA-Z0-9]/;
      if (!hasSpecial.test(password)) {
        errorMsg.textContent = 'Password must contain at least one special character.';
        errorMsg.classList.remove('hidden');
        return;
      }

      const hasInvalidChars = /\s/; // Disallow spaces
      if (hasInvalidChars.test(password)) {
        errorMsg.textContent = 'Password cannot contain spaces.';
        errorMsg.classList.remove('hidden');
        return;
      }

      if (password !== confirm) {
        errorMsg.textContent = 'Passwords do not match.';
        errorMsg.classList.remove('hidden');
        return;
      }

      if (!privacyCheck.checked) {
        errorMsg.textContent = 'You must agree to the privacy policy.';
        errorMsg.classList.remove('hidden');
        return;
      }

      try {
        createBtn.innerHTML = 'CREATING...';
        createBtn.disabled = true;
        errorMsg.classList.add('hidden');

        const res = await fetch('/auth/register', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password })
        });

        const data = await res.json();
        let shouldEnable = false;

        if (res.ok && data.success) {
          localStorage.removeItem('guest_session');
          localStorage.setItem('guest_session', JSON.stringify({ is_guest: false, username }));
          
          // DO NOT reset account state here!
          // We want to keep the guest state currently in memory and sync it up to the new account.
          await state._syncToServer();
          
          if (window.__screenManager) {
            window.__screenManager.navigate('loading-screen', { target: 'main-menu' });
          }
        } else {
          errorMsg.textContent = data.error || 'Registration failed.';
          errorMsg.classList.remove('hidden');
          shouldEnable = true;
        }

        if (shouldEnable) {
          createBtn.innerHTML = 'CREATE ACCOUNT';
          createBtn.disabled = false;
        }
      } catch (err) {
        console.error('Registration request failed:', err);
        errorMsg.textContent = 'Network error. Try again.';
        errorMsg.classList.remove('hidden');
        createBtn.innerHTML = 'CREATE ACCOUNT';
        createBtn.disabled = false;
      }
    };

    createBtn.addEventListener('click', handleRegister);

    emailIn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') passIn.focus();
    });

    passIn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmIn.focus();
    });

    confirmIn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleRegister();
    });

    setTimeout(() => userIn.focus(), 50);
  },

  renderMfaVerifyCard() {
    return `
      <div class="login-reference-layout" id="mfa-verify-card" style="width: 100%; height: 100%; position: relative;">
        <img src="/assets/ui/main-title.png" alt="Bata, Takbo!" class="login-logo" />
        <div class="login-ref-panel">
          <h1 class="login-ref-panel__title">VERIFY YOUR IDENTITY</h1>
          <p style="font-family: 'VCR', sans-serif; font-size: clamp(0.6rem, 1.2vw, 0.85rem); color: #a89b8c; text-align: center; margin-bottom: 1rem; line-height: 1.6; letter-spacing: 1px;">A 6-digit verification code was sent to your email.<br>Enter it below to complete login.</p>
          <input type="text" id="mfa-code-input" placeholder="6-DIGIT CODE" maxlength="6" autocomplete="off" inputmode="numeric" style="width: 100%; height: clamp(46px, 7vh, 58px); margin-bottom: 0.4rem; background: rgba(0,0,0,0.3); border: 2px solid white; color: white; font-family: 'GigaSaturn', sans-serif; font-size: clamp(1.4rem, 3vw, 2rem); text-align: center; letter-spacing: 8px; outline: none; box-shadow: 0 4px 6px rgba(0,0,0,0.5); box-sizing: border-box;" />
          <p id="mfa-verify-msg" style="font-family: 'GigaSaturn', sans-serif; font-size: 0.75rem; font-weight: bold; min-height: 1.2em; text-align: center; margin: 0.3rem 0;"></p>
          <button id="mfa-resend-btn" style="background: transparent; border: none; color: #a89b8c; font-family: 'GigaSaturn', sans-serif; font-size: 0.7rem; cursor: pointer; text-decoration: underline; letter-spacing: 1px; margin-bottom: 0.5rem;">RESEND CODE</button>
          <div class="login-ref-actions">
            <button id="mfa-back-btn" class="login-ref-action-btn">BACK</button>
            <button id="mfa-submit-btn" class="login-ref-action-btn">VERIFY</button>
          </div>
        </div>
      </div>
    `;
  },

  bindMfaVerifyEvents() {
    const codeInput = this.container.querySelector('#mfa-code-input');
    const msg = this.container.querySelector('#mfa-verify-msg');
    const submitBtn = this.container.querySelector('#mfa-submit-btn');
    const backBtn = this.container.querySelector('#mfa-back-btn');
    const resendBtn = this.container.querySelector('#mfa-resend-btn');

    if (!codeInput || !submitBtn || !backBtn) return;

    setTimeout(() => codeInput.focus(), 50);

    // Only allow digits
    codeInput.addEventListener('input', () => {
      codeInput.value = codeInput.value.replace(/\D/g, '').slice(0, 6);
    });

    backBtn.addEventListener('click', () => {
      this._mfaTempToken = null;
      this._mfaUsername = null;
      this.container.innerHTML = this.renderLoginCard();
      this.bindLoginEvents();
    });

    // Resend code
    if (resendBtn) {
      resendBtn.addEventListener('click', async () => {
        resendBtn.disabled = true;
        resendBtn.textContent = 'SENDING...';
        msg.textContent = '';
        try {
          const res = await fetch('/auth/login/resend-mfa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tempToken: this._mfaTempToken })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            msg.textContent = 'New code sent to your email.';
            msg.style.color = '#4ade80';
          } else if (res.status === 401) {
            msg.textContent = 'Session expired. Please log in again.';
            msg.style.color = '#ef4444';
            setTimeout(() => {
              this._mfaTempToken = null;
              this.container.innerHTML = this.renderLoginCard();
              this.bindLoginEvents();
            }, 2000);
            return;
          } else {
            msg.textContent = data.error || 'Failed to resend code.';
            msg.style.color = '#ef4444';
          }
        } catch (err) {
          msg.textContent = 'Network error.';
          msg.style.color = '#ef4444';
        } finally {
          resendBtn.disabled = false;
          resendBtn.textContent = 'RESEND CODE';
        }
      });
    }

    const handleVerify = async () => {
      const code = codeInput.value.trim();
      if (!code || code.length !== 6) {
        msg.textContent = 'Enter the 6-digit code.';
        msg.style.color = '#ef4444';
        return;
      }

      submitBtn.textContent = 'VERIFYING...';
      submitBtn.disabled = true;
      msg.textContent = '';

      try {
        const res = await fetch('/auth/login/verify-mfa', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, tempToken: this._mfaTempToken })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          localStorage.setItem('guest_session', JSON.stringify({ is_guest: false, username: this._mfaUsername }));
          this._mfaTempToken = null;
          this._mfaUsername = null;
          await state.hydrateFromServer();
          if (window.__screenManager) {
            window.__screenManager.navigate('loading-screen', { target: 'main-menu' });
          }
        } else if (res.status === 401) {
          msg.textContent = 'Session expired. Please log in again.';
          msg.style.color = '#ef4444';
          setTimeout(() => {
            this._mfaTempToken = null;
            this.container.innerHTML = this.renderLoginCard();
            this.bindLoginEvents();
          }, 2000);
        } else {
          msg.textContent = data.error || 'Verification failed.';
          msg.style.color = '#ef4444';
          submitBtn.textContent = 'VERIFY';
          submitBtn.disabled = false;
        }
      } catch (err) {
        msg.textContent = 'Network error. Try again.';
        msg.style.color = '#ef4444';
        submitBtn.textContent = 'VERIFY';
        submitBtn.disabled = false;
      }
    };

    submitBtn.addEventListener('click', handleVerify);
    codeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleVerify();
    });
  },

  onLeave() {
    this._mfaTempToken = null;
    this._mfaUsername = null;
  }
};
