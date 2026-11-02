#!/usr/bin/env bash
set -Eeuo pipefail
APK="$GITHUB_WORKSPACE/android/app/build/outputs/apk/release/app-release.apk"
test -s "$APK"
# Derive the configured Android applicationId and independently verify the APK.
PKG=$(python3 - "$GITHUB_WORKSPACE/app.json" <<'PYAPP'
import json,sys
with open(sys.argv[1], encoding="utf-8") as f:
    package=json.load(f)["expo"]["android"]["package"]
if not isinstance(package,str) or not package or "." not in package:
    raise SystemExit("Invalid expo.android.package in app.json")
print(package)
PYAPP
)
AAPT="${ANDROID_HOME:?ANDROID_HOME is required}/build-tools/35.0.0/aapt"
APK_PKG=$("$AAPT" dump badging "$APK" | sed -n "s/^package: name='\([^']*\)'.*/\1/p" | head -1)
if [ -z "$APK_PKG" ] || [ "$APK_PKG" != "$PKG" ]; then
  echo "APK applicationId mismatch: app.json=$PKG APK=${APK_PKG:-<missing>}" >&2
  exit 1
fi
EVIDENCE="$GITHUB_WORKSPACE/evidence"
mkdir -p "$EVIDENCE"
collect_evidence() {
  rc=$?
  set +e
  adb logcat -d -b all -v threadtime > "$EVIDENCE/logcat-all.txt" 2>&1
  adb logcat -d -b crash -v threadtime > "$EVIDENCE/logcat-crash.txt" 2>&1
  adb shell dumpsys activity activities > "$EVIDENCE/activities.txt" 2>&1
  adb shell dumpsys window windows > "$EVIDENCE/windows.txt" 2>&1
  adb shell pidof "$PKG" > "$EVIDENCE/pid.txt" 2>&1
  adb shell screencap -p /sdcard/futebol-top-screen.png >/dev/null 2>&1 && adb pull /sdcard/futebol-top-screen.png "$EVIDENCE/screen.png" >/dev/null 2>&1
  adb shell uiautomator dump /sdcard/futebol-top-ui.xml >/dev/null 2>&1 && adb pull /sdcard/futebol-top-ui.xml "$EVIDENCE/ui.xml" >/dev/null 2>&1
  printf '%s\n' "$rc" > "$EVIDENCE/smoke-exit-code.txt"
  return "$rc"
}
trap collect_evidence EXIT
echo "APK=$APK (applicationId=$PKG)"
adb wait-for-device
for i in $(seq 1 90); do
  boot=$(adb shell getprop sys.boot_completed | tr -d '\r' || true)
  [ "$boot" = 1 ] && break
  sleep 2
done
test "$(adb shell getprop sys.boot_completed | tr -d '\r')" = 1
adb logcat -c
adb install -r "$APK"
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1
sleep 15
pid=$(adb shell pidof "$PKG" | tr -d '\r' || true)
printf '%s\n' "$pid" > "$EVIDENCE/pid-after-15s.txt"
test -n "$pid"
adb shell dumpsys activity activities > "$EVIDENCE/activities-after-15s.txt"
if ! grep -E "$PKG" "$EVIDENCE/activities-after-15s.txt" | grep -E 'mResumedActivity|topResumedActivity|Resumed'; then
  echo "App process exists, but package not confirmed resumed in foreground" >&2
  exit 1
fi
adb logcat -d -b crash -v threadtime > "$EVIDENCE/crash-after-15s.txt"
if grep -E 'FATAL EXCEPTION|Fatal signal|ANR in|ReactNativeJS.*(Error|error)|Unable to load script' "$EVIDENCE/crash-after-15s.txt"; then
  echo 'Fatal/native, ANR, or React Native JS error detected' >&2
  exit 1
fi
echo 'Emulator smoke passed: installed release APK, app process remained alive after 15 seconds, foreground activity confirmed, and no matching fatal error in crash buffer.'
