/**
 * ScreenManager — SPA-style screen navigation system
 * Handles transitions between screens with animations
 */
export class ScreenManager {
  constructor(containerId = 'screen-container') {
    this.container = document.getElementById(containerId);
    this.screens = new Map();
    this.activeScreen = null;
    this.history = [];
    this.transitioning = false;
  }

  /**
   * Register a screen with a name and render function
   * @param {string} name - Unique screen identifier
   * @param {object} screen - Screen object with render(), onEnter(), onLeave() methods
   */
  register(name, screen) {
    this.screens.set(name, screen);
  }

  /**
   * Navigate to a screen by name
   * @param {string} name - Screen to navigate to
   * @param {object} params - Optional parameters to pass to the screen
   * @param {boolean} addToHistory - Whether to add current screen to history stack
   */
  async navigate(name, params = {}, addToHistory = true) {
    if (this.transitioning) return;
    if (!this.screens.has(name)) {
      console.error(`Screen "${name}" not registered`);
      return;
    }

    this.transitioning = true;
    const screen = this.screens.get(name);

    try {
      // Leave current screen
      if (this.activeScreen) {
        const currentEl = this.container.querySelector('.screen.active');
        if (currentEl) {
          if (this.activeScreen.onLeave) {
            await this.activeScreen.onLeave();
          }
          currentEl.classList.add('leaving');
          currentEl.classList.remove('active');
          await this._waitForTransition(currentEl);
          currentEl.remove();
        }

        if (addToHistory) {
          this.history.push(this.activeScreenName);
        }
      }

      // Render new screen
      const html = screen.render(params);
      const wrapper = document.createElement('div');
      wrapper.innerHTML = html;
      const screenEl = wrapper.firstElementChild;
      screenEl.classList.add('screen', 'entering');
      this.container.appendChild(screenEl);

      // Force reflow for animation
      screenEl.offsetHeight;

      // Activate
      screenEl.classList.remove('entering');
      screenEl.classList.add('active');

      // Bind events
      if (screen.onEnter) {
        await screen.onEnter(screenEl, params);
      }

      this.activeScreen = screen;
      this.activeScreenName = name;
    } catch (err) {
      console.error(`[ScreenManager] Navigation to "${name}" failed:`, err);
    } finally {
      this.transitioning = false;
    }
  }

  /**
   * Go back to the previous screen
   */
  async back() {
    if (this.history.length === 0) return;
    const prevScreen = this.history.pop();
    await this.navigate(prevScreen, {}, false);
  }

  /**
   * Check if there's a screen to go back to
   */
  canGoBack() {
    return this.history.length > 0;
  }

  /**
   * Wait for CSS transition to complete
   */
  _waitForTransition(el) {
    return new Promise(resolve => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        el.removeEventListener('transitionend', finish);
        resolve();
      };
      el.addEventListener('transitionend', finish, { once: true });
      // Fallback: match --transition-slow (400ms) + small buffer
      setTimeout(finish, 420);
    });
  }
}
