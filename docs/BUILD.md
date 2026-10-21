# Windows 构建说明

## 环境

- Python 3（构建脚本使用标准库）。
- JDK 17或以上；当前脚本默认查找本机PyCharm JBR。可设置`JAVA_HOME`或向`build.py`传入`--java-home`。
- 官方Android构建工具35及platform-35。当前脚本使用Windows版工具；默认缓存为根目录`.android-tools/`，缺失时会从官方地址下载并检查预置SHA-1。
- 当前浏览器验收需要Node、Playwright与Edge，测试文件的工具路径仍需按机器配置。App运行不依赖这些开发工具或网络。

```powershell
python -X utf8 android-app/prepare_assets.py
python -X utf8 android-app/build.py --java-home "C:\path\to\jdk"
python -X utf8 android-app/verify_ui_release.py
```

生成页面位于`android-app/assets/index.html`（忽略文件），APK生成至`安卓手机版/专注力小宇宙-1.50.apk`。不要编辑生成页面作为源码。

## 原签名与原发布包

签名由`build.py`从当前用户主目录下`.codex/app-signing/focus-universe/`读取。私钥和密码配置不在仓库中，不能放入GitHub、APK或交付ZIP。versionCode大于1且缺失原签名时脚本会拒绝构建更新。

原维护者需要安全恢复自己的签名备份；其他克隆者不能依靠本仓库制作能覆盖原安装的同签名更新。独立签名开发包需要另行设计包名和构建配置，当前整理不改变这一行为。

`verify_ui_release.py`目前包含原开发机JDK/SDK及暂存路径，迁移到其他机器需先配置。其职责包括签名身份、APK内容、源文件基线和无网络权限检查。

## 发布

当前原样保留的发布脚本固定为1.50：

```powershell
python -X utf8 android-app/package_ui_release.py
```

只有八份浏览器/规则报告与最终页面SHA一致时才打包。它依赖已生成的截图、视频、安装包核验和历史基线；不能在尚未测试时直接当作通用打包入口。

发布时同时递增`AndroidManifest.xml`中的versionName和versionCode，并更新当前固定版本测试/校验/打包配置；后续可统一版本来源。本次不重发新版本，1.50 APK字节保持不变。
