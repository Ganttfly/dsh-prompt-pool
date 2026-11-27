// Proves the annotation page opens the notes-based annotation summary card directly:
// no outbox entry, the old review semantics stay, and a host without a direct
// session queue degrades to inserting the review into the composer.
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', '..', 'plugin', 'client.js'), 'utf8');
const STORAGE_KEY = 'dsh.prompt-pool.v1';
const NOTES_KEY = 'dsh.prompt-pool.notes.v1';
const store = new Map();
const registrations = [];

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
    const array = cells;
    return [array[index], (next) => { array[index] = typeof next === 'function' ? next(array[index]) : next; }];
  },
  useRef: (init) => { const index = slot(() => ({ current: init })); return cells[index]; },
  useMemo: (factory) => { slot(() => null); return factory(); },
  useCallback: (fn) => { slot(() => fn); return fn; },
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
        effect: (fn) => { const dispose = fn(); return typeof dispose === 'function' ? dispose : () => {}; },
        get: (name) => (name === 'uiConversation'
          ? { interactions: { register: () => () => {} } }
          : name === 'betterSidebar'
            ? { registerTab: (descriptor) => { registrations.push({ slot: 'betterSidebar.tab', component: descriptor.component }); return () => {}; } }
            : undefined),
        inject: (deps, cb) => { if (typeof cb === 'function') cb({ get: () => undefined }); return () => {}; },
        locale: { register: () => () => {}, bind: () => (key) => key, subscribe: () => () => {}, getLocale: () => ({ id: 'zh' }) },
        slots: {
          inject: (key, cb) => { const dispose = cb(); return typeof dispose === 'function' ? dispose : () => {}; },
          register: (options, component) => { registrations.push({ slot: options.name, component }); return () => {}; },
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
global.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
};

const note = (id, kind, quote, body, order, extra) => ({
  id, sessionId: 's1', nodeKey: 'node-1', quote, prefix: '', suffix: '', offset: order * 10,
  order, kind, body, images: [], createdAt: order, updatedAt: order,
  ...(extra || {}),
});
store.set(STORAGE_KEY, JSON.stringify({ version: 2, seeded: 2, categories: [], settings: {}, items: [], tray: [] }));
store.set(NOTES_KEY, JSON.stringify({
  version: 1,
  items: [
    note('n1', 'agree', 'q1', 'b1', 1, {
      context: '你想我按照 A 执行，还是按照 B 执行？',
      contextKind: 'question',
    }),
    note('n2', 'todo', 'q2', 'b2', 2),
    note('n3', 'comment', 'q3', 'b3', 3),
    note('n4', 'disagree', 'q4', 'b4', 4),
  ],
}));

const inserted = [];
const inputActions = {
  captureInsertion: () => ({ start: 0, end: 0, draftRev: 1 }),
  insertText: (text) => { inserted.push(text); return true; },
  setDraft: () => {},
  submit: () => {},
  addAttachments: () => {},
  removeAttachment: () => {},
  pruneAttachments: () => {},
  persistDraft: () => {},
};
const panelProps = {
  sessionId: 's1',
  useInput: () => ({ draft: '', phase: 'plain', queue: [], attachmentIds: [] }),
  inputActions,
  useWorkspaces: () => ({ items: [], currentId: '' }),
  useSession: () => ({}),
};

new Function('window', 'localStorage', 'require', source)(global.window, global.localStorage, () => reactStub);
const panelEntry = registrations.find((entry) => entry.slot === 'conversation.input.overlay');
const notesStore = () => global.window.__dshPromptPoolNotesV1;
const poolStore = () => global.window.__dshPromptPoolStoreV1;
const batchStore = () => global.window.__dshPromptPoolBatchesV1;

const walk = (node, out) => {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { node.forEach((child) => walk(child, out)); return out; }
  out.push(node);
  if (node.children) node.children.forEach((child) => walk(child, out));
  return out;
};
const nodes = (tree) => walk(tree, []);
const textOf = (node) => {
  if (typeof node === 'string') return node;
  if (!node || typeof node !== 'object') return '';
  if (Array.isArray(node)) return node.map(textOf).join('');
  return (node.children || []).map(textOf).join('');
};
const byText = (tree, text) => nodes(tree).find(
  (node) => node.type === 'button' && Array.isArray(node.children) && node.children.indexOf(text) >= 0,
);
const renderPanel = () => {
  resetHooks();
  const out = panelEntry.component(panelProps);
  if (out && typeof out.type === 'function') {
    resetHooks();
    return out.type(out.props || panelProps);
  }
  return out;
};
const failures = [];
const check = (ok, label) => {
  if (ok) console.log('[ok] ' + label);
  else { failures.push(label); console.error('[fail] ' + label); }
};

(async () => {
  const findStrip = (root) => nodes(root).find((node) => node.type === 'button'
    && String(node.props && node.props.className || '').indexOf('pp-review-strip') >= 0);
  const findDock = (root) => nodes(root).find((node) => String(node.props && node.props.className || '') === 'pp-review-dock');
  const findNotes = (root) => nodes(root).find((node) => typeof node.type === 'function' && node.type.name === 'NotesView');
  const findCard = (root) => nodes(root).find((node) => typeof node.type === 'function' && node.type.name === 'ReviewPromptCard');
  let notesCells = [];
  let cardCells = [];
  const renderNotes = (root) => {
    const element = findNotes(root);
    if (!element) return null;
    const outer = cells;
    cells = notesCells;
    resetHooks();
    const output = element.type(element.props);
    notesCells = cells;
    cells = outer;
    return output;
  };
  const renderCard = (root) => {
    const element = findCard(root);
    if (!element) return null;
    const outer = cells;
    cells = cardCells;
    resetHooks();
    const output = element.type(element.props);
    cardCells = cells;
    cells = outer;
    return output;
  };
  const reviewChecks = (root) => nodes(root).filter((node) => node.type === 'input'
    && node.props && node.props.type === 'checkbox'
    && String(node.props.className || '').indexOf('pp-notes-review-check') >= 0);

  let tree = renderPanel();
  check(Boolean(findStrip(tree)), 'the review dock starts as a collapsed strip');
  const notesClosed = renderNotes(tree);
  check(Boolean(notesClosed) && reviewChecks(notesClosed).length === 0, 'review controls stay hidden until the card opens');
  const idleRow = (root, quote) => nodes(root).find((node) => String(node.props && node.props.className || '') === 'pp-notes-row'
    && textOf(node).indexOf(quote) >= 0);
  const typeMarkOf = (root, quote) => {
    const row = idleRow(root, quote);
    return row ? nodes(row).find((node) => typeof node.type === 'function' && node.type.name === 'TypeMark') : null;
  };
  const commentRow = idleRow(notesClosed, 'q3');
  const commentBody = commentRow ? nodes(commentRow).find((node) => String(node.props && node.props.className || '') === 'pp-notes-text') : null;
  check(Boolean(commentBody), 'an idle annotation body opens the list editor');
  if (commentBody) {
    commentBody.props.onClick();
    let editingTree = renderNotes(tree);
    const before = typeMarkOf(editingTree, 'q3');
    check(Boolean(before) && before.props.name === 'pen', 'the quote icon starts from the saved kind');
    const idea = nodes(editingTree).find((node) => node.type === 'button' && node.props && node.props['data-kind'] === 'idea');
    check(Boolean(idea), 'the editor offers the idea kind');
    if (idea) idea.props.onClick();
    editingTree = renderNotes(tree);
    const after = typeMarkOf(editingTree, 'q3');
    check(Boolean(after) && after.props.name === 'bulb', 'the quote icon follows a kind chosen before saving');
    const cancel = nodes(editingTree).find((node) => node.type === 'button' && textOf(node) === 'note.cancel');
    if (cancel) cancel.props.onClick();
    renderNotes(tree);
  }
  const idleTrash = nodes(notesClosed).find((node) => typeof node.type === 'function'
    && node.type.name === 'RowActionIcon'
    && node.props && node.props.name === 'trash' && node.props.label === 'note.delete');
  check(Boolean(idleTrash), 'the idle annotation row has a delete action');
  if (idleTrash) {
    idleTrash.props.onClick({ stopPropagation: () => {} });
    const asking = nodes(renderNotes(tree)).find((node) => typeof node.type === 'function'
      && node.type.name === 'NoteDeleteConfirm');
    check(Boolean(asking) && typeof asking.props.onConfirm === 'function',
      'the note delete confirmation is mounted inside the annotation surface');
    if (asking) asking.props.onCancel();
    renderNotes(tree);
  }
  const stripButton = findStrip(tree);
  if (stripButton) stripButton.props.onClick();
  tree = renderPanel();
  check(Boolean(findDock(tree)) && findDock(tree).props['data-collapsed'] === 'false', 'the review dock expands');
  const idleCard = renderCard(tree);
  check(Boolean(idleCard) && textOf(idleCard).indexOf('note.review.selected') < 0, 'the idle card hides the selected count');
  check(Boolean(idleCard) && textOf(idleCard).indexOf('note.review.immediateCount') < 0, 'the idle card hides the immediate count');
  const reviewButton = idleCard ? byText(idleCard, 'note.review.open') : null;
  check(Boolean(reviewButton), 'the idle card offers Summarize');
  if (reviewButton) reviewButton.props.onClick();
  tree = renderPanel();
  const processingCard = renderCard(tree);
  check(Boolean(processingCard) && textOf(processingCard).indexOf('note.review.selected') >= 0, 'summary mode shows the selected count');
  let notesTree = renderNotes(tree);
  check(Boolean(notesTree), 'the annotation tab renders its rows');
  check(!nodes(notesTree).some((node) => String(node.props && node.props.className || '').indexOf('pp-notes-review-bar') >= 0),
    'the list has no summary bar above it');
  let checks = reviewChecks(notesTree);
  check(checks.length === 4 && checks.every((node) => node.props.checked === true), 'every annotation gets a checked review box');
  const rowActions = nodes(notesTree).filter((node) => typeof node.type === 'function' && node.type.name === 'RowActionIcon');
  const actionNames = rowActions.map((node) => node.props && node.props.name);
  check(actionNames.indexOf('insert') < 0 && actionNames.indexOf('store') < 0 && actionNames.indexOf('trash') < 0,
    'summary mode hides insert, save and delete');
  check(actionNames.filter((name) => name === 'locate').length === 4, 'summary mode keeps locate for jumping back');
  const execs = () => nodes(renderNotes(tree)).filter((node) => String(node.props && node.props.className || '').indexOf('pp-notes-review-exec') >= 0);
  const todoChoice = () => nodes(renderNotes(tree)).find((node) => String(node.props && node.props.className || '').indexOf('pp-notes-review-todo') >= 0);
  check(execs().length === 3 && Boolean(todoChoice()), 'immediate and to-do controls appear inline');
  check(nodes(execs()[2] || []).some((node) => node.type === 'span' && textOf(node).indexOf('note.review.immediate.disagree') >= 0),
    'the disagree row offers its own immediate choice');
  const agreeInput = nodes(execs()[0]).find((node) => node.type === 'input');
  check(Boolean(agreeInput), 'the agree row has an immediate checkbox');
  if (agreeInput) agreeInput.props.onChange();
  tree = renderPanel();
  notesTree = renderNotes(tree);
  check(Boolean(execs()[0]) && Boolean(nodes(execs()[0]).find((node) => node.type === 'input').props.checked), 'the immediate choice is kept in the row');
  const execute = nodes(todoChoice()).find((node) => node.type === 'input' && node.props.value === 'execute');
  check(Boolean(execute), 'the to-do row offers Execute now');
  if (execute) execute.props.onChange();
  tree = renderPanel();
  notesTree = renderNotes(tree);
  const executeAgain = nodes(todoChoice()).find((node) => node.type === 'input' && node.props.value === 'execute');
  check(Boolean(executeAgain) && executeAgain.props.checked === true, 'a to-do can be routed to execute');
  let card = findCard(tree);
  let cardTree = renderCard(tree);
  let textarea = nodes(cardTree).find((node) => node.type === 'textarea');
  check(Boolean(textarea), 'the prompt card has an editor');
  check(Boolean(byText(cardTree, 'note.review.clearAll')) && !byText(cardTree, 'note.review.selectAll'),
    'with everything checked, Clear shows and Select all steps aside');
  check(Boolean(textarea) && textarea.props.value.indexOf('q1') >= 0 && textarea.props.value.indexOf('q2') >= 0 && textarea.props.value.indexOf('q3') >= 0 && textarea.props.value.indexOf('q4') >= 0, 'the preview includes every checked annotation');
  check(Boolean(textarea) && textarea.props.value.indexOf('note.review.contextQuestion') >= 0, 'the prompt carries the complete question context');
  check(Boolean(textarea) && textarea.props.value.indexOf('B-') < 0, 'the generated prompt does not expose an internal batch id');
  check(!nodes(cardTree).some((node) => String(node.props && node.props.className || '').indexOf('pp-review-batch') >= 0), 'the card header no longer shows a batch id');
  check(Boolean(textarea) && textarea.props.value.indexOf('note.review.immediateMark.agree') >= 0, 'immediate lines carry their marker');
  check(Boolean(card) && card.props.selectedNotes.length === 4 && card.props.immediateIds.length === 2, 'the card counts the selection and immediate choices');
  const disagreeInput = nodes(execs()[2] || []).find((node) => node.type === 'input');
  if (disagreeInput) disagreeInput.props.onChange();
  tree = renderPanel();
  notesTree = renderNotes(tree);
  cardTree = renderCard(tree);
  const disagreeAgain = nodes(execs()[2] || []).find((node) => node.type === 'input');
  check(Boolean(disagreeAgain) && disagreeAgain.props.checked === true, 'the disagree immediate choice is kept');
  card = findCard(tree);
  textarea = nodes(cardTree).find((node) => node.type === 'textarea');
  check(Boolean(card) && card.props.immediateIds.length === 3, 'the disagree choice joins the immediate count');
  check(Boolean(textarea) && textarea.props.value.indexOf('note.review.immediateMark.disagree') >= 0, 'the disagree marker is written into the prompt');
  checks = reviewChecks(notesTree);
  if (checks[2]) checks[2].props.onChange();
  tree = renderPanel();
  notesTree = renderNotes(tree);
  cardTree = renderCard(tree);
  textarea = nodes(cardTree).find((node) => node.type === 'textarea');
  card = findCard(tree);
  check(Boolean(card) && card.props.selectedNotes.length === 3, 'unchecking a row removes it from the selection');
  check(Boolean(byText(cardTree, 'note.review.selectAll')), 'Select all comes back once a row is unchecked');
  check(Boolean(textarea) && textarea.props.value.indexOf('q3') < 0, 'unchecking a row removes it from the prompt');
  checks = reviewChecks(notesTree);
  if (checks[2]) checks[2].props.onChange();
  tree = renderPanel();
  notesTree = renderNotes(tree);
  cardTree = renderCard(tree);
  textarea = nodes(cardTree).find((node) => node.type === 'textarea');
  if (textarea) textarea.props.onChange({ target: { value: 'edited-prompt' } });
  cardTree = renderCard(tree);
  textarea = nodes(cardTree).find((node) => node.type === 'textarea');
  check(Boolean(textarea) && textarea.props.value === 'edited-prompt', 'the prompt can be edited');
  const regenerate = byText(cardTree, 'note.review.refresh');
  check(Boolean(regenerate), 'the preview offers Refresh');
  if (regenerate) regenerate.props.onClick();
  cardTree = renderCard(tree);
  textarea = nodes(cardTree).find((node) => node.type === 'textarea');
  check(Boolean(textarea) && textarea.props.value !== 'edited-prompt' && textarea.props.value.indexOf('q1') >= 0, 'regenerate restores the generated prompt');

  // Collapse and expand from the strip; the prompt card is the only composer now.
  card = findCard(tree);
  if (card) card.props.onClose();
  tree = renderPanel();
  check(Boolean(findStrip(tree)), 'the review dock collapses back to the strip');
  if (findStrip(tree)) findStrip(tree).props.onClick();
  tree = renderPanel();
  check(Boolean(findDock(tree)) && findDock(tree).props['data-collapsed'] === 'false', 'the strip expands the review again');
  notesTree = renderNotes(tree);
  check(reviewChecks(notesTree).length === 0, 'expanding the card alone stays out of summary mode');
  cardTree = renderCard(tree);
  const startSummary = byText(cardTree, 'note.review.open');
  check(Boolean(startSummary), 'the open card offers Summarize to start');
  if (startSummary) startSummary.props.onClick();
  tree = renderPanel();
  notesTree = renderNotes(tree);
  check(reviewChecks(notesTree).length === 4, 'pressing Summarize enters summary mode');

  // Cancel leaves summary mode and collapses the card without touching a note.
  cardTree = renderCard(tree);
  const cancel = byText(cardTree, 'note.review.cancel');
  check(Boolean(cancel), 'summary mode offers a way out');
  if (cancel) cancel.props.onClick();
  tree = renderPanel();
  notesTree = renderNotes(tree);
  check(reviewChecks(notesTree).length === 0, 'cancelling leaves summary mode');
  check(Boolean(findStrip(tree)), 'cancelling collapses the card');
  check(notesStore().get().items.length === 4 && inserted.length === 0 && poolStore().get().tray.length === 0,
    'cancelling leaves every note and queue alone');
  const again = byText(tree, 'note.review.open');
  check(Boolean(again), 'the strip offers Summarize again');
  if (again) again.props.onClick();
  tree = renderPanel();
  notesTree = renderNotes(tree);
  check(reviewChecks(notesTree).length === 4, 'summarize starts again after cancelling');

  const grip = nodes(tree).find((node) => String(node.props && node.props.className || '').indexOf('pp-review-grip') >= 0);
  check(Boolean(grip), 'the review card has a height grip');
  if (grip) {
    grip.props.onKeyDown({ key: 'ArrowUp', preventDefault: () => {} });
    check(poolStore().get().settings.reviewHeight > 0, 'the grip saves a new review height');
    grip.props.onDoubleClick();
    check(poolStore().get().settings.reviewHeight === 0, 'double-click resets the review height');
  }

  tree = renderPanel();
  cardTree = renderCard(tree);
  const send = byText(cardTree, 'note.review.send');
  check(Boolean(send), 'the prompt card can send');
  if (send) {
    send.props.onClick();
    await new Promise((resolve) => setTimeout(resolve, 10));
    check(inserted.join('').indexOf('q1') >= 0 && inserted.join('').indexOf('q3') >= 0 && inserted.join('').indexOf('q4') >= 0, 'a host without a direct queue inserts the prompt into the composer');
    check(notesStore().get().items.length === 0, 'sent notes leave the annotation list');
    check(poolStore().get().tray.length === 0, 'nothing is pushed into the outbox');
    const batch = batchStore() && batchStore().get().items[0];
    check(Boolean(batch) && /^B-/.test(batch.id) && batch.noteIds.length === 4, 'the internal batch log still keeps its id and notes');
  }
  finish();

  function finish() {
    console.log(failures.length === 0 ? '[ok] summary mode keeps the tab as the only list; the card composes, edits and sends the prompt' : '[fail] ' + failures.length + ' check(s)');
    if (failures.length > 0) process.exitCode = 1;
  }
})();
