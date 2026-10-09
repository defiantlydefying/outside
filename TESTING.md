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
3. Listen for spoken guidance separated by quiet intervals. Silence between prompts is intentional.
4. Try **Pause**, then **Continue my break**.
5. Try **Finish early → Finish break**, then **Back to my day**. Also let a sample finish naturally and check **Finish my break**.

The sample is fixed audio with a device-generated voice. It checks the interface and playback without using Gemma or ElevenLabs credits.

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

## 4. Test a personalized break with text

1. Tap **Take an outside break**.
2. Choose **Just pausing**, **3 minutes**, and **Sitting**.
3. Type `A tree in a park, leaves moving in a light breeze` under **What do you notice around you?**
4. Select **More quiet space** and tap **Prepare my break**.
5. Keep the app open while it prepares and downloads the audio; this can take a few minutes.
6. Tap **Start my break**. Check that the title and narration suit the check-in and that the track lasts about three minutes, including its quiet spaces.

Personalized sessions currently use **River**. The deployed API successfully generated and served a three-minute session on October 9, 2026. New sessions use provider credits; reuse the sample for repeated playback checks.

Later, try **Walking**, another duration, and **More spoken guidance**. Listen for sensible, eyes-open guidance that uses your description without inventing surroundings or promising a particular emotional outcome.

## 5. Test a spoken check-in

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

## 6. Test screen-off playback in an Outside build

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
| Audio seems silent | Check media volume, Bluetooth output, and whether playback is paused. Leave time for intentional quiet intervals. |
| No lock-screen controls in Expo Go | Use a dedicated Outside build for this check. |

When reporting a problem, include which build you used, the steps, the visible error, and what you expected. Exclude access codes and API keys.

## Automated checks

From the repository root:

```sh
npm run lint
npm run typecheck
npm run export:ios
```

From `server/`, with dependencies and FFmpeg/FFprobe installed:

```sh
npm run typecheck
npm test
npm run build
```

The five backend tests cover authentication, input validation, protected audio access, prompt validation, pause scheduling, and real FFmpeg track duration. They use fixtures and temporary local servers, not paid provider calls. Passing them does not verify phone behavior or live transcription.
