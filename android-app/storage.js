/* Small synchronous transactions for local WebView storage. No platform dependencies. */
(function (root) {
  'use strict';
  const JOURNAL = 'focus-universe-transaction-v1';
  const KEYS = ['focus-universe-history-v1', 'focus-universe-settings-v1', 'focus-universe-ui-v1', 'focus-universe-arcade-v1'];
  function recover() {
    const raw = localStorage.getItem(JOURNAL);
    if (!raw) return;
    const journal = JSON.parse(raw);
    if (!Array.isArray(journal) || journal.some(p => !Array.isArray(p) || !KEYS.includes(p[0]) || !(p[1] === null || typeof p[1] === 'string'))) throw new Error('存储恢复信息无效，请先保留本机数据。');
    for (const [key, value] of journal) value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value);
    localStorage.removeItem(JOURNAL);
  }
  function transaction(entries) {
    recover();
    if (entries.some(([key, value]) => !KEYS.includes(key) || typeof value !== 'string')) throw new Error('无效的存储操作');
    const previous = entries.map(([key]) => [key, localStorage.getItem(key)]);
    localStorage.setItem(JOURNAL, JSON.stringify(previous));
    try {
      for (const [key, value] of entries) localStorage.setItem(key, value);
      localStorage.removeItem(JOURNAL);
    } catch (error) {
      try { recover(); } catch (_) { /* Preserve journal for recovery on next launch. */ }
      throw new Error('保存失败，未提交本次变更。请释放空间后重试。');
    }
  }
  let recoveryError = null;
  try { recover(); } catch (error) { recoveryError = error.message; }
  root.FocusStorage = { transaction, recover, recoveryError };
})(globalThis);
