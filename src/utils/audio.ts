// Web Audio API Synthesizer for Citofonía Virtual
// Authentic apartment intercom tones, door buzzer, keypad beeps and ringtones

class SoundManager {
  private ctx: AudioContext | null = null;
  private ringtoneInterval: number | null = null;
  private isMuted: boolean = false;

  private getContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopRingtone();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Dual-tone DTMF keypad click
  public playKeypadBeep(frequency: number = 700) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // Door lock release buzzer ("Buzzz-click" typical of electric strike latches)
  public playDoorBuzzer() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      // Harsh 60Hz/120Hz square wave with rich harmonics
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, ctx.currentTime);
      osc.frequency.setValueAtTime(100, ctx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + 0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.9);

      // Add a metallic click at the end
      setTimeout(() => {
        if (!this.ctx) return;
        const clickOsc = this.ctx.createOscillator();
        const clickGain = this.ctx.createGain();
        clickOsc.type = 'triangle';
        clickOsc.frequency.setValueAtTime(320, this.ctx.currentTime);
        clickGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        clickGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
        clickOsc.connect(clickGain);
        clickGain.connect(this.ctx.destination);
        clickOsc.start();
        clickOsc.stop(this.ctx.currentTime + 0.06);
      }, 750);
    } catch {
      // Silently catch audio policy blocks
    }
  }

  // Incoming phone ringtone cycle
  public startRingtone() {
    if (this.ringtoneInterval !== null) return;
    this.playRingCycle();
    this.ringtoneInterval = window.setInterval(() => {
      this.playRingCycle();
    }, 2800);
  }

  private playRingCycle() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const playChirp = (delay: number) => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, now + delay); // A4
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, now + delay); // B4

        gain.gain.setValueAtTime(0.07, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.8);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now + delay);
        osc2.start(now + delay);
        osc1.stop(now + delay + 0.85);
        osc2.stop(now + delay + 0.85);
      };

      playChirp(0);
      playChirp(0.9);
    } catch {
      // Audio autoplay policy
    }
  }

  public stopRingtone() {
    if (this.ringtoneInterval !== null) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }

  // Notification chime (e.g. for package arrival or alert)
  public playChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0.08, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.4);
      });
    } catch {
      // Fallback
    }
  }
}

export const soundFx = new SoundManager();
