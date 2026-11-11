// Proves a new group lands on a tab that exists: folded custom groups go to
// the one "Custom" tab, a hidden family falls back to "All", and the plain
// mode selects the new group tab.
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', '..', 'plugin', 'client.js'), 'utf8');
const KEY = 'dsh.prompt-pool.v1';
const registrations = [];
const store = new Map();

// Each rendered component gets its own cell pool. Setters capture the pool they
// were created in, so the page and the tab bar never overwrite each other.
let pageState = { cells: [], cursor: 0 };
let barState = { cells: [], cursor: 0 };
let current = pageState;

const resetHooks = () => { current.cursor = 0; };
const slot = (init) => {
  const index = current.cursor++;
  if (!(index in current.cells)) current.cells[index] = typeof init === 'function' ? init() : init;
  return index;
};

const reactStub = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  Fragment: 'Fragment',
  useState: (init) => {
    const index = slot(init);
    const state = current;
    return [state.cells[index], (next) => {
      state.cells[index] = typeof next === 'function' ? next(state.cells[index]) : next;
    }];
  },
  useRef: (init) => {
    const index = slot(() => ({ current: init }));
    return current.cells[index];
  },
  useMemo: (factory) => { slot(() => null); return factory(); },
  useCallback: (fn) => { slot(() => fn); return fn; },
  useEffect: () => { current.cursor += 1; },
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

const nodes = (node, out) => {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const child of node) nodes(child, out); return out; }
  out.push(node);
  if (node.children) for (const child of node.children) nodes(child, out);
  return out;
};

const loadPage = () => {
  delete global.window.__dshPromptPoolStoreV1;
  const before = registrations.length;
  new Function('window', 'localStorage', 'require', source)(global.window, global.localStorage, () => reactStub);
  const entry = registrations.slice(before).find((candidate) => candidate.slot === 'betterSidebar.tab');
  return () => {
    current = pageState;
    resetHooks();
    const out = entry.component({});
    if (out && typeof out.type === 'function') {
      resetHooks();
      return out.type(out.props || {});
    }
    return out;
  };
};

const renderBar = (tree) => {
  const tabBar = nodes(tree, []).find((node) => typeof node.type === 'function' && node.type.name === 'TabBar');
  if (!tabBar) return null;
  current = barState;
  barState.cursor = 0;
  const out = tabBar.type(tabBar.props);
  current = pageState;
  return out;
};

const findAdd = (tree) => nodes(tree, []).find((node) => node.type === 'button' && node.props && node.props.title === 'tab.add');
const findNameInput = (tree) => nodes(tree, []).find((node) => node.type === 'input' && node.props && node.props.placeholder === 'tab.namePlaceholder');
const findActiveLabel = (tree) => {
  const active = nodes(tree, []).find((node) => node.type === 'button' && node.props && node.props['data-active'] === 'true');
  return active && Array.isArray(active.children) ? active.children[0] : undefined;
};

const cases = [
  { mode: 'nested', expected: 'row.familyCustom' },
  { mode: 'hidden', expected: 'tab.all' },
  { mode: 'tabs', expected: 'New' },
];
const failures = [];

for (const { mode, expected } of cases) {
  store.set(KEY, JSON.stringify({
    version: 2,
    seeded: 2,
    categories: [],
    settings: { display: { custom: mode } },
    items: [],
    tray: [],
  }));
  const render = loadPage();
  pageState = { cells: [], cursor: 0 };
  barState = { cells: [], cursor: 0 };
  current = pageState;

  let bar = renderBar(render());
  if (!bar) { failures.push(`${mode}: the tab bar was not rendered`); continue; }

  const add = findAdd(bar);
  if (!add) { failures.push(`${mode}: the add-group button was not found`); continue; }
  add.props.onClick();
  bar = renderBar(render());

  let input = findNameInput(bar);
  if (!input) { failures.push(`${mode}: clicking add did not open the name field`); continue; }
  input.props.onChange({ target: { value: 'New' } });
  bar = renderBar(render());

  input = findNameInput(bar);
  if (!input) { failures.push(`${mode}: the name field disappeared`); continue; }
  input.props.onKeyDown({ key: 'Enter', preventDefault: () => {} });
  bar = renderBar(render());

  const label = findActiveLabel(bar);
  if (label !== expected) failures.push(`${mode}: the active tab is ${label}, expected ${expected}`);
  const pool = global.window.__dshPromptPoolStoreV1;
  if (!pool || pool.get().categories.length !== 1) failures.push(`${mode}: the group was not stored`);
}

for (const failure of failures) console.error('[fail]', failure);
console.log(failures.length === 0 ? '[ok] a new group selects a tab that exists' : `[fail] ${failures.length} check(s)`);
if (failures.length > 0) process.exitCode = 1;
