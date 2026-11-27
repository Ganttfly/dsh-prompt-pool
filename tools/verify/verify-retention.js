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
  initialScope: 'workspace',
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
  useWorkspaces: () => ({
    items: [{ id: 'w1', workspaceId: 'w1', name: 'W', sessionIds: ['s1'] }],
    currentId: 'w1',
  }),
  useSession: () => ({}),
};

const nodes = (node, out) => {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { node.forEach((child) => nodes(child, out)); return out; }
  out.push(node);
  if (node.children) node.children.forEach((child) => nodes(child, out));
  return out;
};

const findInsert = (tree) => nodes(tree, []).find((node) => typeof node.type === 'function'
  && node.type.name === 'RowActionIcon' && node.props && node.props.name === 'insert');
const findQueue = (tree) => nodes(tree, []).find((node) => typeof node.type === 'function'
  && node.type.name === 'RowActionIcon' && node.props && node.props.name === 'plus');
const findUndo = (tree) => nodes(tree, []).find(
  (node) => node.type === 'button' && String(node.props && node.props.className).indexOf('pp-link') >= 0
    && Array.isArray(node.children) && node.children.indexOf('status.undo') >= 0,
);

const load = (settings, slotName, props, dataOverride) => {
  const data = dataOverride ? JSON.parse(JSON.stringify(dataOverride)) : JSON.parse(fixture(settings));
  if (!dataOverride && slotName === 'conversation.input.overlay') {
    data.items = data.items.map((item) => ({ ...item, group: 'workspace:w1' }));
  }
  store.set(STORAGE_KEY, JSON.stringify(data));
  delete global.window.__dshPromptPoolStoreV1;
  const before = registrations.length;
  new Function('window', 'localStorage', 'require', source)(global.window, global.localStorage, () => reactStub);
  if (process.env.PP_DEBUG) console.log('slots:', registrations.slice(before).map((entry) => entry.slot).join(','));
  const entry = registrations.slice(before).find((candidate) => candidate.slot === slotName);
  const pool = global.window.__dshPromptPoolStoreV1;
  cells = [];
  const tree = (nextProps) => {
    const targetProps = nextProps || props;
    resetHooks();
    const out = entry.component(targetProps);
    if (out && typeof out.type === 'function') {
      resetHooks();
      return out.type(out.props || targetProps);
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
    await findInsert(run.tree()).props.onClick({ stopPropagation: () => {} });
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
    await findInsert(run.tree()).props.onClick({ stopPropagation: () => {} });
    if (run.pool.get().items.length !== 2) failures.push('on/insert: ' + run.pool.get().items.length + ' item(s) left, expected 2');
    if (findUndo(run.tree())) failures.push('on/insert: an undo toast appeared although nothing was removed');
  }

  // 3. Switch off: queueing removes the pool item but keeps the queued copy.
  {
    const run = load({ keepAfterQueue: false }, 'betterSidebar.tab', { initialScope: 'global' });
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
    const run = load({}, 'betterSidebar.tab', { initialScope: 'global' });
    const queue = findQueue(run.tree());
    queue.props.onClick();
    queue.props.onClick();
    if (run.pool.get().tray.length !== 1) failures.push('on/queue: a double click added ' + run.pool.get().tray.length + ' entries, expected 1');
    if (run.pool.get().items.length !== 2) failures.push('on/queue: ' + run.pool.get().items.length + ' item(s) left, expected 2');
  }

  // 5. The workspace scope follows the current workspace; prompts are not copied
  // between workspaces and no data migration is needed.
  {
    const workspaceData = {
      version: 2,
      seeded: 2,
      categories: [],
      items: [
        { id: 'w1-a', group: 'workspace:w1', title: 'W1 prompt', body: 'a', images: [] },
        { id: 'w2-b', group: 'workspace:w2', title: 'W2 prompt', body: 'b', images: [] },
      ],
      tray: [],
      settings: {},
    };
    const wsSnapshot = {
      items: [
        { workspaceId: 'w1', name: 'W1', sessionIds: ['s1'] },
        { workspaceId: 'w2', name: 'W2', sessionIds: ['s2'] },
      ],
      currentId: 'w1',
    };
    const propsFor = (sessionId) => ({
      ...panelProps,
      sessionId,
      initialScope: 'workspace',
      useWorkspaces: () => wsSnapshot,
    });
    const textsOf = (run) => {
      const out = [];
      const collect = (node) => {
        if (typeof node === 'string') out.push(node);
        else if (Array.isArray(node)) node.forEach(collect);
        else if (node && typeof node === 'object' && node.children) node.children.forEach(collect);
      };
      collect(run.tree());
      return out;
    };
    const first = load({}, 'conversation.input.overlay', propsFor('s1'), workspaceData);
    const firstTexts = textsOf(first);
    if (firstTexts.indexOf('W1 prompt') < 0 || firstTexts.indexOf('W2 prompt') >= 0) {
      failures.push(`workspace w1 showed ${JSON.stringify(firstTexts)}`);
    }
    const second = load({}, 'conversation.input.overlay', propsFor('s2'), workspaceData);
    const secondTexts = textsOf(second);
    if (secondTexts.indexOf('W2 prompt') < 0 || secondTexts.indexOf('W1 prompt') >= 0) {
      failures.push(`workspace w2 showed ${JSON.stringify(secondTexts)}`);
    }
    if (first.pool.get().items.length !== 2 || second.pool.get().items.length !== 2) {
      failures.push('workspace scoping mutated the prompt data');
    }
  }

  // 6. Queue entries remember the session they were queued for.
  {
    const run = load({}, 'conversation.input.overlay', {
      ...panelProps,
      sessionId: 's1',
      initialScope: 'workspace',
    });
    findQueue(run.tree()).props.onClick();
    const entry = run.pool.get().tray[0];
    if (!entry || entry.targetSessionId !== 's1') {
      failures.push(`queued target was ${entry && entry.targetSessionId}, expected s1`);
    }
  }

  for (const failure of failures) console.error('[fail]', failure);
  console.log(failures.length === 0 ? '[ok] retention switches and workspace scoping behave' : '[fail] ' + failures.length + ' check(s)');
  if (failures.length > 0) process.exitCode = 1;
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

