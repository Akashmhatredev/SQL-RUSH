/**
 * Synthesises the game's sound effects as small 16-bit mono WAV files in
 * public/sounds. No samples or external assets are needed.
 *
 *   npm run generate:sounds
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const RATE = 22050;
const OUT = path.join(process.cwd(), "public", "sounds");

const TAU = Math.PI * 2;
const osc = {
  sine: (p) => Math.sin(TAU * p),
  triangle: (p) => 1 - 4 * Math.abs(((p + 0.25) % 1) - 0.5),
  square: (p) => (p % 1 < 0.5 ? 1 : -1) * 0.6,
  saw: (p) => 2 * (p % 1) - 1,
};

/** Render a list of notes into a Float32 buffer. */
function render(duration, notes) {
  const buf = new Float32Array(Math.ceil(duration * RATE));
  for (const n of notes) {
    const { start = 0, dur, freq, to = freq, wave = "sine", gain = 0.5, attack = 0.005, vibrato = 0 } = n;
    const s0 = Math.floor(start * RATE);
    const len = Math.floor(dur * RATE);
    let phase = 0;
    for (let i = 0; i < len && s0 + i < buf.length; i++) {
      const t = i / RATE;
      const k = i / len;
      const f = freq * Math.pow(to / freq, k) * (1 + vibrato * Math.sin(TAU * 6 * t));
      phase += f / RATE;
      const env = Math.min(1, t / attack) * Math.pow(1 - k, 2.2);
      buf[s0 + i] += osc[wave](phase) * gain * env;
    }
  }
  return buf;
}

function toWav(samples) {
  // Soft-clip and normalise to leave a little headroom.
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const scale = peak > 0 ? 0.85 / peak : 1;
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.tanh(s * scale) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const sounds = {
  correct: render(0.4, [
    { start: 0, dur: 0.12, freq: 1046.5, wave: "triangle", gain: 0.5 },
    { start: 0.08, dur: 0.3, freq: 1568, wave: "sine", gain: 0.55 },
    { start: 0.08, dur: 0.3, freq: 3136, wave: "sine", gain: 0.08 },
  ]),
  wrong: render(0.45, [
    { start: 0, dur: 0.18, freq: 233, to: 220, wave: "square", gain: 0.35 },
    { start: 0.16, dur: 0.28, freq: 196, to: 150, wave: "square", gain: 0.4 },
    { start: 0, dur: 0.44, freq: 110, to: 80, wave: "sine", gain: 0.3 },
  ]),
  levelup: render(0.95, [
    { start: 0, dur: 0.14, freq: 523.25, wave: "triangle", gain: 0.45 },
    { start: 0.1, dur: 0.14, freq: 659.25, wave: "triangle", gain: 0.45 },
    { start: 0.2, dur: 0.14, freq: 783.99, wave: "triangle", gain: 0.45 },
    { start: 0.3, dur: 0.6, freq: 1046.5, wave: "triangle", gain: 0.5, vibrato: 0.006 },
    { start: 0.3, dur: 0.6, freq: 2093, wave: "sine", gain: 0.12 },
    { start: 0.3, dur: 0.6, freq: 1318.5, wave: "sine", gain: 0.2 },
  ]),
  achievement: render(1.0, [
    { start: 0, dur: 0.1, freq: 783.99, wave: "sine", gain: 0.4 },
    { start: 0.07, dur: 0.1, freq: 987.77, wave: "sine", gain: 0.4 },
    { start: 0.14, dur: 0.1, freq: 1174.66, wave: "sine", gain: 0.4 },
    { start: 0.21, dur: 0.75, freq: 1567.98, wave: "sine", gain: 0.45 },
    { start: 0.21, dur: 0.75, freq: 1567.98 * 2.76, wave: "sine", gain: 0.08 },
    { start: 0.21, dur: 0.75, freq: 1567.98 * 5.4, wave: "sine", gain: 0.04 },
  ]),
  warning: render(0.12, [
    { start: 0, dur: 0.1, freq: 880, wave: "square", gain: 0.3, attack: 0.002 },
    { start: 0, dur: 0.1, freq: 1760, wave: "sine", gain: 0.15, attack: 0.002 },
  ]),
  combo: render(0.5, [
    { start: 0, dur: 0.3, freq: 400, to: 1400, wave: "saw", gain: 0.18 },
    { start: 0.18, dur: 0.3, freq: 1318.5, wave: "sine", gain: 0.4 },
    { start: 0.26, dur: 0.22, freq: 1975.5, wave: "sine", gain: 0.3 },
  ]),
  gameover: render(0.9, [
    { start: 0, dur: 0.25, freq: 392, wave: "triangle", gain: 0.45 },
    { start: 0.22, dur: 0.25, freq: 329.63, wave: "triangle", gain: 0.45 },
    { start: 0.44, dur: 0.45, freq: 261.63, to: 246.94, wave: "triangle", gain: 0.5 },
  ]),
};

mkdirSync(OUT, { recursive: true });
for (const [name, samples] of Object.entries(sounds)) {
  const file = path.join(OUT, `${name}.wav`);
  const wav = toWav(samples);
  writeFileSync(file, wav);
  console.log(`${name}.wav  ${(wav.length / 1024).toFixed(1)} KB`);
}
