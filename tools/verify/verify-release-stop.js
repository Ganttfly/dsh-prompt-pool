// Proves Stop halts a release after the item in flight: the first item is sent,
// the remaining queue stays, and the blocking overlay disappears afterwards.
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
  items: [
    { id: 'i1', group: 'builtin:note', title: 'one', body: 'first', images: [], createdAt: 1, updatedAt: 1 },
    { id: 'i2', group: 'builtin:note', title: 'two', body: 'second', images: [], createdAt: 1, updatedAt: 1 },
    { id: 'i3', group: 'builtin:note', title: 'three', body: 'third', images: [], createdAt: 1, updatedAt: 1 },
  ],
  tray: [
    { key: 'k1', itemId: 'i1', body: 'first', images: [] },
    { key: 'k2', itemId: 'i2', body: 'second', images: [] },
    { key: 'k3', itemId: 'i3', body: 'third', images: [] },
  ],
}));

const composer = { draft: '', phase: 'plain', queue: [], attachmentIds: [], pendingSubmissions: [] };
const inputActions = {
  captureInsertion: () => ({ start: 0, end: 0, draftRev: 1 }),
  insertText: () => true,
  setDraft: (text) => { composer.draft = text; },
  submit: () => { composer.queue.push(composer.draft); composer.draft = ''; },
  addAttachments: () => {},
  removeAttachment: () => {},
  pruneAttachments: () => {},
  persistDraft: () => {},
};
const panelProps = {
  sessionId: 's1',
  useInput: () => composer,
  inputActions,
  useWorkspaces: () => ({ items: [], currentId: '' }),
  useSession: () => ({ pendingSubmissions: [] }),
};

new Function('window', 'localStorage', 'require', source)(global.window, global.localStorage, () => reactStub);
const entry = registrations.find((candidate) => candidate.slot === 'conversation.input.overlay');
const storeRef = global.window.__dshPromptPoolStoreV1;

const nodes = (node, out) => {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const child of node) nodes(child, out); return out; }
  out.push(node);
  if (node.children) for (const child of node.children) nodes(child, out);
  return out;
};
const render = () => {
  resetHooks();
  const out = entry.component(panelProps);
  if (out && typeof out.type === 'function') {
    resetHooks();
    return out.type(out.props || panelProps);
  }
  return out;
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const buttonWith = (tree, label) => nodes(tree, []).find(
  (node) => node.type === 'button' && Array.isArray(node.children) && node.children.indexOf(label) >= 0,
);
const failures = [];

(async () => {
  let tree = render();
  const release = buttonWith(tree, 'tray.release');
  if (!release) {
    failures.push('the release button was not found');
  } else {
    const pending = release.props.onClick();
    tree = render();
    const stop = buttonWith(tree, 'release.stop') || buttonWith(tree, 'release.stopping');
    if (!stop) {
      failures.push('the stop button was not found while releasing');
    } else {
      stop.props.onClick();
    }

    let settled = false;
    Promise.resolve(pending).then(() => { settled = true; }, () => { settled = true; });
    for (let i = 0; i < 300 && !settled; i += 1) {
      render();
      await sleep(10);
    }
    await pending;
    tree = render();
    const left = storeRef.get().tray.map((queued) => queued.key);
    if (left.length !== 2 || left[0] !== 'k2' || left[1] !== 'k3') {
      failures.push(`the tray ended as [${left.join(', ')}], expected [k2, k3]`);
    }
    if (buttonWith(tree, 'release.stop')) failures.push('the release overlay stayed after stopping');
  }

  for (const failure of failures) console.error('[fail]', failure);
  console.log(failures.length === 0 ? '[ok] stop leaves the unsent queue intact' : `[fail] ${failures.length} check(s)`);
  if (failures.length > 0) process.exitCode = 1;
})();
