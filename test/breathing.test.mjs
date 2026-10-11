import test from 'node:test';
import assert from 'node:assert/strict';
import { breathingCue } from '../src/lib/breathing.ts';

test('breathing starts with four seconds of inhale and moves directly to six seconds of exhale', () => {
  assert.deepEqual(breathingCue(0), { inhale: true, seconds: 4 });
  assert.deepEqual(breathingCue(3999), { inhale: true, seconds: 1 });
  assert.deepEqual(breathingCue(4000), { inhale: false, seconds: 6 });
  assert.deepEqual(breathingCue(9999), { inhale: false, seconds: 1 });
  assert.deepEqual(breathingCue(10000), { inhale: true, seconds: 4 });
});
