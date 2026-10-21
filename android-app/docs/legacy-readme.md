# 专注力小宇宙安卓离线版

**当前版本为 1.40 / versionCode 6，在 1.30 工具版上扩展到十六项。最新结构与验收入口见 [工具版开发说明-1.40.md](工具版开发说明-1.40.md)。以下为留存的 1.2.0 架构说明；娱乐界面不再加载，仅保留数据兼容。**

当前发布目标：1.2.0，versionCode 4。包名 `cn.focusuniverse.offline`，Android 8.0+。

## 构建与边界

从项目根目录执行 `python -X utf8 android-app/build.py`。脚本使用现有 JDK、官方 Android SDK 工具、本机原签名构建；签名密钥在项目之外，不能加入安装包、备份或交付压缩包。更新版本缺少原密钥时构建会失败，不会新建签名冒充升级。

安卓外壳仍从 `https://appassets.androidplatform.net/assets/index.html` 读取内置单文件页面，没有 INTERNET 权限。`MainActivity.java` 提供生命周期、系统返回、文档导入导出和系统减少动画接口。1.2.0 默认打开 `#lobby`；原训练目录 `#home` 和六项训练路由不变。

`prepare_assets.py` 从原网页读取六项训练源文件，组合安卓专用呈现层和新增乐园。根目录网页、`_hub/hub.template.html`、六个原始训练 HTML、已发布站点均不修改。

## 代码位置

| 文件 | 职责 |
| --- | --- |
| `experience.js` / `experience.css` | 原训练目录、记录、设置、备份和训练路由；本版只接入分区与完整备份 |
| `training.js` / `training.css` | 原训练呈现、完整观察时间、计时与 iframe 生命周期；本版不修改 |
| `shell.html` | 大厅与娱乐弹窗的静态结构 |
| `arcade.css` | 限定作用域的大厅、乐园、答题、结算、装饰样式 |
| `arcade-rules.js` | 不依赖 DOM、时钟、存储、安卓的出题、关卡、评分、成长、数据验证和合并规则 |
| `arcade-store.js` | 本机读写、完成保存、装备、删除和重置适配 |
| `arcade.js` | 页面呈现、输入、计时、导航、引导、确认、后台终止与奖励反馈 |
| `storage.js` | 带恢复日志的本机事务；异常回滚，重启时先恢复未提交的多键写入 |

## 数据与计时

- 原键不变：`focus-universe-history-v1`、`focus-universe-settings-v1`、`focus-universe-ui-v1`。
- 乐园使用 `focus-universe-arcade-v1`，其中成绩最近 200 局，最高星级、最佳结果、解锁、装备、引导独立保留。
- `focus-universe-transaction-v1` 是临时恢复日志，成功提交后移除，失败或中断时用旧值恢复。
- 完整备份 envelope version 2，兼容 version 1。旧备份缺少娱乐字段时不修改当前乐园；新版合并按关卡和规则版本取高星级、去重记录、合并有效装备。
- 无效关卡、星级、成绩和装饰会被过滤，无法识别的娱乐 schema 则拒绝整次导入。备份最大 1,200,000 字节。
- 乐园各题在入场过渡结束、显示布局稳定后解锁输入并开始计时，答题提交时停止；本轮时间是五题作答时间之和。题间讲解不计时。
- 只有完成五题才提交娱乐成绩和星级，最后一次有效答案提交即保存；查看结算不重复保存。保存失败可重试，星级与成绩一起提交。
- 标准训练和娱乐结果互不写入。删除成绩不收回探索奖励；完整重置需要另行确认。

## 验证入口

使用当前环境自带 Node 和 Playwright，可执行：

```
node android-app/check_experience.cjs
node android-app/check_finish.cjs
node android-app/check_arcade.cjs
node android-app/check_arcade_edges.cjs
python -X utf8 android-app/verify_release.py
```

脚本目前配置本机 Edge 和依赖路径。浏览器测试只使用隔离的临时配置与本地文件，不访问用户实际 WebView 数据。交付中的预览来自浏览器手机尺寸模拟，不能当作安卓真机验收。

## 扩展约定

新关卡从 `arcade-rules.js` 的配置开始，规则变化必须递增规则版本，避免混比成绩。界面、存储、生命周期通过适配层接入。后续可增加星图导航、六项快递记忆、雷达巡航、汉字遗迹修复、短途探险和同机挑战；本版不展示未实现的可点击入口。微信迁移可复用纯规则和配置，呈现与平台接口仍需单独适配。
