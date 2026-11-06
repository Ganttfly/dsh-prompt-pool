// Simulates the client module twice: a fresh install, then an already-seeded
// v1 pool, to prove both receive the right seed batches.
const fs = require('fs');
const src = fs.readFileSync('plugin/client.js', 'utf8');
const KEY = 'dsh.prompt-pool.v1';

const noop = () => {};
const React = {
  createElement: () => ({}),
  Fragment: 'F',
  useState: (i) => [typeof i === 'function' ? i() : i, noop],
  useEffect: noop,
  useRef: (i) => ({ current: i }),
  useMemo: (f) => f(),
  useCallback: (f) => f,
  useSyncExternalStore: (s, g) => g(),
};

function run(store) {
  const win = { addEventListener: noop, __ModuleLoader__: { load: (spec) => spec.factory(() => React) } };
  const storage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
  };
  const ctx = {
    effect: (fn) => {
      const d = fn();
      return typeof d === 'function' ? d : noop;
    },
    get: () => undefined,
    inject: () => noop,
    locale: { register: () => noop, bind: () => (k) => k, subscribe: () => noop, getLocale: () => ({ id: 'zh' }) },
    slots: { inject: () => noop, register: () => noop },
  };
  new Function('window', 'localStorage', 'require', src)(win, storage, () => React);
}

const fresh = new Map();
run(fresh);
const freshPool = JSON.parse(fresh.get(KEY));
console.log('fresh install:', freshPool.items.length, 'items, seeded =', freshPool.seeded);
console.log('  pinned (常用):', freshPool.items.filter((i) => i.pinned).length);
console.log('  snippets (模板):', freshPool.items.filter((i) => i.kind === 'snippet').length);

const legacy = new Map();
legacy.set(
  KEY,
  JSON.stringify({
    version: 1,
    categories: [{ id: 'c1', name: '我的' }],
    tray: [],
    seeded: true,
    items: [{ id: 'seed:plan-first', kind: 'note', title: '先给方案', body: 'x', pinned: true, categoryId: '' }],
  }),
);
run(legacy);
const migrated = JSON.parse(legacy.get(KEY));
console.log('v1 pool:', migrated.items.length, 'items, seeded =', migrated.seeded);
console.log('  templates added:', migrated.items.filter((i) => i.kind === 'snippet').map((i) => i.title).join(' / '));
console.log('  prompts untouched:', migrated.items.filter((i) => i.kind === 'note').length);
