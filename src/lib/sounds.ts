class SoundEngine {
  private ctx: AudioContext | null = null;
  public isEnabled = false;

  init() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  enable() {
    this.isEnabled = true;
    this.init();
  }

  disable() {
    this.isEnabled = false;
  }

  playClick() {
    if (!this.isEnabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    
    const t = this.ctx.currentTime;
    
    // Low thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.06);
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.06);
    
    // High crisp click
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(600, t);
    clickOsc.frequency.exponentialRampToValueAtTime(100, t + 0.02);
    
    clickGain.gain.setValueAtTime(0, t);
    clickGain.gain.linearRampToValueAtTime(0.08, t + 0.005);
    clickGain.gain.exponentialRampToValueAtTime(0.01, t + 0.02);
    
    clickOsc.connect(clickGain);
    clickGain.connect(this.ctx.destination);
    
    clickOsc.start(t);
    clickOsc.stop(t + 0.02);
  }

  playType() {
    if (!this.isEnabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    const baseFreq = 180 + Math.random() * 40;
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.3, t + 0.05);
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + 0.05);
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.05);
  }

  playScroll() {
    if (!this.isEnabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.015);
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.03, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.015);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.015);
  }
}

export const sounds = new SoundEngine();
