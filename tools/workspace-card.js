// Groups the two workspace display checkboxes into one titled card.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'plugin', 'client.js');
let source = fs.readFileSync(file, 'utf8');

const fromHelper = `      const row = (key, label, hint) =>
        h(
          'div',
          { className: 'pp-set-group' },
          h(
            'label',
            { className: 'pp-set-row' },
            h('input', {
              type: 'checkbox',
              checked: settings[key] === true,
              onChange: () => poolActions.setSetting(key, settings[key] !== true),
            }),
            h('span', null, translate(label)),
          ),
          h('div', { className: 'pp-hint pp-set-hint' }, translate(hint)),
        );`;

const toHelper = `      const check = (key, label, hint) =>
        h(
          'div',
          { className: 'pp-set-item' },
          h(
            'label',
            { className: 'pp-set-row' },
            h('input', {
              type: 'checkbox',
              checked: settings[key] === true,
              onChange: () => poolActions.setSetting(key, settings[key] !== true),
            }),
            h('span', null, translate(label)),
          ),
          h('div', { className: 'pp-hint pp-set-hint' }, translate(hint)),
        );`;

if (source.split(fromHelper).length - 1 !== 1) throw new Error('row helper not found verbatim');
source = source.split(fromHelper).join(toHelper);

const fromRows = `        row('workspaceTabs', 'settings.workspaceTabs', 'settings.workspaceTabsHint'),
        row('currentWorkspaceTab', 'settings.currentWorkspaceTab', 'settings.currentWorkspaceTabHint'),`;

const toRows = `        h(
          'div',
          { className: 'pp-set-group pp-set-card' },
          h('div', { className: 'pp-set-label' }, translate('settings.workspaceCard')),
          check('workspaceTabs', 'settings.workspaceTabs', 'settings.workspaceTabsHint'),
          check('currentWorkspaceTab', 'settings.currentWorkspaceTab', 'settings.currentWorkspaceTabHint'),
        ),`;

if (source.split(fromRows).length - 1 !== 1) throw new Error('row calls not found verbatim');
source = source.split(fromRows).join(toRows);

const fromZh = "      'settings.leading': '哪一组排在前面',";
const toZh = "      'settings.workspaceCard': '工作区如何展示',\n      'settings.leading': '哪一组排在前面',";
if (source.split(fromZh).length - 1 !== 1) throw new Error('zh leading key not found');
source = source.split(fromZh).join(toZh);

const fromEn = "      'settings.leading': 'Which group comes first',";
const toEn = "      'settings.workspaceCard': 'How workspaces appear',\n      'settings.leading': 'Which group comes first',";
if (source.split(fromEn).length - 1 !== 1) throw new Error('en leading key not found');
source = source.split(fromEn).join(toEn);

const fromCss = "      '.pp-set-card .pp-set-hint{padding-left:0;margin:2px 0 8px}' +";
const toCss = "      '.pp-set-card .pp-set-hint{padding-left:0;margin:2px 0 8px}' +\n      '.pp-set-item + .pp-set-item{margin-top:8px}' +";
if (source.split(fromCss).length - 1 !== 1) throw new Error('css anchor not found');
source = source.split(fromCss).join(toCss);

fs.writeFileSync(file, source);
console.log('workspace card added');
