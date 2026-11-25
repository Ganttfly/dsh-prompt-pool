// Proves the 清空 link no longer drops the queue by itself: it opens a confirm
// step, cancel keeps the queue, and only the confirm action clears it. Both the
// sidebar page and the composer panel are exercised with a tiny hook runtime.
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(process.env.PP_SOURCE || path.join(__dirname, '..', '..', 'plugin', 'client.js'), 'utf8');
const registrations = [];
const store = new Map();
const STORAGE_KEY = 'dsh.prompt-pool.v1';

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
  useRef: (init) => {
    const index = slot(() => ({ current: init }));
    return cells[index];
  },
  useMemo: (factory) => { slot(() => null); return factory(); },
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
        get: (name) =>
          name === 'betterSidebar'
            ? { registerTab: (descriptor) => { registrations.push({ slot: 'betterSidebar.tab', component: descriptor.component }); } }
            : name === 'remote'
              ? { skills: { list: async () => ({ ok: true, value: { skills: [] } }) } }
              : undefined,
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
  // The status flash schedules a timer; the harness only needs it to not throw.
  setTimeout: () => 0,
  clearTimeout: () => {},
  location: { reload: () => {} },
};

global.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
};

const fixture = () => JSON.stringify({
  version: 2,
  seeded: 2,
  categories: [],
  settings: {},
  items: [
    { id: 'i1', group: 'builtin:note', title: '一', body: '第一条', images: [] },
    { id: 'i2', group: 'builtin:note', title: '', body: '第二条', images: [{ id: 'img1', type: 'image/png', name: 'a.png' }] },
  ],
  tray: [{ key: 'k1', itemId: 'i1', body: '第一条', images: [] }, { key: 'k2', itemId: 'i2', body: '第二条', images: [] }],
});

const loadModule = () => {
  const before = registrations.length;
  delete global.window.__dshPromptPoolStoreV1;
  new Function('window', 'localStorage', 'require', source)(global.window, global.localStorage, () => reactStub);
  return registrations.slice(before);
};

const nodes = (node, out) => {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const child of node) nodes(child, out); return out; }
  out.push(node);
  if (node.children) for (const child of node.children) nodes(child, out);
  return out;
};

const findConfirm = (tree) => nodes(tree, []).find((node) => typeof node.type === 'function' && node.type.name === 'TrayClearConfirm');
const findDeleteConfirm = (tree) => nodes(tree, []).find((node) => typeof node.type === 'function' && node.type.name === 'ItemDeleteConfirm');
const findRemoveConfirm = (tree) => nodes(tree, []).find((node) => typeof node.type === 'function' && node.type.name === 'TrayRemoveConfirm');
const findTrayClose = (tree) => nodes(tree, []).find(
  (node) => typeof node.type === 'function' && node.type.name === 'IconButton' && node.props && node.props.name === 'close',
);
const findTrash = (tree) => nodes(tree, []).find(
  (node) => typeof node.type === 'function' && node.type.name === 'RowActionIcon'
    && node.props && node.props.name === 'trash' && node.props.label === 'row.delete',
);
/** Row actions are direct icon buttons, not entries inside an overflow menu. */
const activateRowAction = (action) => action.props.onClick({ stopPropagation: () => {} });
const findUndo = (tree) => nodes(tree, []).find(
  (node) => node.type === 'button'
    && String(node.props && node.props.className).indexOf('pp-link') >= 0
    && Array.isArray(node.children) && node.children.indexOf('status.undo') >= 0,
);
const findClearButton = (tree) => nodes(tree, []).find(
  (node) => node.type === 'button'
    && String(node.props && node.props.className).indexOf('pp-icon-btn') >= 0
    && node.props && node.props.title === 'tray.clearTitle',
);
// The row's duplicate action, not the one on a queued entry.
const findCopy = (tree) => nodes(tree, []).find(
  (node) => typeof node.type === 'function' && node.type.name === 'RowActionIcon'
    && node.props && node.props.name === 'copy' && node.props.label === 'row.duplicate',
);
const findSearch = (tree) => nodes(tree, []).find(
  (node) => node.type === 'input' && node.props && String(node.props.className || '').indexOf('pp-search') >= 0,
);
const findNew = (tree) => nodes(tree, []).find(
  (node) => node.type === 'button' && Array.isArray(node.children) && node.children.indexOf('page.new') >= 0,
);
const findCancel = (tree) => nodes(tree, []).find(
  (node) => node.type === 'button' && Array.isArray(node.children) && node.children.indexOf('row.cancel') >= 0,
);
/** The mode tab's live count; null when the scope bar is missing. */
const promptTabCount = (tree) => {
  const bar = nodes(tree, []).find(
    (node) => typeof node.type === 'function' && node.type.name === 'ScopeBar',
  );
  return bar && bar.props && bar.props.counts ? bar.props.counts.prompts : null;
};
const panelProps = {
  sessionId: 's1',
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
  useWorkspaces: () => ({ items: [], currentId: '' }),
  useSession: () => ({}),
};

const failures = [];

for (const [slotName, props, label] of [
  ['betterSidebar.tab', { initialScope: 'global' }, 'page'],
  ['conversation.input.overlay', {
    ...panelProps,
    initialScope: 'workspace',
    useWorkspaces: () => ({
      items: [{ id: 'w1', workspaceId: 'w1', name: 'W', sessionIds: ['s1'] }],
      currentId: 'w1',
    }),
  }, 'panel'],
]) {
  const fixtureData = JSON.parse(fixture());
  fixtureData.settings = { ...(fixtureData.settings || {}), queueCollapsed: false };
  if (label === 'panel') fixtureData.items = fixtureData.items.map((item) => ({ ...item, group: 'workspace:w1' }));
  store.set(STORAGE_KEY, JSON.stringify(fixtureData));
  const entries = loadModule();
  const pool = global.window.__dshPromptPoolStoreV1;
  const trayLength = () => pool.get().tray.length;
  const before = failures.length;
  cells = [];

  const entry = entries.find((candidate) => candidate.slot === slotName);
  if (!entry) { failures.push(`${label}: ${slotName} is not registered`); continue; }
  const render = () => {
    resetHooks();
    const out = entry.component(props);
    // The sidebar tab registers a thin wrapper around the page component.
    if (out && typeof out.type === 'function') {
      resetHooks();
      return out.type(out.props || props);
    }
    return out;
  };

  let tree = render();
  if (trayLength() !== 2) failures.push(`${label}: fixture loss, tray = ${trayLength()}`);
  if (findConfirm(tree)) failures.push(`${label}: the clear confirm is rendered before anything was clicked`);
  if (findRemoveConfirm(tree)) failures.push(`${label}: the remove confirm is rendered before anything was clicked`);

  if (label === 'page') {
    // A blank title says so instead of echoing the body; editing starts from the
    // row itself, so there is no separate pencil action any more.
    const titleTexts = nodes(tree, []).filter(
      (node) => String(node.props && node.props.className || '').indexOf('pp-title-text') >= 0,
    );
    if (!titleTexts.some((node) => node.children[0] === 'group.untitled')) failures.push('a blank title should read group.untitled');
    if (!titleTexts.some((node) => node.children[0] === '一')) failures.push('a saved title should stay visible');
    const editAction = nodes(tree, []).find(
      (node) => typeof node.type === 'function' && node.type.name === 'RowActionIcon'
        && node.props && node.props.name === 'edit',
    );
    if (editAction) failures.push('the row still offers a separate edit action');

    const mains = nodes(tree, []).filter(
      (node) => String(node.props && node.props.className || '').split(' ').indexOf('pp-main') >= 0,
    );
    if (mains.length < 2) failures.push('the page did not render both prompt rows');
    else {
      mains[1].props.onClick();
      tree = render();
      const promptCard = nodes(tree, []).find(
        (node) => node.type === 'div'
          && String(node.props && node.props.className || '').split(' ').indexOf('pp-edit') >= 0
          && node.props['data-domain'] === 'prompts',
      );
      const sharedRows = promptCard ? ['pp-edit-title', 'pp-edit-title-input', 'pp-edit-meta', 'pp-edit-actions']
        .filter((name) => nodes(promptCard, []).some(
          (node) => String(node.props && node.props.className || '').split(' ').indexOf(name) >= 0,
        )).length : 0;
      if (!promptCard || sharedRows !== 4) failures.push('the prompt editor is missing a shared editor row');
      const bodyCard = promptCard
        ? nodes(promptCard, []).find(
          (node) => node.type === 'div'
            && String(node.props && node.props.className || '').split(' ').indexOf('pp-edit-body') >= 0,
        )
        : null;
      if (!bodyCard) failures.push('the prompt editor has no body card');
      else {
        if (bodyCard.props['data-has-images'] !== 'true') failures.push('the body card does not mark its images');
        const bodyStrip = nodes(bodyCard, []).find(
          (node) => typeof node.type === 'function' && node.type.name === 'ImageStrip',
        );
        if (!bodyStrip || !Array.isArray(bodyStrip.props.images) || bodyStrip.props.images.length !== 1) {
          failures.push('the prompt image is not inside the body card');
        }
        const bodyMention = nodes(bodyCard, []).find(
          (node) => typeof node.type === 'function' && node.type.name === 'MentionField',
        );
        if (!bodyMention) failures.push('the prompt textarea is not inside the body card');
        const bodyPicker = nodes(bodyCard, []).find(
          (node) => typeof node.type === 'function' && node.type.name === 'ImagePicker',
        );
        if (!bodyPicker) failures.push('the prompt body card lost its image picker');
        else if (bodyPicker.props.compact !== true) failures.push('the prompt image picker is not the in-body plus button');
      }
      const editMeta = promptCard
        ? nodes(promptCard, []).find(
          (node) => node.type === 'div'
            && String(node.props && node.props.className || '').split(' ').indexOf('pp-edit-meta') >= 0,
        )
        : null;
      if (!editMeta) failures.push('the prompt editor has no meta row');
      else {
        if (nodes(editMeta, []).some(
          (node) => typeof node.type === 'function' && (node.type.name === 'ImagePicker' || node.type.name === 'ImageStrip'),
        )) failures.push('the prompt meta row still carries the image controls');
        const hint = nodes(editMeta, []).find(
          (node) => node.type === 'span'
            && String(node.props && node.props.className || '').split(' ').indexOf('pp-edit-hint') >= 0,
        );
        if (!hint || !Array.isArray(hint.children) || hint.children.indexOf('row.lengthHint') < 0) {
          failures.push('the prompt editor does not state its length policy');
        }
      }
      const picks = nodes(tree, []).filter(
        (node) => node.type === 'button' && String(node.props && node.props.className || '').indexOf('pp-type-pick') >= 0,
      );
      if (picks.length !== 7) failures.push(`the editor should offer 7 prompt types, found ${picks.length}`);
      const decision = picks.find((node) => node.props.title === 'prompt.type.decision');
      if (!decision) failures.push('the decision type chip is missing');
      else {
        decision.props.onClick();
        tree = render();
        const marksInEditor = nodes(tree, []).filter(
          (node) => typeof node.type === 'function' && node.type.name === 'TypeMark',
        );
        if (!marksInEditor.some((node) => node.props.name === 'check')) failures.push('the editor title does not follow the chosen type');
        const activeDecision = nodes(tree, []).find(
          (node) => node.type === 'button' && node.props && node.props['data-kind'] === 'decision'
            && node.props['data-active'] === 'true',
        );
        if (!activeDecision) failures.push('the chosen prompt type is not marked active');
        else {
          if (activeDecision.props.title !== 'row.typeClear') failures.push('the active type chip does not offer to clear');
          if (!nodes(activeDecision, []).some(
            (node) => String(node.props && node.props.className || '').split(' ').indexOf('pp-type-pick-x') >= 0,
          )) failures.push('the active type chip has no clear mark');
        }
        const save = nodes(tree, []).find(
          (node) => node.type === 'button' && Array.isArray(node.children) && node.children.indexOf('row.save') >= 0,
        );
        if (!save) failures.push('the prompt editor lost its save action');
        else {
          save.props.onClick();
          tree = render();
          const savedMarks = nodes(tree, []).filter(
            (node) => typeof node.type === 'function' && node.type.name === 'TypeMark',
          );
          if (!savedMarks.some((node) => node.props.name === 'check')) failures.push('the saved row does not show its type');
        }
      }
    }

    // Clicking another prompt while the editor has unsaved work must ask first.
    const switchMains = nodes(tree, []).filter(
      (node) => String(node.props && node.props.className || '').split(' ').indexOf('pp-main') >= 0,
    );
    if (switchMains.length < 2) failures.push('the page lost its prompt rows before the switch test');
    else {
      switchMains[0].props.onClick();
      tree = render();
      const mention = nodes(tree, []).find(
        (node) => typeof node.type === 'function' && node.type.name === 'MentionField',
      );
      if (!mention) failures.push('the prompt editor lost its text field before the switch test');
      else {
        mention.props.onChange({ target: { value: 'unsaved prompt text' } });
        tree = render();
        const nextMains = nodes(tree, []).filter(
          (node) => String(node.props && node.props.className || '').split(' ').indexOf('pp-main') >= 0,
        );
        const other = nextMains.find((node) => node.props.onClick !== switchMains[0].props.onClick);
        if (!other) failures.push('the second prompt row is missing after editing the first');
        else {
          other.props.onClick();
          tree = render();
          const dialog = nodes(tree, []).find(
            (node) => typeof node.type === 'function' && node.type.name === 'UnsavedSwitchDialog',
          );
          if (!dialog) failures.push('switching prompts dropped the edit without asking');
          else {
            dialog.props.onDiscard();
            tree = render();
            const titleInput = nodes(tree, []).find(
              (node) => node.type === 'input'
                && String(node.props && node.props.className || '').indexOf('pp-edit-title-input') >= 0,
            );
            if (!titleInput || titleInput.props.value !== '') {
              failures.push('discarding the prompt switch did not open the other row');
            } else {
              console.log('[ok] page: switching prompts asks before dropping unsaved work');
            }
            const cancelNext = findCancel(tree);
            if (cancelNext) cancelNext.props.onClick();
            tree = render();

            // Keeping the editor open preserves the draft.
            const firstMains = nodes(tree, []).filter(
              (node) => String(node.props && node.props.className || '').split(' ').indexOf('pp-main') >= 0,
            );
            const firstId = pool.get().items[0] && pool.get().items[0].id;
            if (!firstId) failures.push('the first prompt lost its identity');
            else {
              firstMains[0].props.onClick();
              tree = render();
              const again = nodes(tree, []).find(
                (node) => typeof node.type === 'function' && node.type.name === 'MentionField',
              );
              if (!again) failures.push('the prompt editor did not reopen for the stay test');
              else {
                again.props.onChange({ target: { value: 'draft to keep' } });
                tree = render();
                const otherAgain = nodes(tree, []).filter(
                  (node) => String(node.props && node.props.className || '').split(' ').indexOf('pp-main') >= 0,
                )[0];
                if (!otherAgain) failures.push('the target prompt disappeared for the stay test');
                else {
                  otherAgain.props.onClick();
                  tree = render();
                  const stayDialog = nodes(tree, []).find(
                    (node) => typeof node.type === 'function' && node.type.name === 'UnsavedSwitchDialog',
                  );
                  if (!stayDialog) failures.push('the stay test did not ask again');
                  else {
                    stayDialog.props.onCancel();
                    tree = render();
                    const stayInput = nodes(tree, []).find(
                      (node) => typeof node.type === 'function' && node.type.name === 'MentionField',
                    );
                    const stillAsking = nodes(tree, []).some(
                      (node) => typeof node.type === 'function' && node.type.name === 'UnsavedSwitchDialog',
                    );
                    if (!stayInput || stayInput.props.value !== 'draft to keep' || stillAsking) {
                      failures.push('keeping the editor open lost the draft');
                    } else {
                      console.log('[ok] page: keep editing preserves the draft');
                      const saveTarget = nodes(tree, []).filter(
                        (node) => String(node.props && node.props.className || '').split(' ').indexOf('pp-main') >= 0,
                      )[0];
                      if (!saveTarget) failures.push('the target prompt disappeared for the save test');
                      else {
                        saveTarget.props.onClick();
                        tree = render();
                        const saveDialog = nodes(tree, []).find(
                          (node) => typeof node.type === 'function' && node.type.name === 'UnsavedSwitchDialog',
                        );
                        if (!saveDialog) failures.push('the save test did not ask again');
                        else {
                          saveDialog.props.onSave();
                          tree = render();
                          const savedFirst = pool.get().items.find((entry) => entry.id === firstId);
                          const targetTitle = nodes(tree, []).find(
                            (node) => node.type === 'input'
                              && String(node.props && node.props.className || '').indexOf('pp-edit-title-input') >= 0,
                          );
                          if (!savedFirst || savedFirst.body !== 'draft to keep') {
                            failures.push('save and switch did not keep the draft');
                          } else if (!targetTitle || targetTitle.props.value !== '') {
                            failures.push('save and switch did not open the other row');
                          } else {
                            console.log('[ok] page: save and switch keeps the draft and opens the target');
                          }
                        }
                      }
                      const cancelLast = findCancel(tree);
                      if (cancelLast) cancelLast.props.onClick();
                      tree = render();
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  // A queued entry can carry edits the pool does not have, so removal asks too.
  const queuedBefore = trayLength();
  const itemsBeforeRemove = pool.get().items.length;
  let close = findTrayClose(tree);
  if (!close) { failures.push(`${label}: the queued entry's remove button was not found`); continue; }
  close.props.onClick();
  if (trayLength() !== queuedBefore) failures.push(`${label}: clicking remove dropped the entry without asking`);

  tree = render();
  const removeConfirm = findRemoveConfirm(tree);
  if (!removeConfirm) { failures.push(`${label}: removing a queued entry did not open a confirmation`); continue; }
  const removeModal = removeConfirm.type(removeConfirm.props);
  if (!removeModal || !removeModal.props || removeModal.props.text !== 'tray.removeConfirm') {
    failures.push(`${label}: the remove confirmation should use the generic copy`);
  }
  if (removeConfirm.props.title !== undefined) failures.push(`${label}: the remove confirmation still embeds the entry text`);

  removeConfirm.props.onCancel();
  tree = render();
  if (trayLength() !== queuedBefore) failures.push(`${label}: cancel still removed the queued entry`);
  if (findRemoveConfirm(tree)) failures.push(`${label}: the remove confirmation survived cancel`);

  close = findTrayClose(tree);
  if (!close) { failures.push(`${label}: the entry's remove button vanished after cancel`); continue; }
  close.props.onClick();
  tree = render();
  const reopenedRemove = findRemoveConfirm(tree);
  if (!reopenedRemove) { failures.push(`${label}: the remove confirmation did not reopen`); continue; }
  reopenedRemove.props.onConfirm();
  tree = render();
  if (trayLength() !== queuedBefore - 1) failures.push(`${label}: confirming left ${trayLength()} queued item(s)`);
  if (pool.get().items.length !== itemsBeforeRemove) failures.push(`${label}: removing a queued entry changed the pool`);
  if (findRemoveConfirm(tree)) failures.push(`${label}: the remove confirmation stayed open`);
  if (failures.length === before) console.log(`[ok] ${label}: queued removal asks, cancel keeps, confirm removes`);

  const queued = trayLength();
  const link = findClearButton(tree);
  if (!link) { failures.push(`${label}: the clear link was not found`); continue; }
  link.props.onClick();
  if (trayLength() !== queued) failures.push(`${label}: clicking clear emptied the queue without asking`);

  tree = render();
  const confirm = findConfirm(tree);
  if (!confirm) { failures.push(`${label}: clicking clear did not open a confirmation`); continue; }
  if (confirm.props.count !== queued) failures.push(`${label}: the confirmation counted ${confirm.props.count}, expected ${queued}`);

  confirm.props.onCancel();
  tree = render();
  if (trayLength() !== queued) failures.push(`${label}: cancel still cleared the queue`);
  if (findConfirm(tree)) failures.push(`${label}: the confirmation survived cancel`);

  const reopened = findClearButton(tree);
  if (!reopened) { failures.push(`${label}: the clear link vanished after cancel`); continue; }
  reopened.props.onClick();
  tree = render();
  const again = findConfirm(tree);
  if (!again) { failures.push(`${label}: the confirmation did not reopen`); continue; }
  again.props.onConfirm();
  tree = render();
  if (trayLength() !== 0) failures.push(`${label}: confirming left ${trayLength()} item(s) in the queue`);
  if (findConfirm(tree)) failures.push(`${label}: the confirmation stayed open after clearing`);

  if (failures.length === before) console.log(`[ok] ${label}: clear asks, cancel keeps, confirm clears`);

  // The clear toast offers an undo, and it puts the queued items back.
  const clearUndo = findUndo(tree);
  if (!clearUndo) failures.push(`${label}: the undo action is missing after clearing`);
  else {
    clearUndo.props.onClick();
    tree = render();
    if (trayLength() !== queued) failures.push(`${label}: undo restored ${trayLength()} queued item(s), expected ${queued}`);
  }
  if (failures.length === before) console.log(`[ok] ${label}: clearing can be undone`);

  // Same story for deleting one pool item, plus the undo the toast offers.
  const itemCount = () => pool.get().items.length;
  const startItems = itemCount();
  if (startItems === 0) { failures.push(`${label}: the pool has no item to delete`); continue; }

  let trash = findTrash(tree);
  if (!trash) { failures.push(`${label}: the delete button was not found`); continue; }
  activateRowAction(trash);
  if (itemCount() !== startItems) failures.push(`${label}: clicking delete removed the item without asking`);

  tree = render();
  const deleteConfirm = findDeleteConfirm(tree);
  if (!deleteConfirm) { failures.push(`${label}: deleting did not open a confirmation`); continue; }
  const deleteModal = deleteConfirm.type(deleteConfirm.props);
  if (!deleteModal || !deleteModal.props || deleteModal.props.text !== 'row.deleteConfirm') {
    failures.push(`${label}: the delete confirmation should use the generic copy`);
  }
  if (deleteConfirm.props.title !== undefined) failures.push(`${label}: the delete confirmation still embeds the item text`);

  deleteConfirm.props.onCancel();
  tree = render();
  if (itemCount() !== startItems) failures.push(`${label}: cancel still deleted the item`);
  if (findDeleteConfirm(tree)) failures.push(`${label}: the delete confirmation survived cancel`);

  trash = findTrash(tree);
  if (!trash) { failures.push(`${label}: the delete button vanished after cancel`); continue; }
  activateRowAction(trash);
  tree = render();
  const reopenedDelete = findDeleteConfirm(tree);
  if (!reopenedDelete) { failures.push(`${label}: the delete confirmation did not reopen`); continue; }
  reopenedDelete.props.onConfirm();
  tree = render();
  if (itemCount() !== startItems - 1) failures.push(`${label}: confirming left ${itemCount()} item(s)`);
  if (findDeleteConfirm(tree)) failures.push(`${label}: the delete confirmation stayed open`);

  const undo = findUndo(tree);
  if (!undo) failures.push(`${label}: the undo action is missing after deleting`);
  else {
    undo.props.onClick();
    tree = render();
    if (itemCount() !== startItems) failures.push(`${label}: undo restored ${itemCount()} item(s)`);
  }

  if (failures.length === before) console.log(`[ok] ${label}: delete asks, cancel keeps, confirm deletes, undo restores`);

  // Both views expose the row duplicate action (the panel used to miss it).
  const copy = findCopy(tree);
  if (!copy) failures.push(`${label}: the duplicate action is missing`);
  else {
    const beforeCopy = itemCount();
    activateRowAction(copy);
    tree = render();
    if (itemCount() !== beforeCopy + 1) failures.push(`${label}: duplicate changed the pool by ${itemCount() - beforeCopy}`);
  }
  if (failures.length === before) console.log(`[ok] ${label}: duplicate appends a copy`);

  // New then cancel must not leave an empty row; a search must not hide the new row.
  const beforeNew = itemCount();
  const countBeforeNew = promptTabCount(tree);
  if (countBeforeNew === null) failures.push(`${label}: the prompts tab count was not found`);
  const search = findSearch(tree);
  if (search) {
    search.props.onChange({ target: { value: 'no-such-prompt' } });
    tree = render();
  }
  const newButton = findNew(tree);
  if (!newButton) failures.push(`${label}: the new-prompt button was not found`);
  else {
    newButton.props.onClick();
    tree = render();
    const searchAfter = findSearch(tree);
    if (search && (!searchAfter || searchAfter.props.value !== '')) failures.push(`${label}: the search still hides the new row`);
    if (itemCount() !== beforeNew + 1) failures.push(`${label}: new did not add exactly one row`);
    // The unsaved draft is a store row already; it must not inflate the mode
    // count.
    if (countBeforeNew !== null && promptTabCount(tree) !== countBeforeNew) {
      failures.push(`${label}: the unsaved draft changed the tab count`);
    }
    // A second click while the editor is open must reuse that editor instead
    // of leaving the first draft behind, uncounted.
    const secondNew = findNew(tree);
    if (secondNew) secondNew.props.onClick();
    tree = render();
    if (itemCount() !== beforeNew + 1) failures.push(`${label}: a second new left an extra draft behind`);
    if (countBeforeNew !== null && promptTabCount(tree) !== countBeforeNew) {
      failures.push(`${label}: a second new changed the tab count`);
    }
    const cancel = findCancel(tree);
    if (!cancel) failures.push(`${label}: the editor's cancel button was not found`);
    else {
      cancel.props.onClick();
      tree = render();
      if (itemCount() !== beforeNew) failures.push(`${label}: cancel left ${itemCount() - beforeNew} empty row(s)`);
      if (countBeforeNew !== null && promptTabCount(tree) !== countBeforeNew) {
        failures.push(`${label}: cancel changed the tab count`);
      }
    }
  }
  if (failures.length === before) console.log(`[ok] ${label}: new then cancel leaves no empty row`);
}

for (const failure of failures) console.error('[fail]', failure);
console.log(failures.length === 0 ? '[ok] every destructive action asks first' : `[fail] ${failures.length} check(s)`);
if (failures.length > 0) process.exitCode = 1;
