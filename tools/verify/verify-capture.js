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
  // Effects run for real: the panel registers its bridge listener in one, and the
  // capture now reaches it the way the composer trigger does.
  useEffect: (fn) => { const fnCleanup = fn(); void fnCleanup; },
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
global.document = { addEventListener: () => {}, removeEventListener: () => {} };
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


const mountPanel = (panelProps) => {
  const entry = registrations.find((candidate) => candidate.slot === 'conversation.input.overlay');
  if (!entry) throw new Error('the panel slot was never registered');
  resetHooks();
  let tree = entry.component(panelProps);
  if (tree && typeof tree.type === 'function') {
    resetHooks();
    tree = tree.type(tree.props);
  }
  return tree;
};

const collectNodes = (tree) => {
  const nodes = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    nodes.push(node);
    if (node.children) node.children.forEach(walk);
  };
  walk(tree);
  return nodes;
};

/**
 * The composer trigger asks the mounted panel for the capture over the bridge,
 * so the checks drive that same command instead of a button in the header.
 */
const capture = async (draft, attachmentIds, occurrences, pick = 'group.note', workspaces) => {
  const panelProps = {
    sessionId: 's1',
    initialScope: 'workspace',
    useInput: () => ({ draft, phase: 'plain', queue: [], attachmentIds: attachmentIds || [], occurrences: occurrences || [] }),
    inputActions: {
      captureInsertion: () => ({ start: 0, end: 0, draftRev: 1 }),
      insertText: () => true,
      setDraft: () => {}, submit: () => {},
      addAttachments: () => true, removeAttachment: () => true, pruneAttachments: () => {}, persistDraft: () => {},
    },
    useWorkspaces: () => workspaces || ({ items: [], currentId: '' }),
    useSession: () => ({}),
  };
  mountPanel(panelProps);
  const bridge = global.window.__dshPromptPoolBridgeV1;
  if (!bridge) throw new Error('the bridge was never published');
  const options = bridge.request({ type: 'capture-options' });
  if (!options || options.ok !== true) throw new Error('the capture destinations were not offered');
  const groups = Array.isArray(options.groups) ? options.groups : [];
  const chosen = groups.find((group) => group.value === pick || group.label === pick);
  if (!chosen) throw new Error(`the ${pick} destination was not found`);
  const result = await Promise.resolve(bridge.request({ type: 'capture', group: chosen.value }));
  // Re-render to read the status the capture surfaced; the hook cells survive so
  // the state the command wrote is still there.
  const after = mountPanel(panelProps);
  const statusNode = collectNodes(after).find((node) => node.props
    && String(node.props.className || '').indexOf('pp-status') >= 0);
  const statusText = statusNode && statusNode.children[0] && statusNode.children[0].children
    ? statusNode.children[0].children[0] : null;
  const pool = global.window.__dshPromptPoolStoreV1;
  return { pool, groups, result, added: pool.get().items[pool.get().items.length - 1], status: statusText };
};

const main = async () => {
  const failures = [];

  const session = await capture('看下 @季度报表.xlsx 和 @设置页隐藏待发送队列(dsh-session:Nic3nb24nzM1MDY3NmU0NDhMMDQwMzFkL) 的差异\n第二行不动', []);
  if (!session.added) failures.push('session draft: nothing was captured');
  else {
    if (session.added.body.indexOf('dsh-session:Nic3nb24') < 0) failures.push('session draft: the body lost the reference id');
    if (session.added.title.indexOf('dsh-session') >= 0) failures.push(`session draft: the title still carries the id (${session.added.title})`);
    if (session.added.title.indexOf('@设置页隐藏待发送队列') < 0) failures.push(`session draft: the title lost the display name (${session.added.title})`);
  }

  const fileDraft = '@C:\\Users\\robinshen\\Downloads\\子算甲申请兼确定予算書（部所） (1).xlsx 这个表怎么填';
  const file = await capture(fileDraft, []);
  if (!file.added) failures.push('file draft: nothing was captured');
  else {
    if (file.added.body !== fileDraft) failures.push('file draft: the body changed');
    if (file.added.title.indexOf('C:\\Users') >= 0) failures.push(`file draft: the title still carries the path (${file.added.title})`);
    if (file.added.title.indexOf('子算甲申请兼确定予算書') < 0) failures.push(`file draft: the title lost the file name (${file.added.title})`);
  }

  const workspaceScoped = await capture('工作区目标测试', [], [], 'workspace:w1', {
    items: [
      { workspaceId: 'w1', name: 'W1', sessionIds: ['s1'] },
      { workspaceId: 'w2', name: 'W2', sessionIds: [] },
    ],
    currentId: 'w1',
  });
  const workspaceValues = workspaceScoped.groups
    .map((group) => group.value)
    .filter((value) => String(value).indexOf('workspace:') === 0);
  if (workspaceValues.join(',') !== 'workspace:w1') {
    failures.push(`the capture menu offered ${JSON.stringify(workspaceValues)}, expected only workspace:w1`);
  }
  if (!workspaceScoped.added || workspaceScoped.added.group !== 'workspace:w1') {
    failures.push('the workspace capture did not land in workspace:w1');
  } else {
    console.log('[ok] capture destinations are the current workspace plus global groups');
  }

  for (const failure of failures) console.error('[fail]', failure);
  console.log(failures.length === 0 ? '[ok] captured titles are readable' : `[fail] ${failures.length} check(s)`);
  if (failures.length > 0) process.exitCode = 1;

  // Attachments cannot be captured; the status must say so.
  const withAttachments = await capture('带两张图的草稿', ['a1', 'a2']);
  if (!withAttachments.added) console.error('[fail] attachment draft: nothing was captured');
  else if (withAttachments.status !== 'status.savedPartialTo') console.error('[fail] attachment draft: status was ' + withAttachments.status);
  else console.log('[ok] capture tells the user attachments were skipped');

  // When the host publishes chip ranges, the title uses their labels verbatim.
  const chipDraft = '看下 @季度报表.xlsx 和 @设置页隐藏待发送队列(dsh-session:abc123) 的差异';
  const fileAt = chipDraft.indexOf('@季度报表.xlsx');
  const sessionAt = chipDraft.indexOf('@设置页隐藏待发送队列(dsh-session:abc123)');
  const structured = await capture(chipDraft, [], [
    { offset: fileAt, length: '@季度报表.xlsx'.length, label: '季度报表.xlsx', source: 'file', ref: 'C:\\x\\季度报表.xlsx' },
    { offset: sessionAt, length: '@设置页隐藏待发送队列(dsh-session:abc123)'.length, label: '设置页隐藏待发送队列', source: 'sessions', ref: 'abc123' },
  ]);
  if (!structured.added) console.error('[fail] chip metadata: nothing was captured');
  else if (structured.added.title !== '看下 @季度报表.xlsx 和 @设置页隐藏待发送队列 的差异') {
    console.error('[fail] chip metadata: title was ' + JSON.stringify(structured.added.title));
  } else console.log('[ok] chip metadata drives a clean title');

  // The chooser decides the destination instead of always using Notes.
  const templated = await capture('模板草稿', [], [], 'group.template');
  if (!templated.added) console.error('[fail] template destination: nothing was captured');
  else if (templated.added.group !== 'builtin:template') console.error('[fail] template destination: group was ' + templated.added.group);
  else console.log('[ok] capture uses the chosen group');
};

main().then(null, (error) => {
  console.error('[fail]', error);
  process.exitCode = 1;
});
