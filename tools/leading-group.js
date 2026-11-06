// Adds the three-way "which group leads" preference and orders the tab blocks by it.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'plugin', 'client.js');
let source = fs.readFileSync(file, 'utf8');

// 1. Settings: a persisted leader block, defaulting to the workspace view.
const fromSettings = `      return {
        workspaceTabs: settings.workspaceTabs !== false,
        currentWorkspaceTab: settings.currentWorkspaceTab !== false,
      };`;
const toSettings = `      const leaders = ['workspace', 'custom', 'builtin'];
      return {
        workspaceTabs: settings.workspaceTabs !== false,
        currentWorkspaceTab: settings.currentWorkspaceTab !== false,
        leadingGroup: leaders.indexOf(settings.leadingGroup) >= 0 ? settings.leadingGroup : 'workspace',
      };`;
if (source.split(fromSettings).length - 1 !== 1) throw new Error('normalizeSettings body not found');
source = source.split(fromSettings).join(toSettings);

// 2. Tab order follows the leader; the other two blocks keep their relative order.
const fromTabs = `      return [
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
const toTabs = `      const blocks = {
        workspace: showWorkspaceTab
          ? [{ id: 'workspace', label: translate(flags.workspaceTabs ? 'tab.workspace' : 'tab.currentWorkspace'), group: 'workspace' }]
          : [],
        builtin: [
          { id: 'pinned', label: translate('tab.pinned'), group: 'builtin' },
          { id: 'note', label: translate('tab.note'), group: 'builtin' },
          { id: 'snippet', label: translate('tab.snippet'), group: 'builtin' },
          { id: 'skill', label: translate('tab.skill'), group: 'builtin' },
        ],
        custom: categories.map((category) => ({ id: 'cat:' + category.id, label: category.name, category: true, group: 'custom' })),
      };
      const rest = ['workspace', 'custom', 'builtin'].filter((name) => name !== flags.leadingGroup);
      return [
        // 全部 always anchors the row; the chosen block leads the rest.
        { id: 'all', label: translate('tab.all'), group: 'all' },
        ...[flags.leadingGroup, ...rest].reduce((list, name) => list.concat(blocks[name]), []),
      ];`;
if (source.split(fromTabs).length - 1 !== 1) throw new Error('buildTabs return block not found');
source = source.split(fromTabs).join(toTabs);

// 3. Settings page: the three radio rows.
const fromRow = `        row('currentWorkspaceTab', 'settings.currentWorkspaceTab', 'settings.currentWorkspaceTabHint'),
      );`;
const toRow = `        row('currentWorkspaceTab', 'settings.currentWorkspaceTab', 'settings.currentWorkspaceTabHint'),
        h(
          'div',
          { className: 'pp-set-group' },
          h('div', { className: 'pp-set-label' }, translate('settings.leading')),
          ['workspace', 'custom', 'builtin'].map((name) =>
            h(
              'label',
              { key: name, className: 'pp-set-row' },
              h('input', {
                type: 'radio',
                name: 'pp-leading-group',
                checked: settings.leadingGroup === name,
                onChange: () => poolActions.setSetting('leadingGroup', name),
              }),
              h('span', null, translate('settings.leading.' + name)),
            ),
          ),
          h('div', { className: 'pp-hint pp-set-hint' }, translate('settings.leadingHint')),
        ),
      );`;
if (source.split(fromRow).length - 1 !== 1) throw new Error('settings rows not found');
source = source.split(fromRow).join(toRow);

// 4. Strings.
const fromZh = `      'settings.reload': '重新加载界面',`;
const toZh = `      'settings.leading': '哪一组排在前面',
      'settings.leading.workspace': '【当前工作区】前置',
      'settings.leading.custom': '【自定义分组】前置',
      'settings.leading.builtin': '【内置分组】前置',
      'settings.leadingHint': '「全部」始终在最前；这里决定它后面先出现哪一组，另外两组按固定顺序跟随。',
      'settings.reload': '重新加载界面',`;
if (source.split(fromZh).length - 1 !== 1) throw new Error('zh settings block not found');
source = source.split(fromZh).join(toZh);

const fromEn = `      'settings.reload': 'Reload the UI',`;
const toEn = `      'settings.leading': 'Which group comes first',
      'settings.leading.workspace': 'Current workspace first',
      'settings.leading.custom': 'Custom groups first',
      'settings.leading.builtin': 'Built-in groups first',
      'settings.leadingHint': '"All" always leads; this picks which group follows it, the other two keep their fixed order.',
      'settings.reload': 'Reload the UI',`;
if (source.split(fromEn).length - 1 !== 1) throw new Error('en settings block not found');
source = source.split(fromEn).join(toEn);

// 5. Style for the radio group label.
const fromCss = "      '.pp-set-hint{margin-top:2px;padding-left:22px}' +";
const toCss = "      '.pp-set-hint{margin-top:2px;padding-left:22px}' +\n      '.pp-set-label{font-size:12px;color:var(--pp-ink-2);margin:2px 0 4px}' +";
if (source.split(fromCss).length - 1 !== 1) throw new Error('css anchor not found');
source = source.split(fromCss).join(toCss);

fs.writeFileSync(file, source);
console.log('leading-group preference added');
