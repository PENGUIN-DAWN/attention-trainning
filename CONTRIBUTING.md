# 开发约定

1. 当前版本为 1.61 / versionCode 10。先读 docs/ARCHITECTURE.md 与 BUILD.md。
2. 从 main 新建 codex/ 功能分支，每个完整改动提交并通过 PR 查看；避免直接推入未经验证的改动。
3. 新增项目先改 config/trainings.json，再实现所属规则/UI/记录条件，补充真实流程与边界验证。
4. 稳定编号、字符串项目键和存储键不可挪作他用。规则/难度变化显式升规则版本，分开比较。
5. 原记录、设置与隐藏娱乐数据、包名、WebView 来源和签名必须保留。
6. 训练刺激与装饰分离；退出和后台立即取消时钟及音频，过渡不能占观察时长。
7. 不编辑生成的 assets/index.html；外框改 templates/app.html、styles/、app/。
8. 根 HTML 和 ui-baseline-150.json 保留原样；1.61 动态改动由 motion-baseline-161.json 绑定，见 docs/MOTION-161.md。以后合理改引擎时应建立明确新基线，不能绕过旧断言。
9. 发布执行 python -X utf8 android-app/dev.py release，递增 Manifest 中版本与 versionCode，保留旧 APK。
10. 测试中确实通过的范围才写入报告；浏览器软件测量与安卓真机必须分开。
11. 不提交私钥、凭据、个人备份、SDK 和缓存。仓库公开，提交前检查暂存区。
12. .gitattributes 保留原始字节，避免批量格式化冻结引擎和历史产物；当前新增代码遵循 .editorconfig。
13. 产品定位、决定、训练清单或工程入口变化时，同步[项目知识库](docs/knowledge-base/README.md)；保持当前事实、历史材料、建议和未验证事项的区别。
