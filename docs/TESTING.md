# 测试导航

当前版本入口（在项目根目录执行，先配置脚本中的本机Node/Playwright/Edge路径）：

| 命令文件 | 覆盖 |
| --- | --- |
| `android-app/check_training_150.cjs` | 原六项完整作答、观察时间、输入与旧数据 |
| `android-app/check_tools_150.cjs` | 倒序、第7–10项完整流程、随机约束 |
| `android-app/check_tool_edges_150.cjs` | 数据、备份、保存失败与生命周期边界 |
| `android-app/check_finish_150.cjs` | 小屏完成入口、减少动画与计时边界 |
| `android-app/check_advanced_150.cjs` | 第11–16项整轮；视觉/呼吸/监测采用虚拟时钟，音频采用真实浏览器时钟 |
| `android-app/check_advanced_edges_150.cjs` | 真实浏览器时序、卡顿标记、后台、音频和保存重试 |
| `android-app/check_stimulus_150.cjs` | 十五个视觉项目与1.40实际题面样式对照 |
| `android-app/check_ui_150.cjs` | 深色UI、尺寸、导航、动效、rAF与按压软件观察、录屏 |

使用`node <上述文件>`运行。脚本使用隔离上下文和测试夹具，不读取真实手机成绩。输出写入`安卓手机版/`，报告保留最终页面SHA。

`check_stimulus_150.cjs`额外需要将1.40 APK的`assets/index.html`提取至当前用户主目录`.cache/focus-ui150-baseline.html`。UI录屏需要Playwright可用的FFmpeg开发工具；它不加入APK。

历史130/140及更早测试保留归档，不代表当前发布命令。不要为某条旧测试失败直接修改当前训练规则，先核对版本和断言用途。

1.50交付验证为48组检查和3800组随机约束；详见[实际报告](../安卓手机版/验证记录-1.50.md)。软件rAF回调频率不是物理屏幕帧率，CPU减速模拟不是旧手机测试。未连接安卓设备，未验证实际覆盖安装、系统键盘、耳机及物理显示。
