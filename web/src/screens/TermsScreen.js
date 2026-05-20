import { state } from '../utils/StateManager.js';

export const TermsScreen = {
  render() {
    return `
      <div class="terms-screen screen" style="background-image: url('/assets/ui/backgrounds/login_background.png'); background-size: cover; background-position: center; width: 100%; height: 100%;">
        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.8);"></div>
        
        <button class="back-btn" id="btn-terms-back">Back</button>

        <div style="position: relative; z-index: 5; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; padding: 3%;">
          
          <div class="panel scrollable legal-panel">
            <h1 class="legal-title">LEGAL INFORMATION</h1>
            
            <div class="legal-section">
              <h2 class="legal-section-title">1. PRIVACY POLICY</h2>
              <p class="legal-text">
                At Bata, Takbo!, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your personal information when you use our game and services.
              </p>
              <p class="legal-text">
                <strong class="legal-highlight">Account Information:</strong> We collect your username, email address, and encrypted password for account management, authentication, and leaderboard tracking. Your email is required for account recovery purposes.
              </p>
              <p class="legal-text">
                <strong class="legal-highlight">Profile Data:</strong> You may upload a custom profile picture or select from preset avatars. Profile images are stored securely and displayed on the leaderboard. You can remove your profile picture at any time.
              </p>
              <p class="legal-text">
                <strong class="legal-highlight">Gesture Controls:</strong> By enabling gesture controls, you allow the game to access your webcam. All video processing happens locally in your browser. No video data is recorded, stored, or transmitted to our servers. Gesture recognition occurs entirely on your device.
              </p>
              <p class="legal-text">
                <strong class="legal-highlight">Guest Play:</strong> If you play as a Guest, your session data and progress are stored locally on your device using encryption. Guest data is not backed up to our servers.
              </p>
              <p class="legal-text">
                <strong class="legal-highlight">Data Security:</strong> We do not share, sell, or distribute your personal information to any third parties. All data transmissions use secure encryption protocols.
              </p>
            </div>

            <div class="legal-section">
              <h2 class="legal-section-title">2. TERMS OF SERVICE</h2>
              <p class="legal-text">
                By accessing, registering for, or playing Bata, Takbo!, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
              </p>
              <p class="legal-text">
                <strong class="legal-highlight">Account Responsibility:</strong> You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account.
              </p>
              <p class="legal-text">
                <strong class="legal-highlight">Acceptable Use:</strong> You agree not to use cheats, exploits, hacks, or any unauthorized third-party software. You may not use offensive, inappropriate, or misleading usernames or profile pictures. Harassment of other players is strictly prohibited.
              </p>
              <p class="legal-text">
                <strong class="legal-highlight">Intellectual Property:</strong> The game and all its content, including graphics, audio, code, gameplay mechanics, and the "Bata, Takbo!" name and logo, are the exclusive property of the developers. You may not modify, reverse engineer, distribute, or create derivative works without explicit written permission.
              </p>
              <p class="legal-text">
                <strong class="legal-highlight">Account Termination:</strong> We reserve the right to suspend or terminate accounts that violate these terms, engage in cheating or exploitative behavior, or use inappropriate content. Terminated accounts may lose access to leaderboard rankings and saved progress.
              </p>
            </div>

            <div class="legal-section">
              <h2 class="legal-section-title">3. GAME FEATURES</h2>
              <p class="legal-text">
                <strong class="legal-highlight">Gesture Recognition System:</strong> The game features optional AI-powered gesture controls using your device's webcam. This feature requires camera permission and works best in well-lit environments. All processing is done locally on your device.
              </p>
              <p class="legal-text">
                <strong class="legal-highlight">Leaderboard System:</strong> Your scores and achievements may be displayed on public leaderboards using your chosen username and profile picture. You can opt to play offline or as a Guest if you prefer not to appear on leaderboards.
              </p>
              <p class="legal-text">
                <strong class="legal-highlight">Profile Customization:</strong> You may personalize your profile with a display name, email address for recovery, and a profile picture. These settings can be updated at any time through the Account Settings screen.
              </p>
              <p class="legal-text">
                <strong class="legal-highlight">Sound and Display Settings:</strong> The game includes customizable audio and visual settings. Adjustments to music, sound effects, and gesture sensitivity can be made in the Settings menu.
              </p>
            </div>

            <div class="legal-section">
              <h2 class="legal-section-title">4. LIMITATION OF LIABILITY</h2>
              <p class="legal-text">
                Bata, Takbo! is provided "as is" without warranties of any kind. We are not responsible for any device damage, data loss, or personal injury that may occur while playing. Always ensure you have adequate space around you when using gesture controls.
              </p>
            </div>

            <div class="legal-section">
              <h2 class="legal-section-title">5. CONTACT</h2>
              <p class="legal-text">
                For questions regarding these terms or your account, please contact the development team through the appropriate channels provided in the game.
              </p>
            </div>

            <div class="legal-footer">
              <p>Last Updated: May 2026</p>
              <p>Enjoy the game, respect other players, and survive the night!</p>
            </div>

          </div>
        </div>
      </div>
    `;
  },

  onEnter(el) {
    el.querySelector('#btn-terms-back').addEventListener('click', () => {
      window.__screenManager.back();
    });
  },

  onLeave() {
    // Cleanup if needed
  }
};
