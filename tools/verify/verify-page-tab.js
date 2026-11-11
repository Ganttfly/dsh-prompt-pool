// Proves the sidebar page keeps its active group tab when the host remounts
// the pane (for example after looking at another sidebar tab).
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', '..', 'plugin', 'client.js'), 'utf8');
const KEY = 'dsh.prompt-pool.v1';
const registrations = [];
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
  useRef: (init) => {
    const index = slot(() => ({ current: init }));
    return cells[index];
  },
  useMemo: (factory) => { slot(() => null); return factory(); },
  useCallback: (fn) => { slot(() => fn); return fn; },
  useEffect: () => { cursor += 1; },
  useSyncExternalStore: (subscribe, getSnapshot) => {
    const value = getSnapshot();
    return value && typeof value === 'object' && 'open' in value ? { ...value, open: true } : value;
  },
};

global.window = {
  __ModuleLoader__: {
    load(spec) {
      spec.factory((name) => {
        if (name === 'react') return reactStub;
        throw new Error('unexpected require: ' + name);
      }).apply({
        effect: (fn) => fn() || (() => {}),
        get: (name) =>
          name === 'betterSidebar'
            ? { registerTab: (descriptor) => { registrations.push({ slot: 'betterSidebar.tab', component: descriptor.component }); } }
            : undefined,
        inject: (deps, cb) => { cb({ get: () => undefined }); },
        locale: { register: () => () => {}, bind: () => (key) => key, subscribe: () => () => {}, getLocale: () => ({ id: 'zh' }) },
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

store.set(KEY, JSON.stringify({
  version: 2,
  seeded: 2,
  categories: [],
  settings: {},
  items: [{ id: 'i1', group: 'builtin:note', title: 'note', body: 'body', images: [], createdAt: 1, updatedAt: 1 }],
  tray: [],
}));

new Function('window', 'localStorage', 'require', source)(global.window, global.localStorage, () => reactStub);
const entry = registrations.find((candidate) => candidate.slot === 'betterSidebar.tab');

const nodes = (node, out) => {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const child of node) nodes(child, out); return out; }
  out.push(node);
  if (node.children) for (const child of node.children) nodes(child, out);
  return out;
};
const render = () => {
  resetHooks();
  const out = entry.component({});
  if (out && typeof out.type === 'function') {
    resetHooks();
    return out.type(out.props || {});
  }
  return out;
};
const tabBar = (tree) => nodes(tree, []).find((node) => typeof node.type === 'function' && node.type.name === 'TabBar');

const failures = [];
let tree = render();
let bar = tabBar(tree);
if (!bar) {
  failures.push('the tab bar was not rendered');
} else {
  if (bar.props.active !== 'all') failures.push(`the page started on ${bar.props.active}, expected all`);
  bar.props.onSelect('builtin:note');
  tree = render();
  bar = tabBar(tree);
  if (!bar || bar.props.active !== 'builtin:note') failures.push(`selecting Notes left ${bar && bar.props.active}`);

  // Remount: drop the component's hook cells, keep only the host-level state.
  cells = [];
  cursor = 0;
  tree = render();
  bar = tabBar(tree);
  if (!bar) failures.push('the tab bar disappeared after a remount');
  else if (bar.props.active !== 'builtin:note') failures.push(`a remount fell back to ${bar.props.active}, expected builtin:note`);
}

for (const failure of failures) console.error('[fail]', failure);
console.log(failures.length === 0 ? '[ok] the page keeps its tab across a remount' : `[fail] ${failures.length} check(s)`);
if (failures.length > 0) process.exitCode = 1;
