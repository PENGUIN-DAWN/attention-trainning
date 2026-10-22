"""Package the tested UI release; no signing material or user data enters the ZIP."""
from pathlib import Path
import hashlib,html,json,shutil,statistics,zipfile
HERE=Path(__file__).resolve().parent
OUT=HERE.parent/'安卓手机版'
VERSION='1.50'
sha=hashlib.sha256((HERE/'assets/index.html').read_bytes()).hexdigest()
groups={'浏览器验收':9,'新增训练验收':6,'工具边界验收':6,'完成页补充验收':2,'六项新增验收':8,'六项边界验收':6,'题面兼容验收':2,'界面与性能验收':9}
reports={}
for name,count in groups.items():
    r=json.loads((OUT/f'{name}-{VERSION}.json').read_text(encoding='utf-8'))
    assert not r.get('errors'),name
    assert len(r['checks'])==count,(name,len(r['checks']))
    assert r['html_sha256']==sha,name+' used a different page'
    reports[name]=r
apk=OUT/f'专注力小宇宙-{VERSION}.apk'
verification=json.loads((OUT/f'安装包验收-{VERSION}.json').read_text(encoding='utf-8'))
assert verification['apk_signature_verified'] and verification['all_16_module_sources_exactly_match_1_40']
assert verification['sha256']==hashlib.sha256(apk.read_bytes()).hexdigest()
with zipfile.ZipFile(apk) as z:assert hashlib.sha256(z.read('assets/index.html')).hexdigest()==sha
ui=reports['界面与性能验收'];perf=ui['observations']['performance']
perf_rows='\n'.join(f"| {name} | {d['sampleCount']} | {d['averageIntervalMs']:.2f} | {d['p95Ms']:.2f} | {d['maxMs']:.2f} | {d['over50ms']} |" for name,d in perf.items())
press=[s['ms'] for s in ui['observations']['pointerToNextFrame']]
notes='''# 专注力小宇宙 1.50 更新说明

本版基于 1.40 十六项功能工具版，升级为 1.50 / versionCode 7。

- 深蓝黑背景、浅蓝色操作、统一文字层级；原气泡目录改为 20px 圆角矩形卡片。
- 手机双列，小屏单列，宽屏三至四列；显示真实最近使用和今日完成状态。
- 重做卡片悬浮/按压、页面进出、弹窗与成绩入场；仅首屏错峰，返回保留滚动位置。
- 取消全目录无限漂浮、鼠标视差和常驻合成提示；少量浮动在滚动、离屏、后台时停止。
- 过渡中快速返回、切换和后台恢复受路由代次保护，先终止训练再做退出效果。
- 原十六项规则、题量、设置范围、计分、正式题面和音频保留；训练时没有装饰漂浮或额外刺激动画。
- 深色系统启动底色和浅色系统栏图标；保留减少动画与系统偏好。

备份格式仍为 v4，继续兼容 v1–v4；原存储键和隐藏娱乐数据保留。没有账号、联网、广告或新增权限。旧 APK 均保留，已发布网页未改。

部分刺激区域仍使用浅色背景，这是为保留原题面条件。鼠标悬浮只用于支持鼠标的设备，手机通过按压反馈操作。

首次目录入场最多约360ms；页面退出160ms、训练进入260ms、返回目录190ms；成绩260ms。推荐卡浮动2px/6秒，最多两轮。具体参数见开发说明。

支持浏览器的弹窗有关闭淡出；旧 WebView 可直接关闭。规则与首次示例关闭立即清除，避免过渡画面遮住新题。

实际安卓流畅度、覆盖安装、键盘和耳机仍需真机确认。浏览器软件回调频率不是手机屏幕 FPS。
'''
(OUT/f'更新说明-{VERSION}.md').write_text(notes,encoding='utf-8')
install=f'''# 安装与使用说明 · {VERSION}

1. 在旧版 App 的练习足迹中先导出完整备份。
2. 将「专注力小宇宙-{VERSION}.apk」传到安卓手机，点击安装；如系统提示，允许当前文件来源安装应用。
3. 选择更新/覆盖安装。不要先卸载旧版，不要清除应用数据。
4. 打开后检查旧记录、设置和备份入口；再试一次训练、返回与切后台。

沿用包名 `cn.focusuniverse.offline` 和原签名，versionCode 为 7，高于 1.40 的 6。静态验证满足覆盖升级身份要求；当前没有连接安卓设备，未进行真实覆盖安装。

系统要求：Android 8.0 及以上、系统 WebView。无需登录或联网。

如果出现“签名冲突”，不要卸载以绕过提示，先确认原应用是否来自其他签名版本，并保留备份。若安装的其他版本 versionCode 高于 7，本包不能直接覆盖它。

运行时声音仅由主动进入双耳分听触发。减少动画在右上角界面设置中调整；系统要求减少动画时自动生效。

预览来自隔离浏览器，截图里的记录均为测试数据，不会写入你的手机。WebM 为25fps浏览器录制，不代表应用渲染被锁为25fps。

APK SHA-256：`{verification['sha256']}`
'''
(OUT/f'安装与使用说明-{VERSION}.md').write_text(install,encoding='utf-8')
real=reports['六项边界验收']['observations']
verify=f'''# 1.50 验证记录

共 {sum(groups.values())} 组验收通过，报告页面 SHA 与最终 APK 一致：`{sha}`。

## 浏览器与规则

- 原六项完整回归；原7–10整轮及倒序35秒；原设置、观察时长、IME组合输入、完成入口与边界。
- 新六项整轮：规则切换60题、呼吸累计180秒、中央周边30题、持续监测120项、串行双目标30题采用虚拟时钟流程；双耳正式30题使用真实浏览器音频时钟。教学与正式记录分离。
- 真实浏览器时钟另测初始20秒呼吸、500/350/200ms视觉呈现、12×150ms序列、连续10项监测空白期输入，保留180ms卡顿标记测试。
- 合计3800组随机出题及结构化记录检查；快速输入、过期回调、保存失败重试、筛选删除、旧备份合并、隐藏娱乐数据保留与事务恢复。
- 十五个视觉项目的首题刺激 computed style 对照1.40，颜色、字族、字号、字重、行高、字距、边框和圆角一致；不代表物理屏幕呈现完全等效。
- 320–1280px目录布局、22px标题放大、16入口、仅按需创建iframe、快速导航、滚动恢复、进出过渡中后台恢复、系统/应用减少动画、12组实际UI文字对比度检查。

## 性能软件观察

环境：Windows {ui['environment']['os']} / {ui['environment']['cpu']} / Edge {ui['environment']['browserVersion']} headless，390×844 CSS px。屏幕物理刷新率未测量。

| 场景 | 样本数 | 平均间隔ms | P95 ms | 最大ms | >50ms数量 |
| --- | ---: | ---: | ---: | ---: | ---: |
{perf_rows}

记录的是rAF回调间隔，并非物理显示FPS或合成帧交付率。4倍CPU减速是软件模拟，不等于旧安卓手机。

12次实际浏览器指针按压到可观察缩放样式的中位延迟 {statistics.median(press):.2f}ms，最大 {max(press):.2f}ms；不等于硬件触摸到像素延迟。

目录出现耗时 {ui['observations']['pageLoadToDirectoryWallMs']}ms，仅为本轮浏览器导航/加载观察，不是安卓冷启动耗时。没有为了动画增加固定启动等待。

## APK静态核验

- versionName 1.50 / versionCode 7；Android 8+；包名与七个历史/当前安装包签名一致。
- v2/v3签名校验及zipalign通过；无任何uses-permission，无INTERNET。
- 十六项嵌入引擎source、原presentation CSS/JS和数字音频与1.40一致。
- 规则、时钟、音频和存储源文件未变；根网页与旧APK哈希未变。
- 打包页面与全部测试报告SHA一致；交付ZIP不含密钥或用户数据。

## 测试工具边界

Playwright整页截图在虚拟时钟下曾临时将视口宽度改为4px，正确触发训练尺寸变化保护。最终快速视觉截图固定viewport，不关闭或放宽App的尺寸保护。另有真实尺寸变化中断测试。

## 仍需安卓真机验证

- 覆盖安装后旧记录/设置实际保留，卸载前备份恢复。
- Android系统开屏、状态栏/手势区/中文输入法实际遮挡和返回行为。
- 常见60Hz及90/120Hz设备的真实流畅度、输入延迟、省电/发热和旧手机表现。
- 系统WebView版本差异、真实耳机声道/数字听辨、物理刺激显示时序。

ADB无设备连接；以上项目未宣称通过。源代码和浏览器模拟不能代替真机结果。
'''
(OUT/f'验证记录-{VERSION}.md').write_text(verify,encoding='utf-8')
shutil.copy2(HERE/f'UI改版开发说明-{VERSION}.md',OUT/f'UI改版开发说明-{VERSION}.md')
names=['深色首页首屏','深色训练目录','深色训练设置','深色训练题面','深色训练成绩','深色训练记录','深色界面设置','深色桌面悬浮','规则切换','呼吸聚焦','中央与周边辨认','持续监测','双耳声道确认','双耳分听','串行双目标识别']
images=[OUT/f'{n}-{VERSION}.png' for n in names]
video=OUT/f'界面动效录屏-{VERSION}.webm'
assert all(p.exists() for p in images) and video.is_file()
cards=''.join(f'<figure><a href="{html.escape(p.name)}"><img loading="lazy" src="{html.escape(p.name)}" alt="{n}"></a><figcaption>{n}</figcaption></figure>' for n,p in zip(names,images))
gallery=OUT/f'页面预览-{VERSION}.html'
gallery.write_text('''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>专注力小宇宙 1.50 预览</title><style>:root{color-scheme:dark}body{font:15px system-ui,sans-serif;background:#0d121b;color:#eef4fc;margin:24px}h1{font-size:26px}p{color:#a7b5c8;line-height:1.9}a{color:#8acbff}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px}figure{margin:0;border:1px solid #33445b;background:#172131;padding:12px;border-radius:20px;align-self:start}img{width:100%;height:520px;display:block;object-fit:contain;object-position:top}figcaption{padding:12px;text-align:center}video{width:min(100%,390px);max-height:750px;border-radius:18px;border:1px solid #33445b}</style><h1>专注力小宇宙 · 1.50</h1><p>深色界面与圆角训练卡片。图片和录屏来自隔离的电脑浏览器手机尺寸模拟，记录为测试数据。部分功能整轮测试使用虚拟时钟；视频为真实浏览器操作、25fps捕获，与实际渲染回调测量分开。未进行安卓真机性能或覆盖安装测试。</p><video controls preload="metadata" src="界面动效录屏-1.50.webm" poster="深色首页首屏-1.50.png"></video><p><a href="专注力小宇宙-1.50.apk">下载 APK</a> · <a href="验证记录-1.50.md">验证详情</a> · 点击图片查看原图</p><main>'''+cards+'</main></html>',encoding='utf-8')
shutil.copy2(OUT/f'安装与使用说明-{VERSION}.md',OUT/'安装与使用说明.md')
files=[apk,gallery,video,*images,OUT/'版本与校验.json',OUT/f'安装包验收-{VERSION}.json']
files += [OUT/f'{n}-{VERSION}.md' for n in ['更新说明','安装与使用说明','验证记录','UI改版开发说明']]
files += [OUT/f'{n}-{VERSION}.json' for n in groups]
archive=OUT/f'专注力小宇宙-{VERSION}-安卓自用版.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for p in files:z.write(p,p.name)
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert not any(n.endswith(('.p12','.jks','.keystore')) or 'signing-config' in n for n in z.namelist())
shutil.copy2(archive,OUT/'专注力小宇宙-安卓自用版.zip')
print(json.dumps({'version':VERSION,'checks':sum(groups.values()),'archive':str(archive),'files':len(files),'bytes':archive.stat().st_size,'apk_sha256':verification['sha256'],'html_sha256':sha},ensure_ascii=False,indent=2))
