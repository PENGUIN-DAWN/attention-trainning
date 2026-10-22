"""Build offline Android assets from an explicit template and training registry."""
import json
import re
from descending import extend as descending_source
from tooling.project import APP, ROOT, metadata, registry

APP_SCRIPTS = [
    'storage.js', 'arcade-rules.js', 'arcade-store.js',
    'tool-rules.js', 'advanced-rules.js',
    'app/model-types.js', 'app/registry.js', 'app/state.js', 'app/scores.js',
    'app/ui-core.js', 'app/icons.js', 'app/visuals.js', 'app/directory.js', 'app/motion.js',
    'app/navigation.js', 'app/bridge.js', 'app/platform.js',
    'app/records.js', 'app/backup-plan.js', 'app/backup.js', 'app/guides.js',
    'app/preferences.js', 'app/start.js',
]


def read(name):
    return (APP / name).read_text(encoding='utf-8')


def join(names):
    return '\n'.join(read(name) for name in names)


def inject(source, styles, scripts=''):
    """Legacy adapter: only explicit, unique closing head/body boundaries."""
    for marker in ['</head>', '</body>']:
        if source.count(marker) != 1:
            raise ValueError('Invalid training document boundary: ' + marker)
    source = source.replace('</head>', '<style>' + styles + '</style></head>', 1)
    if scripts:
        source = source.replace('</body>', '<script>' + scripts + '</script></body>', 1)
    return source


def json_script(name, data):
    safe = json.dumps(data, ensure_ascii=False).replace('<', '\\u003c')
    return f'<script type="application/json" id="{name}">{safe}</script>'


def prepare():
    items = registry()
    original = (ROOT / 'index.html').read_text(encoding='utf-8')
    match = re.search(r'<script type="application/json" id="trainingData">(.*?)</script>', original, re.S)
    if not match:
        raise ValueError('Legacy trainingData is missing')
    legacy = {item['id']: item for item in json.loads(match.group(1))}
    sources = {
        'tool': inject(read('tool-page.html'), join(['tool.css', 'tool-motion.css']),
                       join(['tool-rules.js', 'tool-motion.js', 'tool-audio.js', 'tool-ui.js'])),
        'advanced': inject(read('advanced-page.html'), read('advanced.css'),
                           join(['advanced-rules.js', 'advanced-clock.js', 'advanced-audio.js', 'advanced-ui.js'])),
    }
    modules = []
    for item in items:
        if item['engine'] == 'legacy':
            module = dict(legacy[item['id']])
            if module['filename'] != item['filename']:
                raise ValueError('Legacy filename does not match registry')
            if item['id'] == 1:
                module['source'] = descending_source(module['source'])
        else:
            module = {'id': item['id'], 'source': sources[item['engine']]}
        for field in ['title', 'short', 'accent']:
            module[field] = item[field]
        modules.append(module)

    presentation = {
        'css': read('training.css'), 'js': read('training.js'),
        'chrome': join(['styles/tokens.css', 'styles/training-chrome.css', 'styles/dialog-motion.css']),
        'chromeStatus': read('chrome-status.js'),
        'chromeUI': join(['app/icons.js', 'chrome-ui.js']),
    }
    payloads = [('trainingRegistry', items), ('trainingData', modules),
                ('trainingPresentation', presentation), ('digitAudio', json.loads(read('audio/digits.json')))]
    slots = {
        '__APP_STYLES__': join(['styles/tokens.css', 'styles/shell.css', 'styles/dialog-motion.css']),
        '__DATA_SCRIPTS__': '\n'.join(json_script(name, value) for name, value in payloads),
        '__APP_SCRIPTS__': join(APP_SCRIPTS).replace('__APP_VERSION__', metadata()['version']),
        '__TRAINING_COUNT__': str(len(items)),
    }
    page = read('templates/app.html')
    for marker, value in slots.items():
        if marker not in page:
            raise ValueError('App template is missing slot: ' + marker)
        page = page.replace(marker, value)
    target = APP / 'assets/index.html'
    target.parent.mkdir(exist_ok=True)
    target.write_text(page, encoding='utf-8', newline='\n')
    return target


if __name__ == '__main__':
    print(prepare())
