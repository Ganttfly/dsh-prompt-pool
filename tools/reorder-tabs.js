// Reorder the tab row to 全部 | 工作区 | 内置分组 | 自定义分组 and park the
// "+" control at the end of the custom block (which is now the row's end).
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'plugin', 'client.js');
let source = fs.readFileSync(file, 'utf8');

const from = `      return [
        // 全部 anchors the row; then the user's groups, the built-in groups, workspaces.
        { id: 'all', label: translate('tab.all'), group: 'all' },
        ...categories.map((category) => ({ id: 'cat:' + category.id, label: category.name, category: true, group: 'custom' })),
        { id: 'pinned', label: translate('tab.pinned'), group: 'builtin' },
        { id: 'note', label: translate('tab.note'), group: 'builtin' },
        { id: 'snippet', label: translate('tab.snippet'), group: 'builtin' },
        { id: 'skill', label: translate('tab.skill'), group: 'builtin' },
        ...(showWorkspaceTab
          ? [{ id: 'workspace', label: translate(flags.workspaceTabs ? 'tab.workspace' : 'tab.currentWorkspace'), group: 'workspace' }]
          : []),
      ];`;

const to = `      return [
        // 全部 → the workspace view → built-in groups → the user's own groups.
        { id: 'all', label: translate('tab.all'), group: 'all' },
        ...(showWorkspaceTab
          ? [{ id: 'workspace', label: translate(flags.workspaceTabs ? 'tab.workspace' : 'tab.currentWorkspace'), group: 'workspace' }]
          : []),
        { id: 'pinned', label: translate('tab.pinned'), group: 'builtin' },
        { id: 'note', label: translate('tab.note'), group: 'builtin' },
        { id: 'snippet', label: translate('tab.snippet'), group: 'builtin' },
        { id: 'skill', label: translate('tab.skill'), group: 'builtin' },
        ...categories.map((category) => ({ id: 'cat:' + category.id, label: category.name, category: true, group: 'custom' })),
      ];`;

if (source.split(from).length - 1 !== 1) throw new Error('buildTabs block not found verbatim');
source = source.split(from).join(to);

const addFrom =
  "      if (!addPlaced) nodes.splice(1, 0, h('span', { key: 'add-custom', className: 'pp-tab-addwrap' }, renderAdd()));";
const addTo =
  "      if (!addPlaced) nodes.push(h('span', { key: 'add-custom', className: 'pp-tab-addwrap' }, renderAdd()));";
if (source.split(addFrom).length - 1 !== 1) throw new Error('add-control fallback not found');
source = source.split(addFrom).join(addTo);

fs.writeFileSync(file, source);
console.log('tab order updated');
