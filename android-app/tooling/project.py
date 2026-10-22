"""Shared metadata; AndroidManifest.xml is the only release-version source."""
from pathlib import Path
import json
import re
import xml.etree.ElementTree as ET

APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent
OUT = ROOT / '安卓手机版'
BASELINE_VERSION = '1.50'


def metadata():
    manifest = ET.parse(APP / 'AndroidManifest.xml').getroot()
    ns = '{http://schemas.android.com/apk/res/android}'
    return {'version': manifest.get(ns + 'versionName'),
            'versionCode': int(manifest.get(ns + 'versionCode')),
            'package': manifest.get('package')}


def registry():
    items = json.loads((APP / 'config/trainings.json').read_text(encoding='utf-8'))
    ids, keys = set(), set()
    for item in items:
        number, key = item['id'], item['key']
        if not isinstance(key, str):
            raise ValueError('Training key must be a string')
        if type(number) is not int or not 0 < number <= 9007199254740991 or number in ids or key in keys:
            raise ValueError('Training IDs and keys must be positive and unique')
        if item['engine'] not in {'legacy', 'tool', 'advanced'}:
            raise ValueError('Unregistered engine: ' + item['engine'])
        for required in ['title', 'short', 'rule', 'icon', 'tint', 'example', 'settings']:
            if required not in item:
                raise ValueError(f'{key}: missing {required}')
        if not isinstance(key, str) or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', key):
            raise ValueError('Training key must be a stable lowercase slug')
        if not all(isinstance(item[field], str) and item[field] for field in ['title', 'short', 'rule', 'icon']):
            raise ValueError(f'{key}: text fields must be nonempty strings')
        if not isinstance(item['settings'], dict) or not all(value is None or isinstance(value, list) and all(isinstance(v, str) for v in value) for value in item['settings'].values()):
            raise ValueError(f'{key}: settings must map names to string enums or the numeric range marker')
        if not isinstance(item['example'], dict) or not all(isinstance(item['example'].get(name), str) for name in ['visual', 'copy']):
            raise ValueError(f'{key}: example visual/copy must be strings')
        ids.add(number)
        keys.add(key)
    if not items:
        raise ValueError('Training registry cannot be empty')
    return items
