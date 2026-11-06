// Two follow-ups for the pinned group: keep the 常用 tab when creating there,
// and park the "+" control after 全部 when there is no custom tab yet.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'plugin', 'client.js');
let source = fs.readFileSync(file, 'utf8');

const edits = [
  [
    'if (!inWorkspace && !categoryId) setTab(nextKind);',
    "if (!inWorkspace && !categoryId && tab !== 'pinned') setTab(nextKind);",
    2,
  ],
  [
    "      if (!addPlaced) nodes.unshift(h('span', { key: 'add-custom', className: 'pp-tab-addwrap' }, renderAdd()));",
    "      if (!addPlaced) nodes.splice(1, 0, h('span', { key: 'add-custom', className: 'pp-tab-addwrap' }, renderAdd()));",
    1,
  ],
];

for (const [from, to, expected] of edits) {
  const count = source.split(from).length - 1;
  if (count !== expected) throw new Error(`expected ${expected} matches for "${from.slice(0, 60)}", got ${count}`);
  source = source.split(from).join(to);
}

fs.writeFileSync(file, source);
console.log('follow-ups applied');
