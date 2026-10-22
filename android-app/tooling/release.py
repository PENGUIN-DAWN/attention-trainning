"""Package only a tested page and its verified APK; no private build inputs."""
import hashlib
import html
import json
import zipfile
from tooling.project import APP, OUT, metadata, registry, BASELINE_VERSION
from tooling.receipts import validate, REPORT_NAMES


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def package():
    meta = metadata()
    version = meta['version']
    receipt = validate()
    apk = OUT / f'专注力小宇宙-{version}.apk'
    verification = json.loads((OUT / f'安装包验收-{version}.json').read_text(encoding='utf-8'))
    assert verification['sha256'] == sha(apk)
    assert verification['html_sha256'] == receipt['html_sha256']
    assert verification['apk_signature_verified'] and verification['training_contract_verified']
    assert verification['protected_css_and_audio_equal_baseline']
    assert not verification['network_permission']
    with zipfile.ZipFile(apk) as archive:
        assert hashlib.sha256(archive.read('assets/index.html')).hexdigest() == receipt['html_sha256']

    def write(name, text):
        path = OUT / f'{name}-{version}.md'
        path.write_text(text, encoding='utf-8')
        return path

    notes = write('更新说明', f'''# 专注力小宇宙 {version}

本版打磨第七项的入场、立体高光与目标确认，保留浅蓝界面和 {len(registry())} 项训练。

- 十球档正式运动从 6 秒改为 10 秒；十二球档仍为 8 秒，速度保持 0.24 / 0.27。
- 保留原蓝色小球、棕金色目标与浅色背景、方形场地和原始排列，只借鉴参考视频的呈现效果。
- 简短倒数后，小球每 160 毫秒逐颗出现；立体高光和内阴影固定在球面，进入运动后只更新位置。
- 全部出现后，目标发光确认完整 2.5 秒；入场和确认都不占正式运动时间，运动时恢复一致外观。
- 入场搭配离线合成的轻柔短音，可在设置中静音；没有复制示范视频音乐，也没有联网素材。
- 减少动画时保留逐颗显示和静态目标光圈，关闭弹出缩放和光圈脉动；正式追踪运动保留。
- 第七项新记录使用规则 v3；旧 v1/v2 条件、成绩、存储键和备份 v4 继续兼容并分组比较。
- 返回、切后台或运动长停顿会取消时钟、入场和音效，不算作完成。

其余训练规则、计时、原数字音频和计分保留。没有联网、收费或新增训练项目。
版本代码 {meta['versionCode']}，包名 `{meta['package']}`。历史 APK 保留。
''')
    install = write('安装与使用说明', f'''# 覆盖安装 {version}

1. 在旧版导出一次备份，并将文件另存。
2. 将 `专注力小宇宙-{version}.apk` 复制到安卓手机，点击安装并允许该来源安装。
3. 直接覆盖安装，不要先卸载、清除数据或更换应用存储来源。
4. 更新后核对旧记录、设置和备份，试用常用训练。

Android 8.0 及以上。与历史版本使用相同签名和包名，已通过安装包静态检查；尚未实测真机覆盖安装。
完全离线，无账号和联网权限。源码仓库不含原签名私钥，其他人克隆后不能直接构建同签名升级包。

APK SHA-256：`{verification['sha256']}`。
''')
    ui = json.loads((OUT / f'界面与性能验收-{version}.json').read_text(encoding='utf-8'))
    perf_rows = '\n'.join(
        f"| {name} | {data['sampleCount']} | {data['p95Ms']:.2f} | {data['maxMs']:.2f} | {data['over50ms']} |"
        for name, data in ui['observations']['performance'].items())
    motion = json.loads((OUT / f'动态训练验收-{version}.json').read_text(encoding='utf-8'))
    motion_before = motion['observations']['oldNormal']
    motion_after = motion['observations']['currentNormal']
    report = write('验证记录', f'''# {version} 实际验证

完整运行 {receipt['checks']} 组检查，所有报告无错误，绑定同一页面 SHA-256：
`{receipt['html_sha256']}`。

覆盖原十六项流程、倒序、教学与正式分离、计时/后台/快速操作、记录删除、旧备份合并、
导入失败与事务写入、保存重试、减少动画、小屏布局、题面兼容与音频离线资源。
规则随机性质检查沿用既有套件；本次包括 Python 5 项与工程契约 4 组。
旧原始 HTML、训练 CSS、规则 8–16 和音频保留。第七项入场、音效和 v3 条件使用独立 1.62 源码契约；旧 1.50/1.61 契约原样保留，详见 docs/MOTION-162.md。

## 浏览器软件测量

环境：Windows / {ui['environment']['browser']} {ui['environment']['browserVersion']}。
测试使用隔离数据，截图成绩为测试数据。

| 场景 | 回调样本 | p95 间隔 ms | 最大间隔 ms | >50 ms |
| --- | --- | --- | --- | --- |
{perf_rows}

这是浏览器 rAF 软件回调间隔，不是安卓物理刷新率或输入到光子的延迟。
4 倍 CPU 限速是 CDP 软件模拟，不等同旧安卓手机。WebM 录制帧率也不代表实际渲染帧率。

## 动态训练补充

第七项约 1.8 秒普通档采样：画布重绘 {motion_before['paints']} → {motion_after['paints']}，布局次数 {motion_before['layoutCount']} → {motion_after['layoutCount']}；
旧 p95 回调间隔 {motion_before['p95Ms']:.2f} ms，新 {motion_after['p95Ms']:.2f} ms。这里能确认减少了绘制/布局工作，没有证明安卓手机帧率或残影改善。
加强档在 4 倍 CPU 软件限速下完成观察、运动及编号位置检查。规则 v1/v2/v3 的记录读入、真实导出/导入和六组独立比较通过；模拟刷新率的最终轨迹一致。
本次小球入场套件验证真实音频图的非静音输出、逐颗出现与声音对应、完整分段时长、原配色、目标提示退出、静音/减少动画、各准备阶段的后台取消和无音频 API 降级。浏览器视频预览不含音轨；实际 App 在入场时实时合成音效。不能据此断言手机硬件已无残影或音量合适。

## APK 静态检查

签名验证、zipalign、包名和递增版本代码、资源页一致、无权限均通过。
与 {verification['same_signing_certificate_count']} 个保留 APK 的签名指纹一致。
指纹：`{verification['certificate_sha256']}`。

## 尚未验证

未连接安卓真机，不能宣称已通过真机安装、覆盖升级、系统返回/后台、中文输入法、
耳机物理左右声道、音量舒适度、显示器硬件刺激时序或 60/90/120 FPS 验收。
请在自己的手机上核对这些项目，特别是小球主观流畅度；浏览器通过不表示手机卡顿已经解决。
''')
    architecture = write('工程整理说明', '''# 工程入口

- `android-app/config/trainings.json`：唯一训练元数据注册表，稳定编号和字符串键。
- `android-app/templates/app.html`：安卓专用外框模板，不修改已发布网页。
- `android-app/app/`：注册、状态、导航、记录、备份、引导与设置；icons.js 为应用 SVG 图标，visuals.js 为装饰插画与导航绑定。
- `android-app/chrome-ui.js`：只处理训练外围图标和结果装饰，不修改训练引擎、刺激和时钟。
- `android-app/styles/`：tokens、shell、training-chrome、dialog-motion；训练刺激样式独立保留。
- `android-app/tooling/`：版本、工具路径发现、APK 校验、完整测试凭据与发布归档。
- `android-app/tests/`：当前版本无关的验收；`dev.py` 是统一入口。
- `android-app/archive/`：历史文件原样留档，不参与当前构建。

应用脚本按显式顺序合成单一离线页面，仍有集中声明的共享状态，尚未改写为 ESM 或彻底解耦所有训练内部代码。
1.62 在 1.61 基础上增加第七项入场、高光、音效及十球 10 秒条件，详见 docs/MOTION-162.md；旧契约与其余训练继续回归。
备份保持 v4，兼容 v1–v4；缺失新增/隐藏数据的旧备份不会清空当前对应数据。

开发命令详见仓库 docs/BUILD.md 和 docs/TESTING.md。
''')
    screenshots = sorted(OUT.glob(f'*-{version}.png'))
    video = OUT / f'界面动效录屏-{version}.webm'
    assert screenshots and video.is_file()
    gallery = OUT / f'页面预览-{version}.html'
    figures = ''.join(f'<figure><img loading="lazy" src="{html.escape(p.name)}" alt="{html.escape(p.stem)}"><figcaption>{html.escape(p.stem)}</figcaption></figure>' for p in screenshots)
    gallery.write_text(f'''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{version} 页面预览</title><style>body{{background:#faf6f0;color:#244b73;font:16px system-ui;margin:24px}}main{{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}}figure{{margin:0}}img,video{{max-width:100%;max-height:720px;border-radius:16px;border:1px solid #dce6ec}}p{{color:#596f80}}</style><h1>专注力小宇宙 {version}</h1><p>隔离浏览器真实页面；成绩为测试数据。视频捕获帧率不代表设备渲染帧率。</p><video controls src="{video.name}"></video><main>{figures}</main></html>''', encoding='utf-8')
    tracking_video = OUT / f'小球逐颗入场-{version}.webm'
    files = [apk, notes, install, report, architecture, gallery, video, tracking_video, *screenshots,
             OUT / f'安装包验收-{version}.json', OUT / f'验收运行-{version}.json',
             *[OUT / f'{name}-{version}.json' for name in REPORT_NAMES]]
    visual_qa = OUT / f'小球运动边缘核验-{version}.json'
    if visual_qa.is_file():
        files.append(visual_qa)
    bundle = OUT / f'专注力小宇宙-{version}-安卓自用版.zip'
    with zipfile.ZipFile(bundle, 'w', zipfile.ZIP_DEFLATED) as archive:
        for path in files:
            archive.write(path, path.name)
    with zipfile.ZipFile(bundle) as archive:
        assert archive.testzip() is None
        assert len(archive.namelist()) == len(files)
        assert not any(name.endswith(('.jks', '.keystore', '.p12')) or 'signing-config' in name for name in archive.namelist())
    result = {**meta, 'files': len(files), 'checks': receipt['checks'], 'apk_sha256': sha(apk),
              'bundle_sha256': sha(bundle), 'html_sha256': receipt['html_sha256']}
    (OUT / f'交付校验-{version}.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result
