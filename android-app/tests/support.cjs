const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const APP = path.resolve(__dirname, '..');
const ROOT = path.dirname(APP);
const manifest = fs.readFileSync(path.join(APP, 'AndroidManifest.xml'), 'utf8');
const VERSION = manifest.match(/android:versionName="([^"]+)"/)[1];
const VERSION_CODE = Number(manifest.match(/android:versionCode="(\d+)"/)[1]);

function loadPlaywright() {
  const candidates = [
    process.env.FOCUS_PLAYWRIGHT_MODULE,
    'playwright',
    path.join(os.homedir(),
      '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') throw error;
    }
  }
  throw new Error('Playwright not found. Run npm install, or set FOCUS_PLAYWRIGHT_MODULE.');
}

function browserPath() {
  if (process.env.FOCUS_BROWSER) {
    if (!fs.existsSync(process.env.FOCUS_BROWSER)) throw new Error('FOCUS_BROWSER does not exist');
    return process.env.FOCUS_BROWSER;
  }
  if (process.platform !== 'win32') return undefined;
  const dirs = [process.env['ProgramFiles(x86)'], process.env.ProgramFiles, process.env
    .LOCALAPPDATA];
  for (const dir of dirs.filter(Boolean)) {
    for (const suffix of ['Microsoft/Edge/Application/msedge.exe',
        'Google/Chrome/Application/chrome.exe'
      ]) {
      const candidate = path.join(dir, suffix);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return undefined; // Playwright's installed Chromium; no implicit download.
}

module.exports = {
  APP,
  ROOT,
  VERSION,
  VERSION_CODE,
  browserExecutable: browserPath()
};
Object.defineProperty(module.exports, 'playwright', {
  get: loadPlaywright
});
