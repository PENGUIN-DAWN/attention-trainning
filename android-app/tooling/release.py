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
    assert verification['apk_signature_verified'] and verification['all_training_engines_equal_baseline']
    assert verification['core_presentation_and_audio_equal_baseline']
    assert not verification['network_permission']
    with zipfile.ZipFile(apk) as archive:
        assert hashlib.sha256(archive.read('assets/index.html')).hexdigest() == receipt['html_sha256']

    def write(name, text):
        path = OUT / f'{name}-{version}.md'
        path.write_text(text, encoding='utf-8')
        return path

    notes = write('更新说明', f'''# 专注力小宇宙 {version}

本版参考作者提供的 UI 设计稿，改用奶油底色、浅蓝强调色和白色卡片，保留 {len(registry())} 项训练。

- 首页增加离线 SVG 星球插画和首页 / 足迹 / 说明底部导航。
- 卡片保留鼠标悬停，增加跟随指针的轻微倾斜、箭头移动和触摸按压反馈。
- 目录逐批入场，页面进出、结果和弹窗过渡独立于训练时钟；离屏及后台停止装饰运动。
- 导航、关闭、删除、备份等应用图标统一为内联 SVG；训练素材与项目图标保留。
- 记录、空状态、删除确认、备份、规则、首次示例和设置统一浅色风格。
- 启动与系统栏配色同步；原生图形使用 Android VectorDrawable，不引入位图或联网素材。
- 减少动画开关与系统偏好继续生效，题目本身必要运动不被关闭。
- 原存储键、备份 v4 与 v1–v4 导入兼容、来源和隐藏历史数据保留。

规则、题量、观察条件、音频、计分与 {BASELINE_VERSION} 一致，不增加训练剂量或效果承诺。
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
    report = write('验证记录', f'''# {version} 实际验证

完整运行 {receipt['checks']} 组检查，所有报告无错误，绑定同一页面 SHA-256：
`{receipt['html_sha256']}`。

覆盖原十六项流程、倒序、教学与正式分离、计时/后台/快速操作、记录删除、旧备份合并、
导入失败与事务写入、保存重试、减少动画、小屏布局、题面兼容与音频离线资源。
规则随机性质检查沿用既有套件；本次包括 Python 5 项与工程契约 4 组。
训练嵌入引擎、核心题面 CSS/JS、内置音频与 {BASELINE_VERSION} 一致，受保护源文件哈希一致。

## 浏览器软件测量

环境：Windows / {ui['environment']['browser']} {ui['environment']['browserVersion']}。
测试使用隔离数据，截图成绩为测试数据。

| 场景 | 回调样本 | p95 间隔 ms | 最大间隔 ms | >50 ms |
| --- | --- | --- | --- | --- |
{perf_rows}

这是浏览器 rAF 软件回调间隔，不是安卓物理刷新率或输入到光子的延迟。
4 倍 CPU 限速是 CDP 软件模拟，不等同旧安卓手机。WebM 录制帧率也不代表实际渲染帧率。

## APK 静态检查

签名验证、zipalign、包名和递增版本代码、资源页一致、无权限均通过。
与 {verification['same_signing_certificate_count']} 个保留 APK 的签名指纹一致。
指纹：`{verification['certificate_sha256']}`。

## 尚未验证

未连接安卓真机，不能宣称已通过真机安装、覆盖升级、系统返回/后台、中文输入法、
耳机物理左右声道、音量舒适度、显示器硬件刺激时序或 60/90/120 FPS 验收。
发布前应在自己的手机上核对这些项目。原训练引擎保持冻结，并不表示所有历史缺陷均已消除。
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
这次不重写冻结的十六项训练引擎，后续应按项目逐个拆解并回归，避免一次性改动训练时序。
备份保持 v4，兼容 v1–v4；缺失新增/隐藏数据的旧备份不会清空当前对应数据。

开发命令详见仓库 docs/BUILD.md 和 docs/TESTING.md。
''')
    screenshots = sorted(OUT.glob(f'*-{version}.png'))
    video = OUT / f'界面动效录屏-{version}.webm'
    assert screenshots and video.is_file()
    gallery = OUT / f'页面预览-{version}.html'
    figures = ''.join(f'<figure><img loading="lazy" src="{html.escape(p.name)}" alt="{html.escape(p.stem)}"><figcaption>{html.escape(p.stem)}</figcaption></figure>' for p in screenshots)
    gallery.write_text(f'''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{version} 页面预览</title><style>body{{background:#faf6f0;color:#244b73;font:16px system-ui;margin:24px}}main{{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}}figure{{margin:0}}img,video{{max-width:100%;max-height:720px;border-radius:16px;border:1px solid #dce6ec}}p{{color:#596f80}}</style><h1>专注力小宇宙 {version}</h1><p>隔离浏览器真实页面；成绩为测试数据。视频捕获帧率不代表设备渲染帧率。</p><video controls src="{video.name}"></video><main>{figures}</main></html>''', encoding='utf-8')
    files = [apk, notes, install, report, architecture, gallery, video, *screenshots,
             OUT / f'安装包验收-{version}.json', OUT / f'验收运行-{version}.json',
             *[OUT / f'{name}-{version}.json' for name in REPORT_NAMES]]
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
