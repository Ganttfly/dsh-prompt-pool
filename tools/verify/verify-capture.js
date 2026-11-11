// Captures a draft that contains reference chips and checks the row title is
// readable while the stored body stays byte-identical.
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
        get: (name) => {
          if (name === 'betterSidebar') return { registerTab: () => () => {}, updateTab: () => {} };
          // Draft attachments resolve through the conversation service.
          if (name === 'conversation') {
            return { resolveDraftAttachments: (ids) => ids.map((id) => ({ kind: 'file', id, file: { name: id } })) };
          }
          return undefined;
        },
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

store.set(STORAGE_KEY, JSON.stringify({
  version: 2,
  seeded: 2,
  categories: [],
  settings: {},
  items: [],
  tray: [],
}));

new Function('window', 'localStorage', 'require', source)(global.window, global.localStorage, () => reactStub);

/** Render the panel against one composer state and capture it. */
const capture = (draft, attachmentIds, occurrences) => {
  const panelProps = {
    sessionId: 's1',
    useInput: () => ({ draft, phase: 'plain', queue: [], attachmentIds: attachmentIds || [], occurrences: occurrences || [] }),
    inputActions: {
      captureInsertion: () => ({ start: 0, end: 0, draftRev: 1 }),
      insertText: () => true,
      setDraft: () => {}, submit: () => {},
      addAttachments: () => true, removeAttachment: () => true, pruneAttachments: () => {}, persistDraft: () => {},
    },
    useWorkspaces: () => ({ items: [], currentId: '' }),
    useSession: () => ({}),
  };
  const entry = registrations.find((candidate) => candidate.slot === 'conversation.input.overlay');
  cells = [];
  resetHooks();
  let tree = entry.component(panelProps);
  if (tree && typeof tree.type === 'function') {
    resetHooks();
    tree = tree.type(tree.props);
  }
  const nodes = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    nodes.push(node);
    if (node.children) node.children.forEach(walk);
  };
  walk(tree);
  const button = nodes.find((node) => node.type === 'button' && Array.isArray(node.children) && node.children.indexOf('panel.capture') >= 0);
  if (!button) throw new Error('the capture button was not found');
  button.props.onClick();
  const pool = global.window.__dshPromptPoolStoreV1;
  // Re-render to read the status the capture surfaced; keep the hook cells so
  // the state the click wrote survives.
  resetHooks();
  let after = entry.component(panelProps);
  if (after && typeof after.type === 'function') {
    resetHooks();
    after = after.type(after.props);
  }
  const afterNodes = [];
  const walkAfter = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walkAfter); return; }
    afterNodes.push(node);
    if (node.children) node.children.forEach(walkAfter);
  };
  walkAfter(after);
  const statusNode = afterNodes.find((node) => node.props && String(node.props.className || '').indexOf('pp-status') >= 0);
  const statusText = statusNode && statusNode.children[0] && statusNode.children[0].children ? statusNode.children[0].children[0] : null;
  return { pool, added: pool.get().items[pool.get().items.length - 1], status: statusText };
};

const failures = [];

const session = capture('看下 @季度报表.xlsx 和 @设置页隐藏待发送队列(dsh-session:Nic3nb24nzM1MDY3NmU0NDhMMDQwMzFkL) 的差异\n第二行不动', []);
if (!session.added) failures.push('session draft: nothing was captured');
else {
  if (session.added.body.indexOf('dsh-session:Nic3nb24') < 0) failures.push('session draft: the body lost the reference id');
  if (session.added.title.indexOf('dsh-session') >= 0) failures.push(`session draft: the title still carries the id (${session.added.title})`);
  if (session.added.title.indexOf('@设置页隐藏待发送队列') < 0) failures.push(`session draft: the title lost the display name (${session.added.title})`);
}

const fileDraft = '@C:\\Users\\robinshen\\Downloads\\子算甲申请兼确定予算書（部所） (1).xlsx 这个表怎么填';
const file = capture(fileDraft, []);
if (!file.added) failures.push('file draft: nothing was captured');
else {
  if (file.added.body !== fileDraft) failures.push('file draft: the body changed');
  if (file.added.title.indexOf('C:\\Users') >= 0) failures.push(`file draft: the title still carries the path (${file.added.title})`);
  if (file.added.title.indexOf('子算甲申请兼确定予算書') < 0) failures.push(`file draft: the title lost the file name (${file.added.title})`);
}

for (const failure of failures) console.error('[fail]', failure);
console.log(failures.length === 0 ? '[ok] captured titles are readable' : `[fail] ${failures.length} check(s)`);
if (failures.length > 0) process.exitCode = 1;

// Attachments cannot be captured; the toast must say so.
const withAttachments = capture('带两张图的草稿', ['a1', 'a2']);
if (!withAttachments.added) console.error('[fail] attachment draft: nothing was captured');
else if (withAttachments.status !== 'status.savedPartial') console.error('[fail] attachment draft: status was ' + withAttachments.status);
else console.log('[ok] capture tells the user attachments were skipped');

// When the host publishes chip ranges, the title uses their labels verbatim.
const chipDraft = '看下 @季度报表.xlsx 和 @设置页隐藏待发送队列(dsh-session:abc123) 的差异';
const fileAt = chipDraft.indexOf('@季度报表.xlsx');
const sessionAt = chipDraft.indexOf('@设置页隐藏待发送队列(dsh-session:abc123)');
const structured = capture(chipDraft, [], [
  { offset: fileAt, length: '@季度报表.xlsx'.length, label: '季度报表.xlsx', source: 'file', ref: 'C:\\x\\季度报表.xlsx' },
  { offset: sessionAt, length: '@设置页隐藏待发送队列(dsh-session:abc123)'.length, label: '设置页隐藏待发送队列', source: 'sessions', ref: 'abc123' },
]);
if (!structured.added) console.error('[fail] chip metadata: nothing was captured');
else if (structured.added.title !== '看下 @季度报表.xlsx 和 @设置页隐藏待发送队列 的差异') {
  console.error('[fail] chip metadata: title was ' + JSON.stringify(structured.added.title));
} else console.log('[ok] chip metadata drives a clean title');
