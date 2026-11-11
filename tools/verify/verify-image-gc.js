// Proves the startup sweep deletes image blobs no pool item references and
// keeps the ones it does, using a tiny in-memory IndexedDB stand-in.
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', '..', 'plugin', 'client.js'), 'utf8');
const KEY = 'dsh.prompt-pool.v1';
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

function fakeIndexedDb(keys) {
  const rows = new Map(keys.map((key) => [key, 'blob']));
  const db = {
    objectStoreNames: { contains: () => true },
    transaction() {
      const tx = { oncomplete: null, onerror: null, onabort: null };
      tx.objectStore = () => ({
        put(value, key) { rows.set(key, value); },
        get(key) {
          const request = {};
          queueMicrotask(() => { request.result = rows.get(key) || null; if (request.onsuccess) request.onsuccess(); });
          return request;
        },
        delete(key) { rows.delete(key); },
        getAllKeys() {
          const request = {};
          queueMicrotask(() => { request.result = Array.from(rows.keys()); if (request.onsuccess) request.onsuccess(); });
          return request;
        },
      });
      queueMicrotask(() => { if (tx.oncomplete) tx.oncomplete(); });
      return tx;
    },
  };
  return {
    rows,
    indexedDB: {
      open() {
        const request = {};
        queueMicrotask(() => {
          request.result = db;
          if (request.onupgradeneeded) request.onupgradeneeded();
          if (request.onsuccess) request.onsuccess();
        });
        return request;
      },
    },
  };
}

const broken = JSON.stringify({
  version: 2,
  seeded: 2,
  categories: [],
  settings: {},
  tray: [],
  items: [
    {
      id: 'i1',
      group: 'builtin:note',
      title: '',
      body: 'keep this one',
      images: [{ id: 'keep-1', type: 'image/png', name: 'a.png', path: '', size: 1, thumb: '' }],
      createdAt: 1,
      updatedAt: 1,
    },
  ],
});
const storage = {
  getItem: (key) => (key === KEY ? broken : null),
  setItem: noop,
};

const fake = fakeIndexedDb(['keep-1', 'orphan-1', 'orphan-2']);
global.indexedDB = fake.indexedDB;

const win = {
  addEventListener: noop,
  __ModuleLoader__: { load: (spec) => spec.factory(() => React) },
  // Run the deferred sweep immediately instead of waiting five seconds.
  setTimeout: (fn) => { setTimeout(fn, 0); return 0; },
};
new Function('window', 'localStorage', 'require', source)(win, storage, () => React);

const failures = [];

setTimeout(() => {
  if (!fake.rows.has('keep-1')) failures.push('the referenced image blob was deleted');
  if (fake.rows.has('orphan-1')) failures.push('orphan-1 was not collected');
  if (fake.rows.has('orphan-2')) failures.push('orphan-2 was not collected');
  for (const failure of failures) console.error('[fail]', failure);
  console.log(failures.length === 0 ? '[ok] orphaned image blobs are collected' : `[fail] ${failures.length} check(s)`);
  if (failures.length > 0) process.exitCode = 1;
}, 50);
