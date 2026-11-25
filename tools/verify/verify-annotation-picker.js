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

check(source.includes("const NOTE_CHIP_VERSION = '7';"), 'inline chips are rebuilt at version 7');
check(source.includes("text.setAttribute('data-text', shown)"), 'the inline chip keeps its text out of textContent');
check(!/text\.textContent\s*=\s*shown/.test(source), 'the inline chip no longer writes textContent');
check(source.includes('.pp-note-inline-text::before{content:attr(data-text)}'), 'the inline chip draws its label from data-text');

check(source.includes("const [editBody, setEditBody] = useState('');"), 'the list editor holds only the body');
check(source.includes('notesActions.patch(note.id, { kind: editKind, body: clampNoteBody(editBody.trim()) });'), 'saving from the list patches kind and body only');
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

for (const failure of failures) console.error('[fail]', failure);
console.log(failures.length === 0 ? '[ok] semantic block annotations are wired' : '[fail] ' + failures.length + ' check(s)');
if (failures.length > 0) process.exitCode = 1;
