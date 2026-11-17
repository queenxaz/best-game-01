// LUMEN KEEPER — procedural sound, no audio files.
// Every effect is a few oscillators through one WebAudio context, created on
// the first user gesture (browsers block audio before that). Muted until the
// player presses a key or clicks, so the title screen stays silent.

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicTimer = 0;
    this.musicStep = 0;
  }

  unlock() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
      } catch {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  tone(freq, dur, type, gain, slideTo) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    amp.gain.setValueAtTime(gain || 0.12, t0);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp);
    amp.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  pickup(combo) {
    // A bright coin blip that climbs with the combo chain.
    const base = 660 + Math.min(combo, 12) * 28;
    this.tone(base, 0.09, 'sine', 0.1);
    this.tone(base * 1.5, 0.12, 'sine', 0.06);
  }

  kill() {
    this.tone(220, 0.14, 'triangle', 0.1, 60);
  }

  hurt() {
    this.tone(140, 0.25, 'sawtooth', 0.14, 55);
  }

  flare() {
    this.tone(520, 0.35, 'sine', 0.14, 1200);
    this.tone(260, 0.3, 'triangle', 0.08, 700);
  }

  light() {
    // A brazier catching: warm rising chord.
    this.tone(392, 0.3, 'sine', 0.1);
    this.tone(523, 0.35, 'sine', 0.08);
    this.tone(659, 0.4, 'sine', 0.06);
  }

  buy() {
    this.tone(784, 0.1, 'sine', 0.1);
    this.tone(1046, 0.16, 'sine', 0.08);
  }

  denied() {
    this.tone(160, 0.12, 'square', 0.06, 110);
  }

  horn() {
    // A wave beginning: two low brass-ish notes.
    this.tone(196, 0.5, 'sawtooth', 0.07);
    this.tone(294, 0.55, 'sawtooth', 0.06);
  }

  boss() {
    this.tone(82, 0.8, 'sawtooth', 0.12, 45);
    this.tone(110, 0.7, 'square', 0.06, 55);
  }

  victory() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.35, 'sine', 0.1), i * 130);
    });
  }

  defeat() {
    [392, 330, 262, 196].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.4, 'triangle', 0.1), i * 170);
    });
  }

  // A slow two-note lantern drone that breathes under play. Called once per
  // frame; it only schedules a note every few seconds.
  update(dt, playing) {
    if (!this.ctx || this.muted || !playing) return;
    this.musicTimer -= dt;
    if (this.musicTimer <= 0) {
      this.musicTimer = 3.2;
      const notes = [220, 277, 330, 262];
      const note = notes[this.musicStep % notes.length];
      this.musicStep += 1;
      this.tone(note, 2.6, 'sine', 0.035);
      this.tone(note * 2, 2.2, 'sine', 0.015);
    }
  }
}
