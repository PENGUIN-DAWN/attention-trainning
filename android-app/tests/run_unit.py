"""Run Python contracts and persist their actual result for release verification."""
from pathlib import Path
import hashlib
import json
import sys
import unittest

APP = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(APP))
from tooling.project import metadata, OUT

suite = unittest.defaultTestLoader.discover(str(APP / 'tests'), pattern='test_*.py')
result = unittest.TextTestRunner(verbosity=1).run(suite)
report = {
    **metadata(), 'testsRun': result.testsRun,
    'errors': [text for _, text in [*result.errors, *result.failures]],
    'html_sha256': hashlib.sha256((APP / 'assets/index.html').read_bytes()).hexdigest(),
}
(OUT / f"构建配置单元验收-{report['version']}.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
raise SystemExit(0 if result.wasSuccessful() else 1)
