#!/usr/bin/env bash
# One-shot release build for Play Store.
#
# Runs the full pipeline: build engine packages → bundle JS → build signed
# AAB → copy into release/ with a versioned filename.
#
# Usage:
#   scripts/build-release.sh                # build current version from app.json
#   scripts/build-release.sh --clean        # regenerate android/ via prebuild first
#   scripts/build-release.sh --bump patch   # bump 1.0.2 → 1.0.3 before building
#   scripts/build-release.sh --bump minor   # 1.0.2 → 1.1.0
#   scripts/build-release.sh --bump major   # 1.0.2 → 2.0.0
#
# Designed to run both locally (reads keystore from release/) and in CI
# (reads from env: EMBLEM_CARDS_STORE_PASSWORD etc.).
set -euo pipefail

# ── Locate project root ──
HERE="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
cd "$HERE"

# ── Parse args ──
CLEAN_PREBUILD=0
BUMP=""
while [ $# -gt 0 ]; do
  case "$1" in
    --clean) CLEAN_PREBUILD=1; shift ;;
    --bump)
      BUMP="${2:-}"
      if [ -z "$BUMP" ]; then
        echo "--bump requires patch|minor|major" >&2
        exit 1
      fi
      shift 2
      ;;
    -h|--help)
      sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "unknown arg: $1" >&2; exit 1 ;;
  esac
done

# ── Bump version if requested ──
if [ -n "$BUMP" ]; then
  python3 - <<PY "$HERE/app.json" "$BUMP"
import json, sys
path, bump = sys.argv[1], sys.argv[2]
cfg = json.load(open(path))
major, minor, patch = (int(p) for p in cfg['expo']['version'].split('.'))
if bump == 'major': major, minor, patch = major + 1, 0, 0
elif bump == 'minor': minor, patch = minor + 1, 0
elif bump == 'patch': patch += 1
else: raise SystemExit(f'unknown bump: {bump}')
cfg['expo']['version'] = f"{major}.{minor}.{patch}"
cfg['expo']['android']['versionCode'] = cfg['expo']['android'].get('versionCode', 0) + 1
json.dump(cfg, open(path, 'w'), indent=2)
print(f"bumped to {cfg['expo']['version']} (code {cfg['expo']['android']['versionCode']})")
PY
fi

# ── Read current version from app.json ──
read -r VERSION VERSION_CODE < <(python3 -c "
import json
cfg = json.load(open('$HERE/app.json'))
print(cfg['expo']['version'], cfg['expo']['android']['versionCode'])
")
echo "→ building v$VERSION (versionCode $VERSION_CODE)"

# ── Resolve toolchain (local dev default, CI overrides) ──
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}"
export ANDROID_HOME="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

if [ ! -d "$JAVA_HOME" ]; then echo "JAVA_HOME not found at $JAVA_HOME" >&2; exit 1; fi
if [ ! -d "$ANDROID_HOME" ]; then echo "ANDROID_HOME not found at $ANDROID_HOME" >&2; exit 1; fi

# ── Build engine packages ──
echo "→ building workspace engine packages"
( cd "$REPO" && pnpm --filter @cards/shared --filter @cards/card-engine --filter @cards/battle-engine build >/dev/null )

# ── (Re-)generate android/ if asked ──
if [ "$CLEAN_PREBUILD" = "1" ]; then
  echo "→ regenerating android/ via expo prebuild --clean"
  npx expo prebuild --platform android --clean >/dev/null
  ./scripts/setup-signing.sh >/dev/null
else
  # Ensure versionName in the existing gradle file matches app.json.
  sed -i.bak -E "s/versionName \"[^\"]*\"/versionName \"$VERSION\"/; s/versionCode [0-9]+/versionCode $VERSION_CODE/" android/app/build.gradle
  rm -f android/app/build.gradle.bak
fi

# ── Bundle JS into android/app/src/main/assets/ ──
echo "→ bundling JS (Metro)"
mkdir -p android/app/src/main/assets
npx expo export:embed \
  --platform android \
  --dev false \
  --entry-file "packages/mobile/index.ts" \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res \
  >/dev/null

# ── Gradle: signed AAB ──
echo "→ gradle bundleRelease"
( cd android && ./gradlew bundleRelease -q )

# ── Copy + rename into release/ ──
SRC="$HERE/android/app/build/outputs/bundle/release/app-release.aab"
DEST="$HERE/release/emblem-cards-game-v$VERSION-$VERSION_CODE.aab"
mkdir -p "$HERE/release"
cp "$SRC" "$DEST"
SIZE=$(du -h "$DEST" | cut -f1)
echo ""
echo "✓ built $DEST ($SIZE)"
echo "  → upload to Play Console:"
echo "    https://play.google.com/console → Production → Create new release"
