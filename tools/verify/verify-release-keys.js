// Proves a release removes only the keys it sent: a queued item added while
// the release runs survives, and one removed while it runs does not come back.
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
  settings: { queueCollapsed: false },
  items: [
    { id: 'i1', group: 'builtin:note', title: 'one', body: 'first', images: [], createdAt: 1, updatedAt: 1 },
    { id: 'i2', group: 'builtin:note', title: 'two', body: 'second', images: [], createdAt: 1, updatedAt: 1 },
    { id: 'i3', group: 'builtin:note', title: 'three', body: 'third', images: [], createdAt: 1, updatedAt: 1 },
  ],
  tray: [
    { key: 'k1', itemId: 'i1', body: 'first', images: [] },
    { key: 'k2', itemId: 'i2', body: 'second', images: [] },
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
  initialScope: 'workspace',
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
  let tree = render();
  const trayGrip = nodes(tree, []).find((node) => String(node.props && node.props.className || '').indexOf('pp-tray-grip') >= 0);
  if (!trayGrip) failures.push('the Outbox card has no height grip');
  else {
    trayGrip.props.onKeyDown({ key: 'ArrowUp', preventDefault: () => {} });
    if (!(storeRef.get().settings.trayHeight > 0)) failures.push('the Outbox grip did not save a height');
    trayGrip.props.onDoubleClick();
    if (storeRef.get().settings.trayHeight !== 0) failures.push('double-click did not reset the Outbox height');
  }
  // The header carries a send-mode switch; merge mode turns the primary action
  // into the digest action.
  const modeButton = nodes(tree, []).find(
    (node) => node.type === 'button' && Array.isArray(node.children) && node.children.indexOf('tray.mode.merge') >= 0,
  );
  if (!modeButton) failures.push('the send-mode switch was not found');
  else {
    modeButton.props.onClick();
    tree = render();
  }
  const digest = nodes(tree, []).find(
    (node) => node.type === 'button' && Array.isArray(node.children) && node.children.indexOf('tray.digest') >= 0,
  );
  if (!digest) failures.push('the merge-and-send action was not found');
  else {
    digest.props.onClick();
    tree = render();
    const mergeCard = nodes(tree, []).find((node) => typeof node.type === 'function' && node.type.name === 'MergeReviewCard');
    if (!mergeCard) failures.push('the merge preview did not open');
    else if (typeof mergeCard.props.onClose !== 'function') failures.push('the merge preview has no close action');
    else {
      // Merge & send opens the editable preview of every queued entry directly.
      const pageCells = cells;
      cells = [];
      resetHooks();
      let confirmed = null;
      const sheetProps = { ...mergeCard.props, onConfirm: (text) => { confirmed = text; } };
      sheetProps.entries = mergeCard.props.entries.map((entry, index) => (index === 0
        ? { ...entry, images: [{ id: 'merge-shot', type: 'image/png', name: 'shot.png', thumb: 'data:image/png;base64,AA==' }] }
        : entry));
      const previewNodes = nodes(mergeCard.type(sheetProps), []);
      const partial = previewNodes.filter((node) => node.props
        && String(node.props.className || '').indexOf('pp-merge-choice') >= 0);
      if (partial.length !== 0) failures.push('the merge sheet still offers partial selection');
      const imageStrip = previewNodes.find((node) => typeof node.type === 'function' && node.type.name === 'ImageStrip');
      if (!imageStrip || imageStrip.props.images.length !== 1) failures.push('the merge preview does not show queued images');
      const attachmentLabel = previewNodes.find((node) => Array.isArray(node.children)
        && node.children.indexOf('merge.attachments') >= 0);
      if (!attachmentLabel) failures.push('the merge preview does not explain the image attachments');
      const textarea = previewNodes.find((node) => node.type === 'textarea');
      if (!textarea) failures.push('the merge preview has no editable text');
      else {
        if (String(textarea.props.value).indexOf('first') < 0 || String(textarea.props.value).indexOf('second') < 0) {
          failures.push('the merge preview does not carry every queued entry');
        }
        textarea.props.onChange({ target: { value: 'edited merge' } });
        resetHooks();
        const confirmButton = nodes(mergeCard.type(sheetProps), []).find(
          (node) => node.type === 'button' && String(node.props.className || '').indexOf('pp-note-btn-primary') >= 0
            && Array.isArray(node.children) && node.children.indexOf('merge.confirm') >= 0,
        );
        if (!confirmButton) failures.push('the merge preview has no confirm action');
        else {
          confirmButton.props.onClick();
          if (confirmed !== 'edited merge') failures.push('the merge did not keep the edited text');
        }
      }
      cells = pageCells;
      resetHooks();
      mergeCard.props.onClose();
      tree = render();
      const singleButton = nodes(tree, []).find(
        (node) => node.type === 'button' && Array.isArray(node.children) && node.children.indexOf('tray.mode.single') >= 0,
      );
      if (singleButton) {
        singleButton.props.onClick();
        tree = render();
      }
    }
  }
  const release = nodes(tree, []).find(
    (node) => node.type === 'button' && Array.isArray(node.children) && node.children.indexOf('tray.release') >= 0,
  );
  if (!release) {
    failures.push('the release button was not found');
  } else {
    const pending = release.props.onClick();
    // A row is queued and another is removed while the release is running.
    const current = storeRef.get();
    storeRef.set({
      ...current,
      tray: [
        ...current.tray.filter((queued) => queued.key !== 'k2'),
        { key: 'k3', itemId: 'i3', body: 'third', images: [] },
      ],
    });

    let settled = false;
    Promise.resolve(pending).then(() => { settled = true; }, () => { settled = true; });
    for (let i = 0; i < 300 && !settled; i += 1) {
      render();
      await sleep(10);
    }
    await pending;
    tree = render();
    const left = storeRef.get().tray.map((queued) => queued.key);
    if (left.length !== 1 || left[0] !== 'k3') failures.push(`the tray ended as [${left.join(', ')}], expected [k3]`);
  }

  for (const failure of failures) console.error('[fail]', failure);
  console.log(failures.length === 0 ? '[ok] a release keeps concurrent queue edits and the merge sheet keeps edited text' : `[fail] ${failures.length} check(s)`);
  if (failures.length > 0) process.exitCode = 1;
})();
