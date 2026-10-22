const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {
  APP,
  VERSION
} = require('./support.cjs');
const page = fs.readFileSync(path.join(APP, 'assets/index.html'));
const report = {
  version: VERSION,
  html_sha256: crypto.createHash('sha256').update(page).digest('hex'),
  checks: [],
  errors: []
};

try {
  // Registry lookup supports sparse/new IDs and has no special maximum of 16.
  const sandbox = vm.createContext({
    document: {
      getElementById(id) {
        return {
          textContent: JSON.stringify(id === 'trainingRegistry' ?
            [{
              id: 1,
              engine: 'legacy'
            }, {
              id: 77,
              engine: 'advanced'
            }] :
            id === 'trainingData' ? [{
              id: 1
            }, {
              id: 77
            }] : {})
        };
      }
    }
  });
  vm.runInContext(fs.readFileSync(path.join(APP, 'app/registry.js'), 'utf8'), sandbox);
  assert.equal(vm.runInContext('hasTraining(77)', sandbox), true);
  assert.equal(vm.runInContext('hasTraining(16)', sandbox), false);
  assert.equal(vm.runInContext('modulesById.get(77).id', sandbox), 77);
  report.checks.push('Sparse registered IDs route by lookup; unknown IDs remain rejected');

  const context = vm.createContext({
    Blob
  });
  vm.runInContext(fs.readFileSync(path.join(APP, 'app/backup-plan.js'), 'utf8'), context);
  const plan = vm.runInContext('FocusBackup.plan', context);
  const adapters = {
    limit: 24000000,
    hasTraining: id => [1, 11, 16].includes(id),
    validRecord: record => [1, 11, 16].includes(record.module) && typeof record.token ===
      'string',
    cleanDetail: (_, detail) => detail,
    cleanSettings: settings => settings,
    arcadeMerge: value => {
      if (value.bad) throw Error('invalid arcade');
      return value;
    },
    keys: {
      records: 'history',
      settings: 'settings',
      ui: 'ui',
      arcade: 'arcade'
    },
  };
  const current = {
    records: [{
      module: 16,
      token: 'new-existing',
      at: 2,
      summary: 'keep'
    }],
    settings: {
      16: {
        preset: 'current'
      }
    },
    preferences: {
      reduced: true,
      seen: [16]
    }
  };
  const original = JSON.stringify(current);
  const old = {
    app: 'focus-universe',
    version: 1,
    records: [{
      module: 1,
      token: 'old',
      at: 1,
      summary: 'old'
    }]
  };
  const merged = plan(JSON.stringify(old), current, adapters);
  assert.equal(JSON.stringify(current), original);
  assert.equal(merged.records.length, 2);
  assert.equal(merged.settings[16].preset, 'current');
  assert.equal(merged.preferences.reduced, true);
  assert.equal(merged.hasArcade, false);
  assert.equal(merged.entries.length, 3);
  const replay = plan(JSON.stringify(old), {
    ...current,
    records: merged.records
  }, adapters);
  assert.equal(replay.records.length, 2);
  report.checks.push(
    'Old backup merge is pure/idempotent and retains current new settings/preferences and absent entertainment'
    );

  for (const invalid of [{
      ...old,
      version: 999
    }, {
      ...old,
      records: [{
        module: 999,
        token: 'invalid'
      }]
    }, {
      ...old,
      arcade: {
        bad: true
      }
    }]) {
    assert.throws(() => plan(JSON.stringify(invalid), current, adapters));
    assert.equal(JSON.stringify(current), original);
  }
  report.checks.push(
    'Unsupported, unknown-project and malformed-entertainment imports fail before state/storage mutation'
    );

  // The old snapshot is immutable; explicit motion deltas have their own source contract.
  const baseline = JSON.parse(fs.readFileSync(path.join(APP, 'ui-baseline-150.json'), 'utf8'));
  const motion = JSON.parse(fs.readFileSync(path.join(APP, 'motion-baseline-161.json'), 'utf8'));
  assert.deepEqual(Object.keys(motion.changedSources).sort(), [
    'android-app/advanced-ui.js', 'android-app/tool-rules.js', 'android-app/tool-ui.js', 'android-app/training.js'
  ]);
  for (const [name, change] of Object.entries(motion.changedSources)) {
    assert.equal(change.previous_sha256, baseline[name], name);
    assert.ok(change.reason);
    baseline[name] = change.sha256;
  }
  Object.assign(baseline, motion.addedSources);
  for (const [name, expected] of Object.entries(baseline)) {
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.resolve(APP, '..', name
      .replace(/\\/g, '/')))).digest('hex'), expected, name);
  }
  report.checks.push(
    'Historical snapshot unchanged; reviewed motion deltas match new hashes; all other protected sources and old APKs retain their hashes');
  console.log('PASS engineering contracts', report.checks.length);
} catch (error) {
  report.errors.push(error.stack);
  throw error;
} finally {
  fs.writeFileSync(path.join(APP, `../安卓手机版/工程契约验收-${VERSION}.json`), JSON.stringify(report, null,
    2));
}
