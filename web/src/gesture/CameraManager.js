/**
 * CameraManager
 * Handles requesting permissions and providing the video stream.
 * Supports privacy mode (blacked out feed).
 */
import { state } from '../utils/StateManager.js';

export class CameraManager {
  constructor(videoElement) {
    this.video = videoElement;
    this.stream = null;
    this.isActive = false;
  }

  async initialize() {
    if (this.isActive) return;
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    // Retrieve camera settings from StateManager
    const settings = state.get('settings') || {};
    const cameraSettings = settings.camera || {};
    const quality = cameraSettings.quality || 'medium';
    const deviceId = cameraSettings.deviceId || '';

    // Map quality settings to resolutions (low = 320x240, medium = 640x480, high = 1280x720)
    let width, height;
    if (quality === 'low') {
      width = { ideal: 320 };
      height = { ideal: 240 };
    } else if (quality === 'high') {
      width = { ideal: 1280 };
      height = { ideal: 720 };
    } else {
      // medium / default
      width = { ideal: 640 };
      height = { ideal: 480 };
    }

    const videoConstraints = {
      width,
      height,
      facingMode: 'user',
    };

    if (deviceId) {
      videoConstraints.deviceId = { ideal: deviceId };
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });
      
      this.video.srcObject = this.stream;
      this.video.setAttribute('playsinline', '');
      this.video.setAttribute('muted', '');
      this.video.muted = true;
      this.video.playsInline = true;
      
      return new Promise((resolve) => {
        const onReady = () => {
          this.video.play().then(() => {
            this.isActive = true;
            resolve();
          }).catch(e => {
            console.error('Video play error:', e);
            resolve(); // Resolve anyway so it doesn't hang forever
          });
        };

        if (this.video.readyState >= 1) { // HAVE_METADATA or higher
          onReady();
        } else {
          this.video.onloadedmetadata = onReady;
        }
      });
    } catch (err) {
      console.error('Camera access failed:', err);
      throw new Error('Could not access camera. Please check permissions.');
    }
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.video.srcObject = null;
      this.stream = null;
    }
    this.isActive = false;
  }
}
