// Checks the two retention switches: with them off, an item leaves the pool
// after it is inserted or queued (and can be undone); with the defaults it stays.
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', '..', 'plugin', 'client.js'), 'utf8');
const STORAGE_KEY = 'dsh.prompt-pool.v1';
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
  useRef: (init) => cells[slot(() => ({ current: init }))],
  useMemo: (factory) => cells[slot(factory)],
  useCallback: (fn) => cells[slot(() => fn)],
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
        get: (name) => (name === 'betterSidebar'
          ? {
              registerTab: (descriptor) => { registrations.push({ slot: 'betterSidebar.tab', component: descriptor.component }); return () => {}; },
              updateTab: () => {},
            }
          : undefined),
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
global.localStorage = { getItem: (key) => (store.has(key) ? store.get(key) : null), setItem: (key, value) => store.set(key, String(value)) };

const fixture = (settings) => JSON.stringify({
  version: 2,
  seeded: 2,
  categories: [],
  settings,
  items: [
    { id: 'i1', group: 'builtin:note', title: '一', body: '第一条', images: [] },
    { id: 'i2', group: 'builtin:note', title: '二', body: '第二条', images: [] },
  ],
  tray: [],
});

const panelProps = {
  sessionId: 's1',
  useInput: () => ({ draft: '', phase: 'plain', queue: [], attachmentIds: [] }),
  inputActions: {
    captureInsertion: () => ({ start: 0, end: 0, draftRev: 1 }),
    insertText: () => true,
    setDraft: () => {},
    submit: () => {},
    addAttachments: () => {},
    removeAttachment: () => {},
    pruneAttachments: () => {},
    persistDraft: () => {},
  },
  useWorkspaces: () => ({ items: [], currentId: '' }),
  useSession: () => ({}),
};

const nodes = (node, out) => {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { node.forEach((child) => nodes(child, out)); return out; }
  out.push(node);
  if (node.children) node.children.forEach((child) => nodes(child, out));
  return out;
};

const findInsert = (tree) => nodes(tree, []).find((node) => typeof node.type === 'function' && node.type.name === 'IconButton' && node.props && node.props.name === 'insert');
const findQueue = (tree) => nodes(tree, []).find((node) => typeof node.type === 'function' && node.type.name === 'TrayAdd');
const findUndo = (tree) => nodes(tree, []).find(
  (node) => node.type === 'button' && String(node.props && node.props.className).indexOf('pp-link') >= 0
    && Array.isArray(node.children) && node.children.indexOf('status.undo') >= 0,
);

const load = (settings, slotName, props) => {
  store.set(STORAGE_KEY, fixture(settings));
  delete global.window.__dshPromptPoolStoreV1;
  const before = registrations.length;
  new Function('window', 'localStorage', 'require', source)(global.window, global.localStorage, () => reactStub);
  if (process.env.PP_DEBUG) console.log('slots:', registrations.slice(before).map((entry) => entry.slot).join(','));
  const entry = registrations.slice(before).find((candidate) => candidate.slot === slotName);
  const pool = global.window.__dshPromptPoolStoreV1;
  cells = [];
  const tree = () => {
    resetHooks();
    const out = entry.component(props);
    if (out && typeof out.type === 'function') {
      resetHooks();
      return out.type(out.props || props);
    }
    return out;
  };
  return { pool, tree };
};

const failures = [];

const main = async () => {
  // 1. Switch off: inserting takes the item out of the pool, and undo restores it.
  {
    const run = load({ keepAfterInsert: false, keepAfterQueue: false }, 'conversation.input.overlay', panelProps);
    await findInsert(run.tree()).props.onClick();
    const afterInsert = run.tree();
    if (run.pool.get().items.length !== 1) failures.push('off/insert: ' + run.pool.get().items.length + ' item(s) left, expected 1');
    const undo = findUndo(afterInsert);
    if (!undo) failures.push('off/insert: the undo action is missing');
    else {
      undo.props.onClick();
      if (run.pool.get().items.length !== 2) failures.push('off/insert: undo left ' + run.pool.get().items.length + ' item(s)');
    }
  }

  // 2. Default: inserting keeps the item and shows no undo.
  {
    const run = load({}, 'conversation.input.overlay', panelProps);
    await findInsert(run.tree()).props.onClick();
    if (run.pool.get().items.length !== 2) failures.push('on/insert: ' + run.pool.get().items.length + ' item(s) left, expected 2');
    if (findUndo(run.tree())) failures.push('on/insert: an undo toast appeared although nothing was removed');
  }

  // 3. Switch off: queueing removes the pool item but keeps the queued copy.
  {
    const run = load({ keepAfterQueue: false }, 'betterSidebar.tab', {});
    findQueue(run.tree()).props.onClick();
    if (run.pool.get().tray.length !== 1) failures.push('off/queue: tray has ' + run.pool.get().tray.length + ' entry, expected 1');
    if (run.pool.get().items.length !== 1) failures.push('off/queue: ' + run.pool.get().items.length + ' item(s) left, expected 1');
    const undo = findUndo(run.tree());
    if (!undo) failures.push('off/queue: the undo action is missing');
    else {
      undo.props.onClick();
      if (run.pool.get().items.length !== 2) failures.push('off/queue: undo left ' + run.pool.get().items.length + ' item(s)');
    }
  }

  // 4. Default: queueing keeps the item.
  {
    const run = load({}, 'betterSidebar.tab', {});
    findQueue(run.tree()).props.onClick();
    if (run.pool.get().tray.length !== 1) failures.push('on/queue: tray has ' + run.pool.get().tray.length + ' entry, expected 1');
    if (run.pool.get().items.length !== 2) failures.push('on/queue: ' + run.pool.get().items.length + ' item(s) left, expected 2');
  }

  for (const failure of failures) console.error('[fail]', failure);
  console.log(failures.length === 0 ? '[ok] retention switches behave' : '[fail] ' + failures.length + ' check(s)');
  if (failures.length > 0) process.exitCode = 1;
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
