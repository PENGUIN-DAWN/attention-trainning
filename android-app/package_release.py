"""Package only verified, user-facing release artifacts; never include keys or build tools."""
from pathlib import Path
import hashlib
import json
import shutil
import zipfile

HERE=Path(__file__).resolve().parent
OUT=HERE.parent/'安卓手机版'
VERSION='1.2.0'
html_sha=hashlib.sha256((HERE/'assets/index.html').read_bytes()).hexdigest()
reports=['浏览器验收','娱乐验收','边界补充验收','完成页补充验收','安装包验收']
for name in reports:
    report=json.loads((OUT/f'{name}-{VERSION}.json').read_text(encoding='utf-8'))
    assert not report.get('errors'),name
    if 'checks' in report: assert report['checks'],name
    if 'html_sha256' in report: assert report['html_sha256']==html_sha,name+' used different HTML'
verification=json.loads((OUT/f'安装包验收-{VERSION}.json').read_text(encoding='utf-8'))
assert verification['apk_signature_verified'] and verification['packaged_html_matches_tested_file']
apk=OUT/f'专注力小宇宙-{VERSION}.apk'
assert hashlib.sha256(apk.read_bytes()).hexdigest()==verification['sha256']
with zipfile.ZipFile(apk) as z: assert hashlib.sha256(z.read('assets/index.html')).hexdigest()==html_sha
files=[apk,OUT/f'更新说明-{VERSION}.md',OUT/f'验证记录-{VERSION}.md',OUT/'安装与使用说明.md',OUT/'版本与校验.json']
files += [OUT/f'{name}-{VERSION}.json' for name in reports]
files += sorted(OUT.glob(f'*-{VERSION}.png'))
archive=OUT/f'专注力小宇宙-{VERSION}-安卓自用版.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for file in files: z.write(file,file.name)
    z.write(HERE/'README.md','开发结构说明.md')
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert not any(n.endswith(('.p12','.jks','.keystore')) or 'signing-config' in n for n in z.namelist())
shutil.copy2(archive,OUT/'专注力小宇宙-安卓自用版.zip')
print('Packaged:',archive,'\nFiles:',len(files)+1,'\nBytes:',archive.stat().st_size,'\nAPK SHA256:',verification['sha256'])
