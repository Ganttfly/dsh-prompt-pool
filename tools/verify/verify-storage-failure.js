// Proves a failed localStorage write is visible: the page shows the storage
// warning instead of pretending the change was saved, and a working store
// shows no warning.
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', '..', 'plugin', 'client.js'), 'utf8');
const KEY = 'dsh.prompt-pool.v1';
const noop = () => {};

const React = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  Fragment: 'F',
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, noop],
  useEffect: noop,
  useRef: (initial) => ({ current: initial }),
  useMemo: (factory) => factory(),
  useCallback: (fn) => fn,
  useSyncExternalStore: (subscribe, get) => get(),
};

function load(storage) {
  const registrations = [];
  global.window = {
    __ModuleLoader__: {
      load(spec) {
        const mod = spec.factory((name) => {
          if (name === 'react') return React;
          throw new Error('unexpected require: ' + name);
        });
        mod.apply({
          effect: (fn) => fn() || noop,
          get: (name) =>
            name === 'betterSidebar'
              ? { registerTab: (descriptor) => { registrations.push({ slot: 'betterSidebar.tab', component: descriptor.component }); } }
              : undefined,
          inject: (deps, cb) => { if (typeof cb === 'function') cb({ get: () => undefined }); },
          locale: {
            register: () => noop,
            bind: () => (key) => key,
            subscribe: () => noop,
            getLocale: () => ({ id: 'zh' }),
          },
          slots: {
            inject: (name, cb) => { if (typeof cb === 'function') cb(); },
            register: (options, component) => { registrations.push({ slot: options.name, component }); },
          },
          layout: { selectPanel: noop },
        });
      },
    },
    addEventListener: noop,
    setTimeout: () => 0,
    clearTimeout: noop,
    location: { reload: noop },
  };
  global.localStorage = storage;
  new Function('window', 'localStorage', 'require', source)(global.window, storage, () => React);
  return registrations;
}

const nodes = (node, out) => {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const child of node) nodes(child, out); return out; }
  out.push(node);
  if (node.children) for (const child of node.children) nodes(child, out);
  return out;
};
const renderPage = (registrations) => {
  const entry = registrations.find((candidate) => candidate.slot === 'betterSidebar.tab');
  if (!entry) return null;
  const root = (node) => (node && typeof node.type === 'function' ? root(node.type(node.props || {})) : node);
  return root(entry.component({}));
};
const hasWarning = (tree) => nodes(tree, []).some(
  (node) => Array.isArray(node.children) && node.children.indexOf('status.storageFailed') >= 0,
);

const failures = [];

const failing = new Map();
const failingStorage = {
  getItem: (key) => (failing.has(key) ? failing.get(key) : null),
  setItem: () => { throw new Error('quota exceeded'); },
};
const failedTree = renderPage(load(failingStorage));
if (!failedTree) failures.push('the page did not register without a working store');
else if (!hasWarning(failedTree)) failures.push('a failed write did not show the storage warning');

const working = new Map();
const workingStorage = {
  getItem: (key) => (working.has(key) ? working.get(key) : null),
  setItem: (key, value) => working.set(key, String(value)),
};
const okTree = renderPage(load(workingStorage));
if (!okTree) failures.push('the page did not register with a working store');
else if (hasWarning(okTree)) failures.push('a healthy store showed the storage warning');

for (const failure of failures) console.error('[fail]', failure);
console.log(failures.length === 0 ? '[ok] a failed storage write is surfaced' : `[fail] ${failures.length} check(s)`);
if (failures.length > 0) process.exitCode = 1;
