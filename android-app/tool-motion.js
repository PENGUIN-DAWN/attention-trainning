/* Exact collision times give continuous, piecewise-linear paths with no overlap correction jumps. */
class FocusTrackingPlan {
  constructor(input, durationMs) {
    const balls = input.map(b => ({...b})), radius = .044, end = durationMs / 1000;
    this.frames = [];this.durationMs = durationMs;
    let time = 0, events = 0;
    const snapshot = () => {
      const frame = {ms: time * 1000, points: balls.map(b => ({x: b.x, y: b.y}))};
      if (this.frames.length && Math.abs(this.frames.at(-1).ms-frame.ms) < 1e-7) this.frames[this.frames.length-1] = frame;
      else this.frames.push(frame);
    };
    snapshot();
    while (time < end - 1e-10) {
      let next = end-time, hit = null;
      for (let i=0;i<balls.length;i++) for (const axis of ['x','y']) {
        const b=balls[i], v=b['v'+axis];
        if (Math.abs(v)<1e-12) continue;
        const t=((v>0?1-radius:radius)-b[axis])/v;
        if (t>=-1e-9 && t<next) {next=Math.max(0,t);hit={i,axis};}
      }
      for (let i=0;i<balls.length;i++) for (let j=i+1;j<balls.length;j++) {
        const a=balls[i],b=balls[j],dx=b.x-a.x,dy=b.y-a.y,vx=b.vx-a.vx,vy=b.vy-a.vy;
        const speed2=vx*vx+vy*vy,dot=dx*vx+dy*vy,disc=dot*dot-speed2*(dx*dx+dy*dy-4*radius*radius);
        if (speed2<1e-15 || dot>=-1e-12 || disc<=0) continue;
        const t=(-dot-Math.sqrt(disc))/speed2;
        if (t>=-1e-9 && t<next) {next=Math.max(0,t);hit={i,j};}
      }
      for (const b of balls) {b.x+=b.vx*next;b.y+=b.vy*next;}
      time+=next;snapshot();
      if (!hit) break;
      const a=balls[hit.i];
      if (hit.axis) a['v'+hit.axis]*=-1;
      else {
        const b=balls[hit.j],dx=b.x-a.x,dy=b.y-a.y,distance=Math.hypot(dx,dy),nx=dx/distance,ny=dy/distance;
        const impulse=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
        a.vx+=impulse*nx;a.vy+=impulse*ny;b.vx-=impulse*nx;b.vy-=impulse*ny;
      }
      if (++events>10000) throw Error('Tracking collision plan did not converge');
    }
    this.frames.at(-1).ms = durationMs;
    this.final = balls;
  }

  sample(ms, out) {
    let lo=0,hi=this.frames.length-1;
    while (lo+1<hi) {const mid=(lo+hi)>>1;if(this.frames[mid].ms<=ms)lo=mid;else hi=mid;}
    const a=this.frames[lo],b=this.frames[hi],alpha=Math.max(0,Math.min(1,(ms-a.ms)/(b.ms-a.ms||1)));
    for(let i=0;i<out.length;i++){out[i].x=a.points[i].x+(b.points[i].x-a.points[i].x)*alpha;out[i].y=a.points[i].y+(b.points[i].y-a.points[i].y)*alpha;}
    return out;
  }
}

/* Old rules retain fixed-step physics. V4 plays the same path at any display refresh. */
class FocusTrackingMotion {
  constructor(balls, condition = {}) {
    this.balls = balls;
    this.condition = condition;
    this.previous = balls.map(b => ({x: b.x, y: b.y}));
    this.positions = balls.map(b => ({x: b.x, y: b.y}));
    this.steps = 0;
    this.lastMs = 0;
    this.plan = condition.ruleVersion >= 4 ? new FocusTrackingPlan(balls, condition.motionMs) : null;
  }

  sample(elapsedMs, final = false) {
    if (elapsedMs < this.lastMs || elapsedMs - this.lastMs > 250) return false;
    this.lastMs = elapsedMs;
    if (this.plan) {
      if (final) this.balls.forEach((b,i)=>Object.assign(b,this.plan.final[i]));
      return this.plan.sample(elapsedMs,this.positions);
    }
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
    this.motionAnimations = [];
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
      if (this.motionAnimations.length) {
        for (let i=0;i<this.motionAnimations.length;i++) this.motionAnimations[i].effect.setKeyframes(this.keyframes(i));
      } else if (this.positions) this.move(this.positions);
    });
    this.observer.observe(this.layer);
  }

  showCountdown(value) { this.countdown.hidden = false;this.countdown.textContent = value; }
  hideCountdown() { this.countdown.hidden = true; }

  reveal(index, reduced) {
    const node = this.nodes[index];
    if (node.classList.contains('visible')) return;
    node.classList.add('visible');
    if (reduced || typeof node.querySelector('.tracking-surface').animate !== 'function') return;
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

  keyframes(index) {
    return this.motion.plan.frames.map(frame=>({offset:frame.ms/this.motion.plan.durationMs,transform:this.transform(frame.points[index])}));
  }

  startMotion(motion, duration) {
    this.motion = motion;
    if (!motion.plan || !this.nodes.every(node=>typeof node.animate==='function')) return;
    const origin = document.timeline.currentTime;
    try {
      for (let i=0;i<this.nodes.length;i++) {
        const animation=this.nodes[i].animate(this.keyframes(i),{duration,easing:'linear',fill:'both'});
        this.motionAnimations.push(animation);animation.startTime=origin;
      }
    } catch {
      for (const animation of this.motionAnimations) animation.cancel();
      this.motionAnimations=[];
    }
  }

  advance(motion, ms, final) {
    if (this.motionAnimations.length && !final) {motion.lastMs=ms;return true;}
    const positions=motion.sample(ms,final);
    if (!positions) return false;
    this.move(positions);
    if (final) {
      for (const animation of this.motionAnimations) animation.cancel();
      this.motionAnimations=[];
    }
    return true;
  }

  transform(p) { return 'translate3d('+(p.x*this.width).toFixed(4)+'px,'+(p.y*this.width).toFixed(4)+'px,0)'; }

  move(positions) {
    this.positions = positions;
    for (let i = 0; i < this.nodes.length; i++) {
      const p = positions[i];
      this.nodes[i].style.transform = this.transform(p);
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
    for (const animation of this.motionAnimations) animation.cancel();
    this.motionAnimations=[];
    for (const node of this.nodes) node.classList.remove('target');
  }
}
