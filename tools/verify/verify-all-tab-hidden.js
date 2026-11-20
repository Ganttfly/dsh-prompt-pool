// The "All" tab is optional: the display settings offer a checkbox, and a
// hidden "All" falls back to the first group tab instead of leaving no active
// tab. The group tabs themselves keep working.
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', '..', 'plugin', 'client.js'), 'utf8');
const STORAGE_KEY = 'dsh.prompt-pool.v1';

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
  useSyncExternalStore: (subscribe, getSnapshot) => {
    const value = getSnapshot();
    return value && typeof value === 'object' && 'open' in value ? { ...value, open: true } : value;
  },
};

global.window = {
  __ModuleLoader__: {
    load(spec) {
      const mod = spec.factory((name) => {
        if (name === 'react') return reactStub;
        throw new Error('unexpected require: ' + name);
      });
      mod.apply({
        effect: (fn) => fn() || (() => {}),
        get: (name) =>
          name === 'betterSidebar'
            ? { registerTab: (descriptor) => { registrations.push({ slot: 'betterSidebar.tab', options: descriptor, component: descriptor.component }); } }
            : undefined,
        inject: (deps, cb) => { cb({ get: () => undefined }); },
        locale: {
          register: () => () => {},
          bind: () => (key) => key,
          subscribe: () => () => {},
          getLocale: () => ({ id: 'zh' }),
        },
        slots: {
          inject: (key, cb) => { cb(); },
          register: (options, component) => { registrations.push({ slot: options.name, options, component }); },
        },
        layout: { selectPanel: () => {} },
      });
    },
  },
  addEventListener: () => {},
  location: { reload: () => {} },
};

global.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
};

const nodes = (node, out) => {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const child of node) nodes(child, out); return out; }
  out.push(node);
  if (node.children) for (const child of node.children) nodes(child, out);
  return out;
};

const failures = [];
const fail = (message) => failures.push(message);

/** Load the bundle against one showAllTab value and return its slots. */
function load(showAllTab) {
  store.clear();
  store.set(
    STORAGE_KEY,
    JSON.stringify({
      version: 2,
      categories: [{ id: 'c1', name: '工作' }],
      settings: { showAllTab },
      items: [{ id: 'i1', group: 'builtin:note', title: '标题一', body: '正文一', images: [] }],
      tray: [],
    }),
  );
  const before = registrations.length;
  delete global.window.__dshPromptPoolStoreV1;
  delete global.window.__dshPromptPoolPageTabV1;
  new Function('window', 'localStorage', 'require', source)(global.window, global.localStorage, () => reactStub);
  return registrations.slice(before);
}

const root = (node) => (node && typeof node.type === 'function' ? root(node.type(node.props || {})) : node);

for (const showAllTab of [true, false]) {
  const slots = load(showAllTab);
  const page = slots.find((entry) => entry.slot === 'betterSidebar.tab');
  const settings = slots.find((entry) => entry.slot === 'settings.section');
  if (!page || !settings) {
    fail(`showAllTab=${showAllTab}: the page or settings slot is missing`);
    continue;
  }
  const before = failures.length;
  const pageTree = root(page.component({ sessionId: 's1', initialScope: 'global' }));
  const tabBar = nodes(pageTree, []).find((node) => node.props && Array.isArray(node.props.tabs));
  if (!tabBar) fail(`showAllTab=${showAllTab}: the tab bar was not rendered`);
  else {
    const tabs = tabBar.props.tabs || [];
    const ids = tabs.map((tab) => tab.id);
    if (showAllTab && ids.indexOf('all') < 0) fail('showAllTab=true: the All tab is missing');
    if (!showAllTab && ids.indexOf('all') >= 0) fail('showAllTab=false: the All tab is still rendered');
    if (ids.indexOf('custom:c1') < 0) fail('the custom group tab disappeared');
    if (ids.indexOf('notes') >= 0) fail('annotations leaked into the global group tabs');
    if (showAllTab && tabBar.props.active !== 'all') fail(`showAllTab=true: active tab is ${tabBar.props.active}, expected all`);
    if (!showAllTab && tabBar.props.active === 'all') fail('showAllTab=false: the hidden All tab is still active');
    if (!showAllTab && !ids.includes(tabBar.props.active)) fail(`showAllTab=false: active tab ${tabBar.props.active} is not in the bar`);
  }

  const panel = slots.find((entry) => entry.slot === 'conversation.input.overlay');
  if (!panel) fail(`showAllTab=${showAllTab}: the composer panel slot is missing`);
  else {
    const panelProps = {
      sessionId: 's1',
      useInput: () => ({ draft: '', phase: 'plain', queue: [], attachmentIds: [] }),
      inputActions: {
        captureInsertion: () => ({ start: 0, end: 0, draftRev: 1 }),
        insertText: () => true,
        setDraft: () => {},
      },
      useWorkspaces: () => ({ items: [], currentId: '' }),
      useSession: () => ({}),
    };
    const panelTree = panel.component(panelProps);
    const panelScope = nodes(panelTree, []).find((node) => typeof node.type === 'function' && node.type.name === 'ScopeBar');
    const panelGroups = nodes(panelTree, []).find((node) => node.props && Array.isArray(node.props.tabs));
    if (!panelScope) fail(`showAllTab=${showAllTab}: the panel scope bar was not rendered`);
    if (panelGroups) fail(`showAllTab=${showAllTab}: the panel still renders group tabs`);
  }

  const settingsTree = settings.component({});
  const settingsNodes = nodes(settingsTree, []);
  const settingsTabs = settingsNodes.filter((node) => node.type === 'button'
    && String(node.props && node.props.className || '') === 'pp-tab');
  if (settingsTabs.length !== 3) fail(`showAllTab=${showAllTab}: settings has ${settingsTabs.length} tabs, expected 3`);
  const activeSettingsTab = settingsTabs.find((node) => node.props && node.props['data-active'] === 'true');
  if (!activeSettingsTab || !Array.isArray(activeSettingsTab.children)
    || activeSettingsTab.children.indexOf('settings.tab.notes') < 0) {
    fail(`showAllTab=${showAllTab}: settings does not open on 批注`);
  }
  if (settingsNodes.some((node) => node.props && node.props.name === 'pp-default-tab')) {
    fail(`showAllTab=${showAllTab}: the old default-tab setting is still rendered`);
  }
  const settingsRadios = settingsNodes
    .filter((node) => node.type === 'input' && node.props && String(node.props.name || '').indexOf('pp-display-') === 0)
    .map((node) => node.props.name);
  if (settingsRadios.some((name) => name === 'pp-display-workspace')) {
    fail(`showAllTab=${showAllTab}: workspace group display is still rendered`);
  }

  const check = settingsNodes.find((node) => node.type === 'input'
    && node.props && node.props.name === 'pp-show-all-tab');
  if (!check) fail(`showAllTab=${showAllTab}: the settings checkbox is missing`);
  else {
    if (check.props.checked !== showAllTab) fail(`showAllTab=${showAllTab}: the checkbox reads ${check.props.checked}`);
    const expected = showAllTab !== true;
    check.props.onChange();
    const saved = window.__dshPromptPoolStoreV1.get().settings.showAllTab;
    if (saved !== expected) fail(`showAllTab=${showAllTab}: toggling stored ${saved}, expected ${expected}`);
  }

  if (failures.length === before) console.log(`[ok] showAllTab = ${showAllTab}`);
}

for (const failure of failures) console.error('[fail]', failure);
console.log(failures.length === 0 ? '[ok] the All tab can be hidden' : `[fail] ${failures.length} check(s)`);
if (failures.length > 0) process.exitCode = 1;
