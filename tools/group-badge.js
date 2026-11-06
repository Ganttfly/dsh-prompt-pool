// Badge only in the mixed 全部 view, and it names the item's group rather than
// just its kind.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'plugin', 'client.js');
let source = fs.readFileSync(file, 'utf8');

// 1. Helpers.
const helpers = `    /** The group an item belongs to, for the badge shown in the mixed view. */
    function groupLabelOf(item, categories, workspaces) {
      if (item.pinned === true) return translate('kind.pinned');
      const ref = item.categoryId || '';
      if (ref.indexOf('cat:') === 0) {
        const found = (categories || []).find((category) => 'cat:' + category.id === ref);
        return found ? found.name : translate('row.noCategory');
      }
      if (ref.indexOf('ws:') === 0) {
        const found = (workspaces || []).find((workspace) => workspace.id === ref);
        return found ? found.name : '';
      }
      if (item.kind === 'snippet') return translate('kind.snippet');
      if (item.kind === 'skill') return translate('kind.skill');
      return translate('kind.note');
    }

    function clipLabel(text, max) {
      const value = String(text || '');
      const limit = max || 8;
      return value.length > limit ? value.slice(0, limit) + '…' : value;
    }

    /** Tab filter shared by the composer panel and the sidebar page. */`;

const filterAnchor = '    /** Tab filter shared by the composer panel and the sidebar page. */';
if (source.split(filterAnchor).length - 1 !== 1) throw new Error('filter anchor not found');
source = source.split(filterAnchor).join(helpers);

// 2. Badge block in both row renderers.
const fromBadge = `          item.kind === 'snippet'
            ? h('span', { className: 'pp-kind' }, translate('kind.snippet'))
            : item.kind === 'skill'
              ? h('span', { className: 'pp-kind' }, translate('kind.skill'))
              : null,`;

const toBadge = `          tab === 'all'
            ? h('span', { className: 'pp-kind' }, clipLabel(groupLabelOf(item, state.categories, workspaces.items)))
            : null,`;

const badgeCount = source.split(fromBadge).length - 1;
if (badgeCount !== 2) throw new Error(`expected 2 badge blocks, got ${badgeCount}`);
source = source.split(fromBadge).join(toBadge);

fs.writeFileSync(file, source);
console.log('badge rule applied to', badgeCount, 'row renderers');
