# 统一音效与动效接入

2026-10-22 当前工作区实现，基于 Manifest 1.62 / code 11；本次建立公共能力和两个试点，不改变训练规则，也不代表已发布新的 APK。

## 职责与入口

| 类型 | 实现 | 使用边界 |
| --- | --- | --- |
| 装饰音效、点击动效 | `android-app/shared/feedback.js` 的 `FocusFeedback` | 离线短音、可取消动画；不决定阶段、答案、计分或计时 |
| 普通界面实例 | `android-app/app/feedback.js` 的 `appFeedback` | 先接入“界面设置”按钮；训练打开期间不播放界面装饰音，避免干扰题目 |
| 第七项适配 | `android-app/tool-audio.js` 的 `FocusTrackingAudio` | 继承公共播放能力；保留 `pop(index)` / `count()` / `confirm()` 接口及原频率、包络、音量和间隔 |
| 题目音频 | `android-app/advanced-audio.js` 的 `FocusStereoAudio`、`audio/digits.json` | 保留独立双声道播放、解码、重播和取消；不经过装饰开关 |
| 必要训练运动 | `tool-motion.js/css`、各训练引擎与时钟 | 第七项追踪、目标提示及其他题目刺激继续由训练实现管理 |

普通界面和训练使用同一份播放与动效源码。每个文档拥有自己的实例、音频上下文和取消范围，退出某项时不会关闭题目音频的上下文。`prepare_assets.py` 在应用脚本最前装配公共类，并放入 `trainingPresentation.feedback`；`app/navigation.js` 在三个引擎的 iframe 初始化前注入它。没有运行时下载或全局点击监听器。

## 接入普通界面

在现有操作处理器内显式调用，不重复注册全局监听器：

```js
$('preferencesButton').onclick = () => {
  appFeedback.click($('preferencesButton'));
  preferencesDialog.showModal();
};
```

`click(element)` 同时发起 55ms 轻短音与 140ms 透明度反馈，返回后立即继续业务操作。它不移动按钮位置、不改布局；禁用/移除的按钮、隐藏文档和挂起实例不触发。动画按元素替换，完成后清理；不使用 `fill: forwards` 留下残余样式。鼠标和键盘均走同一业务处理器。

## 接入训练

训练自行决定哪些动作已经被接受、哪些阶段适合声音。当前第七项在作答阶段接受选中/取消选择及有效提交后调用 `click`；超出可选数量、禁用按钮、超时提交不播点击反馈。倒数、逐球入场和确认音仍由原阶段回调触发，不新增答案正确/错误音。

新训练可以使用如下实例，生命周期消息须在自己的引擎里接好：

```js
const feedback = new FocusFeedback({
  sound: () => !config.effectsMuted && localSoundEnabled,
  reduced: () => document.documentElement.dataset.reduced === 'true',
  active: () => state.active
});

function acceptedAnswer(button) {
  // 先使用原规则验证并记录作答时间，再发反馈，不等待声音或动画。
  feedback.click(button);
}

// 若需要阶段短音，在“开始/下一题”的用户手势中解锁：
feedback.unlock(localSoundEnabled); // 不 await，不阻塞训练阶段
// 原阶段时钟到点再调用；play 不会自行开启或恢复音频：
feedback.play('pop', {index: 0});
```

可用预设为 `click`、`pop`、`count`、`confirm`。`unlock()` 返回是否可用；静音视为正常跳过，音频 API 缺失/恢复失败返回 false，仍继续视觉流程。第七项保留原不可用提示。训练不应在每帧调用 `unlock`，也不应把题目素材传给此类。若要复用动效，使用 `animate(element, keyframes, options)`，传入有限时长，不对计分刺激使用通用装饰动画。

## 取消、减少动画和声音开关

- 换题/退出原回合调用 `stop()`，取消当前节点、延后音符和动画，并作废尚未返回的解锁请求；需暂停音频上下文时传 `true`。
- App 后台调用 `suspend()`，恢复仅调用 `activate()`，不会补播。训练仍按原规则中断；第七项用现有 `state.active`、`cancel()` 和 `stop(true)` 处理退出/后台/页面隐藏，不恢复旧回合。
- `focus:motion` 更新减少动画状态后调用 `sync()`；已开始的装饰动画也会取消。第七项正在入场时结束弹出动画，保留逐球显示、静态光圈和原准备时长。正式球体运动继续正常进行。
- “界面设置 → 装饰音效”控制公共装饰短音。`focus:effects` 只由父窗口发到已缓存训练，训练检查 `event.source === parent` 后更新 `config.effectsMuted` 并调用 `sync()`。
- 第七项原设置键 `settings[7].sound=on/off` 保留，界面改称“装饰音效”；与全局开关共同生效。静音不关闭点击动效，减少动画不静音。
- 第十五项的数字声、声道确认、教学重播仍独立；不得因装饰静音跳过题目音频或声道检查。

全局静音字段为原 `focus-universe-ui-v1` 内可选布尔值 `effectsMuted`，缺失时 false，沿用第七项原默认开启行为。完整备份仍 v4，导入兼容 v1–v4：传入合法布尔值则使用备份值，旧备份缺字段或类型不对则保留当前值。仍先纯规划，再通过原事务一次提交记录、设置、界面偏好和历史娱乐数据；失败不得先改内存。未改成绩结构、规则版本、签名、包名或联网权限。

## 验证与后续维护

```powershell
python -X utf8 android-app/dev.py test --suite feedback
python -X utf8 android-app/dev.py test --suite tracking-presentation
python -X utf8 android-app/dev.py test --jobs 3
```

`feedback.cjs` 验证普通界面真实音频图、点击与键盘反馈、静音/减少动画、旧备份偏好兼容、缓存训练开关同步、退出取消、装饰静音与双声道题目音频隔离、音频缺失降级、异步解锁取消和无网络请求。`tracking-presentation.cjs` 验证原倒数/逐球入场/发光、非静音信号、完整 2500ms 确认与 10000ms 普通档运动，并检查作答点击不重启计时、不改变评分；其他时长和旧记录继续由原套件覆盖。

本次源码差异由 `feedback-baseline.json` 链接原 `motion-baseline-162.json`，只允许第七项适配及调用点变化；原规则、运动视图/CSS、原题目音频和旧契约不改。修改公共实现后同步该新契约、相关行为回归及本文；不能仅更新哈希代替验证。

本次执行结果见知识库[验证证据](knowledge-base/EVIDENCE.md)。浏览器音频图与软件时钟不代表安卓真机音量、耳机观感或物理显示时序；APK 静态检查须单独执行，正式发布须按构建文档递增版本并保留旧 APK。
