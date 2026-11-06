// Larger row icons: glyph 12 → 15, hit target 22 → 26, tray toggle 22 → 26.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'plugin', 'client.js');
let source = fs.readFileSync(file, 'utf8');

const edits = [
  // Shared glyph box for row action icons.
  ['    const base = {\n      width: 12,\n      height: 12,', '    const base = {\n      width: 15,\n      height: 15,'],
  // Tray add glyph.
  ["{ width: 13, height: 13, viewBox: '0 0 14 14',", "{ width: 15, height: 15, viewBox: '0 0 14 14',"],
  // Hit targets.
  ["'.pp-toggle{width:22px;height:22px;", "'.pp-toggle{width:26px;height:26px;"],
  ["'.pp-icon{width:22px;height:22px;", "'.pp-icon{width:26px;height:26px;"],
  ["'.pp-chip .pp-icon{width:18px;height:18px}'", "'.pp-chip .pp-icon{width:22px;height:22px}'"],
];

for (const [from, to] of edits) {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`expected 1 match for "${from.slice(0, 50)}", got ${count}`);
  source = source.split(from).join(to);
}

fs.writeFileSync(file, source);
console.log('icon sizes raised');
