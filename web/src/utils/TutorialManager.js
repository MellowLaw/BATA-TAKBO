/**
 * TutorialManager
 * Handles tutorial sequence state for both Gesture and Gameplay phases.
 */
import { state } from './StateManager.js';
import { DialogueBox } from './DialogueBox.js';

export class TutorialManager {
  constructor(containerId) {
    this.containerId = containerId;
    this.dialogue = new DialogueBox(containerId);
    this.steps = [];
    this.currentStep = 0;
    this.isActive = false;
    this.onComplete = null;
    this.onSkip = null;
  }

  /**
   * Start a tutorial sequence
   * @param {Array} steps - The tutorial steps
   * @param {Object} options - onComplete, onSkip callbacks
   */
  start(steps, options = {}) {
    this.steps = steps;
    this.currentStep = 0;
    this.isActive = true;
    this.onComplete = options.onComplete;
    this.onSkip = options.onSkip;
    
    this._showStep();
  }

  next() {
    if (!this.isActive) return;
    this.currentStep++;
    if (this.currentStep >= this.steps.length) {
      this.complete();
    } else {
      this._showStep();
    }
  }

  skip() {
    if (!this.isActive) return;
    this.isActive = false;
    this.dialogue.hide();
    if (this.onSkip) this.onSkip();
  }

  complete() {
    this.isActive = false;
    this.dialogue.hide();
    if (this.onComplete) this.onComplete();
  }

  /**
   * Update the tutorial based on external events
   * @param {string} type - The event type
   * @param {*} data - Event data
   */
  update(type, data) {
    if (!this.isActive) return;
    
    const currentStepData = this.steps[this.currentStep];
    if (!currentStepData || !currentStepData.autoAdvance) return;
    
    if (currentStepData.autoAdvance.type === type) {
      const shouldAdvance = currentStepData.autoAdvance.check(data);
      if (shouldAdvance) {
        this.next();
      }
    }
  }

  _showStep() {
    const step = this.steps[this.currentStep];
    if (!step) return;

    // Handle hideDialogue steps (for auto-advance recording)
    if (step.hideDialogue) {
      this.dialogue.hide();
      if (step.onEnter) step.onEnter();
      return;
    }

    // Build buttons array
    const buttons = step.buttons || [{ label: 'Continue', action: 'next', style: 'primary' }];
    
    // Ensure buttons have proper actions
    const processedButtons = buttons.map(btn => ({
      ...btn,
      action: btn.action || 'next'
    }));

    // Show the dialogue with proper configuration
    this.dialogue.show({
      text: step.text,
      portrait: step.portrait,
      position: step.position || 'center',
      subtext: step.subtext,
      buttons: processedButtons
    }, (action) => {
      if (action === 'next' || action === 'close') {
        this.next();
      } else if (action === 'skip') {
        this.skip();
      }
    });

    // Execute onEnter callback if provided
    if (step.onEnter) {
      step.onEnter();
    }

    // Handle highlight if specified
    if (step.highlight) {
      this._handleHighlight(step.highlight);
    }
  }

  _handleHighlight(selector) {
    // Remove existing highlights
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
      el.classList.remove('tutorial-highlight');
    });

    // Add highlight to target element
    const target = document.querySelector(selector);
    if (target) {
      target.classList.add('tutorial-highlight');
    }
  }
}
