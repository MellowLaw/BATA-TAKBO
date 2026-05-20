export const LoadingScreen = {
  render() {
    return `
      <div class="loading-screen screen" style="background-image: url('/assets/ui/backgrounds/loading_screen.png'); background-size: cover; background-position: center; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 3%;">
        <h1 class="loading-flicker" style="font-family: var(--font-display); color: #E4CFC0; font-size: 48px; margin-bottom: 30px; letter-spacing: 4px;">LOADING...</h1>
        <p id="loading-tip-normal" style="font-family: var(--font-display); color: #a89b8c; font-size: 16px; text-align: center; max-width: 60%; line-height: 1.5; text-shadow: 1px 1px 2px rgba(0,0,0,0.8); margin-bottom: 30px;"></p>
        <div class="loading-dots-container">
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
        </div>
      </div>
    `;
  },

  onEnter(el, params) {
    // Randomized lines that you can easily edit
    const tips = [
      "Babala: Maraming masasamang elemento sa paligid.",
      "TIP: MAKE SURE YOUR WEBCAM IS WELL-LIT FOR BETTER GESTURE RECOGNITION.",
      "TIP: CHECK THE SETTINGS MENU TO ADJUST GESTURE SENSITIVITY.",
      "Marami raw multo ngayon, kaya mag-iingat ka.",
      "Nagsisimula na ang orasyon. Huwag kang kukurap.",
      "Minsan, ang ating mga anino ay may sariling buhay.",
      "Igalang mo ang mga espiritu, at baka pagpalain ka nila.",
      "Listen to the Manananggal's wings. If the sound is faint, she is closer than you think."
    ];
    
    const tipEl = el.querySelector('#loading-tip-normal');
    tipEl.textContent = tips[Math.floor(Math.random() * tips.length)];

    // Navigate to target screen after a short delay
    this.timeout = setTimeout(() => {
      const target = params.target || 'main-menu';
      const targetParams = params.targetParams || {};
      window.__screenManager.navigate(target, targetParams, false);
    }, 2500); // 2.5 seconds loading time
  },

  onLeave() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
  }
};
