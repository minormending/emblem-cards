let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = "square",
  volume = 0.15,
  slide?: number
) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  if (slide) {
    osc.frequency.linearRampToValueAtTime(slide, c.currentTime + duration);
  }
  gain.gain.setValueAtTime(volume, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration);
}

function playNoise(duration: number, volume = 0.08) {
  const c = getCtx();
  const bufferSize = c.sampleRate * duration;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = c.createBufferSource();
  source.buffer = buffer;
  const gain = c.createGain();
  gain.gain.setValueAtTime(volume, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  source.connect(gain);
  gain.connect(c.destination);
  source.start();
}

export const sfx = {
  deploy() {
    playTone(220, 0.08, "square", 0.12);
    setTimeout(() => playTone(330, 0.1, "square", 0.1), 60);
  },

  attack() {
    playNoise(0.08, 0.12);
    setTimeout(() => playTone(180, 0.12, "sawtooth", 0.1, 90), 30);
  },

  hit() {
    playTone(150, 0.06, "square", 0.15);
    playNoise(0.05, 0.1);
  },

  ko() {
    playTone(440, 0.1, "square", 0.12);
    setTimeout(() => playTone(330, 0.1, "square", 0.1), 80);
    setTimeout(() => playTone(220, 0.15, "square", 0.08), 160);
    setTimeout(() => playNoise(0.15, 0.06), 200);
  },

  endTurn() {
    playTone(660, 0.06, "sine", 0.08);
    setTimeout(() => playTone(880, 0.08, "sine", 0.06), 70);
  },

  draw() {
    playTone(500, 0.04, "sine", 0.06);
  },

  error() {
    playTone(150, 0.1, "square", 0.1);
    setTimeout(() => playTone(120, 0.15, "square", 0.08), 100);
  },

  victory() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => {
      setTimeout(() => playTone(n, 0.2, "square", 0.1), i * 120);
    });
  },

  defeat() {
    const notes = [392, 330, 262, 196];
    notes.forEach((n, i) => {
      setTimeout(() => playTone(n, 0.25, "sawtooth", 0.08), i * 150);
    });
  },

  select() {
    playTone(440, 0.03, "sine", 0.06);
  },
};
