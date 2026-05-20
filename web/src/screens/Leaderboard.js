/**
 * Leaderboard — Endless Mode per-chapter leaderboard
 * Tabs: Chapter (CH1/CH2/CH3) × Control (Keyboard/Gesture) × Sort (Waves/Score)
 * Fetches from /leaderboard/endless?chapterId&controlType&sortBy
 */
import { state } from '../utils/StateManager.js';

export const Leaderboard = {
  render() {
    return `
      <div class="leaderboard-screen screen">
        <button class="back-btn" id="btn-lb-back">Back</button>

        <h1 class="screen-title" style="animation: fadeInUp 0.4s ease forwards; margin-bottom: var(--space-sm);">
          LEADERBOARD
        </h1>

        <p class="lb-subtitle">ENDLESS MODE - WALANG KATAPUSAN</p>

        <!-- Leaderboard List with Top 3 Special Styling -->
        <div class="leaderboard-container" id="leaderboard-container" style="animation: fadeInUp 0.4s ease 0.1s forwards; opacity: 0;">
          <div class="lb-loading" id="lb-loading-state">
            <div class="lb-loading-spinner"></div>
            <span>Loading rankings...</span>
          </div>
        </div>

        <!-- Bottom Bar: Personal Stats + Filters -->
        <div class="lb-bottom-bar" style="animation: fadeInUp 0.4s ease 0.2s forwards; opacity: 0;">
          
          <!-- Personal Stats Card -->
          <div class="lb-personal-stats" id="lb-personal-stats" style="display: none;">
            <img class="lb-personal-avatar" id="lb-personal-avatar" src="/assets/ui/User Profiles/Icons_01.png" alt="You" onerror="this.src='/assets/ui/User Profiles/Icons_01.png'" />
            <div class="lb-personal-info">
              <div class="lb-personal-label">YOUR BEST</div>
              <div class="lb-personal-rank" id="lb-personal-rank">---</div>
            </div>
            <div class="lb-personal-divider-v"></div>
            <div class="lb-personal-stats-col">
              <div class="lb-personal-stat">
                <span class="lb-personal-val" id="lb-personal-waves">-</span>
                <span class="lb-personal-stat-label">waves</span>
              </div>
              <div class="lb-personal-stat">
                <span class="lb-personal-val" id="lb-personal-time">--:--</span>
                <span class="lb-personal-stat-label">time</span>
              </div>
              <div class="lb-personal-stat">
                <span class="lb-personal-val" id="lb-personal-score">-</span>
                <span class="lb-personal-stat-label">score</span>
              </div>
            </div>
          </div>

          <!-- Filter Groups Container -->
          <div class="lb-filters-container">
            
            <!-- Chapter Filter -->
            <div class="lb-filter-group">
              <span class="lb-filter-label">Chapter</span>
              <div class="leaderboard-tabs" id="lb-chapter-tabs">
                <button class="leaderboard-tab active" data-chapter="1">CH1</button>
                <button class="leaderboard-tab" data-chapter="2">CH2</button>
                <button class="leaderboard-tab" data-chapter="3">CH3</button>
              </div>
            </div>

            <!-- Control Filter -->
            <div class="lb-filter-group">
              <span class="lb-filter-label">Control</span>
              <div class="leaderboard-tabs" id="lb-control-tabs">
                <button class="leaderboard-tab lb-icon-btn active" data-control="keyboard" id="tab-keyboard" title="Keyboard">
                  <img src="/assets/ui/dpad.png" alt="Keyboard" class="lb-control-icon" />
                </button>
                <button class="leaderboard-tab lb-icon-btn" data-control="gesture" id="tab-gesture" title="Gesture">
                  <img src="/assets/ui/hand.png" alt="Gesture" class="lb-control-icon" />
                </button>
              </div>
            </div>

            <!-- Sort Filter -->
            <div class="lb-filter-group">
              <span class="lb-filter-label">Sort By</span>
              <div class="leaderboard-tabs" id="lb-sort-tabs">
                <button class="leaderboard-tab active" data-sort="waves">WAVES</button>
                <button class="leaderboard-tab" data-sort="score">SCORE</button>
              </div>
            </div>

          </div>
        </div>

        <div id="lb-guest-notice" class="lb-guest-notice" style="animation: fadeInUp 0.4s ease 0.3s forwards; opacity: 0;">
          <p>Sign in and complete a chapter to submit your score!</p>
          <button class="menu-btn" id="btn-lb-signin">Sign In / Register</button>
        </div>
      </div>
    `;
  },

  onEnter(el) {
    this._activeChapter = 1;
    this._activeControl = 'keyboard';
    this._activeSort = 'waves';

    el.querySelector('#btn-lb-back').addEventListener('click', () => {
      window.__screenManager.back();
    });

    // Guest notice
    if (!state.get('isAuthenticated')) {
      const guestNotice = el.querySelector('#lb-guest-notice');
      if (guestNotice) {
        guestNotice.style.display = 'flex';
        const signinBtn = el.querySelector('#btn-lb-signin');
        if (signinBtn) signinBtn.addEventListener('click', () => window.__screenManager.navigate('login-screen'));
      }
    }

    // Chapter tab switching
    el.querySelectorAll('#lb-chapter-tabs .leaderboard-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        el.querySelectorAll('#lb-chapter-tabs .leaderboard-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._activeChapter = Number(tab.dataset.chapter);
        this._loadBoard(el);
      });
    });

    // Control tab switching
    el.querySelectorAll('#lb-control-tabs .leaderboard-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        el.querySelectorAll('#lb-control-tabs .leaderboard-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._activeControl = tab.dataset.control;
        this._loadBoard(el);
      });
    });

    // Sort-by tab switching (WAVES / SCORE)
    el.querySelectorAll('#lb-sort-tabs .leaderboard-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        el.querySelectorAll('#lb-sort-tabs .leaderboard-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._activeSort = tab.dataset.sort;
        this._loadBoard(el);
      });
    });

    // Initial load
    this._loadBoard(el);
  },

  async _loadBoard(el) {
    const chapterId = this._activeChapter;
    const controlType = this._activeControl;
    const sortBy = this._activeSort || 'waves';
    const container = el.querySelector('#leaderboard-container');
    const personalStatsEl = el.querySelector('#lb-personal-stats');
    
    container.innerHTML = `
      <div class="lb-loading">
        <div class="lb-loading-spinner"></div>
        <span>Loading rankings...</span>
      </div>`;
    if (personalStatsEl) personalStatsEl.style.display = 'none';

    try {
      // Fetch both leaderboard and user's personal record in parallel
      const isAuth = state.get('isAuthenticated');
      const [lbRes, myRankRes] = await Promise.all([
        fetch(`/leaderboard/endless?chapterId=${chapterId}&controlType=${controlType}&sortBy=${sortBy}`),
        isAuth ? fetch(`/leaderboard/my-rank?chapterId=${chapterId}&controlType=${controlType}&sortBy=${sortBy}`, { credentials: 'include' }) : Promise.resolve(null)
      ]);

      if (!lbRes.ok) throw new Error('fetch failed');
      const { entries } = await lbRes.json();

      // Render personal stats (or no-record message)
      if (myRankRes && myRankRes.ok) {
        const myData = await myRankRes.json();
        if (myData.hasRecord) {
          this._renderPersonalStats(el, myData);
        } else {
          this._renderNoPersonalStats(el);
        }
      }

      if (!entries || entries.length === 0) {
        container.innerHTML = `
          <div class="lb-empty-state">
            <div class="lb-empty-icon">[FLAG]</div>
            <p>No scores yet for this chapter.</p>
            <p class="lb-empty-sub">Be the first to survive!</p>
          </div>`;
        return;
      }

      const currentUser = state.get('user')?.username;

      // Render all entries with special styling for top 3
      container.innerHTML = entries.map((entry, i) => {
        const rank = i + 1;
        const isMe = currentUser && entry.username === currentUser;
        const mm = Math.floor((entry.survival_seconds||0) / 60).toString().padStart(2,'0');
        const ss = ((entry.survival_seconds||0) % 60).toString().padStart(2,'0');
        
        // Get ordinal suffix (1st, 2nd, 3rd, 4th...)
        const getOrdinal = (n) => {
          if (n > 3 && n < 21) return 'th';
          switch (n % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
          }
        };
        const ordinal = getOrdinal(rank);
        
        // Get medal image for top 3 + ordinal text
        let rankBadge = '';
        let rowClass = '';
        if (rank === 1) {
          rankBadge = `
            <img src="/assets/ui/gold.png" alt="1st" class="lb-medal" />
            <span class="lb-place">1<span class="lb-ordinal">st</span></span>
          `;
          rowClass = 'lb-row-gold';
        } else if (rank === 2) {
          rankBadge = `
            <img src="/assets/ui/silver.png" alt="2nd" class="lb-medal" />
            <span class="lb-place">2<span class="lb-ordinal">nd</span></span>
          `;
          rowClass = 'lb-row-silver';
        } else if (rank === 3) {
          rankBadge = `
            <img src="/assets/ui/bronze.png" alt="3rd" class="lb-medal" />
            <span class="lb-place">3<span class="lb-ordinal">rd</span></span>
          `;
          rowClass = 'lb-row-bronze';
        } else {
          rankBadge = `<span class="lb-place">${rank}<span class="lb-ordinal">${ordinal}</span></span>`;
        }
        
        // Get avatar image - use avatar_url if available, otherwise fallback to preset based on username
        const avatarUrl = entry.avatar_url || this._getPresetAvatar(entry.username);
        const fallbackAvatar = this._getPresetAvatar(entry.username);
        const avatarHtml = `<img src="${avatarUrl}" alt="${entry.username}" class="lb-avatar-img" onerror="this.src='${fallbackAvatar}'" />`;
        
        const wavesDisplay = sortBy === 'waves' 
          ? `<span class="lb-val-highlight">${entry.waves_survived||0}</span>`
          : `<span class="lb-val-normal">${entry.waves_survived||0}</span>`;
          
        const scoreDisplay = sortBy === 'score'
          ? `<span class="lb-val-highlight">${Number(entry.score).toLocaleString()}</span>`
          : `<span class="lb-val-normal">${Number(entry.score).toLocaleString()}</span>`;
        
        return `
          <div class="lb-entry ${rowClass} ${isMe ? 'lb-entry--me' : ''}"
               style="animation: slideInLeft 0.3s ease forwards; animation-delay: ${i * 0.06}s; opacity: 0;">
            <div class="lb-rank">${rankBadge}</div>
            <div class="lb-avatar">
              ${avatarHtml}
            </div>
            <div class="lb-player">
              <span class="lb-player-name">${entry.username}${isMe ? ' <span class="lb-you">(you)</span>' : ''}</span>
            </div>
            <div class="lb-stats">
              <div class="lb-stat">
                <span class="lb-stat-label">WAVES</span>
                <span class="lb-stat-val">${wavesDisplay}</span>
              </div>
              <div class="lb-stat">
                <span class="lb-stat-label">TIME</span>
                <span class="lb-stat-val">${mm}:${ss}</span>
              </div>
              <div class="lb-stat">
                <span class="lb-stat-label">SCORE</span>
                <span class="lb-stat-val">${scoreDisplay}</span>
              </div>
            </div>
          </div>
        `;
      }).join('') + `
        <div class="lb-list-end">
          <span>--- End of Rankings ---</span>
        </div>
      `;

    } catch (e) {
      container.innerHTML = `
        <div class="lb-error">
          <div class="lb-error-icon">[X]</div>
          <p>Could not load leaderboard.</p>
          <button class="lb-retry-btn" onclick="location.reload()">Try Again</button>
        </div>`;
    }
  },

  _getPresetAvatar(username) {
    // Generate a consistent preset avatar based on username hash
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = ((hash << 5) - hash) + username.charCodeAt(i);
      hash = hash & hash;
    }
    const num = (Math.abs(hash) % 40 + 1).toString().padStart(2, '0');
    return `/assets/ui/User Profiles/Icons_${num}.png`;
  },

  _renderPersonalStats(el, data) {
    const statsEl = el.querySelector('#lb-personal-stats');
    if (!statsEl) return;

    const currentUser = state.get('user')?.username;
    console.log('[Leaderboard] Rendering personal stats for user:', currentUser, 'avatarUrl:', data.avatarUrl);
    
    const mm = Math.floor((data.survivalSeconds || 0) / 60).toString().padStart(2, '0');
    const ss = ((data.survivalSeconds || 0) % 60).toString().padStart(2, '0');

    // Update avatar - use avatarUrl from API if available, otherwise fall back to preset
    const avatarEl = el.querySelector('#lb-personal-avatar');
    if (avatarEl) {
      const avatarUrl = data.avatarUrl 
        ? data.avatarUrl 
        : (currentUser ? this._getPresetAvatar(currentUser) : '/assets/ui/User Profiles/Icons_01.png');
      console.log('[Leaderboard] Setting avatar URL:', avatarUrl);
      avatarEl.src = avatarUrl;
      avatarEl.style.display = 'block';
    }

    // Update individual elements
    const rankEl = el.querySelector('#lb-personal-rank');
    const wavesEl = el.querySelector('#lb-personal-waves');
    const timeEl = el.querySelector('#lb-personal-time');
    const scoreEl = el.querySelector('#lb-personal-score');

    if (rankEl) rankEl.textContent = data.rank ? `#${data.rank.toLocaleString()}` : '---';
    if (wavesEl) wavesEl.textContent = data.wavesSurvived || 0;
    if (timeEl) timeEl.textContent = `${mm}:${ss}`;
    if (scoreEl) scoreEl.textContent = data.score ? data.score.toLocaleString() : '0';

    statsEl.style.display = 'flex';
    statsEl.classList.remove('lb-personal-stats--empty');
  },

  _renderNoPersonalStats(el) {
    const statsEl = el.querySelector('#lb-personal-stats');
    if (!statsEl) return;

    const currentUser = state.get('user')?.username;
    console.log('[Leaderboard] Rendering no personal stats for user:', currentUser);
    
    const avatarEl = el.querySelector('#lb-personal-avatar');
    if (avatarEl) {
      const avatarUrl = currentUser ? this._getPresetAvatar(currentUser) : '/assets/ui/User Profiles/Icons_01.png';
      avatarEl.src = avatarUrl;
      avatarEl.style.display = 'block';
    }

    const rankEl = el.querySelector('#lb-personal-rank');
    const wavesEl = el.querySelector('#lb-personal-waves');
    const timeEl = el.querySelector('#lb-personal-time');
    const scoreEl = el.querySelector('#lb-personal-score');

    if (rankEl) rankEl.textContent = '---';
    if (wavesEl) wavesEl.textContent = '-';
    if (timeEl) timeEl.textContent = '--:--';
    if (scoreEl) scoreEl.textContent = '-';

    statsEl.style.display = 'flex';
    statsEl.classList.add('lb-personal-stats--empty');
  }
};
