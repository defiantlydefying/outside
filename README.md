# Outside

A native iPhone prototype for short, voice-guided outdoor breaks. Speak or type a check-in, prepare a session, then lock the screen and put the phone away. Built during the October 5–11, 2026 Touch Grass challenge window.

## What's implemented

- Native Expo / React Native screens: home, check-in, playback, optional reflection, and private prototype setup.
- 3, 5, or 10 minute personalized breaks; sitting or walking; less or more spoken guidance.
- Optional microphone recording, explicit transcription consent, editable transcript, and local recording deletion.
- Mastra workflow: Gemma planning → structural/content checks → ElevenLabs narration → a single audio track with actual silence between prompts.
- Downloaded audio, background playback configuration, lock-screen controls, pause/resume, and early finish.
- A fixed, bundled three-minute sample that works without provider accounts. This uses macOS's Samantha voice as a local prototype fixture, not ElevenLabs or Gemma. Replace the fixture with approved ElevenLabs narration before distributing a release.
- Render Docker blueprint for the API. No deployment has been created.

## Try the interface on an iPhone

Use Node 22.13 or newer. This Mac has a compatible Node runtime at `/Users/EmmaBB/.local/node/bin`; if your terminal finds an older version, prepend that directory to PATH or select Node 22 with your version manager.

```sh
cd /Users/EmmaBB/Outside
npm install
npm start
```

Install **Expo Go** from the App Store. Keep the iPhone and Mac on the same Wi-Fi network, then scan the terminal QR code with the iPhone camera. Choose **Listen to a 3-minute sample**. Expo Go is for quick exploration; verify background playback in a dedicated app build before relying on it.

## Build your own iPhone app

The cloud build path does not require local Xcode. It requires an Expo account and Apple Developer Program membership for provisioning the physical iPhone.

```sh
cd /Users/EmmaBB/Outside
npx eas-cli@latest login
npm run build:ios
npm run dev
```

EAS will link the app to your Expo project and help register the phone. Install the development build from the resulting link. A simulator build profile is also provided. This Mac's Xcode license has not been accepted, so local simulator testing is currently unavailable; open Xcode and review its license and setup prompts yourself to enable that route.

## Connect the four partners

The phone app never contains provider API keys. Its setup screen stores only the private backend address and prototype access token using SecureStore.

1. Create your ElevenLabs account. No challenge ElevenLabs credit is assumed. Choose a voice eligible for API use on your plan and create an API key with speech-to-text and text-to-speech permissions. Limited free API usage is available, but Voice Library voices require a paid plan for API access. Former Default voices are only available to accounts created before March 2026 and expire December 31, 2026; a new account cannot rely on them for free narration. Check current pricing and publishing terms before distributing generated audio.
2. Supply an OpenAI-compatible **Gemma** inference endpoint. The Render blueprint uses hosted Ollama at `https://ollama.com/v1` with `gemma4:31b`; obtain an Ollama API key at https://ollama.com/settings/keys and check model access on your account. A local alternative is Ollama serving `gemma3:4b` at `http://127.0.0.1:11434/v1`, with `GEMMA_API_KEY=ollama`. Ollama and model weights are not installed by this project. A Render-hosted API needs a Gemma endpoint reachable from Render; a localhost endpoint on this Mac cannot be reached from the cloud.
3. Configure the API locally or on Render with `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `GEMMA_BASE_URL`, `GEMMA_MODEL`, `GEMMA_API_KEY`, and `OUTSIDE_ACCESS_TOKEN`. Generate the private access token with `openssl rand -hex 24` and keep it private. No keys are committed.
4. Mastra coordinates the planning, checks, and audio rendering. Its model configuration points to Gemma, not Gemini or a closed model.
5. Open **App setup** on the phone, enter the API's HTTPS address and access code, and check/save the connection.

Local API setup (FFmpeg and FFprobe must be installed):

```sh
cd /Users/EmmaBB/Outside/server
npm install
cp .env.example .env
# Fill .env locally; don't paste keys into chat or commit the file.
npm run dev
```

On a physical phone, use your Mac's local network address rather than `localhost`. Development builds allow local HTTP addresses for testing; hosted endpoints require HTTPS. Render deployment uses `render.yaml` and the Dockerfile, which installs FFmpeg. The blueprint requests the smallest paid API instance (`0.5c-512mb`) to avoid free-tier sleep; review the hosting price, applied challenge credit, and credit expiration before deploying. Gemma inference and ElevenLabs have separate usage costs.

## Deploy the backend to Render

1. Publish this project to a GitHub repository. Keep `server/.env` private; it is excluded by `.gitignore`. Use a private repository while preparing, then make the code public with an appropriate license before submitting the open-source challenge entry.
2. In https://dashboard.render.com, confirm the challenge's $50 credit is applied to the workspace you will use.
3. Choose **New > Blueprint**, connect GitHub, select your Outside repository and its `main` branch, and use `render.yaml` as the blueprint path.
4. Supply `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, and `GEMMA_API_KEY` when Render prompts. Copy only the values from your local settings, without the variable names or equals signs. The blueprint already sets the hosted Gemma address and model and generates a fresh `OUTSIDE_ACCESS_TOKEN` on Render. Your local `.env` is not uploaded.
5. Review the single `outside-api` web service and its compute price, then deploy the blueprint. No database or disk is required. Wait for a successful deploy, then open the service's HTTPS address with `/health` appended. It should return `{"status":"ok"}`; this confirms the server is running, not that providers have been tested.
6. On the service's **Environment** page, reveal and copy `OUTSIDE_ACCESS_TOKEN`. In the iPhone app's setup screen, paste the service's base HTTPS address (without `/health` or `/api`) and this access code. Choose **Check connection and save**.
7. Prepare one short session to verify the actual Gemma and ElevenLabs integrations. Configuration checks alone do not verify credentials, quota, or voice access.

Official setup references: https://render.com/docs/infrastructure-as-code, https://render.com/docs/compute-plans, https://docs.ollama.com/api/openai-compatibility, and https://elevenlabs.io/pricing/api.

## Verify

```sh
cd /Users/EmmaBB/Outside
npm run lint
npm run typecheck
npm run export:ios
cd server
npm run typecheck
npm test
npm run build
```

The tests cover API authentication and input validation, audio access, risky/overlong prompt rejection, pause timing, and actual FFmpeg output duration. API integration tests use temporary localhost servers. They don't spend provider credits.

Before calling the experience complete, test on a physical iPhone in a dedicated build: microphone permission granted/denied, edit transcription, interruptions, lock screen for the whole track including quiet spaces, lock-screen pause/resume, headphone disconnection, early finish, and airplane-mode playback after downloading. Verify real Gemma and ElevenLabs calls with your accounts and assess the generated wording. None of these device/provider checks has yet been confirmed.

## Privacy and scope

This is a private hackathon prototype, not a clinical intervention or production service. Check-in text is sent to the configured Gemma service; narration text and optional voice recordings are sent to ElevenLabs. No location permission is requested. The server doesn't persist check-ins or reflections. Generated audio is retained in temporary files for up to approximately one hour, then deleted; restarts discard availability. The phone deletes its downloaded session when you finish/reset it. Provider retention is governed by your account settings.

The access token protects a small private demo; it is not multi-user authentication. There are bounded request sizes, rate limits, generation concurrency limits, and external request timeouts. Prompt instructions and simple content tripwires reduce some risks but do not establish clinical safety or guarantee that the model never invents details. Every session keeps eyes open and uses natural breathing. Production use requires a broader review and user testing.

## Dependency audit

Initial audits flagged unresolved advisories in the SDK's build-tool dependency tree (`braces`, `node-forge`, and `uuid`) and Mastra's transitive `sprintf-js`. At creation, the registry's latest `braces`, `node-forge`, and `sprintf-js` versions were also in the advisory ranges. Do not apply `npm audit fix --force`: it proposed downgrading Expo/React Native/Mastra to incompatible versions. Recheck audits before public deployment and upgrade within supported SDK/provider versions as fixes become available. No claim of a clean security audit is made.

## Challenge evidence

Claim a partner category only after the real integration has run. The bundled sample does not establish ElevenLabs or Gemma usage. On October 9, a synthetic live check completed Gemma planning and script validation; ElevenLabs narration returned HTTP 402 because the selected Voice Library voice requires a paid plan. Successful narration and transcription, a deployed Render service, a brief outdoor demo, repository link, and clear explanation of open-weight model use still need to be added to the DEV submission. Do not present exploratory before/after reflections as clinical proof.
