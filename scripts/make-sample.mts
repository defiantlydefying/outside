// Run from the project root with the backend's private settings:
// node --env-file=server/.env --import ./server/node_modules/tsx/dist/loader.mjs scripts/make-sample.mts
// Regenerating narration spends ElevenLabs credits; phone playback does not.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assembleTrack } from '../server/src/audio.js';
import { makeAmbientBed } from './ambient.mjs';
const exec = promisify(execFile);
const directory = await mkdtemp(join(tmpdir(), 'outside-sample-'));
const prompts = [
  'Welcome to Outside. Find a comfortable place to sit outdoors, and keep your eyes open. Feel the ground supporting you. There is nothing you need to achieve right now.',
  'Let your breathing stay natural. Choose one detail you can see in your surroundings. Notice its shape or its color, without needing to name it or change anything.',
  'Listen to the sounds around you. Notice a sound nearby, and then one farther away. There is no need to block any of them out. Let the next quiet moment belong to your surroundings.',
  'If your attention has wandered, that is okay. Gently return to the detail you chose. Let this be a little space in your day, just as it is.',
  'Your break is coming to an end. Notice the ground supporting you. You can take another moment, or return to your day when you are ready. There is no right way to feel afterward.',
];
try {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('Set ELEVENLABS_API_KEY in server/.env before generating the sample.');
  const voice = process.env.OUTSIDE_SAMPLE_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';
  const clips: Buffer[] = [];
  for (let i = 0; i < prompts.length; i++) {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: prompts[i], previous_text: prompts[i - 1], next_text: prompts[i + 1],
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.8, similarity_boost: 0.75, speed: 0.8, use_speaker_boost: true },
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error(`Sample narration failed (${response.status}).`);
    clips.push(Buffer.from(await response.arrayBuffer()));
    console.log(`Narration ${i + 1}/${prompts.length} ready.`);
  }
  const narration = await assembleTrack(clips, 180, directory);
  const bed = join(directory, 'ambient.wav');
  await makeAmbientBed(bed, 180);
  const result = join(directory, 'sample-elevenlabs.mp3');
  await exec(process.env.FFMPEG_PATH || 'ffmpeg', [
    '-y', '-loglevel', 'error', '-i', narration, '-i', bed,
    '-filter_complex', '[0:a]loudnorm=I=-20:TP=-3:LRA=7,aresample=44100[voice];[1:a]volume=0.55[music];[voice][music]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.89:level=false[out]',
    '-map', '[out]', '-t', '180', '-codec:a', 'libmp3lame', '-b:a', '128k',
    '-metadata', 'title=A little room to breathe | elevenlabs.io',
    '-metadata', 'artist=Outside; narration by elevenlabs.io (Sarah)',
    '-metadata', 'comment=Original ambient composition; non-commercial ElevenLabs free-plan narration.',
    result,
  ], { timeout: 60_000 });
  await copyFile(result, new URL('../assets/audio/sample-elevenlabs.mp3', import.meta.url));
  console.log('Three-minute Sarah sample with ambient music ready.');
} finally { await rm(directory, { recursive: true, force: true }); }
