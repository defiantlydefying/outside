# Sample audio credits

**A little room to breathe | elevenlabs.io** is a fixed three-minute sample for Outside.

- **Narration:** ElevenLabs Sarah (`EXAVITQu4vr4xnSDxMaL`), generated October 9, 2026 with `eleven_multilingual_v2`, stability `0.8`, similarity `0.75`, and speed `0.8`.
- **Script:** Original Outside meditation prompts in [make-sample.mts](../../scripts/make-sample.mts).
- **Music:** Original ambient composition synthesized by [ambient.mts](../../scripts/ambient.mts). No external recordings or music library assets are used.
- **Mix:** Narration normalized to approximately −20 LUFS before mixing. A quiet pad with gradual entrance and exit plays below it; the combined track has peak limiting.

The sample uses ElevenLabs free-plan narration for this non-commercial prototype. That audio is governed by [ElevenLabs' publishing terms](https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform), requires attribution to **elevenlabs.io**, and is not covered by the repository's MIT license. A paid plan purchased later does not retroactively grant commercial rights to this recording. The original script and ambient synthesis code are covered by the repository license.

To regenerate locally, with the existing backend credentials and FFmpeg installed:

```sh
node --env-file=server/.env --import ./server/node_modules/tsx/dist/loader.mjs scripts/make-sample.mts
```

Run from the repository root using Node 22.13 or newer. Regeneration makes five narration requests and spends provider credits; playing the bundled file does not.
