/**
 * GestureController
 * The overarching manager for tracking UI/Hardware to the game.
 */
import { CameraManager } from './CameraManager.js';
import { HandDetector } from './HandDetector.js';
import { GestureClassifier } from './GestureClassifier.js';
import { state } from '../utils/StateManager.js';

class GestureController {
  constructor() {
    this.cameraManager = null;
    this.handDetector = null;
    this.classifier = null;

    this.isRecording = false;
    this.recordingLabel = null;
    this.recordInterval = null;

    this.isTesting = false;

    // Movement Debouncing
    this.currentGesture = 'idle';
    this.lastEmittedGesture = 'idle';
    this.gestureStartStamp = 0;

    // Listen for setting changes
    state.on('settings:changed', (data) => {
      this.applySettings(state.get('settings'));
    });
  }

  /**
   * Fully initialize the system components. Expensive operation.
   * Can be hooked to a video and canvas element in GestureTraining.
   */
  async initialize(videoEl, canvasEl) {
    if (!this.classifier) {
      this.classifier = new GestureClassifier();
      await this.classifier.initialize();
      // Check if IDB model was found
      if (this.classifier.isLoaded) {
        state.set('gestureModelTrained', true);
      }
    }

    if (!this.cameraManager && videoEl) {
      this.cameraManager = new CameraManager(videoEl);
    } else if (this.cameraManager && videoEl) {
      this.cameraManager.video = videoEl;
    }
    
    if (!this.handDetector && videoEl && canvasEl) {
      this.handDetector = new HandDetector(videoEl, canvasEl);
      await this.handDetector.initialize();
    } else if (this.handDetector && videoEl && canvasEl) {
      this.handDetector.bindElements(videoEl, canvasEl);
    }  
    
    // Update config from state
    const settings = state.get('settings');
    if (this.handDetector) {
      this.handDetector.setPrivacyMode(settings.camera.privacyMode);
      this.handDetector.setShowSkeleton(settings.camera.showSkeleton);
      this.handDetector.onResults(this._handleDetection.bind(this));
    }
  }

  /**
   * Start the camera loops
   */
  async startCamera() {
    await this.cameraManager.initialize();
    this.handDetector.start();
  }

  /**
   * Stop the camera loops
   */
  stopCamera() {
    if (this.handDetector) this.handDetector.stop();
    if (this.cameraManager) this.cameraManager.stop();
  }

  /**
   * Train flow
   */
  startRecording(label) {
    this.isRecording = true;
    this.recordingLabel = label;
  }

  stopRecording() {
    this.isRecording = false;
    this.recordingLabel = null;
  }

  /**
   * Apply settings update live
   */
  applySettings(settings) {
    if (this.handDetector) {
      this.handDetector.setPrivacyMode(settings.camera.privacyMode);
      this.handDetector.setShowSkeleton(settings.camera.showSkeleton);
    }
  }

  /**
   * The core frame loop logic dispatched by MediaPipe payload
   */
  async _handleDetection(features, hasHand) {
    if (!hasHand) {
      this.currentGesture = 'idle';
      if (this.isTesting || state.get('currentScreen') === 'game') {
        state.emit('gesture:detected', 'idle');
      }
      return;
    }

    if (this.isRecording && this.recordingLabel) {
      this.classifier.addExample(features, this.recordingLabel);
      state.emit('gesture:sampleAdded', {
        label: this.recordingLabel,
        counts: this.classifier.getClassExampleCount() // To update UI
      });
      return;
    }

    // Default mode during testing or active gameplay
    if (this.isTesting || state.get('currentScreen') === 'game') {
      const pred = await this.classifier.predict(features);
      const settings = state.get('settings');
      
      let detectedMove = 'idle';
      if (pred.confidence >= settings.gesture.sensitivity) {
        detectedMove = pred.label;
      }

      // Debouncing: gesture must be held for debounce ms before emitting.
      // Only reset the timer if the gesture changed from the current tracked one.
      // Single flickered frames back to a previous gesture don't reset the timer.
      if (detectedMove !== this.currentGesture) {
        this.currentGesture = detectedMove;
        this.gestureStartStamp = performance.now();
      }

      const heldFor = performance.now() - this.gestureStartStamp;
      if (heldFor >= settings.gesture.debounce && detectedMove !== this.lastEmittedGesture) {
        this.lastEmittedGesture = detectedMove;
        state.emit('gesture:detected', detectedMove);
      }
    }
  }

  async saveModel({ syncToServer = false } = {}) {
    if (!this.classifier) return;
    await this.classifier.saveModel();
    state.set('gestureModelTrained', true);
    // Only sync to server when explicitly requested (e.g. on back/complete)
    if (syncToServer) {
      try { await state._syncToServer(); } catch(e) {}
    }
  }

  async resetAllGestures() {
    if (this.classifier) {
      await this.classifier.resetModel();
    }
    
    // Clear gesture model from server (only for logged-in users)
    try {
      const session = localStorage.getItem('session');
      if (session) {
        const res = await fetch('/auth/gesture-model', {
          method: 'DELETE',
          credentials: 'include'
        });
        if (!res.ok && res.status !== 401) {
          console.error('[GestureController] Failed to clear server gesture model:', res.status);
        }
      }
    } catch (err) {
      console.error('[GestureController] Error clearing server gesture model:', err);
    }
    
    state.set('gestureModelTrained', false);
    state.set('gestureSetupComplete', false);
    state.emit('gesture:sampleAdded', { label: '', counts: {} });
  }

  async resetGestureClass(label) {
    if (this.classifier) {
      await this.classifier.resetClass(label);
      // Sync updated model to server
      await this.saveModel({ syncToServer: true });
    }
    state.emit('gesture:sampleAdded', { label, counts: this.classifier.getClassExampleCount() });
  }

  getSampleCounts() {
    if (!this.classifier) return {};
    return this.classifier.getClassExampleCount();
  }

  async exportModelJSON() {
    if (!this.classifier) return;
    const data = this.classifier.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bata-takbo-gestures-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importModelJSON(file) {
    if (!this.classifier) return;
    const text = await file.text();
    const data = JSON.parse(text);
    this.classifier.importData(data);
    await this.saveModel();
    // Also sync imported model to server
    await this.saveModel({ syncToServer: true });
  }
}

export const gestureController = new GestureController();
