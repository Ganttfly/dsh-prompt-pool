// Proves the dock strip never drops a queued prompt when the host exposes no
// queue admission: the push reports it and leaves the pool send queue alone.
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
        locale: { register: () => () => {}, bind: () => (key) => key, subscribe: () => () => {}, getLocale: () => ({ id: 'zh' }) },
        slots: {
          inject: (key, cb) => { cb(); },
          register: (options, component) => { registrations.push({ slot: options.name, options, component }); },
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
  items: [],
  tray: [{ key: 'k1', itemId: 'i1', body: 'only one', images: [] }],
}));

new Function('window', 'localStorage', 'require', source)(global.window, global.localStorage, () => reactStub);
const entry = registrations.find((candidate) => candidate.slot === 'conversation.input.dock');
const storeRef = global.window.__dshPromptPoolStoreV1;
const failures = [];

const nodes = (node, out) => {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const child of node) nodes(child, out); return out; }
  out.push(node);
  if (node.children) for (const child of node.children) nodes(child, out);
  return out;
};
const render = () => {
  resetHooks();
  return entry.component({ sessionId: 's1', useProjection: () => ({ 'next-turn': [], 'next-step': [] }) });
};

const tree = render();
const button = nodes(tree, []).find(
  (node) => node.type === 'button' && node.props && String(node.props.className || '').indexOf('pp-dock-btn') >= 0,
);
if (!button) {
  failures.push('the push button is missing');
} else {
  button.props.onClick();
  render();
  if (storeRef.get().tray.length !== 1) failures.push('the queued entry was dropped without being pushed');
  const note = nodes(render(), []).find((node) => node.props && node.props['data-kind'] === 'error');
  if (!note || note.children[0] !== 'dock.unavailable') {
    failures.push('the strip did not report the missing queue admission');
  }
}

for (const failure of failures) console.error('[fail]', failure);
console.log(failures.length === 0 ? '[ok] a host without queue admission keeps the send queue intact' : `[fail] ${failures.length} check(s)`);
if (failures.length > 0) process.exitCode = 1;
