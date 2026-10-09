// Local prototype fixture. Live sessions always use ElevenLabs.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assembleTrack } from '../server/src/audio.js';
const exec = promisify(execFile);
const directory = await mkdtemp(join(tmpdir(), 'outside-sample-'));
const prompts = [
  'Welcome to Outside. This is a three minute sample. Find a comfortable place to sit outdoors, and keep your eyes open. You can put your phone away. There is nothing you need to achieve right now.',
  'Let your breathing stay natural. Choose one detail you can see in your surroundings. Notice its shape or its color, without needing to name it or change anything.',
  'Listen to the sounds around you. Notice a sound nearby, and then one farther away. There is no need to block any of them out. Let the next quiet moment belong to your surroundings.',
  'If your attention has wandered, that is okay. Gently return to the detail you chose. Let this be a little space in your day, just as it is.',
  'Your break is coming to an end. Notice the ground supporting you. You can take another moment, or return to your day when you are ready. There is no right way to feel afterward.',
];
try {
  const clips: Buffer[] = [];
  for (let i = 0; i < prompts.length; i++) {
    const spoken = join(directory, `speech-${i}.aiff`);
    const mp3 = join(directory, `speech-${i}.mp3`);
    await exec('say', ['-v', 'Samantha', '-r', '125', '-o', spoken, prompts[i]]);
    await exec(process.env.FFMPEG_PATH || 'ffmpeg', ['-y', '-loglevel', 'error', '-i', spoken, mp3]);
    clips.push(await readFile(mp3));
  }
  const result = await assembleTrack(clips, 180, directory);
  await copyFile(result, new URL('../assets/audio/sample.mp3', import.meta.url));
} finally { await rm(directory, { recursive: true, force: true }); }
