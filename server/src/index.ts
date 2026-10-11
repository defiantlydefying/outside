import { createApp } from './app.js';
import { createMeditationWorkflow } from './workflow.js';
import { createConversationWorkflow } from './conversation.js';
import { narrate } from './audio.js';

const workflow = createMeditationWorkflow();
const conversation = createConversationWorkflow();
const { app, close } = createApp({
  token: process.env.OUTSIDE_ACCESS_TOKEN || '',
  ready: () => Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID && process.env.GEMMA_BASE_URL),
  speak: text => narrate(text, { voice: process.env.ELEVENLABS_CONVERSATION_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL', stability: 0.8 }),
  respond: async input => {
    const run = await conversation.createRun();
    const result = await run.start({ inputData: input });
    if (result.status !== 'success') throw new Error('Conversation workflow failed.');
    return result.result;
  },
  generate: async input => {
    const run = await workflow.createRun();
    const result = await run.start({ inputData: input });
    if (result.status !== 'success') throw new Error('Session workflow failed.');
    return result.result;
  },
});
const server = app.listen(Number(process.env.PORT) || 3001, '0.0.0.0', () => console.log('Outside API is listening.'));
server.requestTimeout = 420_000;
process.on('SIGTERM', () => server.close(() => { void close().finally(() => process.exit(0)); }));
process.on('SIGINT', () => server.close(() => { void close().finally(() => process.exit(0)); }));
