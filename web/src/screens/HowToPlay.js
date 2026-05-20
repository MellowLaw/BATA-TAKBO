/**
 * HowToPlay — Tutorial screen showing game instructions
 * Uses assets from /assets/ui/tutorials/
 */
import { state } from '../utils/StateManager.js';

export const HowToPlay = {
  render() {
    const tutorials = [
      { id: 1, title: 'Movement', img: '/assets/ui/tutorials/tuts1.png', desc: 'Move your character to avoid attacks. Make sure to avoid the red tiles as a warning. Use hand gestures or arrow keys.' },
      { id: 2, title: 'Health / Lives', img: '/assets/ui/tutorials/tuts2.png', desc: 'Avoid getting hit to preserve your lives. Collect the "KWINTAS NG MANGKUKULAM" to restore health!' },
      { id: 3, title: 'Power Ups & Loots', img: '/assets/ui/tutorials/tuts3.png', desc: 'Find power-ups and loots by picking up chests scattered on the plain to gain advantages. WARNING: BE CAUTIOUS WITH THE CHEST YOURE PICKING.' },
      { id: 4, title: 'Attacking the Boss', img: '/assets/ui/tutorials/tuts4.png', desc: 'Find the rainbow sword to deal damage to the boss. After dodging attacks, a sword will appear — move to it quickly to strike back!' },
    ];

    const slidesHtml = tutorials.map((tut, i) => `
      <div class="htp-slide ${i === 0 ? 'active' : ''}" data-slide="${i}">
        <div class="htp-slide-content">
          <img src="${tut.img}" alt="${tut.title}" class="htp-slide-img" />
          <div class="htp-slide-text">
            <h3 class="htp-slide-title">${tut.title}</h3>
            <p class="htp-slide-desc">${tut.desc}</p>
          </div>
        </div>
      </div>
    `).join('');

    const dotsHtml = tutorials.map((_, i) => `
      <button class="htp-dot ${i === 0 ? 'active' : ''}" data-slide="${i}"></button>
    `).join('');

    return `
      <div class="how-to-play screen">
        <div class="ambient-stars"></div>
        <div class="ambient-glow"></div>
        
        <button class="back-btn" id="btn-htp-back">Back</button>
        
        <h1 class="screen-title" style="animation: fadeInUp 0.4s ease forwards;">
          How to Play
        </h1>
        
        <div class="htp-container">
          <button class="htp-nav-btn htp-prev" id="htp-prev">&#8249;</button>
          
          <div class="htp-slides">
            ${slidesHtml}
          </div>
          
          <button class="htp-nav-btn htp-next" id="htp-next">&#8250;</button>
        </div>
        
        <div class="htp-dots">
          ${dotsHtml}
        </div>

        <button class="menu-btn" id="btn-htp-play" style="
          display: none;
          margin: 0 auto;
          margin-top: 1rem;
          font-size: clamp(0.9rem, 2vw, 1.1rem);
          letter-spacing: 2px;
          padding: 0.5rem 2rem;
        ">Let's Play! &#9654;</button>
      </div>
    `;
  },

  onEnter(el, params = {}) {
    this._fromPlay = params.fromPlay || false;

    const slides = el.querySelectorAll('.htp-slide');
    const dots = el.querySelectorAll('.htp-dot');
    const prevBtn = el.querySelector('#htp-prev');
    const nextBtn = el.querySelector('#htp-next');
    const playBtn = el.querySelector('#btn-htp-play');
    let currentSlide = 0;
    const totalSlides = slides.length;

    const showSlide = (index) => {
      slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
      });
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
      });
      currentSlide = index;
      if (this._fromPlay && playBtn) {
        playBtn.style.display = index === totalSlides - 1 ? 'block' : 'none';
      }
    };

    const nextSlide = () => {
      showSlide((currentSlide + 1) % totalSlides);
    };

    const prevSlide = () => {
      showSlide((currentSlide - 1 + totalSlides) % totalSlides);
    };

    prevBtn.addEventListener('click', prevSlide);
    nextBtn.addEventListener('click', nextSlide);

    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => showSlide(i));
    });

    // Keyboard navigation
    const handleKeydown = (e) => {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
    };
    document.addEventListener('keydown', handleKeydown);
    this._handleKeydown = handleKeydown;

    // "Let's Play!" button — only shown on last slide when fromPlay
    if (playBtn) {
      playBtn.addEventListener('click', async () => {
        state.set('tutorialComplete', true);
        state.set('practiceTutorialComplete', true);
        await state.saveTutorialState();
        if (state.savePracticeTutorialState) await state.savePracticeTutorialState();
        window.__screenManager.navigate('chapter-select', {}, false);
      });
    }

    // Back button
    el.querySelector('#btn-htp-back').addEventListener('click', () => {
      window.__screenManager.back();
    });

    // Click image to view full size
    const images = el.querySelectorAll('.htp-slide-img');
    images.forEach(img => {
      img.addEventListener('click', () => {
        const modal = document.createElement('div');
        modal.className = 'htp-image-modal';
        modal.innerHTML = `<img src="${img.src}" alt="${img.alt}" class="htp-modal-img" />`;
        modal.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          cursor: zoom-out;
        `;
        const modalImg = modal.querySelector('.htp-modal-img');
        modalImg.style.cssText = `
          max-width: 95%;
          max-height: 95%;
          border-radius: 8px;
          border: 2px solid var(--accent-orange);
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', () => modal.remove());
      });
    });
  },

  onLeave() {
    if (this._handleKeydown) {
      document.removeEventListener('keydown', this._handleKeydown);
      this._handleKeydown = null;
    }
  },
};
