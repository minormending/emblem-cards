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

# 1a. Drop x86/x86_64 ABIs from build (audit M8). Saves build time and
#     AAB upload size; Play Store delivers per-ABI server-side anyway.
if grep -q "^reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64$" "$GRADLE_PROPS"; then
  sed -i.bak -E 's/^reactNativeArchitectures=.*$/reactNativeArchitectures=armeabi-v7a,arm64-v8a/' "$GRADLE_PROPS"
  rm -f "$GRADLE_PROPS.bak"
  echo "dropped x86 ABIs from $GRADLE_PROPS"
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

# 3. build.gradle — replace hardcoded versionCode/versionName with a
#    JsonSlurper read of app.json. Mirrors the M6 fix in the audit:
#    after prebuild regenerates build.gradle with literal version values,
#    we restore the dynamic read so the next app.json bump auto-applies.
if ! grep -q "JsonSlurper" "$BUILD_GRADLE"; then
  python3 - "$BUILD_GRADLE" <<'PY'
import re, sys
path = sys.argv[1]
src = open(path).read()

# Replace the literal version block in defaultConfig with a JsonSlurper
# read placed just above defaultConfig. The regex matches the typical
# expo prebuild output:
#   versionCode 7
#   versionName "1.0.6"
slurper = """\
    // Read version from app.json so we can't drift between the JS-side
    // source of truth and the Android build (audit M6).
    def appJson = new groovy.json.JsonSlurper().parseText(
        file('../../app.json').getText('UTF-8')
    )
    def appVersion = appJson.expo.version as String
    def appVersionCode = appJson.expo.android.versionCode as Integer

    defaultConfig {
"""

src, n = re.subn(
    r"(\n\s*)defaultConfig \{",
    "\n" + slurper,
    src,
    count=1,
)
if n != 1:
    raise SystemExit("could not locate defaultConfig block")

# Replace the literal versionCode/versionName lines.
src = re.sub(
    r"versionCode\s+\d+",
    "versionCode appVersionCode",
    src,
    count=1,
)
src = re.sub(
    r'versionName\s+"[^"]*"',
    "versionName appVersion",
    src,
    count=1,
)

open(path, "w").write(src)
print("patched build.gradle to read versions from app.json")
PY
else
  echo "build.gradle already reads versions from app.json"
fi

echo "signing setup complete."
