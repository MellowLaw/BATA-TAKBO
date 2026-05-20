import { state } from '../utils/StateManager.js';
import { DialogueBox } from '../utils/DialogueBox.js';

export const ProfileScreen = {
  render() {
    return `
      <div class="settings-screen screen" id="profile-container">
        <div class="settings-screen__content" id="profile-content-wrapper" style="background: transparent; border: none; box-shadow: none;">
          <!-- SIDEBAR NAVIGATION -->
          <div class="profile-sidebar">
            <button class="back-btn" id="btn-profile-back">
              BACK TO MENU
            </button>
            <button class="profile-tab-btn active" data-target="panel-stats">ID CARD / STATS</button>
            <button class="profile-tab-btn" data-target="panel-account" id="tab-btn-account">ACCOUNT SETTINGS</button>
            <button class="profile-tab-btn" data-target="panel-settings" id="tab-btn-settings">GAME SETTINGS</button>
            <button class="profile-tab-btn" data-target="panel-danger" id="tab-btn-danger">THE VOID</button>
            <button class="profile-tab-btn" id="btn-admin-panel" style="display: none; color: #e74c3c;">ADMIN PANEL</button>
            <button class="profile-tab-btn" data-target="panel-logout" id="tab-btn-logout" style="margin-top: auto; color: #e74c3c; border-left: 3px solid #e74c3c; padding-left: calc(var(--space-md) - 1px);">LOGOUT</button>
          </div>

          <!-- MAIN CONTENT AREA -->
          <div class="profile-content-area scrollable">
          
          <!-- STATS / ID CARD PANEL -->
          <div id="panel-stats" class="profile-panel active">
            

            <div class="id-card-header" style="justify-content: space-between; align-items: flex-start;">
              <div style="display: flex; gap: var(--space-sm); align-items: center; min-width: 0;">
                <div class="id-card-avatar" id="id-card-avatar" style="flex-shrink: 0;">?</div>
                <div class="id-card-info" style="min-width: 0; display: flex; flex-direction: column; gap: 2px; padding-bottom:0;">
                  <h2 id="profile-username" style="font-size: var(--text-xl); word-break: break-word;">Loading...</h2>
                  <p id="profile-bio" style="font-family:'VCR',sans-serif;font-size:var(--text-xs);color:#666;margin-top:2px;font-style:italic;max-width:200px;word-wrap:break-word;min-height:1.2em;"></p>
                </div>
              </div>
              <div class="id-card-badge" id="profile-account-type">GUEST</div>
            </div>

            <div id="profile-stats-container" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-md); margin-bottom: var(--space-md);">
              <div class="profile-stat-box">
                <div class="profile-stat-label">Email</div>
                <div class="profile-stat-value" id="profile-email">-</div>
              </div>
              <div class="profile-stat-box">
                <div class="profile-stat-label">Member Since</div>
                <div class="profile-stat-value" id="profile-date">-</div>
              </div>
              <div class="profile-stat-box" style="grid-column: span 2;">
                <div class="profile-stat-label">Endless Runs</div>
                <div class="profile-stat-value" id="profile-games">-</div>
              </div>
            </div>

            <!-- ENDLESS MODE STATS -->
            <h3 style="font-family:'VCR',sans-serif; color:#111; text-transform:uppercase; margin:var(--space-md) 0 0 0; letter-spacing:1px; border-bottom:2px solid #111; padding-bottom:4px;">Endless Mode Records</h3>
            <div class="inf-stats-container">
              <div class="inf-stats-header">
                <div>CHAPTER</div>
                <div>BEST SCORE</div>
                <div>RANK</div>
              </div>
              <div class="inf-stat-row">
                <div class="inf-stat-chapter">1: MANANANGGAL</div>
                <div class="inf-stat-time" id="inf-ch1-time">Loading...</div>
                <div class="inf-stat-rank" id="inf-ch1-rank">-</div>
              </div>
              <div class="inf-stat-row">
                <div class="inf-stat-chapter">2: BUNGISNGIS</div>
                <div class="inf-stat-time" id="inf-ch2-time">Loading...</div>
                <div class="inf-stat-rank" id="inf-ch2-rank">-</div>
              </div>
              <div class="inf-stat-row">
                <div class="inf-stat-chapter">3: KATAW</div>
                <div class="inf-stat-time" id="inf-ch3-time">Loading...</div>
                <div class="inf-stat-rank" id="inf-ch3-rank">-</div>
              </div>
            </div>

            <!-- GUEST PROMO -->
            <div id="profile-guest-promo" style="display: none; margin-top: var(--space-md); flex-direction: column; align-items: stretch;" class="profile-card">
              <h3 style="color: var(--accent-orange); font-family: var(--font-display); font-size: var(--text-md); margin-bottom: var(--space-sm); letter-spacing: 1px;">CREATE AN ACCOUNT</h3>
              <p style="font-size: var(--text-sm); line-height: 1.5; margin-bottom: var(--space-md);">Guest progress is only saved locally. Register a full account to track your stats, appear on the leaderboard, and keep your progress safe!</p>
              <button id="btn-profile-register" style="padding: var(--space-sm) var(--space-md); font-size: var(--text-sm); width: 100%;">REGISTER NOW</button>
            </div>

          </div>

          <!-- ACCOUNT PANEL -->
          <div id="panel-account" class="profile-panel">
            <h2 style="font-family:var(--font-display); color:#111; margin-bottom:var(--space-md); border-bottom:3px solid #111; padding-bottom:8px;">Account Settings</h2>
            
            <div id="cu-group" class="profile-card">
              <div>
                <h3>Username</h3>
                <p style="font-family:'VCR',sans-serif;font-size:12px;margin-top:4px;">How you appear to others</p>
              </div>
              <button id="btn-modal-username" style="padding: var(--space-sm) var(--space-md); font-family:'VCR',sans-serif; font-size: var(--text-sm);">CHANGE</button>
            </div>

            <div id="ce-group" class="profile-card">
              <div>
                <h3>Email Address</h3>
                <p style="font-family:'VCR',sans-serif;font-size:12px;margin-top:4px;">For account recovery</p>
              </div>
              <button id="btn-modal-email" style="padding: var(--space-sm) var(--space-md); font-family:'VCR',sans-serif; font-size: var(--text-sm);">CHANGE</button>
            </div>

            <div id="mfa-group" class="profile-card" style="display: none;">
              <div>
                <h3>Multi-Factor Authentication (MFA)</h3>
                <p id="mfa-status-desc" style="font-family:'VCR',sans-serif;font-size:12px;margin-top:4px;">Require a verification code on login</p>
              </div>
              <button id="btn-toggle-mfa" style="padding: var(--space-sm) var(--space-md); font-family:'VCR',sans-serif; font-size: var(--text-sm);">ENABLE</button>
            </div>

            <div class="profile-card" id="cp-group">
              <div>
                <h3>Password</h3>
                <p style="font-family:'VCR',sans-serif;font-size:12px;margin-top:4px;">Keep your account secure</p>
              </div>
              <button id="btn-modal-password" style="padding: var(--space-sm) var(--space-md); font-family:'VCR',sans-serif; font-size: var(--text-sm);">CHANGE</button>
            </div>

            <div class="profile-card" id="ca-group">
              <div>
                <h3>Profile Picture</h3>
                <p style="font-family:'VCR',sans-serif;font-size:12px;margin-top:4px;">Customize your ID Card</p>
              </div>
              <button id="btn-modal-avatar" style="padding: var(--space-sm) var(--space-md); font-family:'VCR',sans-serif; font-size: var(--text-sm);">CHANGE</button>
            </div>

            <div class="profile-card" id="cb-group">
              <div>
                <h3>Bio</h3>
                <p style="font-family:'VCR',sans-serif;font-size:12px;margin-top:4px;">Short description about you (max 150 chars)</p>
              </div>
              <button id="btn-modal-bio" style="padding: var(--space-sm) var(--space-md); font-family:'VCR',sans-serif; font-size: var(--text-sm);">CHANGE</button>
            </div>
          </div>

          <!-- GAME SETTINGS PANEL -->
          <div id="panel-settings" class="profile-panel">
            <h2 style="font-family:var(--font-display); color:#111; margin-bottom:var(--space-md); border-bottom:3px solid #111; padding-bottom:8px;">Game Settings</h2>
            
            <div class="profile-card" style="flex-direction: column; align-items: stretch; gap: var(--space-md);">
              <p style="font-family:'VCR',sans-serif; font-size: var(--text-sm); color:#555; margin-bottom: var(--space-sm);">Configure your gameplay experience</p>
              <button id="btn-profile-settings" style="padding: var(--space-sm) var(--space-md); font-family:'VCR',sans-serif; font-size: var(--text-sm); background: #111; color: #e4cfc0; border: 2px solid #111; cursor: pointer; letter-spacing: 2px; text-transform: uppercase;">
                OPEN GAME SETTINGS
              </button>
            </div>
          </div>

          <!-- LOGOUT PANEL -->
          <div id="panel-logout" class="profile-panel">
            <h2 style="font-family:var(--font-display); color:#111; margin-bottom:var(--space-md); border-bottom:2px solid #111; padding-bottom:8px;">Log Out</h2>
            <div class="profile-card" style="flex-direction: column; align-items: stretch; gap: var(--space-md);">
              <div>
                <h3 style="margin:0 0 4px;">Session</h3>
                <p style="font-family:'VCR',sans-serif; font-size: var(--text-sm); color:#555;">You will be returned to the login screen.</p>
              </div>
              <button id="btn-confirm-logout" style="padding: var(--space-sm) var(--space-md); font-family:'VCR',sans-serif; font-size: var(--text-sm); background: #111; color: #e4cfc0; border: 2px solid #111; cursor: pointer; letter-spacing: 2px; text-transform: uppercase;">LOGOUT</button>
            </div>
          </div>

          <!-- DANGER PANEL -->
          <div id="panel-danger" class="profile-panel" style="background: #cfb9b9; border-color: #8b0000;">
            <h2 style="font-family:var(--font-display); color:#8b0000; margin-bottom:var(--space-md); border-bottom:3px solid #8b0000; padding-bottom:8px;">Danger Zone</h2>

            <div id="da-group" class="profile-card" style="display: none; border-color: #8b0000; background: rgba(139, 0, 0, 0.1); flex-direction: column; align-items: stretch; gap: var(--space-sm);">
              <h3 style="color: #8b0000; margin: 0;">Account Deletion</h3>
              <p style="font-family:'VCR',sans-serif; font-size: var(--text-sm); margin-bottom: var(--space-xs); color:#111;">Once you delete your account, there is no going back. Please be certain.</p>
              <button id="btn-modal-delete" style="width: 100%; background: #8b0000; border: 2px solid #111; color: #fff; cursor: pointer; letter-spacing: 2px; text-transform: uppercase; padding: var(--space-sm) var(--space-md); transition: all 0.2s ease;">Delete Account</button>
            </div>
          </div>

        </div> <!-- End profile-content-area -->
        </div> <!-- End settings-screen__content -->
      </div>
    `;
  },

  async onEnter(el) {
    el.querySelector('#btn-profile-back').addEventListener('click', () => {
      window.__screenManager.back();
    });

    // Tab Logic
    const tabBtns = el.querySelectorAll('.profile-tab-btn');
    const panels = el.querySelectorAll('.profile-panel');
    
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-target');
        const targetPanel = el.querySelector('#' + targetId);
        if (targetPanel) targetPanel.classList.add('active');
      });
    });

    let isRegistered = false;
    let fallbackUsername = '';
    let isGuest = false;

    try {
      const stored = localStorage.getItem('guest_session') || sessionStorage.getItem('guest_session');
      if (stored) {
        try {
          const session = JSON.parse(stored);
          if (session && session.is_guest === false) {
            isRegistered = true;
            fallbackUsername = session.username || '';
          }
        } catch(e) {
          isGuest = true;
          try {
            const secretKeyStr = "BATA_TAKBO_SECRET_KEY_256BIT_000";
            const enc = new TextEncoder();
            const keyData = enc.encode(secretKeyStr);
            const key = await window.crypto.subtle.importKey("raw", keyData, { name: "AES-GCM" }, false, ["decrypt"]);
            
            const encryptedBase64 = stored;
            const combined = new Uint8Array(atob(encryptedBase64).split('').map(c => c.charCodeAt(0)));
            const iv = combined.slice(0, 12);
            const data = combined.slice(12);
            
            const decryptedBuffer = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, data);
            const dec = new TextDecoder();
            const session = JSON.parse(dec.decode(decryptedBuffer));
            if (session && session.is_guest) {
              fallbackUsername = session.username || 'Guest';
            }
          } catch(decErr) {
            fallbackUsername = 'Guest';
          }
        }
      }
    } catch (e) {}

    let username = fallbackUsername;
    let accountType = isGuest ? 'Guest' : 'Registered';
    let registeredAt = null;
    let profileEmail = null;
    let avatarUrl = null;
    let bio = null;
    let mfaEnabled = false;

    // Fetch profile for registered users (including JWT cookie auth without localStorage session)
    if (!isGuest) {
      try {
        const res = await fetch('/auth/profile', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          username = data.username || fallbackUsername;
          if (data.accountType) accountType = data.accountType;
          registeredAt = data.registeredAt;
          profileEmail = data.email || null;
          avatarUrl = data.avatar_url || null;
          bio = data.bio || null;
          mfaEnabled = !!data.mfa_enabled;
          isRegistered = true;
        } else if (res.status === 401) {
          // Not authenticated - treat as guest
          isGuest = true;
        }
      } catch (err) {}
    }

    const pAvatar = el.querySelector('#id-card-avatar');
    if (pAvatar) {
      const _getOrAssignPreset = () => {
        try {
          const stored = localStorage.getItem('bata_takbo_preset_avatar');
          if (stored) return stored;
          const n = (Math.floor(Math.random() * 40) + 1).toString().padStart(2, '0');
          const preset = `/assets/ui/User Profiles/Icons_${n}.png`;
          localStorage.setItem('bata_takbo_preset_avatar', preset);
          return preset;
        } catch(e) {
          const n = (Math.floor(Math.random() * 40) + 1).toString().padStart(2, '0');
          return `/assets/ui/User Profiles/Icons_${n}.png`;
        }
      };
      const imgSrc = avatarUrl || _getOrAssignPreset();
      pAvatar.innerHTML = `<img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover;border-radius:2px;image-rendering:pixelated;" alt="avatar" />`;
    }
    
    const pUser = el.querySelector('#profile-username');
    if (pUser) pUser.textContent = username;
    
    const pType = el.querySelector('#profile-account-type');
    if (pType) {
      pType.textContent = accountType;
      if (isGuest) {
        pType.style.background = '#555';
      }
    }
    
    const pEmail = el.querySelector('#profile-email');
    if (pEmail) pEmail.textContent = profileEmail || '-';

    const pBio = el.querySelector('#profile-bio');
    if (pBio) pBio.textContent = bio || '';

    const pDate = el.querySelector('#profile-date');
    if (pDate && registeredAt) {
      const d = new Date(registeredAt);
      pDate.textContent = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }

    const pGames = el.querySelector('#profile-games');
    if (pGames && !isGuest) {
      fetch('/auth/profile/endless-runs', { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d && pGames) pGames.textContent = d.count.toLocaleString(); })
        .catch(() => { if (pGames) pGames.textContent = '—'; });
    } else if (pGames) {
      pGames.textContent = '—';
    }
    
    const guestPromoContainer = el.querySelector('#profile-guest-promo');
    const cuGroup = el.querySelector('#cu-group');
    const cpGroup = el.querySelector('#cp-group');
    const ceGroup = el.querySelector('#ce-group');
    const mfaGroup = el.querySelector('#mfa-group');
    const tabAccountBtn = el.querySelector('#tab-btn-account');

    const mfaStatusDesc = el.querySelector('#mfa-status-desc');
    const btnToggleMfa = el.querySelector('#btn-toggle-mfa');

    const updateMfaUI = () => {
      if (mfaEnabled) {
        if (mfaStatusDesc) {
          mfaStatusDesc.textContent = 'Enabled — Require code on login';
          mfaStatusDesc.style.color = '#2ecc71';
        }
        if (btnToggleMfa) {
          btnToggleMfa.textContent = 'DISABLE';
          btnToggleMfa.style.background = '#e74c3c';
          btnToggleMfa.style.color = '#fff';
        }
      } else {
        if (mfaStatusDesc) {
          mfaStatusDesc.textContent = 'Disabled — Require verification code on login';
          mfaStatusDesc.style.color = '#e74c3c';
        }
        if (btnToggleMfa) {
          btnToggleMfa.textContent = 'ENABLE';
          btnToggleMfa.style.background = 'var(--accent-orange)';
          btnToggleMfa.style.color = '#111';
        }
      }
    };

    if (isGuest) {
      if (guestPromoContainer) guestPromoContainer.style.display = 'flex';
      if (cuGroup) cuGroup.style.display = 'none';
      if (cpGroup) cpGroup.style.display = 'none';
      if (ceGroup) ceGroup.style.display = 'none';
      if (mfaGroup) mfaGroup.style.display = 'none';
      if (tabAccountBtn) tabAccountBtn.style.display = 'none';
    } else {
      if (guestPromoContainer) guestPromoContainer.style.display = 'none';
      if (mfaGroup) {
        mfaGroup.style.display = 'flex';
        updateMfaUI();
      }
      this._loadEndlessRanks(username, el);
    }

    if (btnToggleMfa) {
      btnToggleMfa.addEventListener('click', async () => {
        if (mfaEnabled) {
          this._showMfaDisableModal((newStatus) => {
            mfaEnabled = newStatus;
            updateMfaUI();
          });
        } else {
          if (!profileEmail) {
            DialogueBox.show('Please register or update your email address before enabling MFA.', 'MFA ERROR');
            return;
          }
          btnToggleMfa.textContent = 'SENDING...';
          btnToggleMfa.disabled = true;
          try {
            const res = await fetch('/auth/mfa/setup', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
              this._showMfaEnableModal(profileEmail, (newStatus) => {
                mfaEnabled = newStatus;
                updateMfaUI();
              });
            } else {
              const d = await res.json();
              DialogueBox.show(d.error || 'Failed to initialize MFA setup.', 'MFA SETUP ERROR');
            }
          } catch(e) {
            DialogueBox.show('Network error.', 'MFA SETUP ERROR');
          } finally {
            btnToggleMfa.disabled = false;
            updateMfaUI();
          }
        }
      });
    }

    const btnPromoReg = el.querySelector('#btn-profile-register');
    if (btnPromoReg) {
      btnPromoReg.addEventListener('click', () => state.logout());
    }

    // Modal Triggers
    const btnModalUsername = el.querySelector('#btn-modal-username');
    if (btnModalUsername) btnModalUsername.addEventListener('click', () => this._showUsernameModal());

    const btnModalEmail = el.querySelector('#btn-modal-email');
    if (btnModalEmail) btnModalEmail.addEventListener('click', () => this._showEmailModal());

    const btnModalPassword = el.querySelector('#btn-modal-password');
    if (btnModalPassword) btnModalPassword.addEventListener('click', () => this._showPasswordModal());

    const btnModalDelete = el.querySelector('#btn-modal-delete');
    if (btnModalDelete) btnModalDelete.addEventListener('click', () => this._showDeleteAccountModal());

    const btnAvatar = el.querySelector('#btn-modal-avatar');
    if (btnAvatar) {
      btnAvatar.addEventListener('click', () => this._showAvatarModal());
    }

    const btnBio = el.querySelector('#btn-modal-bio');
    if (btnBio) {
      btnBio.addEventListener('click', () => this._showBioModal(bio));
    }

    // System Access
    const daGroup = el.querySelector('#da-group');
    if (!isGuest && isRegistered && daGroup) {
      daGroup.style.display = 'flex';
    }

    try {
      const adminRes = await fetch('/admin/check', { credentials: 'include' });
      const adminData = await adminRes.json();
      const adminBtn = el.querySelector('#btn-admin-panel');
      if (adminBtn && adminData.isAdmin) {
        adminBtn.style.display = 'block';
        adminBtn.addEventListener('click', () => window.__screenManager.navigate('admin-dashboard'));
      }
    } catch (e) {}

    const confirmLogoutBtn = el.querySelector('#btn-confirm-logout');
    if (confirmLogoutBtn) {
      confirmLogoutBtn.addEventListener('click', () => this._showLogoutModal());
    }

    // Game Settings button - navigate to settings screen
    const btnGameSettings = el.querySelector('#btn-profile-settings');
    if (btnGameSettings) {
      btnGameSettings.addEventListener('click', () => {
        window.__screenManager.navigate('settings');
      });
    }
  },

  async _loadEndlessRanks(username, el) {
    for (let ch = 1; ch <= 3; ch++) {
      const timeEl = el.querySelector(`#inf-ch${ch}-time`);
      const rankEl = el.querySelector(`#inf-ch${ch}-rank`);
      
      try {
        // Check all 4 combinations: keyboard+gesture × waves+score — show best rank
        const urls = [
          `/leaderboard/endless?chapterId=${ch}&controlType=keyboard&sortBy=waves`,
          `/leaderboard/endless?chapterId=${ch}&controlType=keyboard&sortBy=score`,
          `/leaderboard/endless?chapterId=${ch}&controlType=gesture&sortBy=waves`,
          `/leaderboard/endless?chapterId=${ch}&controlType=gesture&sortBy=score`,
        ];
        const responses = await Promise.all(urls.map(u => fetch(u).catch(() => null)));
        let bestRankIndex = -1;
        let bestScore = null;
        for (const r of responses) {
          if (!r || !r.ok) continue;
          const data = await r.json();
          if (!data.entries) continue;
          const idx = data.entries.findIndex(e => e.username === username);
          if (idx !== -1 && (bestRankIndex === -1 || idx < bestRankIndex)) {
            bestRankIndex = idx;
            bestScore = data.entries[idx].score;
          }
        }
        if (bestRankIndex !== -1) {
          timeEl.textContent = bestScore != null ? Number(bestScore).toLocaleString() : '—';
          rankEl.textContent = `#${bestRankIndex + 1}`;
          rankEl.style.fontWeight = 'bold';
          if (bestRankIndex === 0) rankEl.style.color = '#d4af37';
          else if (bestRankIndex === 1) rankEl.style.color = '#71706e';
          else if (bestRankIndex === 2) rankEl.style.color = '#cd7f32';
          else rankEl.style.color = '#111';
        } else {
          timeEl.textContent = 'Unranked';
          rankEl.textContent = '###';
        }
      } catch (err) {
        if (timeEl) timeEl.textContent = 'Error';
        if (rankEl) rankEl.textContent = '-';
      }
    }
  },

  _createModalOverlay() {
    const existing = document.getElementById('profile-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'profile-modal-overlay';
    overlay.className = 'profile-modal-overlay';
    document.body.appendChild(overlay);
    return overlay;
  },

  _showUsernameModal() {
    const overlay = this._createModalOverlay();
    overlay.innerHTML = `
      <div class="profile-modal-box">
        <h3 style="color:var(--accent-orange);font-family:'VCR',sans-serif;font-size:var(--text-lg);text-transform:uppercase;margin:0 0 var(--space-sm);text-align:center;">Change Username</h3>
        <input id="modal-username-new" type="text" placeholder="NEW USERNAME" class="login-card__input" maxlength="20" autocomplete="off" style="margin-bottom:var(--space-xs); background: rgba(255,255,255,0.1); border-color: #555;" />
        <p id="modal-username-msg" style="font-family:'VCR',sans-serif;font-size:var(--text-sm);font-weight:bold;min-height:1.2em;text-align:center;margin:0 0 var(--space-sm);color:var(--accent-red);"></p>
        <div style="display:flex;gap:var(--space-sm);">
          <button id="modal-username-cancel" style="flex:1;background:transparent;border:2px solid #555; color:#fff; font-family:'VCR',sans-serif; padding:8px; cursor:pointer;">CANCEL</button>
          <button id="modal-username-confirm" style="flex:1;background:var(--accent-orange);border:2px solid #111; color:#111; font-family:'VCR',sans-serif; font-weight:bold; padding:8px; cursor:pointer;">SAVE</button>
        </div>
      </div>
    `;

    const input = overlay.querySelector('#modal-username-new');
    const msg = overlay.querySelector('#modal-username-msg');
    const confirmBtn = overlay.querySelector('#modal-username-confirm');
    const cancelBtn = overlay.querySelector('#modal-username-cancel');

    setTimeout(() => input.focus(), 50);

    const closeModal = () => overlay.remove();
    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    const submit = async () => {
      const newUsername = input.value.trim();
      if (!newUsername || newUsername.length < 3 || newUsername.length > 20) {
        msg.textContent = 'Username must be 3-20 chars.';
        return;
      }
      const regex = /^[a-zA-Z0-9_-]+$/;
      if (!regex.test(newUsername)) {
        msg.textContent = 'Only letters, numbers, _, and - allowed.';
        return;
      }
      confirmBtn.textContent = 'SAVING...';
      confirmBtn.disabled = true;

      try {
        const res = await fetch('/auth/change-username', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newUsername })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          const pUser = document.querySelector('#profile-username');
          if (pUser) pUser.textContent = data.username;
          const pAvatar = document.querySelector('#id-card-avatar');
          if (pAvatar) pAvatar.textContent = data.username.charAt(0);
          closeModal();
        } else {
          msg.textContent = data.error || 'Failed to change username.';
          confirmBtn.textContent = 'SAVE';
          confirmBtn.disabled = false;
        }
      } catch (err) {
        msg.textContent = 'Network error.';
        confirmBtn.textContent = 'SAVE';
        confirmBtn.disabled = false;
      }
    };

    confirmBtn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') closeModal(); });
  },

  _showEmailModal() {
    const overlay = this._createModalOverlay();
    overlay.innerHTML = `
      <div class="profile-modal-box">
        <h3 style="color:var(--accent-orange);font-family:'VCR',sans-serif;font-size:var(--text-lg);text-transform:uppercase;margin:0 0 var(--space-sm);text-align:center;">Change Email</h3>
        <input id="modal-email-new" type="email" placeholder="NEW EMAIL" class="login-card__input" maxlength="255" autocomplete="off" style="margin-bottom:8px; background: rgba(255,255,255,0.1); border-color: #555;" />
        <input id="modal-email-pass" type="password" placeholder="CURRENT PASSWORD" class="login-card__input" style="margin-bottom:var(--space-xs); background: rgba(255,255,255,0.1); border-color: #555;" />
        <p id="modal-email-msg" style="font-family:'VCR',sans-serif;font-size:var(--text-sm);font-weight:bold;min-height:1.2em;text-align:center;margin:0 0 var(--space-sm);color:var(--accent-red);"></p>
        <div style="display:flex;gap:var(--space-sm);">
          <button id="modal-email-cancel" style="flex:1;background:transparent;border:2px solid #555; color:#fff; font-family:'VCR',sans-serif; padding:8px; cursor:pointer;">CANCEL</button>
          <button id="modal-email-confirm" style="flex:1;background:var(--accent-orange);border:2px solid #111; color:#111; font-family:'VCR',sans-serif; font-weight:bold; padding:8px; cursor:pointer;">SAVE</button>
        </div>
      </div>
    `;

    const inputNew = overlay.querySelector('#modal-email-new');
    const inputPass = overlay.querySelector('#modal-email-pass');
    const msg = overlay.querySelector('#modal-email-msg');
    const confirmBtn = overlay.querySelector('#modal-email-confirm');
    const cancelBtn = overlay.querySelector('#modal-email-cancel');

    setTimeout(() => inputNew.focus(), 50);
    const closeModal = () => overlay.remove();
    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    const submit = async () => {
      const newEmail = inputNew.value.trim();
      const password = inputPass.value;
      if (!newEmail || !password) {
        msg.textContent = 'Both fields are required.';
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        msg.textContent = 'Invalid email address.';
        return;
      }
      confirmBtn.textContent = 'SAVING...';
      confirmBtn.disabled = true;

      try {
        const res = await fetch('/auth/change-email', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newEmail, password })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          const pEmail = document.querySelector('#profile-email');
          if (pEmail) pEmail.textContent = newEmail.toLowerCase();
          closeModal();
        } else {
          msg.textContent = data.error || 'Failed to update email.';
          confirmBtn.textContent = 'SAVE';
          confirmBtn.disabled = false;
        }
      } catch (err) {
        msg.textContent = 'Network error.';
        confirmBtn.textContent = 'SAVE';
        confirmBtn.disabled = false;
      }
    };

    confirmBtn.addEventListener('click', submit);
    inputNew.addEventListener('keydown', (e) => { if (e.key === 'Enter') inputPass.focus(); if (e.key === 'Escape') closeModal(); });
    inputPass.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') closeModal(); });
  },

  _showPasswordModal() {
    const overlay = this._createModalOverlay();
    overlay.innerHTML = `
      <div class="profile-modal-box">
        <h3 style="color:var(--accent-orange);font-family:'VCR',sans-serif;font-size:var(--text-lg);text-transform:uppercase;margin:0 0 var(--space-sm);text-align:center;">Change Password</h3>
        <input id="modal-pass-current" type="password" placeholder="CURRENT PASSWORD" class="login-card__input" style="margin-bottom:8px; background: rgba(255,255,255,0.1); border-color: #555;" />
        <input id="modal-pass-new" type="password" placeholder="NEW PASSWORD" class="login-card__input" style="margin-bottom:8px; background: rgba(255,255,255,0.1); border-color: #555;" />
        <input id="modal-pass-confirm" type="password" placeholder="CONFIRM NEW PASSWORD" class="login-card__input" style="margin-bottom:var(--space-xs); background: rgba(255,255,255,0.1); border-color: #555;" />
        <p id="modal-pass-msg" style="font-family:'VCR',sans-serif;font-size:var(--text-sm);font-weight:bold;min-height:1.2em;text-align:center;margin:0 0 var(--space-sm);color:var(--accent-red);"></p>
        <div style="display:flex;gap:var(--space-sm);">
          <button id="modal-pass-cancel" style="flex:1;background:transparent;border:2px solid #555; color:#fff; font-family:'VCR',sans-serif; padding:8px; cursor:pointer;">CANCEL</button>
          <button id="modal-pass-confirm-btn" style="flex:1;background:var(--accent-orange);border:2px solid #111; color:#111; font-family:'VCR',sans-serif; font-weight:bold; padding:8px; cursor:pointer;">SAVE</button>
        </div>
      </div>
    `;

    const current = overlay.querySelector('#modal-pass-current');
    const inputNew = overlay.querySelector('#modal-pass-new');
    const confirm = overlay.querySelector('#modal-pass-confirm');
    const msg = overlay.querySelector('#modal-pass-msg');
    const confirmBtn = overlay.querySelector('#modal-pass-confirm-btn');
    const cancelBtn = overlay.querySelector('#modal-pass-cancel');

    setTimeout(() => current.focus(), 50);
    const closeModal = () => overlay.remove();
    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    const submit = async () => {
      const curr = current.value;
      const nw = inputNew.value;
      const cnf = confirm.value;
      if (!curr || !nw || !cnf) { msg.textContent = 'All fields required.'; return; }
      if (nw !== cnf) { msg.textContent = 'Passwords do not match.'; return; }
      if (nw.length < 8 || nw.length > 50) { msg.textContent = 'Password must be 8-50 chars.'; return; }
      if (!/\d/.test(nw) || !/[^a-zA-Z0-9]/.test(nw) || !/[A-Z]/.test(nw)) {
        msg.textContent = 'Needs number, uppercase, & special char.';
        return;
      }
      
      confirmBtn.textContent = 'SAVING...';
      confirmBtn.disabled = true;

      try {
        const res = await fetch('/auth/change-password', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword: curr, newPassword: nw })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          closeModal();
        } else {
          msg.textContent = data.error || 'Failed to change password.';
          confirmBtn.textContent = 'SAVE';
          confirmBtn.disabled = false;
        }
      } catch (err) {
        msg.textContent = 'Network error.';
        confirmBtn.textContent = 'SAVE';
        confirmBtn.disabled = false;
      }
    };

    confirmBtn.addEventListener('click', submit);
    current.addEventListener('keydown', (e) => { if (e.key === 'Enter') inputNew.focus(); if (e.key === 'Escape') closeModal(); });
    inputNew.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirm.focus(); if (e.key === 'Escape') closeModal(); });
    confirm.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') closeModal(); });
  },

  _showDeleteAccountModal() {
    const overlay = this._createModalOverlay();
    overlay.innerHTML = `
      <div class="profile-modal-box" style="border-color: var(--accent-red);">
        <h3 style="color:var(--accent-red);font-family:'VCR',sans-serif;font-size:var(--text-lg);text-transform:uppercase;margin:0 0 var(--space-xs);text-align:center;letter-spacing:2px;text-shadow:var(--glow-red);">Delete Account</h3>
        <p style="color:var(--text-secondary);font-family:'VCR',sans-serif;font-size:var(--text-sm);text-align:center;margin-bottom:var(--space-md);line-height:1.5;">This is <b style="color:var(--text-primary);">PERMANENT</b>. All your data and progress will be erased.</p>
        <p style="color:#fff;font-family:'VCR',sans-serif;font-size:var(--text-xs);text-align:center;margin-bottom:4px;letter-spacing:1px;">Type <b style="color:var(--accent-red);">DELETE</b> to confirm:</p>
        <input id="da-modal-confirm-text" type="text" placeholder="DELETE" class="login-card__input" autocomplete="off" style="text-align:center; border-color: rgba(230,57,70,0.5); background: rgba(255,255,255,0.1); color:#fff; margin-bottom:8px;" />
        <input id="da-modal-password" type="password" placeholder="ACCOUNT PASSWORD" class="login-card__input" style="text-align:center; margin-bottom:var(--space-xs); background: rgba(255,255,255,0.1); color:#fff; border-color:#555;" />
        <p id="da-modal-msg" style="font-family:'VCR',sans-serif;font-size:var(--text-sm);font-weight:bold;min-height:1.2em;text-align:center;margin:0 0 var(--space-sm);color:var(--accent-red);"></p>
        <div style="display:flex;gap:var(--space-sm);">
          <button id="da-modal-cancel" style="flex:1;background:transparent;border:2px solid #555; color:#fff; font-family:'VCR',sans-serif; padding:8px; cursor:pointer;">CANCEL</button>
          <button id="da-modal-confirm" style="flex:1;background:var(--accent-red);border:2px solid #111; color:#fff; font-family:'VCR',sans-serif; font-weight:bold; padding:8px; cursor:pointer;" disabled>DELETE</button>
        </div>
      </div>
    `;

    const confirmText = overlay.querySelector('#da-modal-confirm-text');
    const pwInput = overlay.querySelector('#da-modal-password');
    const msg = overlay.querySelector('#da-modal-msg');
    const confirmBtn = overlay.querySelector('#da-modal-confirm');
    const cancelBtn = overlay.querySelector('#da-modal-cancel');

    setTimeout(() => confirmText.focus(), 50);

    const validateDelete = () => {
      if (confirmText.value === 'DELETE') {
        confirmBtn.disabled = false;
        confirmBtn.style.opacity = '1';
      } else {
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = '0.5';
      }
    };

    confirmText.addEventListener('input', validateDelete);

    const closeModal = () => overlay.remove();
    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    const submit = async () => {
      if (confirmText.value !== 'DELETE') return;
      const password = pwInput.value;
      if (!password) { msg.textContent = 'Password is required.'; return; }
      
      confirmBtn.textContent = 'DELETING...';
      confirmBtn.disabled = true;
      msg.textContent = '';

      try {
        const res = await fetch('/auth/delete-account', {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          closeModal();
          state.logout();
        } else {
          msg.textContent = data.error || 'Failed to delete account.';
          confirmBtn.textContent = 'DELETE';
          confirmBtn.disabled = false;
        }
      } catch (err) {
        msg.textContent = 'Network error.';
        confirmBtn.textContent = 'DELETE';
        confirmBtn.disabled = false;
      }
    };

    confirmBtn.addEventListener('click', submit);
    confirmText.addEventListener('keydown', (e) => { if (e.key === 'Enter') pwInput.focus(); if (e.key === 'Escape') closeModal(); });
    pwInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') closeModal(); });
  },

  _showAvatarModal() {
    const overlay = this._createModalOverlay();
    
    // Generate preset avatar options (40 icons)
    const presetIcons = [];
    for (let i = 1; i <= 40; i++) {
      const num = i.toString().padStart(2, '0');
      presetIcons.push(`/assets/ui/User Profiles/Icons_${num}.png`);
    }
    
    overlay.innerHTML = `
      <div class="profile-modal-box avatar-modal">
        <h3 style="color:#e4cfc0;font-family:'VCR',sans-serif;font-size:var(--text-xl);text-transform:uppercase;margin:0;text-align:center;letter-spacing:2px;">Choose Profile</h3>
        
        <div class="avatar-modal-content">
          <!-- Left: Current Preview -->
          <div class="avatar-preview-column">
            <div id="avatar-preview-box" class="avatar-preview-box">?</div>
          </div>

          <!-- Right: Selection area -->
          <div class="avatar-selection-column">
            <!-- Upload from File -->
            <div class="avatar-upload-row">
              <button id="modal-avatar-upload-btn" style="flex:1;background:#333;border:2px solid #666;color:#e4cfc0;font-family:'VCR',sans-serif;padding:10px;cursor:pointer;border-radius:4px;font-size:var(--text-sm);">UPLOAD FROM FILE</button>
              <input id="modal-avatar-file-input" type="file" accept="image/*" style="display:none;" />
              <span style="font-family:'VCR',sans-serif;font-size:10px;color:#666;">or pick a preset</span>
            </div>

            <!-- Preset Grid -->
            <div id="avatar-preset-grid" class="avatar-preset-grid">
              <style>
                #avatar-preset-grid::-webkit-scrollbar { width: 6px; }
                #avatar-preset-grid::-webkit-scrollbar-track { background: #333; border-radius: 5px; }
                #avatar-preset-grid::-webkit-scrollbar-thumb { background: #e4cfc0; border-radius: 5px; }
                #avatar-preset-grid::-webkit-scrollbar-thumb:hover { background: #d4bfa0; }
              </style>
              ${presetIcons.map((src, idx) => `
                <div class="preset-avatar-option" data-src="${src}" style="
                  width: 100%;
                  border: 2px solid #444;
                  border-radius: 8px;
                  cursor: pointer;
                  overflow: hidden;
                  transition: all 0.2s ease;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  background: #333;
                " title="Profile ${idx + 1}">
                  <img src="${src}" style="width: 100%; height: 100%; object-fit: contain; display: block; image-rendering: pixelated;" />
                </div>
              `).join('')}
            </div>

            <p id="modal-avatar-msg" style="font-family:'VCR',sans-serif;font-size:var(--text-sm);font-weight:bold;min-height:1em;text-align:center;margin:0;color:var(--accent-red);"></p>

            <div class="avatar-modal-actions">
              <button id="modal-avatar-cancel" style="flex:1;background:transparent;border:2px solid #555;color:#aaa;font-family:'VCR',sans-serif;padding:12px;cursor:pointer;border-radius:4px;font-size:var(--text-sm);">CANCEL</button>
              <button id="modal-avatar-remove" style="flex:1;background:#444;border:2px solid #666;color:#aaa;font-family:'VCR',sans-serif;padding:12px;cursor:pointer;border-radius:4px;font-size:var(--text-sm);">RESET</button>
              <button id="modal-avatar-confirm" style="flex:1;background:#e4cfc0;border:2px solid #111;color:#111;font-family:'VCR',sans-serif;font-weight:bold;padding:12px;cursor:pointer;border-radius:4px;font-size:var(--text-sm);" disabled>SAVE</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const uploadBtn = overlay.querySelector('#modal-avatar-upload-btn');
    const fileInput = overlay.querySelector('#modal-avatar-file-input');
    const removeBtn = overlay.querySelector('#modal-avatar-remove');
    const previewBox = overlay.querySelector('#avatar-preview-box');
    const presetGrid = overlay.querySelector('#avatar-preset-grid');
    const msg = overlay.querySelector('#modal-avatar-msg');
    const confirmBtn = overlay.querySelector('#modal-avatar-confirm');
    const cancelBtn = overlay.querySelector('#modal-avatar-cancel');

    let selectedAvatarUrl = undefined; // undefined = no change, null = reset to initial, string = new image

    // Load current avatar into preview
    const currentAvatar = document.querySelector('#id-card-avatar');
    if (currentAvatar) {
      const img = currentAvatar.querySelector('img');
      if (img) {
        previewBox.innerHTML = `<img src="${img.src}" style="width:100%;height:100%;object-fit:contain;border-radius:6px;" />`;
        selectedAvatarUrl = img.src;
      } else {
        previewBox.textContent = currentAvatar.textContent || '?';
      }
    }

    // Handle preset selection
    const presetOptions = presetGrid.querySelectorAll('.preset-avatar-option');
    presetOptions.forEach(option => {
      option.addEventListener('click', () => {
        // Remove selection from others
        presetOptions.forEach(opt => {
          opt.style.border = '3px solid #444';
          opt.style.transform = 'scale(1)';
        });
        // Select this one
        option.style.border = '3px solid #e4cfc0';
        option.style.transform = 'scale(1.08)';
        
        selectedAvatarUrl = option.dataset.src;
        previewBox.innerHTML = `<img src="${selectedAvatarUrl}" style="width:100%;height:100%;object-fit:contain;border-radius:6px;" />`;
        confirmBtn.disabled = false;
        msg.textContent = '';
      });
    });

    // Highlight current selection in grid
    if (selectedAvatarUrl && selectedAvatarUrl.includes('/User Profiles/')) {
      presetOptions.forEach(opt => {
        if (opt.dataset.src === selectedAvatarUrl) {
          opt.style.border = '3px solid #e4cfc0';
          opt.style.transform = 'scale(1.08)';
        }
      });
    }

    // Upload from file
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        msg.textContent = 'Please select a valid image file.';
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        msg.textContent = 'Image must be under 2MB.';
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        selectedAvatarUrl = e.target.result;
        previewBox.innerHTML = `<img src="${selectedAvatarUrl}" style="width:100%;height:100%;object-fit:contain;border-radius:6px;" />`;
        presetOptions.forEach(opt => {
          opt.style.border = '2px solid #444';
          opt.style.transform = 'scale(1)';
        });
        confirmBtn.disabled = false;
        msg.textContent = '';
      };
      reader.readAsDataURL(file);
    });

    // Reset button — pick a random preset
    removeBtn.addEventListener('click', () => {
      presetOptions.forEach(opt => {
        opt.style.border = '3px solid #444';
        opt.style.transform = 'scale(1)';
      });
      const n = (Math.floor(Math.random() * 40) + 1).toString().padStart(2, '0');
      selectedAvatarUrl = `/assets/ui/User Profiles/Icons_${n}.png`;
      previewBox.innerHTML = `<img src="${selectedAvatarUrl}" style="width:100%;height:100%;object-fit:contain;border-radius:6px;" />`;
      confirmBtn.disabled = false;
      msg.textContent = '';
    });

    const closeModal = () => overlay.remove();
    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    const submit = async () => {
      if (selectedAvatarUrl === undefined) { closeModal(); return; }
      confirmBtn.textContent = 'SAVING...';
      confirmBtn.disabled = true;
      msg.textContent = '';

      try {
        const res = await fetch('/auth/change-avatar', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatarUrl: selectedAvatarUrl })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          // Update the ID card avatar live
          const pAvatar = document.querySelector('#id-card-avatar');
          if (pAvatar) {
            if (selectedAvatarUrl) {
              pAvatar.innerHTML = `<img src="${selectedAvatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:2px;" alt="avatar" />`;
            } else {
              const name = document.querySelector('#profile-username');
              pAvatar.textContent = (name?.textContent || '?').charAt(0).toUpperCase();
            }
          }
          closeModal();
        } else {
          msg.textContent = data.error || 'Failed to update picture.';
          confirmBtn.textContent = 'SAVE';
          confirmBtn.disabled = false;
        }
      } catch (err) {
        msg.textContent = 'Network error. Try again.';
        confirmBtn.textContent = 'SAVE';
        confirmBtn.disabled = false;
      }
    };

    confirmBtn.addEventListener('click', submit);
  },

  _showLogoutModal() {
    const overlay = this._createModalOverlay();
    overlay.innerHTML = `
      <div class="profile-modal-box" style="max-width: min(360px, 90vw); width: 90vw;">
        <h3 style="color:#e4cfc0;font-family:'VCR',sans-serif;font-size:var(--text-lg);text-transform:uppercase;margin:0 0 var(--space-sm);text-align:center;letter-spacing:2px;">Log Out</h3>
        <p style="font-family:'VCR',sans-serif;font-size:var(--text-sm);color:#aaa;text-align:center;margin:0 0 var(--space-md);">Are you sure you want to log out?</p>
        <div style="display:flex;gap:var(--space-sm);flex-wrap:wrap;">
          <button id="modal-logout-cancel" style="flex:1;min-width:80px;background:transparent;border:2px solid #555;color:#aaa;font-family:'VCR',sans-serif;padding:10px;cursor:pointer;border-radius:4px;font-size:var(--text-sm);">CANCEL</button>
          <button id="modal-logout-confirm" style="flex:1;min-width:80px;background:#e74c3c;border:2px solid #111;color:#fff;font-family:'VCR',sans-serif;font-weight:bold;padding:10px;cursor:pointer;border-radius:4px;font-size:var(--text-sm);">LOG OUT</button>
        </div>
      </div>
    `;
    const close = () => overlay.remove();
    overlay.querySelector('#modal-logout-cancel').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('#modal-logout-confirm').addEventListener('click', () => {
      close();
      state.logout();
    });
  },

  _showBioModal(currentBio) {
    const overlay = this._createModalOverlay();
    overlay.innerHTML = `
      <div class="profile-modal-box" style="max-width: min(400px, 90vw); width: 90vw;">
        <h3 style="color:#e4cfc0;font-family:'VCR',sans-serif;font-size:var(--text-lg);text-transform:uppercase;margin:0 0 var(--space-sm);text-align:center;letter-spacing:2px;">Edit Bio</h3>
        
        <textarea id="modal-bio-input" placeholder="Tell us about yourself..." class="login-card__input" maxlength="150" style="
          width: 100%; min-height: clamp(80px, 20vh, 120px); resize: vertical;
          background: rgba(255,255,255,0.1); border-color: #555;
          font-family: 'VCR', sans-serif; font-size: var(--text-sm);
          color: #fff; padding: var(--space-sm); margin-bottom: var(--space-xs);
          border-radius: 4px; border: 2px solid #555;
        ">${currentBio || ''}</textarea>
        
        <p id="modal-bio-counter" style="font-family:'VCR',sans-serif;font-size:10px;color:#666;text-align:right;margin-bottom:var(--space-sm);">${(currentBio || '').length}/150</p>
        <p id="modal-bio-msg" style="font-family:'VCR',sans-serif;font-size:var(--text-sm);font-weight:bold;min-height:1.2em;text-align:center;margin:0 0 var(--space-sm);color:var(--accent-red);"></p>

        <div style="display:flex;gap:var(--space-sm); flex-wrap: wrap;">
          <button id="modal-bio-cancel" style="flex:1; min-width: 80px; background:transparent;border:2px solid #555;color:#aaa;font-family:'VCR',sans-serif;padding:10px;cursor:pointer;border-radius:4px;font-size:var(--text-sm);">CANCEL</button>
          <button id="modal-bio-confirm" style="flex:1; min-width: 80px; background:#e4cfc0;border:2px solid #111;color:#111;font-family:'VCR',sans-serif;font-weight:bold;padding:10px;cursor:pointer;border-radius:4px;font-size:var(--text-sm);">SAVE</button>
        </div>
      </div>
    `;

    const input = overlay.querySelector('#modal-bio-input');
    const counter = overlay.querySelector('#modal-bio-counter');
    const msg = overlay.querySelector('#modal-bio-msg');
    const confirmBtn = overlay.querySelector('#modal-bio-confirm');
    const cancelBtn = overlay.querySelector('#modal-bio-cancel');

    // Character counter
    input.addEventListener('input', () => {
      const len = input.value.length;
      counter.textContent = `${len}/150`;
      counter.style.color = len >= 140 ? '#e74c3c' : '#666';
    });

    const closeModal = () => overlay.remove();
    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    const submit = async () => {
      const newBio = input.value.trim();
      
      confirmBtn.textContent = 'SAVING...';
      confirmBtn.disabled = true;
      msg.textContent = '';

      try {
        const res = await fetch('/auth/change-bio', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bio: newBio })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          // Update the ID card bio live
          const pBio = document.querySelector('#profile-bio');
          if (pBio) pBio.textContent = data.bio || '';
          closeModal();
        } else {
          msg.textContent = data.error || 'Failed to update bio.';
          confirmBtn.textContent = 'SAVE';
          confirmBtn.disabled = false;
        }
      } catch (err) {
        msg.textContent = 'Network error. Try again.';
        confirmBtn.textContent = 'SAVE';
        confirmBtn.disabled = false;
      }
    };

    confirmBtn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.ctrlKey) submit(); if (e.key === 'Escape') closeModal(); });
    setTimeout(() => input.focus(), 50);
  },

  _showMfaEnableModal(profileEmail, updateUI_cb) {
    const overlay = this._createModalOverlay();
    overlay.innerHTML = `
      <div class="profile-modal-box">
        <h3 style="color:var(--accent-orange);font-family:'VCR',sans-serif;font-size:var(--text-lg);text-transform:uppercase;margin:0 0 var(--space-sm);text-align:center;">Enable MFA</h3>
        <p style="font-family:'VCR',sans-serif;font-size:var(--text-sm);color:#ddd;text-align:center;margin-bottom:var(--space-md);line-height:1.4;">A 6-digit code has been sent to <b style="color:var(--accent-orange);">${profileEmail}</b>. Enter it below to enable MFA.</p>
        <input id="modal-mfa-code" type="text" placeholder="6-DIGIT CODE" class="login-card__input" maxlength="6" autocomplete="off" style="margin-bottom:8px; text-align:center; letter-spacing:4px; font-weight:bold; background: rgba(255,255,255,0.1); border-color: #555;" />
        <p id="modal-mfa-msg" style="font-family:'VCR',sans-serif;font-size:var(--text-sm);font-weight:bold;min-height:1.2em;text-align:center;margin:0 0 var(--space-sm);color:var(--accent-red);"></p>
        <button id="modal-mfa-resend" style="background:transparent;border:none;color:#aaa;text-decoration:underline;font-family:'VCR',sans-serif;font-size:var(--text-xs);cursor:pointer;display:block;margin:0 auto var(--space-md);padding:0;">Resend Code</button>
        <div style="display:flex;gap:var(--space-sm);">
          <button id="modal-mfa-cancel" style="flex:1;background:transparent;border:2px solid #555; color:#fff; font-family:'VCR',sans-serif; padding:8px; cursor:pointer;">CANCEL</button>
          <button id="modal-mfa-confirm" style="flex:1;background:var(--accent-orange);border:2px solid #111; color:#111; font-family:'VCR',sans-serif; font-weight:bold; padding:8px; cursor:pointer;">VERIFY</button>
        </div>
      </div>
    `;

    const input = overlay.querySelector('#modal-mfa-code');
    const msg = overlay.querySelector('#modal-mfa-msg');
    const confirmBtn = overlay.querySelector('#modal-mfa-confirm');
    const cancelBtn = overlay.querySelector('#modal-mfa-cancel');
    const resendBtn = overlay.querySelector('#modal-mfa-resend');

    setTimeout(() => input.focus(), 50);
    const closeModal = () => overlay.remove();
    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 6);
    });

    resendBtn.addEventListener('click', async () => {
      resendBtn.disabled = true;
      resendBtn.textContent = 'Sending...';
      try {
        const res = await fetch('/auth/mfa/setup', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
          msg.textContent = 'New code sent successfully!';
          msg.style.color = '#2ecc71';
        } else {
          const d = await res.json();
          msg.textContent = d.error || 'Failed to resend code.';
          msg.style.color = 'var(--accent-red)';
        }
      } catch (err) {
        msg.textContent = 'Network error.';
        msg.style.color = 'var(--accent-red)';
      } finally {
        resendBtn.disabled = false;
        resendBtn.textContent = 'Resend Code';
      }
    });

    const submit = async () => {
      const code = input.value.trim();
      if (!code || code.length !== 6) {
        msg.textContent = 'Enter the 6-digit verification code.';
        msg.style.color = 'var(--accent-red)';
        return;
      }

      confirmBtn.textContent = 'VERIFYING...';
      confirmBtn.disabled = true;

      try {
        const res = await fetch('/auth/mfa/enable', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          updateUI_cb(true);
          closeModal();
          DialogueBox.show('MFA is now enabled on your account.', 'SECURITY');
        } else {
          msg.textContent = data.error || 'Verification failed.';
          msg.style.color = 'var(--accent-red)';
          confirmBtn.textContent = 'VERIFY';
          confirmBtn.disabled = false;
        }
      } catch (err) {
        msg.textContent = 'Network error.';
        msg.style.color = 'var(--accent-red)';
        confirmBtn.textContent = 'VERIFY';
        confirmBtn.disabled = false;
      }
    };

    confirmBtn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') closeModal(); });
  },

  _showMfaDisableModal(updateUI_cb) {
    const overlay = this._createModalOverlay();
    overlay.innerHTML = `
      <div class="profile-modal-box">
        <h3 style="color:var(--accent-orange);font-family:'VCR',sans-serif;font-size:var(--text-lg);text-transform:uppercase;margin:0 0 var(--space-sm);text-align:center;">Disable MFA</h3>
        <p style="font-family:'VCR',sans-serif;font-size:var(--text-sm);color:#ddd;text-align:center;margin-bottom:var(--space-md);line-height:1.4;">Enter your current password to confirm disabling Multi-Factor Authentication.</p>
        <input id="modal-mfa-pass" type="password" placeholder="PASSWORD" class="login-card__input" style="margin-bottom:var(--space-xs); background: rgba(255,255,255,0.1); border-color: #555;" />
        <p id="modal-mfa-msg" style="font-family:'VCR',sans-serif;font-size:var(--text-sm);font-weight:bold;min-height:1.2em;text-align:center;margin:0 0 var(--space-sm);color:var(--accent-red);"></p>
        <div style="display:flex;gap:var(--space-sm);">
          <button id="modal-mfa-cancel" style="flex:1;background:transparent;border:2px solid #555; color:#fff; font-family:'VCR',sans-serif; padding:8px; cursor:pointer;">CANCEL</button>
          <button id="modal-mfa-confirm" style="flex:1;background:var(--accent-orange);border:2px solid #111; color:#111; font-family:'VCR',sans-serif; font-weight:bold; padding:8px; cursor:pointer;">CONFIRM</button>
        </div>
      </div>
    `;

    const input = overlay.querySelector('#modal-mfa-pass');
    const msg = overlay.querySelector('#modal-mfa-msg');
    const confirmBtn = overlay.querySelector('#modal-mfa-confirm');
    const cancelBtn = overlay.querySelector('#modal-mfa-cancel');

    setTimeout(() => input.focus(), 50);
    const closeModal = () => overlay.remove();
    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    const submit = async () => {
      const password = input.value;
      if (!password) {
        msg.textContent = 'Password is required.';
        return;
      }

      confirmBtn.textContent = 'DISABLING...';
      confirmBtn.disabled = true;

      try {
        const res = await fetch('/auth/mfa/disable', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          updateUI_cb(false);
          closeModal();
          DialogueBox.show('MFA has been disabled.', 'SECURITY');
        } else {
          msg.textContent = data.error || 'Failed to disable MFA.';
          confirmBtn.textContent = 'CONFIRM';
          confirmBtn.disabled = false;
        }
      } catch (err) {
        msg.textContent = 'Network error.';
        confirmBtn.textContent = 'CONFIRM';
        confirmBtn.disabled = false;
      }
    };

    confirmBtn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') closeModal(); });
  },

  onLeave() {
  }
};
