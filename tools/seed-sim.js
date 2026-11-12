// Simulates the client module twice: a fresh install, then a version-1 pool
// with a legacy item, to show the seed batches and the migration.
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

function run(store, locale = 'zh', preview = null) {
  let plugin;
  const win = {
    addEventListener: noop,
    __ModuleLoader__: {
      load: (spec) => {
        plugin = spec.factory(() => React);
      },
    },
  };
  const storage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
  };
  if (preview) storage.setItem('dsh.prompt-pool.preview-locale', preview);
  const ctx = {
    effect: (fn) => {
      const d = fn();
      return typeof d === 'function' ? d : noop;
    },
    get: () => undefined,
    inject: () => noop,
    locale: {
      register: () => noop,
      bind: () => (k) => k,
      subscribe: () => noop,
      getLocale: () => ({ active: locale }),
    },
    slots: { inject: () => noop, register: () => noop },
  };
  new Function('window', 'localStorage', 'require', src)(win, storage, () => React);
  plugin.apply(ctx);
}

const fresh = new Map();
run(fresh);
const freshPool = JSON.parse(fresh.get(KEY));
console.log('fresh install:', freshPool.items.length, 'items, seeded =', freshPool.seeded);
console.log('  pinned (常用):', freshPool.items.filter((i) => i.group === 'builtin:oftenuse').length);
console.log('  snippets (模板):', freshPool.items.filter((i) => i.group === 'builtin:template').length);

const freshEn = new Map();
run(freshEn, 'en');
const freshEnPool = JSON.parse(freshEn.get(KEY));
const enTitles = freshEnPool.items.map((item) => item.title);
console.log('fresh en:', freshEnPool.items.length, 'items, titles =', enTitles.join(' / '));
if (!enTitles.includes('Plan first') || enTitles.some((title) => /[\u4e00-\u9fff]/.test(title))) {
  console.error('[fail] English seeds did not follow the active locale');
  process.exitCode = 1;
}

// A preview override must win over the host locale, so screenshots can be
// seeded in English without changing the host UI.
const previewEn = new Map();
run(previewEn, 'zh', 'en');
const previewTitles = JSON.parse(previewEn.get(KEY)).items.map((item) => item.title);
console.log('preview en:', previewTitles.join(' / '));
if (!previewTitles.includes('Plan first') || previewTitles.some((title) => /[\u4e00-\u9fff]/.test(title))) {
  console.error('[fail] the preview locale override did not seed English');
  process.exitCode = 1;
}

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
console.log('  legacy item kept:', migrated.items.some((item) => item.id === 'seed:plan-first'));
console.log('  templates added:', migrated.items.filter((i) => i.group === 'builtin:template').map((i) => i.title).join(' / '));
console.log('  backup written:', legacy.has(KEY + '.backup'));
if (!migrated.items.some((item) => item.id === 'seed:plan-first')) {
  console.error('[fail] the version-1 item was lost');
  process.exitCode = 1;
}
