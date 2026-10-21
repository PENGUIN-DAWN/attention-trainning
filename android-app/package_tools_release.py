"""Package the verified functional 1.30 release. Exclude all credentials and tools."""
from pathlib import Path
import hashlib
import json
import shutil
import zipfile
import html

HERE=Path(__file__).resolve().parent
OUT=HERE.parent/'安卓手机版'
VERSION='1.30'
sha=hashlib.sha256((HERE/'assets/index.html').read_bytes()).hexdigest()
reports={'浏览器验收':9,'新增训练验收':6,'工具边界验收':6,'完成页补充验收':2}
for name,count in reports.items():
    report=json.loads((OUT/f'{name}-{VERSION}.json').read_text(encoding='utf-8'))
    assert not report.get('errors'),name
    assert len(report['checks'])==count,name
    assert report['html_sha256']==sha,name+' tested a different HTML file'
verification=json.loads((OUT/f'安装包验收-{VERSION}.json').read_text(encoding='utf-8'))
apk=OUT/f'专注力小宇宙-{VERSION}.apk'
assert verification['apk_signature_verified'] and verification['zipalign_verified'] and verification['packaged_html_matches_tested_file']
assert verification['sha256']==hashlib.sha256(apk.read_bytes()).hexdigest()
with zipfile.ZipFile(apk) as z: assert hashlib.sha256(z.read('assets/index.html')).hexdigest()==sha
names=['十项目录','倒序数字搜索','重复数字搜寻','相似字符找异类','相似字符80字','物品观察阶段','消失的物品','追踪标记阶段','多目标追踪','新增训练成绩','训练记录','训练页']
images=[OUT/f'{name}-{VERSION}.png' for name in names]
assert all(p.exists() for p in images)
gallery=OUT/f'页面预览-{VERSION}.html'
cards=''.join(f'<figure><a href="{html.escape(p.name)}"><img src="{html.escape(p.name)}" alt="{name}" loading="lazy"></a><figcaption>{name}</figcaption></figure>' for name,p in zip(names,images))
gallery.write_text('''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>专注力小宇宙 1.30 页面预览</title><style>body{margin:24px;background:#f6f3fa;color:#393047;font-family:system-ui,sans-serif}h1{font-size:25px}p{line-height:1.8;color:#6e607b}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px}figure{margin:0;background:#fff;border-radius:20px;padding:12px;align-self:start}img{width:100%;height:560px;object-fit:contain;object-position:top;display:block}figcaption{padding:14px;text-align:center}a{display:block}</style><h1>专注力小宇宙 · 1.30</h1><p>以 1.1.0 为产品基线的十项训练工具版。浏览器手机尺寸模拟；点击图片可查看原图。成绩来自自动化测试，并非真实用户成绩。与本文件同目录保存全部图片，可离线查看。</p><main>'''+cards+'</main></html>',encoding='utf-8')
shutil.copy2(HERE/'工具版开发说明-1.30.md',OUT/'工具版开发说明-1.30.md')
generic=OUT/'安装与使用说明.md'
prior=OUT/'安装与使用说明-1.2.0.md'
if generic.exists() and not prior.exists(): shutil.copy2(generic,prior)
shutil.copy2(OUT/'安装与使用说明-1.30.md',generic)
files=[apk,gallery,OUT/f'更新说明-{VERSION}.md',OUT/f'验证记录-{VERSION}.md',OUT/f'安装与使用说明-{VERSION}.md',OUT/'工具版开发说明-1.30.md',OUT/'版本与校验.json',OUT/f'安装包验收-{VERSION}.json']
files += [OUT/f'{name}-{VERSION}.json' for name in reports]
files += images
archive=OUT/f'专注力小宇宙-{VERSION}-安卓自用版.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for p in files:z.write(p,p.name)
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert not any(n.endswith(('.p12','.keystore','.jks')) or 'signing-config' in n for n in z.namelist())
shutil.copy2(archive,OUT/'专注力小宇宙-安卓自用版.zip')
print(json.dumps({'version':VERSION,'files':len(files),'archive':str(archive),'bytes':archive.stat().st_size,'apk_sha256':verification['sha256'],'tested_html_sha256':sha},ensure_ascii=False,indent=2))
