import { writeFile } from 'node:fs/promises';

// Original, beat-free C-major pad. Slow swells and soft harmonics keep it unobtrusive.
// Generate the full bed rather than looping a clip with an audible seam.
export async function makeAmbientBed(path: string, seconds: number) {
  const rate = 44100;
  const frames = Math.round(seconds * rate);
  const data = Buffer.alloc(44 + frames * 2);
  data.write('RIFF', 0); data.writeUInt32LE(data.length - 8, 4);
  data.write('WAVEfmt ', 8); data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
  data.writeUInt32LE(rate, 24); data.writeUInt32LE(rate * 2, 28);
  data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34);
  data.write('data', 36); data.writeUInt32LE(frames * 2, 40);
  const notes = [130.8128, 195.9977, 261.6256, 329.6276, 391.9954];
  for (let frame = 0; frame < frames; frame++) {
    const t = frame / rate;
    const fade = Math.min(1, t / 8, (seconds - t) / 12);
    let sample = 0;
    for (let index = 0; index < notes.length; index++) {
      const swell = 0.65 + 0.35 * Math.sin(2 * Math.PI * t / (37 + index * 11) + index);
      const phase = 2 * Math.PI * notes[index] * t;
      sample += swell * (Math.sin(phase) + 0.12 * Math.sin(phase * 2)) / notes.length;
    }
    data.writeInt16LE(Math.round(sample * fade * 0.08 * 32767), 44 + frame * 2);
  }
  await writeFile(path, data);
}
