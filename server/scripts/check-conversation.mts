// Live integration check: consumes Gemma inference and four short ElevenLabs clips.
// Uses synthetic check-ins only. Never prints credentials or provider error payloads.
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.js';
import { createConversationWorkflow } from '../src/conversation.js';
import { narrate } from '../src/audio.js';

const workflow = createConversationWorkflow();
const token = 'local-smoke-check-not-a-real-access-code';
const fixture = createApp({ token, ready: () => true, generate: async () => { throw new Error('Not used'); },
  speak: text => narrate(text, { voice: process.env.ELEVENLABS_CONVERSATION_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL', stability: 0.8 }),
  respond: async input => {
    const run = await workflow.createRun();
    const result = await run.start({ inputData: input });
    if (result.status !== 'success') throw new Error('Gemma conversation workflow failed.');
    return result.result;
  },
});
const server = fixture.app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
let id = '';
let turn = 0;
try {
  for (const message of [undefined, 'I am overwhelmed by work. I am sitting outside and see leaves on a tree.', 'Less talking please. No breathing exercises.', 'stop']) {
    const began = Date.now();
    const response = await fetch(`${base}/api/conversations${id ? `/${id}/turns` : ''}`, { method: 'POST', headers, body: JSON.stringify(id ? { turn, action: 'reply', message } : {}) });
    if (!response.ok) throw new Error(`Conversation returned HTTP ${response.status}.`);
    const reply = await response.json() as { id: string; turn: number; text: string; mode: string; quietSeconds: number; audioPath: string };
    id = reply.id; turn = reply.turn;
    const audio = await fetch(`${base}${reply.audioPath}`, { headers });
    if (!audio.ok || !audio.headers.get('content-type')?.includes('audio/mpeg')) throw new Error('Spoken reply could not be retrieved.');
    console.log(JSON.stringify({ turn, text: reply.text, mode: reply.mode, quietSeconds: reply.quietSeconds, audioBytes: (await audio.arrayBuffer()).byteLength, latencyMs: Date.now() - began }));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Live conversation check failed.');
  process.exitCode = 1;
} finally {
  if (id) await fetch(`${base}/api/conversations/${id}`, { method: 'DELETE', headers });
  await new Promise<void>(resolve => server.close(() => resolve()));
  await fixture.close();
}
