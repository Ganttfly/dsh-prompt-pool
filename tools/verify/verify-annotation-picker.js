// Semantic block picker: mapping, assistant-only targeting, block anchors and
// the inline annotation editor. The pure mapping is executed; the DOM paths are
// asserted statically because the harness has no chat DOM.
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', '..', 'plugin', 'client.js'), 'utf8');
const failures = [];
const check = (ok, message) => {
  if (ok) console.log('[ok] ' + message);
  else failures.push(message);
};

const pickSource = /function pickKindForBlock\(block, source\) \{[\s\S]*?\n    \}/.exec(source);
if (!pickSource) {
  failures.push('pickKindForBlock is missing');
} else {
  const pickKindForBlock = new Function(pickSource[0] + '; return pickKindForBlock;')();
  const sourceNode = { tagName: 'DIV' };
  const cases = [
    [sourceNode, 'reply'],
    [{ tagName: 'P' }, 'paragraph'],
    [{ tagName: 'LI' }, 'listItem'],
    [{ tagName: 'H2' }, 'heading'],
    [{ tagName: 'BLOCKQUOTE' }, 'quote'],
    [{ tagName: 'PRE' }, 'code'],
    [{ tagName: 'TD' }, 'cell'],
    [{ tagName: 'TH' }, 'cell'],
  ];
  for (const [block, expected] of cases) {
    check(pickKindForBlock(block, sourceNode) === expected, 'pickKindForBlock maps ' + (block.tagName || 'source') + ' to ' + expected);
  }
}

check(source.includes("row.getAttribute('data-chat-flow-kind') !== 'assistant-step'"), 'the picker only accepts assistant steps');
check(source.includes("if (element.closest('.pp-pick-bar, .pp-note-bubble, .pp-note-layer, .pp-root, .pp-note-inline')) return null;"), 'the picker ignores its own chrome and existing chips');
check(source.includes("element.closest('p,li,h1,h2,h3,h4,h5,h6,blockquote,pre,td,th')"), 'the picker resolves semantic blocks');
check(source.includes('textOffsetIn(target.source, target.block, 0)'), 'a block anchor offsets from the block start');
check(source.includes('function captureElementAnchor(sessionId, target)'), 'block anchors reuse the text-anchor builder');

const blockNoteAtSource = /function blockNoteAt\(items, sessionId, anchor\) \{[\s\S]*?\n    \}/.exec(source);
if (!blockNoteAtSource) {
  failures.push('blockNoteAt is missing');
} else {
  const blockNoteAt = new Function(blockNoteAtSource[0] + '; return blockNoteAt;')();
  const notes = [
    { id: 'a', sessionId: 's', nodeKey: 'node-1', offset: 5, quote: 'first' },
    { id: 'b', sessionId: 's', nodeKey: 'node-1', offset: 40, quote: 'second' },
  ];
  check(blockNoteAt(notes, 's', { nodeKey: 'node-1', offset: 5, quote: 'first' }) === notes[0], 'a block with an annotation is recognized');
  check(blockNoteAt(notes, 's', { nodeKey: 'node-1', offset: 6, quote: 'second' }) === null, 'another block in the same reply is not a duplicate');
  check(blockNoteAt(notes, 's', { nodeKey: 'node-1', offset: 5, quote: 'part' }) === null, 'a phrase note at the block start is not a block duplicate');
  check(blockNoteAt(notes, 'other', { nodeKey: 'node-1', offset: 5, quote: 'first' }) === null, 'the same block in another session is not a duplicate');
}

const pickerStart = source.indexOf('function NotePicker()');
check(source.includes('const existing = blockNoteAt(notes.get().items, pick.sessionId, anchor);'), 'the picker checks for an existing block annotation');
check(source.includes('revealNote(existing.id);'), 'an existing block annotation opens in the list editor');
check(source.includes('revealNote(id);'), 'a new block annotation opens in the list editor');
check(!source.includes("translate('note.pick.exists')"), 'opening an existing annotation no longer shows a duplicate toast');
check(source.includes('noteEditRequestActions.request(id, pick.sessionId, surface);'), 'the picker asks the target surface to edit the annotation');
check(source.includes("if (surface === 'panel') {"), 'a panel target opens the panel before editing');
check(source.includes("bridge.request({ type: 'open-view', scope: 'notes', create: false });"), 'the opened panel switches to the annotations view');
check(source.includes("source: source === 'page' ? 'page' : 'panel'"), 'the picker records whether it started on the page or the panel');
check(source.includes("notePickActions.start(activeSessionId, 'page');"), 'the annotations page starts the picker for its own surface');
check(source.includes("const surface = props.surface === 'page' ? 'page' : 'panel';"), 'each notes list knows which surface it serves');
check(source.includes("surface: 'page',"), 'the page passes its surface to the notes list');
check(source.includes("surface: 'panel',"), 'the panel passes its surface to the notes list');
check(source.includes('noteEditRequestActions.clear(editRequest.token);'), 'the notes list consumes the edit request');
check(source.includes('revealRow(note.id);'), 'the requested annotation is scrolled into view');
check(source.includes('const NOTE_EDIT_REQUEST_MS = 6000;'), 'an unconsumed edit request expires');
check(
  pickerStart >= 0
    && source.indexOf('blockNoteAt(notes.get()', pickerStart) >= 0
    && source.indexOf('blockNoteAt(notes.get()', pickerStart) < source.indexOf('notesActions.add({', pickerStart),
  'the duplicate check runs before the note is added',
);

check(source.includes("const NOTE_CHIP_VERSION = '7';"), 'inline chips are rebuilt at version 7');
check(source.includes("text.setAttribute('data-text', shown)"), 'the inline chip keeps its text out of textContent');
check(!/text\.textContent\s*=\s*shown/.test(source), 'the inline chip no longer writes textContent');
check(source.includes('.pp-note-inline-text::before{content:attr(data-text)}'), 'the inline chip draws its label from data-text');

check(source.includes("const [editBody, setEditBody] = useState('');"), 'the list editor holds the body');
check(source.includes("const [editImages, setEditImages] = useState([]);"), 'the list editor holds its images');
check(
  source.includes('notesActions.patch(note.id, {')
    && source.includes('kind: editKind,')
    && source.includes('body: clampNoteBody(editBody.trim()),')
    && source.includes('images: normalizeImages(editImages),'),
  'saving from the list patches kind, body and images',
);
check(!/notesActions\.patch\(note\.id,\s*\{[^}]*quote/.test(source), 'the list editor never patches the quote');
check(source.includes("'data-editable': reviewMode ? undefined : 'true'"), 'annotation bodies are editable outside review mode');
check(source.includes("title: reviewMode ? undefined : translate('note.edit')"), 'the editable body announces the editor');

check(source.includes("notePickActions.start(sessionId)"), 'the composer menu starts block picking');
check(source.includes("translate('note.pick.page')"), 'the annotations page offers its own picker entry');
check(source.includes("const seat = document.querySelector('[data-composer-seat]');"), 'the picker bar anchors to the composer');
check(source.includes("element.style.bottom = Math.round(offset) + 'px';"), 'the picker bar clears the composer');
check(!source.includes('html.pp-pick-cursor [data-chat-flow]'), 'the pick cursor is not painted over the whole conversation flow');
check(source.includes('html.pp-pick-cursor .pp-pick-hover'), 'the pick cursor follows the eligible block');
check(source.includes("hovered.classList.add('pp-pick-hover')") && source.includes("hovered.classList.remove('pp-pick-hover')"), 'the hover mark is applied and cleared');
check(source.includes('setHover(target.block);'), 'only a valid target receives the pick cursor');
check(source.includes("const flowFor = (node) => {"), 'the picker resolves the current conversation flow');
check(source.includes("if (!element || !flow || !root.contains(flow) || closestOf(element, '.pp-pick-bar'))"), 'the picker only highlights blocks in the conversation flow');
check(source.includes('if (!target) return;'), 'invalid targets add nothing and show no warning');
check(!source.includes('note.pick.invalid'), 'the picker no longer carries invalid-target copy');
check(source.includes("window.addEventListener('keydown', onKey, true);"), 'Escape is captured while picking');
check(source.includes("pickKind: typeof settings.pickKind === 'string' ? settings.pickKind : 'comment'"), 'the block picker defaults to Note');
check(source.includes('kind: pickKindRef.current'), 'the picker stamps the chosen kind');
check(source.includes("poolActions.setSetting('pickKind', kind.id)"), 'the picker kind chips remember the choice');

for (const failure of failures) console.error('[fail]', failure);
console.log(failures.length === 0 ? '[ok] semantic block annotations are wired' : '[fail] ' + failures.length + ' check(s)');
if (failures.length > 0) process.exitCode = 1;
