# 数据与签名边界

## 本地数据

- `focus-universe-history-v1`：训练记录，最多200轮。
- `focus-universe-settings-v1`：原训练设置。
- `focus-universe-ui-v1`：首次引导与减少动画偏好。
- `focus-universe-arcade-v1`：不再展示的历史娱乐数据，继续保留及备份。
- `focus-universe-transaction-v1`：临时事务恢复日志。

完整备份仍为v4，导入兼容v1–v4。旧备份缺少新字段时不清空现有新增数据。记录schema、完整条件与规则版本按原实现校验，不补造旧成绩。

1.61 第七项使用规则 v2，旧 v1 的 0.16/0.18 速度条件仍按原值校验和导入，v2 为 0.24/0.27。规则版本与完整参数共同构成比较分组；不会把旧成绩重标为新速度。其余工具训练继续使用规则 v1，备份文件版本不变。

真实个人备份不应提交到公共仓库。仓库中的验收JSON和预览成绩来自自动化测试，与用户真实手机记录无关。

## 覆盖安装

包名：`cn.focusuniverse.offline`。当前versionName为1.62、versionCode为11；WebView来源保持`https://appassets.androidplatform.net/assets/index.html`。

公开的签名证书SHA-256为：

```
a29e71972abb4c5c1a80ee4df9964261903883f1f5cad09d5fefaffa7299be0a
```

证书指纹不是私钥，不能用于签署更新。私钥位于工程外，未上传；升级必须沿用原签名并递增versionCode。没有原私钥时不能冒充覆盖升级。

安装前导出备份，直接更新，不先卸载或清除数据。当前签名/包名/版本静态检查通过，真实覆盖安装仍需手机确认。

1.62 第七项新增规则 v3，十球运动 10000ms、十二球仍 8000ms，入场/高光条件显式记录；兼容原 v1/v2 参数，三个规则与两个预设独立比较。设置白名单新增第七项 sound=on/off，使用原设置存储键，旧设置缺失时默认开启；不升级备份格式。
