"""Discover developer tools without embedding the original developer's username."""
from pathlib import Path
import hashlib
import os
import shutil


def build_dir():
    """Allow concurrent worktrees to use independent native staging directories."""
    explicit = os.environ.get('FOCUS_BUILD_DIR')
    identity = hashlib.sha256(str(Path(__file__).resolve().parents[2]).encode()).hexdigest()[:12]
    return Path(explicit).expanduser().resolve() if explicit else Path.home() / '.cache/focus-android-build' / identity


def node():
    explicit = os.environ.get('FOCUS_NODE')
    candidates = [Path(explicit)] if explicit else []
    found = shutil.which('node')
    if found:
        candidates.append(Path(found))
    candidates += list((Path.home() / '.cache/codex-runtimes').glob('*/dependencies/node/bin/node.exe'))
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    raise RuntimeError('Node.js not found. Add node to PATH or set FOCUS_NODE.')


def java_home(explicit=None):
    requested = explicit or os.environ.get('JAVA_HOME')
    if requested:
        candidate = Path(requested)
        if not (candidate / 'bin/javac.exe').is_file():
            raise RuntimeError('JAVA_HOME/--java-home must point to a Windows JDK.')
        return candidate
    found = shutil.which('javac')
    if found:
        return Path(found).resolve().parent.parent
    candidates = []
    for base in [os.environ.get('ProgramFiles'), os.environ.get('ProgramFiles(x86)')]:
        if base:
            candidates += sorted(Path(base).glob('JetBrains/*/jbr'), reverse=True)
            candidates += sorted(Path(base).glob('Java/jdk-*'), reverse=True)
    for candidate in candidates:
        if (candidate / 'bin/javac.exe').is_file():
            return candidate
    raise RuntimeError('JDK 17+ not found. Set JAVA_HOME or use --java-home.')


def android_root(fallback):
    return Path(os.environ.get('FOCUS_ANDROID_TOOLS') or
                os.environ.get('ANDROID_SDK_ROOT') or
                os.environ.get('ANDROID_HOME') or fallback).resolve()


def android_paths(root):
    root = Path(root)
    candidates = sorted((root / 'build-tools').glob('35.*'), reverse=True)
    tools = next((p for p in candidates if (p / 'aapt2.exe').is_file()), root / 'android-15')
    standard = root / 'platforms/android-35/android.jar'
    jar = standard if standard.is_file() else root / 'android-35/android.jar'
    return tools, jar
