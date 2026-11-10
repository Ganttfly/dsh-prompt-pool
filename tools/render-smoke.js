// Renders every registered slot component in a stubbed host so a render-time
// ReferenceError or bad hook order fails here instead of inside the app.
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'plugin', 'client.js'), 'utf8');

const store = new Map();
const registrations = [];

const reactStub = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  Fragment: 'Fragment',
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
  useEffect: () => {},
  useRef: (initial) => ({ current: initial }),
  useMemo: (factory) => factory(),
  useCallback: (fn) => fn,
  // The panel only renders its open state, so force the UI store open.
  useSyncExternalStore: (subscribe, getSnapshot) => {
    const value = getSnapshot();
    if (value && typeof value === 'object' && 'open' in value) return { ...value, open: true };
    return value;
  },
};

function requireStub(name) {
  if (name === 'react') return reactStub;
  throw new Error('unexpected require: ' + name);
}

const workspaceSnapshot = {
  items: [
    { workspaceId: 'w1', title: 'dsh-prompt-pool', path: 'D:\\Hotpot\\dsh-prompt-pool', sessionIds: ['s1'] },
    { workspaceId: 'w2', title: 'Working-AT-Fixer', path: 'D:\\Working-AT-Fixer', sessionIds: [] },
  ],
};

const inputActions = {
  captureInsertion: () => ({ start: 0, end: 0, draftRev: 1 }),
  insertText: () => true,
  setDraft: () => {},
  submit: () => {},
  addAttachments: () => {},
  removeAttachment: () => {},
  pruneAttachments: () => {},
  persistDraft: () => {},
};

global.window = {
  __ModuleLoader__: {
    load(spec) {
      const mod = spec.factory(requireStub);
      const ctx = {
        effect: (fn) => {
          const dispose = fn();
          return typeof dispose === 'function' ? dispose : () => {};
        },
        get: (name) =>
          name === 'remote'
            ? { skills: { list: async () => ({ ok: true, value: { skills: [{ name: 'demo', description: 'demo skill', modelInvocable: true }] } }) } }
            : undefined,
        inject: (deps, cb) => {
          if (typeof cb === 'function') cb({ get: () => undefined });
          return () => {};
        },
        locale: {
          register: () => () => {},
          bind: () => (key) => key,
          subscribe: () => () => {},
          getLocale: () => ({ id: 'zh' }),
        },
        slots: {
          inject: (key, cb) => {
            const dispose = cb();
            return typeof dispose === 'function' ? dispose : () => {};
          },
          register: (options, component) => {
            registrations.push({ slot: options.name, options, component });
            return () => {};
          },
        },
        layout: { selectPanel: () => {} },
        betterSidebar: undefined,
      };
      // Exercise the right-sidebar tab path too.
      ctx.get = (name) => {
        if (name === 'betterSidebar') {
          return { registerTab: (descriptor) => { registrations.push({ slot: 'betterSidebar.tab', options: descriptor, component: descriptor.component }); return () => {}; } };
        }
        if (name === 'remote') {
          return { skills: { list: async () => ({ ok: true, value: { skills: [{ name: 'demo', description: 'demo skill', modelInvocable: true }] } }) } };
        }
        return undefined;
      };
      mod.apply(ctx);
      return mod;
    },
  },
  addEventListener: () => {},
  location: { reload: () => {} },
};

global.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
};

// Seed one item, one category, a pinned entry and a tray occurrence.
store.set(
  'dsh.prompt-pool.v1',
  JSON.stringify({
    version: 2,
    seeded: 2,
    categories: [{ id: 'c1', name: '工作' }],
    settings: { currentWorkspaceTab: true },
    items: [
      { id: 'i1', group: 'builtin:oftenuse', title: '标题一', body: '正文一', images: [] },
      { id: 'i2', group: 'workspace:w1', title: '', body: '正文二', images: [] },
      { id: 'i3', group: 'builtin:note', title: '', body: '正文三', images: [] },
    ],
    tray: [{ key: 'k1', itemId: 'i1', body: '正文一', images: [] }],
  }),
);

const panelProps = {
  sessionId: 's1',
  useInput: () => ({ draft: '草稿', phase: 'plain', queue: [], attachmentIds: [] }),
  inputActions,
  useWorkspaces: () => workspaceSnapshot,
  useSession: () => ({}),
};

new Function('window', 'localStorage', 'require', source)(global.window, global.localStorage, requireStub);

let failures = 0;
for (const entry of registrations) {
  const props = entry.slot === 'conversation.input.overlay' ? panelProps : {};
  try {
    const tree = entry.component(props);
    const label = entry.options && (entry.options.id || entry.options.key || entry.options.name);
    console.log('[ok] render', entry.slot, '#' + label);
    if (tree === undefined) throw new Error('component returned undefined');
  } catch (error) {
    failures += 1;
    console.error('[fail] render', entry.slot, '#' + (entry.options && (entry.options.id || entry.options.key)));
    console.error(error && error.stack ? error.stack : error);
  }
}

console.log(failures === 0 ? '[ok] all components rendered' : `[fail] ${failures} component(s) failed`);
if (failures > 0) process.exitCode = 1;

// The composer panel mirrors the sidebar page: same header controls and rows.
const walkTree = (node, visit) => {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((child) => walkTree(child, visit)); return; }
  visit(node);
  if (Array.isArray(node.children)) node.children.forEach((child) => walkTree(child, visit));
};

const overlayEntry = registrations.find((entry) => entry.slot === 'conversation.input.overlay');
const overlayTree = overlayEntry.component(panelProps);
const panelNodes = [];
walkTree(overlayTree, (node) => panelNodes.push(node));
const hasClass = (node, name) => node.props && String(node.props.className || '').split(' ').indexOf(name) >= 0;

const panelSearch = panelNodes.some((node) => node.type === 'input' && hasClass(node, 'pp-search'));
const panelClose = panelNodes.some((node) => node.type === 'button' && node.props && node.props.title === 'panel.close');
const panelRows = panelNodes.filter((node) => hasClass(node, 'pp-page-item')).length;
const panelGrip = panelNodes.some((node) => hasClass(node, 'pp-panel-grip'));
const panelQueueToggle = panelNodes.some((node) => node.type === 'button' && hasClass(node, 'pp-queue-toggle'));
const panelCapture = panelNodes.some(
  (node) => node.type === 'button' && node.props && node.props.title === 'panel.captureHint'
    && Array.isArray(node.children) && node.children.indexOf('panel.capture') >= 0,
);
console.log(`[check] panel header search=${panelSearch} close=${panelClose} grip=${panelGrip} queueToggle=${panelQueueToggle} captureHint=${panelCapture} page-item rows=${panelRows}`);
if (!panelSearch || !panelClose || !panelGrip || !panelQueueToggle || !panelCapture || panelRows === 0) process.exitCode = 1;

// The composer trigger names itself, and flags the queue with an accent badge.
const triggerEntry = registrations.find((entry) => entry.slot === 'conversation.input.right');
const triggerNodes = [];
walkTree(triggerEntry.component({}), (node) => triggerNodes.push(node));
const trigger = triggerNodes.find((node) => node.type === 'button' && hasClass(node, 'pp-trigger'));
const triggerLabel = triggerNodes.some((node) => node.type === 'span' && hasClass(node, 'pp-trigger-label') && node.children[0] === 'button.label');
const triggerBadge = triggerNodes.some((node) => node.type === 'span' && hasClass(node, 'pp-badge') && node.children[0] === '1');
const queued = trigger && trigger.props['data-queued'] === 'true';
console.log(`[check] trigger label=${triggerLabel} queued=${queued} badge=${triggerBadge}`);
if (!trigger || !triggerLabel || !queued || !triggerBadge) process.exitCode = 1;

// The settings page names the plugin and its author.
const settingsEntry = registrations.find((entry) => entry.slot === 'settings.section');
const settingsTree = settingsEntry.component({});
const settingsNodes = [];
walkTree(settingsTree, (node) => settingsNodes.push(node));
const aboutName = settingsNodes.some((node) => node.props && String(node.props.className || '').indexOf('pp-about-name') >= 0);
const settingsText = [];
const collectText = (node) => {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(collectText); return; }
  if (Array.isArray(node.children)) {
    node.children.forEach((child) => {
      if (typeof child === 'string') settingsText.push(child);
      else collectText(child);
    });
  }
};
collectText(settingsTree);
const aboutAuthor = settingsText.indexOf('RobinShen') >= 0;
console.log(`[check] settings about name=${aboutName} author=${aboutAuthor}`);
if (!aboutName || !aboutAuthor) process.exitCode = 1;
