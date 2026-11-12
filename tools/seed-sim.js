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

// Switching the interface language swaps untouched built-in items in place,
// while edited and deleted built-ins stay as the user left them.
const switched = new Map();
run(switched, 'zh');
run(switched, 'en');
const switchedPool = JSON.parse(switched.get(KEY));
const switchedTitles = switchedPool.items.map((item) => item.title);
console.log('switch zh->en:', switchedTitles.join(' / '));
if (
  switchedPool.items.length !== 10 ||
  !switchedTitles.includes('Plan first') ||
  switchedTitles.some((title) => /[\u4e00-\u9fff]/.test(title)) ||
  switchedPool.items.some((item) => item.locale !== 'en')
) {
  console.error('[fail] untouched seeds did not switch language');
  process.exitCode = 1;
}

const edited = new Map();
run(edited, 'zh');
const editedPool = JSON.parse(edited.get(KEY));
const editedSeed = editedPool.items.find((item) => item.id === 'seed:plan-first');
editedSeed.body = 'my custom edit';
edited.set(KEY, JSON.stringify(editedPool));
run(edited, 'en');
const editedAfter = JSON.parse(edited.get(KEY));
const editedKept = editedAfter.items.find((item) => item.id === 'seed:plan-first');
console.log('edited seed after switch:', editedKept && editedKept.body);
if (!editedKept || editedKept.body !== 'my custom edit' || editedAfter.items.filter((item) => item.locale === 'en').length !== 9) {
  console.error('[fail] an edited seed was overwritten');
  process.exitCode = 1;
}

const deleted = new Map();
run(deleted, 'zh');
const deletedPool = JSON.parse(deleted.get(KEY));
deletedPool.items = deletedPool.items.filter((item) => item.id !== 'seed:plan-first');
deleted.set(KEY, JSON.stringify(deletedPool));
run(deleted, 'en');
const deletedAfter = JSON.parse(deleted.get(KEY));
console.log('deleted seed after switch:', deletedAfter.items.length, 'items, present =', deletedAfter.items.some((item) => item.id === 'seed:plan-first'));
if (deletedAfter.items.length !== 9 || deletedAfter.items.some((item) => item.id === 'seed:plan-first')) {
  console.error('[fail] a deleted seed was restored by the language switch');
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
