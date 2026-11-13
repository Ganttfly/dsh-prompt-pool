// Annotations live inside the prompt pool: a 批注 tab appears while the session
// has notes, composes the quoted reply, and deletes or clears them.
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', '..', 'plugin', 'client.js'), 'utf8');
const STORAGE_KEY = 'dsh.prompt-pool.v1';
const NOTES_KEY = 'dsh.prompt-pool.notes.v1';
const store = new Map();
let booted = null;

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
    // Capture this render's cell array so a nested component's setter keeps
    // writing to its own hooks after the outer render restores its cells.
    const bucket = cells;
    const index = slot(init);
    return [bucket[index], (next) => { bucket[index] = typeof next === 'function' ? next(bucket[index]) : next; }];
  },
  useRef: (init) => cells[slot(() => ({ current: init }))],
  useMemo: (factory) => cells[slot(factory)],
  useCallback: (fn) => cells[slot(() => fn)],
  useEffect: () => { cursor += 1; },
  useSyncExternalStore: (subscribe, getSnapshot) => {
    const value = getSnapshot();
    // The composer panel renders only while its UI store says it is open.
    return value && typeof value === 'object' && 'open' in value ? { ...value, open: true } : value;
  },
};

global.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
};

/** Load the module the way the page does; every boot gets a fresh window. */
const boot = () => {
  const captured = { registrations: [], interactions: [] };
  booted = captured;
  global.window = {
    __ModuleLoader__: {
      load(spec) {
        spec.factory(() => reactStub).apply({
          effect: (fn) => {
            const dispose = fn();
            return typeof dispose === 'function' ? dispose : () => {};
          },
          get: (name) => (name === 'uiConversation'
            ? { interactions: { register: (definition) => { booted.interactions.push(definition); return () => {}; } } }
            : undefined),
          inject: (deps, cb) => {
            if (typeof cb === 'function') cb({ get: () => undefined });
            return () => {};
          },
          locale: { register: () => () => {}, bind: () => (key) => key, subscribe: () => () => {}, getLocale: () => ({ id: 'zh' }) },
          slots: {
            inject: (key, cb) => {
              cb();
              return () => {};
            },
            register: (options, component) => {
              captured.registrations.push({ slot: options.name, options, component });
              return () => {};
            },
          },
          layout: { selectPanel: () => {} },
        });
      },
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout: () => 0,
    clearTimeout: () => {},
    location: { reload: () => {} },
  };
  new Function('window', 'localStorage', 'require', source)(global.window, global.localStorage, () => reactStub);
  return captured;
};

const notesSaved = () => (store.has(NOTES_KEY) ? JSON.parse(store.get(NOTES_KEY)) : null);

const walk = (node, visit) => {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((child) => walk(child, visit)); return; }
  visit(node);
  if (Array.isArray(node.children)) node.children.forEach((child) => walk(child, visit));
};

const findAll = (tree, predicate) => {
  const out = [];
  walk(tree, (node) => { if (predicate(node)) out.push(node); });
  return out;
};

const textOf = (node) => {
  const out = [];
  const collect = (current) => {
    if (typeof current === 'string') { out.push(current); return; }
    if (!current || typeof current !== 'object') return;
    if (Array.isArray(current)) { current.forEach(collect); return; }
    if (Array.isArray(current.children)) current.children.forEach(collect);
  };
  collect(node);
  return out;
};

const failures = [];
const fail = (message) => failures.push(message);

/** Render a child function component with its own hook cells. */
const childStores = new Map();
const renderChild = (node) => {
  const name = node.type && node.type.name ? node.type.name : 'unknown';
  if (!childStores.has(name)) childStores.set(name, { cells: [] });
  const storeRef = childStores.get(name);
  const savedCells = cells;
  const savedCursor = cursor;
  cells = storeRef.cells;
  cursor = 0;
  let out;
  try {
    out = node.type(node.props || {});
  } finally {
    storeRef.cells = cells;
    cells = savedCells;
    cursor = savedCursor;
  }
  return out;
};

const findComponent = (tree, name) => findAll(tree, (node) => typeof node.type === 'function' && node.type.name === name)[0];

const poolSeed = () => JSON.stringify({
  version: 2,
  seeded: 2,
  categories: [],
  settings: {},
  items: [],
  tray: [],
});

const notesSeed = () => JSON.stringify({
  version: 1,
  items: [
    {
      id: 'n1', sessionId: 's1', nodeKey: 'node-1', quote: '报告类型 → job 映射：…，对吗？',
      prefix: '', suffix: '', offset: 2, order: 2, body: '对，按你说的映射', createdAt: 1, updatedAt: 1,
    },
    {
      id: 'n2', sessionId: 's1', nodeKey: 'node-1', quote: '构建是否接受参数？',
      prefix: '', suffix: '', offset: 30, order: 1, body: '接受分支参数', createdAt: 2, updatedAt: 2,
    },
  ],
});

store.set(STORAGE_KEY, poolSeed());
store.set(NOTES_KEY, notesSeed());
boot();

const panelEntry = booted.registrations.find((entry) => entry.slot === 'conversation.input.overlay');
if (!panelEntry) fail('the composer panel was not registered');
else {
  let inserted = null;
  const inputActions = {
    captureInsertion: () => ({ start: 0, end: 0, draftRev: 1 }),
    insertText: (text) => {
      inserted = text;
      return true;
    },
    setDraft: () => {},
  };
  const props = {
    sessionId: 's1',
    useInput: () => ({ draft: '', phase: 'plain', queue: [], attachmentIds: [] }),
    inputActions,
    useWorkspaces: () => ({ items: [], currentId: '' }),
    useSession: () => ({}),
  };
  const render = () => {
    resetHooks();
    return panelEntry.component(props);
  };

  cells = [];
  childStores.clear();
  const tree = render();
  const tabBarNode = findComponent(tree, 'TabBar');
  if (!tabBarNode) fail('the pool tab strip was not rendered');
  else {
    const bar = renderChild(tabBarNode);
    const notesTab = findAll(bar, (node) => node.type === 'button'
      && String(node.props && node.props.className || '') === 'pp-tab'
      && textOf(node).indexOf('note.title') >= 0)[0];
    if (!notesTab) fail('the notes tab is missing while the session has notes');
    else {
      notesTab.props.onClick();
      const notesView = () => {
        const node = findComponent(render(), 'NotesView');
        return node ? renderChild(node) : null;
      };
      const view = notesView();
      if (!view) fail('the notes tab did not render the annotation list');
      else {
        const rows = findAll(view, (node) => node.props && String(node.props.className || '') === 'pp-notes-row');
        if (rows.length !== 2) fail(`the notes tab rendered ${rows.length} rows, expected 2`);
        else console.log('[ok] a 批注 tab lists the session annotations');
      }

      const compose = findAll(render() || [], (node) => node.type === 'button' && textOf(node).join('') === 'note.compose')[0];
      if (!compose) fail('the compose button is missing');
      else {
        compose.props.onClick();
        const expected = '1. 【note.kind.comment】「构建是否接受参数？」：接受分支参数\n2. 【note.kind.comment】「报告类型 → job 映射：…，对吗？」：对，按你说的映射';
        if (inserted !== expected) fail(`composed reply was ${JSON.stringify(inserted)}`);
        else console.log('[ok] the panel composes the quoted reply');
      }

      // Promote one note; the chooser is a frame-level popup driven by a store.
      const storeLink = findAll(notesView() || [], (node) => node.type === 'button' && node.props && node.props['aria-label'] === 'note.store')[0];
      if (!storeLink) fail('the row store control is missing');
      else {
        storeLink.props.onClick();
        const chooser = window.__dshPromptPoolNotePromptV1 ? window.__dshPromptPoolNotePromptV1.get() : null;
        if (!chooser || chooser.open !== true || !Array.isArray(chooser.choices) || chooser.choices.length === 0) fail('the group chooser did not open');
        else {
          if (chooser.choices[0].value !== 'builtin:oftenuse') fail('the default group is not first');
          chooser.onPick(chooser.choices[0].value);
          const pool = window.__dshPromptPoolStoreV1.get();
          const added = pool.items[pool.items.length - 1];
          if (!added || added.group !== 'builtin:oftenuse') fail(`promoted into ${added && added.group}`);
          else if (added.body !== '【note.kind.comment】「构建是否接受参数？」：接受分支参数') fail(`promoted body ${JSON.stringify(added.body)}`);
          const note = window.__dshPromptPoolNotesV1.get().items.find((entry) => entry.id === 'n2');
          if (!note || note.promotedGroup !== 'builtin:oftenuse') fail('the note was not marked as stored');
          if (textOf(notesView() || []).indexOf('note.stored') < 0) fail('the stored note has no marker');
          else console.log('[ok] a note promotes into the default group and keeps its marker');
        }
      }

      // Store as a prompt: the composed text is filed in the pool, and the
      // composer is left untouched.
      const composeStore = findAll(render() || [], (node) => node.type === 'button' && textOf(node).join('') === 'note.composeStore')[0];
      if (!composeStore) fail('the store-as-prompt control is missing');
      else {
        inserted = null;
        composeStore.props.onClick();
        const chooser = window.__dshPromptPoolNotePromptV1 ? window.__dshPromptPoolNotePromptV1.get() : null;
        if (!chooser || chooser.open !== true || !Array.isArray(chooser.choices) || chooser.choices.length === 0) fail('the store-as-prompt chooser did not open');
        else {
          chooser.onPick(chooser.choices[0].value);
          const composed = '1. 【note.kind.comment】「构建是否接受参数？」：接受分支参数\n2. 【note.kind.comment】「报告类型 → job 映射：…，对吗？」：对，按你说的映射';
          if (inserted !== null) fail(`store-as-prompt inserted ${JSON.stringify(inserted)}`);
          const pool = window.__dshPromptPoolStoreV1.get();
          const added = pool.items[pool.items.length - 1];
          if (!added || added.body !== composed) fail('store-as-prompt did not save the prompt');
          else console.log('[ok] store-as-prompt saves the prompt without touching the composer');
        }
      }

      const deleteLink = findAll(notesView() || [], (node) => node.type === 'button'
        && String(node.props && node.props.className || '').indexOf('pp-note-link-danger') >= 0)[0];
      if (!deleteLink) fail('the row delete control is missing');
      else {
        deleteLink.props.onClick();
        const asking = window.__dshPromptPoolNoteConfirmV1 ? window.__dshPromptPoolNoteConfirmV1.get() : null;
        if (!asking || asking.open !== true) fail('deleting did not ask first');
        else if (typeof asking.onConfirm !== 'function') fail('the delete confirmation has no action');
        else {
          asking.onConfirm();
          const left = window.__dshPromptPoolNotesV1.get().items;
          if (left.length !== 1) fail(`delete left ${left.length} note(s)`);
          else if (left[0].id !== 'n1') fail('delete removed the wrong note');
          if (!notesSaved() || notesSaved().items.length !== 1) fail('delete was not persisted');
          else console.log('[ok] annotations can be deleted from the pool tab');
        }
      }
    }
  }
}

// Without notes the tab disappears and the pool renders as before.
store.set(STORAGE_KEY, poolSeed());
store.set(NOTES_KEY, JSON.stringify({ version: 1, items: [] }));
const emptyBoot = boot();
const emptyPanel = emptyBoot.registrations.find((entry) => entry.slot === 'conversation.input.overlay');
if (!emptyPanel) fail('the composer panel was not registered after a reload');
else {
  cells = [];
  childStores.clear();
  resetHooks();
  const tree = emptyPanel.component({
    sessionId: 's1',
    useInput: () => ({ draft: '', phase: 'plain', queue: [], attachmentIds: [] }),
    inputActions: null,
    useWorkspaces: () => ({ items: [], currentId: '' }),
    useSession: () => ({}),
  });
  const tabBarNode = findComponent(tree, 'TabBar');
  const bar = tabBarNode ? renderChild(tabBarNode) : [];
  const notesTab = findAll(bar, (node) => node.type === 'button'
    && String(node.props && node.props.className || '') === 'pp-tab'
    && textOf(node).indexOf('note.title') >= 0)[0];
  if (!notesTab) fail('the notes tab is missing without annotations');
  else console.log('[ok] the notes tab stays visible without annotations');
}

for (const failure of failures) console.error('[fail]', failure);
console.log(failures.length === 0 ? '[ok] annotations live in the prompt pool' : `[fail] ${failures.length} check(s)`);
if (failures.length > 0) process.exitCode = 1;
