# Testing Outside

Start with **Expo Go on your iPhone and the existing Render backend**. You do not need an Apple Developer membership, a new deployment, or provider keys on your phone for this preview.

## 1. Open Outside on your iPhone

1. Install **Expo Go** from the iPhone App Store and sign in to an Expo account.
2. Connect the Mac and iPhone to the same Wi-Fi network.
3. On this Mac, open Terminal and run:

   ```sh
   cd /Users/EmmaBB/Outside
   export PATH="/Users/EmmaBB/.local/node/bin:$PATH"
   npx expo login
   npm start
   ```

   Sign in with the **same Expo account** used in Expo Go. The PATH line selects this Mac's installed Node 22 runtime. On another computer, use your checkout directory and Node 22.13 or newer; run `npm ci` first if dependencies are not installed.

4. Keep Terminal open. Scan its QR code with the iPhone Camera and open the link in Expo Go. Allow local-network access if prompted.

Render runs the API. The Mac runs the app's development server, so keep it running while using this preview. See [Expo's phone preview instructions](https://docs.expo.dev/get-started/start-developing/) for account and network requirements.

## 2. Try the sample first

1. Tap **Listen to a 3-minute sample** on the home screen.
2. Tap **Start my break** and check your phone's media volume.
3. Listen for gentle spoken guidance over soft ambient music. Quiet intervals between prompts are intentional; the music continues underneath.
4. Try **Pause**, then **Continue my break**.
5. Try **Finish early → Finish break**, then **Back to my day**. Also let a sample finish naturally and check **Finish my break**.

The sample is fixed audio narrated with ElevenLabs Sarah, mixed with original ambient music. It checks the interface and playback without making new Gemma or ElevenLabs requests. Personalized sessions currently use River with quiet intervals and no music bed.

## 3. Connect the live backend

1. In Render, open the Outside service's [Environment page](https://dashboard.render.com/web/srv-db4hvdc9v7es73a1jsjg/env).
2. Find **OUTSIDE_ACCESS_TOKEN**, reveal its value, and copy it privately.
3. In Outside, tap **App setup** and enter:

   | Field | Value |
   | --- | --- |
   | Server address | `https://outside-api-d8xc.onrender.com` |
   | Outside access code | The value of `OUTSIDE_ACCESS_TOKEN` from Render |

4. Tap **Check connection and save**. The home screen should say **Personalized breaks are connected.**

Use the base address only, without `/health` or `/api`. The access code is not an ElevenLabs or Ollama API key. Use Render's token, which is separate from the one in the local `server/.env` file. Keep tokens out of screenshots, recordings, and GitHub.

The connection check verifies authentication and required settings. Preparing a session tests the actual provider calls.

## 4. Try the conversational prototype

1. Reload Outside in Expo Go after the app update. The home screen should show **Talk to Outside · 3 minutes**. The Render backend must also be running the conversation update.
2. Tap that button, read the microphone notice, and choose **Start talking with Outside**. Allow microphone access if you want to speak.
3. After Sarah asks what is on your mind, wait until **Listening to you** appears. Say: `Work is overwhelming. I'm sitting outside and can see leaves on a tree.` A pause of about 1.6 seconds after detected speech should finish your reply. **Finish reply** also submits it manually.
4. Listen for a short response about the surroundings you actually supplied. The guide may ask a follow-up question or suggest a noticing exercise with 10–30 seconds of quiet.
5. During quiet time, say `Less talking, please. No breathing exercises.` Check that the next reply adapts, rather than restarting a fixed script. During narration, use **Interrupt and speak** first; simultaneous voice interruption over narration is not implemented.
6. Try **Mute microphone**, **Type a reply**, and **Pause the conversation**. When paused, use **Continue the conversation**; interrupted narration restarts its short reply. Allow an in-flight reply to finish before resuming. **Start by typing** skips the initial microphone request.
7. Say `stop`, tap **Finish**, or let the three-minute limit expire. Recording and playback should stop. Leaving the screen deletes the conversation; it is not saved as history.

Keep this prototype in the foreground with internet access. Locking the screen or switching apps pauses it and stops recording. When you return, resume explicitly. With no detected speech for about ten seconds after a question, the app pauses listening without another prompt. Intentional quiet periods continue gently on their own. Voice detection is based on microphone levels, so wind and background noise need physical-device checks; use **Finish reply** or typing if detection is unreliable.

This mode uses real Gemma inference through Mastra and ElevenLabs transcription/speech. Each new reply consumes provider quota. It does not use the ElevenLabs Agents call-minute plan or require its SDK. Conversations use Sarah by default, with no background music; natural surroundings remain audible. The main screen stays short so you can look away, but screen-off conversations are not implemented.

### Take it outside for the challenge

- Use it for one three-minute break in an outdoor spot of your choosing. Compare spoken guidance, quiet time, and how often you had to look at or touch the screen.
- Try a specific mid-session request, such as less talking, switching attention from sight to sound, or avoiding breathing exercises.
- Record what worked and what failed: wind, speech detection, response delay, useful adaptations, and interruptions. Exclude personal disclosures and precise location from a demo.
- Describe your actual experience in the entry. Automated checks and a desk-based integration test do not substitute for taking it outside.

## 5. Test a prepared audio break with text

1. Tap **Prepare a guided audio break →**.
2. Choose **Just pausing**, **3 minutes**, and **Sitting**.
3. Type `A tree in a park, leaves moving in a light breeze` under **What do you notice around you?**
4. Select **More quiet space** and tap **Prepare my break**.
5. Keep the app open while it prepares and downloads the audio; this can take a few minutes.
6. Tap **Start my break**. Check that the title and narration suit the check-in and that the track lasts about three minutes, including its quiet spaces.

Personalized sessions currently use **River**. The deployed API successfully generated and served a three-minute session on October 9, 2026. New sessions use provider credits; reuse the sample for repeated playback checks.

Later, try **Walking**, another duration, and **More spoken guidance**. Listen for sensible, eyes-open guidance that uses your description without inventing surroundings or promising a particular emotional outcome.

## 6. Test a spoken check-in for a prepared track

1. Open a new check-in and tap **Speak instead**.
2. Read the transcription notice, choose **Record**, and allow microphone access.
3. Say a short description, such as `I'm sitting near a tree and I can hear birds.`
4. Tap **Finish recording**. The transcript should appear in the surroundings field.
5. Review and edit the text, then tap **Prepare my break**.

Also check these cases:

- Decline microphone access: typing should still work.
- Choose **Type instead** in the consent dialog: recording should not start.
- Leave the app while recording: recording should stop; return and start a new recording if needed.
- Keep a recording short; the app automatically finishes recording at about one minute.

Speech transcription and physical-device microphone behavior still need testing. If text sessions work but speech fails, check the microphone permission and the ElevenLabs key's speech-to-text permission and quota.

## 7. Test screen-off playback for prepared tracks in an Outside build

Expo Go does not exercise Outside's own native configuration, and this app deliberately skips lock-screen controls there. Use a dedicated development build to verify the intended pocket-your-phone experience. See [Expo's development build guide](https://docs.expo.dev/develop/development-builds/introduction/) and [SDK 57 audio documentation](https://docs.expo.dev/versions/v57.0.0/sdk/audio/).

### Build locally on a Mac

This route supports an iPhone without a paid Apple Developer membership, using Xcode signing with an Apple account. Finish Xcode's first-launch setup, connect and trust the iPhone, and enable Developer Mode when requested.

```sh
cd /Users/EmmaBB/Outside
export PATH="/Users/EmmaBB/.local/node/bin:$PATH"
npx expo run:ios --device
```

The command generates native files, builds, and installs the app. Complete any signing or device setup prompts. Do not edit generated native folders by hand. This route has not yet been verified on this Mac.

### Build in the cloud with EAS

For a physical iPhone, this route requires an Expo account and paid Apple Developer Program membership.

```sh
cd /Users/EmmaBB/Outside
export PATH="/Users/EmmaBB/.local/node/bin:$PATH"
npx eas-cli@latest login
npm run build:ios
```

Follow EAS's project, signing, and device-registration prompts. Install the development build using the resulting link. Then start its development server with:

```sh
npm run dev
```

Open the installed **Outside** app and connect to that server. Use **App setup** again if this installation has no saved connection. For setup details, see [EAS iOS development builds](https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/).

### Device checklist

- [ ] Start a session and lock the screen. Audio continues through spoken prompts and quiet intervals for the whole track.
- [ ] Pause and resume from the lock screen and confirm the position is preserved.
- [ ] Switch to another app and return; playback and timer remain consistent.
- [ ] Check silent-mode playback using an audible media volume.
- [ ] Disconnect headphones and check that playback pauses rather than unexpectedly continuing aloud.
- [ ] Interrupt playback with a phone call or other audio; check that audio stops appropriately and the app can resume afterward.
- [ ] After a session is fully prepared and loaded, enable airplane mode without closing the app. The downloaded track should still play. Re-enable Wi-Fi afterward for Expo's development connection.
- [ ] Finish early and return home; audio stays stopped.
- [ ] Let the track finish; **Finish my break** opens the optional reflection.
- [ ] Tap **Back to my day** and start another break; the old session is cleared.

These are acceptance checks, not claims that every device behavior has passed. Downloaded audio supports the current session; session history and recovery after force-quitting are not implemented.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| QR code does not open the app | Same Wi-Fi, matching Expo accounts, local-network permission, and the terminal still running. If the network blocks LAN access, stop the server and run `npm start -- --tunnel`; follow any tunnel dependency prompt. |
| Expo Go reports an incompatible SDK | Update Expo Go. This project uses Expo SDK 57; use a matching development build if the installed Expo Go does not support it. |
| Terminal reports an unsupported Node version | Run the PATH command in step 1, then check `node --version`. The project needs Node 22.13 or newer. |
| “The access code is incorrect” | Copy Render's `OUTSIDE_ACCESS_TOKEN` value, without its name, quotes, or extra spaces. |
| “Could not reach the server” | Use the exact HTTPS base address above and confirm phone internet access. Open the [health endpoint](https://outside-api-d8xc.onrender.com/health); it should return `{"status":"ok"}`. |
| Connection saves but session generation fails | Check Render's provider settings, voice access, quota, and logs. Readiness alone does not prove provider access. |
| “Unsupported FormDataPart implementation” after recording | Reload Outside in Expo Go and start a new conversation. This upload-format bug is fixed in the current source; it does not require changes to Render settings. |
| “Could not upload your recording” | Check phone internet access and retry a short reply. You can also use **Type a reply**. |
| Audio seems silent | Check media volume, Bluetooth output, and whether playback is paused. Leave time for intentional quiet intervals. |
| No lock-screen controls in Expo Go | Use a dedicated Outside build for this check. |

When reporting a problem, include which build you used, the steps, the visible error, and what you expected. Exclude access codes and API keys.

## Automated checks

From the repository root:

```sh
npm run lint
npm run typecheck
npm test
npm run export:ios
```

From `server/`, with dependencies and FFmpeg/FFprobe installed:

```sh
npm run typecheck
npm test
npm run build
```

The seven backend tests cover authentication, input validation, protected audio, prompt validation, pause scheduling, real FFmpeg duration, conversation context, quiet continuation, idempotent retries, and cleanup. Seven app-side tests cover microphone-level detection, pauses, recording upload configuration, response errors, and timeout cancellation. These use fixtures and mock native uploads, not provider calls; they do not verify phone microphone behavior.

An optional live integration check consumes two Gemma requests and four short ElevenLabs clips using synthetic check-ins. From `server/` with a configured `.env`, run:

```sh
node --env-file=.env --import tsx scripts/check-conversation.mts
```

It checks the opening, an adaptive response about work and leaves, a request for less talking and no breathing focus, protected MP3 retrieval, and explicit stop. It passed with the configured Gemma endpoint and Sarah voice on October 11, 2026. It does not record a physical microphone or validate outdoor use.
