# Outside

**Put your phone away. Come back to here.**

Outside is an iPhone app for short outdoor meditations. A gentle voice leads breathing, body relaxation, and quiet practice. Speak whenever you want to change the guidance; the meditation adapts without making every pause another question.

Built for the [Hacktoberfest Open Source AI Challenge: Touch Grass](https://dev.to/devteam/join-the-hacktoberfest-open-source-ai-challenge-week-1-touch-grass-2450-in-prizes-across-17-4pom).

## The experience

1. Stop somewhere comfortable outdoors and tap **Meditate with Outside · 3 minutes**.
2. Choose **Gentle breathing** or **Relax the body**, then **Begin my meditation**. You can also check in first by speaking or typing.
3. Follow the guidance into 30–45 seconds of quiet practice. Breathing uses an expanding circle with an optional four-second inhale and six-second exhale, without holds; your comfortable pace takes priority. The circle starts after narration, stops when paused, and respects Reduce Motion.
4. Look away and practice, or speak to change the guidance. “Less talking” and “no breathing exercises” shape the next reply. **Skip breathing** switches to body relaxation. The guide is instructed to deepen one anchor, rather than repeatedly collect things you see.
5. Finish at any time. The break also ends at its three-minute limit.

The Expo Go prototype listens **between** spoken replies, using microphone levels to detect a pause in speech. During narration, tap **Interrupt and speak** to take your turn. It supports quiet-period voice interruptions, muting, typing, and stopping recording when the app leaves the foreground. Conversation mode currently needs the app open and an internet connection; continuous speech interruption over narration and screen-off conversation are not implemented.

For longer listening, **Prepare a guided audio break** creates a fixed **3, 5, or 10-minute** track. This mode downloads its narration and silent intervals together and is configured for background playback in a dedicated app build. It is separate from the adaptive conversation.

The app includes a fixed three-minute sample with ElevenLabs Sarah narration and an original ambient music bed. It plays without backend configuration or new provider requests. Conversations also use Sarah by default; prepared audio breaks use River. Ambient music is currently included only in the sample.

## Why open innovation matters

**[Gemma](https://ai.google.dev/gemma/docs/core/model_card_4) drives the adaptive guidance.** After a short opening, each quiet continuation or spoken/typed reply passes to the open-weight model through [Mastra](https://github.com/mastra-ai/mastra), an open-source TypeScript agent framework. Gemma chooses the next meditation cue, practice, and quiet period. This is central to the experience: someone asking to avoid breathing can receive body relaxation, and someone asking for less talking receives a shorter cue and more silence. The practice is returned as structured data so the screen follows the guide’s exercise.

The guidance instructions, timing rules, validation, and workflow are in this repository. Developers can change the guide’s behavior, select a different Gemma model, or point the backend at their own compatible Gemma inference service. The same model configuration is used for both conversation and prepared sessions; there is no automatic fallback to a closed language model. Local Ollama is a supported configuration, but model weights and inference software must be installed separately.

The current deployment uses **hosted Gemma inference** and proprietary ElevenLabs speech services. It is not an offline or fully open-source AI stack, and hosting and speech have their own costs. No GPS is requested. Conversations expire from backend memory after ten minutes or are deleted when finished; they are not persisted by this app. Provider retention remains subject to provider settings.

## How it works

| Component | Role |
| --- | --- |
| **Expo / React Native** | Native interface, microphone recording, secure connection settings, and audio playback |
| **Gemma** | Open-weight model that generates adaptive replies and plans prepared guidance |
| **Mastra** | Open-source workflows coordinate conversation replies, planning, and validation |
| **ElevenLabs** | Transcribes speech and voices each reply or prepared session |
| **FFmpeg** | Combines narration and real silent intervals into a track of the requested length |
| **Render** | Hosts the Docker backend and temporary session audio |

Provider credentials stay on the backend. The app connects using a server address and private prototype access code. The current deployment uses Gemma through Ollama's OpenAI-compatible endpoint and ElevenLabs' River voice.

## Getting started

Requires Node.js **22.13 or newer**, npm, and Expo Go for an initial phone preview.

```sh
git clone https://github.com/defiantlydefying/outside.git
cd outside
npm ci
npm start
```

Open the project in Expo Go on your iPhone using the terminal QR code. Follow the [testing guide](TESTING.md) for Expo sign-in, the sample, connecting the live backend, and testing personalized sessions.

- [Testing guide](TESTING.md) — start here to try Outside on an iPhone.
- [Backend setup and deployment](SETUP.md) — configure providers, run locally, or deploy to Render.

## Project structure

```text
src/app/           Expo Router screens
src/components/    Shared interface components
src/lib/           App state, playback, and API client
assets/            Icons and bundled sample audio
server/src/        Express API, Mastra workflow, and audio assembly
server/test/       API, validation, timing, and FFmpeg tests
render.yaml        Render Blueprint
eas.json           iOS build profiles
```

## Development

```sh
npm run lint
npm run typecheck
npm test
```

Backend checks and the manual phone checklist are in [TESTING.md](TESTING.md). Contributions should describe the behavior changed and how it was verified. Follow [AGENTS.md](AGENTS.md) when using a coding agent.

## Project status

Outside is a working hackathon prototype. On October 11, 2026, a real integration check exercised Gemma through Mastra and Sarah narration: a direct breathing meditation, a quiet continuation without another question, switching to body relaxation, remembering the no-breathing preference, and an explicit stop. Automated tests cover direct meditation starts, breathing phase timing, conversation context, quiet continuation, retries, protected audio, cleanup, and microphone-level detection.

The tester has confirmed spoken replies and adaptive responses work on an iPhone. The new breathing animation, longer quiet periods, silence detection in outdoor wind, interruptions, and screen-off audio playback still need device testing. Background playback and lock-screen controls are configured for prepared tracks in a dedicated app build; conversation mode pauses when the app leaves the foreground. Android is configured but has not been validated. No outdoor field test has been claimed.

## Privacy

Voice recordings go to ElevenLabs for transcription. User text goes to the configured Gemma provider, and generated guidance goes to ElevenLabs for narration. Local voice recordings are deleted after transcription. Conversation text and reply audio are held in backend memory for at most ten minutes and deleted when the conversation is finished; downloaded reply audio is deleted when leaving or finishing the break. Prepared audio expires after approximately one hour and is removed from the phone when cleared. Check-ins and reflections are not persisted by the backend. Provider retention follows the relevant account settings.

Outside does not request location access. Connection settings are stored with SecureStore. The shared access code is intended for a private prototype; multi-user accounts are not implemented.

Outside supports everyday wellbeing. It is not therapy, medical treatment, or emergency support.

## License

[MIT](LICENSE). Generated audio and provider services have their own usage terms.

Sample narration is attributed to **elevenlabs.io**. See [audio credits](assets/audio/README.md) for the sample's source, generation settings, and usage terms.
