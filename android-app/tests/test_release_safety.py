"""Exercise release failure boundaries without using a signing key or real APK."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from tooling import provenance


class ReleaseSafety(unittest.TestCase):
    def test_existing_artifact_and_nonincreasing_code_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory)
            meta = {'version': '1.64', 'versionCode': 13}
            (out / '安装包验收-1.63.json').write_text(json.dumps({'versionCode': 12}), encoding='utf-8')
            provenance.assert_new_release(meta, out)
            with self.assertRaises(RuntimeError):
                provenance.assert_new_release({**meta, 'versionCode': 12}, out)
            apk = out / '专注力小宇宙-1.64.apk'
            apk.write_bytes(b'preserved release')
            with self.assertRaises(RuntimeError):
                provenance.assert_new_release(meta, out)
            self.assertEqual(apk.read_bytes(), b'preserved release')

    def test_native_source_change_invalidates_receipt_but_generated_page_does_not(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            app = root / 'android-app'
            native = app / 'src/MainActivity.java'
            native.parent.mkdir(parents=True)
            native.write_text('class MainActivity {}', encoding='utf-8')
            page = app / 'assets/index.html'
            page.parent.mkdir()
            page.write_text('first page', encoding='utf-8')
            with patch.object(provenance, 'ROOT', root), patch.object(provenance, 'APP', app):
                expected = provenance.input_hashes()
                self.assertIn('android-app/src/MainActivity.java', expected)
                page.write_text('regenerated page', encoding='utf-8')
                provenance.validate_inputs(expected)
                native.write_text('class MainActivity { int changed; }', encoding='utf-8')
                with self.assertRaises(RuntimeError):
                    provenance.validate_inputs(expected)

    def test_stale_classes_removed_only_inside_selected_staging(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            build = root / 'staging'
            classes = build / 'classes'
            classes.mkdir(parents=True)
            (classes / 'Deleted.class').write_bytes(b'old class')
            outside = root / 'keep.txt'
            outside.write_text('keep', encoding='utf-8')
            provenance.reset_staging(build)
            self.assertFalse(classes.exists())
            self.assertEqual(outside.read_text(encoding='utf-8'), 'keep')
        with self.assertRaises(RuntimeError):
            provenance.reset_staging(provenance.APP)

    def test_release_lock_rejects_second_writer_and_cleans_after_failure(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(provenance.Path, 'home', return_value=Path(directory)):
            with self.assertRaisesRegex(ValueError, 'test failure'):
                with provenance.release_lock():
                    with self.assertRaises(RuntimeError):
                        with provenance.release_lock():
                            self.fail('second release acquired the lock')
                    raise ValueError('test failure')
            self.assertFalse((Path(directory) / '.cache/focus-universe-release.lock').exists())
