"""Release identity, source provenance and safe native staging for this offline app."""
from contextlib import contextmanager
from pathlib import Path
import hashlib
import json
import os
import platform
import shutil
import subprocess
import sys
from tooling.project import APP, ROOT, OUT, metadata
from tooling import paths


def input_hashes():
    files = [ROOT / 'index.html', ROOT / 'package.json', ROOT / 'package-lock.json']
    extensions = {'.py', '.js', '.cjs', '.java', '.json', '.html', '.css', '.xml', '.png', '.jpg', '.webp'}
    for path in APP.rglob('*'):
        relative = path.relative_to(APP)
        if any(part in {'archive', 'assets', 'build', '__pycache__', 'node_modules'} for part in relative.parts):
            continue
        if path.is_file() and path.suffix.lower() in extensions:
            files.append(path)
    return {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(set(files)) if p.is_file()}


def validate_inputs(expected):
    if expected != input_hashes():
        raise RuntimeError('Build inputs changed since validation; rerun the complete tests and build.')


def context():
    commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT).decode().strip()
    changed = subprocess.check_output(['git', 'diff', 'HEAD', '--name-only', '--', 'android-app',
                                       'index.html', 'package.json', 'package-lock.json'], cwd=ROOT).decode('utf-8').splitlines()
    node = subprocess.check_output([str(paths.node()), '--version']).decode().strip()
    java = subprocess.run([str(paths.java_home() / 'bin/java.exe'), '-version'],
                          capture_output=True, check=True)
    return {'source_commit': commit, 'source_changes': changed,
            'tools': {'python': sys.version.split()[0], 'node': node,
                      'java': (java.stderr or java.stdout).decode(errors='replace').splitlines()[0],
                      'platform': platform.system() + ' ' + platform.release()}}


def assert_new_release(meta=None, output=None):
    meta, output = meta or metadata(), Path(output) if output is not None else OUT
    version = meta['version']
    reserved = [output / f'专注力小宇宙-{version}.apk', output / f'专注力小宇宙-{version}-安卓自用版.zip',
                output / f'交付校验-{version}.json', output / f'安装包验收-{version}.json']
    if any(p.exists() for p in reserved):
        raise RuntimeError('Release identity already has artifacts; keep them and use a new version/versionCode.')
    previous = []
    for report in output.glob('安装包验收-*.json'):
        try:
            previous.append(int(json.loads(report.read_text(encoding='utf-8')).get('versionCode', 0)))
        except (ValueError, TypeError) as error:
            raise RuntimeError('Invalid previous APK metadata: ' + report.name) from error
    if meta['versionCode'] <= max(previous, default=0):
        raise RuntimeError('versionCode must exceed all retained APK verification reports.')


@contextmanager
def release_lock():
    lock = Path.home() / '.cache/focus-universe-release.lock'
    lock.parent.mkdir(parents=True, exist_ok=True)
    try:
        handle = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError as error:
        raise RuntimeError('Another release owns the lock. Check that process before removing a stale lock.') from error
    try:
        with os.fdopen(handle, 'w', encoding='utf-8') as stream:
            json.dump({'pid': os.getpid(), 'workspace': str(ROOT)}, stream)
        yield
    finally:
        lock.unlink(missing_ok=True)


def reset_staging(build):
    build = Path(build).resolve()
    if ROOT.resolve().is_relative_to(build) or build.is_relative_to(APP.resolve()):
        raise RuntimeError('Native staging must not contain the repository or be inside app sources.')
    for name in ('classes', 'dex', 'res', 'assets'):
        target = build / name
        if target.resolve().parent != build or target.is_symlink():
            raise RuntimeError('Refusing to clean a staging path outside the selected build directory.')
        if target.exists():
            if not target.is_dir():
                raise RuntimeError('Expected a staging directory: ' + name)
            shutil.rmtree(target)
