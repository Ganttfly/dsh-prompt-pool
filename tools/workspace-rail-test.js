// Checks the workspace rail: hidden workspaces drop out, the current one never does.
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'plugin', 'client.js'), 'utf8');

const grab = (name) => {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`missing ${name}`);
  let depth = 0;
  let i = source.indexOf('{', start);
  for (; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  return source.slice(start, i + 1);
};

const api = new Function(`${grab('normalizeSettings')}\n${grab('workspaceRail')}\nreturn { normalizeSettings, workspaceRail };`)();

const all = [
  { id: 'workspace:w1', workspaceId: 'w1', name: 'One' },
  { id: 'workspace:w2', workspaceId: 'w2', name: 'Two' },
  { id: 'workspace:w3', workspaceId: 'w3', name: 'Three' },
];
const names = (list) => list.map((entry) => entry.name);

let failures = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? '[ok]  ' : '[fail]'} ${label}: ${JSON.stringify(actual)}${ok ? '' : ' ≠ ' + JSON.stringify(expected)}`);
};

check('no hidden', names(api.workspaceRail(all, {}, 'w1')), ['One', 'Two', 'Three']);
check('hide one', names(api.workspaceRail(all, { hiddenWorkspaces: ['w2'] }, 'w1')), ['One', 'Three']);
check('current stays even when listed hidden', names(api.workspaceRail(all, { hiddenWorkspaces: ['w1', 'w2'] }, 'w1')), ['One', 'Three']);
check('all hidden keeps the current', names(api.workspaceRail(all, { hiddenWorkspaces: ['w1', 'w2', 'w3'] }, 'w1')), ['One']);
check('all hidden without a current keeps one', names(api.workspaceRail(all, { hiddenWorkspaces: ['w1', 'w2', 'w3'] }, '')), ['One']);
check('current first off keeps order', names(api.workspaceRail(all, { currentWorkspaceTab: false }, 'w3')), ['One', 'Two', 'Three']);
check('current first on leads', names(api.workspaceRail(all, {}, 'w3')), ['Three', 'One', 'Two']);
check('empty roster', api.workspaceRail([], {}, 'w1'), []);

console.log(failures === 0 ? '[ok] all workspace-rail checks passed' : `[fail] ${failures} check(s) failed`);
if (failures > 0) process.exitCode = 1;
