/** Pure import planning. Validation/merging finishes before any storage or UI mutation. */
const FocusBackup = (() => {
  function plan(text, current, adapters) {
    if (typeof text !== 'string' || new Blob([text]).size > adapters.limit) {
      throw new Error('备份文件过大');
    }
    const backup = JSON.parse(text);
    if (!backup || backup.app !== 'focus-universe' ||
      ![1, 2, 3, 4].includes(backup.version) ||
      !Array.isArray(backup.records) || backup.records.length > 200 ||
      !backup.records.every(adapters.validRecord)) {
      throw new Error('备份格式无效，原有记录未改动。');
    }

    const merged = new Map(current.records.map(item => [item.token, item]));
    for (const record of backup.records) {
      if (merged.has(record.token)) continue;
      const item = {
        module: record.module,
        token: record.token,
        at: record.at,
        summary: record.summary,
      };
      const detail = adapters.cleanDetail(record.module, record.detail);
      if (detail) item.detail = detail;
      merged.set(item.token, item);
    }
    const records = [...merged.values()].sort((a, b) => b.at - a.at).slice(0, 200);
    const settings = adapters.cleanSettings({
      ...current.settings,
      ...backup.settings
    });
    const incomingSeen = Array.isArray(backup.preferences?.seen) ?
      backup.preferences.seen.filter(adapters.hasTraining) : [];
    const preferences = {
      reduced: typeof backup.preferences?.reduced === 'boolean' ?
        backup.preferences.reduced : current.preferences.reduced,
      seen: [...new Set([...current.preferences.seen, ...incomingSeen])],
    };
    const entries = [
      [adapters.keys.records, JSON.stringify(records)],
      [adapters.keys.settings, JSON.stringify(settings)],
      [adapters.keys.ui, JSON.stringify(preferences)],
    ];
    const hasArcade = backup.arcade !== undefined;
    if (hasArcade) entries.push([adapters.keys.arcade,
      JSON.stringify(adapters.arcadeMerge(backup.arcade))
    ]);
    return {
      records,
      settings,
      preferences,
      entries,
      hasArcade
    };
  }
  return Object.freeze({
    plan
  });
})();
