function cleanSettings(raw) {
  const result = {};
  if (!raw || typeof raw !== 'object') return result;
  for (const [id, fields] of Object.entries(allowedSettings))
    for (const [key, values] of Object.entries(fields)) {
      const value = String(raw[id]?.[key] ?? '');
      if (values ? values.includes(value) : /^(1(?:\.[0-9])?|2(?:\.0)?)$/.test(value))(result[
        id] ||= {})[key] = value;
    }
  return result;
}

function validRecord(r) {
  return r && Number.isInteger(r.module) && hasTraining(r.module) && typeof r.token === 'string' &&
    r.token.length <= 200 && Number.isFinite(r.at) && r.at > 0 && r.at < 8640000000000000 &&
    typeof r.summary === 'string' && r.summary.length <= 400 && (engineFor(r.module) === 'legacy' ||
      Boolean(engineFor(r.module) === 'advanced' ? FocusAdvancedRules.cleanDetail(r.module, r
        .detail) : FocusToolRules.cleanDetail(r.module, r.detail)));
}

function summaryFor(id, r) {
  if (engineFor(id) === 'advanced') return (r.status === 'interrupted' ? '中途退出 · ' : '') +
    FocusAdvancedRules.main(id, r);
  if (engineFor(id) !== 'legacy') return (r.status === 'interrupted' ? '中途退出 · ' : '') + '答对 ' + r
    .correct + '/' + r.total + ' 题 · 作答 ' + r.seconds.toFixed(1) + ' 秒';
  if (id === 1) return '找到 ' + r.found + '/25 · ' + r.seconds.toFixed(1) + ' 秒 · 点错 ' + r.errors +
    ' 次';
  if (id === 3) return '一次排对 ' + r.perfect + '/' + r.completed + ' 题 · 点错 ' + r.errors + ' 次';
  if (id === 4) return '位置记对 ' + r.correct + '/6 项 · 每项 ' + (r.duration / 1000).toFixed(1) + ' 秒';
  if (id === 5) return '答对 ' + r.correct + '/' + r.answered + ' 题 · 观察 ' + (r.observationMs / 1000)
    .toFixed(1) + ' 秒';
  return '答对 ' + r.correct + '/' + r.answered + ' 题 · ' + (id === 6 ? '跳过 ' + r.skips + ' 题' :
    '答错 ' + r.errors + ' 题');
}

function detailFor(id, r) {
  if (engineFor(id) === 'advanced') return FocusAdvancedRules.cleanDetail(id, r);
  if (engineFor(id) !== 'legacy') return FocusToolRules.cleanDetail(id, r);
  const d = {
    schema: 1,
    correct: 0,
    total: 0,
    errors: 0,
    seconds: 0,
    condition: ''
  };
  const n = x => Number.isFinite(Number(x)) ? Number(x) : 0;
  if (id === 1) {
    d.correct = n(r.found);
    d.total = 25;
    d.errors = n(r.errors);
    d.seconds = n(r.seconds);
    d.mode = r.mode;
    d.condition = r.mode === 'reverse' ? '倒序 35 秒 · 25 → 1 · 点击 · 五色干扰' : r.mode === 'challenge' ?
      '30 秒挑战' : '完成 25 个';
  } else if (id === 3) {
    d.correct = n(r.perfect);
    d.total = 20;
    d.errors = n(r.errors);
    d.seconds = n(r.total);
    d.average = n(r.average);
    d.condition = '四个数字 · 20 题';
    d.digits = 4;
  } else if (id === 4) {
    d.correct = n(r.correct);
    d.total = 6;
    d.seconds = n(r.seconds);
    d.category = r.category;
    d.durationMs = n(r.duration);
    d.condition = ({
      mixed: '物品与动物混合',
      animals: '动物',
      objects: '物品'
    } [r.category] || '') + ' · 每项 ' + d.durationMs / 1000 + ' 秒';
  } else {
    d.correct = n(r.correct);
    d.total = 20;
    d.errors = n(r.errors);
    d.seconds = n(r.total ?? r.seconds);
    d.average = n(r.average);
    d.condition = id === 2 ? '字色冲突 · 20 题' : id === 5 ? '观察 ' + n(r.observationMs) / 1000 +
      ' 秒 · 20 题' : '左右各 10 题 · 共 20 题';
    if (id === 5) {
      d.observationMs = n(r.observationMs);
      d.replays = n(r.replays);
    }
    if (id === 6) d.skips = n(r.skips);
  }
  return cleanDetail(id, d);
}

function cleanDetail(id, d) {
  if (engineFor(id) === 'advanced') return FocusAdvancedRules.cleanDetail(id, d);
  if (engineFor(id) !== 'legacy') return FocusToolRules.cleanDetail(id, d);
  if (!d || d.schema !== 1 || !Number.isInteger(d.correct) || !Number.isInteger(d.total) || d
    .total !== ({
      1: 25,
      2: 20,
      3: 20,
      4: 6,
      5: 20,
      6: 20
    } [id]) || d.correct < 0 || d.correct > d.total || !Number.isFinite(d.seconds) || d.seconds <
    0 || d.seconds > 604800 || typeof d.condition !== 'string' || d.condition.length > 120)
    return undefined;
  const result = {
    schema: 1,
    correct: d.correct,
    total: d.total,
    seconds: d.seconds,
    condition: d.condition
  };
  for (const key of ['errors', 'average', 'skips', 'replays'])
    if (Number.isFinite(d[key]) && d[key] >= 0 && d[key] <= 604800) result[key] = d[key];
  if (id === 1) {
    if (!['challenge', 'complete', 'reverse'].includes(d.mode)) return undefined;
    result.mode = d.mode;
    if (d.mode === 'reverse') Object.assign(result, {
      ruleVersion: 1,
      direction: 'descending',
      answerMode: 'click',
      limitMs: 35000,
      colors: 5
    });
  }
  if (id === 3) {
    if (d.digits !== 4) return undefined;
    result.digits = 4;
  }
  if (id === 4) {
    if (!['mixed', 'animals', 'objects'].includes(d.category) || ![1000, 1500, 2000].includes(d
        .durationMs)) return undefined;
    result.category = d.category;
    result.durationMs = d.durationMs;
  }
  if (id === 5) {
    if (!Number.isInteger(d.observationMs) || d.observationMs < 1000 || d.observationMs > 2000 || d
      .observationMs % 100 !== 0) return undefined;
    result.observationMs = d.observationMs;
  }
  return result;
}

function conditionKey(r) {
  const d = cleanDetail(r.module, r.detail);
  if (!d) return null;
  if (engineFor(r.module) === 'advanced') return r.module === 12 || d.status !== 'complete' || d
    .validTotal !== d.total ? null : JSON.stringify([r.module, d.ruleVersion, d.params, d.device
      .width, d.device.height, d.device.dpr
    ]);
  if (engineFor(r.module) !== 'legacy') return d.status === 'complete' ? JSON.stringify([r.module, d
    .ruleVersion, d.params
  ]) : null;
  return JSON.stringify([r.module, d.mode ?? null, d.digits ?? null, d.category ?? null, d
    .durationMs ?? null, d.observationMs ?? null
  ]);
}

function isBetter(a, b) {
  if (engineFor(a.module) === 'advanced') {
    if (a.detail.correct !== b.detail.correct) return a.detail.correct > b.detail.correct;
    return a.detail.seconds < b.detail.seconds;
  }
  if (a.detail.correct !== b.detail.correct) return a.detail.correct > b.detail.correct;
  if (engineFor(a.module) !== 'legacy') {
    const hits = d => d.results.reduce((sum, r) => sum + (r.hits || 0), 0);
    if (hits(a.detail) !== hits(b.detail)) return hits(a.detail) > hits(b.detail);
    if (a.detail.errors !== b.detail.errors) return a.detail.errors < b.detail.errors;
  }
  if (a.module === 1 && ['challenge', 'reverse'].includes(a.detail.mode)) return (a.detail.errors ||
    0) < (b.detail.errors || 0);
  return a.detail.seconds < b.detail.seconds;
}

function bestRecords() {
  const map = new Map();
  for (const r of records) {
    const key = conditionKey(r);
    if (key && !map.has(key)) map.set(key, r);
    else if (key && isBetter(r, map.get(key))) map.set(key, r);
  }
  return new Set([...map.values()].map(r => r.token));
}

function mainResult(r) {
  const d = cleanDetail(r.module, r.detail);
  if (!d) return r.summary.split(' · ')[0];
  if (engineFor(r.module) === 'advanced') return (d.status === 'interrupted' ? '中途退出 · ' : '') +
    FocusAdvancedRules.main(r.module, d);
  if (d.status === 'interrupted') return '中途退出 · 已答 ' + d.results.length + ' / ' + d.total + ' 题';
  if (r.module === 1 && d.mode === 'complete' && d.correct === 25) return d.seconds.toFixed(1) +
    ' 秒';
  return (r.module === 3 ? '一次排对 ' : r.module === 4 ? '记对 ' : '') + d.correct + ' / ' + d.total + (r
    .module === 1 ? ' 个' : r.module === 4 ? ' 项' : ' 题');
}
