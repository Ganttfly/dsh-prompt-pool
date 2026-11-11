// Proves a release prefers the host queue admission over the composer when the
// conversation service exposes it: text goes straight into the queue and the
// composer's setDraft/submit are never called.
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

const queued = [];
const sessionFace = { prompt: () => {}, beginSubmission: () => {} };
const conversation = {
  createDrafts: (sessionId, files) => files.map((file, index) => ({ id: 'draft-' + index, file })),
  releaseDraftAttachments: () => {},
  scopedSession: () => sessionFace,
  sendSession: (session, text, attachmentIds, mode) => {
    queued.push({ text, attachmentIds, mode });
    return Promise.resolve({ kind: 'success' });
  },
};
const sessions = {
  scope: () => ({ conversation }),
};

global.window = {
  __ModuleLoader__: {
    load(spec) {
      spec.factory((name) => {
        if (name === 'react') return reactStub;
        throw new Error('unexpected require: ' + name);
      }).apply({
        effect: (fn) => fn() || (() => {}),
        get: (name) => {
          if (name === 'conversation') return conversation;
          if (name === 'sessions') return sessions;
          return undefined;
        },
        inject: (deps, cb) => { cb({ get: (name) => (name === 'conversation' ? conversation : name === 'sessions' ? sessions : undefined) }); },
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
  items: [],
  tray: [
    { key: 'k1', itemId: 'i1', body: 'first', images: [] },
    { key: 'k2', itemId: 'i2', body: 'second', images: [] },
    {
      key: 'k3',
      itemId: 'i3',
      body: 'third',
      images: [{ id: 'img1', type: 'image/png', name: 'a.png', path: '', size: 1, thumb: '' }],
    },
  ],
}));

const imageRows = new Map([['img1', new Blob(['x'], { type: 'image/png' })]]);
global.indexedDB = {
  open() {
    const request = {};
    const db = {
      objectStoreNames: { contains: () => true },
      transaction() {
        const tx = {};
        tx.objectStore = () => ({
          get(key) {
            const getRequest = {};
            queueMicrotask(() => {
              getRequest.result = imageRows.get(key) || null;
              if (getRequest.onsuccess) getRequest.onsuccess();
            });
            return getRequest;
          },
          delete() {},
          getAllKeys() {
            const keysRequest = {};
            queueMicrotask(() => {
              keysRequest.result = Array.from(imageRows.keys());
              if (keysRequest.onsuccess) keysRequest.onsuccess();
            });
            return keysRequest;
          },
          put() {},
        });
        queueMicrotask(() => { if (tx.oncomplete) tx.oncomplete(); });
        return tx;
      },
    };
    queueMicrotask(() => {
      request.result = db;
      if (request.onupgradeneeded) request.onupgradeneeded();
      if (request.onsuccess) request.onsuccess();
    });
    return request;
  },
};

const composer = { draft: '', phase: 'plain', queue: [], attachmentIds: [], pendingSubmissions: [] };
const composerCalls = { setDraft: 0, submit: 0, addAttachments: 0 };
const inputActions = {
  captureInsertion: () => ({ start: 0, end: 0, draftRev: 1 }),
  insertText: () => true,
  setDraft: () => { composerCalls.setDraft += 1; },
  submit: () => { composerCalls.submit += 1; },
  addAttachments: () => { composerCalls.addAttachments += 1; },
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
const failures = [];

(async () => {
  const tree = render();
  const release = nodes(tree, []).find(
    (node) => node.type === 'button' && Array.isArray(node.children) && node.children.indexOf('tray.release') >= 0,
  );
  if (!release) {
    failures.push('the release button was not found');
  } else {
    const pending = release.props.onClick();
    let settled = false;
    Promise.resolve(pending).then(() => { settled = true; }, () => { settled = true; });
    for (let i = 0; i < 100 && !settled; i += 1) {
      render();
      await sleep(5);
    }
    await pending;
    if (queued.length !== 3) failures.push(`the host queue got ${queued.length} prompt(s), expected 3`);
    if (queued[0] && queued[0].text !== 'first') failures.push(`first queued text is ${queued[0] && queued[0].text}`);
    if (queued[1] && queued[1].text !== 'second') failures.push(`second queued text is ${queued[1] && queued[1].text}`);
    if (queued[2] && queued[2].text !== 'third') failures.push(`third queued text is ${queued[2] && queued[2].text}`);
    if (queued[2] && (queued[2].attachmentIds.length !== 1 || queued[2].attachmentIds[0] !== 'draft-0')) {
      failures.push(`the image entry queued with [${queued[2] && queued[2].attachmentIds.join(', ')}]`);
    }
    if (composerCalls.setDraft !== 0) failures.push(`setDraft ran ${composerCalls.setDraft} time(s) on the direct path`);
    if (composerCalls.submit !== 0) failures.push(`submit ran ${composerCalls.submit} time(s) on the direct path`);
    if (composerCalls.addAttachments !== 0) failures.push(`addAttachments ran ${composerCalls.addAttachments} time(s) on the direct path`);
    if (storeRef.get().tray.length !== 0) failures.push('the released entries stayed in the queue');
  }

  for (const failure of failures) console.error('[fail]', failure);
  console.log(failures.length === 0 ? '[ok] a direct release never touches the composer' : `[fail] ${failures.length} check(s)`);
  if (failures.length > 0) process.exitCode = 1;
})();
