#!/usr/bin/env bash
# Capture a Play Store screenshot from the currently-connected Android device.
#
# Usage:  scripts/capture-screenshot.sh <slug>
#         slug becomes the file name; pick something descriptive
#         (battle-1, deck-builder, menu, etc.)
#
# Output: release/store-listing/screenshots/<slug>.png
#
# The Play Store accepts PNGs between 320px and 3840px on the short side;
# a modern phone screencap is ~1080×2400 which is perfectly in range.
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "usage: $0 <slug>  (e.g. 'battle-1', 'menu', 'deck-builder')" >&2
  exit 1
fi

HERE="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$HERE/release/store-listing/screenshots"
mkdir -p "$OUT_DIR"

SDK="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"
ADB="$SDK/platform-tools/adb"

if ! "$ADB" devices | grep -q "device$"; then
  echo "no device attached — connect phone, enable USB debugging, and retry." >&2
  exit 1
fi

"$ADB" exec-out screencap -p > "$OUT_DIR/$1.png"
echo "saved $OUT_DIR/$1.png ($(wc -c < "$OUT_DIR/$1.png") bytes)"
