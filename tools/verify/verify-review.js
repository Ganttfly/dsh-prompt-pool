// The annotation review sheet: selected notes become one grouped prompt sent
// straight to the session queue, and a successful send marks them handled.
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', '..', 'plugin', 'client.js'), 'utf8');
const STORAGE_KEY = 'dsh.prompt-pool.v1';
const NOTES_KEY = 'dsh.prompt-pool.notes.v1';
const BATCHES_KEY = 'dsh.prompt-pool.batches.v1';
const store = new Map();
const registrations = [];
let queuedText = '';

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
    return value && typeof value === 'object' && 'open' in value ? { ...value, open: true } : value;
  },
};

const conversation = {
  createDrafts: () => [],
  sendSession: async (session, text) => {
    queuedText = text;
    return { kind: 'success' };
  },
  scopedSession: () => ({ prompt: () => {}, beginSubmission: () => {} }),
};

global.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
};

const boot = () => {
  const captured = { registrations: [] };
  global.window = {
    __ModuleLoader__: {
      load(spec) {
        spec.factory(() => reactStub).apply({
          effect: (fn) => {
            const dispose = fn();
            return typeof dispose === 'function' ? dispose : () => {};
          },
          get: (name) => (name === 'conversation' ? conversation : undefined),
          inject: (deps, cb) => {
            if (typeof cb === 'function') cb({ get: (name) => (name === 'conversation' ? conversation : undefined) });
            return () => {};
          },
          locale: { register: () => () => {}, bind: () => (key) => key, subscribe: () => () => {}, getLocale: () => ({ id: 'zh' }) },
          slots: {
            inject: (key, cb) => { cb(); return () => {}; },
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
  return out.join('');
};
const failures = [];
const fail = (message) => failures.push(message);

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

const poolSeed = JSON.stringify({
  version: 2,
  seeded: 2,
  categories: [],
  settings: {},
  items: [],
  tray: [],
});
const notesSeed = JSON.stringify({
  version: 1,
  items: [
    { id: 'n1', sessionId: 's1', nodeKey: 'node-1', quote: '报告类型 → job 映射：…，对吗？', prefix: '', suffix: '', offset: 2, order: 2, kind: 'comment', body: '对，按你说的映射', createdAt: 1, updatedAt: 1 },
    { id: 'n2', sessionId: 's1', nodeKey: 'node-1', quote: '构建是否接受参数？', prefix: '', suffix: '', offset: 30, order: 1, kind: 'question', body: '接受分支参数', createdAt: 2, updatedAt: 2 },
    { id: 'n3', sessionId: 's1', nodeKey: 'node-1', quote: '执行下一步', prefix: '', suffix: '', offset: 40, order: 3, kind: 'todo', body: '运行构建', createdAt: 3, updatedAt: 3 },
  ],
});

store.set(STORAGE_KEY, poolSeed);
store.set(NOTES_KEY, notesSeed);
(async () => {
const booted = boot();
const panelEntry = booted.registrations.find((entry) => entry.slot === 'conversation.input.overlay');
if (!panelEntry) fail('the composer panel was not registered');
else {
  const props = {
    sessionId: 's1',
    useInput: () => ({ draft: '', phase: 'plain', queue: [], attachmentIds: [] }),
    inputActions: { captureInsertion: () => ({ start: 0, end: 0, draftRev: 1 }), insertText: () => true, setDraft: () => {} },
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
  const bar = tabBarNode ? renderChild(tabBarNode) : [];
  const notesTab = findAll(bar, (node) => node.type === 'button' && textOf(node).indexOf('note.title') === 0)[0];
  if (!notesTab) fail('the notes tab is missing');
  else {
    notesTab.props.onClick();
    const reviewButton = findAll(render(), (node) => node.type === 'button' && textOf(node) === 'note.compose')[0];
    if (!reviewButton) fail('the review button is missing');
    else {
      reviewButton.props.onClick();
      const reviewNode = findComponent(render(), 'ReviewSheet');
      if (!reviewNode) fail('the review sheet did not open');
      else {
        const sheet = renderChild(reviewNode);
        const steps = findAll(sheet, (node) => node.props && node.props.className === 'pp-review-step');
        const panes = findAll(sheet, (node) => node.props && node.props.className === 'pp-review-pane');
        const previewButton = findAll(sheet, (node) => node.type === 'button' && textOf(node) === 'note.review.previewAction')[0];
        if (steps.length !== 2 || panes.length !== 2 || !previewButton) fail('the review step flow is missing');
        else if (steps[0].props['data-active'] !== 'true' || panes[0].props.hidden !== false || panes[1].props.hidden !== true) fail('the review does not open on the annotations step');
        else console.log('[ok] the review opens on the annotations step');
        if (previewButton) previewButton.props.onClick();
        const previewSheet = renderChild(reviewNode);
        const previewPanes = findAll(previewSheet, (node) => node.props && node.props.className === 'pp-review-pane');
        const previewSteps = findAll(previewSheet, (node) => node.props && node.props.className === 'pp-review-step');
        const back = findAll(previewSheet, (node) => node.type === 'button' && textOf(node) === 'note.review.back')[0];
        if (!previewPanes[1] || previewPanes[1].props.hidden !== false || !previewSteps[1] || previewSteps[1].props['data-active'] !== 'true') fail('the preview step did not reveal the preview pane');
        else if (!back) fail('the preview step has no back button');
        const preview = findAll(previewSheet, (node) => node.type === 'textarea' && node.props && node.props.className === 'pp-review-text')[0];
        const value = preview ? String(preview.props.value) : '';
        if (value.indexOf('note.review.heading') < 0 || value.indexOf('note.review.intro') < 0) fail('the review preview lost its contract');
        else if (value.indexOf('Question-1.') < 0 || value.indexOf('Comment-1.') < 0) fail(`the review preview is not grouped: ${JSON.stringify(value)}`);
        else if (value.indexOf('note.review.group.question') < 0 || value.indexOf('note.review.group.comment') < 0) fail('the review preview lost its per-kind guidance');
        else if (value.indexOf('构建是否接受参数？') < 0 || value.indexOf('报告类型 → job 映射') < 0) fail('the review preview lost an annotation');
        else if (value.indexOf('执行下一步') >= 0) fail('the review preview sent an unchecked to-do');
        else if (value.indexOf('标有【立即实施】') >= 0 || value.indexOf('未标记的条目') >= 0) fail('the review prompt still asks the model to discuss the marker');
        else console.log('[ok] the preview step builds a grouped prompt');
        if (back) back.props.onClick();
        const notesSheet = renderChild(reviewNode);
        const commentExec = findAll(notesSheet, (node) => node.type === 'input' && node.props && node.props.name === 'pp-review-immediate-n1')[0];
        const questionExec = findAll(notesSheet, (node) => node.type === 'input' && node.props && node.props.name === 'pp-review-immediate-n2')[0];
        if (!commentExec || questionExec) fail('the immediate checkbox is offered to the wrong kinds');
        else console.log('[ok] a question has no immediate checkbox and a comment does');
        const previewAgain = findAll(notesSheet, (node) => node.type === 'button' && textOf(node) === 'note.review.previewAction')[0];
        if (!previewAgain) fail('the back button did not restore the preview action');
        else previewAgain.props.onClick();
        const sendSheet = renderChild(reviewNode);
        const send = findAll(sendSheet, (node) => node.type === 'button' && textOf(node) === 'note.review.send')[0];
        if (!send) fail('the review send button is missing');
        else {
          const pending = send.props.onClick();
          if (pending && typeof pending.then === 'function') await pending;
          if (!queuedText) fail('the review prompt never reached the session queue');
          else if (queuedText !== value) fail('the queued text differs from the preview');
          else console.log('[ok] sending the review hands the preview to the session queue');
        }
        const batches = window.__dshPromptPoolBatchesV1 ? window.__dshPromptPoolBatchesV1.get().items : [];
        if (batches.length !== 1) fail(`the batch store has ${batches.length} records`);
        else if (batches[0].state !== 'queued' || batches[0].noteIds.length !== 2 || batches[0].parkedIds[0] !== 'n3') fail(`the batch record is ${JSON.stringify(batches[0])}`);
        else console.log('[ok] the batch record keeps sent and parked note ids');
        const remaining = window.__dshPromptPoolNotesV1.get().items;
        if (remaining.length !== 0) fail(`the processed annotations stayed in the list: ${JSON.stringify(remaining)}`);
        else console.log('[ok] sent and parked annotations leave the list');
        const pool = window.__dshPromptPoolStoreV1 ? window.__dshPromptPoolStoreV1.get() : null;
        const parkedItem = pool ? pool.items.find((item) => item.body.indexOf('执行下一步') >= 0) : null;
        if (!parkedItem) fail('the parked to-do was not saved to the prompt pool');
        else if (parkedItem.group !== 'builtin:note') fail(`the parked to-do landed in ${parkedItem.group}`);
        else console.log('[ok] an unchecked to-do is saved to the prompt pool');
        const viewNode = findComponent(render(), 'NotesView');
        const view = viewNode ? renderChild(viewNode) : null;
        if (!view) fail('the notes view did not come back after sending');
        else {
          const openRows = findAll(view, (node) => node.props && String(node.props.className || '') === 'pp-notes-row');
          if (openRows.length !== 0) fail(`the list still shows ${openRows.length} rows after review`);
          else if (findAll(view, (node) => node.props && String(node.props.className || '') === 'pp-notes-filters').length > 0) fail('the status filters are still rendered');
          else console.log('[ok] the annotation list is empty and has no status filters');
        }
      }
    }
  }
}

// Annotation images are normalized, shown in the sheet, and counted in the
// prompt. They are not sent here, so no IndexedDB blob is needed.
store.clear();
store.set(STORAGE_KEY, poolSeed);
store.set(NOTES_KEY, JSON.stringify({
  version: 1,
  items: [{
    id: 'img-note', sessionId: 's1', nodeKey: 'node-1', quote: '看图后的批注', prefix: '', suffix: '',
    offset: 1, order: 1, kind: 'comment', body: '截图在这里', createdAt: 1, updatedAt: 1,
    images: [{ id: 'img1', type: 'image/png', name: 'shot.png', size: 10, thumb: 'data:image/png;base64,iVBORw0KGgo=' }],
  }, {
    id: 'todo-note', sessionId: 's1', nodeKey: 'node-1', quote: '下一步执行', prefix: '', suffix: '',
    offset: 4, order: 2, kind: 'todo', body: '执行这一段', createdAt: 2, updatedAt: 2,
  }, {
    id: 'agree-note', sessionId: 's1', nodeKey: 'node-1', quote: '同意这个方案', prefix: '', suffix: '',
    offset: 8, order: 3, kind: 'agree', body: '可以', createdAt: 3, updatedAt: 3,
  }, {
    id: 'disagree-note', sessionId: 's1', nodeKey: 'node-1', quote: '反对这个方案', prefix: '', suffix: '',
    offset: 12, order: 4, kind: 'disagree', body: '不行', createdAt: 4, updatedAt: 4,
  }, {
    id: 'idea-note', sessionId: 's1', nodeKey: 'node-1', quote: '换个思路', prefix: '', suffix: '',
    offset: 16, order: 5, kind: 'idea', body: '可以试试', createdAt: 5, updatedAt: 5,
  }, {
    id: 'supplement-note', sessionId: 's1', nodeKey: 'node-1', quote: '补充一个新信息', prefix: '', suffix: '',
    offset: 20, order: 6, kind: 'supplement', body: '日志显示是缓存问题', createdAt: 6, updatedAt: 6,
  }],
}));
const imageBoot = boot();
const imagePanel = imageBoot.registrations.find((entry) => entry.slot === 'conversation.input.overlay');
if (!imagePanel) fail('the image review panel was not registered');
else {
  cells = [];
  childStores.clear();
  resetHooks();
  const imageProps = {
    sessionId: 's1',
    useInput: () => ({ draft: '', phase: 'plain', queue: [], attachmentIds: [] }),
    inputActions: { captureInsertion: () => ({ start: 0, end: 0, draftRev: 1 }), insertText: () => true, setDraft: () => {} },
    useWorkspaces: () => ({ items: [], currentId: '' }),
    useSession: () => ({}),
  };
  const imageRender = () => {
    resetHooks();
    return imagePanel.component(imageProps);
  };
  const tabBarNode = findComponent(imageRender(), 'TabBar');
  const bar = tabBarNode ? renderChild(tabBarNode) : [];
  const notesTab = findAll(bar, (node) => node.type === 'button' && textOf(node).indexOf('note.title') === 0)[0];
  if (!notesTab) fail('the image review could not open the notes tab');
  else {
    notesTab.props.onClick();
    const reviewButton = findAll(imageRender(), (node) => node.type === 'button' && textOf(node) === 'note.compose')[0];
    if (!reviewButton) fail('the image review button is missing');
    else {
      reviewButton.props.onClick();
      const reviewNode = findComponent(imageRender(), 'ReviewSheet');
      if (!reviewNode) fail('the image review sheet did not open');
      else {
        const sheet = renderChild(reviewNode);
        const previewButton = findAll(sheet, (node) => node.type === 'button' && textOf(node) === 'note.review.previewAction')[0];
        if (!previewButton) fail('the preview action is missing from the image review');
        else previewButton.props.onClick();
        const previewSheet = renderChild(reviewNode);
        const preview = findAll(previewSheet, (node) => node.type === 'textarea' && node.props && node.props.className === 'pp-review-text')[0];
        const value = preview ? String(preview.props.value) : '';
        if (value.indexOf('note.review.attachments') < 0) fail('the review prompt did not count the annotation images');
        else if (value.indexOf('note.review.intro') < 0 || value.indexOf('note.review.group.comment') < 0 || value.indexOf('note.review.group.supplement') < 0) fail('the review prompt lost a type contract');
        else if (value.indexOf('下一步执行') >= 0) fail('the review prompt sent an unchecked to-do');
        else if (value.indexOf('标有【立即实施】') >= 0 || value.indexOf('未标记的条目') >= 0) fail('the review prompt still asks the model to discuss the marker');
        else console.log('[ok] unchecked to-dos stay out of the review prompt');
        const back = findAll(previewSheet, (node) => node.type === 'button' && textOf(node) === 'note.review.back')[0];
        if (back) back.props.onClick();
        const notesSheet = renderChild(reviewNode);
        const strips = findAll(notesSheet, (node) => typeof node.type === 'function' && node.type.name === 'ImageStrip');
        if (strips.length !== 1 || !Array.isArray(strips[0].props.images) || strips[0].props.images[0].id !== 'img1') fail('the annotation image is not shown in the review sheet');
        else console.log('[ok] annotation images survive into the review sheet');
        const execNames = findAll(notesSheet, (node) => node.type === 'input'
          && node.props && String(node.props.name || '').indexOf('pp-review-immediate-') === 0)
          .map((node) => node.props.name);
        const expectedExec = ['pp-review-immediate-img-note', 'pp-review-immediate-agree-note', 'pp-review-immediate-idea-note'];
        if (expectedExec.some((name) => execNames.indexOf(name) < 0)) fail(`the immediate checkboxes are ${JSON.stringify(execNames)}`);
        else if (execNames.indexOf('pp-review-immediate-todo-note') >= 0) fail('a to-do still uses an immediate checkbox');
        else if (execNames.indexOf('pp-review-immediate-disagree-note') >= 0) fail('a disagreement got an immediate checkbox');
        else if (execNames.indexOf('pp-review-immediate-supplement-note') >= 0) fail('supplementary information got an immediate checkbox');
        else if (textOf(notesSheet).indexOf('note.review.immediate.comment') < 0
          || textOf(notesSheet).indexOf('note.review.immediate.agree') < 0
          || textOf(notesSheet).indexOf('note.review.immediate.idea') < 0) fail('an immediate checkbox lost its label');
        else if (textOf(notesSheet).indexOf('note.review.todo.execute') < 0 || textOf(notesSheet).indexOf('note.review.todo.prompt') < 0) fail('the to-do radios lost their labels');
        else console.log('[ok] only actionable kinds offer an immediate checkbox');
        const todoRadios = findAll(notesSheet, (node) => node.type === 'input'
          && node.props && node.props.name === 'pp-review-todo-todo-note');
        const parkRadio = todoRadios.find((node) => node.props.value === 'prompt');
        const execRadio = todoRadios.find((node) => node.props.value === 'execute');
        if (todoRadios.length !== 2 || !parkRadio || !execRadio) fail('the to-do does not have two radio choices');
        else if (parkRadio.props.checked !== true || execRadio.props.checked === true) fail('the to-do does not default to Save as prompt');
        else {
          execRadio.props.onChange();
          const toggled = renderChild(reviewNode);
          const toggledRadios = findAll(toggled, (node) => node.type === 'input' && node.props && node.props.name === 'pp-review-todo-todo-note');
          const toggledExec = toggledRadios.find((node) => node.props.value === 'execute');
          const toggledPark = toggledRadios.find((node) => node.props.value === 'prompt');
          if (!toggledExec || toggledExec.props.checked !== true || (toggledPark && toggledPark.props.checked === true)) fail('the to-do execute radio did not select');
          else console.log('[ok] an immediate to-do leaves the parking list');
          const close = findAll(toggled, (node) => node.type === 'button' && node.props && node.props.title === 'note.cancel')[0];
          if (close) close.props.onClick();
        }
      }
    }
  }
}

// A batch made only of unchecked to-dos has no agent message: the card parks
// them in the prompt pool and closes.
store.clear();
store.set(STORAGE_KEY, poolSeed);
store.set(NOTES_KEY, JSON.stringify({
  version: 1,
  items: [{
    id: 'park-only', sessionId: 's1', nodeKey: 'node-1', quote: '只登记这个待办', prefix: '', suffix: '',
    offset: 1, order: 1, kind: 'todo', body: '以后再做', createdAt: 1, updatedAt: 1,
  }],
}));
const parkBoot = boot();
const parkPanel = parkBoot.registrations.find((entry) => entry.slot === 'conversation.input.overlay');
if (!parkPanel) fail('the parking panel was not registered');
else {
  cells = [];
  childStores.clear();
  resetHooks();
  const parkProps = {
    sessionId: 's1',
    useInput: () => ({ draft: '', phase: 'plain', queue: [], attachmentIds: [] }),
    inputActions: { captureInsertion: () => ({ start: 0, end: 0, draftRev: 1 }), insertText: () => true, setDraft: () => {} },
    useWorkspaces: () => ({ items: [], currentId: '' }),
    useSession: () => ({}),
  };
  const parkRender = () => {
    resetHooks();
    return parkPanel.component(parkProps);
  };
  const parkTabBar = findComponent(parkRender(), 'TabBar');
  const parkBar = parkTabBar ? renderChild(parkTabBar) : [];
  const parkNotesTab = findAll(parkBar, (node) => node.type === 'button' && textOf(node).indexOf('note.title') === 0)[0];
  if (!parkNotesTab) fail('the parking panel could not open the notes tab');
  else {
    parkNotesTab.props.onClick();
    const parkReview = findAll(parkRender(), (node) => node.type === 'button' && textOf(node) === 'note.compose')[0];
    if (!parkReview) fail('the parking review button is missing');
    else {
      parkReview.props.onClick();
      const parkNode = findComponent(parkRender(), 'ReviewSheet');
      if (!parkNode) fail('the parking review sheet did not open');
      else {
        const parkSheet = renderChild(parkNode);
        const previewButton = findAll(parkSheet, (node) => node.type === 'button' && textOf(node) === 'note.review.previewAction')[0];
        if (!previewButton) fail('the parking review has no preview step');
        else {
          previewButton.props.onClick();
          const parkPreview = renderChild(parkNode);
          const parkButton = findAll(parkPreview, (node) => node.type === 'button' && textOf(node) === 'note.review.send')[0];
          if (!parkButton) fail('the parking action is missing');
          else {
            const pending = parkButton.props.onClick();
            if (pending && typeof pending.then === 'function') await pending;
            const parkPool = window.__dshPromptPoolStoreV1.get();
            const parked = parkPool.items.find((item) => item.body.indexOf('只登记这个待办') >= 0);
            const left = window.__dshPromptPoolNotesV1.get().items;
            if (!parked) fail('the parking-only batch did not save the pool item');
            else if (left.length !== 0) fail('the parking-only batch left the annotation behind');
            else if (findComponent(parkRender(), 'ReviewSheet')) fail('the parking-only card did not close');
            else console.log('[ok] a to-do-only batch parks in the prompt pool');
          }
        }
      }
    }
  }
}

if (!source.includes('immediate.has(note.id) && markerKey')) fail('immediate items are not marked in the prompt');
else console.log('[ok] immediate items are marked in the prompt');
if (!source.includes('height:min(480px,56vh)') || !source.includes('height:min(calc(var(--pp-h, 100vh) * 0.64), 420px)')) fail('the review card does not keep a fixed height');
else console.log('[ok] the review card keeps one height across steps');

for (const failure of failures) console.error('[fail]', failure);
console.log(failures.length === 0 ? '[ok] annotation review sends, parks and clears one batch' : `[fail] ${failures.length} check(s)`);
if (failures.length > 0) process.exitCode = 1;
})();
