import test from 'node:test';
import assert from 'node:assert/strict';
import { newListeningState, updateListening, replyFinished } from '../src/lib/listening.ts';

test('silence alone never creates a spoken reply', () => {
  let state = newListeningState();
  for (let time = 0; time < 10_000; time += 100) state = updateListening(state, -65, time);
  assert.equal(state.speechAt, null);
  assert.equal(replyFinished(state, 10_000), false);
});
test('speech needs a pause before a reply is sent', () => {
  let state = updateListening(newListeningState(), -60, 100);
  state = updateListening(state, -25, 700);
  state = updateListening(state, -25, 1700);
  assert.equal(replyFinished(state, 2500), false);
  assert.equal(replyFinished(state, 3300), true);
});
test('missing metering does not submit audio or invent speech', () => {
  assert.deepEqual(updateListening(newListeningState(), undefined, 1000), newListeningState());
});
