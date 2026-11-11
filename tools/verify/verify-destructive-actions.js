// Proves the 清空 link no longer drops the queue by itself: it opens a confirm
// step, cancel keeps the queue, and only the confirm action clears it. Both the
// sidebar page and the composer panel are exercised with a tiny hook runtime.
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(process.env.PP_SOURCE || path.join(__dirname, '..', '..', 'plugin', 'client.js'), 'utf8');
const registrations = [];
const store = new Map();
const STORAGE_KEY = 'dsh.prompt-pool.v1';

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
        get: (name) =>
          name === 'betterSidebar'
            ? { registerTab: (descriptor) => { registrations.push({ slot: 'betterSidebar.tab', component: descriptor.component }); } }
            : name === 'remote'
              ? { skills: { list: async () => ({ ok: true, value: { skills: [] } }) } }
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
  // The status flash schedules a timer; the harness only needs it to not throw.
  setTimeout: () => 0,
  clearTimeout: () => {},
  location: { reload: () => {} },
};

global.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
};

const fixture = () => JSON.stringify({
  version: 2,
  seeded: 2,
  categories: [],
  settings: {},
  items: [
    { id: 'i1', group: 'builtin:note', title: '一', body: '第一条', images: [] },
    { id: 'i2', group: 'builtin:note', title: '二', body: '第二条', images: [] },
  ],
  tray: [{ key: 'k1', itemId: 'i1', body: '第一条', images: [] }, { key: 'k2', itemId: 'i2', body: '第二条', images: [] }],
});

const loadModule = () => {
  const before = registrations.length;
  delete global.window.__dshPromptPoolStoreV1;
  new Function('window', 'localStorage', 'require', source)(global.window, global.localStorage, () => reactStub);
  return registrations.slice(before);
};

const nodes = (node, out) => {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const child of node) nodes(child, out); return out; }
  out.push(node);
  if (node.children) for (const child of node.children) nodes(child, out);
  return out;
};

const findConfirm = (tree) => nodes(tree, []).find((node) => typeof node.type === 'function' && node.type.name === 'TrayClearConfirm');
const findDeleteConfirm = (tree) => nodes(tree, []).find((node) => typeof node.type === 'function' && node.type.name === 'ItemDeleteConfirm');
const findRemoveConfirm = (tree) => nodes(tree, []).find((node) => typeof node.type === 'function' && node.type.name === 'TrayRemoveConfirm');
const findTrayClose = (tree) => nodes(tree, []).find(
  (node) => typeof node.type === 'function' && node.type.name === 'IconButton' && node.props && node.props.name === 'close',
);
const findTrash = (tree) => nodes(tree, []).find(
  (node) => typeof node.type === 'function' && node.type.name === 'IconButton' && node.props && node.props.name === 'trash',
);
const findUndo = (tree) => nodes(tree, []).find(
  (node) => node.type === 'button'
    && String(node.props && node.props.className).indexOf('pp-link') >= 0
    && Array.isArray(node.children) && node.children.indexOf('status.undo') >= 0,
);
const findClearLink = (tree) => nodes(tree, []).find(
  (node) => node.type === 'button'
    && String(node.props && node.props.className).indexOf('pp-link') >= 0
    && Array.isArray(node.children) && node.children.indexOf('tray.clear') >= 0,
);
// The row's duplicate action, not the one on a queued entry.
const findCopy = (tree) => nodes(tree, []).find(
  (node) => typeof node.type === 'function'
    && node.type.name === 'IconButton'
    && node.props
    && node.props.name === 'copy'
    && node.props.label === 'row.duplicate',
);
const findSearch = (tree) => nodes(tree, []).find(
  (node) => node.type === 'input' && node.props && String(node.props.className || '').indexOf('pp-search') >= 0,
);
const findNew = (tree) => nodes(tree, []).find(
  (node) => node.type === 'button' && Array.isArray(node.children) && node.children.indexOf('page.new') >= 0,
);
const findCancel = (tree) => nodes(tree, []).find(
  (node) => node.type === 'button' && Array.isArray(node.children) && node.children.indexOf('row.cancel') >= 0,
);

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

const failures = [];

for (const [slotName, props, label] of [
  ['betterSidebar.tab', {}, 'page'],
  ['conversation.input.overlay', panelProps, 'panel'],
]) {
  store.set(STORAGE_KEY, fixture());
  const entries = loadModule();
  const pool = global.window.__dshPromptPoolStoreV1;
  const trayLength = () => pool.get().tray.length;
  const before = failures.length;
  cells = [];

  const entry = entries.find((candidate) => candidate.slot === slotName);
  if (!entry) { failures.push(`${label}: ${slotName} is not registered`); continue; }
  const render = () => {
    resetHooks();
    const out = entry.component(props);
    // The sidebar tab registers a thin wrapper around the page component.
    if (out && typeof out.type === 'function') {
      resetHooks();
      return out.type(out.props || props);
    }
    return out;
  };

  let tree = render();
  if (trayLength() !== 2) failures.push(`${label}: fixture loss, tray = ${trayLength()}`);
  if (findConfirm(tree)) failures.push(`${label}: the clear confirm is rendered before anything was clicked`);
  if (findRemoveConfirm(tree)) failures.push(`${label}: the remove confirm is rendered before anything was clicked`);

  // A queued entry can carry edits the pool does not have, so removal asks too.
  const queuedBefore = trayLength();
  const itemsBeforeRemove = pool.get().items.length;
  let close = findTrayClose(tree);
  if (!close) { failures.push(`${label}: the queued entry's remove button was not found`); continue; }
  close.props.onClick();
  if (trayLength() !== queuedBefore) failures.push(`${label}: clicking remove dropped the entry without asking`);

  tree = render();
  const removeConfirm = findRemoveConfirm(tree);
  if (!removeConfirm) { failures.push(`${label}: removing a queued entry did not open a confirmation`); continue; }
  const removeModal = removeConfirm.type(removeConfirm.props);
  if (!removeModal || !removeModal.props || removeModal.props.text !== 'tray.removeConfirm') {
    failures.push(`${label}: the remove confirmation should use the generic copy`);
  }
  if (removeConfirm.props.title !== undefined) failures.push(`${label}: the remove confirmation still embeds the entry text`);

  removeConfirm.props.onCancel();
  tree = render();
  if (trayLength() !== queuedBefore) failures.push(`${label}: cancel still removed the queued entry`);
  if (findRemoveConfirm(tree)) failures.push(`${label}: the remove confirmation survived cancel`);

  close = findTrayClose(tree);
  if (!close) { failures.push(`${label}: the entry's remove button vanished after cancel`); continue; }
  close.props.onClick();
  tree = render();
  const reopenedRemove = findRemoveConfirm(tree);
  if (!reopenedRemove) { failures.push(`${label}: the remove confirmation did not reopen`); continue; }
  reopenedRemove.props.onConfirm();
  tree = render();
  if (trayLength() !== queuedBefore - 1) failures.push(`${label}: confirming left ${trayLength()} queued item(s)`);
  if (pool.get().items.length !== itemsBeforeRemove) failures.push(`${label}: removing a queued entry changed the pool`);
  if (findRemoveConfirm(tree)) failures.push(`${label}: the remove confirmation stayed open`);
  if (failures.length === before) console.log(`[ok] ${label}: queued removal asks, cancel keeps, confirm removes`);

  const queued = trayLength();
  const link = findClearLink(tree);
  if (!link) { failures.push(`${label}: the clear link was not found`); continue; }
  link.props.onClick();
  if (trayLength() !== queued) failures.push(`${label}: clicking clear emptied the queue without asking`);

  tree = render();
  const confirm = findConfirm(tree);
  if (!confirm) { failures.push(`${label}: clicking clear did not open a confirmation`); continue; }
  if (confirm.props.count !== queued) failures.push(`${label}: the confirmation counted ${confirm.props.count}, expected ${queued}`);

  confirm.props.onCancel();
  tree = render();
  if (trayLength() !== queued) failures.push(`${label}: cancel still cleared the queue`);
  if (findConfirm(tree)) failures.push(`${label}: the confirmation survived cancel`);

  const reopened = findClearLink(tree);
  if (!reopened) { failures.push(`${label}: the clear link vanished after cancel`); continue; }
  reopened.props.onClick();
  tree = render();
  const again = findConfirm(tree);
  if (!again) { failures.push(`${label}: the confirmation did not reopen`); continue; }
  again.props.onConfirm();
  tree = render();
  if (trayLength() !== 0) failures.push(`${label}: confirming left ${trayLength()} item(s) in the queue`);
  if (findConfirm(tree)) failures.push(`${label}: the confirmation stayed open after clearing`);

  if (failures.length === before) console.log(`[ok] ${label}: clear asks, cancel keeps, confirm clears`);

  // The clear toast offers an undo, and it puts the queued items back.
  const clearUndo = findUndo(tree);
  if (!clearUndo) failures.push(`${label}: the undo action is missing after clearing`);
  else {
    clearUndo.props.onClick();
    tree = render();
    if (trayLength() !== queued) failures.push(`${label}: undo restored ${trayLength()} queued item(s), expected ${queued}`);
  }
  if (failures.length === before) console.log(`[ok] ${label}: clearing can be undone`);

  // Same story for deleting one pool item, plus the undo the toast offers.
  const itemCount = () => pool.get().items.length;
  const startItems = itemCount();
  if (startItems === 0) { failures.push(`${label}: the pool has no item to delete`); continue; }

  let trash = findTrash(tree);
  if (!trash) { failures.push(`${label}: the delete button was not found`); continue; }
  trash.props.onClick();
  if (itemCount() !== startItems) failures.push(`${label}: clicking delete removed the item without asking`);

  tree = render();
  const deleteConfirm = findDeleteConfirm(tree);
  if (!deleteConfirm) { failures.push(`${label}: deleting did not open a confirmation`); continue; }
  const deleteModal = deleteConfirm.type(deleteConfirm.props);
  if (!deleteModal || !deleteModal.props || deleteModal.props.text !== 'row.deleteConfirm') {
    failures.push(`${label}: the delete confirmation should use the generic copy`);
  }
  if (deleteConfirm.props.title !== undefined) failures.push(`${label}: the delete confirmation still embeds the item text`);

  deleteConfirm.props.onCancel();
  tree = render();
  if (itemCount() !== startItems) failures.push(`${label}: cancel still deleted the item`);
  if (findDeleteConfirm(tree)) failures.push(`${label}: the delete confirmation survived cancel`);

  trash = findTrash(tree);
  if (!trash) { failures.push(`${label}: the delete button vanished after cancel`); continue; }
  trash.props.onClick();
  tree = render();
  const reopenedDelete = findDeleteConfirm(tree);
  if (!reopenedDelete) { failures.push(`${label}: the delete confirmation did not reopen`); continue; }
  reopenedDelete.props.onConfirm();
  tree = render();
  if (itemCount() !== startItems - 1) failures.push(`${label}: confirming left ${itemCount()} item(s)`);
  if (findDeleteConfirm(tree)) failures.push(`${label}: the delete confirmation stayed open`);

  const undo = findUndo(tree);
  if (!undo) failures.push(`${label}: the undo action is missing after deleting`);
  else {
    undo.props.onClick();
    tree = render();
    if (itemCount() !== startItems) failures.push(`${label}: undo restored ${itemCount()} item(s)`);
  }

  if (failures.length === before) console.log(`[ok] ${label}: delete asks, cancel keeps, confirm deletes, undo restores`);

  // Both views expose the row duplicate action (the panel used to miss it).
  const copy = findCopy(tree);
  if (!copy) failures.push(`${label}: the duplicate action is missing`);
  else {
    const beforeCopy = itemCount();
    copy.props.onClick();
    tree = render();
    if (itemCount() !== beforeCopy + 1) failures.push(`${label}: duplicate changed the pool by ${itemCount() - beforeCopy}`);
  }
  if (failures.length === before) console.log(`[ok] ${label}: duplicate appends a copy`);

  // New then cancel must not leave an empty row; a search must not hide the new row.
  const beforeNew = itemCount();
  const search = findSearch(tree);
  if (search) {
    search.props.onChange({ target: { value: 'no-such-prompt' } });
    tree = render();
  }
  const newButton = findNew(tree);
  if (!newButton) failures.push(`${label}: the new-prompt button was not found`);
  else {
    newButton.props.onClick();
    tree = render();
    const searchAfter = findSearch(tree);
    if (search && (!searchAfter || searchAfter.props.value !== '')) failures.push(`${label}: the search still hides the new row`);
    if (itemCount() !== beforeNew + 1) failures.push(`${label}: new did not add exactly one row`);
    const cancel = findCancel(tree);
    if (!cancel) failures.push(`${label}: the editor's cancel button was not found`);
    else {
      cancel.props.onClick();
      tree = render();
      if (itemCount() !== beforeNew) failures.push(`${label}: cancel left ${itemCount() - beforeNew} empty row(s)`);
    }
  }
  if (failures.length === before) console.log(`[ok] ${label}: new then cancel leaves no empty row`);
}

for (const failure of failures) console.error('[fail]', failure);
console.log(failures.length === 0 ? '[ok] every destructive action asks first' : `[fail] ${failures.length} check(s)`);
if (failures.length > 0) process.exitCode = 1;
