// Turns the inline delete confirmation into a modal scoped to the plugin surface.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'plugin', 'client.js');
let source = fs.readFileSync(file, 'utf8');

const fromConfirm = `      '.pp-confirm{display:flex;flex-direction:column;gap:6px;padding:8px 12px;border-bottom:1px solid var(--pp-line);background:var(--pp-surface)}' +
      '.pp-confirm-text{font-size:12px;line-height:1.6;color:var(--pp-ink)}' +`;
const toModal = `      '.pp-modal{position:absolute;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;background:color-mix(in srgb,var(--pp-ink) 22%,transparent)}' +
      '.pp-modal-card{width:100%;max-width:400px;display:flex;flex-direction:column;gap:14px;padding:16px 18px;border:1px solid var(--pp-line);border-radius:12px;background:var(--pp-surface-2);box-shadow:0 18px 48px rgba(0,0,0,.24)}' +
      '.pp-modal-text{font-size:13px;line-height:1.65;color:var(--pp-ink)}' +
      '.pp-modal-actions{display:flex;justify-content:flex-end;gap:8px}' +`;
if (source.split(fromConfirm).length - 1 !== 1) throw new Error('confirm css block not found');
source = source.split(fromConfirm).join(toModal);

const fromPage = "'.pp-page{display:flex;flex-direction:column;height:100%;min-height:0;";
const toPage = "'.pp-page{position:relative;display:flex;flex-direction:column;height:100%;min-height:0;";
if (source.split(fromPage).length - 1 !== 1) throw new Error('page root rule not found');
source = source.split(fromPage).join(toPage);

fs.writeFileSync(file, source);
console.log('modal styles applied');
