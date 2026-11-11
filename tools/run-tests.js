// Run the whole check suite the way CI does. Each script is executed in its
// own process so a thrown error cannot hide the later checks.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const verifyDir = path.join(root, 'tools', 'verify');
const scripts = [
  'tools/smoke.js',
  'tools/render-smoke.js',
  'tools/group-model-test.js',
  'tools/seed-sim.js',
  'tools/workspace-rail-test.js',
  ...fs
    .readdirSync(verifyDir)
    .filter((name) => name.endsWith('.js'))
    .sort()
    .map((name) => path.join('tools', 'verify', name)),
];

let failed = 0;
for (const script of scripts) {
  process.stdout.write(`\n== ${script}\n`);
  const result = spawnSync(process.execPath, [path.join(root, script)], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) {
    failed += 1;
    console.error(`FAILED ${script}`);
  }
}

console.log(failed === 0 ? `\n[ok] ${scripts.length} scripts passed` : `\n[fail] ${failed} script(s) failed`);
process.exitCode = failed === 0 ? 0 : 1;
