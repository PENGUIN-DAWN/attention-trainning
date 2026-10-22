# 当前测试入口

```powershell
python -X utf8 android-app/dev.py test --jobs 3
python -X utf8 android-app/dev.py test --suite unit
python -X utf8 android-app/dev.py test --suite stimulus
```

版本与路径通过 tests/support.cjs 和 tooling/paths.py 发现，不嵌入开发者用户名。
jobs 可为 1–4；UI 性能检查会等其他浏览器结束后单独运行，避免并发负载污染。

| tests/ 文件 | 覆盖 |
| --- | --- |
| test_engineering.py / run_unit.py | 5 项配置、插槽、边界和版本单元检查 |
| contracts.cjs | 4 组稀疏编号注册、纯备份计划、失败不写入和兼容哈希 |
| training.cjs | 原六项完整作答、观察时间、输入与旧数据 |
| tools.cjs / tool-edges.cjs | 倒序、7–10、随机约束、备份、保存失败与后台 |
| completion.cjs | 小屏完成操作、减少动画与计时边界 |
| advanced.cjs | 11–16 整轮；部分长流程用虚拟时钟，音频用真实浏览器时钟 |
| advanced-edges.cjs | 真实浏览器时序、异常帧、后台与音频、保存重试 |
| stimulus.cjs | 十五个视觉项目题面与 1.50 APK 对照 |
| ui.cjs | 目录、布局、导航、动效、对比度、软件 rAF/按压与录屏 |

统一命令自动提取 1.50 对照页面到当前用户缓存，不需手工编辑测试路径。
历史脚本中的断言说明可能保留早期基线名称，当前 stimulus.cjs 实际读取统一命令生成的 1.50 页面。
输出在 `安卓手机版/`，隔离测试数据不读取真实手机记录。
完整运行产生绑定页面、报告和测试源码哈希的 `验收运行-版本.json`；单独套件不能代替完整发布凭据。

1.51 历史报告通过 57 组检查。1.60 本次完整运行通过 58 组，新增应用 SVG 图标与底部导航检查，并验证指针位置微倾斜和装饰停动。原训练随机约束、备份、时序与题面兼容套件继续执行。
安装包静态核验独立于浏览器验收。详见各版本验证记录与原始 JSON。
浏览器帧回调不代表物理显示；没有安卓真机时，不宣称覆盖安装、中文输入法、耳机或硬件时序通过。

archive 内的版本号测试保留原始内容和旧路径，只供历史参考；需要重跑旧版时使用对应 Git 提交的完整工程。
