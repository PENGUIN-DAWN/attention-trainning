"""Build a signed offline APK using official Android tools; no Gradle or remote build service."""
from pathlib import Path
import argparse
import csv
import hashlib
import json
import os
import secrets
import shutil
import subprocess
import urllib.request
import zipfile
import xml.etree.ElementTree as ET
from prepare_assets import prepare
from tooling import paths
from tooling.project import registry

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
PACKAGES = [
    ('build-tools_r35_windows.zip', 'af059bb67cf7786f45ee0db85e2d24985df1b4b6'),
    ('platform-35_r02.zip', '0bb560a90a7a2cbd0dd8348224d518b638fe7949'),
]

def run(args, env=None):
    subprocess.run([str(a) for a in args], check=True, env=env)

def main():
    manifest = ET.parse(HERE / 'AndroidManifest.xml').getroot()
    version = manifest.get('{http://schemas.android.com/apk/res/android}versionName')
    version_code = int(manifest.get('{http://schemas.android.com/apk/res/android}versionCode'))
    parser = argparse.ArgumentParser()
    parser.add_argument('--java-home')
    parser.add_argument('--tools', type=Path, default=paths.android_root(ROOT / '.android-tools'))
    args = parser.parse_args()
    java_home = paths.java_home(args.java_home)
    if not (java_home / 'bin' / 'javac.exe').is_file():
        raise SystemExit('A JDK 17+ is required. Set JAVA_HOME or pass --java-home.')
    signing_dir = Path(os.environ.get('FOCUS_SIGNING_DIR', Path.home() / '.codex/app-signing/focus-universe')).resolve()
    if signing_dir.is_relative_to(ROOT.resolve()):
        raise SystemExit('Keep the private signing directory outside the source repository.')
    if version_code > 1 and not all((signing_dir / name).is_file() for name in ['signing-config.json', 'focus-universe.p12']):
        raise SystemExit('Original signing files are required for updates; restore them outside the repository or set FOCUS_SIGNING_DIR.')
    tools = args.tools.resolve(); tools.mkdir(parents=True, exist_ok=True)
    for name, checksum in PACKAGES:
        existing_tools, existing_jar = paths.android_paths(tools)
        marker = existing_tools / 'aapt2.exe' if name.startswith('build') else existing_jar
        if marker.exists(): continue
        archive = tools / name
        if not archive.exists():
            print('Downloading official SDK package:', name, flush=True)
            urllib.request.urlretrieve('https://dl.google.com/android/repository/' + name, archive)
        if hashlib.sha1(archive.read_bytes()).hexdigest() != checksum:
            raise SystemExit('SDK checksum mismatch: ' + name)
        with zipfile.ZipFile(archive) as z: z.extractall(tools)
    bt, android_jar = paths.android_paths(tools)
    # aapt2/zipalign on Windows need an ASCII staging path for projects with Chinese names.
    build = Path.home() / '.cache/focus-android-build'; build.mkdir(parents=True, exist_ok=True)
    classes = build / 'classes'; classes.mkdir(exist_ok=True)
    dex = build / 'dex'; dex.mkdir(exist_ok=True)
    prepare()
    shutil.copytree(HERE / 'res', build / 'res', dirs_exist_ok=True)
    shutil.copytree(HERE / 'assets', build / 'assets', dirs_exist_ok=True)
    shutil.copy2(HERE / 'AndroidManifest.xml', build / 'AndroidManifest.xml')
    shutil.copy2(android_jar, build / 'android.jar')
    env = dict(os.environ, JAVA_HOME=str(java_home))
    run([java_home / 'bin/javac.exe', '--release', '8', '-encoding', 'UTF-8', '-classpath', android_jar, '-d', classes, *HERE.glob('src/**/*.java')], env)
    class_jar = build / 'classes.jar'
    with zipfile.ZipFile(class_jar, 'w') as z:
        for p in classes.rglob('*.class'): z.write(p, p.relative_to(classes).as_posix())
    run([java_home / 'bin/java.exe', '-cp', bt / 'lib/d8.jar', 'com.android.tools.r8.D8', '--release', '--min-api', '26', '--lib', android_jar, '--output', dex, class_jar], env)
    compiled = build / 'resources.zip'
    run([bt / 'aapt2.exe', 'compile', '--dir', build / 'res', '-o', compiled], env)
    unsigned = build / 'unsigned.apk'
    run([bt / 'aapt2.exe', 'link', '-o', unsigned, '-I', build / 'android.jar', '--manifest', build / 'AndroidManifest.xml', '-R', compiled, '-A', build / 'assets', '--auto-add-overlay'], env)
    with zipfile.ZipFile(unsigned, 'a', zipfile.ZIP_DEFLATED) as z: z.write(dex / 'classes.dex', 'classes.dex')
    aligned = build / 'aligned.apk'
    run([bt / 'zipalign.exe', '-f', '-p', '4', unsigned, aligned], env)

    # Keep the key OUTSIDE the project and all user-facing archives. Reuse it for every update.
    signing_dir.mkdir(parents=True, exist_ok=True)
    config_file = signing_dir / 'signing-config.json'
    keystore = signing_dir / 'focus-universe.p12'
    if version_code > 1 and (not config_file.exists() or not keystore.exists()):
        raise SystemExit('The original signing key/config is required for updates. Restore the private signing backup; do not create a new update identity.')
    if config_file.exists(): config = json.loads(config_file.read_text(encoding='utf-8'))
    else:
        config = {'alias':'focus-universe','password':secrets.token_urlsafe(32)}
        config_file.write_text(json.dumps(config), encoding='utf-8')
    env['FOCUS_SIGNING_PASSWORD'] = config['password']
    if not keystore.exists():
        run([java_home / 'bin/keytool.exe', '-genkeypair', '-keystore', keystore, '-storetype', 'PKCS12', '-alias', config['alias'], '-keyalg', 'RSA', '-keysize', '3072', '-validity', '10000', '-dname', 'CN=Focus Universe Offline,OU=Personal,O=Personal,C=CN', '-storepass:env', 'FOCUS_SIGNING_PASSWORD', '-keypass:env', 'FOCUS_SIGNING_PASSWORD'], env)
    # Current owner and SYSTEM only. Credential contents are never printed.
    identity = subprocess.check_output(['whoami','/user','/fo','csv','/nh']).decode(errors='replace').strip()
    sid = '*' + next(csv.reader([identity]))[1]
    run(['icacls', signing_dir, '/inheritance:r', '/grant:r', sid+':(OI)(CI)F', '*S-1-5-18:(OI)(CI)F'], env)
    for private in [config_file,keystore]: run(['icacls',private,'/inheritance:r','/grant:r',sid+':F','*S-1-5-18:F'],env)
    output = ROOT / '安卓手机版'; output.mkdir(exist_ok=True)
    apk = build / ('FocusUniverse-' + version + '.apk')
    run([java_home / 'bin/java.exe', '-jar', bt / 'lib/apksigner.jar', 'sign', '--ks', keystore, '--ks-key-alias', config['alias'], '--ks-pass', 'env:FOCUS_SIGNING_PASSWORD', '--key-pass', 'env:FOCUS_SIGNING_PASSWORD', '--out', apk, aligned], env)
    run([java_home / 'bin/java.exe', '-jar', bt / 'lib/apksigner.jar', 'verify', '--verbose', '--print-certs', apk], env)
    run([bt / 'zipalign.exe', '-c', '-p', '4', apk], env)
    delivered = output / ('专注力小宇宙-' + version + '.apk')
    shutil.copy2(apk, delivered)
    info = {'app':'专注力小宇宙','version':version,'versionCode':version_code,'package':'cn.focusuniverse.offline','min_android':'8.0','target_sdk':35,'apk_bytes':apk.stat().st_size,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'network_permission':False,'training_modules':len(registry()),'product_baseline':'1.50','entertainment_entry':False,'backup_version':4,'offline_digit_audio':'zh-huihui-1'}
    (output / '版本与校验.json').write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding='utf-8')
    print('Built:', delivered, '\nBytes:', info['apk_bytes'], '\nSHA256:', info['sha256'], flush=True)

if __name__ == '__main__': main()
