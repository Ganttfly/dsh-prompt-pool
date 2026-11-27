// Proves the composer trigger and the annotation surfaces explain what they do:
// the labels stay short, and each hover text says what pressing the control will
// produce instead of repeating its label back at the reader.
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', '..', 'plugin', 'client.js'), 'utf8');

const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };
const has = (needle) => source.indexOf(needle) >= 0;

// The four trigger tooltips: one per control, each longer than its label.
for (const key of ['tip.pool', 'tip.notes', 'tip.noteCount', 'tip.prompts']) {
  check(has(`'${key}':`), `the ${key} text is missing from the locale tables`);
  const rows = source.split(`'${key}':`).length - 1;
  check(rows === 2, `${key} is written ${rows} time(s); the Chinese and English tables need one each`);
}
check(has("title: translate('tip.pool')"), 'the brand cap still has no hover text');
check(has("title: translate('tip.notes')"), 'the annotations entry still repeats its label');
check(has("title: translate('tip.prompts')"), 'the prompts entry still repeats its label');
check(has("title: translate('tip.noteCount', { n: notes.length })"), 'the annotation count badge has no hover text');

// The kind chips carry the rule the review prompt will send for that kind.
check(has('title: translate(REVIEW_GROUP_PROMPTS[entry.id])'), 'the kind chips do not explain what the model will be asked');
check(has("comment: 'note.review.group.comment'"), 'the comment kind lost its rule sentence');

// Summarizing shows the rules that go into the generated prompt.
const introTips = source.split("translate('note.review.intro')").length - 1;
check(introTips >= 3, `the summarize rule text has ${introTips} use(s); the menu entry and the card button both need it`);

for (const failure of failures) console.error('[fail]', failure);
console.log(failures.length === 0
  ? '[ok] the trigger and the annotation surfaces carry hover text that explains their effect'
  : `[fail] ${failures.length} check(s)`);
if (failures.length > 0) process.exitCode = 1;
