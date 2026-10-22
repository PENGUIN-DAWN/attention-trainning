"""Bind complete successful test runs to page bytes, report bytes and test sources."""
from datetime import datetime, timezone
import hashlib
import json
from tooling.project import APP, OUT, metadata

REPORT_NAMES = [
    '构建配置单元验收', '工程契约验收', '浏览器验收', '新增训练验收',
    '工具边界验收', '完成页补充验收', '六项新增验收', '六项边界验收',
    '题面兼容验收', '界面与性能验收', '动态训练验收',
]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_hashes():
    files = sorted((APP / 'tests').glob('*.cjs')) + sorted((APP / 'tests').glob('*.py'))
    return {str(path.relative_to(APP)).replace('\\', '/'): digest(path) for path in files}


def collect():
    version = metadata()['version']
    page_sha = digest(APP / 'assets/index.html')
    reports, checks = {}, 0
    for name in REPORT_NAMES:
        path = OUT / f'{name}-{version}.json'
        result = json.loads(path.read_text(encoding='utf-8'))
        if result.get('errors') or result['html_sha256'] != page_sha:
            raise RuntimeError('Incomplete/failed/stale report: ' + name)
        reports[path.name] = digest(path)
        checks += len(result.get('checks', [])) + result.get('testsRun', 0)
    receipt = {
        **metadata(), 'complete_run': True,
        'finished_utc': datetime.now(timezone.utc).isoformat(),
        'html_sha256': page_sha, 'checks': checks,
        'reports': reports, 'test_sources': source_hashes(),
    }
    (OUT / f'验收运行-{version}.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2), encoding='utf-8')
    return receipt


def validate():
    version = metadata()['version']
    receipt = json.loads((OUT / f'验收运行-{version}.json').read_text(encoding='utf-8'))
    if not receipt.get('complete_run') or receipt['html_sha256'] != digest(APP / 'assets/index.html'):
        raise RuntimeError('Run the complete test suite for this page before packaging.')
    if receipt['test_sources'] != source_hashes():
        raise RuntimeError('Test sources changed since the complete run. Rerun tests.')
    for name, expected in receipt['reports'].items():
        if digest(OUT / name) != expected:
            raise RuntimeError('Report changed since the complete run: ' + name)
    return receipt
