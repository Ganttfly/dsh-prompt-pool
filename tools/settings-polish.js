// Settings polish: stronger card border, hint above the options, plain labels.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'plugin', 'client.js');
let source = fs.readFileSync(file, 'utf8');

const edits = [
  // Plain option labels — the card title already says "which comes first".
  ["'settings.leading.workspace': '【当前工作区】前置',", "'settings.leading.workspace': '当前工作区',"],
  ["'settings.leading.custom': '【自定义分组】前置',", "'settings.leading.custom': '自定义分组',"],
  ["'settings.leading.builtin': '【内置分组】前置',", "'settings.leading.builtin': '内置分组',"],
  ["'settings.leading.workspace': 'Current workspace first',", "'settings.leading.workspace': 'Current workspace',"],
  ["'settings.leading.custom': 'Custom groups first',", "'settings.leading.custom': 'Custom groups',"],
  ["'settings.leading.builtin': 'Built-in groups first',", "'settings.leading.builtin': 'Built-in groups',"],

  // Hint goes above the radio rows.
  [
    `          h('div', { className: 'pp-set-label' }, translate('settings.leading')),\n          ['workspace', 'custom', 'builtin'].map((name) =>`,
    `          h('div', { className: 'pp-set-label' }, translate('settings.leading')),\n          h('div', { className: 'pp-hint pp-set-hint' }, translate('settings.leadingHint')),\n          ['workspace', 'custom', 'builtin'].map((name) =>`,
  ],
  [
    `          ),\n          h('div', { className: 'pp-hint pp-set-hint' }, translate('settings.leadingHint')),\n        ),\n      );`,
    `          ),\n        ),\n      );`,
  ],

  // Prominent card edge.
  [
    "'.pp-set-card{padding:10px 12px;border:1px solid var(--pp-line);border-radius:10px;background:var(--pp-surface)}'",
    "'.pp-set-card{padding:10px 12px;border:1px solid var(--pp-line-2);border-radius:10px;background:var(--pp-surface);box-shadow:0 1px 3px rgba(0,0,0,.08)}'",
  ],
  [
    "'.pp-set-card .pp-set-hint{padding-left:0;margin-top:6px}'",
    "'.pp-set-card .pp-set-hint{padding-left:0;margin:2px 0 8px}'",
  ],
];

for (const [from, to] of edits) {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`expected 1 match for "${from.slice(0, 60)}", got ${count}`);
  source = source.split(from).join(to);
}

fs.writeFileSync(file, source);
console.log('settings card polished');
