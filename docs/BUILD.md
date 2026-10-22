# Windows 构建与发布

## 环境

- Python 3.10+；构建使用标准库。
- JDK 17+，推荐设置 JAVA_HOME；也查找 PATH、常规 JetBrains JBR/Java 安装。
- Android build-tools 35 和 platform-35。支持标准 SDK 目录与本工程旧缓存布局。
- Node.js、Playwright 1.62.1 和 Edge/Chrome 或 Playwright Chromium，用于开发验证。
- 录屏需要 Playwright FFmpeg，仅为开发工具，不进入 APK。

在仓库根目录执行：

```powershell
npm ci --ignore-scripts
npx playwright install chromium ffmpeg
python -X utf8 android-app/dev.py doctor
python -X utf8 android-app/dev.py release --jobs 3
```

若已有可用浏览器/FFmpeg，不必重复下载。doctor 检查工具发现，不进行训练验收。
当前验证使用 Windows 现有工具；上述全新机器 npm 下载流程尚未实测。
首次缺少官方 Android SDK 缓存时，build.py 会下载固定版本并校验归档；App 本身仍完全离线。

## 可配置工具路径

| 变量 | 用途 |
| --- | --- |
| JAVA_HOME | Windows JDK 根目录 |
| FOCUS_NODE | node.exe 绝对路径；否则查找 PATH/当前用户工具运行时 |
| FOCUS_PLAYWRIGHT_MODULE | 可选 Playwright 模块绝对路径 |
| FOCUS_BROWSER | 可选浏览器可执行文件路径 |
| FOCUS_ANDROID_TOOLS | Android SDK 根目录，优先于 ANDROID_SDK_ROOT / ANDROID_HOME |
| FOCUS_SIGNING_DIR | 原签名目录，必须在仓库外 |
| FOCUS_BUILD_DIR | 可选原生构建暂存目录；Windows 使用纯英文绝对路径，多工作区并行时分别指定，build 与 verify 使用同一值 |

SDK 默认缓存 `.android-tools/`。签名默认读取当前用户 `.codex/app-signing/focus-universe/`。
原生构建默认暂存到当前用户 `.cache/focus-android-build/工作区哈希/`；自定义 `FOCUS_BUILD_DIR` 时每个工作区使用不同英文路径。build 与 verify 必须使用同一值。编译前只清理已核对位于暂存目录内的 classes、dex、res、assets，避免旧文件进入新包。
没有原签名时更新构建在下载 SDK 前即停止；不要新建签名冒充覆盖升级。
原签名不在仓库中，克隆者无法从源码恢复签名身份。

## 统一命令

```powershell
python -X utf8 android-app/dev.py prepare
python -X utf8 android-app/dev.py test --jobs 3
python -X utf8 android-app/dev.py build
python -X utf8 android-app/dev.py verify
python -X utf8 android-app/dev.py package
```

release 顺序执行完整测试、构建、APK 核验和打包。package 拒绝缺失、失败、页面不匹配、测试源或报告改变的完整测试凭据。
1.61/1.62 的动态训练和入场/音效套件串行执行；源码核验保留旧基线，依次应用 motion-baseline-161.json 与 motion-baseline-162.json 差异契约。报告不再声称全部引擎与 1.50 一致，详见 [动态训练优化](MOTION-161.md)。
prepare 生成 android-app/assets/index.html，不直接编辑或提交它。
版本号仅从 AndroidManifest.xml 读取，输出到 `安卓手机版/` 的对应版本文件；不要覆盖历史 APK。
发布时递增 versionName/versionCode，修改说明文档的当前版本入口。

旧 prepare_assets.py/build.py 仍可调用，verify_ui_release.py/package_ui_release.py 保留为当前实现的兼容入口。
archive 内历史脚本只供阅读，含旧路径和旧版本，不能作为当前发布命令。

当前 native 编译、签名和 SDK 工具面向 Windows；尚未验证 Linux/macOS 构建。
版本与校验.json 是最近一次构建元数据；每版另存安装包验收、测试凭据和交付校验。

第七项独立预览为 `小球逐颗入场-版本.webm`，来自隔离浏览器且不含音轨；App 音效在运行时合成。该预览与新版完整报告一起打包，不包含作者提供的原始参考视频。

1.63 追加 motion-baseline-163.json，保留旧契约。新 tracking-quality 套件同样串行，包含原生动画和缺失 API 时的降级；发布包额外包含小球流畅度验收报告。

## 1.64 起的发布保护与来源

- 先提交源码、测试与构建配置，再运行完整 release；凭据记录源提交、构建输入 SHA-256、Python/Node/JDK 版本，浏览器版本保留在 UI 报告。
- 输入包含原生 Java、资源、页面源、测试、工程脚本与依赖锁文件；生成 assets、缓存和历史归档排除。源码变化使测试凭据失效。
- 构建在暂存目录保存 build-provenance.json；verify 核对 APK 哈希及其输入与完整测试一致。APK 静态报告带入来源记录。
- release 在测试前检查版本是否被 APK、静态验收或 ZIP 占用；versionCode 必须高于保留的静态报告。build 与 package 也分别拒绝覆盖已有交付。
- 正式 release 使用用户缓存中的 focus-universe-release.lock；遇到锁先核对 PID 和工作区，确认原任务结束后才处理陈旧锁。
- 构建失败后可以在同一输入与暂存目录继续 verify/package；若修改源码或已有正式产物，使用新的发布身份并重跑完整流程。
- 1.64 公共反馈追加 feedback-baseline-164.json，位于 1.63 契约之后；tracking-quality 与 feedback 均串行执行，不并行采样性能。
- 发布产物另行提交，标签指向最终产物提交；不修改旧版本报告冒充新运行。隔离重建允许得到不同 APK 二进制哈希，仍须核对页面、来源、签名、版本和行为。

当前机器使用现有签名文件重建成功，不代表签名的独立加密备份已经恢复验证。源码恢复与手机恢复步骤见 DATA-AND-SIGNING，日常协作见 CONTRIBUTING。

本轮新增锁文件后在独立目录完成 npm ci --ignore-scripts（3个开发包），不等于全新电脑 SDK/签名恢复已验收。当前机器 Python/Node/JDK 版本及 Java 兼容警告见 EVIDENCE；本次编译、签名成功。
