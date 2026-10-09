import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { checkInSchema, type CheckIn } from './session.js';
import { transcribe } from './audio.js';

type Result = { title: string; audioPath: string; directory: string; seconds: number };
type Dependencies = { generate: (input: CheckIn) => Promise<Result>; transcribeAudio?: typeof transcribe; ready: () => boolean; token: string };
const digest = (value: string) => createHash('sha256').update(value).digest();

export function createApp(deps: Dependencies) {
  if (deps.token.length < 24) throw new Error('Set OUTSIDE_ACCESS_TOKEN to at least 24 characters.');
  const app = express();
  const sessions = new Map<string, { result: Result; expiresAt: number }>();
  const jobs = { active: 0 };
  app.disable('x-powered-by');
  // Render uses one reverse proxy. Do not trust arbitrary forwarded client IPs.
  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api', (req, res, next) => {
    const candidate = req.headers.authorization?.replace(/^Bearer /, '') || '';
    if (!timingSafeEqual(digest(candidate), digest(deps.token))) return void res.status(401).json({ error: 'The access code is incorrect. Check App setup.' });
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.get('/api/ready', (_req, res) => res.status(deps.ready() ? 200 : 503).json({ ready: deps.ready(), error: deps.ready() ? undefined : 'The server still needs its ElevenLabs and Gemma settings.' }));
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Please wait a minute before trying again.' } }));
  app.use(express.json({ limit: '8kb' }));
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 } });
  app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
    if (!deps.ready()) return void res.status(503).json({ error: 'Connect ElevenLabs and Gemma on the server first.' });
    if (!req.file || !['audio/mp4', 'audio/m4a', 'audio/x-m4a'].includes(req.file.mimetype)) return void res.status(400).json({ error: 'Send a short M4A recording.' });
    const text = await (deps.transcribeAudio || transcribe)(req.file.buffer);
    res.json({ text });
  });
  app.post('/api/sessions', async (req, res) => {
    const parsed = checkInSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: 'Check your duration and check-in, then try again.' });
    if (!deps.ready()) return void res.status(503).json({ error: 'The server still needs its ElevenLabs and Gemma settings.' });
    if (jobs.active >= 2) return void res.status(429).json({ error: 'Two breaks are being prepared. Please try again shortly.' });
    jobs.active++;
    try {
      const result = await deps.generate(parsed.data);
      const id = randomUUID();
      sessions.set(id, { result, expiresAt: Date.now() + 60 * 60 * 1000 });
      res.status(201).json({ id, title: result.title, seconds: result.seconds, audioPath: `/api/audio/${id}` });
    } finally { jobs.active--; }
  });
  app.get('/api/audio/:id', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session || session.expiresAt <= Date.now()) return void res.status(404).json({ error: 'This break has expired. Please create another.' });
    res.type('audio/mpeg').sendFile(session.result.audioPath);
  });
  const cleanup = setInterval(() => {
    for (const [id, session] of sessions) {
      if (session.expiresAt <= Date.now()) {
        sessions.delete(id);
        void rm(session.result.directory, { recursive: true, force: true });
      }
    }
  }, 60_000);
  cleanup.unref();
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof multer.MulterError) return void res.status(400).json({ error: 'Recording is too large. Please keep it under one minute.' });
    // Do not leak provider payloads, prompts, transcripts, or credentials.
    res.status(502).json({ error: 'Your break could not be prepared. Check your connection and server configuration, or try the sample.' });
  });
  return { app, close: async () => {
    clearInterval(cleanup);
    await Promise.all([...sessions.values()].map(session => rm(session.result.directory, { recursive: true, force: true })));
  } };
}
