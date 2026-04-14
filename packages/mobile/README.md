# @cards/mobile

React Native (Expo) port of the Emblem Cards client, targeting Android. Shares engines + zustand store + socket protocol with the web [`@cards/client`](../client/README.md).

## Who this is for

- **Just want to play it on your phone?** Jump to [Run the dev bundle](#run-the-dev-bundle).
- **Shipping a release to the Play Store?** Jump to [Ship a release](#ship-a-release).
- **Adding a feature?** Start with [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) for the overall layout, then skim the [Mobile-only pieces](#mobile-only-pieces) below to know what's different from the web.

## Run the dev bundle

Fastest path (no native toolchain needed, ~2 min):

```bash
# 1. Build the engine packages once — mobile imports their compiled dist/
pnpm --filter @cards/shared --filter @cards/card-engine --filter @cards/battle-engine build

# 2. Start Metro
pnpm --filter @cards/mobile start
```

- Scan the QR code with **Expo Go** on your Android phone (same Wi-Fi). The app hot-reloads on save.
- Or press `a` in the terminal to launch the Android emulator.

Online mode needs the server running — see [Online mode](#online-mode).

If you edit engine source, re-run the `pnpm --filter ... build` command — Metro resolves the engines via their `dist/` folders.

## Install a real APK (no Metro)

You need **JDK 17** and the **Android SDK** for this path. Setup once:

```bash
brew install openjdk@17
brew install --cask android-commandlinetools
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
yes | sdkmanager --licenses
sdkmanager "platform-tools" "build-tools;35.0.0" "platforms;android-35"
```

Then to build + install a debug APK:

```bash
cd packages/mobile
npx expo export:embed --platform android --dev false \
  --entry-file packages/mobile/index.ts \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

This APK bundles the JS inside it — no Metro required.

## Ship a release

```bash
cd packages/mobile
./scripts/build-release.sh --bump patch     # or minor / major
```

Output: a signed AAB at `release/emblem-cards-game-v<version>-<code>.aab`. Upload that to Play Console. Full Play Store submission flow (keystore backup, store listing, content rating) is in [`release/README.md`](./release/README.md).

## Online mode

Online mode connects to [`@cards/server`](../server/README.md) via socket.io.

Set the server URL in one of three places, highest-priority first:

1. **In-app**: Settings → Online multiplayer → Server URL. Survives app restarts.
2. **Build-time env**: `EXPO_PUBLIC_SERVER_URL=http://...` when starting Metro.
3. **Fallback default**: `http://10.0.2.2:3001` (Android emulator → host `localhost`).

For a physical device you need the phone on the same LAN as the server, pointed at its LAN IP (e.g. `http://192.168.1.20:3001`).

## Permissions

The app requests only:

- `INTERNET` — socket.io connections to the game server (online mode only).
- `VIBRATE` — haptic feedback during play; can be toggled off in Settings.

Default Expo adds `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, and `SYSTEM_ALERT_WINDOW` to the manifest — harmless boilerplate, no runtime permission prompt.

## Mobile-only pieces

Mostly the same architecture as web, but a few things are RN-specific:

| Web | Mobile |
|---|---|
| `localStorage` (sync) | [`lib/storage.ts`](src/lib/storage.ts) — sync-read cache over AsyncStorage, hydrated at boot |
| Web Audio synth SFX | [`lib/sounds.ts`](src/lib/sounds.ts) — `expo-haptics` impact/notification patterns |
| Right-click to inspect | Long-press to inspect |
| Hover animations | Pressable state + Reanimated for key moments (confetti, turn-flip flash, damage numbers, screen transitions) |
| Sidebar battle log | [`MiniLog`](src/components/MiniLog.tsx) at the top of the hand; tap to open full log modal |
| Vite + Tailwind | Expo Metro + RN `StyleSheet` |

Persistent state is expanded on mobile:

- In-progress matches (local/AI only) auto-save and can be resumed from the menu
- Deck-builder progress persists across app launches
- Win/loss stats per mode + fastest-win turn count
- Settings: haptics toggle, custom server URL

Full file index is in the [Project Structure](../../README.md#3-project-structure) section of the root README.

## Build pipeline scripts

Under [`scripts/`](scripts/):

| Script | What it does |
|---|---|
| `build-release.sh` | One-command: bundle JS, build signed AAB, copy to `release/` with versioned name. Auto-bumps via `--bump patch\|minor\|major`. |
| `setup-signing.sh` | Re-applies release signing config to `android/gradle.properties` + `android/app/build.gradle` after `expo prebuild --clean` wipes them. |
| `capture-screenshot.sh <slug>` | ADB-captures a phone screenshot into `release/store-listing/screenshots/<slug>.png`. |
| `make-icons.py` | Regenerates the app icon set (1024 + adaptive-icon + splash + favicon). |
| `make-store-assets.py` | Regenerates the 512×512 Play Store icon and 1024×500 feature graphic. |

All scripts read `JAVA_HOME` / `ANDROID_HOME` from env with sensible Homebrew defaults.

## Related reading

- [`../../README.md`](../../README.md) — monorepo overview, tech stack primer, game rules
- [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) — package responsibilities + data flow
- [`../../docs/MAKING_CHANGES.md`](../../docs/MAKING_CHANGES.md) — recipes for common edits
- [`./release/README.md`](./release/README.md) — Play Store release + keystore management
