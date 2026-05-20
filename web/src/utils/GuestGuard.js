/**
 * GuestGuard — protects unsaved guest progress.
 *
 * Behaviour:
 *   • If the player is a guest AND has non-trivial progress, refuse to let
 *     them close the tab / refresh / quit the game without a confirmation.
 *   • The browser-level `beforeunload` shows a generic browser dialog
 *     (browsers ignore custom strings — that's a security feature).
 *   • An in-app modal (`confirmGuestLeave`) is used for in-game Quit/Logout
 *     buttons so we can show our own message + a "Connect an account" CTA.
 */
import { state } from './StateManager.js';
import { DialogueBox } from './DialogueBox.js';

const PORTRAIT = '/assets/entity/character-icon/character.png';

/** True if no registered session is active (guest or signed-out). */
export function isGuest() {
  try {
    const stored = localStorage.getItem('guest_session');
    if (stored) {
      const session = JSON.parse(stored);
      if (session && session.is_guest === false) return false;
    }
  } catch (e) {
    // Encrypted guest blob → JSON.parse fails → treat as guest.
  }
  return true;
}

/**
 * True only if the guest has done something worth warning about.
 * Avoids nagging on a brand-new session where nothing would be lost.
 */
export function hasMeaningfulGuestProgress() {
  if (!isGuest()) return false;

  if (state.get('tutorialComplete') === true) return true;
  if (state.get('gestureSetupComplete') === true) return true;

  const progress = state.get('chapterProgress');
  if (progress) {
    if (Array.isArray(progress.chaptersUnlocked) && progress.chaptersUnlocked.length > 1) return true;
    if (Array.isArray(progress.chaptersCompleted) && progress.chaptersCompleted.length > 0) return true;
    if (progress.bestScores && Object.keys(progress.bestScores).length > 0) return true;
  }

  return false;
}

/** Install the tab-close / refresh warning. Call once at app startup. */
export function installBeforeUnloadGuard() {
  window.addEventListener('beforeunload', (e) => {
    if (hasMeaningfulGuestProgress()) {
      e.preventDefault();
      // Browsers ignore the message; assigning returnValue triggers their own dialog.
      e.returnValue = '';
      return '';
    }
  });
}

/**
 * In-app modal shown when a guest tries to log out / leave the menu.
 * Calls `onLeave()` if the user confirms, otherwise navigates to login
 * so they can connect / create an account.
 */
export function confirmGuestLeave({ onLeave, onConnect } = {}) {
  // No progress → nothing to warn about, just leave.
  if (!hasMeaningfulGuestProgress()) {
    if (typeof onLeave === 'function') onLeave();
    return;
  }

  const dialogue = new DialogueBox('screen-container');

  dialogue.show({
    text: "You're playing as a GUEST. If you leave now, your progress, gestures, and tutorial completion will NOT be saved.",
    subtext: 'Connect or create an account to keep your progress.',
    portrait: PORTRAIT,
    portraitFrames: 5,
    position: 'center',
    overlay: true,
    typewriter: true,
    buttons: [
      { label: 'Connect / Create Account', action: 'connect' },
      { label: 'Leave Anyway', action: 'leave', style: 'subtle' },
      { label: 'Cancel', action: 'cancel', style: 'subtle' }
    ]
  }, (action) => {
    dialogue.hide();
    if (action === 'connect') {
      if (typeof onConnect === 'function') {
        onConnect();
      } else if (window.__screenManager) {
        window.__screenManager.navigate('login-screen', {}, false);
      }
    } else if (action === 'leave') {
      if (typeof onLeave === 'function') onLeave();
    }
    // 'cancel' / overlay-dismiss → do nothing
  });
}
