(() => {
  const SOUND_KEY = 'nono-letterbox-oss:codex-sound';
  const idleFrames = [0, 1, 2, 3, 4, 5];
  const idleDurations = [1680, 660, 660, 840, 840, 1920];
  const confettiColors = ['#ffcf6e', '#f28f9d', '#8a72d4', '#65b8b0', '#ffffff'];
  const reactions = [
    {
      line: '呀——被戳到啦。',
      bubble: '呀！',
      row: 4,
      frames: [0, 1, 2, 3, 4, 3, 2, 1, 0],
      frameMs: 108,
      holdMs: 220,
      notes: [523, 659, 784],
    },
    {
      line: '再戳一下，我就要偷偷反击了。',
      bubble: '盯——',
      row: 3,
      frames: [0, 1, 2, 3, 2, 1, 0],
      frameMs: 132,
      holdMs: 260,
      notes: [659, 587, 698],
    },
    {
      line: '好吧，这一戳也收进今天的小屋记录里。',
      bubble: '收到 🌸',
      row: 8,
      frames: [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0],
      frameMs: 122,
      holdMs: 260,
      notes: [494, 622, 740],
    },
    {
      line: '礼花归你，Codex 继续负责守信。',
      bubble: '砰！',
      row: 7,
      frames: [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0],
      frameMs: 112,
      holdMs: 240,
      notes: [587, 740, 880],
    },
    {
      line: '……好像已经习惯这样被戳了。',
      bubble: '嘿嘿',
      row: 6,
      frames: [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0],
      frameMs: 128,
      holdMs: 260,
      notes: [440, 554, 659],
    },
  ];

  async function playChime(notes) {
    try {
      const context = new AudioContext();
      if (context.state === 'suspended') await context.resume();
      const startAt = context.currentTime;
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const noteStart = startAt + index * 0.055;
        oscillator.type = index === notes.length - 1 ? 'sine' : 'triangle';
        oscillator.frequency.setValueAtTime(frequency, noteStart);
        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.055, noteStart + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.16);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(noteStart);
        oscillator.stop(noteStart + 0.17);
      });
      window.setTimeout(() => void context.close(), 520);
    } catch {
      // Embedded browsers may disable Web Audio. The visual reaction still works.
    }
  }

  class CodexCompanion extends HTMLElement {
    connectedCallback() {
      if (this.dataset.ready === 'true') return;
      this.dataset.ready = 'true';
      this.soundEnabled = localStorage.getItem(SOUND_KEY) !== 'off';
      this.pokeIndex = -1;
      this.pokeBurst = 0;
      this.idleIndex = 0;
      this.reactionTimers = [];
      this.render();
      this.cacheElements();
      this.bindEvents();
      this.updateSoundLabel();
      this.updateUnreadLine();
      this.startIdle();
    }

    disconnectedCallback() {
      this.stopTimers();
    }

    render() {
      this.innerHTML = `
        <aside class="oss-codex-companion" aria-label="Codex 本地陪读小伙伴">
          <div class="oss-codex-confetti" aria-hidden="true"></div>
          <div class="oss-codex-copy">
            <span class="oss-codex-status">ONLINE · LOCAL PET</span>
            <strong>Codex 在陪你读信</strong>
            <p class="oss-codex-line" aria-live="polite">我在。今天想先读哪一封？</p>
            <div class="oss-codex-actions">
              <button class="oss-codex-poke" type="button">戳一下 Codex</button>
              <button class="oss-codex-sound" type="button">音效 · 开</button>
              <button class="oss-codex-open" type="button">去读一封信</button>
            </div>
          </div>
          <button class="oss-codex-portrait" type="button" aria-label="直接戳一下右边的 Codex">
            <span class="oss-codex-room-glow" aria-hidden="true"></span>
            <span class="oss-codex-room-stars" aria-hidden="true"></span>
            <span class="oss-codex-floating-letter" aria-hidden="true">♡</span>
            <span class="oss-codex-floor-shadow" aria-hidden="true"></span>
            <span class="oss-codex-poke-ripple" aria-hidden="true"></span>
            <span class="oss-codex-pet-stage">
              <span class="oss-codex-pet-sprite" role="img" aria-label="正在小屋里陪用户读信的 Codex 小伙伴"></span>
            </span>
            <span class="oss-codex-tap-hint" aria-hidden="true">点我</span>
            <span class="oss-codex-pose-label">坐着＋思考中…</span>
            <small class="oss-codex-tag">OFFICIAL CODEX PET · UNOFFICIAL APP</small>
          </button>
        </aside>
      `;
    }

    cacheElements() {
      this.card = this.querySelector('.oss-codex-companion');
      this.line = this.querySelector('.oss-codex-line');
      this.pokeButton = this.querySelector('.oss-codex-poke');
      this.soundButton = this.querySelector('.oss-codex-sound');
      this.openButton = this.querySelector('.oss-codex-open');
      this.portrait = this.querySelector('.oss-codex-portrait');
      this.stage = this.querySelector('.oss-codex-pet-stage');
      this.sprite = this.querySelector('.oss-codex-pet-sprite');
      this.confetti = this.querySelector('.oss-codex-confetti');
    }

    bindEvents() {
      this.pokeButton?.addEventListener('click', () => this.poke());
      this.portrait?.addEventListener('click', () => this.poke());
      this.soundButton?.addEventListener('click', () => {
        this.soundEnabled = !this.soundEnabled;
        localStorage.setItem(SOUND_KEY, this.soundEnabled ? 'on' : 'off');
        this.updateSoundLabel();
        this.line.textContent = this.soundEnabled
          ? '叮——音效回来啦。'
          : '好，安静陪读模式。';
      });
      this.openButton?.addEventListener('click', () => {
        const firstLetter = document.querySelector('.letter-open');
        if (firstLetter instanceof HTMLButtonElement) {
          firstLetter.click();
          window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 60);
        } else {
          this.line.textContent = '当前筛选里没有信，先把筛选清空吧。';
        }
      });
    }

    updateSoundLabel() {
      if (!this.soundButton) return;
      this.soundButton.textContent = this.soundEnabled ? '音效 · 开' : '音效 · 关';
      this.soundButton.setAttribute('aria-pressed', String(this.soundEnabled));
    }

    updateUnreadLine() {
      const unreadNode = document.querySelector('.welcome-stats span:nth-child(2) b');
      const unread = unreadNode?.textContent?.trim();
      if (unread && Number(unread) > 0) {
        this.line.textContent = `小屋里还有 ${unread} 封内容等你慢慢看。`;
      }
    }

    setFrame(row, frame) {
      if (!this.sprite) return;
      this.sprite.style.setProperty('--codex-frame-x', `${(frame / 7) * 100}%`);
      this.sprite.style.setProperty('--codex-frame-y', `${(row / 8) * 100}%`);
    }

    stopTimers() {
      if (this.idleTimer) window.clearTimeout(this.idleTimer);
      this.reactionTimers.forEach((timer) => {
        window.clearTimeout(timer);
        window.clearInterval(timer);
      });
      this.reactionTimers = [];
    }

    startIdle() {
      if (!this.isConnected) return;
      this.setFrame(0, idleFrames[this.idleIndex]);
      this.idleTimer = window.setTimeout(() => {
        this.idleIndex = (this.idleIndex + 1) % idleFrames.length;
        this.startIdle();
      }, idleDurations[this.idleIndex]);
    }

    poke() {
      if (!this.stage || !this.portrait || !this.line) return;
      if (this.idleTimer) window.clearTimeout(this.idleTimer);
      this.reactionTimers.forEach((timer) => {
        window.clearTimeout(timer);
        window.clearInterval(timer);
      });
      this.reactionTimers = [];

      this.pokeIndex = (this.pokeIndex + 1) % reactions.length;
      this.pokeBurst += 1;
      const reaction = reactions[this.pokeIndex];
      this.line.textContent = reaction.line;
      this.pokeButton.textContent = '再戳一下 Codex';
      this.stage.classList.add('is-reacting');
      this.portrait.classList.add('is-reacting');
      this.showBubble(reaction.bubble);
      this.showConfetti();
      if (this.soundEnabled) void playChime(reaction.notes);
      if ('vibrate' in navigator) navigator.vibrate([18, 22, 34]);

      let frameIndex = 0;
      this.setFrame(reaction.row, reaction.frames[0]);
      const frameTimer = window.setInterval(() => {
        frameIndex += 1;
        if (frameIndex >= reaction.frames.length) {
          window.clearInterval(frameTimer);
          const finishTimer = window.setTimeout(() => {
            this.stage.classList.remove('is-reacting');
            this.portrait.classList.remove('is-reacting');
            this.idleIndex = 0;
            this.startIdle();
          }, reaction.holdMs);
          this.reactionTimers.push(finishTimer);
          return;
        }
        this.setFrame(reaction.row, reaction.frames[frameIndex]);
      }, reaction.frameMs);
      this.reactionTimers.push(frameTimer);
    }

    showBubble(text) {
      this.stage.querySelector('.oss-codex-reaction-bubble')?.remove();
      const bubble = document.createElement('span');
      bubble.className = 'oss-codex-reaction-bubble';
      bubble.textContent = text;
      this.stage.appendChild(bubble);
      const timer = window.setTimeout(() => bubble.remove(), 1500);
      this.reactionTimers.push(timer);
    }

    showConfetti() {
      if (!this.confetti) return;
      this.confetti.replaceChildren();
      for (let index = 0; index < 20; index += 1) {
        const piece = document.createElement('i');
        piece.style.setProperty('--confetti-color', confettiColors[index % confettiColors.length]);
        piece.style.setProperty('--confetti-left', `${9 + ((index * 37 + this.pokeBurst * 13) % 84)}%`);
        piece.style.setProperty('--confetti-delay', `${(index % 5) * 22}ms`);
        piece.style.setProperty('--confetti-drift', `${-42 + ((index * 29 + this.pokeBurst * 7) % 85)}px`);
        piece.style.setProperty('--confetti-rotation', `${(index * 71 + this.pokeBurst * 17) % 360}deg`);
        this.confetti.appendChild(piece);
      }
      const timer = window.setTimeout(() => this.confetti.replaceChildren(), 950);
      this.reactionTimers.push(timer);
    }
  }

  if (!customElements.get('codex-companion')) {
    customElements.define('codex-companion', CodexCompanion);
  }

  function mountCompanion() {
    const target = document.querySelector('.codex-welcome');
    const current = document.querySelector('codex-companion');
    if (!target) {
      current?.remove();
      return;
    }
    if (!current) {
      target.insertAdjacentElement('afterend', document.createElement('codex-companion'));
      return;
    }
    if (current.previousElementSibling !== target) {
      target.insertAdjacentElement('afterend', current);
    }
  }

  const observer = new MutationObserver(() => mountCompanion());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('DOMContentLoaded', mountCompanion, { once: true });
  mountCompanion();
})();
