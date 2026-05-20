import { state } from '../utils/StateManager.js';

export const ResultsScreen = {
  render() {
    const result = state.get('lastGameResult') || { isVictory: false, score: 0, timeSurvived: 0 };
    
    // Format mm:ss
    const m = Math.floor(result.timeSurvived / 60).toString().padStart(2, '0');
    const s = Math.floor(result.timeSurvived % 60).toString().padStart(2, '0');
    
    const isVictory = result.isVictory;
    const isEndless = result.isEndless === true;
    const wavesSurvived = result.wavesSurvived || 0;
    const chapterLabel = result.chapterId === 1 ? 'CH1' : result.chapterId === 2 ? 'CH2' : 'CH3';
    const isGesture = result.control === 'gesture';

    if (isEndless) {
      return `
        <div class="results-screen screen results-screen--endless" style="
          position: relative; display: flex; align-items: stretch; background: #000; overflow: hidden;
        ">
          ${isGesture ? `
          <img id="kill-cam-bg" style="
            position: absolute; inset: 0; width: 100%; height: 100%;
            object-fit: cover; filter: sepia(80%) brightness(0.4) saturate(1.6) hue-rotate(20deg);
            transform: rotate(-5deg) scale(1.12); transform-origin: center; z-index: 0;
          " />
          <a id="btn-download-killcam" href="#" download="bata_takbo_endless.png" style="
            position: absolute; top: 20px; right: 24px; z-index: 10; color: white;
            text-decoration: none; opacity: 0; transition: opacity 0.4s;
          ">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </a>
          ` : `
          <img id="boss-static-bg" src="/assets/ui/backgrounds/result_screen_dpad.png" style="
            position: absolute; inset: 0; width: 100%; height: 100%;
            object-fit: cover; object-position: center;
            filter: brightness(0.6);
            z-index: 0;
            opacity: 0.9;
            animation: jumpscare 2.5s ease-out;
          " onerror="this.style.display='none'" />
          `}
          <div style="
            position: absolute; inset: 0;
            background: linear-gradient(to right, rgba(0,0,0,0.97) 30%, rgba(0,0,0,0.6) 60%, transparent 100%);
            z-index: 1;
          "></div>
          <div style="
            position: relative; z-index: 2;
            width: clamp(60%, 65%, 70%);
            display: flex; flex-direction: column; justify-content: center;
            padding: clamp(16px,4vw,40px) clamp(16px,3vw,40px) clamp(16px,4vw,40px) clamp(20px,8vw,100px);
          ">
            <div id="results-placement" style="margin-bottom:clamp(16px,3vh,32px); text-align:left;"></div>
            <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:clamp(12px,2vh,24px);">
              <div style="display:flex; align-items:baseline; gap:0; flex-wrap:wrap;">
                <span style="font-family:'GigaSaturn',sans-serif; font-size:clamp(0.75rem,1.8vw,1.4rem); color:rgba(255,255,255,0.9); min-width:clamp(120px,18vw,200px); letter-spacing:1px;">WAVES:</span>
                <span style="font-family:'GigaSaturn',sans-serif; font-size:clamp(0.85rem,2vw,1.6rem); color:#ffd700;">${wavesSurvived}</span>
              </div>
              <div style="display:flex; align-items:baseline; gap:0; flex-wrap:wrap;">
                <span style="font-family:'GigaSaturn',sans-serif; font-size:clamp(0.75rem,1.8vw,1.4rem); color:rgba(255,255,255,0.9); min-width:clamp(120px,18vw,200px); letter-spacing:1px;">SURVIVED:</span>
                <span style="font-family:'GigaSaturn',sans-serif; font-size:clamp(0.85rem,2vw,1.6rem); color:white;">${m}:${s}</span>
              </div>
              <div style="display:flex; align-items:baseline; gap:0; flex-wrap:wrap;">
                <span style="font-family:'GigaSaturn',sans-serif; font-size:clamp(0.75rem,1.8vw,1.4rem); color:rgba(255,255,255,0.9); min-width:clamp(120px,18vw,200px); letter-spacing:1px;">SCORE:</span>
                <span style="font-family:'GigaSaturn',sans-serif; font-size:clamp(0.85rem,2vw,1.6rem); color:#ffd700;">${result.score.toLocaleString()}</span>
              </div>
            </div>
            <hr style="border:0; border-top:2px solid rgba(255,215,0,0.5); margin:0 0 clamp(12px,3vh,32px) 0; width:60%;">
            <div id="endless-lb-status" style="display:none;"></div>
            <div style="display:flex; gap:clamp(16px,4vw,60px); align-items:center; flex-wrap:wrap;">
              <button class="menu-btn" id="btn-results-retry" style="
                font-family:'GigaSaturn',sans-serif; font-size:clamp(1rem,2.5vw,2rem);
                padding:0; margin:0; min-width:0; background:transparent; border:none; color:white;
                letter-spacing:2px; min-height:44px; touch-action:manipulation;
              ">RETRY</button>
              <button class="menu-btn" id="btn-results-lb" style="
                font-family:'GigaSaturn',sans-serif; font-size:clamp(1rem,2.5vw,2rem);
                padding:0; margin:0; min-width:0; background:transparent; border:none; color:#ffd700;
                letter-spacing:2px; min-height:44px; touch-action:manipulation;
              ">LEADERBOARD</button>
              <button class="menu-btn" id="btn-results-menu" style="
                font-family:'GigaSaturn',sans-serif; font-size:clamp(1rem,2.5vw,2rem);
                padding:0; margin:0; min-width:0; background:transparent; border:none; color:white;
                letter-spacing:2px; min-height:44px; touch-action:manipulation;
              ">MENU</button>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="results-screen screen" style="
        position: relative;
        display: flex; 
        align-items: stretch; 
        background: #000;
        overflow: hidden;
      ">

        ${isVictory ? `
          <!-- Victory Layout -->

          ${isGesture ? `
          <!-- Full-screen kill cam background (gold/sepia tint) -->
          <img id="kill-cam-bg" src="${imagesSrc[0] || ''}" style="
            position: absolute; inset: 0;
            width: 100%; height: 100%;
            object-fit: cover;
            filter: sepia(0.6) saturate(1.2) brightness(0.9);
            z-index: 0;
          " />

          <!-- Download button — top right -->
          <a id="btn-download-killcam" href="#" download="bata_takbo_victory.png" style="
            position: absolute;
            top: 20px; right: 24px;
            z-index: 10;
            color: white;
            text-decoration: none;
            opacity: 0;
            transition: opacity 0.4s;
          ">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </a>
          ` : `
          <img id="result-bg" src="/assets/ui/backgrounds/result_screen_dpad.png" style="
            position: absolute; inset: 0;
            width: 100%; height: 100%;
            object-fit: cover;
            filter: brightness(0.4);
            z-index: 0;
          " />
          `}

          <!-- Dark gradient overlay: heavy on left, transparent on right -->
          <div style="
            position: absolute; inset: 0;
            background: linear-gradient(to right, rgba(0,0,0,0.97) 30%, rgba(0,0,0,0.6) 60%, transparent 100%);
            z-index: 1;
          "></div>

          <!-- Left stats panel -->
          <div style="
            position: relative;
            z-index: 2;
            width: clamp(60%, 65%, 70%);
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: clamp(16px, 4vw, 40px) clamp(16px, 3vw, 40px) clamp(16px, 4vw, 40px) clamp(20px, 8vw, 100px);
          ">
            <!-- Title -->
            <h1 class="results-title" style="
              font-family: 'GigaSaturn', sans-serif;
              font-size: clamp(1.8rem, 6vw, 5.5rem);
              color: #ffd700;
              margin: 0 0 clamp(16px, 3vh, 40px) 0;
              line-height: 1;
              letter-spacing: 2px;
            ">CHAPTER CLEARED</h1>

            <!-- Stats rows -->
            <div class="results-stats" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: clamp(12px, 2vh, 30px);">
              <div style="display: flex; align-items: baseline; gap: 0; flex-wrap: wrap;">
                <span style="font-family: 'GigaSaturn', sans-serif; font-size: clamp(0.75rem, 1.8vw, 1.4rem); color: rgba(255,255,255,0.9); min-width: clamp(120px, 18vw, 200px); letter-spacing: 1px;">SURVIVAL TIME:</span>
                <span style="font-family: 'GigaSaturn', sans-serif; font-size: clamp(0.85rem, 2vw, 1.6rem); color: white;">${m}:${s}</span>
              </div>
              <div style="display: flex; align-items: baseline; gap: 0; flex-wrap: wrap;">
                <span style="font-family: 'GigaSaturn', sans-serif; font-size: clamp(0.75rem, 1.8vw, 1.4rem); color: rgba(255,255,255,0.9); min-width: clamp(120px, 18vw, 200px); letter-spacing: 1px;">TOTAL SCORE:</span>
                <span style="font-family: 'GigaSaturn', sans-serif; font-size: clamp(0.85rem, 2vw, 1.6rem); color: #ffd700;">${result.score.toLocaleString()}</span>
              </div>
            </div>

            <!-- Endless mode unlock message -->
            <div style="
              display: flex; align-items: center; gap: 10px;
              margin-bottom: clamp(10px, 2vh, 20px);
              padding: 10px 14px;
              background: rgba(255,215,0,0.08);
              border: 1px solid rgba(255,215,0,0.35);
              border-radius: 4px;
              max-width: clamp(260px, 45vw, 440px);
            ">
              <span style="font-size: clamp(1.4rem,3vw,2rem); line-height:1;">∞</span>
              <div>
                <div style="font-family:'GigaSaturn',sans-serif; font-size:clamp(0.6rem,1.4vw,1rem); color:#ffd700; letter-spacing:2px;">ENDLESS MODE UNLOCKED</div>
                <div style="font-family:'VCR',monospace; font-size:clamp(0.5rem,1.1vw,0.8rem); color:rgba(255,255,255,0.55); margin-top:2px;">You've unlocked endless battle mode!</div>
              </div>
            </div>

            <!-- Ch3 completion: bonus level text variant -->
            ${result.chapterId === 3 ? `
            <div style="
              display: flex; align-items: center; gap: 10px;
              margin-bottom: clamp(10px, 2vh, 20px);
              padding: 10px 14px;
              background: rgba(255,215,0,0.08);
              border: 1px solid rgba(255,215,0,0.35);
              border-radius: 4px;
              max-width: clamp(260px, 45vw, 440px);
            ">
              <span style="font-size: clamp(1.4rem,3vw,2rem); line-height:1;">★</span>
              <div>
                <div style="font-family:'GigaSaturn',sans-serif; font-size:clamp(0.6rem,1.4vw,1rem); color:#ffd700; letter-spacing:2px;">ALL CHAPTERS COMPLETED</div>
                <div style="font-family:'VCR',monospace; font-size:clamp(0.5rem,1.1vw,0.8rem); color:rgba(255,255,255,0.55); margin-top:2px;">The full story has been revealed</div>
              </div>
            </div>` : ''}

            <!-- Separator -->
            <hr class="results-separator" style="border: 0; border-top: 2px solid rgba(255,215,0,0.5); margin: 0 0 clamp(12px, 3vh, 40px) 0; width: 60%;">

            <!-- Action buttons -->
            <div class="results-actions" style="display: flex; gap: clamp(16px, 4vw, 60px); align-items: center; flex-wrap: wrap;">
              ${result.chapterId < 3 ? `<button class="menu-btn" id="btn-results-next" style="
                font-family: 'GigaSaturn', sans-serif;
                font-size: clamp(1rem, 2.5vw, 2rem);
                padding: 0; margin: 0; min-width: 0;
                background: transparent; border: none; color: #ffd700;
                letter-spacing: 2px; min-height: 44px; touch-action: manipulation;
              ">NEXT CHAPTER</button>` : ''}
              <button class="menu-btn" id="btn-results-endless" style="
                font-family: 'GigaSaturn', sans-serif;
                font-size: clamp(1rem, 2.5vw, 2rem);
                padding: 0; margin: 0; min-width: 0;
                background: transparent; border: none; color: #ffd700;
                letter-spacing: 2px; min-height: 44px; touch-action: manipulation;
              ">ENDLESS</button>
              <button class="menu-btn" id="btn-results-menu" style="
                font-family: 'GigaSaturn', sans-serif;
                font-size: clamp(1rem, 2.5vw, 2rem);
                padding: 0; margin: 0; min-width: 0;
                background: transparent; border: none; color: white;
                letter-spacing: 2px; min-height: 44px; touch-action: manipulation;
              ">MENU</button>
            </div>
          </div>
        ` : `
          <!-- Game Over Layout -->

          ${isGesture ? `
          <!-- Full-screen B&W collage background -->
          <img id="kill-cam-bg" style="
            position: absolute; inset: 0;
            width: 100%; height: 100%;
            object-fit: cover;
            filter: grayscale(100%) brightness(0.55);
            transform: rotate(-5deg) scale(1.12);
            transform-origin: center;
            z-index: 0;
          " />

          <!-- Download button — top right -->
          <a id="btn-download-killcam" href="#" download="bata_takbo_killcam.png" style="
            position: absolute;
            top: 20px; right: 24px;
            z-index: 10;
            color: white;
            text-decoration: none;
            opacity: 0;
            transition: opacity 0.4s;
          ">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </a>
          ` : `
          <img id="result-bg" src="/assets/ui/backgrounds/result_screen_dpad.png" style="
            position: absolute; inset: 0;
            width: 100%; height: 100%;
            object-fit: cover;
            z-index: 0;
          " />
          `}

          <!-- Dark gradient overlay: heavy on left, transparent on right -->
          <div style="
            position: absolute; inset: 0;
            background: linear-gradient(to right, rgba(0,0,0,0.97) 30%, rgba(0,0,0,0.6) 60%, transparent 100%);
            z-index: 1;
          "></div>

          <!-- Left stats panel -->
          <div style="
            position: relative;
            z-index: 2;
            width: clamp(60%, 65%, 70%);
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: clamp(16px, 4vw, 40px) clamp(16px, 3vw, 40px) clamp(16px, 4vw, 40px) clamp(20px, 8vw, 100px);
          ">
            <!-- GAME OVER title -->
            <h1 class="results-title" style="
              font-family: 'GigaSaturn', sans-serif;
              font-size: clamp(2rem, 8vw, 7.5rem);
              color: white;
              margin: 0 0 clamp(16px, 3vh, 40px) 0;
              line-height: 1;
              letter-spacing: 2px;
            ">GAME OVER</h1>

            <!-- Stats rows -->
            <div class="results-stats" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: clamp(12px, 2vh, 30px);">
              <div style="display: flex; align-items: baseline; gap: 0; flex-wrap: wrap;">
                <span style="font-family: 'GigaSaturn', sans-serif; font-size: clamp(0.75rem, 1.8vw, 1.4rem); color: rgba(255,255,255,0.9); min-width: clamp(120px, 18vw, 200px); letter-spacing: 1px;">SURVIVAL TIME:</span>
                <span style="font-family: 'GigaSaturn', sans-serif; font-size: clamp(0.85rem, 2vw, 1.6rem); color: white;">${m}:${s}</span>
              </div>
              <div style="display: flex; align-items: baseline; gap: 0; flex-wrap: wrap;">
                <span style="font-family: 'GigaSaturn', sans-serif; font-size: clamp(0.75rem, 1.8vw, 1.4rem); color: rgba(255,255,255,0.9); min-width: clamp(120px, 18vw, 200px); letter-spacing: 1px;">TOTAL SCORE:</span>
                <span style="font-family: 'GigaSaturn', sans-serif; font-size: clamp(0.85rem, 2vw, 1.6rem); color: white;">${result.score.toLocaleString()}</span>
              </div>
            </div>

            <!-- Separator -->
            <hr class="results-separator" style="border: 0; border-top: 2px solid rgba(255,255,255,0.5); margin: 0 0 clamp(12px, 3vh, 40px) 0; width: 60%;">

            <!-- Action buttons -->
            <div class="results-actions" style="display: flex; gap: clamp(16px, 4vw, 60px); align-items: center; flex-wrap: wrap;">
              <button class="menu-btn" id="btn-results-retry" style="
                font-family: 'GigaSaturn', sans-serif;
                font-size: clamp(1rem, 2.5vw, 2rem);
                padding: 0; margin: 0; min-width: 0;
                background: transparent; border: none; color: white;
                letter-spacing: 2px; min-height: 44px; touch-action: manipulation;
              ">RETRY</button>
              <button class="menu-btn" id="btn-results-menu" style="
                font-family: 'GigaSaturn', sans-serif;
                font-size: clamp(1rem, 2.5vw, 2rem);
                padding: 0; margin: 0; min-width: 0;
                background: transparent; border: none; color: white;
                letter-spacing: 2px; min-height: 44px; touch-action: manipulation;
              ">MENU</button>
            </div>
          </div>
        `}
      </div>
    `;
  },

  onEnter(el) {
    const result = state.get('lastGameResult') || { chapterId: 1, isVictory: false };
    const isVictory = result.isVictory;
    const isEndless = result.isEndless === true;

    if (isEndless) {
      // Wire endless buttons
      el.querySelector('#btn-results-retry').addEventListener('click', () => {
        window.__screenManager.navigate('game-screen', { chapterId: result.chapterId, character: result.character || 'male', control: result.control || 'keyboard', isEndless: true });
      });
      el.querySelector('#btn-results-menu').addEventListener('click', () => {
        window.__screenManager.navigate('main-menu');
      });
      const lbBtn = el.querySelector('#btn-results-lb');
      if (lbBtn) {
        lbBtn.addEventListener('click', () => {
          window.__screenManager.navigate('leaderboard');
        });
      }

      // Submit score to leaderboard if registered user
      this._submitEndlessScore(el, result);
      this.generateCollage(el, false);
      return;
    }

    // Trigger screen entrance animation
    const screen = el.querySelector('.results-screen');
    if (screen) {
      screen.classList.remove('victory-enter', 'gameover-enter');
      void screen.offsetWidth;
      screen.classList.add(isVictory ? 'victory-enter' : 'gameover-enter');
    }

    const btnNext = el.querySelector('#btn-results-next');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        window.__screenManager.navigate('game-screen', { chapterId: result.chapterId + 1, character: result.character || 'male', control: result.control || 'keyboard' });
      });
    }

    const btnRetry = el.querySelector('#btn-results-retry');
    if (btnRetry) {
      btnRetry.addEventListener('click', () => {
        window.__screenManager.navigate('game-screen', { chapterId: result.chapterId, character: result.character || 'male', control: result.control || 'keyboard' });
      });
    }

    const btnMenu = el.querySelector('#btn-results-menu');
    if (btnMenu) {
      btnMenu.addEventListener('click', () => {
        window.__screenManager.navigate('main-menu');
      });
    }

    const btnEndless = el.querySelector('#btn-results-endless');
    if (btnEndless) {
      btnEndless.addEventListener('click', () => {
        window.__screenManager.navigate('game-screen', { chapterId: result.chapterId, isEndless: true, character: result.character || 'male', control: result.control || 'keyboard' });
      });
    }

    // Always generate collage (both victory and game over)
    this.generateCollage(el, isVictory);
  },

  _getRankMessage(rank) {
    const messages = {
      1: "LEGENDARY! You've claimed the TOP SPOT!",
      2: "SO CLOSE! Silver medal - 2nd place!",
      3: "BRONZE GLORY! 3rd place podium finish!",
      4: "INCREDIBLE! You're 4th - almost on the podium!",
      5: "TOP 5! You're among the elite survivors!",
      6: "RANK 6! You're climbing the ranks fast!",
      7: "LUCKY 7! Keep pushing for the top!",
      8: "RANK 8! You're a rising star!",
      9: "SO CLOSE TO TOP 5! Rank 9 - impressive!",
      10: "TOP 10! You've earned your place among legends!"
    };
    return messages[rank] || null;
  },

  _getRankPhrase(rank) {
    if (rank === 1) return "The last one standing. The darkness bowed.";
    if (rank === 2) return "A single breath away from the top. Someone is still ahead of you.";
    if (rank === 3) return "Power. Precision. Almost untouchable.";
    if (rank >= 4 && rank <= 10) return "The shadows know your name. The top feels your presence.";
    if (rank >= 11 && rank <= 20) return "You're climbing. The darkness is starting to notice.";
    if (rank >= 21 && rank <= 50) return "Not forgotten. Not yet remembered. Keep running.";
    if (rank >= 51 && rank <= 100) return "One of the brave few who made it this far.";
    if (rank >= 101 && rank <= 500) return "You made the list. The crowd parts when you pass.";
    if (rank >= 501) return "The road is long. But you are still walking it.";
    return "You leave no mark yet. Return and carve your name.";
  },

  async _submitEndlessScore(el, result) {
    const statusEl = el.querySelector('#endless-lb-status');
    console.log('[ResultsScreen] _submitEndlessScore called, statusEl:', statusEl);
    console.log('[ResultsScreen] isAuthenticated:', state.get('isAuthenticated'));
    console.log('[ResultsScreen] result:', result);

    if (!state.get('isAuthenticated')) {
      console.log('[ResultsScreen] User not authenticated');
      if (statusEl) statusEl.textContent = 'Sign in to submit your score to the Endless Mode leaderboard!';
      return;
    }
    if (statusEl) statusEl.textContent = 'Submitting score...';
    const controlType = result.control === 'gesture' ? 'gesture' : 'keyboard';
    console.log('[ResultsScreen] Submitting with controlType:', controlType);

    try {
      const res = await fetch('/leaderboard/endless', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId: result.chapterId,
          score: result.score,
          wavesSurvived: result.wavesSurvived || 0,
          survivalSeconds: result.timeSurvived,
          controlType
        })
      });
      console.log('[ResultsScreen] Server response status:', res.status);

      if (res.ok) {
        const data = await res.json();
        console.log('[ResultsScreen] Server response data:', data);
        const bestRank = data.bestRank;
        console.log('[ResultsScreen] bestRank:', bestRank);

        if (bestRank && bestRank <= 10) {
          console.log('[ResultsScreen] Showing TOP 10 message!');
          const result = state.get('lastGameResult') || {};
          const chapterLabel = result.chapterId === 1 ? 'Chapter 1: Manananggal' : result.chapterId === 2 ? 'Chapter 2: Bungisngis' : 'Chapter 3: Kataw';
          const phrase = this._getRankPhrase(bestRank);
          const placementEl = el.querySelector('#results-placement');
          if (placementEl) {
            placementEl.innerHTML = `
              <div style="
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
              ">
                <span style="
                  font-family: 'VCR', monospace;
                  font-size: clamp(0.6rem, 1.2vw, 0.8rem);
                  color: rgba(255,215,0,0.8);
                  text-transform: uppercase;
                  letter-spacing: 3px;
                ">${chapterLabel}</span>
                <span style="
                  font-family: 'GigaSaturn', sans-serif;
                  font-size: clamp(1.6rem, 4vw, 3rem);
                  color: #ffd700;
                  font-weight: bold;
                  line-height: 1;
                  letter-spacing: 1px;
                ">YOUR NAME SITS AT #${bestRank}</span>
                <span style="
                  font-family: 'VCR', monospace;
                  font-size: clamp(0.75rem, 1.6vw, 1.1rem);
                  color: #ffd700;
                  font-style: italic;
                  line-height: 1.4;
                  margin-top: 4px;
                ">${phrase}</span>
              </div>
            `;
          }
        } else if (bestRank) {
          console.log('[ResultsScreen] Showing rank message with phrase');
          const phrase = this._getRankPhrase(bestRank);
          const result = state.get('lastGameResult') || {};
          const chapterLabel = result.chapterId === 1 ? 'Chapter 1: Manananggal' : result.chapterId === 2 ? 'Chapter 2: Bungisngis' : 'Chapter 3: Kataw';
          const placementEl = el.querySelector('#results-placement');
          if (placementEl) {
            placementEl.innerHTML = `
              <div style="
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
              ">
                <span style="
                  font-family: 'VCR', monospace;
                  font-size: clamp(0.6rem, 1.2vw, 0.8rem);
                  color: rgba(255,215,0,0.8);
                  text-transform: uppercase;
                  letter-spacing: 3px;
                ">${chapterLabel}</span>
                <span style="
                  font-family: 'GigaSaturn', sans-serif;
                  font-size: clamp(1.6rem, 4vw, 3rem);
                  color: #ffd700;
                  font-weight: bold;
                  line-height: 1;
                  letter-spacing: 1px;
                ">YOUR NAME SITS AT #${bestRank}</span>
                <span style="
                  font-family: 'VCR', monospace;
                  font-size: clamp(0.75rem, 1.6vw, 1.1rem);
                  color: #ffd700;
                  font-style: italic;
                  line-height: 1.4;
                  margin-top: 4px;
                ">${phrase}</span>
              </div>
            `;
          }
        } else {
          console.log('[ResultsScreen] No rank data, showing default message');
          if (statusEl) statusEl.textContent = '✓ Score submitted to Endless Mode leaderboard!';
        }
      } else {
        console.log('[ResultsScreen] Server returned error');
        if (statusEl) statusEl.textContent = 'Could not submit score.';
      }
    } catch (e) {
      console.error('[ResultsScreen] Error submitting score:', e);
      if (statusEl) statusEl.textContent = 'Offline — score not submitted.';
    }
  },

  generateCollage(el, isVictory = false) {
    const imagesSrc = state.get('killCamImages') || [];
    const bgImg = el.querySelector('#kill-cam-bg');
    const dlBtn = el.querySelector('#btn-download-killcam');

    if (imagesSrc.length === 0) {
      if (bgImg) bgImg.src = '/assets/ui/backgrounds/login_background.png';
      return;
    }

    const loadPromises = imagesSrc.map(src => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = src;
      });
    });

    const overlayPromise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = '/assets/ui/killcam_overlay.png';
    });

    Promise.all([Promise.all(loadPromises), overlayPromise]).then(([images, overlayImg]) => {
      const w = 400, h = 300;

      // --- Canvas 1: full-color base collage (no overlay) for BG display ---
      const baseCanvas = document.createElement('canvas');
      baseCanvas.width = w * 2;
      baseCanvas.height = h * 2;
      const baseCtx = baseCanvas.getContext('2d');
      baseCtx.fillStyle = '#000';
      baseCtx.fillRect(0, 0, baseCanvas.width, baseCanvas.height);

      const positions = [{x:0,y:0},{x:w,y:0},{x:0,y:h},{x:w,y:h}];
      if (images.length === 1) {
        baseCtx.drawImage(images[0], 0, 0, baseCanvas.width, baseCanvas.height);
      } else {
        images.forEach((img, i) => {
          if (i < 4) baseCtx.drawImage(img, positions[i].x, positions[i].y, w, h);
        });
      }

      // Set the B&W background (CSS grayscale handles the look on screen)
      bgImg.src = baseCanvas.toDataURL('image/png');

      // --- Canvas 2: full-color collage + overlay for download ---
      const dlCanvas = document.createElement('canvas');
      dlCanvas.width = baseCanvas.width;
      dlCanvas.height = baseCanvas.height;
      const dlCtx = dlCanvas.getContext('2d');
      dlCtx.drawImage(baseCanvas, 0, 0);
      if (overlayImg) {
        dlCtx.drawImage(overlayImg, 0, 0, dlCanvas.width, dlCanvas.height);
      }

      dlBtn.href = dlCanvas.toDataURL('image/png');
      dlBtn.style.opacity = '1';
    });
  }
};

