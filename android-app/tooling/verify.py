"""APK verification shared by the command line and the release pipeline."""
import hashlib
import json
import re
import subprocess
import zipfile
from pathlib import Path
from tooling.project import APP, ROOT, OUT, metadata, registry, BASELINE_VERSION
from tooling import paths


def command(args):
    return subprocess.run(list(map(str, args)), check=True, capture_output=True).stdout.decode('utf-8', errors='replace')


def payload(page, name):
    match = re.search(r'<script type="application/json" id="' + name + r'">(.*?)</script>', page, re.S)
    if not match:
        raise AssertionError('Missing embedded payload: ' + name)
    return json.loads(match.group(1))


def verify():
    meta = metadata()
    version, code = meta['version'], meta['versionCode']
    java = paths.java_home() / 'bin/java.exe'
    tools, _ = paths.android_paths(paths.android_root(ROOT / '.android-tools'))
    apk = OUT / f'专注力小宇宙-{version}.apk'
    page_bytes = (APP / 'assets/index.html').read_bytes()
    page = page_bytes.decode('utf-8')
    with zipfile.ZipFile(apk) as archive:
        assert archive.read('assets/index.html') == page_bytes
        assert not any(n.endswith(('.jks', '.p12', '.keystore')) or 'signing-config' in n for n in archive.namelist())
    with zipfile.ZipFile(OUT / f'专注力小宇宙-{BASELINE_VERSION}.apk') as archive:
        previous = archive.read('assets/index.html').decode('utf-8')
    # Training behavior and core presentation are a compatibility contract for this refactor.
    assert payload(page, 'trainingData') == payload(previous, 'trainingData')
    assert len(payload(page, 'trainingData')) == len(registry())
    before, after = payload(previous, 'trainingPresentation'), payload(page, 'trainingPresentation')
    assert before['css'] == after['css'] and before['js'] == after['js']
    assert payload(page, 'digitAudio') == payload(previous, 'digitAudio')
    baseline = json.loads((APP / 'ui-baseline-150.json').read_text(encoding='utf-8'))
    for name, expected in baseline.items():
        assert hashlib.sha256((ROOT / name.replace('\\', '/')).read_bytes()).hexdigest() == expected, name

    fingerprints = {}
    candidates = sorted(OUT.glob('专注力小宇宙-*.apk'))
    for candidate in candidates:
        certificate = command([java, '-jar', tools / 'lib/apksigner.jar', 'verify', '--verbose', '--print-certs', candidate])
        assert 'Verified using v2 scheme (APK Signature Scheme v2): true' in certificate
        fingerprints[candidate.stem] = re.search(r'certificate SHA-256 digest: ([0-9a-f]+)', certificate).group(1)
    assert len(set(fingerprints.values())) == 1
    staging = Path.home() / f'.cache/focus-android-build/FocusUniverse-{version}.apk'
    assert staging.read_bytes() == apk.read_bytes()
    badging = command([tools / 'aapt.exe', 'dump', 'badging', staging])
    assert f"name='{meta['package']}' versionCode='{code}' versionName='{version}'" in badging
    permissions = command([tools / 'aapt.exe', 'dump', 'permissions', staging])
    assert 'uses-permission' not in permissions
    command([tools / 'zipalign.exe', '-c', '-p', '4', staging])
    assert code > 7, 'Update versionCode must exceed the 1.50 baseline'
    result = {
        **meta, 'apk_bytes': apk.stat().st_size,
        'sha256': hashlib.sha256(apk.read_bytes()).hexdigest(),
        'html_sha256': hashlib.sha256(page_bytes).hexdigest(),
        'baseline_version': BASELINE_VERSION,
        'all_training_engines_equal_baseline': True,
        'core_presentation_and_audio_equal_baseline': True,
        'legacy_sources_and_apks_unchanged': True,
        'same_signing_certificate_count': len(fingerprints),
        'certificate_sha256': next(iter(fingerprints.values())),
        'apk_signature_verified': True, 'zipalign_verified': True,
        'network_permission': False, 'real_device_upgrade_tested': False,
    }
    (OUT / f'安装包验收-{version}.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result
