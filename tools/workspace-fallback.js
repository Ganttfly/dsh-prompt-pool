// The workspace tab no longer disappears when both toggles are off: it falls
// back to the current workspace alone.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'plugin', 'client.js');
let source = fs.readFileSync(file, 'utf8');

const fromRail = `    function workspaceRail(workspaces, settings, currentWorkspaceId) {
      const flags = normalizeSettings(settings);
      const list = workspaces || [];
      const rail = [];
      if (flags.currentWorkspaceTab && currentWorkspaceId) {
        const current = list.find((workspace) => workspace.workspaceId === currentWorkspaceId);
        if (current) rail.push(current);
      }
      if (flags.workspaceTabs) {
        for (const workspace of list) {
          if (!rail.some((entry) => entry.id === workspace.id)) rail.push(workspace);
        }
      }
      return rail;
    }`;

const toRail = `    function workspaceRail(workspaces, settings, currentWorkspaceId) {
      const flags = normalizeSettings(settings);
      const list = workspaces || [];
      const current = currentWorkspaceId ? list.find((workspace) => workspace.workspaceId === currentWorkspaceId) : undefined;
      // "List every workspace" off: only the current one remains, so the tab survives.
      if (!flags.workspaceTabs) return current ? [current] : list.slice(0, 1);
      // The other toggle only decides whether the current workspace leads the list.
      if (!flags.currentWorkspaceTab || !current) return list.slice();
      return [current, ...list.filter((workspace) => workspace.id !== current.id)];
    }`;

if (source.split(fromRail).length - 1 !== 1) throw new Error('workspaceRail body not found');
source = source.split(fromRail).join(toRail);

const fromShow = `      const showWorkspaceTab = (flags.workspaceTabs || flags.currentWorkspaceTab) && (workspaces || []).length > 0;`;
const toShow = `      const showWorkspaceTab = workspaceRail(workspaces, settings, currentWorkspaceId).length > 0;`;
if (source.split(fromShow).length - 1 !== 1) throw new Error('showWorkspaceTab line not found');
source = source.split(fromShow).join(toShow);

fs.writeFileSync(file, source);
console.log('workspace rail fallback applied');
