// Splits the plugin settings into two sub-tabs: 顺序 / 工作区.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'plugin', 'client.js');
let source = fs.readFileSync(file, 'utf8');

// 1. Local tab state.
const fromState = "      const settings = normalizeSettings(state.settings);";
const toState = "      const settings = normalizeSettings(state.settings);\n      const [section, setSection] = useState('order');";
if (source.split(fromState).length - 1 !== 1) throw new Error('settings state line not found');
source = source.split(fromState).join(toState);

// 2. Sub-tab bar under the description.
const fromDesc = "        h('div', { className: 'pp-hint', style: { marginBottom: '6px' } }, translate('settings.desc')),";
const toDesc = `        h('div', { className: 'pp-hint', style: { marginBottom: '10px' } }, translate('settings.desc')),
        h(
          'div',
          { className: 'pp-bar', style: { padding: '0 0 10px' } },
          h(
            'button',
            {
              type: 'button',
              className: 'pp-tab',
              'data-active': section === 'order' ? 'true' : 'false',
              onClick: () => setSection('order'),
            },
            translate('settings.tab.order'),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'pp-tab',
              'data-active': section === 'workspace' ? 'true' : 'false',
              onClick: () => setSection('workspace'),
            },
            translate('settings.tab.workspace'),
          ),
        ),`;
if (source.split(fromDesc).length - 1 !== 1) throw new Error('settings description line not found');
source = source.split(fromDesc).join(toDesc);

// 3. Show one card at a time.
const cards = [
  ['settings.workspaceCard', 'workspace'],
  ['settings.leading', 'order'],
];
for (const [labelKey, name] of cards) {
  const from = `          { className: 'pp-set-group pp-set-card' },
          h('div', { className: 'pp-set-label' }, translate('${labelKey}')),`;
  const to = `          { className: 'pp-set-group pp-set-card', style: { display: section === '${name}' ? '' : 'none' } },
          h('div', { className: 'pp-set-label' }, translate('${labelKey}')),`;
  if (source.split(from).length - 1 !== 1) throw new Error(`card ${labelKey} not found`);
  source = source.split(from).join(to);
}

// 4. Strings.
const fromZh = "      'settings.workspaceCard': '工作区如何展示',";
const toZh = "      'settings.tab.order': '顺序',\n      'settings.tab.workspace': '工作区',\n      'settings.workspaceCard': '工作区如何展示',";
if (source.split(fromZh).length - 1 !== 1) throw new Error('zh workspaceCard key not found');
source = source.split(fromZh).join(toZh);

const fromEn = "      'settings.workspaceCard': 'How workspaces appear',";
const toEn = "      'settings.tab.order': 'Order',\n      'settings.tab.workspace': 'Workspaces',\n      'settings.workspaceCard': 'How workspaces appear',";
if (source.split(fromEn).length - 1 !== 1) throw new Error('en workspaceCard key not found');
source = source.split(fromEn).join(toEn);

fs.writeFileSync(file, source);
console.log('settings split into two sub-tabs');
