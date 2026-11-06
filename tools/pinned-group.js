// Make 常用 a built-in group: carry `pinned` through the editor state, drop the
// per-row star toggle, and let a new item start in the group of its tab.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'plugin', 'client.js');
let source = fs.readFileSync(file, 'utf8');

const edits = [
  // Editor state carries the built-in group.
  [
    'setEditing({ id: item.id, kind: item.kind, title: item.title, body: item.body, categoryId: item.categoryId || \'\' })',
    'setEditing({ id: item.id, kind: item.kind, title: item.title, body: item.body, categoryId: item.categoryId || \'\', pinned: item.pinned === true })',
    3,
  ],
  // Saving writes it back.
  [
    "          categoryId: editing.categoryId || '',\n        });",
    "          categoryId: editing.categoryId || '',\n          pinned: editing.pinned === true,\n        });",
    2,
  ],
  // A new item starts unpinned unless created from the 常用 tab.
  [
    "        const item = poolActions.add({\n          id: uid(),\n          kind: nextKind,\n          title: '',\n          body: '',\n          categoryId,\n          createdAt: Date.now(),",
    "        const item = poolActions.add({\n          id: uid(),\n          kind: nextKind,\n          title: '',\n          body: '',\n          categoryId,\n          pinned: tab === 'pinned',\n          createdAt: Date.now(),",
    2,
  ],
  [
    'setEditing({ id: item.id, kind: nextKind, title: \'\', body: \'\', categoryId })',
    'setEditing({ id: item.id, kind: nextKind, title: \'\', body: \'\', categoryId, pinned: tab === \'pinned\' })',
    2,
  ],
];

for (const [from, to, expected] of edits) {
  const count = source.split(from).length - 1;
  if (count !== expected) throw new Error(`expected ${expected} matches for "${from.slice(0, 60)}", got ${count}`);
  source = source.split(from).join(to);
}

// Drop the row star buttons; 常用 is a group now, not a flag.
const starBlock = /[ ]*h\(IconButton, \{\n[ ]*name: item\.pinned === true \? 'starFill' : 'star',\n[ ]*label: translate\(item\.pinned === true \? 'row\.unpin' : 'row\.pin'\),\n[ ]*active: item\.pinned === true,\n[ ]*onClick: \(\) => poolActions\.togglePin\(item\.id\),\n[ ]*\}\),\n/g;
const starCount = (source.match(starBlock) || []).length;
source = source.replace(starBlock, '');

fs.writeFileSync(file, source);
console.log('edits applied; star buttons removed:', starCount);
