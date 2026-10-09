import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.js';

test('API requires authentication, validates input, and serves only generated session audio', async () => {
  const token = 'test-only-token-with-at-least-24-characters';
  let calls = 0;
  const fixture = createApp({ token, ready: () => true, generate: async () => {
    calls++;
    const directory = await mkdtemp(join(tmpdir(), 'outside-api-test-'));
    const audioPath = join(directory, 'break.mp3');
    await writeFile(audioPath, Buffer.from('fixture'));
    return { title: 'Leaves in the breeze', seconds: 180, directory, audioPath };
  } });
  const server = fixture.app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  try {
    assert.equal((await fetch(`${base}/api/ready`)).status, 401);
    assert.equal((await fetch(`${base}/api/ready`, { headers })).status, 200);
    assert.equal((await fetch(`${base}/api/sessions`, { method: 'POST', headers, body: JSON.stringify({ minutes: 99 }) })).status, 400);
    assert.equal(calls, 0);
    const response = await fetch(`${base}/api/sessions`, { method: 'POST', headers, body: JSON.stringify({ minutes: 3, feeling: 'Restless', surroundings: 'Leaves moving', position: 'Sitting', guidance: 'Less' }) });
    assert.equal(response.status, 201);
    const session = await response.json() as { audioPath: string };
    assert.equal((await fetch(`${base}${session.audioPath}`)).status, 401);
    assert.equal(await (await fetch(`${base}${session.audioPath}`, { headers })).text(), 'fixture');
    assert.equal((await fetch(`${base}/api/audio/missing`, { headers })).status, 404);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); await fixture.close(); }
});
