// The send-queue card: an empty queue keeps a quiet strip at the bottom, and a
// queued row wears one mark that says what it is instead of a word chip.
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
        get: (name) => (name === 'betterSidebar'
          ? {
              registerTab: (descriptor) => { registrations.push({ slot: 'betterSidebar.tab', component: descriptor.component }); return () => {}; },
              updateTab: () => {},
            }
          : undefined),
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

const panelProps = {
  sessionId: 's1',
  initialScope: 'workspace',
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
  useWorkspaces: () => ({ items: [{ id: 'w1', workspaceId: 'w1', name: 'W', sessionIds: ['s1'] }], currentId: 'w1' }),
  useSession: () => ({}),
};

const data = (settings, items, tray) => JSON.stringify({ version: 2, seeded: 2, categories: [], settings, items, tray });

const nodes = (node, out) => {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { node.forEach((child) => nodes(child, out)); return out; }
  out.push(node);
  if (node.children) node.children.forEach((child) => nodes(child, out));
  return out;
};
const texts = (node, out) => {
  if (typeof node === 'string') out.push(node);
  else if (Array.isArray(node)) node.forEach((child) => texts(child, out));
  else if (node && typeof node === 'object' && node.children) node.children.forEach((child) => texts(child, out));
  return out;
};
const byName = (tree, name) => nodes(tree, []).filter((node) => typeof node.type === 'function' && node.type.name === name);
const byClass = (tree, name) => nodes(tree, []).filter((node) => node.props && String(node.props.className || '').split(' ').indexOf(name) >= 0);
// The pool list behind the card also draws type marks, so a queued row is read
// through its own chip rather than by counting marks on the whole panel.
const chipMarks = (tree) => byClass(tree, 'pp-chip').map((chip) => byName(chip, 'TypeMark')[0] || null);

const load = (settings, items, tray) => {
  store.set(STORAGE_KEY, data(settings, items, tray));
  delete global.window.__dshPromptPoolStoreV1;
  const before = registrations.length;
  new Function('window', 'localStorage', 'require', source)(global.window, global.localStorage, () => reactStub);
  const entry = registrations.slice(before).find((candidate) => candidate.slot === 'conversation.input.overlay');
  cells = [];
  resetHooks();
  const out = entry.component(panelProps);
  resetHooks();
  return out && typeof out.type === 'function' ? out.type(out.props || panelProps) : out;
};

const failures = [];
const fail = (message) => failures.push(message);

const ITEMS = [
  { id: 'i1', group: 'workspace:w1', title: '一', body: '第一条', images: [], type: 'idea' },
  { id: 'i2', group: 'workspace:w1', title: '二', body: '第二条', images: [], type: '' },
];

// 1. No entries: the strip stays, and it is not the full card.
{
  const tree = load({}, ITEMS, []);
  const strip = byClass(tree, 'pp-queue-strip');
  if (strip.length !== 1) fail(`empty queue rendered ${strip.length} strip(s), expected 1`);
  if (byClass(tree, 'pp-queue-strip-empty').length !== 1) fail('the empty strip is missing its own class');
  if (!texts(tree, []).includes('tray.emptyStrip')) fail('the empty strip does not say how to fill it');
  if (byClass(tree, 'pp-tray').length !== 0) fail('the empty queue still renders the full tray');
  if (texts(tree, []).includes('tray.release')) fail('the empty queue still offers a send button');
}

// 2. The strip does not depend on the collapse switch: an expanded preference
//    cannot open an empty card.
{
  const tree = load({ queueCollapsed: false }, ITEMS, []);
  if (byClass(tree, 'pp-queue-strip-empty').length !== 1) fail('an empty queue opened as a card although nothing is queued');
  if (byClass(tree, 'pp-tray').length !== 0) fail('an empty queue with queueCollapsed=false rendered the tray body');
}

// 3. A queued prompt wears its type mark, not the word chip.
{
  const tray = [{ key: 'k1', itemId: 'i1', body: '第一条', images: [], type: 'prompt', source: null }];
  const tree = load({ queueCollapsed: false }, ITEMS, tray);
  const marks = chipMarks(tree);
  if (marks.length !== 1) fail(`a one-row queue rendered ${marks.length} type mark(s), expected 1`);
  else {
    if (marks[0].props.name !== 'bulb') fail(`the idea prompt wore "${marks[0].props.name}", expected bulb`);
    if (marks[0].props.tone !== '#f97316') fail(`the idea mark wore tone ${marks[0].props.tone}`);
    if (marks[0].props.title !== 'prompt.type.idea') fail(`the idea mark titled "${marks[0].props.title}"`);
  }
  if (byClass(tree, 'pp-chip-source').length !== 0) fail('the word chip is still rendered next to the mark');
  if (texts(tree, []).includes('tray.source.prompt')) fail('the row still spells out "Prompt" beside the mark');
}

// 4. An annotation row wears the annotation's own kind.
{
  const tray = [{
    key: 'k2', itemId: '', body: '【原文】x', images: [], type: 'annotation',
    source: { noteId: 'n1', kind: 'disagree', quote: 'x', body: 'y', order: 1 },
  }];
  const tree = load({ queueCollapsed: false }, ITEMS, tray);
  const mark = chipMarks(tree)[0];
  if (!mark) fail('the annotation row rendered no mark');
  else {
    if (mark.props.name !== 'x') fail(`the disagree annotation wore "${mark.props.name}", expected x`);
    if (mark.props.tone !== '#ef4444') fail(`the disagree mark wore tone ${mark.props.tone}`);
  }
}

// 5. A reviewed batch wears the summary mark; a prompt whose pool item is gone
//    falls back to the plain prompt glyph instead of guessing a type.
{
  const tray = [
    { key: 'k3', itemId: '', body: '【原文】x', images: [], type: 'review', source: null },
    { key: 'k4', itemId: 'gone', body: '脱离池子的一条', images: [], type: 'prompt', source: null },
  ];
  const tree = load({ queueCollapsed: false }, ITEMS, tray);
  const chipNodes = byClass(tree, 'pp-chip');
  const marks = chipMarks(tree);
  if (chipNodes.length !== 2) fail(`two queued rows rendered ${chipNodes.length} chip(s)`);
  if (marks.length !== 2) fail(`two queued rows rendered ${marks.length} mark(s)`);
  else {
    if (marks[0].props.name !== 'review') fail(`the reviewed batch wore "${marks[0].props.name}"`);
    if (marks[1].props.name !== 'prompt') fail(`the orphaned prompt wore "${marks[1].props.name}", expected prompt`);
    if (marks[1].props.title !== 'tray.source.prompt') fail(`the orphaned prompt titled "${marks[1].props.title}"`);
  }
}

// 6. Source-level: the pieces this relies on are still in one place.
{
  if (!source.includes('function trayMarkOf(entry, items)')) fail('trayMarkOf is missing');
  if (!source.includes('const mark = trayMarkOf(entry, items);')) fail('the row no longer asks trayMarkOf for its mark');
  if (source.includes('pp-chip-source')) fail('the word chip markup or its CSS survived');
  if (!source.includes("'tray.emptyStrip'")) fail('the empty-strip copy is missing');
  if (!source.includes("'.pp-queue-strip-empty{")) fail('the empty strip has no style of its own');
}

for (const message of failures) console.error('[fail]', message);
console.log(failures.length === 0 ? '[ok] the empty queue keeps its strip and a row wears one mark' : '[fail] ' + failures.length + ' check(s)');
if (failures.length > 0) process.exitCode = 1;
