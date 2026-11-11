// Dependency-free checks: syntax, version pin, locale parity, dead keys and
// literal translate keys. Run with `npm run lint`.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const failures = [];
const fail = (message) => failures.push(message);

const clientPath = path.join(root, 'plugin', 'client.js');
const client = fs.readFileSync(clientPath, 'utf8');

// 1. Syntax of every JavaScript file that ships or runs the checks.
const jsFiles = [
  path.join(root, 'plugin', 'client.js'),
  path.join(root, 'plugin', 'index.js'),
  path.join(root, 'tools', 'run-tests.js'),
];
const addJs = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) addJs(full);
    else if (entry.name.endsWith('.js')) jsFiles.push(full);
  }
};
for (const sub of ['verify']) {
  const dir = path.join(root, 'tools', sub);
  if (fs.existsSync(dir)) addJs(dir);
}
for (const name of fs.readdirSync(path.join(root, 'tools'))) {
  if (name.endsWith('.js')) jsFiles.push(path.join(root, 'tools', name));
}
for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'ignore' });
  if (result.status !== 0) fail(`syntax: ${path.relative(root, file)}`);
}

// 2. The about card version must match the package version.
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'plugin', 'package.json'), 'utf8'));
const version = /PLUGIN_VERSION = '([^']+)'/.exec(client);
if (!version || version[1] !== pkg.version) fail(`version: client ${version && version[1]} != package ${pkg.version}`);

// 3. Locale dictionaries: same keys in both languages, no duplicates, no dead keys.
const dictionary = (startText) => {
  const start = client.indexOf(startText);
  if (start < 0) throw new Error(`missing ${startText}`);
  const end = client.indexOf('\n    };', start);
  const body = client.slice(start, end);
  return [...body.matchAll(/^\s*'([^']+)':/gm)].map((match) => match[1]);
};
const zh = dictionary('const ZH = {');
const en = dictionary('const EN = {');
const uniqueZh = new Set(zh);
const uniqueEn = new Set(en);
if (uniqueZh.size !== zh.length) fail('locale: duplicate zh key');
if (uniqueEn.size !== en.length) fail('locale: duplicate en key');
for (const key of uniqueZh) if (!uniqueEn.has(key)) fail(`locale: ${key} is missing from en`);
for (const key of uniqueEn) if (!uniqueZh.has(key)) fail(`locale: ${key} is missing from zh`);

// These are built with a template prefix at call time, so they look dead.
const dynamicKeys = new Set([
  'settings.display.builtin',
  'settings.display.custom',
  'settings.display.workspace',
  'settings.mode.tabs',
  'settings.mode.nested',
  'settings.mode.hidden',
]);
for (const key of uniqueZh) {
  const occurrences = client.split(`'${key}'`).length - 1;
  if (occurrences <= 2 && !dynamicKeys.has(key)) fail(`locale: ${key} is never used`);
}

// 4. Every literal translate() key exists.
for (const match of client.matchAll(/translate\('([^']+)'\)/g)) {
  if (!uniqueZh.has(match[1])) fail(`locale: translate('${match[1]}') has no entry`);
}

for (const failure of failures) console.error('[fail]', failure);
console.log(failures.length === 0 ? '[ok] lint passed' : `[fail] ${failures.length} check(s)`);
process.exitCode = failures.length === 0 ? 0 : 1;
