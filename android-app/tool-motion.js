/* Task motion stays live and offline. Physics is independent of display refresh. */
class FocusTrackingMotion {
  constructor(balls) {
    this.balls = balls;
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
      FocusToolRules.step(this.balls, 1 / 120);
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
  constructor(canvas, question) {
    this.question = question;
    this.arena = document.createElement('div');
    this.arena.className = 'tracking-arena';
    canvas.before(this.arena);
    this.arena.append(canvas);
    const ctx = canvas.getContext('2d', {alpha: false});
    ctx.fillStyle = '#f3f5fa';
    ctx.fillRect(0, 0, 600, 600);
    this.layer = document.createElement('div');
    this.layer.className = 'tracking-layer';
    this.layer.setAttribute('aria-hidden', 'true');
    this.arena.append(this.layer);
    this.nodes = question.balls.map(() => {
      const node = document.createElement('span');
      node.className = 'tracking-ball';
      this.layer.append(node);
      return node;
    });
    this.width = this.layer.getBoundingClientRect().width;
    this.observer = new ResizeObserver(entries => {
      this.width = entries[0].contentRect.width;
      this.layer.style.setProperty('--track-unit', this.width / 600 + 'px');
      if (this.positions) this.move(this.positions);
    });
    this.observer.observe(this.layer);
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
        node.textContent = mode === 'labels' ? this.question.labels[b.id] : '';
      }
    }
    this.move(positions);
  }

  destroy() { this.observer.disconnect(); }
}
