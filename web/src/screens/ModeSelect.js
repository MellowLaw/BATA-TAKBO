/**
 * ModeSelect — Choose between Normal and Normal Mode (wave replay) for a chapter.
 * Uses the same flip-card mechanic as ChapterSelect.
 * Flow: ChapterSelect → ModeSelect → CharacterSelect
 */
import { state } from '../utils/StateManager.js';

export const ModeSelect = {
  render(params = {}) {
    const chapterId = params.chapterId || 1;
    const progress = state.get('chapterProgress') || {};
    const completed = progress.chaptersCompleted || [];
    const chapterCleared = completed.includes(chapterId);

    return `
      <div class="chapter-select screen" id="mode-select-screen">
        <div class="ambient-stars"></div>
        <div class="ambient-glow"></div>
        <button class="back-btn" id="btn-ms-back">Back</button>

        <h1 class="screen-title" style="animation: fadeInUp 0.5s ease forwards;">
          PILIIN ANG LABAN
        </h1>
        <p class="ch-hint">Pumili ng iyong landas &nbsp;·&nbsp; normal o walang katapusan.</p>

        <div class="chapter-select__cards" style="justify-content: center;">

          <!-- NORMAL MODE CARD -->
          <div class="ch-flip-wrapper unlocked" id="ms-card-normal" style="animation-delay: 0.08s">
            <div class="ch-flip-inner">
              <div class="ch-face ch-face--back">
                <img src="/assets/ui/chapter-selection/chapter-back.png" alt="Normal" />
              </div>
              <div class="ch-face ch-face--front">
                <img src="/assets/ui/chapter-selection/normal_mode.png" alt="Normal Mode" style="width: 100%; height: 100%; object-fit: cover; border-radius: 10px;" />
              </div>
            </div>
          </div>

          <!-- NORMAL MODE WAVE CARD -->
          <div class="ch-flip-wrapper ${chapterCleared ? 'unlocked' : 'locked'}" id="ms-card-inf" style="animation-delay: 0.2s">
            <div class="ch-flip-inner">
              <div class="ch-face ch-face--back">
                <img src="/assets/ui/chapter-selection/chapter-back.png" alt="Normal Mode" />
              </div>
              <div class="ch-face ch-face--front">
                ${chapterCleared ? `
                  <img src="/assets/ui/chapter-selection/endless_mode.png" alt="Normal Mode" style="width: 100%; height: 100%; object-fit: cover; border-radius: 10px;" />
                ` : `
                  <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-secondary); border: 2px solid var(--text-primary); border-radius: 10px; gap: 10px; box-sizing: border-box;">
                    <div style="font-size:clamp(1.5rem,3vw,2.5rem); color:var(--text-secondary); line-height:1;"><i class="fas fa-lock"></i></div>
                    <div style="font-family:'VCR',monospace; font-size:clamp(0.55rem,1.2vw,0.8rem); color:var(--text-secondary); text-align:center; padding: 0 8px;">
                      I-clear muna ang chapter<br>para ma-unlock
                    </div>
                  </div>
                `}
              </div>
            </div>
          </div>

        </div>
      </div>
    `;
  },

  onEnter(el, params = {}) {
    this._params = params;
    const chapterId = params.chapterId || 1;

    el.querySelector('#btn-ms-back').addEventListener('click', () => {
      window.__screenManager.back();
    });

    const isTouchDevice = () => window.matchMedia('(hover: none)').matches;

    const navigate = (isEndless) => {
      window.__screenManager.navigate('character-select', { chapterId, isEndless });
    };

    // Normal card
    const normalCard = el.querySelector('#ms-card-normal');
    normalCard.addEventListener('click', () => {
      navigate(false);
    });

    // Endless Mode wave card (only if unlocked)
    const infCard = el.querySelector('#ms-card-inf');
    if (infCard.classList.contains('unlocked')) {
      infCard.addEventListener('click', () => {
        navigate(true);
      });
    }
  },

  onLeave() {},
};
