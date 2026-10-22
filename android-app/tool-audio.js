/* Short original UI tones, generated offline after an explicit user gesture. */
class FocusTrackingAudio {
  constructor() { this.context = null; this.enabled = true; this.nodes = new Set(); }

  async unlock(enabled) {
    this.enabled = enabled;
    if (!enabled) { this.stop(true); return true; }
    try {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Audio) return false;
      if (!this.context || this.context.state === 'closed') this.context = new Audio();
      if (this.context.state !== 'running') await this.context.resume();
      return this.context.state === 'running';
    } catch { return false; }
  }

  tone(frequency, offset = 0, duration = .095, level = .055) {
    const ctx = this.context;
    if (!this.enabled || !ctx || ctx.state !== 'running') return;
    const start = ctx.currentTime + offset, end = start + duration;
    const oscillator = ctx.createOscillator(), gain = ctx.createGain();
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
  }

  pop(index) { this.tone(640 + (index % 4) * 35); }
  count() { this.tone(420, 0, .075, .035); }
  confirm() { this.tone(830, 0, .12, .045);this.tone(1100, .075, .14, .035); }

  stop(suspend = false) {
    for (const node of this.nodes) { try { node.stop(); } catch {} }
    this.nodes.clear();
    if (suspend && this.context?.state === 'running') this.context.suspend().catch(() => {});
  }
}
