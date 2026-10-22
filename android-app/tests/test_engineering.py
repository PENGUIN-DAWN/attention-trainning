"""Build/configuration contracts; tests use temporary config, not user data."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

APP = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(APP))
from tooling import project
import prepare_assets


class EngineeringContracts(unittest.TestCase):
    def test_registry_preserves_stable_identity(self):
        items = project.registry()
        self.assertEqual([r['id'] for r in items], list(range(1, 17)))
        self.assertEqual(items[6]['key'], 'multi-object-tracking')
        self.assertEqual(items[15]['key'], 'serial-dual-target')

    def test_duplicate_ids_or_keys_rejected(self):
        for field in ['id', 'key']:
            items = project.registry()
            items[1][field] = items[0][field]
            with tempfile.TemporaryDirectory(prefix='focus-config-test-') as directory:
                root = Path(directory)
                (root / 'config').mkdir()
                (root / 'config/trainings.json').write_text(json.dumps(items), encoding='utf-8')
                with patch.object(project, 'APP', root), self.assertRaises(ValueError):
                    project.registry()

    def test_explicit_template_and_no_old_hub_dependency(self):
        actual = Path.read_text
        reads = []

        def traced(path, *args, **kwargs):
            reads.append(path)
            return actual(path, *args, **kwargs)

        with patch.object(Path, 'read_text', traced):
            result = prepare_assets.prepare()
        self.assertTrue(result.is_file())
        self.assertIn(APP / 'templates/app.html', reads)
        self.assertNotIn(APP.parent / '_hub/hub.template.html', reads)
        self.assertNotIn(APP / 'experience.js', reads)
        self.assertNotIn(APP / 'dark-shell.css', reads)

    def test_missing_training_document_boundary_fails(self):
        with self.assertRaises(ValueError):
            prepare_assets.inject('<html><body>missing head</body></html>', '')

    def test_version_comes_from_manifest(self):
        meta = project.metadata()
        self.assertGreater(meta['versionCode'], 7)
        self.assertEqual(meta['package'], 'cn.focusuniverse.offline')


if __name__ == '__main__':
    unittest.main()
