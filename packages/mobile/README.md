# @cards/mobile

React Native (Expo) port of the Emblem Cards client, targeting Android.

## Run in dev

```
pnpm --filter @cards/card-engine --filter @cards/battle-engine --filter @cards/shared build
pnpm --filter @cards/mobile start
```

Then either scan the QR with Expo Go on your Android device, or press `a` to launch an emulator.

The mobile client imports the engine packages' built `dist/` output. Rebuild the engines if you change their sources.

## Online mode

Online mode connects to the server package via socket.io. Set `EXPO_PUBLIC_SERVER_URL` to point at your server. Defaults:

- `http://10.0.2.2:3001` (Android emulator → host localhost)
- For a physical device, use your LAN IP (e.g., `http://192.168.1.20:3001`).

## Build for Play Store

The native `android/` project has been generated via `expo prebuild` and is gitignored. Regenerate any time config in [app.json](app.json) changes:

```
pnpm --filter @cards/mobile prebuild --clean
```

**Cloud build (recommended):**
```
pnpm --filter @cards/mobile build:android      # EAS cloud build; requires `eas login`
```

**Local build** (requires JDK 17 + Android SDK + `ANDROID_HOME`):

```
cd packages/mobile/android
./gradlew assembleDebug       # debug APK at app/build/outputs/apk/debug/app-debug.apk
./gradlew bundleRelease       # release AAB at app/build/outputs/bundle/release/app-release.aab
```

## Permissions

The app requests minimal permissions: `INTERNET` (socket.io to the game server) and `VIBRATE` (haptic feedback for gameplay events). No microphone, camera, or location.

## Differences from the web client

- No custom CardArt — cards are rendered as colored frames.
- Long-press (not right-click) opens the inspector modal.
- SFX are replaced with haptic feedback via `expo-haptics` (Web Audio tones don't map cleanly to RN).
- Combat FX are simplified — damage numbers pop up on hit slots via Reanimated (no screen-flash or attack-type particles).
- Battle log is accessed via a button that opens a bottom sheet modal instead of a side panel.
- Tutorial / battle hints omitted.
