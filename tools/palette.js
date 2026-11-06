// One-shot: replace the composite accent fill with the palette variable and
// prepend the plugin's colour-token block to the CSS constant.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'plugin', 'client.js');
let source = fs.readFileSync(file, 'utf8');

const soft = 'color-mix(in srgb, var(--pp-accent) 14%, transparent)';
const softCount = source.split(soft).length - 1;
source = source.split(soft).join('var(--pp-accent-soft)');

const anchor = '    const CSS =\n';
if (!source.includes(anchor)) throw new Error('CSS anchor not found');

const palette = [
  '.pp-panel,.pp-page,.pp-settings{',
  '--pp-accent:var(--dsw-alias-brand-primary);',
  '--pp-accent-soft:color-mix(in srgb,var(--dsw-alias-brand-primary) 13%,transparent);',
  '--pp-accent-line:color-mix(in srgb,var(--dsw-alias-brand-primary) 55%,transparent);',
  '--pp-ink:var(--dsw-alias-label-primary);',
  '--pp-ink-2:var(--dsw-alias-label-secondary);',
  '--pp-line:var(--dsw-alias-border-l1);',
  '--pp-line-2:var(--dsw-alias-border-l2);',
  '--pp-surface:var(--dsw-alias-bg-layer-1);',
  '--pp-surface-2:var(--dsw-alias-bg-overlay);',
  '--pp-hover:var(--dsw-alias-interactive-bg-hover,var(--dsw-alias-bg-layer-2));',
  '--pp-danger:var(--dsw-alias-state-error-primary);',
  '--pp-danger-soft:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);',
  '--pp-ok:var(--dsw-alias-state-success-primary);',
  '--pp-on-accent:#ffffff}',
].join('');

const block = anchor + "      '" + palette + "' +\n";
source = source.replace(anchor, block);

fs.writeFileSync(file, source);
console.log('accent-soft replacements:', softCount);
console.log('palette inserted: true');
