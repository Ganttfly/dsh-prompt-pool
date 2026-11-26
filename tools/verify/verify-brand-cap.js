// Proves the composer trigger's brand cap opens the right-sidebar page when the
// host has one: the cap lands on the page, the domain menus keep the panel one
// item away, and a host without a sidebar still falls back to the panel.
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', '..', 'plugin', 'client.js'), 'utf8');
const KEY = 'dsh.prompt-pool.v1';

const boot = (services) => {
  const registrations = [];
  const openTabCalls = [];
  if (services.sidebarRight) {
    services.sidebarRight = {
      ...services.sidebarRight,
      openTab: (kind, options) => { openTabCalls.push({ kind, options }); },
    };
  }
  const store = new Map();
  let cells = [];
  let cursor = 0;
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
    useEffect: (fn) => {
      slot(() => null);
      try {
        const off = fn();
        if (typeof off === 'function') slot(() => off);
      } catch (_error) {
        /* the stub has no host events to wire */
      }
    },
    useSyncExternalStore: (subscribe, getSnapshot) => getSnapshot(),
  };
  const win = {
    __ModuleLoader__: {
      load(spec) {
        const mod = spec.factory((name) => {
          if (name === 'react') return reactStub;
          throw new Error('unexpected require: ' + name);
        });
        const ctx = {
          effect: (fn) => {
            const off = fn();
            return typeof off === 'function' ? off : () => {};
          },
          get: (name) => services[name],
          inject: (deps, cb) => {
            cb({ get: (name) => services[name] });
            return () => {};
          },
          locale: {
            register: () => () => {},
            bind: () => (key) => key,
            subscribe: () => () => {},
            getLocale: () => ({ id: 'en' }),
          },
          slots: {
            inject: (key, cb) => {
              cb();
              return () => {};
            },
            register: (options, component) => {
              registrations.push({ slot: options.name, options, component });
              return () => {};
            },
          },
          layout: { selectPanel: () => {} },
        };
        mod.apply(ctx);
        return mod;
      },
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout: () => 0,
    clearTimeout: () => {},
    location: { reload: () => {} },
  };
  const localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
  };
  store.set(KEY, JSON.stringify({
    version: 2,
    seeded: 2,
    categories: [],
    settings: {},
    items: [{ id: 'i1', group: 'workspace:w1', title: 't', body: 'b', images: [], createdAt: 1, updatedAt: 1 }],
    tray: [],
  }));
  win.addEventListener = () => {};
  new Function('window', 'localStorage', 'require', source)(win, localStorage, () => reactStub);

  const render = (entry) => {
    cursor = 0;
    return entry.component({});
  };
  return { registrations, openTabCalls, win, render };
};

const nodes = (node, out) => {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const child of node) nodes(child, out);
    return out;
  }
  out.push(node);
  if (Array.isArray(node.children)) for (const child of node.children) nodes(child, out);
  return out;
};
const hasClass = (node, name) => Boolean(node.props && String(node.props.className || '').split(' ').indexOf(name) >= 0);

const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

// 1. A host with the native right sidebar: the cap opens the page tab.
const sidebar = boot({
  sidebarRight: {},
  sidebarRightTabs: { register: () => () => {} },
});
const sidebarTrigger = sidebar.registrations.find((entry) => entry.slot === 'conversation.input.right');
check(Boolean(sidebarTrigger), 'the composer trigger was not registered');
if (sidebarTrigger) {
  const tree = sidebar.render(sidebarTrigger);
  const trigger = nodes(tree, []).find((node) => node.type === 'button' && hasClass(node, 'pp-trigger'));
  check(Boolean(trigger), 'the brand cap is missing');
  if (trigger) {
    trigger.props.onClick();
    check(sidebar.openTabCalls.length === 1, `the cap called openTab ${sidebar.openTabCalls.length} time(s), expected once`);
    check(sidebar.openTabCalls[0] && sidebar.openTabCalls[0].kind === 'prompt-pool', 'the cap asked the sidebar for another tab');
    const ask = sidebar.win.__dshPromptPoolPageIntentV1 && sidebar.win.__dshPromptPoolPageIntentV1.get();
    check(ask && ask.seq === 1, 'the cap did not publish an ask for the page');
    check(ask && ask.scope === '' && ask.create === false, 'the cap changed the page destination');
  }

  // The Prompts menu keeps the page entry and the panel entry apart.
  const renderMenu = () => {
    const tree2 = sidebar.render(sidebarTrigger);
    const prompts = nodes(tree2, []).find((node) => node.type === 'button' && node.props && node.props['data-domain'] === 'prompts');
    check(Boolean(prompts), 'the prompts menu button is missing');
    if (prompts) prompts.props.onClick();
    return nodes(sidebar.render(sidebarTrigger), []);
  };
  const menuNodes = renderMenu();
  const menuLabels = menuNodes
    .filter((node) => node.props && String(node.props.className || '').indexOf('pp-trigger-menu-item') >= 0)
    .map((node) => JSON.stringify(node.children));
  check(menuLabels.some((label) => label.indexOf('prompt.menu.view') >= 0), 'the prompts view entry is missing');
  check(menuLabels.some((label) => label.indexOf('menu.panel') >= 0), 'the open-in-panel entry is missing on a sidebar host');
  const viewEntry = menuNodes.find((node) => node.type === 'button' && hasClass(node, 'pp-trigger-menu-item')
    && JSON.stringify(node.children).indexOf('prompt.menu.view') >= 0);
  if (viewEntry) {
    viewEntry.props.onClick();
    check(sidebar.openTabCalls.length === 2, 'the prompts view entry did not open the page tab');
    const ask = sidebar.win.__dshPromptPoolPageIntentV1.get();
    check(ask.scope === 'workspace' && ask.create === false, `the prompts view entry asked for ${ask.scope}/${ask.create}`);
  }
  const panelEntry = menuNodes.find((node) => node.type === 'button' && hasClass(node, 'pp-trigger-menu-item')
    && JSON.stringify(node.children).indexOf('menu.panel') >= 0);
  check(Boolean(panelEntry), 'the open-in-panel entry is not a menu item');
  if (panelEntry) {
    const before = sidebar.openTabCalls.length;
    panelEntry.props.onClick();
    check(sidebar.openTabCalls.length === before, 'the open-in-panel entry opened the page tab too');
  }
}

// 2. A host without a sidebar keeps the panel: no page tab, no panel menu item.
const bare = boot({});
const bareTrigger = bare.registrations.find((entry) => entry.slot === 'conversation.input.right');
check(Boolean(bareTrigger), 'the composer trigger was not registered on a bare host');
if (bareTrigger) {
  const tree = bare.render(bareTrigger);
  const trigger = nodes(tree, []).find((node) => node.type === 'button' && hasClass(node, 'pp-trigger'));
  check(Boolean(trigger), 'the brand cap is missing on a bare host');
  if (trigger) {
    const before = bare.win.__dshPromptPoolPageIntentV1 ? bare.win.__dshPromptPoolPageIntentV1.get().seq : 0;
    trigger.props.onClick();
    const after = bare.win.__dshPromptPoolPageIntentV1 ? bare.win.__dshPromptPoolPageIntentV1.get().seq : 0;
    check(after === before, 'a bare host still published a page ask');
  }
  const tree2 = bare.render(bareTrigger);
  const prompts = nodes(tree2, []).find((node) => node.type === 'button' && node.props && node.props['data-domain'] === 'prompts');
  if (prompts) prompts.props.onClick();
  const labels = nodes(bare.render(bareTrigger), [])
    .filter((node) => node.props && String(node.props.className || '').indexOf('pp-trigger-menu-item') >= 0)
    .map((node) => JSON.stringify(node.children));
  check(!labels.some((label) => label.indexOf('menu.panel') >= 0), 'a bare host still offers an open-in-panel entry');
}

for (const failure of failures) console.error('[fail]', failure);
console.log(failures.length === 0
  ? '[ok] the brand cap opens the page, the panel stays in the menus, and a bare host keeps the panel'
  : `[fail] ${failures.length} check(s)`);
if (failures.length > 0) process.exitCode = 1;
