/**
 * HandDetector
 * Wraps MediaPipe Hands to process video frames and extract normalized landmarks.
 */
const { Hands, HAND_CONNECTIONS } = window;
const { Camera } = window;

export class HandDetector {
  constructor(videoElement, canvasElement) {
    this.hands = null;
    this.camera = null;
    this.bindElements(videoElement, canvasElement);
    this.lastLandmarks = [];
    this.lastLandmarks = [];
    this.onResultsCallback = null;
    this.showSkeleton = true;
    this.privacyMode = false;
  }

  bindElements(videoElement, canvasElement) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext('2d') : null;

    // Lower resolution on mobile for performance
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    this._camW = isMobile ? 320 : 640;
    this._camH = isMobile ? 240 : 480;

    // Throttle: only send a frame to MediaPipe every N ms
    this._frameInterval = isMobile ? 50 : 33; // ~20fps mobile, ~30fps desktop
    this._lastFrameTime = 0;
    
    if (this.camera) this.camera.stop();
    if (this.video && this.hands) {
      this.camera = new Camera(this.video, {
        onFrame: async () => {
          if (!this.video.paused && !this.video.ended) {
            const now = performance.now();
            if (now - this._lastFrameTime < this._frameInterval) return;
            this._lastFrameTime = now;
            await this.hands.send({ image: this.video });
          }
        },
        width: this._camW,
        height: this._camH
      });
    }
  }

  async initialize() {
    this.hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 0,          // Always use lite model — fast enough for KNN
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5,
      selfieMode: true,
    });

    this.hands.onResults(this._onResults.bind(this)); // register ONCE

    // Initialize the camera loop now that hands is ready
    if (this.video) {
      this.bindElements(this.video, this.canvas);
    }
  }

  start() {
    if (this.camera) this.camera.start();
  }

  stop() {
    if (this.camera) this.camera.stop();
  }

  onResults(callback) {
    this.onResultsCallback = callback;
  }

  setPrivacyMode(isPrivate) {
    this.privacyMode = isPrivate;
  }

  setShowSkeleton(show) {
    this.showSkeleton = show;
  }

  _onResults(results) {
    // 1. Draw results visually (if canvas provided)
    if (this.ctx && this.canvas) {
      this.ctx.save();
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Privacy Mode: Draw black background covering actual video feed
      if (this.privacyMode) {
        this.ctx.fillStyle = '#0a0a1a'; // Match UI dark background
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      } else {
        // Draw real camera frame
        // selfieMode=true mirrors it naturally for us
        this.ctx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);
      }

      if (this.showSkeleton && results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        // Simple manual drawing for performance
        // (Alternatively use @mediapipe/drawing_utils, but writing manually avoids another dep)
        const landmarks = results.multiHandLandmarks[0];
        
        // Draw Connections
        this.ctx.strokeStyle = '#ff6b1a';
        this.ctx.lineWidth = 3;
        HAND_CONNECTIONS.forEach(pair => {
          const pt1 = landmarks[pair[0]];
          const pt2 = landmarks[pair[1]];
          if (!pt1 || !pt2) return;
          
          this.ctx.beginPath();
          // Map normalized coords back to canvas resolution
          this.ctx.moveTo(pt1.x * this.canvas.width, pt1.y * this.canvas.height);
          this.ctx.lineTo(pt2.x * this.canvas.width, pt2.y * this.canvas.height);
          this.ctx.stroke();
        });

        // Draw Landmarks
        this.ctx.fillStyle = '#ffd700';
        landmarks.forEach(pt => {
          if (!pt) return;
          this.ctx.beginPath();
          this.ctx.arc(pt.x * this.canvas.width, pt.y * this.canvas.height, 4, 0, 2 * Math.PI);
          this.ctx.fill();
        });
      }
      this.ctx.restore();
    }

    // 2. Process logic
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const normalizedFeatures = this.normalizeLandmarks(landmarks);
      this.lastLandmarks = normalizedFeatures;

      if (this.onResultsCallback) {
        this.onResultsCallback(normalizedFeatures, true);
      }
    } else {
      this.lastLandmarks = [];
      if (this.onResultsCallback) {
        this.onResultsCallback([], false);
      }
    }
  }

  /**
   * Translates to wrist origin and scales by hand size.
   * Flattens to a 1D array of 63 elements (x,y,z for 21 marks)
   */
  normalizeLandmarks(landmarks) {
    if (!landmarks || landmarks.length !== 21) return [];

    const wrist = landmarks[0];
    const indexBase = landmarks[5]; // approx hand width metric or distance along metacarpals

    // Calculate a rough scale for the hand (euclidean distance wrist to index base)
    const dx = indexBase.x - wrist.x;
    const dy = indexBase.y - wrist.y;
    const dz = indexBase.z - wrist.z;
    const scale = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1; 

    const flatFeatures = [];
    for (let pt of landmarks) {
      flatFeatures.push((pt.x - wrist.x) / scale);
      flatFeatures.push((pt.y - wrist.y) / scale);
      flatFeatures.push((pt.z - wrist.z) / scale);
    }

    return flatFeatures;
  }
}
