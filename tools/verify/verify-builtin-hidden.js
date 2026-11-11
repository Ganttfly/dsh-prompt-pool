// Proves the display table offers "hidden" for built-in groups: a stored
// display.builtin = 'hidden' stays checked and enabled, and the tab row drops
// the built-in tabs while keeping "全部" and the other families.
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
  useSyncExternalStore: (subscribe, getSnapshot) => getSnapshot(),
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

// The stub React never renders children, so walk the element tree as-is and
// read the props the components were handed.
const nodes = (node, out) => {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const child of node) nodes(child, out); return out; }
  out.push(node);
  if (node.children) for (const child of node.children) nodes(child, out);
  return out;
};

const failures = [];

/** Load the bundle against one stored display mode and return its slots. */
function load(displayBuiltin) {
  store.clear();
  store.set(
    STORAGE_KEY,
    JSON.stringify({
      version: 2,
      categories: [{ id: 'c1', name: '工作' }],
      settings: { display: { builtin: displayBuiltin, custom: 'tabs', workspace: 'nested' } },
      items: [{ id: 'i1', group: 'builtin:note', title: '标题一', body: '正文一', images: [] }],
      tray: [],
    }),
  );
  const before = registrations.length;
  // The bundle caches its store on window for hot reloads, so drop it to let
  // this load re-read the freshly seeded storage.
  delete global.window.__dshPromptPoolStoreV1;
  new Function('window', 'localStorage', 'require', source)(global.window, global.localStorage, () => reactStub);
  return registrations.slice(before);
}

// The registered sidebar component is a wrapper element, so render it once.
const root = (node) => (node && typeof node.type === 'function' ? root(node.type(node.props || {})) : node);

for (const mode of ['hidden', 'tabs', 'nested']) {
  const slots = load(mode);
  const page = slots.find((entry) => entry.slot === 'betterSidebar.tab');
  const settings = slots.find((entry) => entry.slot === 'settings.section');
  const before = failures.length;

  const tabBar = nodes(root(page.component({ sessionId: 's1' })), []).find((node) => node.props && Array.isArray(node.props.tabs));
  if (!tabBar) failures.push(`${mode}: the tab bar was not rendered`);
  if (!tabBar || !tabBar.props.counts || tabBar.props.counts['builtin:note'] !== 1) {
    failures.push(`${mode}: the tab counts lost the note item`);
  }
  const tabs = tabBar ? tabBar.props.tabs : [];
  const tabIds = tabs.map((tab) => tab.id);
  const builtinTabs = tabIds.filter((id) => String(id).indexOf('builtin:') === 0);
  const foldedTabs = tabIds.filter((id) => id === 'nested:builtin');
  if (tabIds.indexOf('all') < 0) failures.push(`${mode}: the "all" tab disappeared`);
  if (tabIds.indexOf('custom:c1') < 0) failures.push(`${mode}: the custom group tab disappeared`);
  if (mode === 'hidden' && (builtinTabs.length > 0 || foldedTabs.length > 0)) failures.push('hidden: built-in tabs are still rendered');
  if (mode === 'tabs' && builtinTabs.length !== 3) failures.push(`tabs: expected 3 built-in tabs, saw ${builtinTabs.length}`);
  if (mode === 'nested' && (foldedTabs.length !== 1 || builtinTabs.length > 0)) failures.push(`nested: expected one folded built-in tab, saw ${foldedTabs.length} folded and ${builtinTabs.length} plain`);
  if (mode === 'nested') {
    const folded = tabs.find((tab) => tab.id === 'nested:builtin');
    if (!folded || folded.label !== 'tab.familyBuiltin') failures.push(`nested: the folded tab is labelled ${folded && folded.label}, expected the family label`);
  }
  if (!source.includes("'tab.familyBuiltin': '内置分组'")) failures.push('the folded tab label no longer reads 内置分组');

  const radios = nodes(settings.component({}), []).filter(
    (node) => node.type === 'input' && node.props && node.props.name === 'pp-display-builtin',
  );
  if (radios.length !== 3) failures.push(`${mode}: expected 3 built-in display radios, saw ${radios.length}`);
  const checked = radios.findIndex((radio) => radio.props.checked === true);
  const wanted = ['tabs', 'nested', 'hidden'].indexOf(mode);
  if (checked !== wanted) failures.push(`${mode}: radio #${checked} is checked, expected #${wanted}`);
  if (radios.some((radio) => radio.props.disabled)) failures.push(`${mode}: a display radio is still disabled`);

  if (failures.length === before) console.log(`[ok] display.builtin = ${mode}`);
}

for (const failure of failures) console.error('[fail]', failure);
console.log(failures.length === 0 ? '[ok] built-in groups can be hidden' : `[fail] ${failures.length} check(s)`);
if (failures.length > 0) process.exitCode = 1;
