// Proves the plugin takes the native right-sidebar path when DSH offers it:
// a tab type with a guide entry, the body and title seats, and no better-sidebar
// registration in that case.
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', '..', 'plugin', 'client.js'), 'utf8');
const STORAGE_KEY = 'dsh.prompt-pool.v1';
const store = new Map();

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
  useRef: (init) => cells[slot(() => ({ current: init }))],
  useMemo: (factory) => cells[slot(factory)],
  useCallback: (fn) => cells[slot(() => fn)],
  useEffect: () => { cursor += 1; },
  useSyncExternalStore: (subscribe, getSnapshot) => getSnapshot(),
};

const captured = { types: [], slots: [], betterTabs: [] };

const nativeTabs = {
  register: (definition) => { captured.types.push(definition); return () => {}; },
};

global.window = {
  __ModuleLoader__: {
    load(spec) {
      spec.factory((name) => {
        if (name === 'react') return reactStub;
        throw new Error('unexpected require: ' + name);
      }).apply({
        effect: (fn) => fn() || (() => {}),
        get: (name) => {
          if (name === 'sidebarRightTabs') return nativeTabs;
          if (name === 'betterSidebar') return { registerTab: (descriptor) => { captured.betterTabs.push(descriptor); return () => {}; }, updateTab: () => {} };
          return undefined;
        },
        inject: (deps, cb) => { cb({ get: () => undefined }); return () => {}; },
        locale: { register: () => () => {}, bind: () => (key) => key, subscribe: () => () => {}, getLocale: () => ({ id: 'zh' }) },
        slots: {
          inject: (key, cb) => { const dispose = cb(); return typeof dispose === 'function' ? dispose : () => {}; },
          register: (options, component) => { captured.slots.push({ name: options.name, key: options.key, component }); return () => {}; },
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
global.localStorage = { getItem: (key) => (store.has(key) ? store.get(key) : null), setItem: (key, value) => store.set(key, String(value)) };

store.set(STORAGE_KEY, JSON.stringify({
  version: 2,
  seeded: 2,
  categories: [],
  settings: {},
  items: [{ id: 'i1', group: 'builtin:note', title: '一', body: '第一条', images: [] }],
  tray: [],
}));

new Function('window', 'localStorage', 'require', source)(global.window, global.localStorage, () => reactStub);

const failures = [];
const type = captured.types[0];
if (!type) failures.push('no native tab type was registered');
else {
  if (type.id !== 'dsh-prompt-pool') failures.push(`tab id is ${type.id}`);
  if (type.kind !== 'prompt-pool') failures.push(`tab kind is ${type.kind}`);
  if (typeof type.title !== 'function') failures.push('the tab type has no title function');
  const guide = Array.isArray(type.guide) ? type.guide[0] : null;
  if (!guide) failures.push('the tab type contributes no guide entry');
  else {
    if (typeof guide.title !== 'function' || typeof guide.description !== 'function') failures.push('the guide entry is missing title or description');
    if (typeof guide.icon !== 'function') failures.push('the guide entry is missing an icon component');
  }
}

const body = captured.slots.find((entry) => entry.name === 'sidebar.right.pane.tab');
const title = captured.slots.find((entry) => entry.name === 'sidebar.right.pane.tab.title');
if (!body) failures.push('the body seat was not registered');
else if (body.key !== 'dsh-prompt-pool') failures.push(`the body seat key is ${body.key}`);
if (!title) failures.push('the title seat was not registered');
if (captured.betterTabs.length > 0) failures.push('better-sidebar was also registered while the native registry is present');

if (body && typeof body.component === 'function') {
  cells = [];
  resetHooks();
  let tree = body.component({ sessionId: 's1' });
  if (tree && typeof tree.type === 'function') {
    resetHooks();
    tree = tree.type(tree.props);
  }
  const nodes = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    nodes.push(node);
    if (node.children) node.children.forEach(walk);
  };
  walk(tree);
  const page = nodes.find((node) => node.props && String(node.props.className || '').split(' ').indexOf('pp-page') >= 0);
  if (!page) failures.push('the native body does not render the pool page');
}

for (const failure of failures) console.error('[fail]', failure);
console.log(failures.length === 0 ? '[ok] native right-sidebar registration' : `[fail] ${failures.length} check(s)`);
if (failures.length > 0) process.exitCode = 1;
