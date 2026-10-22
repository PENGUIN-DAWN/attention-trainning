# 当前架构与代码入口

1.51 建立应用壳拆分与统一工程入口。1.60 参考作者设计稿更新奶油浅蓝 UI。1.61 优化动态绘制：第七项实时图层、固定物理步长与插值、速度增加 50% 并升级规则 v2；第五项进度缩放及第十一项倒计时减少布局/重复写入。其余规则与原始网页保留，见 [动态训练优化](MOTION-161.md)。

1.60 新增 `app/icons.js`（应用 SVG 图标）、`app/visuals.js`（装饰插画与底部导航）和 `chrome-ui.js`（训练外围图标及结果装饰）。由 prepare_assets.py 显式装配，核心训练 CSS/JS 与题面保留。详细范围见 [1.60 UI 说明](../android-app/UI改版开发说明-1.60.md)。

| 层次 | 位置 | 职责 |
| --- | --- | --- |
| 安卓平台 | `android-app/src/cn/focusuniverse/offline/MainActivity.java` | 内置页面来源、后台、返回、文档与减少动画 |
| 训练注册表 | `android-app/config/trainings.json` | 稳定 ID/key、引擎族、名称、规则、图标、颜色、设置白名单与示例 |
| 安卓模板 | `android-app/templates/app.html` | 独立页面骨架与明确插槽，不再替换历史网页文案 |
| 页面合成 | `android-app/prepare_assets.py` | 校验配置，注入只读训练源，生成单一离线页面 |
| 应用状态 | `android-app/app/registry.js`、`state.js`、`model-types.js` | 注册查询、集中状态和协议文档 |
| 导航与平台 | `app/navigation.js`、`bridge.js`、`platform.js` | 懒加载 iframe、路由取消、消息来源、后台/返回/键盘 |
| 显示交互 | `app/ui-core.js`、`directory.js`、`motion.js`、`guides.js`、`preferences.js`、`start.js` | 目录、动效、首次示例与启动 |
| 记录与统计 | `app/scores.js`、`records.js` | 原记录校验、条件比较、筛选与删除 |
| 备份 | `app/backup-plan.js`、`backup.js` | 纯校验合并计划 → 事务写入 → 更新内存和页面 |
| 存储 | `android-app/storage.js` | 带恢复日志的多键事务 |
| 1–6 引擎 | `training.js/css`、`descending.py`、原 HTML | 原训练规则、适配和倒序模式 |
| 7–10 引擎 | `tool-rules.js`、`tool-ui.js`、`tool.css`、`tool-motion.js/css`、`tool-audio.js` | 规则、阶段状态、第七项合成图层/入场与可静音短音 |
| 11–16 引擎 | `advanced-rules.js`、`advanced-ui.js`、`advanced-clock.js`、`advanced-audio.js` | 规则、帧时序、音频与教学 |
| 隐藏历史数据 | `arcade-rules.js`、`arcade-store.js` | 只保留历史数据与备份兼容 |
| 样式 | `android-app/styles/` | tokens、shell、training-chrome、dialog-motion |
| 工程 | `android-app/tooling/`、`tests/`、`dev.py` | 元数据、路径、测试凭据、核验与发布 |

表中 `app/` 是 `android-app/app/` 的缩写。原音频为 `android-app/audio/digits.json`。

## 边界

应用脚本按 prepare_assets.py 的显式顺序合成为单一脚本，不依赖运行时网络或模块加载器。
函数跨文件共享同一作用域，状态集中在 state.js，尚未完全转换为依赖注入或 ESM。
备份规划函数不读写 DOM/存储，可独立测试；正式提交仍通过原事务层。

注册表消除了目录、路由和应用记录校验中的最大编号上限；新增训练仍必须实现引擎、结构化记录与测试，不能仅加一条配置就获得玩法。
原六项分支中的项目专有规则仍按编号分派，这是本次保留的兼容边界。

shell.css 保持原样式优先级顺序，移除同选择器被后续覆盖的声明；正式刺激不受通用字号规则影响。
原六项 CSS 保留为只读兼容输入，training-chrome 只处理外围呈现；后续不可批量覆盖刺激样式。
历史 experience/dark-shell 等层与旧发布脚本移至 archive，不参与构建。

根 index.html 仍提供原六项结构化训练源。ui-baseline-150.json 保留旧快照，motion-baseline-161.json 明确绑定已审查的运动改动及原因，其他文件继续校验旧哈希。1.62 追加 motion-baseline-162.json，继续保留旧快照并验证链式改动。详见动态训练优化说明，不可直接修改旧断言。
_hub/hub.template.html 仅作历史留档，当前构建不再读取。独立发布网页不受影响。

## 推荐下一步

每次只改一个训练内核，将其配置/规则/视图再拆分并保留行为回归。训练条件变化须显式升规则版本。
不要在修改目录或主题时同时重写刺激时序。当前不引入大型框架，也不以重新上框架作为目标。

当前 1.62 增加第七项原配色立体高光、逐颗入场、可静音离线短音和目标确认，十球运动改为 10 秒；条件升 v3，兼容旧 v1/v2，详见 [入场与立体效果](MOTION-162.md)。音效由工具引擎在用户点击后实时合成，原第十五项数字音频保留。
