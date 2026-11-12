// Proves a version-1 pool is migrated, not reset: legacy classification maps
// to the group model, the items survive, and the original payload is kept in
// the backup key before the first write.
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', '..', 'plugin', 'client.js'), 'utf8');
const KEY = 'dsh.prompt-pool.v1';
const BACKUP = KEY + '.backup';
const noop = () => {};

const React = {
  createElement: () => ({}),
  Fragment: 'F',
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, noop],
  useEffect: noop,
  useRef: (initial) => ({ current: initial }),
  useMemo: (factory) => factory(),
  useCallback: (fn) => fn,
  useSyncExternalStore: (subscribe, get) => get(),
};

function load(stored) {
  const store = new Map(Object.entries(stored || {}));
  const storage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
  };
  let plugin;
  const win = {
    addEventListener: noop,
    __ModuleLoader__: {
      load: (spec) => {
        plugin = spec.factory(() => React);
      },
    },
  };
  const ctx = {
    effect: (fn) => fn() || noop,
    get: () => undefined,
    inject: (deps, cb) => { if (typeof cb === 'function') cb({ get: () => undefined }); },
    locale: { register: () => noop, bind: () => (key) => key, subscribe: () => noop, getLocale: () => ({ id: 'zh' }) },
    slots: { inject: (name, cb) => { if (typeof cb === 'function') cb(); }, register: noop },
  };
  new Function('window', 'localStorage', 'require', source)(win, storage, () => React);
  // Seeding and migration happen in apply(), where the locale is known.
  plugin.apply(ctx);
  return store;
}

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const legacyRaw = JSON.stringify({
  version: 1,
  seeded: true,
  categories: [{ id: 'c1', name: '工作' }],
  tray: [{ key: 'k1', itemId: 'legacy-pinned', body: 'pinned body', images: [] }],
  items: [
    { id: 'legacy-pinned', kind: 'note', title: '常用', body: 'pinned body', pinned: true, categoryId: '' },
    { id: 'legacy-cat', kind: 'note', title: '分组', body: 'category body', pinned: false, categoryId: 'cat:c1' },
    { id: 'legacy-snippet', kind: 'snippet', title: '模板', body: 'snippet body', pinned: false, categoryId: '' },
  ],
});
const store = load({ [KEY]: legacyRaw });
const migrated = JSON.parse(store.get(KEY));
const byId = new Map(migrated.items.map((item) => [item.id, item]));

check(migrated.version === 2, `stored version is ${migrated.version}, expected 2`);
check(byId.has('legacy-pinned'), 'the pinned legacy item was dropped');
check(byId.has('legacy-cat'), 'the categorized legacy item was dropped');
check(byId.has('legacy-snippet'), 'the snippet legacy item was dropped');
check(byId.get('legacy-pinned') && byId.get('legacy-pinned').group === 'builtin:oftenuse', 'pinned did not map to the frequent group');
check(byId.get('legacy-cat') && byId.get('legacy-cat').group === 'custom:c1', 'categoryId did not map to the custom group');
check(byId.get('legacy-snippet') && byId.get('legacy-snippet').group === 'builtin:template', 'kind=snippet did not map to templates');
check(migrated.seeded === 2, `seed level is ${migrated.seeded}, expected 2`);
check(migrated.items.filter((item) => item.group === 'builtin:template').length === 6, 'the level-2 template seed batch was not added');
check(migrated.tray.length === 1 && migrated.tray[0].itemId === 'legacy-pinned', 'the queued legacy entry was dropped');
check(store.get(BACKUP) === legacyRaw, 'the pre-migration payload was not kept in the backup key');

const v2Raw = JSON.stringify({
  version: 2,
  seeded: 2,
  categories: [],
  settings: {},
  tray: [],
  items: [{ id: 'kept', group: 'builtin:note', title: '', body: 'keep me', images: [] }],
});
const v2Store = load({ [KEY]: v2Raw });
const v2 = JSON.parse(v2Store.get(KEY));
check(v2.items.some((item) => item.id === 'kept' && item.body === 'keep me'), 'a current pool lost an item');
check(!v2Store.has(BACKUP), 'a current pool wrote a needless migration backup');

const unseededRaw = JSON.stringify({ version: 1, seeded: false, categories: [], tray: [], items: [] });
const unseeded = JSON.parse(load({ [KEY]: unseededRaw }).get(KEY));
check(unseeded.items.length === 10, `a fresh-but-old pool added ${unseeded.items.length} seeds, expected 10`);

for (const failure of failures) console.error('[fail]', failure);
console.log(failures.length === 0 ? '[ok] version-1 pools migrate instead of resetting' : `[fail] ${failures.length} check(s)`);
if (failures.length > 0) process.exitCode = 1;
