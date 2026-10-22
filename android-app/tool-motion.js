/* Task motion stays live and offline. Physics is independent of display refresh. */
class FocusTrackingMotion {
  constructor(balls, condition = {}) {
    this.balls = balls;
    this.condition = condition;
    this.previous = balls.map(b => ({x: b.x, y: b.y}));
    this.positions = balls.map(b => ({x: b.x, y: b.y}));
    this.steps = 0;
    this.lastMs = 0;
  }

  sample(elapsedMs, final = false) {
    if (elapsedMs < this.lastMs || elapsedMs - this.lastMs > 250) return false;
    this.lastMs = elapsedMs;
    const target = elapsedMs * 120 / 1000;
    const steps = Math.floor(target + 1e-7);
    while (this.steps < steps) {
      for (let i = 0; i < this.balls.length; i++) {
        this.previous[i].x = this.balls[i].x;
        this.previous[i].y = this.balls[i].y;
      }
      FocusToolRules.step(this.balls, 1 / 120, this.condition);
      this.steps++;
    }
    const alpha = final ? 1 : Math.max(0, Math.min(1, target - steps));
    for (let i = 0; i < this.balls.length; i++) {
      const b = this.balls[i], p = this.previous[i], out = this.positions[i];
      out.x = p.x + (b.x - p.x) * alpha;
      out.y = p.y + (b.y - p.y) * alpha;
    }
    return this.positions;
  }
}

/* Static background plus small reusable compositor layers; no per-frame canvas paint. */
class FocusTrackingView {
  constructor(canvas, question, condition) {
    this.question = question;
    this.condition = condition;
    this.animations = new Set();
    this.arena = document.createElement('div');
    this.arena.className = 'tracking-arena';
    canvas.before(this.arena);
    this.arena.append(canvas);
    const ctx = canvas.getContext('2d', {alpha: false});
    ctx.fillStyle = '#f3f5fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.layer = document.createElement('div');
    this.layer.className = 'tracking-layer';
    this.layer.setAttribute('aria-hidden', 'true');
    this.arena.append(this.layer);
    this.nodes = question.balls.map(() => {
      const node = document.createElement('span');
      node.className = 'tracking-ball';
      const surface = document.createElement('span');surface.className = 'tracking-surface';
      const label = document.createElement('span');label.className = 'tracking-label';
      surface.append(label);node.append(surface);
      this.layer.append(node);
      return node;
    });
    this.countdown = document.createElement('div');
    this.countdown.className = 'tracking-countdown';this.countdown.setAttribute('aria-hidden', 'true');
    this.countdown.hidden = true;
    this.arena.append(this.countdown);
    this.width = this.layer.getBoundingClientRect().width;
    this.observer = new ResizeObserver(entries => {
      this.width = entries[0].contentRect.width;
      this.layer.style.setProperty('--track-unit', this.width / 600 + 'px');
      if (this.positions) this.move(this.positions);
    });
    this.observer.observe(this.layer);
  }

  showCountdown(value) { this.countdown.hidden = false;this.countdown.textContent = value; }
  hideCountdown() { this.countdown.hidden = true; }

  reveal(index, reduced) {
    const node = this.nodes[index];
    if (node.classList.contains('visible')) return;
    node.classList.add('visible');
    if (reduced) return;
    const animation = node.querySelector('.tracking-surface').animate([
      {opacity: 0, transform: 'translateY(7px) scale(.35)'},
      {opacity: 1, transform: 'translateY(-1px) scale(1.08)', offset: .7},
      {opacity: 1, transform: 'translateY(0) scale(1)'}
    ], {duration: this.condition.introPopMs, easing: 'cubic-bezier(.2,.75,.3,1)', fill: 'backwards'});
    this.animations.add(animation);
    animation.finished.catch(() => {}).finally(() => this.animations.delete(animation));
  }

  finishEntrance() {
    for (const animation of this.animations) { try { animation.finish(); } catch {} }
    this.animations.clear();
  }

  move(positions) {
    this.positions = positions;
    for (let i = 0; i < this.nodes.length; i++) {
      const p = positions[i];
      this.nodes[i].style.transform = 'translate3d(' + (p.x * this.width).toFixed(3) + 'px,' + (p.y * this.width).toFixed(3) + 'px,0)';
    }
  }

  render(phase, labelsVisible, positions = this.question.balls) {
    const mode = phase === 'mark' ? 'mark' : labelsVisible ? 'labels' : 'motion';
    if (mode !== this.mode) {
      this.mode = mode;
      for (let i = 0; i < this.nodes.length; i++) {
        const b = this.question.balls[i], node = this.nodes[i];
        node.classList.toggle('target', mode === 'mark' && this.question.targets.includes(b.id));
        node.querySelector('.tracking-label').textContent = mode === 'labels' ? this.question.labels[b.id] : '';
      }
    }
    this.move(positions);
  }

  destroy() {
    this.observer.disconnect();
    for (const animation of this.animations) animation.cancel();
    this.animations.clear();
    for (const node of this.nodes) node.classList.remove('target');
  }
}
