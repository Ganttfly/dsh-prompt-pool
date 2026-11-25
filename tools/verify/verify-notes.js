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
      prefix: '', suffix: '', offset: 30, order: 1, kind: 'comment', body: '接受分支参数',
      images: [{ id: 'img-n2', type: 'image/png', name: 'note.png' }],
      createdAt: 2, updatedAt: 2,
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
  const trayInNotes = findAll(tree, (node) => node.props
    && String(node.props.className || '').split(' ').indexOf('pp-tray') >= 0);
  if (trayInNotes.length > 0) fail('the prompt outbox is still rendered in the annotation scope');
  else console.log('[ok] the annotation scope hides the prompt outbox');
  const tabBarNode = findComponent(tree, 'ScopeBar');
  if (!tabBarNode) fail('the pool tab strip was not rendered');
  else {
    const bar = renderChild(tabBarNode);
    const notesTab = findAll(bar, (node) => node.type === 'button'
      && String(node.props && node.props.className || '') === 'pp-tab'
      && node.props && node.props['data-group'] === 'notes')[0];
    if (!notesTab) fail('the notes tab is missing while the session has notes');
    else {
      notesTab.props.onClick();
      const notesView = () => {
        const node = findComponent(render(), 'NotesView');
        return node ? renderChild(node) : null;
      };
      const saveSheet = () => {
        const layer = booted.registrations.find((entry) => entry.slot === 'shell.overlay');
        if (!layer) return null;
        const tree = layer.component({});
        const node = findComponent(tree, 'NoteSaveSheet');
        if (!node) return null;
        childStores.delete('NoteSaveSheet');
        return renderChild(node);
      };
      const view = notesView();
      if (!view) fail('the notes tab did not render the annotation list');
      else {
        const rows = findAll(view, (node) => node.props && String(node.props.className || '') === 'pp-notes-row');
        if (rows.length !== 2) fail(`the notes tab rendered ${rows.length} rows, expected 2`);
        else console.log('[ok] a 批注 tab lists the session annotations');
        const checks = findAll(view, (node) => node.type === 'input'
          && String(node.props && node.props.className || '').indexOf('pp-note-check') >= 0);
        if (checks.length > 0) fail('annotation rows still render selection checkboxes');
        else console.log('[ok] annotation rows no longer use selection checkboxes');

        const freshStore = window.__dshPromptPoolNoteFreshV1;
        if (!freshStore) fail('the newly added annotation store is missing');
        else {
          freshStore.set({ id: 'n1', sessionId: 's1', token: 7, at: Date.now() });
          const freshRow = findAll(notesView() || [], (node) => node.props
            && String(node.props.className || '') === 'pp-notes-row'
            && node.props['data-fresh'] === 'true')[0];
          if (!freshRow) fail('the newly added annotation is not marked in the list');
          else if (textOf(freshRow).indexOf('note.justAdded') < 0) fail('the newly added annotation has no just-added label');
          else console.log('[ok] a new annotation is marked and labelled without moving the list order');
          freshStore.set({ id: '', sessionId: '', token: 0, at: 0 });
        }

        const noteBody = findAll(view, (node) => node.props
          && String(node.props.className || '') === 'pp-notes-text')[0];
        if (!noteBody) fail('the annotation body cannot open its editor');
        else {
          noteBody.props.onClick();
          const editingView = notesView();
          const card = findAll(editingView || [], (node) => node.props
            && String(node.props.className || '').split(' ').indexOf('pp-edit') >= 0
            && node.props['data-domain'] === 'annotations')[0];
          const picks = card ? findAll(card, (node) => node.type === 'button'
            && String(node.props && node.props.className || '').indexOf('pp-type-pick') >= 0) : [];
          const shared = card ? findAll(card, (node) => node.props
            && ['pp-edit-title', 'pp-edit-quote', 'pp-edit-input', 'pp-edit-meta', 'pp-edit-actions']
              .some((name) => String(node.props.className || '').split(' ').indexOf(name) >= 0)) : [];
          const editBody = card ? findAll(card, (node) => node.props
            && String(node.props.className || '').split(' ').indexOf('pp-edit-body') >= 0)[0] : null;
          const bodyStrip = editBody ? findAll(editBody, (node) => typeof node.type === 'function'
            && node.type.name === 'ImageStrip') : [];
          const imagePicker = editBody ? findComponent(editBody, 'ImagePicker') : null;
          const metaPicker = card ? findAll(card, (node) => node.props
            && String(node.props.className || '').split(' ').indexOf('pp-edit-meta') >= 0)
            .some((meta) => !!findComponent(meta, 'ImagePicker')) : false;
          if (!card) fail('the annotation editor does not use the shared card');
          else if (picks.length !== 7) fail(`the annotation editor offers ${picks.length} kinds, expected 7`);
          else if (shared.length !== 5) fail('the annotation editor is missing a shared row');
          else if (!editBody || editBody.props['data-has-images'] !== 'true') fail('the annotation editor does not put images inside the body card');
          else if (bodyStrip.length !== 1) fail('the annotation editor body is missing its saved image');
          else if (!imagePicker || imagePicker.props.compact !== true) fail('the annotation editor body lost its in-body image button');
          else if (metaPicker) fail('the annotation editor meta row still carries the image controls');
          else console.log('[ok] the annotation editor keeps images and the add-image plus inside the body card');

          const editingRowBefore = findAll(editingView || [], (node) => node.props
            && String(node.props.className || '') === 'pp-notes-row'
            && node.props['data-editing'] === 'true')[0];
          const firstId = editingRowBefore ? editingRowBefore.props['data-note-id'] : '';
          const otherId = firstId === 'n1' ? 'n2' : 'n1';
          const firstNote = window.__dshPromptPoolNotesV1.get().items.find((entry) => entry.id === firstId);
          const input = card ? findAll(card, (node) => node.type === 'textarea'
            && String(node.props && node.props.className || '').indexOf('pp-edit-input') >= 0)[0] : null;
          const otherBody = findAll(editingView || [], (node) => node.props
            && String(node.props.className || '') === 'pp-notes-text')[0];
          if (!input) fail('the annotation editor has no body field');
          else if (!otherBody) fail('the second annotation cannot be opened while editing');
          else {
            input.props.onChange({ target: { value: '未保存的修改' } });
            const currentView = notesView();
            const nextBody = findAll(currentView || [], (node) => node.props
              && String(node.props.className || '') === 'pp-notes-text')[0];
            if (!nextBody) fail('the other annotation disappeared after typing');
            else {
              nextBody.props.onClick();
              const asked = notesView();
              const dialog = findComponent(asked, 'UnsavedSwitchDialog');
              if (!dialog) fail('switching annotations dropped the edit without asking');
              else {
                dialog.props.onDiscard();
                const after = notesView();
                const editingRow = findAll(after || [], (node) => node.props
                  && String(node.props.className || '') === 'pp-notes-row'
                  && node.props['data-editing'] === 'true')[0];
                const kept = window.__dshPromptPoolNotesV1.get().items.find((entry) => entry.id === firstId);
                if (!editingRow || editingRow.props['data-note-id'] !== otherId) {
                  fail('discarding the switch did not open the other annotation');
                } else if (!kept || !firstNote || kept.body !== firstNote.body) {
                  fail('discarding the switch saved the abandoned annotation');
                } else {
                  console.log('[ok] switching annotations asks before dropping unsaved work');
                }
              }
            }
          }
          const cancel = findAll(notesView() || [], (node) => node.type === 'button'
            && textOf(node).indexOf('note.cancel') >= 0)[0];
          if (cancel) cancel.props.onClick();
          notesView();

          // Save and switch keeps the draft and opens the other annotation.
          const firstRow = findAll(notesView() || [], (node) => node.props
            && String(node.props.className || '') === 'pp-notes-row'
            && node.props['data-note-id'] === firstId)[0];
          const firstBody = firstRow ? findAll(firstRow, (node) => node.props
            && String(node.props.className || '') === 'pp-notes-text')[0] : null;
          if (!firstBody) fail('the first annotation cannot be reopened for the save test');
          else {
            firstBody.props.onClick();
            const saveView = notesView();
            const saveInput = saveView ? findAll(saveView, (node) => node.type === 'textarea'
              && String(node.props && node.props.className || '').indexOf('pp-edit-input') >= 0)[0] : null;
            if (!saveInput) fail('the annotation editor did not reopen for the save test');
            else {
              saveInput.props.onChange({ target: { value: '批注草稿' } });
              const switchView = notesView();
              const switchBody = findAll(switchView || [], (node) => node.props
                && String(node.props.className || '') === 'pp-notes-text')[0];
              if (!switchBody) fail('the other annotation disappeared for the save test');
              else {
                switchBody.props.onClick();
                const saveAsked = findComponent(notesView(), 'UnsavedSwitchDialog');
                if (!saveAsked) fail('the save test did not ask again');
                else {
                  saveAsked.props.onSave();
                  const savedView = notesView();
                  const savedRow = findAll(savedView || [], (node) => node.props
                    && String(node.props.className || '') === 'pp-notes-row'
                    && node.props['data-editing'] === 'true')[0];
                  const saved = window.__dshPromptPoolNotesV1.get().items.find((entry) => entry.id === firstId);
                  if (!savedRow || savedRow.props['data-note-id'] !== otherId) {
                    fail('save and switch did not open the other annotation');
                  } else if (!saved || saved.body !== '批注草稿') {
                    fail('save and switch lost the annotation draft');
                  } else {
                    console.log('[ok] save and switch keeps the annotation draft');
                  }
                }
              }
            }
            const lastCancel = findAll(notesView() || [], (node) => node.type === 'button'
              && textOf(node).indexOf('note.cancel') >= 0)[0];
            if (lastCancel) lastCancel.props.onClick();
            notesView();

            // Restore the fixture body the later promotion checks depend on.
            if (firstNote) {
              const restoreRow = findAll(notesView() || [], (node) => node.props
                && String(node.props.className || '') === 'pp-notes-row'
                && node.props['data-note-id'] === firstId)[0];
              const restoreText = restoreRow ? findAll(restoreRow, (node) => node.props
                && String(node.props.className || '') === 'pp-notes-text')[0] : null;
              if (restoreText) {
                restoreText.props.onClick();
                const restoreView = notesView();
                const restoreInput = restoreView ? findAll(restoreView, (node) => node.type === 'textarea'
                  && String(node.props && node.props.className || '').indexOf('pp-edit-input') >= 0)[0] : null;
                if (restoreInput) {
                  restoreInput.props.onChange({ target: { value: firstNote.body } });
                  const restoreSave = findAll(notesView() || [], (node) => node.type === 'button'
                    && textOf(node).indexOf('note.save') >= 0)[0];
                  if (restoreSave) restoreSave.props.onClick();
                }
              }
              notesView();
            }
          }
        }
      }

      // The header annotation-summary action is gone; annotations queue per row.
      const reviewButton = findAll(render() || [], (node) => node.type === 'button' && textOf(node).join('') === 'note.compose')[0];
      if (reviewButton) fail('the old summary review header action is still present');
      else console.log('[ok] the annotation header no longer exposes summary review');

      // Promote one note through the explicit save step.
      const storeLink = findAll(notesView() || [], (node) => typeof node.type === 'function'
        && node.type.name === 'RowActionIcon' && node.props && node.props.name === 'store')[0];
      if (!storeLink) fail('the row store control is missing');
      else {
        storeLink.props.onClick({ stopPropagation: () => {} });
        const draft = window.__dshPromptPoolNoteSaveV1 ? window.__dshPromptPoolNoteSaveV1.get() : null;
        if (!draft || draft.open !== true || !Array.isArray(draft.choices) || draft.choices.length === 0) fail('the save step did not open');
        else {
          if (draft.choices[0].value !== 'builtin:oftenuse') fail('the default group is not first');
          if (draft.body !== '【note.kind.comment】「构建是否接受参数？」：接受分支参数') fail('the save step lost the composed body');
          const sheet = saveSheet();
          const saveButton = sheet && findAll(sheet, (node) => node.type === 'button'
            && String(node.props && node.props.className || '').indexOf('pp-note-btn-primary') >= 0)[0];
          if (!saveButton) fail('the save step has no save action');
          else {
            saveButton.props.onClick();
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
      }

      // Both old header bulk actions are gone; the row owns queue/store.
      const composeStore = findAll(render() || [], (node) => node.type === 'button' && textOf(node).join('') === 'note.composeStore')[0];
      if (composeStore) fail('the old header store-as-prompt control is still present');
      else console.log('[ok] the annotation header has no bulk store or review actions');

      const deleteLink = findAll(notesView() || [], (node) => typeof node.type === 'function'
        && node.type.name === 'RowActionIcon' && node.props && node.props.name === 'trash'
        && node.props.label === 'note.delete')[0];
      if (!deleteLink) fail('the row delete control is missing');
      else {
        deleteLink.props.onClick({ stopPropagation: () => {} });
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

      // Review replaces the per-row Outbox queue: annotations never leave the list here.
      const queueButton = findAll(notesView() || [], (node) => typeof node.type === 'function'
        && node.type.name === 'RowActionIcon' && node.props && node.props.name === 'queue')[0];
      if (queueButton) fail('the per-row outbox queue control is still present');
      else {
        const reviewButton = findAll(render() || [], (node) => node.type === 'button'
          && Array.isArray(node.children) && node.children.indexOf('note.review.open') >= 0)[0];
        if (!reviewButton) fail('the review action is missing');
        else {
          reviewButton.props.onClick();
          resetHooks();
          const dock = findAll(render() || [], (node) => node.props
            && String(node.props.className || '') === 'pp-review-dock')[0];
          const pool = window.__dshPromptPoolStoreV1.get();
          if (!dock || dock.props['data-collapsed'] !== 'false') fail('the review card did not open');
          else if (window.__dshPromptPoolNotesV1.get().items.length !== 1) fail('reviewing removed the annotations');
          else if (pool.tray.length !== 0) fail('reviewing queued annotations into the outbox');
          else console.log('[ok] the annotation page opens the review card without the outbox');
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
  const tabBarNode = findComponent(tree, 'ScopeBar');
  const bar = tabBarNode ? renderChild(tabBarNode) : [];
  const notesTab = findAll(bar, (node) => node.type === 'button'
    && String(node.props && node.props.className || '') === 'pp-tab'
    && node.props && node.props['data-group'] === 'notes')[0];
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

// Context extraction only returns complete sentences/questions, never a window.
const contextStart = source.indexOf('    /** Context is a complete sentence');
const contextEnd = source.indexOf('    /**', source.indexOf('    function noteContextAt'));
if (contextStart < 0 || contextEnd < 0) fail('the note context helpers were not found');
else {
  const helpers = new Function(`${source.slice(contextStart, contextEnd)}
    return { noteContextAt };`)();
  const same = (actual, expected, label) => {
    if (actual !== expected) fail(`${label}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
    else console.log('[ok] ' + label);
  };
  const choice = '你想我按照 A 执行，还是按照 B 执行？\nA. 方案一\nB. 方案二';
  const inQuestion = helpers.noteContextAt(choice, choice.indexOf('A 执行'), 'A');
  same(inQuestion.kind, 'question', 'a short quote inside a question gets that question');
  same(inQuestion.text, '你想我按照 A 执行，还是按照 B 执行？', 'the question is complete rather than a character window');
  const inList = helpers.noteContextAt(choice, choice.indexOf('A. 方案一'), 'A');
  same(inList.kind, 'question', 'an option in a list borrows the preceding question');
  same(inList.text, '你想我按照 A 执行，还是按照 B 执行？', 'the list option context is the complete question');
  const phrase = helpers.noteContextAt('这个方向可以作为下一步。', 2, '方向');
  same(phrase.kind, 'sentence', 'a short phrase gets its complete sentence');
  same(phrase.text, '这个方向可以作为下一步。', 'the sentence context is complete');
  const whole = helpers.noteContextAt('这个方向可以作为下一步。', 0, '这个方向可以作为下一步。');
  same(whole.text, '', 'a complete sentence does not repeat itself as context');
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
  const kindIcons = { agree: 'check', disagree: 'x', question: 'question', comment: 'pen', idea: 'bulb', supplement: 'info', todo: 'todo' };
  for (const kind of kinds) {
    if (kind.icon !== kindIcons[kind.id]) fail(`the ${kind.id} annotation icon is ${kind.icon}, expected ${kindIcons[kind.id]}`);
  }
  if (new Set(kinds.map((kind) => kind.icon)).size !== kinds.length) fail('annotation kinds no longer have distinct icons');
  else console.log('[ok] every annotation kind has its own icon');
  const kindColors = kinds.map((kind) => kind.color);
  const validColors = kindColors.every((color) => /^#[0-9a-f]{6}$/i.test(color || ''));
  if (!validColors) fail('an annotation kind has no valid hex color');
  else if (new Set(kindColors).size !== kinds.length) fail('two annotation kinds share one color');
  else console.log('[ok] every annotation kind has its own color');
  const notesRule = /\.pp-notes\{([^}]*)\}/.exec(source);
  const quoteMarkRule = /\.pp-notes-quote \.pp-type-mark\{([^}]*)\}/.exec(source);
  const kindWash = quoteMarkRule && quoteMarkRule[1].indexOf('var(--pp-kind') >= 0
    && quoteMarkRule[1].indexOf('var(--pp-note-ink)') >= 0;
  if (!kindWash) fail('the annotation type mark does not use the kind color');
  else if (notesRule && notesRule[1].indexOf('--pp-inline-tint:') >= 0) fail('the notes scope still carries one shared amber wash');
  else console.log('[ok] the type mark takes its kind color instead of one amber wash');
  const activeKindRule = /\.pp-note-kind\[data-active="true"\]\{([^}]*)\}/.exec(source);
  if (!activeKindRule || activeKindRule[1].indexOf('var(--pp-kind') < 0) {
    fail('the selected kind chip does not use the kind color');
  } else console.log('[ok] the selected kind chip takes its kind color');
  const missingUnderline = kinds.filter((kind) => !source.includes('::highlight(prompt-pool-note-' + kind.id + ')'));
  if (missingUnderline.length > 0) fail('annotation kinds without a highlight rule: ' + missingUnderline.map((kind) => kind.id).join(', '));
  else if (!source.includes('::highlight(prompt-pool-note-supplement){')) fail('the supplement highlight rule is missing');
  else if (kinds.some((kind) => !new RegExp('::highlight\\(prompt-pool-note-' + kind.id + '\\)\\{[^}]*' + kind.color).test(source))) {
    fail('a highlight underline does not match its kind color');
  } else console.log('[ok] every highlight underline matches its annotation kind');
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
  if (chipRule[1].indexOf('background:color-mix(in srgb,var(--pp-kind,#a97a24) 32%,transparent)') < 0) fail('the badge background is not deepened by its kind color');
  if (chipRule[1].indexOf('border:1px dashed color-mix(in srgb,var(--pp-kind,#a97a24) 80%,transparent)') < 0) fail('the badge border does not use the kind color');
  if (chipRule[1].indexOf('max-width:100%') < 0 || chipRule[1].indexOf('white-space:normal') < 0) fail('a long badge cannot wrap inside the column');
}
const underlineRule = /::highlight\(prompt-pool-note-comment\)\{([^}]*)\}/.exec(source);
if (!underlineRule) fail('the comment highlight rule is missing');
else if (underlineRule[1].indexOf('text-decoration-thickness:2px') < 0 || underlineRule[1].indexOf('#0891b2') < 0) {
  fail('the comment underline is not the 2px comment hue');
} else console.log('[ok] the badge wash and the highlighted underline share the kind hue');
const inlineIconRule = /\.pp-note-inline-icon svg\{([^}]*)\}/.exec(source);
if (!inlineIconRule || inlineIconRule[1].indexOf('width:12px') < 0 || inlineIconRule[1].indexOf('height:12px') < 0 || inlineIconRule[1].indexOf('stroke-width:2.1') < 0) {
  fail('the badge icon does not use the 12px icon step');
} else console.log('[ok] the badge icon uses the 12px icon step');
const typeMarkRule = /\.pp-type-mark svg\{([^}]*)\}/.exec(source);
if (!typeMarkRule || typeMarkRule[1].indexOf('width:12px') < 0 || typeMarkRule[1].indexOf('height:12px') < 0) {
  fail('the type mark does not use the 12px icon step');
} else console.log('[ok] the type mark uses the 12px icon step');
if (/maxLength:\s*NOTE_BODY_MAX/.test(source)) fail('the editor still uses a UTF-16 maxLength');
else console.log('[ok] the editor no longer uses a UTF-16 maxLength');
if (!/onChange:\s*\(event\)\s*=>\s*\{[\s\S]{0,200}mergeNoteBodyInput\(current, next\)/.test(source)) {
  fail('the editor does not merge typed text by display width');
}

// The list marker is written by the one add path, and styled as a short-lived
// inset accent rather than a permanent state.
const addStart = source.indexOf('add(note) {');
const addEnd = source.indexOf('patch(id, fields)', addStart);
if (addStart < 0 || addEnd < 0 || source.slice(addStart, addEnd).indexOf('noteFresh.set(') < 0) {
  fail('adding a note does not publish it for the list reveal');
} else console.log('[ok] every new annotation publishes a reveal marker');
const freshRule = /\.pp-notes-row\[data-fresh="true"\]\{([^}]*)\}/.exec(source);
if (!freshRule || freshRule[1].indexOf('box-shadow:inset 3px 0 0 var(--pp-note-accent)') < 0) {
  fail('the newly added annotation has no inset accent');
} else if (!/\.pp-notes-fresh\{/.test(source)) fail('the just-added label has no style');
else console.log('[ok] the newly added annotation gets a temporary accent and label');

for (const failure of failures) console.error('[fail]', failure);
console.log(failures.length === 0 ? '[ok] annotations live in the prompt pool' : `[fail] ${failures.length} check(s)`);
if (failures.length > 0) process.exitCode = 1;



