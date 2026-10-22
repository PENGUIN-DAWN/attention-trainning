/* Offline decorative feedback only. Task audio and task clocks stay in their engines. */
class FocusFeedback {
  constructor({sound = () => true, reduced = () => false, active = () => true} = {}) {
    this.sound = sound;
    this.reduced = reduced;
    this.active = active;
    this.enabled = true;
    this.context = null;
    this.nodes = new Set();
    this.animations = new Map();
    this.generation = 0;
    this.suspended = false;
  }

  available() { return !this.suspended && !document.hidden && this.active(); }
  audible() { return this.available() && this.enabled && this.sound(); }

  // Call in a user gesture. An old resume must never revive cancelled feedback.
  async unlock(enabled = true) {
    this.enabled = enabled;
    if (!this.audible()) { this.stopAudio(true); return true; }
    const ticket = this.generation;
    try {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Audio) return false;
      if (!this.context || this.context.state === 'closed') this.context = new Audio();
      if (this.context.state !== 'running') await this.context.resume();
      if (ticket !== this.generation || !this.audible()) {
        if (!this.audible()) this.stopAudio(true);
        return false;
      }
      return this.context.state === 'running';
    } catch { return false; }
  }

  tone(frequency, offset = 0, duration = .095, level = .055) {
    const ctx = this.context;
    if (!this.audible() || !ctx || ctx.state !== 'running') return false;
    let oscillator, gain;
    try {
      const start = ctx.currentTime + offset, end = start + duration;
      oscillator = ctx.createOscillator();gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency * 1.3, start);
      oscillator.frequency.exponentialRampToValueAtTime(frequency, start + .045);
      gain.gain.setValueAtTime(.0001, start);
      gain.gain.exponentialRampToValueAtTime(level, start + .006);
      gain.gain.exponentialRampToValueAtTime(.0001, end);
      oscillator.connect(gain);gain.connect(ctx.destination);
      this.nodes.add(oscillator);
      oscillator.onended = () => { this.nodes.delete(oscillator);oscillator.disconnect();gain.disconnect(); };
      oscillator.start(start);oscillator.stop(end + .005);
      return true;
    } catch {
      this.nodes.delete(oscillator);
      try { oscillator?.stop(); } catch {}
      oscillator?.disconnect();gain?.disconnect();
      return false;
    }
  }

  // A closed preset list: no arbitrary asset loading or question-audio routing.
  play(name, {index = 0} = {}) {
    switch (name) {
      case 'click': return this.tone(600, 0, .055, .025);
      case 'pop': return this.tone(640 + (index % 4) * 35);
      case 'count': return this.tone(420, 0, .075, .035);
      case 'confirm': {
        const played = this.tone(830, 0, .12, .045);
        this.tone(1100, .075, .14, .035);
        return played;
      }
      default: return false;
    }
  }

  animate(element, keyframes, options) {
    if (!this.available() || this.reduced() || !element?.isConnected || !element.animate) return null;
    this.animations.get(element)?.cancel();
    try {
      const animation = element.animate(keyframes, options);
      this.animations.set(element, animation);
      animation.finished.catch(() => {}).finally(() => {
        if (this.animations.get(element) === animation) this.animations.delete(element);
      });
      return animation;
    } catch { return null; }
  }

  // Fire and forget AFTER accepting an action; never await in a training clock.
  click(element) {
    if (!this.available() || !element?.isConnected || element.disabled) return;
    this.animate(element, [{opacity: 1}, {opacity: .65, offset: .35}, {opacity: 1}],
      {duration: 140, easing: 'ease-out'});
    const ticket = this.generation;
    if (this.context?.state === 'running') { this.play('click');return; }
    this.unlock(this.enabled).then(ok => {
      if (ok && ticket === this.generation && element.isConnected) this.play('click');
    });
  }

  stopAudio(suspend = false) {
    for (const node of this.nodes) { try { node.stop(); } catch {} }
    this.nodes.clear();
    if (suspend && this.context?.state === 'running') this.context.suspend().catch(() => {});
  }

  stop(suspend = false) {
    this.generation++;
    this.stopAudio(suspend);
    for (const animation of this.animations.values()) animation.cancel();
    this.animations.clear();
  }

  sync() {
    if (!this.audible()) { this.generation++;this.stopAudio(true); }
    if (this.reduced() || !this.available()) {
      for (const animation of this.animations.values()) animation.cancel();
      this.animations.clear();
    }
  }

  suspend() { this.suspended = true;this.stop(true); }
  activate() { this.suspended = false; }
}
globalThis.FocusFeedback = FocusFeedback;
