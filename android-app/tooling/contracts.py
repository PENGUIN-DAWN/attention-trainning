"""Keep the 1.50 snapshot immutable; validate explicitly reviewed 1.61 engine deltas."""
import hashlib
import json
from tooling.project import APP, ROOT


def verify_sources():
    historical = json.loads((APP / 'ui-baseline-150.json').read_text(encoding='utf-8'))
    motion = json.loads((APP / 'motion-baseline-161.json').read_text(encoding='utf-8'))
    assert set(motion['changedSources']) == {
        'android-app/tool-rules.js', 'android-app/tool-ui.js',
        'android-app/training.js', 'android-app/advanced-ui.js',
    }
    expected = dict(historical)
    for name, change in motion['changedSources'].items():
        assert historical[name] == change['previous_sha256'], name
        assert change['reason'], name
        expected[name] = change['sha256']
    expected.update(motion['addedSources'])
    for name, digest in expected.items():
        assert hashlib.sha256((ROOT / name.replace('\\', '/')).read_bytes()).hexdigest() == digest, name
    return motion
