// Second palette pass: scope the trigger, and give the tag badge and the
// primary button their semantic roles from the token block.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'plugin', 'client.js');
let source = fs.readFileSync(file, 'utf8');

const edits = [
  ['.pp-panel,.pp-page,.pp-settings{', '.pp-panel,.pp-page,.pp-settings,.pp-root{'],
  ["className: 'pp-btn',", "className: 'pp-btn pp-root',"],
  [
    "'.pp-kind{flex:none;margin-top:2px;padding:0 5px;border-radius:5px;border:1px solid var(--pp-line);color:var(--pp-ink-2);font-size:10px;line-height:15px}'",
    "'.pp-kind{flex:none;margin-top:2px;padding:0 5px;border-radius:5px;border:1px solid var(--pp-accent-line);background:var(--pp-accent-soft);color:var(--pp-accent);font-size:10px;line-height:15px}'",
  ],
  ['background:var(--pp-accent);color:#ffffff;', 'background:var(--pp-accent);color:var(--pp-on-accent);'],
];

for (const [from, to] of edits) {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`expected exactly one match for "${from.slice(0, 44)}", got ${count}`);
  source = source.split(from).join(to);
}

fs.writeFileSync(file, source);
console.log('semantic edits applied:', edits.length);
