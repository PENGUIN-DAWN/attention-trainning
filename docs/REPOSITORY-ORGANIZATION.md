# 本次仓库整理

本次只整理工程入口、文档与Git纳入范围，不修改训练、构建产物或已发布网页，不执行此前讨论的整体重构。

- 当前基线：1.50 / versionCode 7。
- 保持根HTML、`_hub/hub.template.html`和`android-app/`原路径，避免破坏构建引用与基线哈希。
- 增加根README、贡献约定、docs导航和发布目录README。
- Android旧README留存到`android-app/docs/legacy-readme.md`，当前README指向1.50说明。
- 跟踪当前1.50报告/预览/交付包，以及七个历史/当前APK；旧APK用于签名和内容兼容核验。
- 排除SDK、生成文件、Python缓存、原始音频中间文件、独立网页部署仓库、旧重复ZIP和旧预览。
- `.gitattributes`保留文件原始字节，避免换行转换使现有哈希基线失效。
- 没有新增许可证声明，没有发布网站或启用Actions自动部署。

下一步工程整理可单独实施：配置驱动训练注册、替换字符串拼接、拆分应用壳、统一测试配置及跨机器构建路径。
