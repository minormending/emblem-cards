#!/usr/bin/env bash
# Re-apply release signing config to the generated android/ project.
#
# `expo prebuild --clean` wipes android/ and regenerates it from app.json.
# That regen uses the default template's debug-only signing config. Run this
# script afterwards to patch gradle.properties with our release keystore
# values and the build.gradle with a signingConfigs.release block.
#
# Idempotent: safe to run multiple times.
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"
CREDENTIALS="$HERE/release/keystore.credentials"
GRADLE_PROPS="$HERE/android/gradle.properties"
BUILD_GRADLE="$HERE/android/app/build.gradle"

if [ ! -f "$CREDENTIALS" ]; then
  echo "ERROR: $CREDENTIALS missing — generate the keystore first." >&2
  exit 1
fi

# Load credentials
set -a
# shellcheck disable=SC1090
source "$CREDENTIALS"
set +a

# 1. gradle.properties — append our block if absent
if ! grep -q "EMBLEM_CARDS_STORE_FILE" "$GRADLE_PROPS"; then
  cat >> "$GRADLE_PROPS" <<EOF

# Emblem Cards release signing
EMBLEM_CARDS_STORE_FILE=../../release/emblem-cards-release.keystore
EMBLEM_CARDS_STORE_PASSWORD=$EMBLEM_CARDS_STORE_PASSWORD
EMBLEM_CARDS_KEY_PASSWORD=$EMBLEM_CARDS_KEY_PASSWORD
EMBLEM_CARDS_KEY_ALIAS=$EMBLEM_CARDS_KEY_ALIAS
EOF
  echo "appended signing props to $GRADLE_PROPS"
else
  echo "signing props already present in $GRADLE_PROPS"
fi

# 2. build.gradle — patch signingConfigs and buildTypes.release
if ! grep -q "EMBLEM_CARDS_STORE_FILE" "$BUILD_GRADLE"; then
  # Use a Python script for the in-file patch — awk/sed is fragile on groovy.
  python3 - "$BUILD_GRADLE" <<'PY'
import re, sys
path = sys.argv[1]
src = open(path).read()

# Add a release block inside signingConfigs { ... }
release_block = '''        release {
            if (project.hasProperty('EMBLEM_CARDS_STORE_FILE')) {
                storeFile file(EMBLEM_CARDS_STORE_FILE)
                storePassword EMBLEM_CARDS_STORE_PASSWORD
                keyAlias EMBLEM_CARDS_KEY_ALIAS
                keyPassword EMBLEM_CARDS_KEY_PASSWORD
            }
        }
    }'''
src = re.sub(
    r"(signingConfigs \{\s*debug \{[^}]*\}\s*)\}",
    lambda m: m.group(1) + release_block,
    src,
    count=1,
)

# Flip buildTypes.release signingConfig
src = src.replace(
    "release {\n            // Caution! In production, you need to generate your own keystore file.\n            // see https://reactnative.dev/docs/signed-apk-android.\n            signingConfig signingConfigs.debug",
    "release {\n            signingConfig project.hasProperty('EMBLEM_CARDS_STORE_FILE')\n                ? signingConfigs.release\n                : signingConfigs.debug",
)

open(path, 'w').write(src)
print("patched build.gradle")
PY
else
  echo "build.gradle already patched"
fi

echo "signing setup complete."
