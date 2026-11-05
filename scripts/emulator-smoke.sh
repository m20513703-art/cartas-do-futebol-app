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
# End-to-end career gameplay test, isolated to this validation APK.
ui_dump() { adb shell uiautomator dump /sdcard/futbol-ui.xml >/dev/null 2>&1; adb pull /sdcard/futbol-ui.xml /tmp/futbol-ui.xml >/dev/null 2>&1; }
ui_has() { ui_dump; python3 - "$1" <<'PYUI'
import sys,xml.etree.ElementTree as E
r=E.parse('/tmp/futbol-ui.xml').getroot(); s=sys.argv[1]
raise SystemExit(0 if any(s in (n.attrib.get('text','')+' '+n.attrib.get('content-desc','')) for n in r.iter('node')) else 1)
PYUI
}
ui_tap() { ui_dump; python3 - "$1" <<'PYUI' >/tmp/futbol-tap.txt
import sys,xml.etree.ElementTree as E
r=E.parse('/tmp/futbol-ui.xml').getroot(); s=sys.argv[1]
for n in r.iter('node'):
 if s in (n.attrib.get('text','')+' '+n.attrib.get('content-desc','')):
  b=n.attrib.get('bounds','')
  if b:
   a=b.replace('][',',').strip('[]').split(','); print((int(a[0])+int(a[2]))//2,(int(a[1])+int(a[3]))//2); break
else: raise SystemExit('UI text not found: '+s)
PYUI
 read -r x y < /tmp/futbol-tap.txt; adb shell input tap "$x" "$y"; sleep .5; }
ui_wait() { local s="$1" n="${2:-45}"; for i in $(seq 1 "$n"); do ui_has "$s" && return 0; sleep 1; done; echo "Timed out waiting for UI: $s" >&2; return 1; }
ui_scroll() { read -r w h <<< "$(adb shell wm size | sed -n 's/.*: *\([0-9]*\)x\([0-9]*\).*/\1 \2/p' | head -1)"; adb shell input swipe "$((w/2))" "$((h*4/5))" "$((w/2))" "$((h/3))" 450; sleep .5; }
ui_tap_scroll() { local s="$1"; for i in $(seq 1 8); do if ui_has "$s"; then ui_tap "$s"; return; fi; ui_scroll; done; echo "Could not reveal UI: $s" >&2; return 1; }
ui_wait 'Nome do seu clube novo' 60
ui_dump
python3 - <<'PYUI' >/tmp/futbol-fields.txt
import xml.etree.ElementTree as E
r=E.parse('/tmp/futbol-ui.xml').getroot()
for n in r.iter('node'):
 if n.attrib.get('class','').endswith('EditText'):
  a=n.attrib.get('bounds','').replace('][',',').strip('[]').split(',')
  if len(a)==4: print((int(a[0])+int(a[2]))//2,(int(a[1])+int(a[3]))//2)
PYUI
mapfile -t fields < /tmp/futbol-fields.txt
test "${#fields[@]}" -ge 2
read -r x y <<< "${fields[0]}"; adb shell input tap "$x" "$y"; adb shell input text 'FutTopTeste'; adb shell input keyevent 4
read -r x y <<< "${fields[1]}"; adb shell input tap "$x" "$y"; adb shell input text 'SaoPaulo'; adb shell input keyevent 4
ui_tap 'COMEÇAR CARREIRA NO BRASIL'
ui_wait 'PRÓXIMO DESAFIO' 90
ui_wait 'JOGAR PARTIDA' 45
ui_tap 'JOGAR PARTIDA'
ui_wait 'COMEÇAR PARTIDA' 45
ui_tap 'Rápido'
ui_tap 'COMEÇAR PARTIDA'
ui_wait 'INTERVALO' 60
ui_wait "45'" 10
# Choose a starter and a substitute with exactly the same position.
ui_dump
python3 - <<'PYUI' >/tmp/futbol-role.txt
import xml.etree.ElementTree as E
r=E.parse('/tmp/futbol-ui.xml').getroot()
for n in r.iter('node'):
 t=n.attrib.get('text','')
 if t.startswith('SAI · '): print(t.split('·')[-1].strip()); break
else: raise SystemExit('No starter substitution control visible')
PYUI
role=$(cat /tmp/futbol-role.txt)
ui_tap_scroll 'SAI ·'
ui_dump
python3 - "$role" <<'PYUI' >/tmp/futbol-in.txt
import sys,xml.etree.ElementTree as E
r=E.parse('/tmp/futbol-ui.xml').getroot(); role=sys.argv[1]
for n in r.iter('node'):
 t=n.attrib.get('text','')
 if t.startswith('ENTRA · ') and t.split('·')[-2].strip()==role: print(t); break
else: raise SystemExit('No reserve available in same position: '+role)
PYUI
incoming=$(cat /tmp/futbol-in.txt)
ui_tap "$incoming"
ui_wait 'Substituição realizada' 10
ui_tap_scroll 'COMEÇAR 2º TEMPO'
ui_wait "90'" 60
ui_wait 'ÚLTIMO RESULTADO' 45
ui_wait 'FutTopTeste' 10
adb shell am force-stop "$PKG"; adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1; sleep 15
ui_wait 'ÚLTIMO RESULTADO' 45
ui_wait 'FutTopTeste' 10
echo 'Gameplay smoke passed: created isolated test club, started a match, reached halftime, substituted a same-position reserve, completed minute 90, and confirmed persisted result after relaunch.'
