// The conversation's right-click menu: only a right-click that carries selected
// text opens it, a pick stores that text as a new pool item in the chosen group,
// and the destination is remembered across a reload.
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', '..', 'plugin', 'client.js'), 'utf8');
const STORAGE_KEY = 'dsh.prompt-pool.v1';
const store = new Map();
const timers = [];
let dismissed = 0;

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
  useSyncExternalStore: (subscribe, getSnapshot) => getSnapshot(),
};

global.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
};

const conversation = {
  interactions: {
    register: (definition) => {
      booted.interactions.push(definition);
      return () => {};
    },
  },
};

let booted = null;

/** Load the module the way the page does; `settings` carries what a reload sees. */
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
          get: (name) => (name === 'uiConversation' ? conversation : undefined),
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
    setTimeout: (fn) => {
      timers.push(fn);
      return timers.length;
    },
    clearTimeout: () => {},
    location: { reload: () => {} },
  };
  new Function('window', 'localStorage', 'require', source)(global.window, global.localStorage, () => reactStub);
  return captured;
};

store.set(STORAGE_KEY, JSON.stringify({
  version: 2,
  seeded: 2,
  categories: [{ id: 'c1', name: '分组甲' }],
  settings: {},
  items: [{ id: 'i1', group: 'builtin:note', title: '现有', body: '现有正文', images: [] }],
  tray: [],
}));

boot();

const failures = [];
const fail = (message) => failures.push(message);

const workspaceSnapshot = {
  items: [{ workspaceId: 'w1', title: 'dsh-prompt-pool', path: 'D:\\Hotpot\\dsh-prompt-pool', sessionIds: ['s1'] }],
};

const menuProps = (text) => ({
  sessionId: 's1',
  trigger: 'contextmenu',
  readText: () => text,
  dismiss: () => { dismissed += 1; },
  useWorkspaces: () => workspaceSnapshot,
});

const walk = (node, visit) => {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((child) => walk(child, visit)); return; }
  visit(node);
  if (Array.isArray(node.children)) node.children.forEach((child) => walk(child, visit));
};

/** Every string under one node, so a translated copy is asserted by its key. */
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

const findMenu = (captured) => captured.registrations.find((entry) => entry.slot === 'conversation.chat.text-interaction');

const rowsOf = (tree) => {
  const rows = [];
  walk(tree, (node) => {
    if (node.type === 'button' && String(node.props && node.props.className || '').indexOf('pp-selrow') >= 0) rows.push(node);
  });
  return rows;
};

const labelOf = (row) => {
  const name = (row.children || []).find((child) => child && child.props && String(child.props.className || '').indexOf('pp-selname') >= 0);
  return name && Array.isArray(name.children) ? name.children[0] : null;
};

const findDone = (tree) => {
  let found = null;
  walk(tree, (node) => {
    if (node.props && String(node.props.className || '').split(' ').indexOf('pp-seldone') >= 0) found = node;
  });
  return found;
};

const renderMenu = (entry, text) => {
  cells = [];
  resetHooks();
  return entry.component(menuProps(text));
};

/** Open the pool entry's submenu the way a hover or click does. */
const openGroups = (entry, text) => {
  const poolRow = rowsOf(renderMenu(entry, text)).find((row) => labelOf(row) === 'menu.title');
  if (!poolRow) return { rows: [] };
  poolRow.props.onClick();
  resetHooks();
  const tree = entry.component(menuProps(text));
  return { tree, rows: rowsOf(tree) };
};

// --- the gesture: only a right-click that carries a selection is claimed ------
const first = booted;
const interaction = first.interactions.find((entry) => entry.id === 'prompt-pool');
const menuEntry = findMenu(first);
if (!interaction) fail('the right-click interaction was not registered');
if (!menuEntry) fail('the text-interaction slot was not registered');
else if (!menuEntry.options || menuEntry.options.key !== 'prompt-pool') {
  fail('the slot key must match the interaction id, so the host renders this menu');
}

const dispatch = (trigger, text) => {
  let opened = false;
  let prevented = false;
  interaction.onInteraction({
    trigger,
    readText: () => text,
    open: () => { opened = true; },
    preventDefault: () => { prevented = true; },
  });
  return { opened, prevented };
};

if (interaction) {
  const drag = dispatch('selection', '划选的文字');
  if (drag.opened || drag.prevented) fail('a drag selection must stay with the built-in Quote action');
  const empty = dispatch('contextmenu', null);
  if (empty.opened || empty.prevented) fail('a right-click without selected text must keep the native menu');
  const menu = dispatch('contextmenu', '划选的文字');
  if (!menu.opened) fail('a right-click on selected text must open the menu');
  if (!menu.prevented) fail('the native menu must be suppressed once the menu opens');
  console.log('[ok] only a right-click that carries a selection opens the menu');
}

// --- the menu: two levels, counts and the pick --------------------------------
const topRows = rowsOf(renderMenu(menuEntry, '划选的文字'));
const topLabels = topRows.map(labelOf);
if (topLabels.indexOf('menu.copy') < 0) fail('the Copy row is missing');
if (topLabels.indexOf('menu.title') < 0) fail('the pool entry is missing');
if (topLabels.indexOf('分组甲') >= 0 || topLabels.indexOf('group.note') >= 0) {
  fail(`the groups must live in the submenu, not at the top level: ${JSON.stringify(topLabels)}`);
}

const opened = openGroups(menuEntry, '划选的文字');
const rows = opened.rows.filter((row) => {
  const label = labelOf(row);
  return label !== 'menu.copy' && label !== 'menu.title';
});
if (rows.length === 0) fail('the submenu rendered no destination rows');
else {
  const labels = rows.map(labelOf);
  if (labels.indexOf('分组甲') < 0) fail(`the custom group is missing from ${JSON.stringify(labels)}`);
  if (labels.indexOf('group.note') < 0) fail('the built-in groups are missing');
  const noteRow = rows[labels.indexOf('group.note')];
  const count = (noteRow.children || []).find((child) => child && child.props && String(child.props.className || '').indexOf('pp-selcount') >= 0);
  if (!count || count.children[0] !== '1') fail('the group count did not include the existing item');
}

const custom = rows.find((row) => labelOf(row) === '分组甲');
if (custom) {
  custom.props.onClick();
  const pool = global.window.__dshPromptPoolStoreV1;
  const added = pool.get().items[pool.get().items.length - 1];
  if (!added || added.group !== 'custom:c1') fail('the pick did not land in the chosen group');
  else {
    if (added.body !== '划选的文字') fail(`the body changed: ${JSON.stringify(added.body)}`);
    if (added.title !== '划选的文字') fail(`the title was ${JSON.stringify(added.title)}`);
    if (!Array.isArray(added.images) || added.images.length !== 0) fail('a text-only pick must not carry images');
  }
  const saved = JSON.parse(store.get(STORAGE_KEY));
  if (!saved.settings || saved.settings.lastCaptureGroup !== 'custom:c1') {
    fail(`the destination was not remembered: ${JSON.stringify(saved.settings)}`);
  }
  // The menu stays for the success line, then dismisses itself.
  resetHooks();
  const after = menuEntry.component(menuProps('划选的文字'));
  const done = findDone(after);
  if (!done) fail('the success line was not rendered after the pick');
  else if (textOf(done).indexOf('menu.saved') < 0) fail('the success line does not name the destination copy');
  if (timers.length === 0) fail('the menu did not schedule its own dismissal');
  else {
    timers[timers.length - 1]();
    if (dismissed === 0) fail('the scheduled dismissal did not close the menu');
  }
  console.log('[ok] a pick saves the selection in the chosen group and remembers it');
}

// --- the menu keeps Copy: the browser menu it replaces had it -----------------
let copiedText = null;
global.document = {
  createElement: () => ({
    style: {},
    value: '',
    setAttribute: () => {},
    select() { copiedText = this.value; },
  }),
  body: { appendChild: () => {}, removeChild: () => {} },
  execCommand: () => true,
};
const copyRow = rowsOf(renderMenu(menuEntry, '要复制的文字')).find((row) => labelOf(row) === 'menu.copy');
if (!copyRow) fail('the menu lost Copy, which the native menu it replaces offered');
else {
  copyRow.props.onClick();
  resetHooks();
  const copiedDone = findDone(menuEntry.component(menuProps('要复制的文字')));
  if (copiedText !== '要复制的文字') fail(`Copy captured ${JSON.stringify(copiedText)}`);
  if (!copiedDone) fail('Copy did not report its result');
  else if (textOf(copiedDone).indexOf('menu.copied') < 0) fail('Copy did not say it was copied');
  else console.log('[ok] Copy stays in the menu the plugin replaces');
}

// --- a reload keeps the remembered destination and leads the menu -------------
const reloaded = boot();
const reloadedMenu = findMenu(reloaded);
if (!reloadedMenu) fail('the menu was not registered after a reload');
else {
  const reloadedRows = openGroups(reloadedMenu, '第二段文字').rows.filter((row) => labelOf(row) !== 'menu.copy' && labelOf(row) !== 'menu.title');
  if (reloadedRows.length === 0) fail('the reloaded menu rendered no rows');
  else {
    if (labelOf(reloadedRows[0]) !== '分组甲') fail(`the remembered group did not lead the reloaded menu: ${labelOf(reloadedRows[0])}`);
    const tag = (reloadedRows[0].children || []).find((child) => child && child.props && String(child.props.className || '').indexOf('pp-sellast') >= 0);
    if (!tag) fail('the remembered row is not marked');
    console.log('[ok] a reload keeps the remembered destination in front');
  }
}

// --- edges: whitespace offers nothing, CRLF collapses ------------------------
const blank = reloadedMenu ? renderMenu(reloadedMenu, '   \n  ') : null;
const multiPick = reloadedMenu
  ? openGroups(reloadedMenu, '第一行\r\n第二行').rows.find((row) => labelOf(row) === '分组甲')
  : null;
if (blank !== null) fail('a whitespace-only selection must not open the menu');
if (!multiPick) fail('the multiline selection lost its destinations');
else {
  multiPick.props.onClick();
  const pool = global.window.__dshPromptPoolStoreV1;
  const added = pool.get().items[pool.get().items.length - 1];
  const normalized = added.body === '第一行\n第二行' && added.title === '第一行';
  if (added.body !== '第一行\n第二行') fail(`line endings were not normalized: ${JSON.stringify(added.body)}`);
  if (added.title !== '第一行') fail(`the title should be the first line: ${JSON.stringify(added.title)}`);
  if (normalized) console.log('[ok] whitespace is rejected and line endings are normalized');
}

// --- a failed write is reported, never claimed as saved ----------------------
global.localStorage.setItem = () => { throw new Error('quota'); };
const failedBoot = boot();
const failedMenu = findMenu(failedBoot);
if (!failedMenu) fail('the menu was not registered on a failing store');
else {
  const failedPick = openGroups(failedMenu, '写不进去的字').rows.find((row) => labelOf(row) === '分组甲');
  if (!failedPick) fail('the failing store lost the destinations');
  else {
    failedPick.props.onClick();
    resetHooks();
    let failedDone = null;
    walk(failedMenu.component(menuProps('写不进去的字')), (node) => {
      if (node.props && node.props['data-kind'] === 'error') failedDone = node;
    });
    if (!failedDone) fail('a failed write still claimed the selection was saved');
    else if (textOf(failedDone).indexOf('status.storageFailed') < 0) {
      fail('the failed write did not use the storage failure copy');
    } else console.log('[ok] a failed write is reported instead of claimed');
  }
}

for (const failure of failures) console.error('[fail]', failure);
console.log(failures.length === 0 ? '[ok] conversation right-click menu works' : `[fail] ${failures.length} check(s)`);
if (failures.length > 0) process.exitCode = 1;