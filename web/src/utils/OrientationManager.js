/**
 * OrientationManager - Handles device orientation detection and lock screen
 */
export class OrientationManager {
  constructor() {
    this.orientationLock = document.getElementById('orientation-lock');
    this.app = document.getElementById('app');
    this.isLandscape = this.checkOrientation();
    this.listeners = [];
    
    this.init();
  }

  init() {
    // Initial check
    this.updateOrientationDisplay();
    
    // Listen for orientation changes
    window.addEventListener('resize', this.handleOrientationChange.bind(this));
    window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));
    
    // Try to lock orientation to landscape if supported
    this.attemptOrientationLock();
  }

  checkOrientation() {
    return window.innerWidth > window.innerHeight;
  }

  handleOrientationChange() {
    const wasLandscape = this.isLandscape;
    this.isLandscape = this.checkOrientation();
    
    this.updateOrientationDisplay();
    
    // Notify listeners
    this.listeners.forEach(callback => {
      callback(this.isLandscape, wasLandscape);
    });
  }

  updateOrientationDisplay() {
    if (this.isLandscape) {
      this.hideOrientationLock();
    } else {
      this.showOrientationLock();
    }
  }

  showOrientationLock() {
    if (this.orientationLock) {
      this.orientationLock.classList.remove('hidden');
    }
    if (this.app) {
      this.app.style.filter = 'blur(8px)';
      this.app.style.pointerEvents = 'none';
    }
  }

  hideOrientationLock() {
    if (this.orientationLock) {
      this.orientationLock.classList.add('hidden');
    }
    if (this.app) {
      this.app.style.filter = '';
      this.app.style.pointerEvents = '';
    }
  }

  attemptOrientationLock() {
    // Try to lock orientation to landscape if Screen Orientation API is available
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape')
        .catch(() => {
          // Fallback: show orientation lock screen when in portrait
        });
    }
  }

  // Allow other components to listen for orientation changes
  onOrientationChange(callback) {
    this.listeners.push(callback);
  }

  // Remove listener
  offOrientationChange(callback) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // Get current orientation
  getCurrentOrientation() {
    return this.isLandscape ? 'landscape' : 'portrait';
  }

  // Force check orientation (useful after dynamic content changes)
  forceCheck() {
    this.handleOrientationChange();
  }
}

// Export singleton instance
export const orientationManager = new OrientationManager();
