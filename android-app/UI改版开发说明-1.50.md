# 1.50 深色界面开发说明

## 基线与边界

由本工程 1.40（versionCode 6）升级为 1.50（versionCode 7）。包名 `cn.focusuniverse.offline`、工程外签名、Android 8+、WebView 本地来源均沿用。没有新权限、账号、联网资源或运行时依赖。已发布根网页和历史 APK 不修改。

十六项模块的嵌入 source、原六项 presentation CSS/JS、出题判分、时钟、音频和存储恢复源文件保持一致。深色样式在运行时注入外围，不写回原网页。题面颜色不全部替换为蓝色；浅色刺激面板有意保留。外围背景发生变化，不能把这种 UI 对照解释为实验条件完全等效或能力改善证据。

## 代码位置

| 文件 | 职责 |
| --- | --- |
| `design-tokens.css` | 深色背景、层级、文字、蓝色强调、状态色、圆角和动效变量 |
| `dark-shell.css` | 十六项矩形目录、手机/桌面响应、悬浮/按压、记录、设置和引导 |
| `directory.js` | 目录卡片、真实最近记录和最近使用入口，无逐指针移动布局计算 |
| `dark-training.css` | 三组 iframe 的外围控件；保留原正式刺激的字体、颜色、背景等 |
| `dialog-motion.css` | 支持浏览器的弹窗进入/退出；规则和示例关闭立即清除，防止遮住新刺激 |
| `chrome-status.js` | 7–10外围提示可见性适配，避免上一次中断提示留在下一轮题面或成功成绩旁 |
| `shell-motion.js` | 首屏可见卡片入场、少量推荐卡浮动、滚动/离屏/后台停止 |
| `experience.js` | 可取消的退出→进入路由、即时 suspend、过渡中后台恢复，原数据操作逻辑保留 |
| `prepare_assets.py` | 只读原网页，在 Android 内合成 UI；核心 source 不改 |
| `MainActivity.java`、`res/values*/styles.xml` | 深色系统启动背景、WebView 底色、浅色系统栏图标 |

## 实际动效参数

- 目录卡片：18–20px 圆角（本版 20px）；320px 单列、360–820px 双列，宽屏三列，1200px 起四列。
- 悬浮：transform 上移 3px，170ms；背景/边框即时改变，不逐帧绘制复杂阴影。
- 按压：缩放至 0.98；常规按钮 110ms，卡片 170ms 过渡。
- 首次目录：仅可见卡片上移 8px/淡入 240ms；错峰每项30ms、最大120ms，总计不超过360ms。
- 推荐卡：上下2px、6s周期，最多两轮；滚动、离屏、离开目录或后台立即取消。
- 页面：退出160ms、进入训练260ms，返回目录190ms；先停止训练，再淡出外框。动画可被更新的导航取消。
- 成绩：上移6px/淡入260ms，无计数增长动画。
- 弹窗：进入180ms、背景160ms；支持 `allow-discrete` 的 WebView 可关闭淡出，旧 WebView 直接关闭。规则/引导关闭不保留退出画面。
- 减少动画：非必要动画、位移及按压变形全部取消，题目本身运动不受影响。

没有将 UI 帧率写死为 60；浏览器原生合成和 Web Animations 按可用刷新节奏运行。已取消旧气泡的常驻 `will-change`、指针视差和全目录无限漂浮。CSS 只对 transform/opacity 做连续过渡；背景和边框不持续插值。没有新增装饰 setInterval。

## 数据与备份

保留 history/settings/ui/arcade/transaction 五类原键；备份仍为 v4，兼容 v1–v4。原十六项记录和条件分组逻辑保留。没有补造历史结构化信息，没有删除隐藏娱乐数据。自动化在隔离浏览器上下文运行，不访问手机或用户日常浏览器存储。

## 构建与验收

```
python -X utf8 android-app/build.py
python -X utf8 android-app/verify_ui_release.py
```

浏览器回归入口为 `check_training_150.cjs`、`check_tools_150.cjs`、`check_tool_edges_150.cjs`、`check_finish_150.cjs`、`check_advanced_150.cjs`、`check_advanced_edges_150.cjs`。另有 `check_stimulus_150.cjs` 对照 1.40 的十五个视觉项目实际 computed style；`check_ui_150.cjs` 验证界面、连续导航、动效、软件帧间隔、按压反馈和录屏。

快速视觉测试截图固定 viewport，避免 Playwright fullPage 捕获短暂修改视口宽度而触发真实的训练尺寸保护。尺寸变化的中断逻辑未关闭，单独测试保留。

性能报告是 Windows Edge/Playwright 的软件回调观察；不等于物理屏幕 FPS、合成帧交付率或输入到像素延迟。CPU 4倍减速也不等于安卓旧手机。WebM 是真实浏览器操作录制（25fps 捕获），与 rAF 测量分开；不会为了视频帧率改写 App 动画节奏。

最终 `package_ui_release.py` 校验全部报告和 APK 的页面 SHA 一致后，生成图集、说明与 ZIP。无安卓设备连接时不执行真实覆盖安装，不宣称高刷新率、系统输入法、声道或物理显示时序通过真机验收。
