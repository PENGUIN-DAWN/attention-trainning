# 当前架构与代码入口

本仓库保存1.50实际工程，尚未进行前一轮讨论的完整模块化重构。

| 层次 | 主要文件 | 职责 |
| --- | --- | --- |
| 安卓平台 | `android-app/src/cn/focusuniverse/offline/MainActivity.java` | 内置页面来源、后台、返回、系统文档与减少动画 |
| 页面合成 | `android-app/prepare_assets.py` | 只读历史输入，合成`assets/index.html`，不改已发布网页 |
| 应用壳 | `experience.js` | 目录路由、记录、条件比较、设置与v4备份 |
| 原六项适配 | `training.js`、`training.css`、`descending.py` | 保留原HTML引擎，接入移动UI与倒序模式 |
| 7–10 | `tool-rules.js`、`tool-ui.js` | 配置、出题、判分与阶段状态 |
| 11–16 | `advanced-rules.js`、`advanced-ui.js` | 规则、教学/正式流程与记录 |
| 视觉计时 | `advanced-clock.js` | rAF、稳定布局、取消和时序异常 |
| 音频 | `advanced-audio.js`、`audio/digits.json` | 内置数字、双声道共同起点、后台停止 |
| 存储 | `storage.js` | 带恢复日志的事务写入 |
| 隐藏历史数据 | `arcade-rules.js`、`arcade-store.js` | 只保留历史娱乐备份兼容，无娱乐入口 |
| UI | `design-tokens.css`、`dark-shell.css`、`dark-training.css`、`directory.js`、`shell-motion.js`、`dialog-motion.css`、`chrome-status.js` | 深色矩形目录、外围样式和动效 |

详细动效参数与实现边界见[1.50开发说明](../android-app/UI改版开发说明-1.50.md)。

历史`arcade.js/css`、`shell.html`和旧版测试保留供历史参考，并不由当前页面合成器加载。原浅色CSS仍作为兼容基础，由当前深色层覆盖。

后续建议顺序：统一训练注册表；减少字符串模板替换；拆分路由/记录/备份；清晰隔离题面样式；统一当前测试与发布入口。每步保持旧数据与训练行为可验证，不在文件整理中顺带重写。
