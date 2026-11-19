// Proves the composer dock strip bridges the pool's send queue to the host's
// own queue: it renders the two counts, pushes every queued entry in order with
// mode 'queue' (never through the composer), and empties the pool send queue.
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
const sessions = { scope: () => ({ conversation }) };

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

new Function('window', 'localStorage', 'require', source)(global.window, global.localStorage, () => reactStub);
const entry = registrations.find((candidate) => candidate.slot === 'conversation.input.dock');
const storeRef = global.window.__dshPromptPoolStoreV1;

// Two messages sit in the host queue; the strip reports only next-turn.
const hostInbox = {
  'next-turn': [{ id: 'm1' }, { id: 'm2' }],
  'next-step': [{ id: 'm3' }],
};
const dockProps = { sessionId: 's1', useProjection: (key) => (key === 'inbox' ? hostInbox : undefined) };

const nodes = (node, out) => {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const child of node) nodes(child, out); return out; }
  out.push(node);
  if (node.children) for (const child of node.children) nodes(child, out);
  return out;
};
const render = (props) => {
  resetHooks();
  return entry.component(props);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const failures = [];

(async () => {
  if (!entry) {
    failures.push('the composer dock cell was not registered');
  } else {
    if (entry.options.id !== 'prompt-pool-queue') failures.push(`dock id is ${entry.options.id}`);
    if (entry.options.order !== 15) failures.push(`dock order is ${entry.options.order}`);

    const tree = render(dockProps);
    const strip = nodes(tree, []).find((node) => node.props && node.props['data-pool'] !== undefined);
    if (!strip) {
      failures.push('the dock strip did not render');
    } else {
      if (strip.props['data-pool'] !== '3') failures.push(`pool count is ${strip.props['data-pool']}, expected 3`);
      if (strip.props['data-host'] !== '2') failures.push(`host count is ${strip.props['data-host']}, expected 2`);
      const texts = nodes(tree, []).flatMap((node) => (Array.isArray(node.children) ? node.children.filter((child) => typeof child === 'string') : []));
      if (texts.indexOf('dock.pool') < 0) failures.push('the pool count label is missing');
      if (texts.indexOf('dock.host') < 0) failures.push('the host count label is missing');
      if (texts.indexOf('dock.pushShort') < 0) failures.push('the push action label is missing');

      const button = nodes(tree, []).find(
        (node) => node.type === 'button' && node.props && String(node.props.className || '').indexOf('pp-dock-btn') >= 0,
      );
      if (!button) {
        failures.push('the push button is missing');
      } else {
        button.props.onClick();
        for (let i = 0; i < 200 && storeRef.get().tray.length > 0; i += 1) {
          render(dockProps);
          await sleep(2);
        }
        if (queued.length !== 3) failures.push(`the host queue got ${queued.length} prompt(s), expected 3`);
        if (queued[0] && queued[0].text !== 'first') failures.push(`first pushed text is ${queued[0] && queued[0].text}`);
        if (queued[1] && queued[1].text !== 'second') failures.push(`second pushed text is ${queued[1] && queued[1].text}`);
        if (queued[2] && queued[2].text !== 'third') failures.push(`third pushed text is ${queued[2] && queued[2].text}`);
        if (queued.some((item) => item.mode !== 'queue')) failures.push('a push used a mode other than queue');
        if (queued[2] && (queued[2].attachmentIds.length !== 1 || queued[2].attachmentIds[0] !== 'draft-0')) {
          failures.push(`the image entry pushed with [${queued[2] && queued[2].attachmentIds.join(', ')}]`);
        }
        if (storeRef.get().tray.length !== 0) failures.push('the pushed entries stayed in the send queue');
      }
    }

    // Nothing staged and nothing queued: the strip stays out of the composer.
    const idle = render({ sessionId: 's1', useProjection: () => ({ 'next-turn': [], 'next-step': [] }) });
    if (idle !== null) failures.push('the strip rendered with both sides empty');
  }

  for (const failure of failures) console.error('[fail]', failure);
  console.log(failures.length === 0 ? '[ok] the composer dock pushes the send queue straight into the host queue' : `[fail] ${failures.length} check(s)`);
  if (failures.length > 0) process.exitCode = 1;
})();
