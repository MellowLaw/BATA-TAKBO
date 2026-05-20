/**
 * About — Enhanced game info, credits, and privacy policy
 */
export const About = {
  render() {
    return `
      <div class="about-screen screen">
        <button class="back-btn" id="btn-about-back">Back</button>
        
        <h1 class="screen-title" style="animation: fadeInUp 0.4s ease forwards;">
          About
        </h1>
        
        <div class="about-screen__content scrollable" style="animation: fadeInUp 0.4s ease 0.15s forwards; opacity: 0;">
          
          <!-- Game Overview -->
          <div class="about-section">
            <div class="about-section__title">Game Overview</div>
            <div class="about-section__text">
              <strong>Bata, Takbo!</strong> (Filipino for "Kid, Run!") is an innovative gesture-controlled
              survival game that puts YOU in control. Train your own hand gestures to dodge
              projectiles, battle fearsome bosses, and survive through 3 challenging chapters.
              <br/><br/>
              <strong>Key Features:</strong><br/>
              • Custom gesture training — teach the game YOUR movements<br/>
              • 3 epic boss battles with unique attack patterns<br/>
              • Character selection (Male/Female) with different control styles<br/>
              • <strong>Cloud-synced gesture model</strong> — encrypted AES-256, accessible across devices<br/>
              • Privacy mode for discrete gameplay<br/>
              • Endless mode for high score chasing<br/>
              <br/>
              <strong>Version:</strong> 0.1.0 (Beta)
            </div>
          </div>

          <!-- How to Play -->
          <div class="about-section">
            <div class="about-section__title">How to Play</div>
            <div class="about-section__text">
              <strong>1. Train Your Gestures</strong><br/>
              Visit Gesture Training from the main menu. Hold your hand in position
              and train UP, DOWN, LEFT, RIGHT, and REST poses. The more samples,
              the better the recognition!
              <br/><br/>
              <strong>2. Choose Your Character</strong><br/>
              Male uses hand gestures with camera display. Female uses keyboard
              arrows with on-screen D-pad. Pick what works best for you.
              <br/><br/>
              <strong>3. Battle the Bosses</strong><br/>
              Each chapter features a unique boss with attack patterns to learn.
              Dodge projectiles, survive as long as possible, and defeat the boss!
              <br/><br/>
              <strong>4. Practice Mode</strong><br/>
              Use Practice Mode to learn boss patterns without consequences.
            </div>
          </div>

          <!-- Privacy & Security -->
          <div class="about-section">
            <div class="about-section__title">Privacy & Security</div>
            <div class="about-section__text">
              Your privacy is our top priority. Here's how we protect you:
              <br/><br/>
              • <strong>No video leaves your device.</strong> Camera processing happens
              entirely locally using MediaPipe. We never see your camera feed.
              <br/><br/>
              • <strong>Gesture models are encrypted.</strong> If you choose cloud sync,
              your gesture data is AES-256 encrypted before storage.
              <br/><br/>
              • <strong>Privacy Mode available.</strong> Hide the camera feed while
              still using gesture controls. Perfect for public spaces.
              <br/><br/>
              • <strong>Webcam captures stay local.</strong> Training images are saved
              only on your device and never uploaded.
              <br/><br/>
              • <strong>No tracking or analytics.</strong> We don't use cookies,
              trackers, or collect usage statistics.
              <br/><br/>
              • <strong>GDPR compliant.</strong> Request data deletion anytime from
              your Profile settings.
            </div>
          </div>
          
          <!-- Development Team -->
          <div class="about-section">
            <div class="about-section__title">Development Team</div>
            <div class="about-section__text">
              <strong>Lead Developer</strong><br/>
              [Your Name / Studio Name]
              <br/><br/>
              <strong>Special Thanks</strong><br/>
              The open-source community for Phaser, MediaPipe, TensorFlow.js,
              and the numerous asset creators who made this possible.
              <br/><br/>
              <em>Want to contribute or report issues?
              Contact us through the Support section.</em>
            </div>
          </div>

          <!-- Support & Contact -->
          <div class="about-section">
            <div class="about-section__title">Support & Contact</div>
            <div class="about-section__text">
              <strong>Need Help?</strong><br/>
              • Check the "How To Play" guide from the main menu<br/>
              • Visit our FAQ in Profile > Settings<br/>
              • Email: support@batatakbo.com [placeholder]
              <br/><br/>
              <strong>Feedback Welcome</strong><br/>
              Found a bug or have a suggestion? We want to hear from you!
              Your feedback helps make Bata, Takbo! better.
            </div>
          </div>

          <!-- Asset Credits -->
          <div class="about-section">
            <div class="about-section__title">Asset Credits</div>
            <div class="about-section__text">
              <strong>Visual Assets</strong><br/>
              • Character Sprites — Pixel art from itch.io and OpenGameArt<br/>
              • Platform Tilesets — Free dungeon environment tiles<br/>
              • Game FX — Open source explosion and spell effects<br/>
              • UI Elements — Free health bars, buttons, frames<br/>
              • Item Icons — Open source loot and projectile sprites<br/>
              • Fonts — VCR OSD Neue by Riciery Leal, DirtyHarold
              <br/><br/>
              <strong>Audio Assets</strong><br/>
              • Sound effects from freesound.org and OpenGameArt<br/>
              • Music tracks from royalty-free sources
              <br/><br/>
              <em>All assets are free resources from the internet used under 
              their respective open-source or Creative Commons licenses.
              Full attribution available in the project repository.</em>
            </div>
          </div>

          <!-- Technology Stack -->
          <div class="about-section">
            <div class="about-section__title">Technology Stack</div>
            <div class="about-section__text">
              <strong>Core Technologies</strong><br/>
              • Phaser 3 — Game engine (MIT License)<br/>
              • MediaPipe — Hand tracking by Google (Apache 2.0)<br/>
              • TensorFlow.js — Machine learning (Apache 2.0)<br/>
              • Vite — Build tool (MIT License)
              <br/><br/>
              <strong>Backend & Services</strong><br/>
              • Node.js / Express — Server framework<br/>
              • SQLite — Database<br/>
              • Nodemailer — Email service<br/>
              • Howler.js — Audio engine (MIT License)
            </div>
          </div>
          
          <!-- Legal -->
          <div class="about-section">
            <div class="about-section__title">Legal</div>
            <div class="about-section__text">
              <strong>Copyright</strong><br/>
              © 2026 Bata, Takbo! All rights reserved.
              <br/><br/>
              <strong>License</strong><br/>
              This game and its original code are proprietary and confidential.
              Unauthorized copying, distribution, or modification is prohibited.
              <br/><br/>
              Third-party assets and libraries are used under their respective
              open-source licenses. See license files for full terms.
            </div>
          </div>

        </div>
      </div>
    `;
  },

  onEnter(el) {
    el.querySelector('#btn-about-back').addEventListener('click', () => {
      window.__screenManager.back();
    });
  },
};
