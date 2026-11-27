// Proves every row of the composer tray menus wears its own mark: six rows,
// six different glyphs, each one drawn in the menu's own accent.
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', '..', 'plugin', 'client.js'), 'utf8');
const KEY = 'dsh.prompt-pool.v1';

const boot = () => {
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
        const ctx = {
          effect: (fn) => {
            const off = fn();
            return typeof off === 'function' ? off : () => {};
          },
          get: () => undefined,
          inject: (deps, cb) => {
            cb({ get: () => undefined });
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
    items: [],
    tray: [],
    notes: [{ id: 'n1', sessionId: 's1', kind: 'agree', body: 'b', quote: 'q', order: 1, createdAt: 1, updatedAt: 1 }],
  }));
  new Function('window', 'localStorage', 'require', source)(win, localStorage, () => reactStub);

  const render = (entry) => {
    cursor = 0;
    return entry.component({ sessionId: 's1' });
  };
  return { registrations, render };
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

const app = boot();
const trigger = app.registrations.find((entry) => entry.slot === 'conversation.input.right');
check(Boolean(trigger), 'the composer trigger was not registered');
if (!trigger) {
  console.error('[fail] the composer trigger was not registered');
  process.exitCode = 1;
  return;
}

// Open a domain menu and collect its rows.
const rowsOf = (domain) => {
  const initial = app.render(trigger);
  const button = nodes(initial, []).find((node) => node.type === 'button'
    && node.props && node.props['data-domain'] === domain);
  check(Boolean(button), `the ${domain} menu button is missing`);
  if (button) button.props.onClick();
  const tree = app.render(trigger);
  return nodes(tree, []).filter((node) => hasClass(node, 'pp-trigger-menu-item'));
};

// The path data an icon draws, so two rows sharing a glyph is visible here.
const markOf = (row) => {
  const mark = (row.children || []).find((child) => child && hasClass(child, 'pp-trigger-menu-mark'));
  if (!mark) return '';
  const shapes = (mark.children || []).flatMap((child) => (child && child.children) || []);
  return shapes.map((shape) => (shape.props && (shape.props.d || shape.props.cx || shape.props.x)) || '').join('|');
};

const annotations = rowsOf('annotations');
check(annotations.length === 3, `the annotations menu holds ${annotations.length} row(s), expected 3`);
const prompts = rowsOf('prompts');
check(prompts.length === 3, `the prompts menu holds ${prompts.length} row(s), expected 3`);

const marks = [];
for (const row of [...annotations, ...prompts]) {
  const mark = markOf(row);
  const label = JSON.stringify(row.children || []);
  check(mark.length > 0, `a row carries no mark: ${label}`);
  marks.push(mark);
}
check(marks.length === 6, `checked ${marks.length} mark(s), expected 6`);
check(new Set(marks).size === 6, 'two rows share the same mark');
check(marks.every((mark) => mark.indexOf('|') > 0 || mark.length > 12), 'a row draws nothing recognisable as a mark');

// The sets are distinct in the way the labels are: no glyph repeats across the
// two menus either, so "which menu am I in" reads from the marks alone.
const annotationsMarks = marks.slice(0, 3);
const promptsMarks = marks.slice(3);
check(annotationsMarks.every((mark) => promptsMarks.indexOf(mark) < 0), 'a glyph appears in both menus');

// Each row keeps its label: the mark adds a fact, it does not replace the words.
const labeled = (rows, key) => rows.some((row) => JSON.stringify(row.children || []).indexOf(key) >= 0);
check(labeled(annotations, 'note.addPick'), 'the continuous annotation row lost its label');
check(labeled(annotations, 'note.menu.summary'), 'the summary row lost its label');
check(labeled(annotations, 'note.menu.view'), 'the annotations view row lost its label');
check(labeled(prompts, 'prompt.menu.save'), 'the save draft row lost its label');
check(labeled(prompts, 'prompt.menu.new'), 'the add prompt row lost its label');
check(labeled(prompts, 'prompt.menu.view'), 'the prompts view row lost its label');

// The three glyphs this patch introduced exist, and each is drawn differently.
for (const name of ['pick', 'funnel', 'plusBox']) {
  check(source.indexOf(`case '${name}':`) >= 0, `the ${name} icon is missing`);
}
check(source.indexOf("case 'pick':") >= 0 && source.indexOf('M6.9 4 18.4 9.8') > 0, 'the pick mark lost its pointer');
check(source.indexOf('M3.8 5h16.4l-6.2 7.4') > 0, 'the funnel mark lost its outline');
check(source.indexOf("case 'plusBox':") > 0 && source.indexOf('M12 8.6v6.8M8.6 12h6.8') > 0, 'the add-prompt mark lost its plus');

// The row styles the mark, and the mark is held quieter than the label.
check(source.indexOf('.pp-trigger-menu-mark{display:inline-flex') > 0, 'the menu mark has no style');
check(source.indexOf('.pp-trigger-menu-mark svg{width:15px;height:15px}') > 0, 'the mark is not drawn at the row size');
check(source.indexOf('.pp-trigger-menu-item:hover:not([disabled]) .pp-trigger-menu-mark') > 0, 'the mark does not brighten on hover');
check(source.indexOf("role: 'menuitem'") > 0 && source.indexOf('function MenuItem(options)') > 0,
  'the rows are no longer built from one helper');

for (const failure of failures) console.error('[fail]', failure);
console.log(failures.length === 0
  ? '[ok] all six tray menu rows wear their own mark'
  : `[fail] ${failures.length} check(s)`);
if (failures.length > 0) process.exitCode = 1;
