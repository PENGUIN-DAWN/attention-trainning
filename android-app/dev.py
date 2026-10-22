"""One development entry point: doctor / prepare / test / build / verify / release."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import subprocess
import sys
import zipfile
from prepare_assets import prepare
from tooling.project import APP, ROOT, OUT, metadata, BASELINE_VERSION
from tooling import paths

SUITES = ['training', 'tools', 'tool-edges', 'completion', 'advanced', 'advanced-edges', 'stimulus', 'motion', 'tracking-presentation','tracking-quality', 'feedback']


def run(args):
    result = subprocess.run(list(map(str, args)), cwd=ROOT)
    if result.returncode:
        raise RuntimeError('Command failed: ' + ' '.join(map(str, args)))


def baseline_page():
    target = Path.home() / '.cache/focus-refactor150.html'
    target.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(OUT / f'专注力小宇宙-{BASELINE_VERSION}.apk') as archive:
        target.write_bytes(archive.read('assets/index.html'))
    with zipfile.ZipFile(OUT / '专注力小宇宙-1.61.apk') as archive:
        (target.parent / 'focus-motion161.html').write_bytes(archive.read('assets/index.html'))
    with zipfile.ZipFile(OUT / '专注力小宇宙-1.62.apk') as archive:
        (target.parent / 'focus-motion162.html').write_bytes(archive.read('assets/index.html'))


def test(suite='all', jobs=1):
    prepare()
    baseline_page()
    node = paths.node()
    if suite == 'all':
        (OUT / f"验收运行-{metadata()['version']}.json").unlink(missing_ok=True)
    run([sys.executable, '-X', 'utf8', APP / 'tests/run_unit.py'])
    run([node, APP / 'tests/contracts.cjs'])
    selected = SUITES if suite == 'all' else ([] if suite == 'unit' else [suite])
    with ThreadPoolExecutor(max_workers=jobs) as pool:
        results = [pool.submit(run, [node, APP / f'tests/{name}.cjs']) for name in selected if name not in {'ui', 'motion', 'tracking-presentation','tracking-quality', 'feedback'}]
        for result in results:
            result.result()
    # Performance checks run after other browsers finish, without concurrent test load.
    if suite in {'all', 'motion'}:
        run([node, APP / 'tests/motion.cjs'])
    if suite in {'all', 'tracking-presentation'}:
        run([node, APP / 'tests/tracking-presentation.cjs'])
    if suite in {'all', 'tracking-quality'}:
        run([node, APP / 'tests/tracking-quality.cjs'])
    if suite in {'all', 'feedback'}:
        run([node, APP / 'tests/feedback.cjs'])
    if suite in {'all', 'ui'}:
        run([node, APP / 'tests/ui.cjs'])
    if suite == 'all':
        from tooling.receipts import collect
        collect()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['doctor', 'prepare', 'test', 'build', 'verify', 'package', 'release'])
    parser.add_argument('--suite', choices=['all', 'unit', 'ui', *SUITES], default='all')
    parser.add_argument('--jobs', type=int, choices=range(1, 5), default=1)
    args = parser.parse_args()
    if args.command == 'doctor':
        print(json.dumps({**metadata(), 'node': str(paths.node()), 'java_home': str(paths.java_home()),
                          'android_root': str(paths.android_root(ROOT / '.android-tools'))}, ensure_ascii=False, indent=2))
        run([paths.node(), '-e', "const s=require('./android-app/tests/support.cjs');console.log('Playwright/browser:',s.browserExecutable||'bundled Chromium')"])
    elif args.command == 'prepare':
        print(prepare())
    elif args.command == 'test':
        test(args.suite, args.jobs)
    elif args.command == 'build':
        run([sys.executable, '-X', 'utf8', APP / 'build.py'])
    elif args.command == 'verify':
        from tooling.verify import verify
        verify()
    elif args.command == 'package':
        from tooling.release import package
        package()
    elif args.command == 'release':
        from tooling.provenance import assert_new_release, release_lock
        with release_lock():
            assert_new_release()
            test('all', args.jobs)
            run([sys.executable, '-X', 'utf8', APP / 'build.py'])
            from tooling.verify import verify
            verify()
            from tooling.release import package
            package()


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, FileNotFoundError) as error:
        raise SystemExit(str(error))
