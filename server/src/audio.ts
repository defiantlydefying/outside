import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pauseSchedule } from './session.js';

const exec = promisify(execFile);
const ffmpeg = () => process.env.FFMPEG_PATH || 'ffmpeg';
const ffprobe = () => process.env.FFPROBE_PATH || 'ffprobe';

export async function duration(path: string): Promise<number> {
  const { stdout } = await exec(ffprobe(), ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', path], { timeout: 30_000 });
  const result = Number(stdout.trim());
  if (!Number.isFinite(result) || result <= 0) throw new Error('Could not read narration duration.');
  return result;
}

export async function assembleTrack(clips: Buffer[], totalSeconds: number, directory: string): Promise<string> {
  const paths = clips.map((_, index) => join(directory, `voice-${index}.mp3`));
  await Promise.all(paths.map((path, index) => writeFile(path, clips[index])));
  const durations = await Promise.all(paths.map(duration));
  const pauses = pauseSchedule(totalSeconds, durations);
  // Decode to identical PCM formats, concatenate narration and real silence,
  // then encode once. Locking the screen cannot suspend the pauses.
  const ordered: string[] = [];
  for (let index = 0; index < paths.length; index++) {
    const pcm = join(directory, `voice-${index}.wav`);
    await exec(ffmpeg(), ['-y', '-loglevel', 'error', '-i', paths[index], '-ar', '44100', '-ac', '1', pcm], { timeout: 30_000 });
    ordered.push(pcm);
    if (index < pauses.length) {
      const silence = join(directory, `quiet-${index}.wav`);
      await exec(ffmpeg(), ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', String(pauses[index]), silence], { timeout: 30_000 });
      ordered.push(silence);
    }
  }
  const manifest = join(directory, 'track.txt');
  // All filenames above are generated locally, not supplied by the user.
  await writeFile(manifest, ordered.map(path => `file '${path}'`).join('\n'));
  const output = join(directory, 'break.mp3');
  await exec(ffmpeg(), ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', manifest, '-t', String(totalSeconds), '-codec:a', 'libmp3lame', '-b:a', '96k', output], { timeout: 60_000 });
  return output;
}

export async function narrate(text: string): Promise<Buffer> {
  const key = process.env.ELEVENLABS_API_KEY;
  const voice = process.env.ELEVENLABS_VOICE_ID;
  if (!key || !voice) throw new Error('ElevenLabs is not configured.');
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`, {
    method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_TTS_MODEL || 'eleven_flash_v2_5', voice_settings: { stability: 0.65, similarity_boost: 0.75, speed: 0.85 } }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`Voice generation failed (${response.status}). Check your ElevenLabs credits and selected voice.`);
  return Buffer.from(await response.arrayBuffer());
}

export async function transcribe(buffer: Buffer): Promise<string> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('ElevenLabs is not configured.');
  const body = new FormData();
  body.append('file', new Blob([new Uint8Array(buffer)], { type: 'audio/mp4' }), 'check-in.m4a');
  body.append('model_id', process.env.ELEVENLABS_STT_MODEL || 'scribe_v2');
  body.append('tag_audio_events', 'false');
  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': key }, body, signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Transcription failed (${response.status}). You can type your check-in instead.`);
  const data = await response.json() as { text?: string };
  if (!data.text?.trim()) throw new Error('No speech was detected. Try again or type your check-in.');
  return data.text.trim().slice(0, 500);
}

export async function readTrack(path: string) { return readFile(path); }
