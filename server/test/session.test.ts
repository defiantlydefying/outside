import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { checkInSchema, validateScript, pauseSchedule, type CheckIn } from '../src/session.js';
import { assembleTrack, duration } from '../src/audio.js';

const input: CheckIn = { minutes: 3, feeling: 'Restless', surroundings: 'Leaves moving', position: 'Walking', guidance: 'Less' };
test('rejects invalid session lengths and oversized check-ins', () => {
  assert.equal(checkInSchema.safeParse({ ...input, minutes: 45 }).success, false);
  assert.equal(checkInSchema.safeParse({ ...input, surroundings: 'x'.repeat(501) }).success, false);
});
test('rejects risky instructions and overlong narration', () => {
  const script = { title: 'A moment outdoors', prompts: Array(5).fill('Notice a detail around you. Keep your eyes open.') };
  assert.deepEqual(validateScript(script, input), script);
  assert.throws(() => validateScript({ ...script, prompts: [...script.prompts.slice(0, 4), 'Close your eyes while walking.'] }, input));
  assert.throws(() => validateScript({ ...script, prompts: Array(5).fill('notice '.repeat(40)) }, input));
});
test('quiet spaces fill the requested length without truncating narration', () => {
  const pauses = pauseSchedule(180, [10, 12, 14, 10, 14]);
  assert.equal(pauses.reduce((sum, n) => sum + n, 0), 120);
  assert.throws(() => pauseSchedule(180, [35, 35, 35, 35, 35]));
  assert.throws(() => pauseSchedule(180, [NaN, 10, 10, 10, 10]));
});
test('renders one continuous track at the requested duration', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'outside-test-'));
  try {
    const clip = join(directory, 'fixture.mp3');
    await promisify(execFile)(process.env.FFMPEG_PATH || 'ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', clip]);
    const bytes = await readFile(clip);
    const path = await assembleTrack(Array(5).fill(bytes), 60, directory);
    assert.ok(Math.abs(await duration(path) - 60) < 0.1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
