/**
 * CharacterSelect — Two-step full-screen flow matching the chapter-select style.
 * Step 1: Choose Your Vessel (character portrait)
 * Step 2: Choose Your Movement (hand gesture / keyboard)
 */
import { state } from '../utils/StateManager.js';
import { DialogueBox } from '../utils/DialogueBox.js';
import { gestureController } from '../gesture/GestureController.js';

export const CharacterSelect = {
  render() {
    return `
      <div class="cs-screen screen">
        <div class="ambient-stars"></div>
        <div class="ambient-glow"></div>

        <button class="back-btn" id="btn-cs-back">Back</button>

        <!-- ══ STEP 1: CHARACTER ══ -->
        <div class="cs-step" id="cs-step-1">
          <h1 class="screen-title" style="animation: fadeInUp 0.5s ease forwards;">
            Sino ka?
          </h1>
          <p class="cs-sub">Sino ang mas angat?</p>

          <div class="cs-items">
            <div class="cs-item" data-gender="male" style="animation-delay:0.08s">
              <div class="cs-portrait">
                <img class="cs-portrait-img" src="/assets/ui/m.png" alt="Jose" draggable="false" />
              </div>
              <span class="cs-name">Jose</span>
              <span class="cs-tag">Ang Matapang na <br> mandirigma ng Purok 1</span>
            </div>

            <div class="cs-item" data-gender="female" style="animation-delay:0.18s">
              <div class="cs-portrait">
                <img class="cs-portrait-img" src="/assets/ui/w.png" alt="Maria" draggable="false" />
              </div>
              <span class="cs-name">Maria</span>
              <span class="cs-tag">Ang Matalinong at Mautak na <br> marilag ng San Sinukob</span>
            </div>
          </div>
        </div>

        <!-- ══ STEP 2: CONTROL ══ -->
        <div class="cs-step cs-step--hidden" id="cs-step-2">
          <h1 class="screen-title" style="animation: fadeInUp 0.5s ease forwards;">
            CHOOSE YOUR MOVEMENT
          </h1>
          <p class="cs-sub">How will you move through the shadows?</p>

          <div class="cs-items">
            <div class="cs-item cs-item--ctrl" data-control="gesture" style="animation-delay:0.08s">
              <img class="cs-ctrl-icon" src="/assets/ui/hand_gesture.png" alt="Hand Gesture" draggable="false" />
              <span class="cs-name">Hand Gesture</span>
              <span class="cs-tag">Camera-based</span>
            </div>

            <div class="cs-item cs-item--ctrl" data-control="keyboard" style="animation-delay:0.18s">
              <img class="cs-ctrl-icon" src="/assets/ui/keyboard_gesture.png" alt="Keyboard" draggable="false" />
              <span class="cs-name">Keyboard / D-Pad</span>
              <span class="cs-tag">Arrow keys or touch</span>
            </div>
          </div>
        </div>

      </div>
    `;
  },

  onEnter(el, params) {
    this._params  = params || {};
    this._animIds = [];
    this._gender  = null;
    this._control = null; // 'gesture' or 'keyboard'

    // ── Back / step navigation ───────────────────────────────────────────────
    const step1 = el.querySelector('#cs-step-1');
    const step2 = el.querySelector('#cs-step-2');
    const backBtn = el.querySelector('#btn-cs-back');

    backBtn.addEventListener('click', () => {
      if (!step2.classList.contains('cs-step--hidden')) {
        // Go back to step 1
        step2.classList.add('cs-step--hidden');
        step1.classList.remove('cs-step--hidden');
      } else {
        window.__screenManager.back();
      }
    });

    // ── Step 1: pick character → advance to step 2 ──────────────────────────
    step1.querySelectorAll('.cs-item').forEach(item => {
      item.addEventListener('click', () => {
        this._gender = item.dataset.gender;
        step1.classList.add('cs-step--hidden');
        step2.classList.remove('cs-step--hidden');
      });
    });

    // ── Step 2: pick control → navigate ─────────────────────────────────────
    step2.querySelectorAll('.cs-item').forEach(item => {
      item.addEventListener('click', () => {
        const control = item.dataset.control;
        this._control = control;

        const gender = this._gender;
        if (!gender) return;

        if (control === 'gesture') {
          // Check actual gesture counts - not just state flags which can be stale
          const counts = gestureController.getSampleCounts();
          const hasTrainedGestures = Object.values(counts).some(c => c >= 50);
          if (!hasTrainedGestures) {
            // Show popup explaining gestures need to be set up first
            const dialogue = new DialogueBox('cs-step-2');
            dialogue.show({
              text: "Hand Gesture controls require a quick setup! You'll train the game to recognize your hand movements. This takes about 2 minutes.",
              portrait: '/assets/entity/character-icon/character.png',
              position: 'center',
              subtext: 'Setup Required',
              buttons: [
                { label: 'Go to Setup', action: 'setup', style: 'primary' },
                { label: 'Pick Keyboard Instead', action: 'keyboard', style: 'subtle' }
              ]
            }, (action) => {
              dialogue.hide();
              if (action === 'setup') {
                // Send to gesture training
                window.__screenManager.navigate('gesture-training', {
                  fromCharSelect: true,
                  chapterId: this._params.chapterId || 1,
                  isEndless: this._params.isEndless || false,
                });
              } else if (action === 'keyboard') {
                // Switch to keyboard control instead
                item.classList.remove('active');
                const keyboardItem = step2.querySelector('[data-control="keyboard"]');
                if (keyboardItem) keyboardItem.click();
              }
            });
            return;
          }
        }

        state.set('selectedCharacter', gender);
        state.set('selectedControl', control);
        const chapterId = this._params.chapterId || 1;
        const isEndless = this._params.isEndless || false;
        window.__screenManager.navigate('game-screen', { chapterId, character: gender, control, isEndless });
      });
    });
  },

  onLeave() {
    this._animIds.forEach(id => cancelAnimationFrame(id));
    this._animIds = [];
  },
};
