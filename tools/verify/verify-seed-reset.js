// Proves "Reset built-in prompts" removes/replaces only built-ins, keeps an
// edited built-in as an ordinary item when asked, and leaves custom items and
// the send queue alone. The settings component is driven with a tiny hook runtime.
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(process.env.PP_SOURCE || path.join(__dirname, '..', '..', 'plugin', 'client.js'), 'utf8');
const STORAGE_KEY = 'dsh.prompt-pool.v1';
const registrations = [];
const store = new Map();
let currentLocale = 'en';

let cells = [];
let cursor = 0;
const resetHooks = () => { cursor = 0; };
const slot = (init) => {
  const index = cursor++;
  if (!(index in cells)) cells[index] = typeof init === 'function' ? init() : init;
  return index;
};

const reactStub = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  Fragment: 'Fragment',
  useState: (init) => {
    const index = slot(init);
    return [cells[index], (next) => { cells[index] = typeof next === 'function' ? next(cells[index]) : next; }];
  },
  useRef: (init) => {
    const index = slot(() => ({ current: init }));
    return cells[index];
  },
  useMemo: (factory) => { slot(() => null); return factory(); },
  useCallback: (fn) => cells[slot(() => fn)],
  useEffect: () => { cursor += 1; },
  useSyncExternalStore: (subscribe, getSnapshot) => getSnapshot(),
};

global.window = {
  __ModuleLoader__: {
    load(spec) {
      spec.factory((name) => {
        if (name === 'react') return reactStub;
        throw new Error('unexpected require: ' + name);
      }).apply({
        effect: (fn) => fn() || (() => {}),
        get: () => undefined,
        inject: (deps, cb) => { cb({ get: () => undefined }); },
        locale: { register: () => () => {}, bind: () => (key) => key, subscribe: () => () => {}, getLocale: () => ({ active: currentLocale }) },
        slots: {
          inject: (key, cb) => { cb(); },
          register: (options, component) => { registrations.push({ slot: options.name, component }); },
        },
        layout: { selectPanel: () => {} },
      });
    },
  },
  addEventListener: () => {},
  setTimeout: () => 0,
  clearTimeout: () => {},
  location: { reload: () => {} },
};

global.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
};

new Function('window', 'localStorage', 'require', source)(global.window, global.localStorage, () => reactStub);
const pool = global.window.__dshPromptPoolStoreV1;
const settings = registrations.find((entry) => entry.slot === 'settings.section');
if (!settings) throw new Error('settings.section was not registered');

const nodes = (node, out) => {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const child of node) nodes(child, out); return out; }
  out.push(node);
  if (node.children) for (const child of node.children) nodes(child, out);
  return out;
};
const findAll = (tree, predicate) => nodes(tree, []).filter(predicate);
const findReset = (tree) => nodes(tree, []).find(
  (node) => node.type === 'button' && node.props && node.props['data-pp'] === 'seed-reset',
);
const findConfirm = (tree) => nodes(tree, []).find(
  (node) => typeof node.type === 'function' && node.type.name === 'SeedResetConfirm',
);
const findKeepEdited = (tree) => nodes(tree, []).find((node) => node.type === 'input' && node.props && node.props.name === 'seedKeepEdited');
const seedItems = () => pool.get().items.filter((item) => item.seed === true);
const render = () => {
  resetHooks();
  return settings.component({ currentWorkspaceId: '' });
};

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

// Fixture: 10 English seeds, one edited, one deleted, one custom item, one queued copy.
const state = pool.get();
const items = state.items.map((item) => ({ ...item }));
items.find((item) => item.id === 'seed:plan-first').body = 'edited plan';
const withoutScope = items.filter((item) => item.id !== 'seed:scope-guard');
withoutScope.push({ id: 'custom', group: 'builtin:note', title: 'Custom', body: 'custom body', images: [] });
pool.set({ ...state, items: withoutScope, tray: [{ key: 'k1', itemId: 'seed:plan-first', body: 'edited plan', images: [] }] });

let tree = render();
check(!findConfirm(tree), 'the reset confirmation is shown before the button is clicked');
let reset = findReset(tree);
check(Boolean(reset), 'the reset button is missing');
if (!reset) throw new Error('cannot continue without a reset button');
reset.props.onClick();
tree = render();
let confirm = findConfirm(tree);
check(Boolean(confirm), 'clicking reset did not open a confirmation');
if (!confirm) throw new Error('cannot continue without a confirmation');
check(confirm.props.removed === 8, `keep-edited confirmation removes ${confirm.props.removed}, expected 8`);
check(confirm.props.kept === 1, `keep-edited confirmation keeps ${confirm.props.kept}, expected 1`);
check(confirm.props.added === 10, `keep-edited confirmation adds ${confirm.props.added}, expected 10`);
check(confirm.props.language === 'settings.seedLanguageEn', 'the reset did not follow the English interface');
confirm.props.onConfirm();
tree = render();
check(!findConfirm(tree), 'the confirmation stayed open after reset');
check(seedItems().length === 10, `after reset the pool has ${seedItems().length} seeds, expected 10`);
check(seedItems().every((item) => item.locale === 'en'), 'the fresh seeds are not English');
check(seedItems().some((item) => item.id === 'seed:scope-guard'), 'the deleted seed was not restored');
check(seedItems().some((item) => item.id === 'seed:plan-first' && item.body !== 'edited plan'), 'the edited seed was not replaced');
check(
  pool.get().items.some((item) => item.body === 'edited plan' && item.seed !== true && item.id !== 'seed:plan-first'),
  'the edited built-in was not kept as an ordinary item',
);
check(pool.get().items.some((item) => item.id === 'custom'), 'a custom item was removed');
check(pool.get().tray.length === 1 && pool.get().tray[0].body === 'edited plan', 'the send queue was changed');

// A second pass: drop the language to Chinese and disable "keep edited".
const afterFirst = pool.get();
const nextItems = afterFirst.items.map((item) => ({ ...item }));
const scope = nextItems.find((item) => item.id === 'seed:scope-guard');
if (!scope) throw new Error('the restored seed is missing');
scope.body = 'second edit';
pool.set({ ...afterFirst, items: nextItems });

currentLocale = 'zh';
tree = render();
const keep = findKeepEdited(tree);
check(Boolean(keep), 'the keep-edited checkbox is missing');
if (!keep) throw new Error('cannot continue without the keep-edited checkbox');
check(keep.props.checked === true, 'keep-edited should default to true');
keep.props.onChange();
tree = render();
reset = findReset(tree);
reset.props.onClick();
tree = render();
confirm = findConfirm(tree);
check(Boolean(confirm), 'the second reset did not open a confirmation');
if (!confirm) throw new Error('cannot continue without the second confirmation');
check(confirm.props.removed === 10, `discard-edited confirmation removes ${confirm.props.removed}, expected 10`);
check(confirm.props.kept === 0, `discard-edited confirmation keeps ${confirm.props.kept}, expected 0`);
check(confirm.props.language === 'settings.seedLanguageZh', 'the reset did not follow the Chinese interface');
confirm.props.onConfirm();
tree = render();
check(seedItems().length === 10, `the Chinese reset left ${seedItems().length} seeds, expected 10`);
check(seedItems().every((item) => item.locale === 'zh'), 'the fresh seeds are not Chinese');
check(!seedItems().some((item) => item.body === 'second edit'), 'an edited built-in survived with keep-edited off');
check(pool.get().items.some((item) => item.body === 'edited plan' && item.seed !== true), 'the previously detached edit was lost');
check(pool.get().items.some((item) => item.id === 'custom'), 'a custom item was removed by the second reset');
check(pool.get().tray.length === 1, 'the send queue changed during the second reset');

for (const failure of failures) console.error('[fail]', failure);
console.log(failures.length === 0 ? '[ok] reset built-ins keeps edits when asked and leaves custom items/queue alone' : `[fail] ${failures.length} check(s)`);
if (failures.length > 0) process.exitCode = 1;
