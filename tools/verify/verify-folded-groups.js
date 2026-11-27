// A folded family keeps one tab on the strip and lists its groups as chips
// underneath, so several custom groups stay one click apart instead of merging
// into a single unnamed list. Picking a chip narrows the list to that group.
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', '..', 'plugin', 'client.js'), 'utf8');
const KEY = 'dsh.prompt-pool.v1';

const boot = (settings) => {
  const registrations = [];
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
        mod.apply({
          effect: (fn) => {
            const off = fn();
            return typeof off === 'function' ? off : () => {};
          },
          get: (name) => (name === 'betterSidebar'
            ? {
              registerTab: (descriptor) => {
                registrations.push({ slot: 'betterSidebar.tab', options: descriptor, component: descriptor.component });
              },
            }
            : undefined),
          inject: (deps, cb) => {
            cb({ get: () => undefined });
            return () => {};
          },
          locale: {
            register: () => () => {},
            bind: () => (key) => key,
            subscribe: () => () => {},
            getLocale: () => ({ id: 'zh' }),
          },
          slots: {
            inject: (key, cb) => { cb(); return () => {}; },
            register: (options, component) => {
              registrations.push({ slot: options.name, options, component });
              return () => {};
            },
          },
          layout: { selectPanel: () => {} },
        });
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
    categories: [{ id: 'c1', name: '工作' }, { id: 'c2', name: '生活' }],
    settings,
    items: [
      { id: 'a', group: 'custom:c1', title: 'A', body: 'a', images: [], createdAt: 1, updatedAt: 1 },
      { id: 'b', group: 'custom:c2', title: 'B', body: 'b', images: [], createdAt: 2, updatedAt: 2 },
      { id: 'c', group: 'builtin:note', title: 'C', body: 'c', images: [], createdAt: 3, updatedAt: 3 },
    ],
    tray: [],
  }));
  new Function('window', 'localStorage', 'require', source)(win, localStorage, () => reactStub);

  const page = () => registrations.filter((entry) => entry.slot === 'betterSidebar.tab').pop();
  const render = () => {
    cursor = 0;
    const out = page().component({ sessionId: 's1', initialScope: 'global' });
    if (out && typeof out.type === 'function') {
      cursor = 0;
      return out.type(out.props || {});
    }
    return out;
  };
  const select = (id) => {
    const strip = tabBars(render())[0];
    strip.props.onSelect(id);
  };
  return { registrations, store, render, select };
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
const tabBars = (tree) => nodes(tree, []).filter((node) => node.props && Array.isArray(node.props.tabs));
const chipsBar = (tree) => {
  const bar = nodes(tree, []).find((node) => hasClass(node, 'pp-group-bar'));
  return bar ? nodes(bar, []).find((node) => node.props && Array.isArray(node.props.tabs)) : null;
};
const rowTitles = (tree) => nodes(tree, [])
  .filter((node) => hasClass(node, 'pp-page-item'))
  .map((row) => nodes(row, [])
    .filter((node) => hasClass(node, 'pp-title-text'))
    .map((node) => (node.children || []).join(''))
    .join(''));

const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

// 1. Custom folded: one family tab on the strip, its groups as chips below.
const folded = boot({ display: { builtin: 'tabs', custom: 'nested' } });
const stripIds = tabBars(folded.render())[0].props.tabs.map((tab) => tab.id);
check(stripIds.indexOf('nested:custom') >= 0, `the folded custom tab is missing: ${stripIds.join(',')}`);
check(stripIds.indexOf('custom:c1') < 0 && stripIds.indexOf('custom:c2') < 0,
  'the custom groups still sit on the strip');
check(stripIds.indexOf('builtin:note') >= 0, 'an expanded family lost its group tab');
check(chipsBar(folded.render()) === null, 'the chips row shows before its family tab is picked');

folded.select('nested:custom');
const foldedTree = folded.render();
const chips = chipsBar(foldedTree);
check(Boolean(chips), 'the group chips row is missing under a folded family');
if (chips) {
  const ids = chips.props.tabs.map((tab) => tab.id);
  check(JSON.stringify(ids) === JSON.stringify(['nested:custom', 'custom:c1', 'custom:c2']),
    `the chips read ${ids.join(',')}`);
  check(chips.props.active === 'nested:custom', `the chips start on ${chips.props.active}, expected the whole family`);
  check(chips.props.showAdd === false, 'the chips row repeats the new-group action');
  const labels = chips.props.tabs.map((tab) => tab.label);
  check(labels.indexOf('工作') >= 0 && labels.indexOf('生活') >= 0,
    `the chips do not name their groups: ${labels.join(',')}`);
  check(JSON.stringify(rowTitles(foldedTree)) === JSON.stringify(['A', 'B']),
    `unpicked shows ${rowTitles(foldedTree).join(',')}, expected the whole family`);
  check(nodes(foldedTree, []).some((node) => hasClass(node, 'pp-tag')),
    'the mixed view does not label which group each row belongs to');

  // 2. Picking a chip narrows the list to that group.
  chips.props.onSelect('custom:c2');
  const picked = folded.render();
  const pickedChips = chipsBar(picked);
  check(Boolean(pickedChips) && pickedChips.props.active === 'custom:c2',
    `the chip did not become active: ${pickedChips && pickedChips.props.active}`);
  check(JSON.stringify(rowTitles(picked)) === JSON.stringify(['B']),
    `a picked chip shows ${rowTitles(picked).join(',')}, expected only that group`);
  check(!nodes(picked, []).some((node) => hasClass(node, 'pp-tag')),
    'a picked chip still labels every row with its group');

  // 3. The first chip ("all groups") goes back to the whole family.
  pickedChips.props.onSelect('nested:custom');
  const restored = folded.render();
  check(JSON.stringify(rowTitles(restored)) === JSON.stringify(['A', 'B']),
    `going back shows ${rowTitles(restored).join(',')}`);
}

// 4. An expanded custom family has no chips row; its group tabs still narrow.
const expanded = boot({ display: { builtin: 'tabs', custom: 'tabs' } });
check(chipsBar(expanded.render()) === null, 'an expanded family still renders a chips row');
expanded.select('custom:c1');
check(JSON.stringify(rowTitles(expanded.render())) === JSON.stringify(['A']),
  `a group tab shows ${rowTitles(expanded.render()).join(',')}`);

for (const failure of failures) console.error('[fail]', failure);
console.log(failures.length === 0
  ? '[ok] a folded family keeps its groups as chips and the list follows the chip'
  : `[fail] ${failures.length} check(s)`);
if (failures.length > 0) process.exitCode = 1;
