// Data checks for the single-field, canonical-tab-id model (no migration).
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

const impl = `
const BUILTIN_GROUP = { oftenuse: 'builtin:oftenuse', note: 'builtin:note', template: 'builtin:template' };
${grab('familyOf')}
${grab('groupOf')}
${grab('withGroup')}
${grab('groupForTab')}
${grab('matchesTab')}
return { familyOf, groupOf, withGroup, groupForTab, matchesTab };
`;
const api = new Function(impl)();

let failures = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? '[ok]  ' : '[fail]'} ${label}: ${JSON.stringify(actual)}${ok ? '' : ' ≠ ' + JSON.stringify(expected)}`);
};

// 1. Read path and round-trip.
for (const group of ['builtin:oftenuse', 'builtin:note', 'builtin:template', 'custom:c1', 'workspace:w1']) {
  check(`round-trip ${group}`, api.groupOf(api.withGroup({ id: 'i' }, group)), group);
}
check('missing group falls back to note', api.groupOf({ id: 'i' }), 'builtin:note');
check('junk group falls back to note', api.groupOf({ id: 'i', group: 'nonsense' }), 'builtin:note');

// 2. Tab id === group id: one group per item.
check('note tab', api.matchesTab({ group: 'builtin:note' }, 'builtin:note'), true);
check('note item not in template tab', api.matchesTab({ group: 'builtin:note' }, 'builtin:template'), false);
check('oftenuse item in oftenuse tab', api.matchesTab({ group: 'builtin:oftenuse' }, 'builtin:oftenuse'), true);
check('oftenuse item not in note tab', api.matchesTab({ group: 'builtin:oftenuse' }, 'builtin:note'), false);
check('category item in its tab', api.matchesTab({ group: 'custom:c1' }, 'custom:c1'), true);
check('category item not in note tab', api.matchesTab({ group: 'custom:c1' }, 'builtin:note'), false);
check('workspace item in workspace tab', api.matchesTab({ group: 'workspace:w1' }, 'nested:workspace'), true);
check('workspace item not in note tab', api.matchesTab({ group: 'workspace:w1' }, 'builtin:note'), false);
check('all matches everything', api.matchesTab({ group: 'custom:c1' }, 'all'), true);

// 3. New items inherit the creating tab's group.
check('from note tab', api.groupForTab('builtin:note', ''), 'builtin:note');
check('from template tab', api.groupForTab('builtin:template', ''), 'builtin:template');
check('from category tab', api.groupForTab('custom:c1', ''), 'custom:c1');
check('from workspace tab', api.groupForTab('nested:workspace', 'workspace:w1'), 'workspace:w1');
check('from all falls back to note', api.groupForTab('all', ''), 'builtin:note');

// 4. Family derivation.
check('family builtin', api.familyOf('builtin:note'), 'builtin');
check('family custom', api.familyOf('custom:c1'), 'custom');
check('family workspace', api.familyOf('workspace:w1'), 'workspace');
check('family unknown', api.familyOf('nonsense'), '');

console.log(failures === 0 ? '[ok] all group-model checks passed' : `[fail] ${failures} check(s) failed`);
if (failures > 0) process.exitCode = 1;
