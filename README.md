# Outside

**Put your phone away. Come back to here.**

Every meditation app opens by telling you to close your eyes. Try that on a trail.

Outside is an iPhone app for short outdoor meditations that work with your eyes open. A gentle voice leads breathing, body relaxation, or quiet attention. Speak whenever you want to change the guidance — say the breathing isn't working and it switches to body relaxation, and never offers breathing again for the rest of the session.

An open-weight [Gemma](https://ai.google.dev/gemma/docs/core/model_card_4) model makes that decision, through [Mastra](https://github.com/mastra-ai/mastra). The instructions it follows, the schema it must satisfy, and the safety checks on its replies are all in this repository, where you can read and change them.

Built for the [Hacktoberfest Open Source AI Challenge: Touch Grass](https://dev.to/devteam/join-the-hacktoberfest-open-source-ai-challenge-week-1-touch-grass-2450-in-prizes-across-17-4pom).

<!-- TODO: replace with 3 phone screenshots — home, breathing circle mid-session, finish screen.
     Suggested: put them in docs/ and reference as a table so they sit side by side.
<p align="center">
  <img src="docs/screen-home.png" width="30%" alt="Outside home screen" />
  <img src="docs/screen-breathing.png" width="30%" alt="Breathing guide during a session" />
  <img src="docs/screen-finish.png" width="30%" alt="Finish screen" />
</p>
-->

## The experience

1. Stop somewhere comfortable outdoors and tap **Begin a meditation · 3 minutes** — the home screen’s single action.
2. Choose **Gentle breathing** or **Relax the body**, then **Begin my meditation**. You can also check in first by speaking or typing.
3. Follow the guidance into 30–45 seconds of quiet practice. Breathing shows an expanding circle with an optional four-second inhale and six-second exhale, no holds — your comfortable pace takes priority. The circle starts *after* the narration, stops when paused, and respects Reduce Motion.
4. Look away and practice, or speak to change the guidance. "Less talking" and "no breathing exercises" shape the next reply. **Skip breathing** switches to body relaxation. The guide is instructed to deepen one anchor rather than repeatedly ask what you can see.
5. Finish whenever you want. The break also ends at its three-minute limit.

The prototype listens **between** spoken replies, using microphone levels to detect that you've stopped talking. During narration, tap **Interrupt and speak** to take your turn. Muting, typing, and stopping recording when the app leaves the foreground all work.

For longer listening, **Listen to a recorded track** offers the other half of the app: a bundled three-minute sample with ElevenLabs Sarah narration over an original ambient bed, and a **3, 5, or 10-minute** break written around a check-in. Both are fixed tracks, with narration and real silent intervals rendered into one file — so nothing needs to be on screen for the silence to happen, and you can lock your phone.

The home screen shows exactly one action, and it always works: a live guide when a backend is connected, the bundled sample when it isn’t. The sample needs no configuration at all.

## Getting off the screen

Removing screens from a screen-based product means giving up what makes apps sticky. That's deliberate here:

- **Eyes stay open.** The model is instructed never to say "close your eyes," and the reply validator rejects it if that slips through. Every practice works with your attention on the world.
- **The breathing circle is designed to be abandoned** — it starts after the narration ends, and the caption tells you to look away and breathe naturally if you prefer.
- **Prepared tracks are built for a locked screen.** Real silence is rendered into the audio file by FFmpeg, not held open by JavaScript timers on your phone.
- **No location access.** Not requested, not used. "Outside" is something you do, not a coordinate.
- **No account, streak, feed, or notifications.** Nothing to come back for.
- **The closing reflection isn't saved or sent anywhere.** It's for you, in that moment, and then it's gone.

## Why open weights mattered

The one thing this app promises is that when you say breathing isn't working, it stops — for good, not just for one turn. That's a safety property, not a feature, and with a closed hosted model it isn't a promise anyone can verify.

With Gemma, the whole chain is readable in one place: the system instructions, the Zod schema the reply must satisfy, the word limits, the phrases the validator refuses. If you don't trust this project's judgment about what a meditation app should say to someone who's anxious, you don't have to take its word for it — you can read the prompt and change it.

Open weights also keep the deployment from being a fixed point. `GEMMA_BASE_URL` is an environment variable; point it at a local Ollama serving `gemma3:4b` and the full adaptive loop runs on a laptop with nothing leaving the machine. The server refuses to start a conversation if `GEMMA_MODEL` doesn't name a Gemma model — there is no quiet fallback to a closed language model.

**Not overclaimed:** the current deployment uses *hosted* Gemma inference and proprietary ElevenLabs speech. This is not an offline or fully open-source stack. The open-weight model is load-bearing and swappable; the voice, today, is not.

## How it works

| Component | Role |
| --- | --- |
| **Expo / React Native** | Interface, microphone recording, secure connection settings, audio playback |
| **Gemma** | Open-weight model that chooses each reply, practice, and length of silence |
| **Mastra** | Open-source typed agents and workflows for conversation turns and session planning |
| **ElevenLabs** | Scribe v2 transcription; Flash v2.5 narration (Sarah for conversations, River for prepared tracks) |
| **FFmpeg** | Assembles narration and real silent intervals into one continuous track |
| **Render** | Hosts the Docker backend on non-sleeping compute, plus temporary session audio |

Gemma returns structured data, not just words:

```ts
export const replySchema = z.object({
  text: z.string().trim().min(1).max(500),
  mode: z.enum(['listen', 'quiet', 'finish']),
  quietSeconds: z.number().int().min(0).max(45),
  practice: z.enum(['breathing', 'body', 'listening', 'rest', 'none']).default('none'),
});
```

`practice` decides whether the screen renders the breathing circle or the landscape. `mode` and `quietSeconds` decide whether the app listens or goes silent. The model drives the interface.

Nothing it returns is trusted. `validateReply` re-parses the schema, caps spoken replies at 65 words so one turn can't eat the clock, and rejects the reply outright if it matches `/hold your breath|breathe deeply|close your eyes|you are safe|cure|diagnos|guaranteed/i`. User speech is treated as untrusted descriptive data rather than instructions.

Knowing when you've *finished* speaking is the hardest non-AI problem, because wind looks like speech. The app calibrates a noise floor from the first 600ms of each listening window, counts audio as speech only above `max(-40dB, floor + 10dB)`, and ends your turn after 1.6s of quiet following at least 0.5s of speech. It's deliberately conservative, and **Finish reply** is always visible.

Provider credentials stay on the backend. The app connects with a server address and a private prototype access code.

## Getting started

Requires Node.js **22.13 or newer**, npm, and Expo Go for a phone preview.

```sh
git clone https://github.com/defiantlydefying/outside.git
cd outside
npm ci
npm start
```

Open the project in Expo Go using the terminal QR code. The bundled sample works immediately; personalized sessions need a backend.

- **[Testing guide](TESTING.md)** — start here to try Outside on an iPhone.
- **[Backend setup and deployment](SETUP.md)** — configure providers, run locally, or deploy to Render.

## Project structure

```text
src/app/           Expo Router screens
src/components/    Shared interface components
src/lib/           App state, playback, listening, and API client
assets/            Icons and bundled sample audio
server/src/        Express API, Mastra workflows, and audio assembly
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

## Status and limits

A working hackathon prototype. On October 11, 2026, an end-to-end check exercised Gemma through Mastra with Sarah narration: a direct breathing meditation, a quiet continuation without another question, a switch to body relaxation, the no-breathing preference persisting afterward, and an explicit stop. Automated tests cover conversation context, quiet continuation, turn retries, breathing-phase timing, pause scheduling, protected audio, cleanup, and microphone-level detection.

Known gaps, plainly:

- **Conversation mode needs the app in the foreground** and an internet connection. Background playback and lock-screen controls are configured for prepared tracks in a dedicated build; conversations pause when the app leaves the foreground.
- **No interruption over live narration.** You can speak between replies, or tap **Interrupt and speak**.
- **Silence detection is untested in real wind**, which is where it's hardest. Spoken replies and adaptive responses are confirmed working on an iPhone; the breathing animation, longer quiet periods, and screen-off playback still need device testing.
- **No outdoor field test** has been run.
- **Single shared access code**, in-memory sessions, four concurrent conversations, two simultaneous generation jobs. A private prototype, not a multi-user service.
- **Android is configured but unvalidated.**
- **Dependency advisories are unresolved** in the Expo build-tool tree (`braces`, `node-forge`, `uuid`) and Mastra's transitive `sprintf-js`. A clean audit has not been established. Avoid `npm audit fix --force`, which proposed incompatible downgrades.

## Privacy

Voice recordings go to ElevenLabs for transcription; local copies are deleted immediately after. Your text goes to the configured Gemma provider, and the generated guidance goes to ElevenLabs for narration.

Conversation text and reply audio live in backend memory for at most ten minutes and are deleted when you finish; downloaded audio is removed from the phone on leaving. Prepared audio expires after about an hour. Check-ins and closing reflections are never persisted. Provider retention follows the relevant account settings.

No location access is requested. Connection settings are stored with SecureStore.

Outside supports everyday wellbeing. It is not therapy, medical treatment, or emergency support.

## License

[MIT](LICENSE). Generated audio and provider services have their own terms.

Sample narration is attributed to **elevenlabs.io**; see [audio credits](assets/audio/README.md) for its source, generation settings, and usage terms.
