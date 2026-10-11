import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.js';
import { validateReply, type TurnInput } from '../src/conversation.js';

test('conversations retain context, preserve quiet turns, recover failed replies, and delete audio', async () => {
  const token = 'conversation-test-token-at-least-24-characters';
  const inputs: TurnInput[] = [];
  let fail = false;
  const fixture = createApp({ token, ready: () => true, generate: async () => { throw new Error('Not used'); }, speak: async text => Buffer.from(`spoken:${text}`), respond: async input => {
    inputs.push(input);
    if (fail) { fail = false; throw new Error('private provider details'); }
    return { text: 'Let sounds arrive and pass. If a thought pulls you away, gently return to listening.', mode: 'quiet', quietSeconds: 40, practice: 'listening' };
  } });
  const server = fixture.app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/conversations`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const post = (path: string, body: unknown) => fetch(`${base}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  try {
    assert.equal((await fetch(base, { method: 'POST' })).status, 401);
    const first = await post('', {});
    assert.equal(first.status, 201);
    const start = await first.json() as { id: string; turn: number; audioPath: string };
    assert.equal((await fetch(`${base.replace('/api/conversations', '')}${start.audioPath}`)).status, 401);
    assert.equal((await post(`/${start.id}/turns`, { turn: 1, action: 'reply' })).status, 400);
    const reply = await post(`/${start.id}/turns`, { turn: 1, action: 'reply', message: 'Work is overwhelming. I see leaves on a tree.' });
    assert.equal(reply.status, 200);
    assert.equal((await reply.json() as { mode: string }).mode, 'quiet');
    assert.equal(inputs[0].messages[0].role, 'assistant');
    assert.equal(inputs[0].messages[1].content, 'Work is overwhelming. I see leaves on a tree.');
    assert.equal((await post(`/${start.id}/turns`, { turn: 1, action: 'reply', message: 'Work is overwhelming. I see leaves on a tree.' })).status, 200);
    assert.equal(inputs.length, 1, 'retrying the same turn must not spend more provider credits');
    assert.equal((await post(`/${start.id}/turns`, { turn: 1, action: 'continue' })).status, 409);
    fail = true;
    const failure = await post(`/${start.id}/turns`, { turn: 2, action: 'reply', message: 'Less talking, please.' });
    assert.equal(failure.status, 502);
    assert.ok(!(await failure.text()).includes('private provider details'));
    const continued = await post(`/${start.id}/turns`, { turn: 2, action: 'reply', message: 'Less talking, please.' });
    assert.equal(continued.status, 200);
    assert.deepEqual(inputs[1].messages, inputs[2].messages);
    const quiet = await post(`/${start.id}/turns`, { turn: 3, action: 'continue' });
    assert.equal(quiet.status, 200);
    assert.match(inputs[3].messages.at(-1)!.content, /intentional quiet/);
    const closed = await post(`/${start.id}/turns`, { turn: 4, action: 'reply', message: 'stop' });
    const ending = await closed.json() as { mode: string };
    assert.equal(ending.mode, 'finish');
    assert.equal(inputs.length, 4, 'stop must not require another model call');
    assert.equal((await post(`/${start.id}/turns`, { turn: 5, action: 'continue' })).status, 410);
    assert.equal((await fetch(`${base}/${start.id}`, { method: 'DELETE', headers })).status, 204);
    assert.equal((await fetch(`${base.replace('/api/conversations', '')}${start.audioPath}`, { headers })).status, 404);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); await fixture.close(); }
});

test('conversation guidance rejects unsafe or excessive instructions and normalizes quiet periods', () => {
  assert.throws(() => validateReply({ text: 'Close your eyes and hold your breath.', mode: 'quiet', quietSeconds: 20 }));
  assert.throws(() => validateReply({ text: 'word '.repeat(70), mode: 'listen', quietSeconds: 0 }));
  assert.equal(validateReply({ text: 'Notice a detail you can see.', mode: 'quiet', quietSeconds: 0 }).quietSeconds, 10);
  assert.equal(validateReply({ text: 'What can you hear?', mode: 'listen', quietSeconds: 20 }).quietSeconds, 0);
  assert.equal(validateReply({ text: 'Let your shoulders soften.', mode: 'quiet', quietSeconds: 45, practice: 'body' }).practice, 'body');
  assert.equal(validateReply({ text: 'How would you like to begin?', mode: 'listen', quietSeconds: 0, practice: 'breathing' }).practice, 'none');
  assert.throws(() => validateReply({ text: 'Breathe gently.', mode: 'quiet', quietSeconds: 46, practice: 'breathing' }));
});

test('meditation can begin directly with breathing or body relaxation without a check-in', async () => {
  const token = 'meditation-test-token-at-least-24-characters';
  let calls = 0;
  const fixture = createApp({ token, ready: () => true, generate: async () => { throw new Error('Not used'); }, speak: async text => Buffer.from(text), respond: async () => {
    calls++;
    return { text: 'Let your shoulders soften.', mode: 'quiet', quietSeconds: 40, practice: 'body' };
  } });
  const server = fixture.app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/conversations`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  try {
    for (const practice of ['breathing', 'body']) {
      const response = await fetch(base, { method: 'POST', headers, body: JSON.stringify({ practice }) });
      assert.equal(response.status, 201);
      const opening = await response.json() as { id: string; text: string; mode: string; practice: string; quietSeconds: number };
      assert.equal(opening.practice, practice);
      assert.equal(opening.mode, 'quiet');
      assert.equal(opening.quietSeconds, 40);
      assert.ok(!opening.text.includes('?'));
      if (practice === 'breathing') assert.match(opening.text, /optional; use your own comfortable pace/);
      const next = await fetch(`${base}/${opening.id}/turns`, { method: 'POST', headers, body: JSON.stringify({ turn: 1, action: 'continue' }) });
      assert.equal(next.status, 200);
      assert.equal((await next.json() as { practice: string }).practice, 'body');
      await fetch(`${base}/${opening.id}`, { method: 'DELETE', headers });
    }
    assert.equal(calls, 2, 'Gemma drives continuation after each opening practice');
    assert.equal((await fetch(base, { method: 'POST', headers, body: JSON.stringify({ practice: 'invalid' }) })).status, 400);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); await fixture.close(); }
});
