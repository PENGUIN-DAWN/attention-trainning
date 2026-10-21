"""Check a built APK and upgrade identity, without touching user data or an Android device."""
from pathlib import Path
from descending import extend as descending_source
import hashlib
import json
import re
import subprocess
import zipfile
import xml.etree.ElementTree as ET

HERE=Path(__file__).resolve().parent
ROOT=HERE.parent
OUT=ROOT/'安卓手机版'
JAVA=Path(r'C:\Program Files\JetBrains\PyCharm 2026.1\jbr\bin\java.exe')
BT=ROOT/'.android-tools/android-15'

def command(args):
    result=subprocess.run([str(a) for a in args],check=True,capture_output=True)
    return result.stdout.decode('utf-8',errors='replace')

manifest=ET.parse(HERE/'AndroidManifest.xml').getroot()
version=manifest.get('{http://schemas.android.com/apk/res/android}versionName')
version_code=int(manifest.get('{http://schemas.android.com/apk/res/android}versionCode'))
assert version=='1.40' and version_code==6
apk=OUT/f'专注力小宇宙-{version}.apk'
html=(HERE/'assets/index.html').read_bytes()
with zipfile.ZipFile(apk) as z:
    assert z.read('assets/index.html')==html
    assert 'classes.dex' in z.namelist()
    assert not any(name.endswith(('.p12','.jks','.keystore')) or 'signing-config' in name for name in z.namelist())
    assert b'guideDialog' in html and b'focus-universe-history-v1' in html
    assert b'lobbyView' not in html and b'arcadeView' not in html and b'focus-universe-arcade-v1' in html
    assert b'FocusToolRules' in html and b'installToolUI' in html
embedded=json.loads(re.search(r'<script type="application/json" id="trainingData">(.*?)</script>',html.decode('utf-8'),re.S).group(1))
assert len(embedded)==16
with zipfile.ZipFile(OUT/'专注力小宇宙-1.30.apk') as old:
    previous130=old.read('assets/index.html').decode('utf-8')
prior10=json.loads(re.search(r'<script type="application/json" id="trainingData">(.*?)</script>',previous130,re.S).group(1))
assert embedded[:10]==prior10,'Existing ten training modules changed'
for module in embedded[:6]:
    original=(ROOT/module['filename']).read_text(encoding='utf-8')
    assert module['source']==(descending_source(original) if module['id']==1 else original),module['filename']+' engine changed unexpectedly'
with zipfile.ZipFile(OUT/'专注力小宇宙-1.1.0.apk') as old:
    prior_html=old.read('assets/index.html').decode('utf-8')
current_presentation=json.loads(re.search(r'<script type="application/json" id="trainingPresentation">(.*?)</script>',html.decode('utf-8'),re.S).group(1))
prior_presentation=json.loads(re.search(r'<script type="application/json" id="trainingPresentation">(.*?)</script>',prior_html,re.S).group(1))
assert current_presentation['css']==prior_presentation['css'],'1.1.0 training CSS changed'
# One explicit presentation extension: a human-readable label for the new reverse setting.
current_label="({challenge:'30 秒挑战',complete:'完成 25 个',reverse:'倒序 35 秒 · 点击'}[document.getElementById('mode').value])"
prior_label="(document.getElementById('mode').value==='challenge'?'30 秒挑战':'完成 25 个')"
assert current_presentation['js'].replace(current_label,prior_label)==prior_presentation['js']
baseline=json.loads((HERE/'baseline-hashes.json').read_text(encoding='utf-8'))
for name,sha in baseline.items():
    assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==sha,name+' changed unexpectedly'
fingerprints={}
for old_version in ['1.0.0','1.0.1','1.1.0','1.2.0','1.30',version]:
    candidate=OUT/f'专注力小宇宙-{old_version}.apk'
    certificate=command([JAVA,'-jar',BT/'lib/apksigner.jar','verify','--verbose','--print-certs',candidate])
    assert 'Verified using v2 scheme (APK Signature Scheme v2): true' in certificate
    fingerprints[old_version]=re.search(r'certificate SHA-256 digest: ([0-9a-f]+)',certificate).group(1)
assert len(set(fingerprints.values()))==1
# Native Windows aapt/zipalign need ASCII paths.
staging=Path.home()/f'.cache/focus-android-build/FocusUniverse-{version}.apk'
assert staging.read_bytes()==apk.read_bytes()
badging=command([BT/'aapt.exe','dump','badging',staging])
assert "name='cn.focusuniverse.offline' versionCode='6' versionName='1.40'" in badging
permissions=command([BT/'aapt.exe','dump','permissions',staging])
assert 'uses-permission' not in permissions and 'android.permission.INTERNET' not in permissions
command([BT/'zipalign.exe','-c','-p','4',staging])
result={'version':version,'versionCode':version_code,'package':manifest.get('package'),'apk_bytes':apk.stat().st_size,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'same_signing_certificate_as':['1.0.0','1.0.1','1.1.0','1.2.0','1.30'],'certificate_sha256':fingerprints[version],'packaged_html_matches_tested_file':True,'original_ten_modules_match_1_30_apk':True,'five_other_original_engines_and_1_1_training_css_unchanged':True,'schulte_extension_only_in_android_generated_source':True,'old_apks_and_web_unchanged':True,'network_permission':False,'apk_signature_verified':True,'zipalign_verified':True,'real_device_upgrade_tested':False}
(OUT/f'安装包验收-{version}.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
