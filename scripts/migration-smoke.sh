#!/usr/bin/env bash
set -Eeuo pipefail
EVIDENCE="$GITHUB_WORKSPACE/evidence"
mkdir -p "$EVIDENCE"
OLDAPK="$RUNNER_TEMP/Futebol-Top-v1.3.4-release.apk"
NEWAPK="$GITHUB_WORKSPACE/android/app/build/outputs/apk/release/app-release.apk"
PKG=com.mmsistemastecnologia.cartasfutebol
STEP=start
mark(){ STEP="$1"; printf '%s\n' "$STEP" | tee -a "$EVIDENCE/steps.txt"; }
collect(){ rc=$?; set +e; adb logcat -d -v threadtime > "$EVIDENCE/logcat-all.txt" 2>&1; adb logcat -d -b crash -v threadtime > "$EVIDENCE/logcat-crash.txt" 2>&1; adb shell pidof "$PKG" > "$EVIDENCE/pid.txt" 2>&1; adb shell dumpsys activity activities > "$EVIDENCE/activities.txt" 2>&1; adb shell dumpsys window windows > "$EVIDENCE/windows.txt" 2>&1; adb shell screencap -p /sdcard/ft.png >/dev/null 2>&1 && adb pull /sdcard/ft.png "$EVIDENCE/screen.png" >/dev/null 2>&1; adb shell uiautomator dump /sdcard/ft.xml >/dev/null 2>&1 && adb pull /sdcard/ft.xml "$EVIDENCE/ui.xml" >/dev/null 2>&1; printf 'exit=%s\nstep=%s\n' "$rc" "$STEP" > "$EVIDENCE/result.txt"; return "$rc"; }
trap collect EXIT
mark download-old-apk
curl -fL --retry 3 'https://nightly.link/m20513703-art/cartas-do-futebol-app/actions/runs/41194459546/futebol-top-v1.3.4-apk.zip' -o "$RUNNER_TEMP/old.zip"
python3 - "$RUNNER_TEMP/old.zip" "$OLDAPK" <<'PY'
import sys,zipfile
z=zipfile.ZipFile(sys.argv[1]); names=[n for n in z.namelist() if n.endswith('.apk')]
assert names, z.namelist()
with z.open(names[0]) as src, open(sys.argv[2],'wb') as dst:
 while True:
  b=src.read(1024*1024)
  if not b:break
  dst.write(b)
PY
test -s "$OLDAPK"; test -s "$NEWAPK"
mark wait-emulator
adb wait-for-device
until [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 2; done
adb logcat -c
mark install-old-version
adb install "$OLDAPK"
mark launch-old-version
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null
sleep 6
mark create-legacy-career
adb shell uiautomator dump /sdcard/old.xml >/dev/null
adb pull /sdcard/old.xml "$EVIDENCE/old-setup.xml" >/dev/null
python3 - "$EVIDENCE/old-setup.xml" <<'PY'
import sys,xml.etree.ElementTree as ET
for n in ET.parse(sys.argv[1]).iter('node'):
 print(n.attrib.get('class'),repr(n.attrib.get('text')),repr(n.attrib.get('content-desc')),n.attrib.get('bounds'))
PY
python3 - "$EVIDENCE/old-setup.xml" > "$RUNNER_TEMP/fields.txt" <<'PY'
import sys,xml.etree.ElementTree as ET,re
nodes=list(ET.parse(sys.argv[1]).iter('node'))
fields=[n for n in nodes if 'EditText' in n.attrib.get('class','')]
assert len(fields)>=2,[(n.attrib.get('class'),n.attrib.get('text'),n.attrib.get('content-desc')) for n in nodes]
for n in fields[:2]:
 x1,y1,x2,y2=map(int,re.findall(r'\d+',n.attrib['bounds']));print((x1+x2)//2,(y1+y2)//2)
PY
read -r nX nY < <(sed -n '1p' "$RUNNER_TEMP/fields.txt")
read -r cX cY < <(sed -n '2p' "$RUNNER_TEMP/fields.txt")
adb shell input tap "$nX" "$nY"; adb shell input text 'Clube%smigracao'; adb shell input keyevent 61; adb shell input text 'Cidade%sde%sTeste'; adb shell input keyevent 4
for i in 1 2 3 4; do adb shell input swipe 540 1650 540 500 400; sleep 1; done
adb shell uiautomator dump /sdcard/old-scrolled.xml >/dev/null; adb pull /sdcard/old-scrolled.xml "$EVIDENCE/old-scrolled.xml" >/dev/null
python3 - "$EVIDENCE/old-scrolled.xml" > "$RUNNER_TEMP/create.txt" <<'PY'
import sys,xml.etree.ElementTree as ET,re
for n in ET.parse(sys.argv[1]).iter('node'):
 text=(n.attrib.get('text','')+' '+n.attrib.get('content-desc','')).upper()
 if 'CRIAR CLUBE E COMEÇAR' in text or 'CRIAR CLUBE' in text:
  x1,y1,x2,y2=map(int,re.findall(r'\d+',n.attrib['bounds']));print((x1+x2)//2,(y1+y2)//2);break
else:raise SystemExit('Create-career button missing from old app UI')
PY
read -r bX bY < "$RUNNER_TEMP/create.txt"; adb shell input tap "$bX" "$bY"; sleep 8
adb shell uiautomator dump /sdcard/old-career.xml >/dev/null; adb pull /sdcard/old-career.xml "$EVIDENCE/old-career.xml" >/dev/null
python3 - "$EVIDENCE/old-career.xml" <<'PY'
import sys,xml.etree.ElementTree as ET
s=' '.join(n.attrib.get('text','')+' '+n.attrib.get('content-desc','') for n in ET.parse(sys.argv[1]).iter('node')).lower()
assert 'clube migracao' in s or 'crie seu clube' not in s,'Legacy career creation failed'
print('Old version career screen verified')
PY
mark upgrade-to-fixed-version
adb install -r "$NEWAPK"
adb logcat -c
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null
sleep 15
adb shell pidof "$PKG" > "$EVIDENCE/pid-after-15s.txt"
test -s "$EVIDENCE/pid-after-15s.txt"
adb shell dumpsys activity activities > "$EVIDENCE/activities-after-15s.txt"
if ! grep -E "$PKG" "$EVIDENCE/activities-after-15s.txt" | grep -E 'mResumedActivity|topResumedActivity|Resumed'; then echo 'Migrated app not foreground' >&2; exit 1; fi
adb shell uiautomator dump /sdcard/new.xml >/dev/null; adb pull /sdcard/new.xml "$EVIDENCE/new-career.xml" >/dev/null
python3 - "$EVIDENCE/new-career.xml" <<'PY'
import sys,xml.etree.ElementTree as ET
s=' '.join(n.attrib.get('text','')+' '+n.attrib.get('content-desc','') for n in ET.parse(sys.argv[1]).iter('node')).lower()
assert 'clube migracao' in s, 'New version opened but migrated career name missing from screen'
print('Migrated career is visible after upgrade')
PY
adb logcat -d -b crash -v threadtime > "$EVIDENCE/crash-after-upgrade.txt"
if grep -E 'FATAL EXCEPTION|Fatal signal|ANR in|ReactNativeJS.*(Error|error)|Unable to load script' "$EVIDENCE/crash-after-upgrade.txt"; then exit 1; fi
mark pass
