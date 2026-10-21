"""Release 1.40 only after all reports match the final bundled HTML."""
from pathlib import Path
import hashlib, html, json, shutil, zipfile

HERE=Path(__file__).resolve().parent
OUT=HERE.parent/'安卓手机版'
VERSION='1.40'
sha=hashlib.sha256((HERE/'assets/index.html').read_bytes()).hexdigest()
reports={'浏览器验收':9,'新增训练验收':6,'工具边界验收':6,'完成页补充验收':2,'六项新增验收':8,'六项边界验收':6}
for name,count in reports.items():
    r=json.loads((OUT/f'{name}-{VERSION}.json').read_text(encoding='utf-8'))
    assert not r.get('errors'),name
    assert len(r['checks'])==count,name
    assert r['html_sha256']==sha,name+' used different HTML'
verification=json.loads((OUT/f'安装包验收-{VERSION}.json').read_text(encoding='utf-8'))
apk=OUT/f'专注力小宇宙-{VERSION}.apk'
assert verification['apk_signature_verified'] and verification['zipalign_verified'] and verification['original_ten_modules_match_1_30_apk']
assert verification['sha256']==hashlib.sha256(apk.read_bytes()).hexdigest()
with zipfile.ZipFile(apk) as z:assert hashlib.sha256(z.read('assets/index.html')).hexdigest()==sha
audio=json.loads((OUT/f'音频素材校验-{VERSION}.json').read_text(encoding='utf-8'))
assert audio['all_nine_clips_valid_pcm'] and audio['same_sample_count']
names=['十六项目录','规则切换','呼吸聚焦','呼吸自报记录','中央与周边辨认','持续监测','双耳声道确认','双耳分听','串行双目标识别','新增训练记录','训练页']
images=[OUT/f'{name}-{VERSION}.png' for name in names]
assert all(p.is_file() for p in images)
gallery=OUT/f'页面预览-{VERSION}.html'
cards=''.join(f'<figure><a href="{html.escape(p.name)}"><img loading="lazy" src="{html.escape(p.name)}" alt="{name}"></a><figcaption>{name}</figcaption></figure>' for name,p in zip(names,images))
gallery.write_text('''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>专注力小宇宙 1.40 预览</title><style>body{font-family:system-ui,sans-serif;background:#f5f2f9;color:#3c3348;margin:24px}h1{font-size:26px}p{line-height:1.8;color:#6a5d77}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px}figure{margin:0;background:white;padding:12px;border-radius:20px;align-self:start}img{display:block;width:100%;height:540px;object-fit:contain;object-position:top}figcaption{padding:12px;text-align:center}a{color:inherit}</style><h1>专注力小宇宙 · 1.40</h1><p>十六项离线训练。预览来自隔离浏览器手机尺寸模拟，成绩是自动化测试数据；部分流程采用虚拟时钟。点击图片查看完整原图，与本文件同目录保存图片即可离线查看。</p><main>'''+cards+'''</main><p>可选耳机检查：<a href="双声道试听-1.40.wav">主动播放双声道试听</a>，顺序是仅左耳“一”、仅右耳“一”、随后左“三”与右“八”同时。请使用舒适音量。此文件不自动播放，不代表已经完成真实耳机验证。</p></html>''',encoding='utf-8')
shutil.copy2(HERE/'工具版开发说明-1.40.md',OUT/'工具版开发说明-1.40.md')
shutil.copy2(OUT/'安装与使用说明-1.40.md',OUT/'安装与使用说明.md')
files=[apk,gallery,OUT/f'更新说明-{VERSION}.md',OUT/f'验证记录-{VERSION}.md',OUT/f'安装与使用说明-{VERSION}.md',OUT/f'工具版开发说明-{VERSION}.md',OUT/'版本与校验.json',OUT/f'安装包验收-{VERSION}.json',OUT/f'音频素材校验-{VERSION}.json',OUT/f'双声道试听-{VERSION}.wav']
files += [OUT/f'{name}-{VERSION}.json' for name in reports]
files += images
archive=OUT/f'专注力小宇宙-{VERSION}-安卓自用版.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for p in files:z.write(p,p.name)
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert not any(n.endswith(('.p12','.jks','.keystore')) or 'signing-config' in n for n in z.namelist())
shutil.copy2(archive,OUT/'专注力小宇宙-安卓自用版.zip')
print(json.dumps({'version':VERSION,'checks':sum(reports.values()),'files':len(files),'archive':str(archive),'bytes':archive.stat().st_size,'apk_sha256':verification['sha256'],'html_sha256':sha},ensure_ascii=False,indent=2))
