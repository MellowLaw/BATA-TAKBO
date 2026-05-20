/**
 * MainMenu — The main menu screen
 * Features animated background, floating title, and glowing menu buttons
 * Background music fades out when the player clicks Play, but keeps playing
 * for all other menu screens (How to Play, Gesture Setup, Settings, Leaderboard, About).
 */
import { state } from '../utils/StateManager.js';
import { isGuest, confirmGuestLeave } from '../utils/GuestGuard.js';

// Module-level audio instance so music persists while browsing sub-menus
let _bgMusic = null;
let _fadeInterval = null;


export const MainMenu = {
  render() {
    return `
      <div class="main-menu screen">
        <video class="main-menu__video" src="/assets/ui/backgrounds/animated_main_menu.mp4" autoplay loop muted playsinline style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0;"></video>
        <div class="main-menu__bg" style="background-image: none;"></div>
        <div class="main-menu__content">
          <div class="main-menu__title-wrapper">
            <img 
              src="/assets/ui/main-title.png" 
              alt="Bata, Takbo!" 
              class="main-menu__title"
              id="main-title-img"
            />
          </div>

          <nav class="main-menu__nav stagger-children" id="main-menu-nav">
            <button class="menu-btn" id="btn-play" data-screen="chapter-select">
              Play
            </button>
            <button class="menu-btn" id="btn-gesture" data-screen="gesture-training">
              Gesture Setup
            </button>
            <button class="menu-btn" id="btn-howtoplay" data-screen="how-to-play">
              How to Play
            </button>
            <button class="menu-btn" id="btn-leaderboard" data-screen="leaderboard">
              Leaderboard
            </button>
            <button class="menu-btn" id="btn-settings" data-screen="settings">
              Settings
            </button>
            <button class="menu-btn" id="btn-about" data-screen="about">
              About
            </button>
          </nav>
        </div>

        <div class="main-menu__version">v0.1.0</div>

        <div class="main-menu__top-right">
          <div
            id="icon-profile"
            title="Profile"
            style="
              width: clamp(44px,7vw,56px); height: clamp(44px,7vw,56px);
              border-radius: 50%; border: 2px solid rgba(255,255,255,0.2);
              cursor: pointer; overflow: hidden;
              background: #111; color: #e4cfc0;
              display: flex; align-items: center; justify-content: center;
              font-family: 'VCR', monospace; font-size: clamp(16px,2.5vw,22px);
              font-weight: bold; text-transform: uppercase;
              transition: border-color 0.2s ease;
            "
          >
<img id="profile-default-img" src="" alt="Profile"
              style="width:100%; height:100%; object-fit:cover; border-radius:50%; image-rendering:pixelated;" />
          </div>
        </div>
      </div>
    `;
  },

  onEnter(el, params = {}) {
    // ── Background Music ──────────────────────────────────────────────────
    this._startMusic();

    const nav = el.querySelector('#main-menu-nav');
    const buttons = nav.querySelectorAll('.menu-btn');

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetScreen = btn.dataset.screen;
        if (!targetScreen) return;

        const isPlay = btn.id === 'btn-play';

        // Flash animation (always)
        btn.style.animation = 'flashWhite 0.3s ease';

        if (isPlay) {
          // Fade music out, THEN navigate
          this._fadeOutMusic(800, () => {
            btn.style.animation = '';
            const hasSeenHowToPlay = state.get('tutorialComplete') || state.get('practiceTutorialComplete');
            if (hasSeenHowToPlay) {
              // Returning player — straight to chapter select
              window.__screenManager.navigate('chapter-select');
            } else {
              // First-time player — show How to Play, then chapter select
              window.__screenManager.navigate('how-to-play', { fromPlay: true });
            }
          });
        } else {
          // Music keeps playing; navigate after flash
          setTimeout(() => {
            btn.style.animation = '';
            window.__screenManager.navigate(targetScreen);
          }, 150);
        }
      });
    });

    const profileIcon = el.querySelector('#icon-profile');
    if (profileIcon) {
      profileIcon.addEventListener('click', () => {
        window.__screenManager.navigate('profile-screen');
      });

      // Populate the avatar asynchronously
      this._loadProfileAvatar(profileIcon);
    }

    // Check for admin and update title image
    this._checkAdminAndUpdateTitle(el);

    // Particles background effect
    this._createParticles(el);
  },

  onLeave() {
    // Music lifecycle is intentionally managed by the button click handlers:
    //   • Play button  → _fadeOutMusic() already paused & nulled _bgMusic
    //   • Other buttons → music keeps playing in the background while the
    //     player browses sub-menus (Spellbook, Settings, etc.)
    // Nothing to do here.
  },

  // ── Helpers ────────────────────────────────────────────────────────────

  _getVolume() {
    const s = state.get('settings');
    if (!s || !s.audio) return 0.4;
    if (s.audio.muted) return 0;
    const master = s.audio.master !== undefined ? s.audio.master : 0.8;
    const music = s.audio.music !== undefined ? s.audio.music : 0.8;
    return master * music * 0.5; // Scale slightly for balanced menu level
  },

  _startMusic() {
    const targetVolume = this._getVolume();
    if (_bgMusic) {
      // Already playing (e.g. returned from a sub-menu that kept music alive).
      // Only do a fade-in if it was paused or at a very low volume.
      if (!_bgMusic.paused && _bgMusic.volume >= targetVolume * 0.8 && targetVolume > 0) return;
      
      if (targetVolume === 0) {
        _bgMusic.pause();
      } else {
        _bgMusic.volume = targetVolume;
        _bgMusic.play().catch(() => {});
      }
      return;
    }

    _bgMusic = new Audio('/assets/audio/menu_bg_music.mp3');
    _bgMusic.loop = true;
    _bgMusic.volume = 0;
    
    if (targetVolume > 0) {
      _bgMusic.play().catch(() => {
        // Auto-play may be blocked; attach a one-shot user interaction listener
        const resume = () => {
          if (_bgMusic) _bgMusic.play().catch(() => {});
          document.removeEventListener('pointerdown', resume);
        };
        document.addEventListener('pointerdown', resume, { once: true });
      });
      this._fadeInMusic(1200);
    }
  },

  _stopMusic() {
    if (_fadeInterval) {
      clearInterval(_fadeInterval);
      _fadeInterval = null;
    }
    if (_bgMusic) {
      _bgMusic.pause();
      _bgMusic.currentTime = 0;
      _bgMusic = null;
    }
  },

  _fadeInMusic(durationMs) {
    if (!_bgMusic) return;
    if (_fadeInterval) clearInterval(_fadeInterval);

    const targetVolume = this._getVolume();
    if (targetVolume === 0) {
      _bgMusic.volume = 0;
      return;
    }
    
    const steps = 40;
    const stepTime = durationMs / steps;
    const increment = targetVolume / steps;

    _fadeInterval = setInterval(() => {
      if (!_bgMusic) { clearInterval(_fadeInterval); _fadeInterval = null; return; }
      _bgMusic.volume = Math.min(_bgMusic.volume + increment, targetVolume);
      if (_bgMusic.volume >= targetVolume) {
        clearInterval(_fadeInterval);
        _fadeInterval = null;
      }
    }, stepTime);
  },

  _fadeOutMusic(durationMs, onComplete) {
    if (!_bgMusic) { if (onComplete) onComplete(); return; }
    if (_fadeInterval) clearInterval(_fadeInterval);

    const startVolume = _bgMusic.volume;
    const steps = 40;
    const stepTime = durationMs / steps;
    const decrement = startVolume / steps;

    _fadeInterval = setInterval(() => {
      if (!_bgMusic) { clearInterval(_fadeInterval); _fadeInterval = null; if (onComplete) onComplete(); return; }
      _bgMusic.volume = Math.max(_bgMusic.volume - decrement, 0);
      if (_bgMusic.volume <= 0) {
        clearInterval(_fadeInterval);
        _fadeInterval = null;
        _bgMusic.pause();
        _bgMusic.currentTime = 0;
        _bgMusic = null;
        if (onComplete) onComplete();
      }
    }, stepTime);
  },

  _randomPresetIcon() {
    const n = (Math.floor(Math.random() * 40) + 1).toString().padStart(2, '0');
    return `/assets/ui/User Profiles/Icons_${n}.png`;
  },

  _getOrAssignPreset() {
    try {
      const stored = localStorage.getItem('bata_takbo_preset_avatar');
      if (stored) return stored;
      const preset = this._randomPresetIcon();
      localStorage.setItem('bata_takbo_preset_avatar', preset);
      return preset;
    } catch(e) {
      return this._randomPresetIcon();
    }
  },

  // Load avatar from /auth/profile and update the icon element
  async _loadProfileAvatar(iconEl) {
    // Set the persistent preset as the default immediately
    const defaultImg = iconEl.querySelector('#profile-default-img');
    if (defaultImg) defaultImg.src = this._getOrAssignPreset();

    try {
      const res = await fetch('/auth/profile', { credentials: 'include' });
      if (!res.ok) return; // guest or error — keep the preset
      const data = await res.json();

      if (data.avatar_url) {
        iconEl.innerHTML = `<img src="${data.avatar_url}" alt="avatar"
          style="width:100%;height:100%;object-fit:cover;border-radius:50%;image-rendering:pixelated;" />`;
      } else {
        // Logged in but no custom avatar — use persistent preset
        iconEl.innerHTML = `<img src="${this._getOrAssignPreset()}" alt="avatar"
          style="width:100%;height:100%;object-fit:cover;border-radius:50%;image-rendering:pixelated;" />`;
      }
    } catch (e) {
      // Network error or guest — preset already set above
    }
  },

  // Check if user is admin and update title image
  async _checkAdminAndUpdateTitle(el) {
    try {
      const res = await fetch('/admin/check', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.isAdmin) {
        const titleImg = el.querySelector('#main-title-img');
        if (titleImg) {
          titleImg.src = '/assets/ui/main-title-admin.png';
        }
      }
    } catch (e) {
      // Silent fail - keep default title
    }
  },

  _createParticles(container) {
    const bg = container.querySelector('.main-menu__bg');
    const particleCount = 15;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.style.cssText = `
        position: absolute;
        width: ${Math.random() * 4 + 2}px;
        height: ${Math.random() * 4 + 2}px;
        background: rgba(255, 107, 26, ${Math.random() * 0.3 + 0.1});
        border-radius: 50%;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation: particleFade ${Math.random() * 4 + 3}s ease-in-out infinite;
        animation-delay: ${Math.random() * 3}s;
        pointer-events: none;
        z-index: 1;
      `;
      bg.appendChild(particle);
    }
  },
};

export function updateMenuVolume() {
  if (_bgMusic) {
    const s = state.get('settings');
    if (!s || !s.audio) return;
    if (s.audio.muted) {
      _bgMusic.volume = 0;
      _bgMusic.pause();
    } else {
      const master = s.audio.master !== undefined ? s.audio.master : 0.8;
      const music = s.audio.music !== undefined ? s.audio.music : 0.8;
      const targetVol = master * music * 0.5;
      
      _bgMusic.volume = targetVol;
      if (targetVol > 0 && _bgMusic.paused) {
        _bgMusic.play().catch(() => {});
      } else if (targetVol === 0 && !_bgMusic.paused) {
        _bgMusic.pause();
      }
    }
  }
}

