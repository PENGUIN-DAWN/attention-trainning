# 训练目录

核对日期：2026-10-21。名称、稳定 ID/key、引擎与规则取自[当前注册表](../../android-app/config/trainings.json)，不是根据历史宣传名称推断。

## 当前十六项

| ID | 当前名称 | 稳定 key | 引擎 | 核心任务 |
| --- | --- | --- | --- | --- |
| 1 | 舒尔特方格 | `schulte` | legacy | 按顺序点击数字，可设置正序或倒序。 |
| 2 | 字色干扰 | `stroop` | legacy | 忽略字义，只回答亮起文字的颜色。 |
| 3 | 数字大小干扰 | `number-size` | legacy | 忽略字号，按数值从小到大选择。 |
| 4 | 六项序列记忆 | `sequence-memory` | legacy | 记住六项，再按原顺序选出。 |
| 5 | 视觉动态感知 | `dynamic-perception` | legacy | 忽略字义，判断刚才的实际变化。 |
| 6 | 视觉完形整合 | `visual-completion` | legacy | 保持部件位置，在脑中合成一个汉字。 |
| 7 | 多目标追踪 | `multi-object-tracking` | tool | 记住亮起的目标，追踪同色运动后的位置。 |
| 8 | 重复数字搜寻 | `duplicate-number` | tool | 选出唯一重复数字所在的两个位置。 |
| 9 | 消失的物品 | `missing-objects` | tool | 同时记住 12 件物品，找出消失的物品。 |
| 10 | 相似字符找异类 | `similar-character` | tool | 看清目标字，点击唯一的异类。 |
| 11 | 规则切换 | `rule-switching` | advanced | 跟随当前提示，判断单双或大小。 |
| 12 | 呼吸聚焦 | `breath-return` | advanced | 关注自然呼吸，察觉走神后温和返回。 |
| 13 | 中央与周边辨认 | `central-peripheral` | advanced | 短暂观察中心与周边，再分别回答。 |
| 14 | 持续监测 | `go-no-go` | advanced | 圆形点击，三角不点击；保持整轮监测。 |
| 15 | 双耳分听 | `dichotic-digits` | advanced | 戴立体声耳机，只回答指定耳朵的数字。 |
| 16 | 串行双目标识别 | `serial-dual-target` | advanced | 同一位置连续呈现，按顺序报告两个数字。 |

历史资料也把 12 称为“呼吸聚焦与注意返回”、14 称为“持续监测与停止点击”、16 称为“快速串行双目标识别”。定位代码应使用稳定 ID/key，不能把别名当成新增项目。

## 去哪里改

| 范围 | 规则、界面与关键入口 |
| --- | --- |
| 目录元数据 | [trainings.json](../../android-app/config/trainings.json)：名称、key、引擎、设置白名单和示例；新增配置本身不会自动实现训练 |
| 1–6 | [training.js](../../android-app/training.js)、[training.css](../../android-app/training.css)、[descending.py](../../android-app/descending.py)，以及根目录原六项 HTML、[index.html](../../index.html) |
| 7–10 | [tool-rules.js](../../android-app/tool-rules.js)、[tool-ui.js](../../android-app/tool-ui.js)、[tool-motion.js](../../android-app/tool-motion.js)、[tool-motion.css](../../android-app/tool-motion.css)、[tool.css](../../android-app/tool.css) |
| 11–16 | [advanced-rules.js](../../android-app/advanced-rules.js)、[advanced-ui.js](../../android-app/advanced-ui.js)、[advanced-clock.js](../../android-app/advanced-clock.js)、[advanced-audio.js](../../android-app/advanced-audio.js) |
| 记录与比较 | [scores.js](../../android-app/app/scores.js)、[records.js](../../android-app/app/records.js)，以及各引擎记录校验函数 |
| 页面装配 | [prepare_assets.py](../../android-app/prepare_assets.py)；输出为生成页面，不直接编辑输出 |

应用层、外围样式与训练刺激的关系详见[架构](../ARCHITECTURE.md)。1.51 的引擎与核心题面沿用 1.50 基线；合理修改引擎需要明确建立新基线，不能仅更新断言掩盖行为变化。

## 参数与成绩的查阅方式

- 1–6 的观察时长、模式和输入要求查注册表、原 HTML 与 `training.js`；不要从描述文案反推完整规则。
- 7–10 的题量、运动/观察时间、网格和预设查 `tool-rules.js`；[1.30 验证记录](../../安卓手机版/验证记录-1.30.md)解释了视频改编及边界。
- 11–16 的固定参数查 `advanced-rules.js`；[1.40 发布说明](../../安卓手机版/更新说明-1.40.md)有完整参数表、教学与计分解释。这些为 App 实现参数，不是治疗剂量。
- 记录的 `module` 是稳定 ID，不是数组下标；`token` 用于轮次去重；历史记录可能只有摘要，不能补造试次。协议见 [model-types.js](../../android-app/app/model-types.js)。
- 7–10 的 detail 为 schema 2，11–16 为 schema 3。1.61 第七项新训练使用规则 v2（速度 0.24/0.27），兼容 v1（0.16/0.18）并分开比较；其余规则版本为 1。备份文件 v4 是另一层版本，不应混淆。见 [动态训练优化](../MOTION-161.md)。
- 训练 6、9 涉及中文输入法；15 为有声项目。实际手机输入法和耳机仍在[真机待验清单](EVIDENCE.md)中。

## 研究与来源材料怎么用

[视频整理](../../训练工具开发/视频第二篇训练项目整理.md)区分原视频任务和 App 改编。[研究候选材料](../../训练工具开发/新增注意训练候选与研究依据-2026-10-21.md)解释训练 11–16 的选题背景及效果证据限制。

这两份文件是设计来源，不是当前实现或效果验收的替代物。本次仅整理其位置与状态，没有重新检索或复核文献结论。
