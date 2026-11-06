// Rename the two group labels and add the "常用" built-in option label.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'plugin', 'client.js');
let source = fs.readFileSync(file, 'utf8');

const edits = [
  ["'row.kindLabel': '类型',", "'row.kindLabel': '内置分组',"],
  ["'row.categoryLabel': '类别',", "'row.categoryLabel': '自定义分组',"],
  ["'row.kindLabel': 'Kind',", "'row.kindLabel': 'Built-in',"],
  ["'row.categoryLabel': 'Category',", "'row.categoryLabel': 'Custom',"],
  ["'kind.note': '便签',", "'kind.note': '便签',\n      'kind.pinned': '常用',"],
  ["'kind.note': 'Note',", "'kind.note': 'Note',\n      'kind.pinned': 'Pinned',"],
];

for (const [from, to] of edits) {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`expected 1 match for "${from}", got ${count}`);
  source = source.split(from).join(to);
}

fs.writeFileSync(file, source);
console.log('labels updated');
