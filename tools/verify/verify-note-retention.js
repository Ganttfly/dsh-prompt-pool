// Checks the two annotation retention switches: an inserted mark leaves the list
// (and Undo brings it back) unless the user keeps it, and a sent summary takes
// its marks with it unless "keep after sending" is on.
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', '..', 'plugin', 'client.js'), 'utf8');
const STORAGE_KEY = 'dsh.prompt-pool.v1';
const NOTES_KEY = 'dsh.prompt-pool.notes.v1';
const store = new Map();
const registrations = [];

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
    const array = cells;
    return [array[index], (next) => { array[index] = typeof next === 'function' ? next(array[index]) : next; }];
  },
  useRef: (init) => { const index = slot(() => ({ current: init })); return cells[index]; },
  useMemo: (factory) => { slot(() => null); return factory(); },
  useCallback: (fn) => { slot(() => fn); return fn; },
  useEffect: () => { cursor += 1; },
  useSyncExternalStore: (subscribe, getSnapshot) => {
    const value = getSnapshot();
    return value && typeof value === 'object' && 'open' in value ? { ...value, open: true } : value;
  },
};

global.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
};

// The module keeps its toast in the document; a bare stub is enough to reach
// the Undo button that the annotation list offers after a removal.
const element = (tag) => ({
  tagName: tag,
  className: '',
  style: {},
  attrs: {},
  children: [],
  handlers: {},
  setAttribute(key, value) { this.attrs[key] = value; },
  removeAttribute(key) { delete this.attrs[key]; },
  appendChild(child) { this.children.push(child); return child; },
  addEventListener(type, fn) { this.handlers[type] = fn; },
  remove() {},
});
const toastHost = element('div');
global.document = {
  head: element('head'),
  body: toastHost,
  querySelector: () => null,
  createElement: (tag) => element(tag),
  createTextNode: (text) => ({ text }),
};

const note = (id, kind, quote, body, order) => ({
  id, sessionId: 's1', nodeKey: 'node-1', quote, prefix: '', suffix: '', offset: order * 10,
  order, kind, body, images: [], createdAt: order, updatedAt: order,
});
const notesFixture = () => JSON.stringify({
  version: 1,
  items: [
    note('n1', 'agree', 'q1', 'b1', 1),
    note('n2', 'idea', 'q2', 'b2', 2),
    note('n3', 'comment', 'q3', 'b3', 3),
  ],
});

const inserted = [];
const inputActions = {
  captureInsertion: () => ({ start: 0, end: 0, draftRev: 1 }),
  insertText: (text) => { inserted.push(text); return true; },
  setDraft: () => {},
  submit: () => {},
  addAttachments: () => {},
  removeAttachment: () => {},
  pruneAttachments: () => {},
  persistDraft: () => {},
};
const panelProps = {
  sessionId: 's1',
  useInput: () => ({ draft: '', phase: 'plain', queue: [], attachmentIds: [] }),
  inputActions,
  useWorkspaces: () => ({ items: [], currentId: '' }),
  useSession: () => ({}),
};

/** Boot the module with one settings/notes fixture; every case gets a fresh window. */
let notesCells = [];
let cardCells = [];
const load = (settings) => {
  store.set(STORAGE_KEY, JSON.stringify({ version: 2, seeded: 2, categories: [], settings, items: [], tray: [] }));
  store.set(NOTES_KEY, notesFixture());
  // The batch log survives in localStorage, so every case starts without one.
  store.delete('dsh.prompt-pool.batches.v1');
  registrations.length = 0;
  cells = [];
  notesCells = [];
  cardCells = [];
  global.window = {
    __ModuleLoader__: {
      load(spec) {
        spec.factory((name) => {
          if (name === 'react') return reactStub;
          throw new Error('unexpected require: ' + name);
        }).apply({
          effect: (fn) => { const dispose = fn(); return typeof dispose === 'function' ? dispose : () => {}; },
          get: (name) => (name === 'uiConversation'
            ? { interactions: { register: () => () => {} } }
            : name === 'betterSidebar'
              ? { registerTab: (descriptor) => { registrations.push({ slot: 'betterSidebar.tab', component: descriptor.component }); return () => {}; } }
              : undefined),
          inject: (deps, cb) => { if (typeof cb === 'function') cb({ get: () => undefined }); return () => {}; },
          locale: { register: () => () => {}, bind: () => (key) => key, subscribe: () => () => {}, getLocale: () => ({ id: 'zh' }) },
          slots: {
            inject: (key, cb) => { const dispose = cb(); return typeof dispose === 'function' ? dispose : () => {}; },
            register: (options, component) => { registrations.push({ slot: options.name, component }); return () => {}; },
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
  new Function('window', 'localStorage', 'require', source)(global.window, global.localStorage, () => reactStub);
  const entry = registrations.find((candidate) => candidate.slot === 'conversation.input.overlay');
  if (!entry) throw new Error('the composer panel was not registered');
  toastHost.children = [];
  return entry;
};

const notesStore = () => global.window.__dshPromptPoolNotesV1;
const batchStore = () => global.window.__dshPromptPoolBatchesV1;

const walk = (node, out) => {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { node.forEach((child) => walk(child, out)); return out; }
  out.push(node);
  if (node.children) node.children.forEach((child) => walk(child, out));
  return out;
};
const nodes = (tree) => walk(tree, []);
const textOf = (node) => {
  if (typeof node === 'string') return node;
  if (!node || typeof node !== 'object') return '';
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (typeof node.text === 'string') return node.text;
  return (node.children || []).map(textOf).join('');
};
const byText = (tree, text) => nodes(tree).find(
  (node) => node.type === 'button' && Array.isArray(node.children) && node.children.indexOf(text) >= 0,
);
const failures = [];
const check = (ok, label) => {
  if (ok) console.log('[ok] ' + label);
  else { failures.push(label); console.error('[fail] ' + label); }
};

const render = (entry) => {
  resetHooks();
  const out = entry.component(panelProps);
  if (out && typeof out.type === 'function') {
    resetHooks();
    return out.type(out.props || panelProps);
  }
  return out;
};
const renderNotes = (root) => {
  const found = nodes(root).find((node) => typeof node.type === 'function' && node.type.name === 'NotesView');
  if (!found) return null;
  const outer = cells;
  cells = notesCells;
  resetHooks();
  const output = found.type(found.props);
  notesCells = cells;
  cells = outer;
  return output;
};
const renderCard = (root) => {
  const found = nodes(root).find((node) => typeof node.type === 'function' && node.type.name === 'ReviewPromptCard');
  if (!found) return null;
  const outer = cells;
  cells = cardCells;
  resetHooks();
  const output = found.type(found.props);
  cardCells = cells;
  cells = outer;
  return output;
};
const insertButton = (root, label) => nodes(root).find((node) => typeof node.type === 'function'
  && node.type.name === 'RowActionIcon' && node.props && node.props.name === 'insert' && node.props.label === label);
const toast = () => toastHost.children[0];
const toastText = () => (toast() ? textOf(toast()) : '');

(async () => {
  // 1. Default: inserting an annotation leaves it in the list, with no Undo.
  {
    const entry = load({});
    const tree = render(entry);
    const insert = insertButton(renderNotes(tree), 'note.insert');
    check(Boolean(insert), 'the annotation row offers an insert action');
    if (insert) insert.props.onClick({ stopPropagation: () => {} });
    check(inserted.length === 1, 'inserting an annotation writes into the composer');
    check(notesStore().get().items.length === 3, 'by default an inserted annotation stays in the list');
    check(!toast() || toastText().indexOf('note.insertedAndRemoved') < 0, 'nothing claims the annotation was removed');
  }

  // 2. Switched off: the mark leaves the list and Undo puts it back.
  {
    const entry = load({ noteKeepAfterInsert: false });
    const tree = render(entry);
    const insert = insertButton(renderNotes(tree), 'note.insert');
    // The list is in transcript order, so the first row is n1.
    if (insert) insert.props.onClick({ stopPropagation: () => {} });
    const left = notesStore().get().items;
    check(left.length === 2 && !left.some((item) => item.id === 'n1'), 'with retention off the inserted annotation leaves the list');
    check(toastText().indexOf('note.insertedAndRemoved') >= 0, 'the toast says the annotation left the list');
    const action = toast() && toast().children.find((child) => child && child.className === 'pp-toast-action');
    check(Boolean(action), 'the toast carries an Undo action');
    if (action) {
      action.handlers.click();
      const back = notesStore().get().items;
      check(back.length === 3 && back.some((item) => item.id === 'n1'), 'Undo restores the annotation');
    }
  }

  // 3. Default: a sent summary takes its marks with it.
  {
    const entry = load({});
    let tree = render(entry);
    const strip = nodes(tree).find((node) => node.type === 'button'
      && String(node.props && node.props.className || '').indexOf('pp-review-strip') >= 0);
    if (strip) strip.props.onClick();
    tree = render(entry);
    const startReview = byText(renderCard(tree), 'note.review.open');
    if (startReview) startReview.props.onClick();
    tree = render(entry);
    const send = byText(renderCard(tree), 'note.review.send');
    check(Boolean(send), 'the review card can send');
    if (send) {
      send.props.onClick();
      await new Promise((resolve) => setTimeout(resolve, 10));
      check(notesStore().get().items.length === 0, 'sending a summary removes the annotations it was built from');
      const batch = batchStore() && batchStore().get().items[0];
      check(Boolean(batch) && batch.noteIds.length === 3, 'the batch log still records what was sent');
    }
  }

  // 4. Switched on: a sent summary keeps its marks and its review choices.
  {
    const entry = load({ noteKeepAfterReview: true });
    let tree = render(entry);
    const strip = nodes(tree).find((node) => node.type === 'button'
      && String(node.props && node.props.className || '').indexOf('pp-review-strip') >= 0);
    if (strip) strip.props.onClick();
    tree = render(entry);
    const startReview = byText(renderCard(tree), 'note.review.open');
    if (startReview) startReview.props.onClick();
    tree = render(entry);
    const send = byText(renderCard(tree), 'note.review.send');
    if (send) {
      send.props.onClick();
      await new Promise((resolve) => setTimeout(resolve, 10));
      check(notesStore().get().items.length === 3, 'with retention on the sent annotations stay in the list');
      const batch = batchStore() && batchStore().get().items[0];
      check(Boolean(batch) && batch.noteIds.length === 3, 'the sent batch is still logged when the marks stay');
    }
  }

  // 5. The settings page offers the three annotation switches in one card.
  {
    const entry = load({});
    const settingsEntry = registrations.find((candidate) => candidate.slot === 'settings.section');
    check(Boolean(settingsEntry), 'the settings page is registered');
    if (settingsEntry) {
      cells = [];
      resetHooks();
      const out = settingsEntry.component({ currentWorkspaceId: '' });
      const tree = out && typeof out.type === 'function' ? out.type(out.props || {}) : out;
      const rows = nodes(tree).filter((node) => node.type === 'label'
        && String(node.props && node.props.className || '') === 'pp-set-row');
      const labels = rows.map((node) => textOf(node));
      check(labels.indexOf('settings.notesKeepInsert') >= 0
        && labels.indexOf('settings.notesKeepReview') >= 0
        && labels.indexOf('settings.notesKeepStore') >= 0,
      'the annotation card carries the insert, summary and store switches');
      const notesCard = nodes(tree).find((node) => String(node.props && node.props.className || '')
        .indexOf('pp-set-card') >= 0
        && textOf(node).indexOf('settings.notesKeepInsert') >= 0);
      check(Boolean(notesCard) && textOf(notesCard).indexOf('settings.table') < 0,
        'the three switches share the annotation card, not the prompts one');
    }
  }

  console.log(failures.length === 0
    ? '[ok] inserted and summarised annotations follow their own retention switches'
    : '[fail] ' + failures.length + ' check(s)');
  if (failures.length > 0) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
