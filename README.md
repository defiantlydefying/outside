# Outside

**Put your phone away. Come back to here.**

Outside is an iPhone app for short, guided breaks outdoors. Describe how you feel and what you notice around you, choose a few minutes, and listen to a meditation shaped around your surroundings. Spoken prompts alternate with quiet time to notice the world around you.

Built for the [Hacktoberfest Open Source AI Challenge: Touch Grass](https://dev.to/devteam/join-the-hacktoberfest-open-source-ai-challenge-week-1-touch-grass-2450-in-prizes-across-17-4pom).

## The experience

1. Find a comfortable outdoor spot and check in by speaking or typing.
2. Choose **3, 5, or 10 minutes**, sitting or walking, and how much guidance you want.
3. Prepare your break. Outside generates the guidance and downloads one audio track.
4. Start listening, lock your screen, and put your phone away.
5. Finish whenever you need to. An optional reflection closes the session.

The app includes a fixed three-minute sample with a soothing ElevenLabs Sarah narration and an original ambient music bed. It plays without configuring the backend or using provider credits on each listen. Personalized sessions use ElevenLabs River narration.

## How it works

| Component | Role |
| --- | --- |
| **Expo / React Native** | Native interface, microphone recording, secure connection settings, and audio playback |
| **Gemma** | Open-weight model that plans guidance from the check-in, duration, surroundings, and preferences |
| **Mastra** | Coordinates planning, script validation, and narration |
| **ElevenLabs** | Transcribes spoken check-ins and narrates personalized sessions |
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
```

Backend checks and the manual phone checklist are in [TESTING.md](TESTING.md). Contributions should describe the behavior changed and how it was verified. Follow [AGENTS.md](AGENTS.md) when using a coding agent.

## Project status

Outside is a working hackathon prototype. On October 9, 2026, the deployed API generated a complete three-minute session with Gemma, Mastra, and River narration on the configured free ElevenLabs account, and successfully served its MP3.

Physical iPhone recording, audio interruptions, and screen-off playback still need device testing. Background playback and lock-screen controls are configured for a dedicated app build; Expo Go is a preview environment. Android is configured but has not been validated.

## Privacy

Voice recordings go to ElevenLabs for transcription. Check-in text goes to the configured Gemma provider, and meditation text goes to ElevenLabs for narration. Local voice recordings are deleted after transcription; the backend does not persist check-ins or reflections. Generated audio expires after approximately one hour, and downloaded session audio is removed when the session is cleared. Provider retention follows the relevant account settings.

Outside does not request location access. Connection settings are stored with SecureStore. The shared access code is intended for a private prototype; multi-user accounts are not implemented.

Outside supports everyday wellbeing. It is not therapy, medical treatment, or emergency support.

## License

[MIT](LICENSE). Generated audio and provider services have their own usage terms.

Sample narration is attributed to **elevenlabs.io**. See [audio credits](assets/audio/README.md) for the sample's source, generation settings, and usage terms.
