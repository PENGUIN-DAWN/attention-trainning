# 专注力小宇宙安卓离线版

当前 **1.60 / versionCode 9**，十六项功能训练、奶油浅蓝目录、离线 WebView。

- [工程首页](../README.md)
- [架构和代码位置](../docs/ARCHITECTURE.md)
- [构建发布](../docs/BUILD.md)
- [测试入口](../docs/TESTING.md)
- [数据与签名](../docs/DATA-AND-SIGNING.md)
- [历史 1.50 UI 参数](UI改版开发说明-1.50.md)

统一入口 `python -X utf8 android-app/dev.py release --jobs 3`，从仓库根目录执行。
元数据在 config/trainings.json，外框在 templates/app.html，应用功能在 app/，样式在 styles/。
assets/ 和 build/ 为生成目录；archive/ 为不加载的历史材料。
原训练引擎、根网页输入和音频保持不变；签名私钥在仓库外。
