// Annotations live inside the prompt pool: a 批注 tab appears while the session
// has notes, composes the quoted reply, and deletes or clears them.
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', '..', 'plugin', 'client.js'), 'utf8');
const STORAGE_KEY = 'dsh.prompt-pool.v1';
const NOTES_KEY = 'dsh.prompt-pool.notes.v1';
const store = new Map();
let booted = null;

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
    // Capture this render's cell array so a nested component's setter keeps
    // writing to its own hooks after the outer render restores its cells.
    const bucket = cells;
    const index = slot(init);
    return [bucket[index], (next) => { bucket[index] = typeof next === 'function' ? next(bucket[index]) : next; }];
  },
  useRef: (init) => cells[slot(() => ({ current: init }))],
  useMemo: (factory) => cells[slot(factory)],
  useCallback: (fn) => cells[slot(() => fn)],
  useEffect: () => { cursor += 1; },
  useSyncExternalStore: (subscribe, getSnapshot) => {
    const value = getSnapshot();
    // The composer panel renders only while its UI store says it is open.
    return value && typeof value === 'object' && 'open' in value ? { ...value, open: true } : value;
  },
};

global.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
};

/** Load the module the way the page does; every boot gets a fresh window. */
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
          get: (name) => (name === 'uiConversation'
            ? { interactions: { register: (definition) => { booted.interactions.push(definition); return () => {}; } } }
            : undefined),
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
    setTimeout: () => 0,
    clearTimeout: () => {},
    location: { reload: () => {} },
  };
  new Function('window', 'localStorage', 'require', source)(global.window, global.localStorage, () => reactStub);
  return captured;
};

const notesSaved = () => (store.has(NOTES_KEY) ? JSON.parse(store.get(NOTES_KEY)) : null);

const walk = (node, visit) => {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((child) => walk(child, visit)); return; }
  visit(node);
  if (Array.isArray(node.children)) node.children.forEach((child) => walk(child, visit));
};

const findAll = (tree, predicate) => {
  const out = [];
  walk(tree, (node) => { if (predicate(node)) out.push(node); });
  return out;
};

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

const failures = [];
const fail = (message) => failures.push(message);

/** Render a child function component with its own hook cells. */
const childStores = new Map();
const renderChild = (node) => {
  const name = node.type && node.type.name ? node.type.name : 'unknown';
  if (!childStores.has(name)) childStores.set(name, { cells: [] });
  const storeRef = childStores.get(name);
  const savedCells = cells;
  const savedCursor = cursor;
  cells = storeRef.cells;
  cursor = 0;
  let out;
  try {
    out = node.type(node.props || {});
  } finally {
    storeRef.cells = cells;
    cells = savedCells;
    cursor = savedCursor;
  }
  return out;
};

const findComponent = (tree, name) => findAll(tree, (node) => typeof node.type === 'function' && node.type.name === name)[0];

const poolSeed = () => JSON.stringify({
  version: 2,
  seeded: 2,
  categories: [],
  settings: {},
  items: [],
  tray: [],
});

const notesSeed = () => JSON.stringify({
  version: 1,
  items: [
    {
      id: 'n1', sessionId: 's1', nodeKey: 'node-1', quote: '报告类型 → job 映射：…，对吗？',
      prefix: '', suffix: '', offset: 2, order: 2, kind: 'comment', body: '对，按你说的映射', createdAt: 1, updatedAt: 1,
    },
    {
      id: 'n2', sessionId: 's1', nodeKey: 'node-1', quote: '构建是否接受参数？',
      prefix: '', suffix: '', offset: 30, order: 1, kind: 'comment', body: '接受分支参数', createdAt: 2, updatedAt: 2,
    },
  ],
});

store.set(STORAGE_KEY, poolSeed());
store.set(NOTES_KEY, notesSeed());
boot();

const panelEntry = booted.registrations.find((entry) => entry.slot === 'conversation.input.overlay');
if (!panelEntry) fail('the composer panel was not registered');
else {
  let inserted = null;
  const inputActions = {
    captureInsertion: () => ({ start: 0, end: 0, draftRev: 1 }),
    insertText: (text) => {
      inserted = text;
      return true;
    },
    setDraft: () => {},
  };
  const props = {
    sessionId: 's1',
    useInput: () => ({ draft: '', phase: 'plain', queue: [], attachmentIds: [] }),
    inputActions,
    useWorkspaces: () => ({ items: [], currentId: '' }),
    useSession: () => ({}),
  };
  const render = () => {
    resetHooks();
    return panelEntry.component(props);
  };

  cells = [];
  childStores.clear();
  const tree = render();
  const tabBarNode = findComponent(tree, 'TabBar');
  if (!tabBarNode) fail('the pool tab strip was not rendered');
  else {
    const bar = renderChild(tabBarNode);
    const notesTab = findAll(bar, (node) => node.type === 'button'
      && String(node.props && node.props.className || '') === 'pp-tab'
      && textOf(node).indexOf('note.title') >= 0)[0];
    if (!notesTab) fail('the notes tab is missing while the session has notes');
    else {
      notesTab.props.onClick();
      const notesView = () => {
        const node = findComponent(render(), 'NotesView');
        return node ? renderChild(node) : null;
      };
      const view = notesView();
      if (!view) fail('the notes tab did not render the annotation list');
      else {
        const rows = findAll(view, (node) => node.props && String(node.props.className || '') === 'pp-notes-row');
        if (rows.length !== 2) fail(`the notes tab rendered ${rows.length} rows, expected 2`);
        else console.log('[ok] a 批注 tab lists the session annotations');
        const checks = findAll(view, (node) => node.type === 'input'
          && String(node.props && node.props.className || '').indexOf('pp-note-check') >= 0);
        if (checks.length !== 2) fail(`the notes tab rendered ${checks.length} checkboxes, expected 2`);
        else if (checks.some((check) => check.props.checked !== true)) fail('annotations do not start checked');
        else console.log('[ok] every annotation starts with a checked checkbox');
      }

      // The header action now opens the review sheet instead of inserting a
      // composer draft; the sheet itself is covered in verify-review.js.
      const reviewButton = findAll(render() || [], (node) => node.type === 'button' && textOf(node).join('') === 'note.compose')[0];
      if (!reviewButton) fail('the review button is missing');
      else {
        reviewButton.props.onClick();
        const reviewNode = findComponent(render(), 'ReviewSheet');
        if (!reviewNode) fail('the review button did not open the review sheet');
        else {
          const sheet = renderChild(reviewNode);
          const preview = findAll(sheet, (node) => node.type === 'textarea' && node.props && node.props.className === 'pp-review-text')[0];
          if (!preview || String(preview.props.value).indexOf('构建是否接受参数？') < 0) fail('the review preview lost the selected annotations');
          else if (!findAll(sheet, (node) => node.type === 'button'
            && String(node.props && node.props.className || '').indexOf('pp-note-btn-primary') >= 0).length) fail('the review sheet has no send action');
          else console.log('[ok] the header action opens the annotation review sheet');
          const close = findAll(sheet, (node) => node.type === 'button' && node.props && node.props.title === 'note.cancel')[0];
          if (close) close.props.onClick();
        }
      }

      // Promote one note; the chooser is a frame-level popup driven by a store.
      const storeLink = findAll(notesView() || [], (node) => node.type === 'button' && node.props && node.props['aria-label'] === 'note.store')[0];
      if (!storeLink) fail('the row store control is missing');
      else {
        storeLink.props.onClick();
        const chooser = window.__dshPromptPoolNotePromptV1 ? window.__dshPromptPoolNotePromptV1.get() : null;
        if (!chooser || chooser.open !== true || !Array.isArray(chooser.choices) || chooser.choices.length === 0) fail('the group chooser did not open');
        else {
          if (chooser.choices[0].value !== 'builtin:oftenuse') fail('the default group is not first');
          chooser.onPick(chooser.choices[0].value);
          const pool = window.__dshPromptPoolStoreV1.get();
          const added = pool.items[pool.items.length - 1];
          if (!added || added.group !== 'builtin:oftenuse') fail(`promoted into ${added && added.group}`);
          else if (added.body !== '【note.kind.comment】「构建是否接受参数？」：接受分支参数') fail(`promoted body ${JSON.stringify(added.body)}`);
          const note = window.__dshPromptPoolNotesV1.get().items.find((entry) => entry.id === 'n2');
          if (!note || note.promotedGroup !== 'builtin:oftenuse') fail('the note was not marked as stored');
          if (textOf(notesView() || []).indexOf('note.stored') < 0) fail('the stored note has no marker');
          else console.log('[ok] a note promotes into the default group and keeps its marker');
        }
      }

      // Store as a prompt: the composed text is filed in the pool, and the
      // composer is left untouched.
      const composeStore = findAll(render() || [], (node) => node.type === 'button' && textOf(node).join('') === 'note.composeStore')[0];
      if (!composeStore) fail('the store-as-prompt control is missing');
      else {
        inserted = null;
        composeStore.props.onClick();
        const chooser = window.__dshPromptPoolNotePromptV1 ? window.__dshPromptPoolNotePromptV1.get() : null;
        if (!chooser || chooser.open !== true || !Array.isArray(chooser.choices) || chooser.choices.length === 0) fail('the store-as-prompt chooser did not open');
        else {
          chooser.onPick(chooser.choices[0].value);
          const composed = '1. 【note.kind.comment】「构建是否接受参数？」：接受分支参数\n2. 【note.kind.comment】「报告类型 → job 映射：…，对吗？」：对，按你说的映射';
          if (inserted !== null) fail(`store-as-prompt inserted ${JSON.stringify(inserted)}`);
          const pool = window.__dshPromptPoolStoreV1.get();
          const added = pool.items[pool.items.length - 1];
          if (!added || added.body !== composed) fail('store-as-prompt did not save the prompt');
          else console.log('[ok] store-as-prompt saves the prompt without touching the composer');
        }
      }

      const deleteLink = findAll(notesView() || [], (node) => node.type === 'button'
        && String(node.props && node.props.className || '').indexOf('pp-note-link-danger') >= 0)[0];
      if (!deleteLink) fail('the row delete control is missing');
      else {
        deleteLink.props.onClick();
        const asking = window.__dshPromptPoolNoteConfirmV1 ? window.__dshPromptPoolNoteConfirmV1.get() : null;
        if (!asking || asking.open !== true) fail('deleting did not ask first');
        else if (typeof asking.onConfirm !== 'function') fail('the delete confirmation has no action');
        else {
          asking.onConfirm();
          const left = window.__dshPromptPoolNotesV1.get().items;
          if (left.length !== 1) fail(`delete left ${left.length} note(s)`);
          else if (left[0].id !== 'n1') fail('delete removed the wrong note');
          if (!notesSaved() || notesSaved().items.length !== 1) fail('delete was not persisted');
          else console.log('[ok] annotations can be deleted from the pool tab');
        }
      }
    }
  }
}

// Without notes the tab disappears and the pool renders as before.
store.set(STORAGE_KEY, poolSeed());
store.set(NOTES_KEY, JSON.stringify({ version: 1, items: [] }));
const emptyBoot = boot();
const emptyPanel = emptyBoot.registrations.find((entry) => entry.slot === 'conversation.input.overlay');
if (!emptyPanel) fail('the composer panel was not registered after a reload');
else {
  cells = [];
  childStores.clear();
  resetHooks();
  const tree = emptyPanel.component({
    sessionId: 's1',
    useInput: () => ({ draft: '', phase: 'plain', queue: [], attachmentIds: [] }),
    inputActions: null,
    useWorkspaces: () => ({ items: [], currentId: '' }),
    useSession: () => ({}),
  });
  const tabBarNode = findComponent(tree, 'TabBar');
  const bar = tabBarNode ? renderChild(tabBarNode) : [];
  const notesTab = findAll(bar, (node) => node.type === 'button'
    && String(node.props && node.props.className || '') === 'pp-tab'
    && textOf(node).indexOf('note.title') >= 0)[0];
  if (!notesTab) fail('the notes tab is missing without annotations');
  else console.log('[ok] the notes tab stays visible without annotations');
}

// The badge and editor share one display-width budget: 100 full-width or 200
// half-width characters. Exercise the pure helpers at the boundary.
const widthStart = source.indexOf('const NOTE_BODY_MAX =');
const widthEnd = source.indexOf('/** Keep only fields', widthStart);
if (widthStart < 0 || widthEnd < 0) fail('the note width helpers were not found');
else {
  const helpers = new Function(`${source.slice(widthStart, widthEnd)}
    return { NOTE_BODY_MAX, noteBodyText, noteBodyWidth, clampNoteBody, clampNoteText, mergeNoteBodyInput, noteHighlightActive };`)();
  const same = (actual, expected, label) => {
    if (actual !== expected) fail(`${label}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
    else console.log('[ok] ' + label);
  };
  same(helpers.NOTE_BODY_MAX, 200, 'the badge budget is 200 half-width cells');
  same(helpers.noteBodyText('あ'.repeat(105)), 'あ'.repeat(100) + '…', '100 full-width characters fit and the 101st truncates');
  same(helpers.noteBodyText('a'.repeat(210)), 'a'.repeat(200) + '…', '200 half-width characters fit and the 201st truncates');
  same(helpers.noteBodyText('あ'.repeat(100)), 'あ'.repeat(100), '100 full-width characters fit without an ellipsis');
  same(helpers.noteBodyText('a'.repeat(200)), 'a'.repeat(200), '200 half-width characters fit without an ellipsis');
  same(helpers.noteBodyWidth('あ'.repeat(50) + 'a'.repeat(100)), 200, 'mixed text counts a full-width character as two cells');
  same(helpers.noteBodyWidth('😀'), 2, 'an emoji counts as a full-width character');
  same(helpers.clampNoteBody('あ'.repeat(105)), 'あ'.repeat(100), 'the editor clamps 105 full-width characters to 100');
  same(helpers.clampNoteBody('a'.repeat(205)), 'a'.repeat(200), 'the editor clamps 205 half-width characters to 200');
  same(helpers.mergeNoteBodyInput('a'.repeat(200), 'a'.repeat(200) + 'b'), 'a'.repeat(200), 'typing at the cap leaves the old body intact');
  same(helpers.mergeNoteBodyInput('a'.repeat(199), 'a'.repeat(199) + 'あ'), 'a'.repeat(199), 'a wide character that does not fit is rejected');
  same(helpers.mergeNoteBodyInput('a'.repeat(198), 'a'.repeat(198) + 'あ'), 'a'.repeat(198) + 'あ', 'a wide character that fits is accepted');
  same(helpers.mergeNoteBodyInput('', 'a'.repeat(220)), 'a'.repeat(200), 'pasting into an empty body takes the prefix');
  same(helpers.mergeNoteBodyInput('a'.repeat(200), 'b'.repeat(220)), 'b'.repeat(200), 'pasting over the whole body takes the prefix');
  same(helpers.mergeNoteBodyInput('a'.repeat(195), 'a'.repeat(195) + 'b'.repeat(20)), 'a'.repeat(195) + 'b'.repeat(5), 'an overflowing insertion adds only the part that fits');
  same(helpers.mergeNoteBodyInput('a'.repeat(200), 'a'.repeat(10) + 'あ' + 'a'.repeat(189)), 'a'.repeat(200), 'an overflowing replacement does not cut the old tail');
  same(helpers.noteHighlightActive(0, null), false, 'no notes and no draft paints nothing');
  same(helpers.noteHighlightActive(0, { anchor: {} }), true, 'an unsaved draft paints its passage');
  same(helpers.noteHighlightActive(2, null), true, 'saved notes paint without a draft');
}

// The bubble's kind row is the NOTE_KINDS order: 意见 sits after 反对.
const kindsStart = source.indexOf('const NOTE_KINDS = [');
const kindsEnd = source.indexOf('];', kindsStart);
if (kindsStart < 0 || kindsEnd < 0) fail('the annotation kind list was not found');
else {
  const kinds = new Function(`${source.slice(kindsStart, kindsEnd + 2)}; return NOTE_KINDS;`)();
  const ids = kinds.map((kind) => kind.id).join(',');
  if (ids !== 'agree,disagree,question,comment,idea,supplement,todo') fail(`the annotation kinds are ordered ${ids}`);
  else console.log('[ok] the kind buttons put 提问 between 反对 and 意见');
  const tints = {
    agree: ['34,197,94', '22,163,74'],
    disagree: ['220,38,38', '185,28,28'],
    question: ['249,115,22', '234,88,12'],
    comment: ['139,92,246', '124,58,237'],
    idea: ['59,130,246', '37,99,235'],
    supplement: ['20,184,166', '13,148,136'],
    todo: ['250,204,21', '202,138,4'],
  };
  for (const kind of kinds) {
    const [tint, ink] = tints[kind.id];
    if (kind.tint !== tint) fail(`the ${kind.id} annotation color is ${kind.tint}, expected ${tint}`);
    if (kind.ink !== ink) fail(`the ${kind.id} annotation ink is ${kind.ink}, expected ${ink}`);
  }
  if (new Set(kinds.map((kind) => kind.tint)).size !== kinds.length) fail('two annotation kinds still share one color');
  else console.log('[ok] every annotation kind has its own color');
  if (new Set(kinds.map((kind) => kind.ink)).size !== kinds.length) fail('two annotation kinds still share one ink');
  else console.log('[ok] every annotation kind has its own ink shade');
  if (!source.includes("'note.kind.idea': '思路'")) fail('the Chinese idea label is not 思路');
  else if (!source.includes("'note.kind.idea': 'Idea'")) fail('the English idea label changed');
  else if (!source.includes("'note.kind.supplement': '补充信息'")) fail('the Chinese supplement label changed');
  else if (!source.includes("'note.kind.supplement': 'Additional info'")) fail('the English supplement label changed');
  else console.log('[ok] the idea and supplement kinds keep their labels');
  if (!source.includes("const NOTE_KIND_DEFAULT = 'agree'")) fail('a new bubble does not default to 同意');
  else console.log('[ok] a new annotation defaults to 同意');
}

// The inline badge must use the conversation's text size, not its own pixel
// size, so Settings → the reading font size scales it too.
const chipRule = /\.pp-note-inline\{([^}]*)\}/.exec(source);
if (!chipRule) fail('the inline badge rule is missing');
else {
  if (chipRule[1].indexOf('font-size:var(--dsh-content-font-size,14px)') < 0) fail('the badge does not follow the conversation font size');
  else console.log('[ok] the badge follows the conversation font size');
  if (chipRule[1].indexOf('font:inherit') < 0) fail('the badge does not inherit the conversation font');
  if (chipRule[1].indexOf('font-family:var(--dsw-font-family,inherit)') < 0) fail('the badge does not use the host text font family');
  if (chipRule[1].indexOf('font-size:11px') >= 0) fail('the badge still carries a fixed 11px font');
  if (chipRule[1].indexOf('background:rgba(var(--pp-inline-tint),.28)') < 0) fail('the badge background is not deepened');
  if (chipRule[1].indexOf('border:1px dashed rgba(var(--pp-inline-ink,var(--pp-inline-tint)),.9)') < 0) fail('the badge border does not use the ink shade');
  if (chipRule[1].indexOf('max-width:100%') < 0 || chipRule[1].indexOf('white-space:normal') < 0) fail('a long badge cannot wrap inside the column');
}
const underlineRule = /::highlight\(prompt-pool-note-comment\)\{([^}]*)\}/.exec(source);
if (!underlineRule) fail('the comment highlight rule is missing');
else if (underlineRule[1].indexOf('text-decoration-thickness:2px') < 0 || underlineRule[1].indexOf('rgba(124,58,237,1)') < 0) {
  fail('the comment underline is not the deeper 2px violet');
} else console.log('[ok] the badge wash and the highlighted underline are deepened');
const iconRule = /\.pp-note-inline-icon\{([^}]*)\}/.exec(source);
if (!iconRule || iconRule[1].indexOf('font-size:.95em') < 0) fail('the badge icon does not scale with the badge');
else console.log('[ok] the badge icon scales with the font');
if (/maxLength:\s*NOTE_BODY_MAX/.test(source)) fail('the editor still uses a UTF-16 maxLength');
else console.log('[ok] the editor no longer uses a UTF-16 maxLength');
if (!/onChange:\s*\(event\)\s*=>\s*\{[\s\S]{0,200}mergeNoteBodyInput\(current, next\)/.test(source)) {
  fail('the editor does not merge typed text by display width');
}

for (const failure of failures) console.error('[fail]', failure);
console.log(failures.length === 0 ? '[ok] annotations live in the prompt pool' : `[fail] ${failures.length} check(s)`);
if (failures.length > 0) process.exitCode = 1;
