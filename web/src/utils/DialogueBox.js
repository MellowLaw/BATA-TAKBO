/**
 * DialogueBox
 * Reusable pop-up dialogue component with typewriter effect.
 */

export class DialogueBox {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.warn(`DialogueBox: Container ${containerId} not found.`);
      return;
    }
    this.element = null;
    this.typewriterTimer = null;
  }

  /**
   * Show a dialogue box.
   * @param {Object} config 
   * @param {string} config.text - Main dialogue text
   * @param {string} config.subtext - Optional smaller text
   * @param {string} config.portrait - Optional image path
   * @param {Array} config.buttons - Array of {label, action, style}
   * @param {string} config.highlight - CSS selector to highlight
   * @param {string} config.position - "bottom", "center", "top"
   * @param {boolean} config.typewriter - Whether to animate text
   * @param {Function} onAction - Callback for button clicks, receives action string
   */
  show(config, onAction) {
    this.hide();

    const {
      text = '',
      subtext = '',
      portrait = null,
      portraitFrames = 1,   // If > 1, treat `portrait` as a horizontal sprite sheet
      buttons = [],
      highlight = null,
      position = 'bottom',
      typewriter = true,
      hideDialogue = false,
      overlay = false
    } = config;

    if (overlay) {
      this._createOverlay();
    } else {
      this._removeOverlay();
    }

    if (!hideDialogue) {
      this.element = document.createElement('div');
      this.element.className = `dialogue-box dialogue-box--${position}`;
    
    let portraitHtml = '';
    if (portrait) {
      if (portraitFrames > 1) {
        // Sprite-sheet portrait — rendered as a background so we can swap frames
        const bgSize = `${portraitFrames * 100}% 100%`;
        portraitHtml = `
          <div class="dialogue-box__portrait-container">
            <div class="dialogue-box__portrait dialogue-box__portrait--sheet"
                 data-frames="${portraitFrames}"
                 style="background-image: url('${portrait}'); background-size: ${bgSize}; background-position: 0% 0%;"></div>
          </div>
        `;
      } else {
        portraitHtml = `
          <div class="dialogue-box__portrait-container">
            <img src="${portrait}" alt="Portrait" class="dialogue-box__portrait" />
          </div>
        `;
      }
    }

    let buttonsHtml = '';
    if (buttons.length > 0) {
      buttonsHtml = `
        <div class="dialogue-box__buttons">
          ${buttons.map(b => `
            <button class="menu-btn ${b.style === 'subtle' ? 'menu-btn--subtle' : ''}" data-action="${b.action}">
              ${b.label}
            </button>
          `).join('')}
        </div>
      `;
    }

    let subtextHtml = '';
    if (subtext) {
      subtextHtml = `<div class="dialogue-box__subtext">${subtext}</div>`;
    }

    this.element.innerHTML = `
      <div class="dialogue-box__content-wrapper">
        ${portraitHtml}
        <div class="dialogue-box__text-area">
          <div class="dialogue-box__text" id="dialogue-text"></div>
          ${subtextHtml}
        </div>
      </div>
      ${buttonsHtml}
    `;

      document.body.appendChild(this.element);

      // Bind buttons
      const btnElements = this.element.querySelectorAll('button');
      btnElements.forEach(btn => {
        btn.addEventListener('click', () => {
          if (onAction) onAction(btn.dataset.action);
        });
      });

      // Handle text (and animate the portrait sprite if it's a sheet)
      const textContainer = this.element.querySelector('#dialogue-text');
      const portraitEl = this.element.querySelector('.dialogue-box__portrait--sheet');
      if (typewriter) {
        this._typeText(textContainer, text, portraitEl);
      } else {
        textContainer.innerHTML = text;
        this._resetPortraitFrame(portraitEl);
      }
    } else {
      // If we hide dialogue, we might still want to bind a skip/next button elsewhere?
      // For now, if hideDialogue is true, it relies on autoAdvance or external events.
    }

    // Handle highlight (works whether dialogue is hidden or not)
    this._handleHighlight(highlight);
  }

  hide() {
    if (this.typewriterTimer) {
      clearInterval(this.typewriterTimer);
      this.typewriterTimer = null;
    }
    if (this.portraitTimer) {
      clearInterval(this.portraitTimer);
      this.portraitTimer = null;
    }
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    this._clearHighlight();
    this._removeOverlay();
  }

  _typeText(container, text, portraitEl = null) {
    container.innerHTML = '';
    let i = 0;

    // Start portrait frame cycling (mouth-flap) while typing
    this._startPortraitAnim(portraitEl);

    this.typewriterTimer = setInterval(() => {
      // Very basic typewriter (doesn't handle HTML tags well, but fine for plain text)
      container.innerHTML += text.charAt(i);
      i++;
      if (i >= text.length) {
        clearInterval(this.typewriterTimer);
        this.typewriterTimer = null;
        // Typing done → settle the portrait back to frame 0 (idle)
        this._stopPortraitAnim(portraitEl);
        this._resetPortraitFrame(portraitEl);
      }
    }, 30);
  }

  _startPortraitAnim(el) {
    if (!el) return;
    if (this.portraitTimer) clearInterval(this.portraitTimer);
    const frames = parseInt(el.dataset.frames, 10) || 1;
    if (frames <= 1) return;
    let f = 0;
    this.portraitTimer = setInterval(() => {
      // Cycle through talking frames (1..frames-1), skipping idle frame 0
      f = (f + 1) % frames;
      const step = 100 / (frames - 1); // percent per frame
      el.style.backgroundPosition = `${f * step}% 0%`;
    }, 120);
  }

  _stopPortraitAnim(el) {
    if (this.portraitTimer) {
      clearInterval(this.portraitTimer);
      this.portraitTimer = null;
    }
  }

  _resetPortraitFrame(el) {
    if (!el) return;
    el.style.backgroundPosition = '0% 0%';
  }

  _handleHighlight(selector) {
    this._clearHighlight();
    if (!selector) return;
    
    const target = document.querySelector(selector);
    if (target) {
      target.classList.add('tutorial-highlight');
      this.highlightedElement = target;
    }
  }

  _clearHighlight() {
    if (this.highlightedElement) {
      this.highlightedElement.classList.remove('tutorial-highlight');
      this.highlightedElement = null;
    }
    // Also clear any stragglers
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
      el.classList.remove('tutorial-highlight');
    });
  }

  _createOverlay() {
    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.className = 'tutorial-overlay';
      document.body.appendChild(this.overlay);
    }
  }

  _removeOverlay() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  /**
   * Static helper for simple alert-style dialogues.
   * Usage: DialogueBox.show('Message text', 'Optional Title')
   * @param {string} text - Main message text
   * @param {string} title - Optional title/subtext
   */
  static show(text, title = '') {
    const container = document.createElement('div');
    container.id = 'dialogue-box-static-' + Date.now();
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;pointer-events:none;';
    document.body.appendChild(container);

    const dialogue = new DialogueBox(container.id);
    dialogue.show({
      text,
      subtext: title,
      position: 'center',
      buttons: [{ label: 'OK', action: 'close', style: 'primary' }]
    }, (action) => {
      if (action === 'close') {
        dialogue.hide();
        container.remove();
      }
    });

    // Auto-remove container after hide
    const originalHide = dialogue.hide.bind(dialogue);
    dialogue.hide = () => {
      originalHide();
      setTimeout(() => container.remove(), 100);
    };

    return dialogue;
  }
}
