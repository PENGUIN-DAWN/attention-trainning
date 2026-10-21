"""Verify 1.50 identity, exact unchanged engines/assets, and UI-only injection."""
from pathlib import Path
import hashlib,json,re,subprocess,zipfile,xml.etree.ElementTree as ET
HERE=Path(__file__).resolve().parent
ROOT=HERE.parent
OUT=ROOT/'安卓手机版'
JAVA=Path(r'C:\Program Files\JetBrains\PyCharm 2026.1\jbr\bin\java.exe')
BT=ROOT/'.android-tools/android-15'
def command(args):
    return subprocess.run(list(map(str,args)),check=True,capture_output=True).stdout.decode('utf-8',errors='replace')
def payload(html,id):
    return json.loads(re.search(r'<script type="application/json" id="'+id+r'">(.*?)</script>',html,re.S).group(1))
manifest=ET.parse(HERE/'AndroidManifest.xml').getroot()
assert manifest.get('package')=='cn.focusuniverse.offline'
assert manifest.get('{http://schemas.android.com/apk/res/android}versionName')=='1.50'
assert manifest.get('{http://schemas.android.com/apk/res/android}versionCode')=='7'
apk=OUT/'专注力小宇宙-1.50.apk'
html_bytes=(HERE/'assets/index.html').read_bytes()
html=html_bytes.decode('utf-8')
with zipfile.ZipFile(apk) as z:
    assert z.read('assets/index.html')==html_bytes
    assert not any(n.endswith(('.jks','.p12','.keystore')) or 'signing-config' in n for n in z.namelist())
with zipfile.ZipFile(OUT/'专注力小宇宙-1.40.apk') as z:old=z.read('assets/index.html').decode('utf-8')
assert payload(html,'trainingData')==payload(old,'trainingData'),'Any of the 16 original task engines changed'
old_presentation=payload(old,'trainingPresentation');new_presentation=payload(html,'trainingPresentation')
assert all(new_presentation[k]==v for k,v in old_presentation.items())
assert payload(old,'digitAudio')==payload(html,'digitAudio')
unchanged=json.loads((HERE/'ui-baseline-150.json').read_text(encoding='utf-8'))
for name,sha in unchanged.items():assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==sha,name
for key in ['focus-universe-history-v1','focus-universe-settings-v1','focus-universe-ui-v1','focus-universe-arcade-v1','focus-universe-transaction-v1']:assert key in html
assert 'lobbyView' not in html and 'arcadeView' not in html
assert not re.search(r'<(?:script|link|img)[^>]+(?:src|href)=["\']https?://',html)
fingerprints={}
for version in ['1.0.0','1.0.1','1.1.0','1.2.0','1.30','1.40','1.50']:
    cert=command([JAVA,'-jar',BT/'lib/apksigner.jar','verify','--verbose','--print-certs',OUT/f'专注力小宇宙-{version}.apk'])
    assert 'Verified using v2 scheme (APK Signature Scheme v2): true' in cert
    fingerprints[version]=re.search(r'certificate SHA-256 digest: ([0-9a-f]+)',cert).group(1)
assert len(set(fingerprints.values()))==1
staging=Path.home()/'.cache/focus-android-build/FocusUniverse-1.50.apk'
assert staging.read_bytes()==apk.read_bytes()
badging=command([BT/'aapt.exe','dump','badging',staging])
assert "name='cn.focusuniverse.offline' versionCode='7' versionName='1.50'" in badging
permissions=command([BT/'aapt.exe','dump','permissions',staging])
assert 'uses-permission' not in permissions
command([BT/'zipalign.exe','-c','-p','4',staging])
result={'version':'1.50','versionCode':7,'package':manifest.get('package'),'apk_bytes':apk.stat().st_size,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'html_sha256':hashlib.sha256(html_bytes).hexdigest(),'all_16_module_sources_exactly_match_1_40':True,'original_training_presentation_css_js_unchanged':True,'all_rule_timing_audio_storage_sources_unchanged':True,'digit_audio_unchanged':True,'published_web_and_old_apks_unchanged':True,'same_signing_certificate_as':list(fingerprints)[:-1],'certificate_sha256':fingerprints['1.50'],'apk_signature_verified':True,'zipalign_verified':True,'network_permission':False,'real_device_upgrade_tested':False}
(OUT/'安装包验收-1.50.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
