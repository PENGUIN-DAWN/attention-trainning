const STORAGE_KEY = 'focus-universe-history-v1';
const SETTINGS_KEY = 'focus-universe-settings-v1';
const UI_KEY = 'focus-universe-ui-v1';
const BACKUP_LIMIT = 24000000;
const frames = new Map();
const frameReady = new Set();
let activeModule = null,
  records = [],
  settings = {},
  preferences = {
    reduced: false,
    effectsMuted: false,
    seen: []
  };
let homeScroll = 0,
  routeVersion = 0,
  settledModule = null,
  routeInitialized = false,
  routeAnimation = null,
  toastTimer = 0,
  renderedModule = null;
let systemReduced = false,
  recordFilter = 0;
const mediaReduced = matchMedia('(prefers-reduced-motion: reduce)');
const allowedSettings = Object.fromEntries(trainingRegistry.map(item => [item.id, item.settings]));
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  if (Array.isArray(saved)) records = saved.filter(validRecord).slice(0, 200);
} catch {}
try {
  settings = cleanSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'));
} catch {}
try {
  const saved = JSON.parse(localStorage.getItem(UI_KEY) || '{}');
  preferences = {
    reduced: saved.reduced === true,
    effectsMuted: saved.effectsMuted === true,
    seen: Array.isArray(saved.seen) ? saved.seen.filter(n => Number.isInteger(n) && hasTraining(
      n)) : []
  };
} catch {}
