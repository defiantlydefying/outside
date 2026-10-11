# Backend setup and deployment

If you only want to test the existing app, start with [TESTING.md](TESTING.md). The live backend is already deployed at `https://outside-api-d8xc.onrender.com`.

## Requirements

- Node.js 22.13 or newer and npm.
- FFmpeg and FFprobe for local audio assembly; the Render Docker image installs them.
- An ElevenLabs key with text-to-speech and speech-to-text permissions. Enable **Voices → Read** if you want to inspect available voices through the API.
- A Gemma inference endpoint with an OpenAI-compatible chat API and any required key.

## Run the backend locally

From the repository root:

```sh
cd server
npm ci
```

For a new setup only, copy the template:

```sh
cp .env.example .env
```

Do not overwrite an existing `.env`. Generate a private access code:

```sh
openssl rand -hex 24
```

Use that value for `OUTSIDE_ACCESS_TOKEN` and edit the remaining settings locally.

| Setting | Purpose / example |
| --- | --- |
| `PORT` | Local server port; defaults to `3001` |
| `OUTSIDE_ACCESS_TOKEN` | Private prototype access code, at least 24 characters |
| `ELEVENLABS_API_KEY` | ElevenLabs credential |
| `ELEVENLABS_VOICE_ID` | `SAz9YHcvj6GT2YYXdXww` for River; tested on this prototype's free account |
| `ELEVENLABS_CONVERSATION_VOICE_ID` | Optional; defaults to Sarah (`EXAVITQu4vr4xnSDxMaL`), verified on this prototype's free account |
| `ELEVENLABS_TTS_MODEL` | `eleven_flash_v2_5` |
| `ELEVENLABS_STT_MODEL` | `scribe_v2` |
| `GEMMA_BASE_URL` | Hosted Ollama: `https://ollama.com/v1` |
| `GEMMA_MODEL` | Hosted deployment: `gemma4:31b` |
| `GEMMA_API_KEY` | Key accepted by the Gemma inference provider |
| `FFMPEG_PATH` / `FFPROBE_PATH` | Optional custom executable paths |

Get a hosted Ollama key from [Ollama's key settings](https://ollama.com/settings/keys) and verify your account has access to the selected Gemma model. A local alternative is Ollama serving `gemma3:4b` at `http://127.0.0.1:11434/v1`, with `GEMMA_API_KEY=ollama`. This project does not install Ollama or model weights. See [Ollama's OpenAI compatibility documentation](https://docs.ollama.com/api/openai-compatibility).

Start the backend:

```sh
npm run dev
```

For a physical iPhone using the local backend, enter the Mac's LAN address and port, such as `http://192.168.1.80:3001`, rather than `localhost`. Use the Mac's current address; the example may differ on your network. Local HTTP addresses are accepted only in development. Hosted backends require HTTPS.

The local access token and Render access token are independent. Use the token belonging to the backend address you enter.

## Deploy to Render

1. Push the project to your GitHub repository. `server/.env` is ignored and must stay private.
2. In [Render](https://dashboard.render.com), verify any challenge credit is applied to the intended workspace.
3. Choose **New → Blueprint**, connect the repository, select `main`, and use `render.yaml`.
4. Supply `ELEVENLABS_API_KEY` and `GEMMA_API_KEY`. Copy only each value, without the variable name or equals sign.
5. Review and deploy the `outside-api` service. The Blueprint selects `0.5c-512mb` paid compute, River, and the hosted Gemma settings. It generates a new `OUTSIDE_ACCESS_TOKEN`. No database or persistent disk is required.
6. Wait for a **Live** deployment. Open its HTTPS address with `/health` appended; expect `{"status":"ok"}`.
7. Copy `OUTSIDE_ACCESS_TOKEN` from the service's **Environment** page and connect the phone as described in [TESTING.md](TESTING.md).
8. Prepare a short session to verify Gemma and ElevenLabs together.

Local `.env` edits are not uploaded to Render. Update provider credentials in Render's Environment settings. The voice, Gemma URL, and Gemma model are managed in `render.yaml`; push and sync the Blueprint when changing them.

Render hosting credit covers Render charges. Gemma inference and ElevenLabs have their own account limits and usage terms. River narration was verified on this prototype's free ElevenLabs account; verify voice eligibility with your own account rather than assuming any library voice will work.

References: [Render Blueprints](https://render.com/docs/infrastructure-as-code), [compute plans](https://render.com/docs/compute-plans), and [ElevenLabs API pricing](https://elevenlabs.io/pricing/api).

## API routes

| Route | Behavior |
| --- | --- |
| `GET /health` | Public process health check |
| `GET /api/ready` | Authenticated configuration check |
| `POST /api/sessions` | Generate a session from a validated check-in |
| `POST /api/transcribe` | Transcribe a short M4A recording |
| `GET /api/audio/:id` | Retrieve generated audio before it expires |
| `POST /api/conversations` | Start a three-minute conversation and receive its opening speech |
| `POST /api/conversations/:id/turns` | Send `{turn, action: "reply", message}` or `{turn, action: "continue"}` after quiet practice |
| `GET /api/conversations/:id/audio/:clip` | Retrieve one spoken reply |
| `DELETE /api/conversations/:id` | Discard the conversation and its reply audio |

All `/api` routes require `Authorization: Bearer <OUTSIDE_ACCESS_TOKEN>`. Readiness checks only required configuration; it does not validate provider credentials or quota. Error responses avoid exposing provider payloads and secrets.

## Current limits

The API uses one shared private access code, bounded request sizes, request rate limits, provider timeouts, and a maximum of two concurrent generation jobs. Sessions are held in memory, with audio in temporary files for approximately one hour; restarts discard session availability. This is intended for a private prototype rather than a multi-user service.

Conversations have a three-minute wall-clock limit, at most twelve adaptive turns, four concurrent stored conversations, and two simultaneous reply jobs. Context and speech clips live in memory for at most ten minutes; explicit finish deletes them. Successful turn retries replay the previous result rather than issuing another model or speech request. Each turn uses the configured Gemma model through Mastra, followed by ElevenLabs speech. No ElevenLabs Agent or extra account permissions are needed for this Expo Go prototype.

Initial dependency audits reported unresolved advisories in the Expo build-tool dependency tree (`braces`, `node-forge`, and `uuid`) and Mastra's transitive `sprintf-js`. Recheck before release and use upgrades compatible with the selected SDK and providers. Avoid `npm audit fix --force`, which previously proposed incompatible downgrades. A clean security audit has not been established.
