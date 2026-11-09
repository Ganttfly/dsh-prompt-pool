window.__ModuleLoader__.load({
  id: 'dsh-prompt-pool',
  factory(require) {
    'use strict';

    const React = require('react');
    const h = React.createElement;
    const { useCallback, useEffect, useMemo, useRef, useState } = React;

    const useSyncExternalStore = React.useSyncExternalStore || function fallback(subscribe, getSnapshot) {
      const [value, setValue] = useState(getSnapshot);
      useEffect(() => {
        setValue(getSnapshot());
        return subscribe(() => setValue(getSnapshot()));
      }, [subscribe, getSnapshot]);
      return value;
    };

    const NS = 'prompt-pool';
    const STORAGE_KEY = 'dsh.prompt-pool.v1';

    // ---------------------------------------------------------------- locale
    const ZH = {
      'button.label': '提示词池',
      'panel.title': '提示词池',
      'panel.close': '关闭',
      'panel.capture': '存下当前草稿',
      'panel.new': '新建',
      'panel.empty': '池子是空的。写一句，然后点「存下当前草稿」。',
      'panel.emptyTab': '这一栏还没有内容。',
      'tab.all': '全部',
      'tab.oftenuse': '常用',
      'tab.workspace': '工作区',
      'tab.currentWorkspace': '当前工作区',
      'ws.none': '没有可用的工作区',
      'ws.empty': '这个工作区还没有条目',
      'tab.note': '便签',
      'tab.template': '模板',
      'tab.add': '新建分组',
      'tab.namePlaceholder': '分组名，回车确认',
      'tab.renameHint': '双击重命名',
      'tab.delete': '删除这个分组（条目会变成未分组）',
      'tab.deleteConfirm': '确定要删除这个分组么？删除后该分组的提示词条目将会放入【未分组】内。',
      'tab.deleteAction': '删除',
      'tab.cancelAction': '取消',
      'group.note': '便签',
      'group.oftenuse': '常用',
      'group.template': '模板',
      'group.untitled': '（未命名）',
      'mention.loading': '正在读取…',
      'mention.empty': '没有匹配项',
      'mention.noSession': '当前没有会话，无法读取技能目录',
      'mention.noSkillService': '读不到技能目录（remote 服务未绑定）',
      'mention.noDirectoryService': '读不到目录服务（uiWorkspace 未绑定）',
      'mention.noSessionService': '读不到会话服务（sessions 未绑定）',
      'mention.sessionClosed': '会话未打开，无法读取技能目录',
      'mention.failed': '读取失败',
      'mention.timeout': '读取超时：宿主没有响应（可能没有活跃会话）',
      'row.insert': '插入到输入框',
      'row.select': '加入待发送队列',
      'row.copy': '复制内容',
      'row.duplicate': '复制一份，追加到池子末尾',
      'page.title': '提示词池',
      'tab.description': '暂存、编辑、编排你的提示词，按住顺序一次性释放',
      'page.count': '共 {n} 条',
      'page.search': '搜索标题或内容…',
      'page.empty': '还没有内容。点右上角「＋ 便签」开始。',
      'page.emptyOftenuse': '还没有常用条目。把条目的「分组」改成「常用」即可。',
      'page.noMatch': '没有匹配的条目。',
      'page.trayReady': '已选 {n} 条 · 去对话释放',
      'page.gotoConversation': '去对话',
      'status.noComposer': '没有可用的输入框：请先打开一个对话页签',
      'status.releaseSent': '已交给输入框，按顺序排队中',
      'status.copied': '已复制',
      'status.copyFailed': '复制失败',
      'status.savedToPool': '已保存',
      'sidebar.label': '提示词池',
      'settings.nav': '提示词池',
      'settings.open': '提示词池设置',
      'settings.button': '设置',
      'settings.tab.order': '分组',
      'settings.display': '分组怎么显示',
      'settings.display.builtin': '内置分组',
      'settings.display.custom': '自定义分组',
      'settings.display.workspace': '工作区',
      'settings.mode.tabs': '展开',
      'settings.mode.nested': '折叠',
      'settings.mode.hidden': '隐藏',
      'settings.tab.workspace': '工作区',
      'settings.tab.display': '展示',
      'settings.customNested': '自定义分组折叠成一个 Tab',
      'settings.customNestedHint': '分组多时打开：Tab 行只保留一个「自定义」，组内用横排胶囊切换。',
      'settings.workspaceCard': '工作区如何展示',
        'settings.workspacesVisible': '显示哪些工作区',
        'settings.workspacesCurrent': '当前',
        'settings.workspacesEmpty': '还没有读到工作区列表。打开一次提示词池页面后，这里会列出全部工作区。',
      'settings.leading': '哪一组排在前面',
      'settings.leading.workspace': '工作区',
      'settings.leading.custom': '自定义分组',
      'settings.leading.builtin': '内置分组',
      'settings.leadingHint': '「全部」始终在最前；这里决定它后面先出现哪一组，另外两组按固定顺序跟随。',
      'settings.reload': '重新加载界面',
      'settings.reloadHint': '插件代码更新后，界面不会自动换新。点这里重新加载（比重启应用快）。',
      'settings.title': '提示词池',
      'settings.desc': '控制提示词池 Tab 的显示方式。改动立即生效。',
      'settings.workspaceTabs': '在工作区 Tab 中列出全部工作区',
      'settings.workspaceTabsHint': '「工作区」Tab 里用横向胶囊切换工作区；关掉后只保留当前工作区。',
      'settings.currentWorkspaceTab': '当前工作区排在最前',
      'settings.currentWorkspaceTabHint': '当前会话所属的工作区固定排第一；其余按原顺序。',
      'settings.label': '提示词池',
      'row.edit': '编辑',
      'row.delete': '删除',
      'row.up': '上移',
      'row.down': '下移',
      'row.save': '保存',
      'row.cancel': '取消',
      'row.titlePlaceholder': '标题（可留空）',
      'row.bodyPlaceholder': '提示词内容',
      'row.familyBuiltin': '内置',
      'row.familyCustom': '自定义',
      'row.familyWorkspace': '工作区',
      'row.categoryLabel': '自定义分组',
      'row.classification': '分组',
      'page.new': '提示词',
      'row.noCategory': '未分组',
      'tray.title': '待发送队列',
      'tray.selected': '已选 {n} 条',
      'tray.release': '发送',
      'tray.clear': '清空',
      'tray.empty': '还没选中任何条目，点左侧「＋」加入',
      'tray.remove': '移出',
      'tray.duplicate': '复制一份，追加到末尾',
      'tray.hint': '释放后会按这个顺序排队，当前这轮结束后自动接着执行。',
      'tray.queue': '队列中 {n}',
      'confirm.title': '将按此顺序排队 {n} 条：',
      'confirm.ok': '确认释放',
      'confirm.cancel': '再想想',
      'status.saved': '已存入池子',
      'status.nothing': '草稿是空的，先写点什么',
      'status.emptyBody': '内容不能是空的',
      'status.inserted': '已插入到输入框',
      'status.insertFailed': '输入框刚被改动，请重试',
      'status.released': '已释放 {n} 条',
      'status.releaseStopped': '已释放 {n} 条，其余 {rest} 条没发出去：输入框繁忙或内容被改动',
      'status.draftBusy': '输入框里还有内容，先清空或存进池子再释放',
      'status.deleted': '已删除「{title}」',
      'status.undo': '撤销',
      'status.releasing': '正在释放 {n} 条…',
    };

    const EN = {
      'button.label': 'Prompt pool',
      'panel.title': 'Prompt pool',
      'panel.close': 'Close',
      'panel.capture': 'Save draft',
      'panel.new': 'New',
      'panel.empty': 'The pool is empty. Write something, then press Save draft.',
      'panel.emptyTab': 'Nothing in this tab yet.',
      'tab.all': 'All',
      'tab.oftenuse': 'Frequent',
      'tab.workspace': 'Workspaces',
      'tab.currentWorkspace': 'Current workspace',
      'ws.none': 'No workspaces available',
      'ws.empty': 'No items in this workspace yet',
      'tab.note': 'Notes',
      'tab.template': 'Templates',
      'tab.add': 'New group',
      'tab.namePlaceholder': 'Group name, Enter to confirm',
      'tab.renameHint': 'Double-click to rename',
      'tab.delete': 'Delete this group (its items become ungrouped)',
      'tab.deleteConfirm': 'Delete this group? Its prompt items will move to Ungrouped.',
      'tab.deleteAction': 'Delete',
      'tab.cancelAction': 'Cancel',
      'group.note': 'Note',
      'group.oftenuse': 'Frequent',
      'group.template': 'Template',
      'group.untitled': '(untitled)',
      'mention.loading': 'Loading…',
      'mention.empty': 'No matches',
      'mention.noSession': 'No active session, so the skill catalog is unavailable',
      'mention.noSkillService': 'Skill catalog unavailable (remote service not bound)',
      'mention.noDirectoryService': 'Directory service unavailable (uiWorkspace not bound)',
      'mention.noSessionService': 'Session service unavailable (sessions not bound)',
      'mention.sessionClosed': 'The session is not open, so the catalog is unavailable',
      'mention.failed': 'Failed to load',
      'mention.timeout': 'Timed out: the host did not answer (no live session?)',
      'row.insert': 'Insert into the composer',
      'row.select': 'Add to the send queue',
      'row.copy': 'Copy the text',
      'row.duplicate': 'Duplicate and append to the pool',
      'page.title': 'Prompt pool',
      'tab.description': 'Stage, edit and arrange prompts, then release them in order',
      'page.count': '{n} items',
      'page.search': 'Search title or text…',
      'page.empty': 'Nothing yet. Use “+ Note” in the top right.',
      'page.emptyOftenuse': 'Nothing here yet. Set an item’s group to Frequent.',
      'page.noMatch': 'No matching item.',
      'page.trayReady': '{n} selected · release in a conversation',
      'page.gotoConversation': 'Open the conversation',
      'status.noComposer': 'No composer available: open a conversation tab first',
      'status.releaseSent': 'Handed to the composer; queuing in order',
      'status.copied': 'Copied',
      'status.copyFailed': 'Copy failed',
      'status.savedToPool': 'Saved',
      'sidebar.label': 'Prompt pool',
      'settings.nav': 'Prompt pool',
      'settings.open': 'Prompt-pool settings',
      'settings.button': 'Settings',
      'settings.tab.order': 'Groups',
      'settings.display': 'How groups show up',
      'settings.display.builtin': 'Built-in groups',
      'settings.display.custom': 'Custom groups',
      'settings.display.workspace': 'Workspaces',
      'settings.mode.tabs': 'Expanded',
      'settings.mode.nested': 'Folded',
      'settings.mode.hidden': 'Hidden',
      'settings.tab.workspace': 'Workspaces',
      'settings.tab.display': 'Display',
      'settings.customNested': 'Fold custom groups into one tab',
      'settings.customNestedHint': 'Useful once you have many groups: one “Custom” tab keeps them as chips inside.',
      'settings.workspaceCard': 'How workspaces appear',
        'settings.workspacesVisible': 'Workspaces to show',
        'settings.workspacesCurrent': 'current',
        'settings.workspacesEmpty': 'No workspace roster yet. Open the prompt pool page once and every workspace will be listed here.',
      'settings.leading': 'Which group comes first',
      'settings.leading.workspace': 'Workspaces',
      'settings.leading.custom': 'Custom groups',
      'settings.leading.builtin': 'Built-in groups',
      'settings.leadingHint': '"All" always leads; this picks which group follows it, the other two keep their fixed order.',
      'settings.reload': 'Reload the UI',
      'settings.reloadHint': 'A plugin code change does not swap the running UI. Use this instead of restarting the app.',
      'settings.title': 'Prompt pool',
      'settings.desc': 'Controls how the prompt-pool tabs appear. Changes apply immediately.',
      'settings.workspaceTabs': 'List every workspace in the Workspaces tab',
      'settings.workspaceTabsHint': 'The Workspaces tab switches workspaces with horizontal chips; off keeps only the current workspace.',
      'settings.currentWorkspaceTab': 'Put the current workspace first',
      'settings.currentWorkspaceTabHint': 'The workspace owning this session stays first; the rest keep their order.',
      'settings.label': 'Prompt pool',
      'row.edit': 'Edit',
      'row.delete': 'Delete',
      'row.up': 'Move up',
      'row.down': 'Move down',
      'row.save': 'Save',
      'row.cancel': 'Cancel',
      'row.titlePlaceholder': 'Title (optional)',
      'row.bodyPlaceholder': 'Prompt text',
      'row.familyBuiltin': 'Built-in',
      'row.familyCustom': 'Custom',
      'row.familyWorkspace': 'Workspaces',
      'row.categoryLabel': 'Custom',
      'row.classification': 'Group',
      'page.new': 'Prompt',
      'row.noCategory': 'Ungrouped',
      'tray.title': 'Send queue',
      'tray.selected': '{n} selected',
      'tray.release': 'Send',
      'tray.clear': 'Clear',
      'tray.empty': 'Nothing selected yet — use the ＋ control on a row',
      'tray.remove': 'Remove',
      'tray.duplicate': 'Duplicate and append to the end',
      'tray.hint': 'Released items queue up in this order and run as soon as the current turn ends.',
      'tray.queue': '{n} in queue',
      'confirm.title': 'Queue {n} in this order:',
      'confirm.ok': 'Queue them',
      'confirm.cancel': 'Not yet',
      'status.saved': 'Saved to the pool',
      'status.nothing': 'The composer is empty',
      'status.emptyBody': 'The content cannot be empty',
      'status.inserted': 'Inserted into the composer',
      'status.insertFailed': 'The composer changed underneath; try again',
      'status.released': 'Released {n}',
      'status.releaseStopped': 'Released {n}; {rest} left because the composer was busy or edited',
      'status.draftBusy': 'The composer still has text. Clear it or save it to the pool first.',
      'status.deleted': 'Deleted this item',
      'status.undo': 'Undo',
      'status.releasing': 'Releasing {n}…',
    };

    let localeCtx = null;
    let translate = (key, params) => interpolate(EN[key] || key, params);

    let pluginCtx = null;
    let remoteFace = null;
    let workspaceFace = null;
    let sessionsFace = null;

    /** Read one service from a context that has it mounted. */
    function serviceOf(target, key) {
      if (!target) return null;
      try {
        const viaGet = typeof target.get === 'function' ? target.get(key) : undefined;
        if (viaGet) return viaGet;
      } catch (_error) {
        /* fall through to the property access */
      }
      return target[key] || null;
    }

    /** Stable identity so the composer's selector hook never re-subscribes. */
    function selectAllInput(snapshot) {
      return snapshot;
    }

    function interpolate(template, params) {
      if (!params) return template;
      return String(template).replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
    }

    function useLocaleTick() {
      const [, force] = useState(0);
      useEffect(() => {
        if (!localeCtx || typeof localeCtx.subscribe !== 'function') return undefined;
        return localeCtx.subscribe(() => force((n) => n + 1));
      }, []);
    }

    // ----------------------------------------------------------------- store
    function createStore(initial) {
      let value = initial;
      const subscribers = new Set();
      return {
        get: () => value,
        set(next) {
          if (next === value) return;
          value = next;
          for (const fn of Array.from(subscribers)) fn();
        },
        subscribe(fn) {
          subscribers.add(fn);
          return () => {
            subscribers.delete(fn);
          };
        },
      };
    }

    function uid() {
      try {
        return crypto.randomUUID();
      } catch (_error) {
        return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      }
    }

    function firstLine(text) {
      const line = String(text).split('\n').map((part) => part.trim()).find(Boolean) || '';
      return line.length > 48 ? line.slice(0, 48) + '…' : line;
    }

    function sanitizeItem(raw) {
      if (!raw || typeof raw !== 'object') return null;
      const body = typeof raw.body === 'string' ? raw.body : '';
      if (!body.trim()) return null;
      const now = Date.now();
      return {
        id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
        group: groupOf(raw),
        title: typeof raw.title === 'string' ? raw.title : '',
        body,
        createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : now,
        updatedAt: Number.isFinite(raw.updatedAt) ? raw.updatedAt : now,
      };
    }

    /** A user-defined tab is one category; `cat:<id>` is its tab key. */
    function normalizeCategory(raw) {
      if (!raw || typeof raw !== 'object') return null;
      const name = typeof raw.name === 'string' ? raw.name.trim() : '';
      if (!name) return null;
      return { id: typeof raw.id === 'string' && raw.id ? raw.id : uid(), name };
    }

    /** Workspace tabs are derived from the live workspace list, never persisted. */
    function workspaceTabId(workspaceId) {
      return 'ws:' + workspaceId;
    }

    /**
     * Canonical group ids. Family is derived from the prefix, never stored:
     *   builtin:oftenuse | builtin:note | builtin:template
     *   custom:<category id>
     *   workspace:<workspace id>
     */
    const BUILTIN_GROUP = { oftenuse: 'builtin:oftenuse', note: 'builtin:note', template: 'builtin:template' };

    function familyOf(group) {
      const value = String(group || '');
      const cut = value.indexOf(':');
      if (cut <= 0) return '';
      const family = value.slice(0, cut);
      return family === 'builtin' || family === 'custom' || family === 'workspace' ? family : '';
    }


    /** The one read path: item → canonical group id. */
    function groupOf(item) {
      const group = item && typeof item.group === 'string' ? item.group : '';
      return group && familyOf(group) ? group : BUILTIN_GROUP.note;
    }

    /** The one write path: canonical group id → item. */
    function withGroup(item, group) {
      return { ...item, group };
    }

    /** The group a new item gets from the tab that created it. */
    function groupForTab(tab, workspaceGroup) {
      if (tab === 'nested:workspace') return workspaceGroup || BUILTIN_GROUP.note;
      return familyOf(tab) ? tab : BUILTIN_GROUP.note;
    }

    /** Canonical group id → display info, or null when the target is gone. */
    function resolveGroup(group, categories, workspaces) {
      if (group === BUILTIN_GROUP.oftenuse) return { value: group, label: translate('group.oftenuse'), family: 'builtin' };
      if (group === BUILTIN_GROUP.template) return { value: group, label: translate('group.template'), family: 'builtin' };
      if (group === BUILTIN_GROUP.note) return { value: group, label: translate('group.note'), family: 'builtin' };
      const family = familyOf(group);
      if (family === 'custom') {
        const id = group.slice(7);
        const found = (categories || []).find((category) => category.id === id);
        return found ? { value: group, label: found.name, family } : null;
      }
      if (family === 'workspace') {
        const id = group.slice(10);
        const found = (workspaces || []).find((workspace) => workspace.workspaceId === id || workspace.id === 'ws:' + id);
        return found ? { value: group, label: found.name, family } : null;
      }
      return null;
    }

    /** The badge label for an item, in the same vocabulary as the editor. */
    function groupLabelOf(item, categories, workspaces) {
      const group = groupOf(item);
      const resolved = resolveGroup(group, categories, workspaces);
      if (resolved) return resolved.label;
      // A stale custom id means the group was deleted; an unresolved workspace is
      // just a view that cannot see the roster yet, so say nothing.
      return familyOf(group) === 'workspace' ? '' : translate('row.noCategory');
    }

    function clipLabel(text, max) {
      const value = String(text || '');
      const limit = max || 8;
      return value.length > limit ? value.slice(0, limit) + '…' : value;
    }

    /** Tab filter shared by the composer panel and the sidebar page. */
    function matchesTab(item, tab) {
      if (tab === 'all') return true;
      const group = groupOf(item);
      if (tab === 'nested:workspace') return familyOf(group) === 'workspace';
      if (tab.indexOf('nested:') === 0) return familyOf(group) === tab.slice(7);
      return group === tab;
    }

    /** Tab actions shared by the composer panel and the sidebar page. */
    function tabHandlers(setTab, currentTab) {
      return {
        onSelect: (id) => setTab(id),
        onAdd: (name) => {
          const created = poolActions.addCategory(name);
          if (!created) return;
          // Folded custom groups share one tab, so aim at that tab instead.
          const folded = normalizeSettings(pool.get().settings).customNested;
          setTab(folded ? 'nested:custom' : 'custom:' + created.id);
        },
        onRename: (id, name) => {
          if (id.indexOf('custom:') === 0) poolActions.renameCategory(id.slice(7), name);
        },
        onDelete: (id) => {
          if (id.indexOf('custom:') !== 0) return;
          poolActions.removeCategory(id.slice(7));
          if (currentTab === id) setTab('all');
        },
      };
    }

    /**
     * The ordered vertical workspace rail: the current workspace first, then
     * the other workspaces when the "all workspaces" preference is on.
     */
    function workspaceRail(workspaces, settings, currentWorkspaceId) {
      const flags = normalizeSettings(settings);
      const all = workspaces || [];
      const hidden = new Set(flags.hiddenWorkspaces);
      const current = currentWorkspaceId ? all.find((workspace) => workspace.workspaceId === currentWorkspaceId) : undefined;
      // The current workspace is never hidden: its items would be unreachable otherwise.
      const visible = all.filter((workspace) => workspace.workspaceId === currentWorkspaceId || !hidden.has(workspace.workspaceId));
      // Everything hidden still shows the current workspace, so the tab never disappears.
      const list = visible.length > 0 ? visible : current ? [current] : all.slice(0, 1);
      if (!flags.currentWorkspaceTab || !current) return list.slice();
      return [current, ...list.filter((workspace) => workspace.id !== current.id)];
    }

    /** Every family's tab block, ordered by the leading-group preference. */
    function buildTabs(categories, workspaces, settings, currentWorkspaceId) {
      const flags = normalizeSettings(settings);
      const rail = workspaceRail(workspaces, settings, currentWorkspaceId);
      const blocks = {
        workspace: displayBlock(
          'workspace',
          rail.map((workspace) => ({ id: 'workspace:' + workspace.workspaceId, label: workspace.name, group: 'workspace' })),
          settings,
        ),
        builtin: displayBlock(
          'builtin',
          [
            { id: BUILTIN_GROUP.oftenuse, label: translate('tab.oftenuse'), group: 'builtin' },
            { id: BUILTIN_GROUP.note, label: translate('tab.note'), group: 'builtin' },
            { id: BUILTIN_GROUP.template, label: translate('tab.template'), group: 'builtin' },
          ],
          settings,
        ),
        custom: displayBlock(
          'custom',
          categories.map((category) => ({ id: 'custom:' + category.id, label: category.name, category: true, group: 'custom' })),
          settings,
        ),
      };
      const rest = ['workspace', 'custom', 'builtin'].filter((name) => name !== flags.leadingGroup);
      return [
        // 全部 always anchors the row; the chosen block leads the rest.
        { id: 'all', label: translate('tab.all'), group: 'all' },
        ...[flags.leadingGroup, ...rest].reduce((list, name) => list.concat(blocks[name]), []),
      ];
    }

    /** Confirmation for deleting one of the user's own tabs, as a modal. */
    function CategoryDeleteConfirm(props) {
      useEffect(() => {
        const onKeyDown = (event) => {
          if (event.key !== 'Escape') return;
          event.preventDefault();
          event.stopPropagation();
          props.onCancel();
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
      }, [props.onCancel]);

      return h(
        'div',
        {
          className: 'pp-modal',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) props.onCancel();
          },
        },
        h(
          'div',
          { className: 'pp-modal-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': translate('tab.delete') },
          h('div', { className: 'pp-modal-text' }, translate('tab.deleteConfirm')),
          h(
            'div',
            { className: 'pp-modal-actions' },
            h('button', { type: 'button', className: 'pp-mini', onClick: props.onCancel }, translate('tab.cancelAction')),
            h('button', { type: 'button', className: 'pp-primary', autoFocus: true, onClick: props.onConfirm }, translate('tab.deleteAction')),
          ),
        ),
      );
    }

    /** The workspace rail, or just its items when there is nothing to switch between. */
    function renderWorkspacePanes(props) {
      const rail = props.rail || [];
      const items = props.items || [];
      const body = h(
        'div',
        { className: 'pp-ws-body' },
        items.length === 0 ? h('div', { className: 'pp-empty' }, props.emptyText) : items.map(props.renderRow),
      );
      if (rail.length === 0) return h('div', { className: 'pp-empty' }, translate('ws.none'));
      // One workspace means nothing to switch: a lone chip reads as a stray label.
      if (rail.length === 1) return h('div', { className: 'pp-ws' }, body);
      return h(
        'div',
        { className: 'pp-ws' },
        h(
          'div',
          { className: 'pp-ws-rail' },
          rail.map((workspace) =>
            h(
              'button',
              {
                key: workspace.id,
                type: 'button',
                className: 'pp-ws-tab',
                'data-active': workspace.id === props.activeId ? 'true' : 'false',
                title: props.editable ? translate('tab.renameHint') : workspace.name,
                onClick: () => props.onSelect(workspace.id),
              },
              h('span', { className: 'pp-ws-name' }, workspace.name),
              h('span', { className: 'pp-ws-count' }, String(props.counts[workspace.id] || 0)),
              props.editable && workspace.id === props.activeId
                ? h(
                    'span',
                    {
                      className: 'pp-tab-x',
                      role: 'button',
                      title: translate('tab.delete'),
                      onClick: (event) => {
                        event.stopPropagation();
                        if (props.onDelete) props.onDelete(workspace.id);
                      },
                    },
                    '×',
                  )
                : null,
            ),
          ),
        ),
        body,
      );
    }

    /**
     * The tray holds composed occurrences: the same item may be queued more
     * than once, and each occurrence carries its own text so editing one never
     * rewrites the saved template.
     */
    function normalizeTrayEntry(raw, byId) {
      if (typeof raw === 'string') {
        const item = byId.get(raw);
        return item ? { key: uid(), itemId: raw, body: item.body } : null;
      }
      if (!raw || typeof raw !== 'object') return null;
      const itemId = typeof raw.itemId === 'string' ? raw.itemId : '';
      const source = byId.get(itemId);
      const body = typeof raw.body === 'string' ? raw.body : source ? source.body : '';
      if (!body.trim()) return null;
      return { key: typeof raw.key === 'string' && raw.key ? raw.key : uid(), itemId, body };
    }

    function normalizePool(data) {
      const categories = Array.isArray(data && data.categories) ? data.categories.map(normalizeCategory).filter(Boolean) : [];
      const customIds = new Set(categories.map((category) => 'custom:' + category.id));
      const items = (Array.isArray(data && data.items) ? data.items.map(sanitizeItem).filter(Boolean) : []).map((item) => {
        if (familyOf(item.group) !== 'custom') return item;
        return customIds.has(item.group) ? item : { ...item, group: BUILTIN_GROUP.note };
      });
      const byId = new Map(items.map((item) => [item.id, item]));
      const rawTray = Array.isArray(data && data.tray) ? data.tray : [];
      const tray = rawTray.map((entry) => normalizeTrayEntry(entry, byId)).filter(Boolean);
      return { version: POOL_VERSION, categories, items, tray, settings: normalizeSettings(data && data.settings), seeded: Boolean(data && data.seeded === true) };
    }

    function emptyPool() {
      return { version: POOL_VERSION, categories: [], items: [], tray: [], settings: normalizeSettings(undefined), seeded: true };
    }

    /**
     * First-run content: five behaviour switches that stay valid as one-liners.
     * They land in the 常用 group and stay ordinary, deletable items.
     */
    const SEED_PROMPTS = [
      ['seed:plan-first', '先给方案', '先列改动清单：要改哪些文件、每处改什么、怎么验证。等我确认后再动手。'],
      ['seed:scope-guard', '不动无关代码', '只改与目标直接相关的行；看到别的问题只记录，不顺手修。'],
      [
        'seed:pre-delivery',
        '交付前自检',
        '交付前给一条最小验证（命令或测试），并回答三件事：最可能出问题的地方、怎么回滚、哪些假设我没验证过。',
      ],
      ['seed:stop-restate', '停下重述', '停一下：重述我的原始要求和当前实际在做的事，指出偏差，再决定继续还是回退。'],
      ['seed:commands', '给命令不给描述', '需要我操作时直接给可粘贴的命令、路径或代码块。'],
    ];

    /** Templates: each one has a hole to fill and a shape the answer must take. */
    const SEED_TEMPLATES = [
      [
        'seed:review',
        '代码审查',
        '审阅 {{贴 diff 或文件}}：先用一句话给结论（能否合入、卡在哪）；再按「阻塞 / 建议 / 可选」分级列问题，每条给行号、触发条件、修法。不要重述代码在做什么。',
      ],
      [
        'seed:options',
        '方案对比',
        '针对 {{决策点}} 给 2–3 个候选方案，用表格对比：改动范围、风险、回滚难度、后续维护成本；最后给推荐项和一句理由。',
      ],
      [
        'seed:acceptance',
        '验收清单',
        '为 {{功能名}} 输出可勾选清单，按「正常路径 / 边界 / 失败恢复」分组；每条写成一个可观察的结果，能被执行或验证。',
      ],
      [
        'seed:changelog',
        '变更说明',
        '按 Keep a Changelog 写 {{版本号}} 的变更说明：动词开头、一条一个变更、修复与新增不混在同一条；破坏性变更单独列一节。',
      ],
      [
        'seed:explain',
        '解释这段代码',
        '解释 {{代码或模块}}：先用一句话说它解决什么问题，再说依赖的关键不变量、最容易踩的坑、以及改动时不能破坏的东西。',
      ],
    ];

    /** A build bumps this and adds one batch; older pools receive only the new batch. */
    /** Bump when the stored item shape changes: older pools are reseeded, not migrated. */
    const POOL_VERSION = 2;

    const SEED_LEVEL = 2;

    function seedItem([id, title, body], group, now) {
      return { id, group, title, body, createdAt: now, updatedAt: now };
    }

    function seedsAbove(level, now) {
      const batches = [
        { level: 1, items: SEED_PROMPTS.map((entry) => seedItem(entry, BUILTIN_GROUP.oftenuse, now)) },
        { level: 2, items: SEED_TEMPLATES.map((entry) => seedItem(entry, BUILTIN_GROUP.template, now)) },
      ];
      return batches.filter((batch) => batch.level > level).reduce((list, batch) => list.concat(batch.items), []);
    }

    function seededPool() {
      return {
        version: POOL_VERSION,
        categories: [],
        items: seedsAbove(0, Date.now()),
        tray: [],
        settings: normalizeSettings(undefined),
        seeded: SEED_LEVEL,
      };
    }

    function seedItems(existing, level) {
      const taken = new Set(existing.map((item) => item.id));
      return seedsAbove(level, Date.now()).filter((item) => !taken.has(item.id));
    }

    function loadPool() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          // Brand-new install only: an existing (even empty) pool is never reseeded.
          const seeded = seededPool();
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
          } catch (_error) {
            /* storage unavailable: keep the in-memory copy only */
          }
          return seeded;
        }
        const parsed = JSON.parse(raw);
        const storedVersion = parsed && typeof parsed.version === 'number' ? parsed.version : 1;
        if (storedVersion < POOL_VERSION) {
          // The shape changed and this build does not migrate: start from the seeds.
          const reset = seededPool();
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
          } catch (_error) {
            /* storage unavailable: keep the in-memory copy only */
          }
          return reset;
        }
        const pool = normalizePool(parsed);
        const level = Number(pool.seeded) || 0;
        if (level >= SEED_LEVEL) return pool;
        const migrated = { ...pool, items: [...pool.items, ...seedItems(pool.items, level)], seeded: SEED_LEVEL };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        } catch (_error) {
          /* storage unavailable: keep the in-memory copy only */
        }
        return migrated;
      } catch (_error) {
        return emptyPool();
      }
    }

    /** One store for every mounted view, including a second module instance and another window. */
    const POOL_SINGLETON = '__dshPromptPoolStoreV1';

    function createPoolStore() {
      const store = createStore(loadPool());
      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('storage', (event) => {
          if (event.key !== STORAGE_KEY || !event.newValue) return;
          try {
            const next = normalizePool(JSON.parse(event.newValue));
            if (JSON.stringify(next) === JSON.stringify(store.get())) return;
            store.set(next);
          } catch (_error) {
            /* another window wrote something unreadable; keep the current pool */
          }
        });
      }
      return store;
    }

    const pool = (() => {
      if (typeof window === 'undefined') return createPoolStore();
      if (!window[POOL_SINGLETON]) window[POOL_SINGLETON] = createPoolStore();
      return window[POOL_SINGLETON];
    })();

    const ui = createStore({ open: false });

    /**
     * Live workspace directory: derived (never persisted) and published by
     * whichever view can read the workspace snapshot, so one tab appears per
     * workspace in both views.
     */
    const workspaceDir = createStore({ items: [] });
    /** The composer panel knows the active session; the sidebar page does not. */
    const sessionDir = createStore({ sessionId: '' });

    function useSessionDir() {
      return useSyncExternalStore(sessionDir.subscribe, sessionDir.get, sessionDir.get);
    }

    function useWorkspaceDir() {
      return useSyncExternalStore(workspaceDir.subscribe, workspaceDir.get, workspaceDir.get);
    }

    function workspaceEntriesOf(snapshot) {
      const list = snapshot && Array.isArray(snapshot.items) ? snapshot.items : [];
      return list
        .map((workspace) => {
          const workspaceId = workspace && typeof workspace.workspaceId === 'string' ? workspace.workspaceId : '';
          if (!workspaceId) return null;
          const path = typeof workspace.path === 'string' ? workspace.path : '';
          const tail = path.split(/[\\/]/).filter(Boolean).pop() || '';
          const name = (typeof workspace.title === 'string' && workspace.title.trim()) || tail || workspaceId;
          const sessionIds = Array.isArray(workspace.sessionIds) ? workspace.sessionIds.filter((id) => typeof id === 'string') : [];
          return { id: workspaceTabId(workspaceId), workspaceId, name, path, sessionIds };
        })
        .filter(Boolean);
    }

    /** The workspace that owns a session, from that workspace's session list. */
    function currentWorkspaceOf(snapshot, sessionId) {
      const list = snapshot && Array.isArray(snapshot.items) ? snapshot.items : [];
      if (!sessionId) return '';
      const owner = list.find((workspace) => workspace && Array.isArray(workspace.sessionIds) && workspace.sessionIds.indexOf(sessionId) >= 0);
      return owner && typeof owner.workspaceId === 'string' ? owner.workspaceId : '';
    }

    function normalizeSettings(raw) {
      const settings = raw && typeof raw === 'object' ? raw : {};
      const leaders = ['workspace', 'custom', 'builtin'];
      const modes = ['tabs', 'nested', 'hidden'];
      const defaults = { builtin: 'tabs', custom: 'tabs', workspace: 'nested' };
      const stored = settings.display && typeof settings.display === 'object' ? settings.display : {};
      const display = {};
      for (const family of ['builtin', 'custom', 'workspace']) {
        const value = stored[family];
        // Legacy: the old customNested flag folded custom groups.
        const legacy = family === 'custom' && settings.customNested === true ? 'nested' : undefined;
        display[family] = modes.indexOf(value) >= 0 ? value : legacy || defaults[family];
        // Built-in groups are the backbone of the pool, so they cannot be hidden.
        if (family === 'builtin' && display[family] === 'hidden') display[family] = 'tabs';
      }
      return {
        hiddenWorkspaces: Array.isArray(settings.hiddenWorkspaces)
          ? settings.hiddenWorkspaces.filter((value) => typeof value === 'string' && value !== '')
          : [],
        currentWorkspaceTab: settings.currentWorkspaceTab !== false,
        leadingGroup: leaders.indexOf(settings.leadingGroup) >= 0 ? settings.leadingGroup : 'workspace',
        display,
      };
    }

    /** The three built-in groups, each with its own tab label. */
    function builtinGroups() {
      return [
        { id: BUILTIN_GROUP.oftenuse, name: translate('tab.oftenuse') },
        { id: BUILTIN_GROUP.note, name: translate('tab.note') },
        { id: BUILTIN_GROUP.template, name: translate('tab.template') },
      ];
    }

    /** One family's tab block: hidden / one folded tab / one tab per group. */
    function displayBlock(family, groups, settings) {
      const mode = normalizeSettings(settings).display[family];
      if (mode === 'hidden' || groups.length === 0) return [];
      if (mode === 'nested') {
        const labels = {
          builtin: translate('row.familyBuiltin'),
          custom: translate('row.familyCustom'),
          workspace: translate('tab.workspace'),
        };
        return [{ id: 'nested:' + family, label: labels[family], group: family }];
      }
      return groups;
    }

    /**
     * The composer panel is the only view holding `inputActions`, so the
     * sidebar tab posts commands to it instead of duplicating the write path.
     */
    const BRIDGE_SINGLETON = '__dshPromptPoolBridgeV1';

    const bridge = (() => {
      const create = () => {
        let handler = null;
        return {
          listen(fn) {
            handler = fn;
            return () => {
              if (handler === fn) handler = null;
            };
          },
          request(command) {
            if (!handler) return { ok: false, reason: 'unavailable' };
            try {
              return handler(command) || { ok: true };
            } catch (error) {
              return { ok: false, reason: String((error && error.message) || error) };
            }
          },
        };
      };
      if (typeof window === 'undefined') return create();
      if (!window[BRIDGE_SINGLETON]) window[BRIDGE_SINGLETON] = create();
      return window[BRIDGE_SINGLETON];
    })();

    function persist(next) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (_error) {
        /* storage unavailable: keep the session copy only */
      }
    }

    function mutate(fn) {
      const prev = pool.get();
      const next = fn(prev);
      if (!next || next === prev) return;
      pool.set(next);
      persist(next);
    }

    const poolActions = {
      add(item) {
        mutate((state) => ({ ...state, items: [...state.items, item] }));
        return item;
      },
      /** Copy one pool item (current text) and append the copy last. */      duplicateItem(id) {
        mutate((state) => {
          const found = state.items.find((item) => item.id === id);
          if (!found) return null;
          const now = Date.now();
          const copy = { ...found, id: uid(), createdAt: now, updatedAt: now };
          return { ...state, items: [...state.items, copy] };
        });
      },
      patch(id, fields) {
        mutate((state) => ({
          ...state,
          items: state.items.map((item) => (item.id === id ? { ...item, ...fields, updatedAt: Date.now() } : item)),
        }));
      },

      addCategory(name) {
        const clean = String(name || '').trim();
        if (!clean) return null;
        const category = { id: uid(), name: clean };
        mutate((state) => ({ ...state, categories: [...state.categories, category] }));
        return category;
      },
      renameCategory(id, name) {
        const clean = String(name || '').trim();
        if (!clean) return;
        mutate((state) => ({
          ...state,
          categories: state.categories.map((category) => (category.id === id ? { ...category, name: clean } : category)),
        }));
      },
      /** Deleting a category keeps its items; they simply become uncategorized. */
      removeCategory(id) {
        mutate((state) => ({
          ...state,
          categories: state.categories.filter((category) => category.id !== id),
          items: state.items.map((item) => (item.group === 'custom:' + id ? { ...item, group: BUILTIN_GROUP.note } : item)),
        }));
      },

      setSetting(key, value) {
        mutate((state) => ({ ...state, settings: { ...normalizeSettings(state.settings), [key]: value } }));
      },
      remove(id) {
        mutate((state) => ({ ...state, items: state.items.filter((item) => item.id !== id) }));
      },
      restore(item, index) {
        mutate((state) => {
          const items = state.items.slice();
          items.splice(Math.max(0, Math.min(index, items.length)), 0, item);
          return { ...state, items };
        });
      },
      move(id, delta) {
        mutate((state) => {
          const at = state.items.findIndex((item) => item.id === id);
          const to = at + delta;
          if (at < 0 || to < 0 || to >= state.items.length) return null;
          const items = state.items.slice();
          const moved = items.splice(at, 1)[0];
          items.splice(to, 0, moved);
          return { ...state, items };
        });
      },
      addToTray(itemId) {
        mutate((state) => {
          const item = state.items.find((candidate) => candidate.id === itemId);
          if (!item) return null;
          return { ...state, tray: [...state.tray, { key: uid(), itemId, body: item.body }] };
        });
      },
      patchTray(key, fields) {
        mutate((state) => {
          if (!state.tray.some((entry) => entry.key === key)) return null;
          return { ...state, tray: state.tray.map((entry) => (entry.key === key ? { ...entry, ...fields } : entry)) };
        });
      },
      removeTray(key) {
        mutate((state) => (state.tray.some((entry) => entry.key === key) ? { ...state, tray: state.tray.filter((entry) => entry.key !== key) } : null));
      },
      /** Copy one occurrence (its current text) and append the copy last. */
      duplicateTray(key) {
        mutate((state) => {
          const found = state.tray.find((entry) => entry.key === key);
          if (!found) return null;
          return { ...state, tray: [...state.tray, { ...found, key: uid() }] };
        });
      },
      moveTray(key, delta) {
        mutate((state) => {
          const at = state.tray.findIndex((entry) => entry.key === key);
          const to = at + delta;
          if (at < 0 || to < 0 || to >= state.tray.length) return null;
          const tray = state.tray.slice();
          const moved = tray.splice(at, 1)[0];
          tray.splice(to, 0, moved);
          return { ...state, tray };
        });
      },
      setTray(entries) {
        mutate((state) => ({ ...state, tray: entries.slice() }));
      },
      clearTray() {
        mutate((state) => (state.tray.length === 0 ? null : { ...state, tray: [] }));
      },
    };

    function usePoolState() {
      return useSyncExternalStore(pool.subscribe, pool.get, pool.get);
    }

    function useUiState() {
      return useSyncExternalStore(ui.subscribe, ui.get, ui.get);
    }

    // ------------------------------------------------------------------ icons
    function icon(name) {
      const base = {
        width: 15,
        height: 15,
        viewBox: '0 0 12 12',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.4,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
      };
      switch (name) {
        case 'up':
          return h('svg', base, h('path', { d: 'M6 9.5V2.5M3 5.5L6 2.5l3 3' }));
        case 'down':
          return h('svg', base, h('path', { d: 'M6 2.5v7M3 6.5l3 3 3-3' }));
        case 'edit':
          return h('svg', base, h('path', { d: 'M8.2 1.8l2 2L4.4 9.6 1.8 10.2l.6-2.6z' }));
        case 'trash':
          return h('svg', base, h('path', { d: 'M2 3.2h8M4.6 3.2V2h2.8v1.2M3.2 3.2l.5 7h4.6l.5-7' }));
        case 'copy':
          return h('svg', base, h('path', { d: 'M4.4 4.4h4.8a1 1 0 0 1 1 1v4.8M2.8 2.8h4.8a1 1 0 0 1 1 1' }), h('rect', { x: 4.4, y: 4.4, width: 5.4, height: 5.4, rx: 1 }));
        case 'insert':
          return h('svg', base, h('path', { d: 'M1.8 3.4v5.2M2 6h5.2M5.4 3.9L7.6 6 5.4 8.1' }), h('path', { d: 'M9.2 2.2h.8v7.6h-.8' }));
        case 'close':
          return h('svg', base, h('path', { d: 'M3 3l6 6M9 3l-6 6' }));
        case 'gear':
          return h(
            'svg',
            {
              width: 12,
              height: 12,
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: 'currentColor',
              strokeWidth: 1.9,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              'aria-hidden': true,
            },
            h('path', {
              d: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
            }),
            h('circle', { cx: 12, cy: 12, r: 3 }),
          );
        case 'star':
          return h('svg', base, h('path', { d: 'M6 1.9l1.24 2.6 2.86.4-2.08 2 .5 2.83L6 8.4l-2.52 1.33.5-2.83-2.08-2 2.86-.4z' }));
        case 'starFill':
          return h('svg', { ...base, fill: 'currentColor' }, h('path', { d: 'M6 1.9l1.24 2.6 2.86.4-2.08 2 .5 2.83L6 8.4l-2.52 1.33.5-2.83-2.08-2 2.86-.4z' }));
        case 'plus':
          return h('svg', base, h('path', { d: 'M6 2.2v7.6M2.2 6h7.6' }));
        case 'pool':
          return h(
            'svg',
            { width: 15, height: 15, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', 'aria-hidden': true },
            h('path', { d: 'M2.6 6.2h10.8M2.6 9.6h10.8M2.6 13h6' }),
            h('path', { d: 'M11.6 2.4v4.4M9.4 4.6h4.4' }),
          );
        default:
          return null;
      }
    }

    function IconButton({ name, label, onClick, disabled, danger, active }) {
      return h(
        'button',
        {
          type: 'button',
          className: 'pp-icon',
          title: label,
          'aria-label': label,
          disabled: disabled === true,
          'data-danger': danger === true ? 'true' : 'false',
          'data-active': active === true ? 'true' : 'false',
          onMouseDown: (event) => event.preventDefault(),
          onClick: (event) => {
            event.stopPropagation();
            if (disabled !== true) onClick();
          },
        },
        icon(name),
      );
    }

    // ----------------------------------------------------------------- button
    function PromptPoolButton() {
      useLocaleTick();
      const state = usePoolState();
      const view = useUiState();
      const label = translate('button.label');
      const count = state.tray.length;
      return h(
        React.Fragment,
        null,
        h('style', { key: 'css' }, CSS),
        h(
          'button',
          {
            key: 'btn',
            type: 'button',
            className: 'pp-btn pp-root',
            'data-pp-trigger': 'true',
            'data-open': view.open ? 'true' : 'false',
            title: label,
            'aria-label': label,
            'aria-haspopup': 'dialog',
            'aria-expanded': view.open ? 'true' : 'false',
            onMouseDown: (event) => event.preventDefault(),
            onClick: () => ui.set({ open: !ui.get().open }),
          },
          icon('pool'),
          count > 0 ? h('span', { className: 'pp-badge' }, String(count)) : null,
        ),
      );
    }

    // ------------------------------------------------------------ sidebar icon
    function PromptPoolIcon(props) {
      const size = typeof props.size === 'number' && props.size > 0 ? props.size : 18;
      const active = props.active === true;
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 20 20',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: active ? 1.7 : 1.5,
          strokeLinecap: 'round',
          'aria-hidden': true,
          style: { display: 'block' },
        },
        h('path', { d: 'M3.4 5.4h13.2M3.4 10h10M3.4 14.6h6.4' }),
      );
    }

    /** Round "add one occurrence" control; the same item may be added repeatedly. */
    function TrayAdd(props) {
      const label = props.label || '';
      return h(
        'button',
        {
          type: 'button',
          className: 'pp-toggle',
          title: label,
          'aria-label': label,
          onMouseDown: (event) => event.preventDefault(),
          onClick: (event) => {
            event.stopPropagation();
            props.onClick();
          },
        },
        h(
          'svg',
          { width: 15, height: 15, viewBox: '0 0 14 14', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
          h('circle', { cx: 7, cy: 7, r: 5.5 }),
          h('path', { d: 'M7 4.4v5.2M4.4 7h5.2' }),
        ),
      );
    }

    /** Fixed tabs plus the user's category tabs, grouped, with inline add / rename / delete. */
    function TabBar(props) {
      const [adding, setAdding] = useState(null);
      const [renaming, setRenaming] = useState(null);
      const tabs = props.tabs || [];

      const commitAdd = () => {
        const name = (adding || '').trim();
        setAdding(null);
        if (name) props.onAdd(name);
      };

      const commitRename = () => {
        const target = renaming;
        setRenaming(null);
        if (!target) return;
        const name = target.name.trim();
        if (name && name !== target.original) props.onRename(target.id, name);
      };

      const renderTab = (tab) => {
        if (renaming && renaming.id === tab.id) {
          return h('input', {
            key: tab.id,
            className: 'pp-tab-input',
            autoFocus: true,
            value: renaming.name,
            onChange: (event) => setRenaming({ ...renaming, name: event.target.value }),
            onBlur: commitRename,
            onKeyDown: (event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitRename();
              } else if (event.key === 'Escape') {
                event.preventDefault();
                setRenaming(null);
              }
            },
          });
        }
        const active = props.active === tab.id;
        return h(
          'button',
          {
            key: tab.id,
            type: 'button',
            className: 'pp-tab',
            'data-active': active ? 'true' : 'false',
            title: tab.category ? translate('tab.renameHint') : undefined,
            onClick: () => props.onSelect(tab.id),
            onDoubleClick: tab.category ? () => setRenaming({ id: tab.id, name: tab.label, original: tab.label }) : undefined,
          },
          tab.label,
          tab.category && active
            ? h(
                'span',
                {
                  className: 'pp-tab-x',
                  role: 'button',
                  title: translate('tab.delete'),
                  onClick: (event) => {
                    event.stopPropagation();
                    props.onDelete(tab.id);
                  },
                },
                '×',
              )
            : null,
        );
      };

      const renderAdd = () =>
        adding !== null
          ? h('input', {
              key: 'adding',
              className: 'pp-tab-input',
              autoFocus: true,
              placeholder: translate('tab.namePlaceholder'),
              value: adding,
              onChange: (event) => setAdding(event.target.value),
              onBlur: commitAdd,
              onKeyDown: (event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitAdd();
                } else if (event.key === 'Escape') {
                  event.preventDefault();
                  setAdding(null);
                }
              },
            })
          : h(
              'button',
              {
                key: 'add-category',
                type: 'button',
                className: 'pp-tab pp-tab-add',
                title: translate('tab.add'),
                onClick: () => setAdding(''),
              },
              '＋',
            );

      // Three blocks: custom categories, built-in views, then workspaces.
      const nodes = [];
      let previousGroup = null;
      let addPlaced = false;
      tabs.forEach((tab, index) => {
        if (previousGroup !== null && tab.group !== previousGroup) {
          nodes.push(h('span', { key: 'sep-' + index, className: 'pp-tab-sep' }));
        }
        previousGroup = tab.group;
        nodes.push(renderTab(tab));
        const next = tabs[index + 1];
        if (!addPlaced && tab.group === 'custom' && (!next || next.group !== 'custom')) {
          addPlaced = true;
          nodes.push(h('span', { key: 'add-custom', className: 'pp-tab-addwrap' }, renderAdd()));
        }
      });
      if (!addPlaced) nodes.push(h('span', { key: 'add-custom', className: 'pp-tab-addwrap' }, renderAdd()));
      return h(React.Fragment, null, nodes);
    }

    /** Settings entry that reads like the host's own footer row: gear + label. */
    function SettingsButton(props) {
      return h(
        'button',
        {
          type: 'button',
          className: 'pp-mini pp-set-btn',
          'data-active': props.active === true ? 'true' : 'false',
          title: translate('settings.open'),
          onClick: props.onClick,
        },
        h('span', { className: 'pp-set-btn-icon' }, icon('gear')),
        translate('settings.button'),
      );
    }

    // ------------------------------------------------------------- full page
    function PromptPoolPage(props) {
      useLocaleTick();
      const state = usePoolState();
      const workspaces = useWorkspaceDir();
      const sessionHint = useSessionDir().sessionId;
      // No panel mounted, so no published session: borrow one from this workspace.
      const workspaceSession = (() => {
        const list = workspaces && Array.isArray(workspaces.items) ? workspaces.items : [];
        const current = list.find((entry) => entry.workspaceId === (workspaces && workspaces.currentId));
        const pool = current && Array.isArray(current.sessionIds) ? current.sessionIds : [];
        return pool.length > 0 ? pool[pool.length - 1] : '';
      })();
      const [tab, setTab] = useState('all');
      const [query, setQuery] = useState('');
      const [editing, setEditing] = useState(null);
      const [trayEditing, setTrayEditing] = useState(null);
      const [settingsOpen, setSettingsOpen] = useState(false);
      const [pendingCategory, setPendingCategory] = useState(null);
      const [wsSelected, setWsSelected] = useState('');
      const [customPick, setCustomPick] = useState('');
      const [builtinPick, setBuiltinPick] = useState('');
      const [status, setStatus] = useState(null);
      const statusTimer = useRef(0);
      const flash = useCallback((next) => {
        setStatus(next);
        window.clearTimeout(statusTimer.current);
        statusTimer.current = window.setTimeout(() => setStatus(null), 5000);
      }, []);
      useEffect(() => () => window.clearTimeout(statusTimer.current), []);

      const confirmCategoryDelete = () => {
        const target = pendingCategory;
        setPendingCategory(null);
        if (!target || target.indexOf('custom:') !== 0) return;
        poolActions.removeCategory(target.slice(7));
        if (tab === target) setTab('all');
      };

      const rail = workspaceRail(workspaces.items, state.settings, workspaces.currentId);
      const wsActive = rail.some((entry) => entry.id === wsSelected) ? wsSelected : rail.length > 0 ? rail[0].id : '';
      const wsCounts = useMemo(() => {
        const counts = {};
        for (const item of state.items) {
          const group = groupOf(item);
          if (familyOf(group) === 'workspace') {
            const key = 'ws:' + group.slice(10);
            counts[key] = (counts[key] || 0) + 1;
          }
        }
        return counts;
      }, [state.items]);

      const items = useMemo(() => {
        if (tab === 'nested:workspace') {
          const needle = query.trim().toLowerCase();
          return state.items.filter((item) => {
            if (groupOf(item) !== (wsActive ? 'workspace:' + wsActive.slice(3) : '')) return false;
            if (!needle) return true;
            return (item.title + '\n' + item.body).toLowerCase().indexOf(needle) >= 0;
          });
        }
        const needle = query.trim().toLowerCase();
        return state.items.filter((item) => {
          if (!matchesTab(item, tab)) return false;
          if (!needle) return true;
          return (item.title + '\n' + item.body).toLowerCase().indexOf(needle) >= 0;
        });
      }, [state.items, tab, query, wsActive]);

      const goConversation = () => {
        try {
          if (pluginCtx && pluginCtx.layout && typeof pluginCtx.layout.selectPanel === 'function') {
            pluginCtx.layout.selectPanel('conversation');
          }
        } catch (_error) {
          /* the conversation panel may be absent in a custom shell */
        }
      };

      const saveTrayEdit = () => {
        if (!trayEditing) return;
        if (!trayEditing.body.trim()) {
          flash({ kind: 'error', text: translate('status.emptyBody') });
          return;
        }
        poolActions.patchTray(trayEditing.key, { body: trayEditing.body });
        setTrayEditing(null);
      };

      const sendToComposer = (command, okText) => {
        const result = bridge.request(command);
        if (result && result.ok) {
          flash({ kind: 'ok', text: okText });
          return;
        }
        const reason = result && result.reason;
        flash({
          kind: 'error',
          text: reason === 'draft-busy' ? translate('status.draftBusy') : translate('status.noComposer'),
        });
      };

      const save = () => {
        if (!editing) return;
        if (!editing.body.trim()) {
          flash({ kind: 'error', text: translate('status.emptyBody') });
          return;
        }
        poolActions.patch(editing.id, {
          group: editing.group,
          title: editing.title.trim(),
          body: editing.body,
        });
        setEditing(null);
        flash({ kind: 'ok', text: translate('status.savedToPool') });
      };

      /** One entry point: the current tab decides the new item's classification. */
      const create = () => {
        const inWorkspace = tab === 'nested:workspace';
        const group = groupForTab(tab, inWorkspace && wsActive ? 'workspace:' + wsActive.slice(3) : '');
        // Group tabs keep their own context; the neutral views land on the new item's group.
        if (!inWorkspace && !familyOf(tab)) setTab(group);
        setQuery('');
        const item = poolActions.add({
          id: uid(),
          group,
          title: '',
          body: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        setEditing({ id: item.id, group, title: '', body: '' });
      };

      const rowOf = (item, index) => {
        if (editing && editing.id === item.id) {
          return h(
            'div',
            { key: item.id, className: 'pp-edit', style: { margin: '6px 0' } },
            h('input', {
              className: 'pp-input',
              value: editing.title,
              placeholder: translate('row.titlePlaceholder'),
              onChange: (event) => setEditing({ ...editing, title: event.target.value }),
            }),
            h(MentionField, {
              value: editing.body,
              placeholder: translate('row.bodyPlaceholder'),
              rows: 5,
              autoFocus: true,
              sessionId: (props && props.sessionId) || sessionHint || workspaceSession || '',
              onChange: (event) => setEditing({ ...editing, body: event.target.value }),
              onKeyDown: (event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault();
                  save();
                }
              },
            }),
            h(
              'div',
              { className: 'pp-edit-actions' },
              h(
                'select',
                {
                  className: 'pp-input',
                  style: { width: 'auto', maxWidth: '220px' },
                  value: groupOf(editing),
                  'aria-label': translate('row.classification'),
                  onChange: (event) => setEditing(withGroup(editing, event.target.value)),
                },
                h(
                  'optgroup',
                  { label: translate('row.familyBuiltin') },
                  h('option', { value: BUILTIN_GROUP.oftenuse }, translate('group.oftenuse')),
                  h('option', { value: BUILTIN_GROUP.note }, translate('group.note')),
                  h('option', { value: BUILTIN_GROUP.template }, translate('group.template')),
                ),
                workspaces.items.length > 0
                  ? h(
                      'optgroup',
                      { label: translate('row.familyWorkspace') },
                      workspaces.items.map((workspace) => h('option', { key: workspace.id, value: 'workspace:' + workspace.workspaceId }, workspace.name)),
                    )
                  : null,
                state.categories.length > 0
                  ? h(
                      'optgroup',
                      { label: translate('row.familyCustom') },
                      state.categories.map((category) => h('option', { key: category.id, value: 'custom:' + category.id }, category.name)),
                    )
                  : null,
              ),
              h('span', { className: 'pp-grow' }),
              h('button', { type: 'button', className: 'pp-mini', onClick: () => setEditing(null) }, translate('row.cancel')),
              h('button', { type: 'button', className: 'pp-primary', onClick: save }, translate('row.save')),
            ),
          );
        }
        return h(
          'div',
          { key: item.id, className: 'pp-row pp-page-item' },
          h(IconButton, { name: 'insert', label: translate('row.insert'), onClick: () => sendToComposer({ type: 'insert', text: item.body }, translate('status.inserted')) }),
          h(TrayAdd, { label: translate('row.select'), onClick: () => poolActions.addToTray(item.id) }),
          h(
            'div',
            { className: 'pp-main', onClick: () => setEditing({ id: item.id, group: groupOf(item), title: item.title, body: item.body }) },
            h('div', { className: 'pp-title' }, item.title || item.body.split('\n')[0] || translate('group.untitled')),
            item.body.trim() === (item.title || '').trim() ? null : h('div', { className: 'pp-body' }, item.body),
          ),
          tab === 'all'
            ? h('span', { className: 'pp-tag' }, clipLabel(groupLabelOf(item, state.categories, workspaces.items)))
            : null,
          h(
            'div',
            { className: 'pp-actions' },
            h(IconButton, { name: 'up', label: translate('row.up'), disabled: index === 0, onClick: () => poolActions.move(item.id, -1) }),
            h(IconButton, {
              name: 'down',
              label: translate('row.down'),
              disabled: index === items.length - 1,
              onClick: () => poolActions.move(item.id, 1),
            }),
            h(IconButton, { name: 'edit', label: translate('row.edit'), onClick: () => setEditing({ id: item.id, group: groupOf(item), title: item.title, body: item.body }) }),
            h(IconButton, { name: 'copy', label: translate('row.duplicate'), onClick: () => poolActions.duplicateItem(item.id) }),
            h(IconButton, { name: 'trash', label: translate('row.delete'), danger: true, onClick: () => poolActions.remove(item.id) }),
          ),
        );
      };

      // A folded family renders its groups as chips inside one tab.
      const customGroups = state.categories.map((category) => ({ id: 'custom:' + category.id, name: category.name }));
      const customActive = customGroups.some((entry) => entry.id === customPick)
        ? customPick
        : customGroups.length > 0
          ? customGroups[0].id
          : '';
      const customCounts = {};
      for (const item of state.items) {
        const group = groupOf(item);
        if (familyOf(group) === 'custom') customCounts[group] = (customCounts[group] || 0) + 1;
      }
      const builtinList = builtinGroups();
      const builtinActive = builtinList.some((entry) => entry.id === builtinPick) ? builtinPick : builtinList[0].id;
      const nestedView =
        tab === 'nested:workspace'
          ? {
              rail: rail,
              activeId: wsActive,
              onSelect: setWsSelected,
              counts: wsCounts,
              emptyText: translate('ws.empty'),
              scoped: state.items.filter((item) => groupOf(item) === (wsActive ? 'workspace:' + wsActive.slice(3) : '')),
            }
          : tab === 'nested:custom'
            ? {
                rail: customGroups,
                activeId: customActive,
                onSelect: setCustomPick,
                counts: customCounts,
                editable: true,
                onDelete: (id) => setPendingCategory(id),
                emptyText: translate('panel.emptyTab'),
                scoped: state.items.filter((item) => groupOf(item) === customActive),
              }
            : tab === 'nested:builtin'
              ? {
                  rail: builtinList,
                  activeId: builtinActive,
                  onSelect: setBuiltinPick,
                  counts: {},
                  emptyText: translate('panel.emptyTab'),
                  scoped: state.items.filter((item) => groupOf(item) === builtinActive),
                }
              : null;

      return h(
        'div',
        { className: 'pp-page' },
        h('style', null, CSS),
        h(
          'div',
          { className: 'pp-page-head' },
          h('span', { className: 'pp-page-title' }, translate('page.title')),
          h('span', { className: 'pp-page-sub' }, translate('page.count', { n: state.items.length })),
          h('span', { className: 'pp-grow' }),
          h('input', {
            className: 'pp-search',
            value: query,
            placeholder: translate('page.search'),
            onChange: (event) => setQuery(event.target.value),
          }),
          h('button', { type: 'button', className: 'pp-mini', onClick: create }, '＋ ', translate('page.new')),
          h(SettingsButton, { active: settingsOpen, onClick: () => setSettingsOpen(!settingsOpen) }),
        ),
        h(
          'div',
          { className: 'pp-bar', style: { padding: '8px 12px 2px' } },
          h(TabBar, {
            tabs: buildTabs(state.categories, workspaces.items, state.settings, workspaces.currentId),
            active: tab,
            ...tabHandlers((next) => {
              setSettingsOpen(false);
              setTab(next);
            }, tab),
            onDelete: (id) => setPendingCategory(id),
          }),
        ),
        pendingCategory ? h(CategoryDeleteConfirm, { onConfirm: confirmCategoryDelete, onCancel: () => setPendingCategory(null) }) : null,
        h(
          'div',
          { className: 'pp-page-body' },
          settingsOpen
            ? h(PromptPoolSettings, null)
            : nestedView
              ? renderWorkspacePanes({
                  rail: nestedView.rail,
                  items: nestedView.scoped,
                  activeId: nestedView.activeId,
                  onSelect: nestedView.onSelect,
                  counts: nestedView.counts,
                  editable: nestedView.editable,
                  onDelete: nestedView.onDelete,
                  renderRow: rowOf,
                  emptyText: nestedView.emptyText,
                })
              : items.length === 0
                ? h(
                    'div',
                    { className: 'pp-empty' },
                    translate(
                      state.items.length === 0
                        ? 'page.empty'
                        : tab === BUILTIN_GROUP.oftenuse && !state.items.some((item) => groupOf(item) === BUILTIN_GROUP.oftenuse)
                          ? 'page.emptyOftenuse'
                          : 'page.noMatch',
                    ),
                  )
                : items.map(rowOf),
        ),
        h(
          'div',
          { className: 'pp-page-foot' },
          h(
            'div',
            { className: 'pp-foot-head' },
            h('span', { className: 'pp-foot-title' }, translate('tray.title')),
            h('span', { className: 'pp-hint' }, translate('tray.selected', { n: state.tray.length })),
            h('span', { className: 'pp-grow' }),
            state.tray.length > 0
              ? h('button', { type: 'button', className: 'pp-link', onClick: () => poolActions.clearTray() }, translate('tray.clear'))
              : null,
            state.tray.length > 0
              ? h(
                  'button',
                  { type: 'button', className: 'pp-primary', onClick: () => sendToComposer({ type: 'release' }, translate('status.releaseSent')) },
                  translate('tray.release'),
                )
              : null,
          ),
          state.tray.length === 0
            ? h('div', { className: 'pp-hint' }, translate('tray.empty'))
            : h(
                'div',
                { className: 'pp-tray' },
                state.tray.map((entry, index) => {
                  if (trayEditing && trayEditing.key === entry.key) {
                    return h(
                      'div',
                      { key: entry.key, className: 'pp-edit', style: { margin: '4px 0' } },
                      h('textarea', {
                        className: 'pp-textarea',
                        value: trayEditing.body,
                        placeholder: translate('row.bodyPlaceholder'),
                        rows: 4,
                        autoFocus: true,
                        onChange: (event) => setTrayEditing({ ...trayEditing, body: event.target.value }),
                        onKeyDown: (event) => {
                          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                            event.preventDefault();
                            saveTrayEdit();
                          }
                        },
                      }),
                      h(
                        'div',
                        { className: 'pp-edit-actions' },
                        h('button', { type: 'button', className: 'pp-mini', onClick: () => setTrayEditing(null) }, translate('row.cancel')),
                        h('button', { type: 'button', className: 'pp-primary', onClick: saveTrayEdit }, translate('row.save')),
                      ),
                    );
                  }
                  return h(
                    'div',
                    { key: entry.key, className: 'pp-chip' },
                    h('span', { className: 'pp-chip-n' }, String(index + 1) + '.'),
                    h('div', { className: 'pp-chip-t' }, entry.body),
                    h(
                      'div',
                      { className: 'pp-chip-actions' },
                      h(IconButton, { name: 'up', label: translate('row.up'), disabled: index === 0, onClick: () => poolActions.moveTray(entry.key, -1) }),
                      h(IconButton, {
                        name: 'down',
                        label: translate('row.down'),
                        disabled: index === state.tray.length - 1,
                        onClick: () => poolActions.moveTray(entry.key, 1),
                      }),
                      h(IconButton, {
                        name: 'edit',
                        label: translate('row.edit'),
                        onClick: () => setTrayEditing({ key: entry.key, body: entry.body || '' }),
                      }),
                      h(IconButton, { name: 'copy', label: translate('tray.duplicate'), onClick: () => poolActions.duplicateTray(entry.key) }),
                      h(IconButton, { name: 'close', label: translate('tray.remove'), onClick: () => poolActions.removeTray(entry.key) }),
                    ),
                  );
                }),
              ),
        ),
        status
          ? h('div', { className: 'pp-status', 'data-kind': status.kind || 'info', style: { padding: '0 12px 10px' } }, h('span', null, status.text))
          : null,
      );
    }

    // --------------------------------------------------------------- settings
    function PromptPoolSettings() {
      useLocaleTick();
      const state = usePoolState();
      const settings = normalizeSettings(state.settings);
      const wsDir = useWorkspaceDir();
      const wsItems = wsDir && Array.isArray(wsDir.items) ? wsDir.items : [];
      const wsCurrentId = wsDir && typeof wsDir.currentId === 'string' ? wsDir.currentId : '';
      const hiddenWorkspaces = settings.hiddenWorkspaces;
      const toggleWorkspace = (workspaceId) => {
        const next = hiddenWorkspaces.indexOf(workspaceId) >= 0
          ? hiddenWorkspaces.filter((value) => value !== workspaceId)
          : [...hiddenWorkspaces, workspaceId];
        poolActions.setSetting('hiddenWorkspaces', next);
      };
      const [section, setSection] = useState('order');
      const check = (key, label, hint) =>
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
        );
      return h(
        'div',
        { className: 'pp-settings' },
        h('style', null, CSS),
        h('div', { className: 'pp-set-title' }, translate('settings.title')),
        h('div', { className: 'pp-hint', style: { marginBottom: '10px' } }, translate('settings.desc'), ' · v0.1.45'),
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
        ),
        h(
          'div',
          { className: 'pp-set-group pp-set-card', style: { display: section === 'workspace' ? '' : 'none' } },
          h('div', { className: 'pp-set-label' }, translate('settings.workspaceCard')),
          check('currentWorkspaceTab', 'settings.currentWorkspaceTab', 'settings.currentWorkspaceTabHint'),
          h('div', { className: 'pp-set-divider' }),
          h('div', { className: 'pp-set-label' }, translate('settings.workspacesVisible')),
          wsItems.length === 0
            ? h('div', { className: 'pp-hint' }, translate('settings.workspacesEmpty'))
            : wsItems.map((workspace) =>
                h(
                  'label',
                  { key: workspace.workspaceId, className: 'pp-set-ws' },
                  h('input', {
                    type: 'checkbox',
                    disabled: workspace.workspaceId === wsCurrentId,
                    checked: workspace.workspaceId === wsCurrentId || hiddenWorkspaces.indexOf(workspace.workspaceId) < 0,
                    onChange: () => toggleWorkspace(workspace.workspaceId),
                  }),
                  h('span', { className: 'pp-set-ws-name' },
                    workspace.name,
                    workspace.workspaceId === wsCurrentId ? h('span', { className: 'pp-set-ws-tag' }, translate('settings.workspacesCurrent')) : null,
                  ),
                  workspace.path ? h('span', { className: 'pp-set-ws-path' }, workspace.path) : null,
                ),
              ),
        ),
        h(
          'div',
          { className: 'pp-set-group pp-set-card', style: { display: section === 'order' ? '' : 'none' } },
          h('div', { className: 'pp-set-label' }, translate('settings.leading')),
          h('div', { className: 'pp-hint pp-set-hint' }, translate('settings.leadingHint')),
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
          h('div', { className: 'pp-set-divider' }),
          h('div', { className: 'pp-set-label' }, translate('settings.display')),
          ['builtin', 'custom', 'workspace'].map((family) =>
            h(
              'div',
              { key: family, className: 'pp-set-line' },
              h('div', { className: 'pp-set-name' }, translate('settings.display.' + family)),
              h(
                'div',
                { className: 'pp-set-modes' },
                (family === 'builtin' ? ['tabs', 'nested'] : ['tabs', 'nested', 'hidden']).map((mode) =>
                  h(
                    'label',
                    { key: mode, className: 'pp-set-inline' },
                    h('input', {
                      type: 'radio',
                      name: 'pp-display-' + family,
                      checked: settings.display[family] === mode,
                      onChange: () => poolActions.setSetting('display', { ...settings.display, [family]: mode }),
                    }),
                    h('span', null, translate('settings.mode.' + mode)),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    }

    // ------------------------------------------------------------- completions
    /** Lazy views of the two data sources; both may mount after this plugin. */
    function completionService(key) {
      if (key === 'remote') return remoteFace || serviceOf(pluginCtx, 'remote');
      if (key === 'uiWorkspace') return workspaceFace || serviceOf(pluginCtx, 'uiWorkspace');
      if (key === 'sessions') return sessionsFace || serviceOf(pluginCtx, 'sessions');
      return null;
    }

    function entriesOfListing(listing) {
      const list = Array.isArray(listing)
        ? listing
        : listing && Array.isArray(listing.entries)
          ? listing.entries
          : listing && Array.isArray(listing.items)
            ? listing.items
            : [];
      return list.map((entry) => {
        if (typeof entry === 'string') return { name: entry, directory: false };
        const target = entry && typeof entry === 'object' ? entry : {};
        const name = typeof target.name === 'string' ? target.name : '';
        const full = typeof target.path === 'string' ? target.path : name;
        return {
          name: name || full,
          directory: target.kind === 'directory' || target.type === 'directory' || target.directory === true,
        };
      });
    }

    /** Textarea with "/" and "@" completion; both insert plain text. */
    function MentionField(props) {
      const [items, setItems] = useState([]);
      const [active, setActive] = useState(0);
      const [token, setToken] = useState(null);
      const [note, setNote] = useState('');
      const field = useRef(null);

      const close = () => {
        setToken(null);
        setItems([]);
        setNote('');
        setActive(0);
      };

      const choose = (entry) => {
        if (!token) return;
        const text = props.value || '';
        const head = text.slice(0, token.start);
        const tail = text.slice(token.end);
        const insert = token.char + entry.name + ' ';
        props.onChange({ target: { value: head + insert + tail } });
        close();
        const caret = head.length + insert.length;
        window.setTimeout(() => {
          const node = field.current;
          if (!node) return;
          node.focus();
          if (typeof node.setSelectionRange === 'function') node.setSelectionRange(caret, caret);
        }, 0);
      };

      const apply = (entries, query) => {
        const matched = entries.filter((entry) => entry.name.toLowerCase().indexOf(query) >= 0).slice(0, 8);
        setItems(matched);
        setNote(matched.length === 0 ? translate('mention.empty') : '');
        setActive(0);
      };

      const sessionTag = () => (props.sessionId ? 'session=' + String(props.sessionId).slice(-8) : 'session 为空');

      const openFor = (value, caret) => {
        const before = String(value || '').slice(0, caret);
        const match = /(?:^|\s)([/@])([^\s/@]*)$/.exec(before);
        if (!match) {
          close();
          return;
        }
        const char = match[1];
        const query = match[2].toLowerCase();
        const lead = match[0].length - match[0].trimStart().length;
        setToken({ char, start: before.length - match[0].length + lead, end: caret, query });
        setNote(translate('mention.loading'));
        if (char === '/') {
          const remote = completionService('remote');
          const skills = remote && remote.skills;
          const sessions = completionService('sessions');
          if (!skills || typeof skills.list !== 'function') {
            setItems([]);
            setNote(translate('mention.noSkillService') + ' · ' + sessionTag());
            return;
          }
          if (!sessions || typeof sessions.using !== 'function') {
            setItems([]);
            setNote(translate('mention.noSessionService') + ' · ' + sessionTag());
            return;
          }
          const sessionId = props.sessionId;
          const abort = new AbortController();
          const timer = window.setTimeout(() => {
            try {
              abort.abort();
            } catch (_error) {
              /* already aborted */
            }
          }, 4000);
          // The catalog is only served inside a retained, open session — the same
          // gate the built-in skills view uses.
          const request = Promise.resolve(
            sessions.using(sessionId, { source: 'promptPool', signal: abort.signal }, async (reference) => {
              const state = reference && reference.binding && reference.binding.session ? reference.binding.session.getSnapshot() : null;
              if (state && state.openState !== 'open') throw new Error(translate('mention.sessionClosed'));
              const result = await skills.list({ sessionId }, abort.signal);
              if (!result || result.ok !== true) {
                const reason = result && result.error ? result.error.message || result.error.code : '';
                throw new Error(reason || translate('mention.failed'));
              }
              return result.value && Array.isArray(result.value.skills) ? result.value.skills : [];
            }),
          );
          request
            .then((list) => {
              window.clearTimeout(timer);
              apply(
                list.map((entry) => ({ name: String(entry.name || ''), hint: String(entry.description || '') })),
                query,
              );
            })
            .catch((error) => {
              window.clearTimeout(timer);
              setItems([]);
              const message = String((error && error.message) || error).slice(0, 90);
              setNote(
                (abort.signal.aborted ? translate('mention.timeout') : translate('mention.failed') + '：' + message) +
                  ' · ' +
                  sessionTag(),
              );
            });
          return;
        }
        const workspace = completionService('uiWorkspace');
        if (!workspace || typeof workspace.listDirectory !== 'function') {
          apply([], query);
          return;
        }
        workspace
          .listDirectory(undefined)
          .then((listing) => {
            apply(entriesOfListing(listing).map((entry) => ({ name: entry.name, hint: entry.directory ? '目录' : '' })), query);
          })
          .catch(() => apply([], query));
      };

      return h(
        'div',
        { className: 'pp-mention' },
        h('textarea', {
          ref: field,
          className: 'pp-textarea',
          value: props.value,
          placeholder: props.placeholder,
          rows: props.rows || 5,
          autoFocus: props.autoFocus === true,
          onChange: (event) => {
            props.onChange(event);
            openFor(event.target.value, event.target.selectionStart || 0);
          },
          onKeyDown: (event) => {
            if (token && items.length > 0) {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActive((active + 1) % items.length);
                return;
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActive((active - 1 + items.length) % items.length);
                return;
              }
              if (event.key === 'Enter' || event.key === 'Tab') {
                event.preventDefault();
                choose(items[active]);
                return;
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                close();
                return;
              }
            }
            if (props.onKeyDown) props.onKeyDown(event);
          },
        }),
        token && (items.length > 0 || note)
          ? h(
              'div',
              { className: 'pp-mention-menu' },
              items.length === 0
                ? h('div', { className: 'pp-mention-note' }, note)
                : items.map((entry, index) =>
                    h(
                      'button',
                      {
                        key: entry.name + index,
                        type: 'button',
                        className: 'pp-mention-item',
                        'data-active': index === active ? 'true' : 'false',
                        onMouseDown: (event) => {
                          event.preventDefault();
                          choose(entry);
                        },
                      },
                      h('span', { className: 'pp-mention-name' }, token.char + entry.name),
                      entry.hint ? h('span', { className: 'pp-mention-hint' }, entry.hint.slice(0, 60)) : null,
                    ),
                  ),
            )
          : null,
      );
    }

    // ------------------------------------------------------------------ panel
    function PromptPoolPanel(props) {
      useLocaleTick();
      const state = usePoolState();
      const view = useUiState();
      const workspaces = useWorkspaceDir();
      const sessionHint = useSessionDir().sessionId;

      // This view can read the workspace roster; publish it for both views.
      const wsSnapshot = typeof props.useWorkspaces === 'function' ? props.useWorkspaces(selectAllInput) : undefined;
      useEffect(() => {
        sessionDir.set({ sessionId: props.sessionId || '' });
      }, [props.sessionId]);
      const wsEntries = workspaceEntriesOf(wsSnapshot);
      const wsCurrent = currentWorkspaceOf(wsSnapshot, props.sessionId);
      const wsSignature = useRef('');
      useEffect(() => {
        const signature = JSON.stringify(wsEntries) + '|' + wsCurrent;
        if (signature === wsSignature.current) return;
        wsSignature.current = signature;
        workspaceDir.set({ items: wsEntries, currentId: wsCurrent });
      }, [wsEntries, wsCurrent]);

      const input = typeof props.useInput === 'function' ? props.useInput(selectAllInput) : undefined;
      const draft = input && typeof input.draft === 'string' ? input.draft : '';
      const phase = input && typeof input.phase === 'string' ? input.phase : 'plain';
      const queue = input && Array.isArray(input.queue) ? input.queue : [];

      const draftRef = useRef('');
      draftRef.current = draft;
      const phaseRef = useRef('plain');
      phaseRef.current = phase;

      const [tab, setTab] = useState('all');
      const [editing, setEditing] = useState(null);
      const [trayEditing, setTrayEditing] = useState(null);
      const [settingsOpen, setSettingsOpen] = useState(false);
      const [pendingCategory, setPendingCategory] = useState(null);
      const [wsSelected, setWsSelected] = useState('');
      const [customPick, setCustomPick] = useState('');
      const [builtinPick, setBuiltinPick] = useState('');
      const [confirming, setConfirming] = useState(false);
      const [status, setStatus] = useState(null);
      const [busy, setBusy] = useState(false);

      const statusTimer = useRef(0);
      const flash = useCallback((next) => {
        setStatus(next);
        window.clearTimeout(statusTimer.current);
        statusTimer.current = window.setTimeout(() => setStatus(null), 6000);
      }, []);
      useEffect(() => () => window.clearTimeout(statusTimer.current), []);

      const confirmCategoryDelete = () => {
        const target = pendingCategory;
        setPendingCategory(null);
        if (!target || target.indexOf('custom:') !== 0) return;
        poolActions.removeCategory(target.slice(7));
        if (tab === target) setTab('all');
      };

      const panelRef = useRef(null);

      useEffect(() => {
        if (!view.open) return undefined;
        const onPointerDown = (event) => {
          const target = event.target;
          if (!(target instanceof Element)) return;
          if (panelRef.current && panelRef.current.contains(target)) return;
          if (target.closest('[data-pp-trigger="true"]')) return;
          ui.set({ open: false });
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        return () => document.removeEventListener('pointerdown', onPointerDown, true);
      }, [view.open]);

      useEffect(() => {
        if (!view.open) return undefined;
        const onKey = (event) => {
          if (event.key !== 'Escape') return;
          if (editing) {
            setEditing(null);
          } else if (confirming) {
            setConfirming(false);
          } else {
            ui.set({ open: false });
          }
          event.stopPropagation();
          event.preventDefault();
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
      }, [view.open, editing, confirming]);

      const rail = workspaceRail(workspaces.items, state.settings, workspaces.currentId);
      const wsActive = rail.some((entry) => entry.id === wsSelected) ? wsSelected : rail.length > 0 ? rail[0].id : '';
      const wsCounts = useMemo(() => {
        const counts = {};
        for (const item of state.items) {
          const group = groupOf(item);
          if (familyOf(group) === 'workspace') {
            const key = 'ws:' + group.slice(10);
            counts[key] = (counts[key] || 0) + 1;
          }
        }
        return counts;
      }, [state.items]);

      const items = useMemo(
        () => (tab === 'nested:workspace' ? state.items.filter((item) => item.group === 'workspace:' + (wsActive ? wsActive.slice(3) : '')) : state.items.filter((item) => matchesTab(item, tab))),
        [state.items, tab, wsActive],
      );

      const actions = props.inputActions;
      const canAct = actions && typeof actions.setDraft === 'function';

      const setDraft = (text) => {
        if (!canAct) return;
        actions.setDraft(text);
      };

      const insertItem = (item) => {
        if (!actions || typeof actions.captureInsertion !== 'function' || typeof actions.insertText !== 'function') {
          flash({ kind: 'error', text: translate('status.insertFailed') });
          return;
        }
        try {
          const span = actions.captureInsertion();
          const ok = actions.insertText(item.body, span);
          flash(ok ? { kind: 'ok', text: translate('status.inserted') } : { kind: 'error', text: translate('status.insertFailed') });
        } catch (error) {
          flash({ kind: 'error', text: String((error && error.message) || error) });
        }
      };

      const saveTrayEdit = () => {
        if (!trayEditing) return;
        if (!trayEditing.body.trim()) {
          flash({ kind: 'error', text: translate('status.emptyBody') });
          return;
        }
        poolActions.patchTray(trayEditing.key, { body: trayEditing.body });
        setTrayEditing(null);
      };

      const captureDraft = () => {
        const text = draftRef.current;
        if (!text || !text.trim()) {
          flash({ kind: 'error', text: translate('status.nothing') });
          return;
        }
        poolActions.add({
          id: uid(),
          group: BUILTIN_GROUP.note,
          title: firstLine(text),
          body: text,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        setDraft('');
        flash({ kind: 'ok', text: translate('status.saved') });
      };

      const newItem = () => {
        const inWorkspace = tab === 'nested:workspace';
        const group = groupForTab(tab, inWorkspace && wsActive ? 'workspace:' + wsActive.slice(3) : '');
        // The new row must land on a visible list, so plain tabs switch to the kind tab.
        if (!inWorkspace && !familyOf(tab)) setTab(group);
        const item = poolActions.add({
          id: uid(),
          group,
          title: '',
          body: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        setEditing({ id: item.id, group, title: '', body: '' });
      };

      const startEdit = (item) => setEditing({ id: item.id, group: groupOf(item), title: item.title, body: item.body });

      const saveEdit = () => {
        if (!editing) return;
        if (!editing.body.trim()) {
          flash({ kind: 'error', text: translate('status.emptyBody') });
          return;
        }
        poolActions.patch(editing.id, {
          group: editing.group,
          title: editing.title.trim(),
          body: editing.body,
        });
        setEditing(null);
      };

      const deleteItem = (item) => {
        const index = pool.get().items.findIndex((entry) => entry.id === item.id);
        poolActions.remove(item.id);
        flash({
          kind: 'info',
          text: translate('status.deleted', { title: item.title || firstLine(item.body) }),
          undo: () => {
            poolActions.restore(item, index);
            setStatus(null);
          },
        });
      };

      const release = async () => {
        const entries = state.tray.slice();
        if (entries.length === 0) return;
        if (draftRef.current.trim() !== '') {
          setConfirming(false);
          flash({ kind: 'error', text: translate('status.draftBusy') });
          return;
        }
        setConfirming(false);
        setBusy(true);
        setStatus({ kind: 'info', text: translate('status.releasing', { n: entries.length }) });
        let sent = 0;
        for (const entry of entries) {
          const body = typeof entry.body === 'string' ? entry.body : '';
          if (!body.trim()) continue;
          const clear = await waitFor(() => draftRef.current.trim() === '' && phaseRef.current === 'plain', 2500);
          if (!clear) break;
          setDraft(body);
          await frames(2);
          if (typeof actions.submit === 'function') actions.submit();
          sent += 1;
          const consumed = await waitFor(() => draftRef.current.trim() === '', 2000);
          if (!consumed) break;
          await waitFor(() => phaseRef.current === 'plain', 1500);
        }
        setBusy(false);
        poolActions.setTray(entries.slice(sent));
        flash(
          sent === entries.length
            ? { kind: 'ok', text: translate('status.released', { n: sent }) }
            : { kind: 'error', text: translate('status.releaseStopped', { n: sent, rest: entries.length - sent }) },
        );
      };

      const rowOf = (item, index) => {
        if (editing && editing.id === item.id) {
          return h(
            'div',
            { key: item.id, className: 'pp-edit' },
            h('input', {
              className: 'pp-input',
              value: editing.title,
              placeholder: translate('row.titlePlaceholder'),
              onChange: (event) => setEditing({ ...editing, title: event.target.value }),
            }),
            h(MentionField, {
              value: editing.body,
              placeholder: translate('row.bodyPlaceholder'),
              rows: 4,
              autoFocus: true,
              sessionId: props.sessionId,
              onChange: (event) => setEditing({ ...editing, body: event.target.value }),
              onKeyDown: (event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault();
                  saveEdit();
                }
              },
            }),
            h(
              'div',
              { className: 'pp-edit-actions' },
              h(
                'select',
                {
                  className: 'pp-input',
                  style: { width: 'auto', maxWidth: '220px' },
                  value: groupOf(editing),
                  'aria-label': translate('row.classification'),
                  onChange: (event) => setEditing(withGroup(editing, event.target.value)),
                },
                h(
                  'optgroup',
                  { label: translate('row.familyBuiltin') },
                  h('option', { value: BUILTIN_GROUP.oftenuse }, translate('group.oftenuse')),
                  h('option', { value: BUILTIN_GROUP.note }, translate('group.note')),
                  h('option', { value: BUILTIN_GROUP.template }, translate('group.template')),
                ),
                workspaces.items.length > 0
                  ? h(
                      'optgroup',
                      { label: translate('row.familyWorkspace') },
                      workspaces.items.map((workspace) => h('option', { key: workspace.id, value: 'workspace:' + workspace.workspaceId }, workspace.name)),
                    )
                  : null,
                state.categories.length > 0
                  ? h(
                      'optgroup',
                      { label: translate('row.familyCustom') },
                      state.categories.map((category) => h('option', { key: category.id, value: 'custom:' + category.id }, category.name)),
                    )
                  : null,
              ),
              h('span', { className: 'pp-grow' }),
              h('button', { type: 'button', className: 'pp-mini', onClick: () => setEditing(null) }, translate('row.cancel')),
              h('button', { type: 'button', className: 'pp-primary', onClick: saveEdit }, translate('row.save')),
            ),
          );
        }
        return h(
          'div',
          { key: item.id, className: 'pp-row' },
          h(IconButton, { name: 'insert', label: translate('row.insert'), onClick: () => insertItem(item) }),
          h(TrayAdd, { label: translate('row.select'), onClick: () => poolActions.addToTray(item.id) }),
          h(
            'div',
            { className: 'pp-main', title: translate('row.insert'), onClick: () => insertItem(item) },
            h('div', { className: 'pp-title' }, item.title || item.body.split('\n')[0] || translate('group.untitled')),
            item.body.trim() === (item.title || '').trim() ? null : h('div', { className: 'pp-body' }, item.body),
          ),
          tab === 'all'
            ? h('span', { className: 'pp-tag' }, clipLabel(groupLabelOf(item, state.categories, workspaces.items)))
            : null,
          h(
            'div',
            { className: 'pp-actions' },
            h(IconButton, { name: 'up', label: translate('row.up'), disabled: index === 0, onClick: () => poolActions.move(item.id, -1) }),
            h(IconButton, {
              name: 'down',
              label: translate('row.down'),
              disabled: index === items.length - 1,
              onClick: () => poolActions.move(item.id, 1),
            }),
            h(IconButton, { name: 'edit', label: translate('row.edit'), onClick: () => startEdit(item) }),
            h(IconButton, { name: 'trash', label: translate('row.delete'), danger: true, onClick: () => deleteItem(item) }),
          ),
        );
      };

      const tray = state.tray;

      // The sidebar tab has no composer access, so it posts commands here.
      const bridgeRef = useRef(null);
      bridgeRef.current = { insert: insertItem, release };
      useEffect(() => {
        return bridge.listen((command) => {
          const api = bridgeRef.current;
          if (!api || !command) return { ok: false, reason: 'unavailable' };
          if (command.type === 'insert') {
            if (typeof command.text !== 'string') return { ok: false, reason: 'bad-command' };
            api.insert({ body: command.text });
            return { ok: true };
          }
          if (command.type === 'release') {
            if (draftRef.current.trim() !== '') return { ok: false, reason: 'draft-busy' };
            api.release();
            return { ok: true };
          }
          return { ok: false, reason: 'unknown' };
        });
      }, []);

      if (!view.open) return null;

      const panelCount = state.items.length;

      // A folded family renders its groups as chips inside one tab.
      const customGroups = state.categories.map((category) => ({ id: 'custom:' + category.id, name: category.name }));
      const customActive = customGroups.some((entry) => entry.id === customPick)
        ? customPick
        : customGroups.length > 0
          ? customGroups[0].id
          : '';
      const customCounts = {};
      for (const item of state.items) {
        const group = groupOf(item);
        if (familyOf(group) === 'custom') customCounts[group] = (customCounts[group] || 0) + 1;
      }
      const builtinList = builtinGroups();
      const builtinActive = builtinList.some((entry) => entry.id === builtinPick) ? builtinPick : builtinList[0].id;
      const nestedView =
        tab === 'nested:workspace'
          ? {
              rail: rail,
              activeId: wsActive,
              onSelect: setWsSelected,
              counts: wsCounts,
              emptyText: translate('ws.empty'),
              scoped: state.items.filter((item) => groupOf(item) === (wsActive ? 'workspace:' + wsActive.slice(3) : '')),
            }
          : tab === 'nested:custom'
            ? {
                rail: customGroups,
                activeId: customActive,
                onSelect: setCustomPick,
                counts: customCounts,
                editable: true,
                onDelete: (id) => setPendingCategory(id),
                emptyText: translate('panel.emptyTab'),
                scoped: state.items.filter((item) => groupOf(item) === customActive),
              }
            : tab === 'nested:builtin'
              ? {
                  rail: builtinList,
                  activeId: builtinActive,
                  onSelect: setBuiltinPick,
                  counts: {},
                  emptyText: translate('panel.emptyTab'),
                  scoped: state.items.filter((item) => groupOf(item) === builtinActive),
                }
              : null;

      return h(
        'div',
        {
          className: 'pp-panel',
          role: 'dialog',
          'aria-label': translate('panel.title'),
          ref: panelRef,
          onMouseDown: (event) => event.stopPropagation(),
        },
        h('style', null, CSS),
        h(
          'div',
          { className: 'pp-head' },
          h('span', { className: 'pp-head-title' }, translate('panel.title')),
          h('span', { className: 'pp-head-count' }, String(panelCount)),
          h('span', { className: 'pp-grow' }),
          h(SettingsButton, { active: settingsOpen, onClick: () => setSettingsOpen(!settingsOpen) }),
          h(
            'button',
            { type: 'button', className: 'pp-x', title: translate('panel.close'), 'aria-label': translate('panel.close'), onClick: () => ui.set({ open: false }) },
            '✕',
          ),
        ),
        h(
          'div',
          { className: 'pp-bar' },
          h(TabBar, {
            tabs: buildTabs(state.categories, workspaces.items, state.settings, workspaces.currentId),
            active: tab,
            ...tabHandlers((next) => {
              setSettingsOpen(false);
              setTab(next);
            }, tab),
            onDelete: (id) => setPendingCategory(id),
          }),
          h('span', { className: 'pp-grow' }),
          h('button', { type: 'button', className: 'pp-mini', onClick: captureDraft }, translate('panel.capture')),
            h('button', { type: 'button', className: 'pp-mini', onClick: newItem }, '＋ ', translate('panel.new')),
        ),
        pendingCategory ? h(CategoryDeleteConfirm, { onConfirm: confirmCategoryDelete, onCancel: () => setPendingCategory(null) }) : null,
        h(
          'div',
          { className: 'pp-list' },
          settingsOpen
            ? h(PromptPoolSettings, null)
            : nestedView
              ? renderWorkspacePanes({
                  rail: nestedView.rail,
                  items: nestedView.scoped,
                  activeId: nestedView.activeId,
                  onSelect: nestedView.onSelect,
                  counts: nestedView.counts,
                  editable: nestedView.editable,
                  onDelete: nestedView.onDelete,
                  renderRow: rowOf,
                  emptyText: nestedView.emptyText,
                })
                : items.length === 0
                  ? h(
                      'div',
                      { className: 'pp-empty' },
                      translate(
                        state.items.length === 0
                          ? 'panel.empty'
                          : tab === BUILTIN_GROUP.oftenuse && !state.items.some((item) => groupOf(item) === BUILTIN_GROUP.oftenuse)
                            ? 'page.emptyOftenuse'
                            : 'panel.emptyTab',
                      ),
                    )
                  : items.map(rowOf),
        ),
        status
          ? h(
              'div',
              { className: 'pp-status', 'data-kind': status.kind || 'info' },
              h('span', null, status.text),
              status.undo
                ? h(
                    'button',
                    {
                      type: 'button',
                      className: 'pp-link',
                      onClick: () => {
                        status.undo();
                      },
                    },
                    translate('status.undo'),
                  )
                : null,
            )
          : null,
        tray.length > 0
          ? h(
              'div',
              { className: 'pp-foot' },
              h(
                'div',
                { className: 'pp-foot-head' },
                h('span', { className: 'pp-foot-title' }, translate('tray.title')),
            h('span', { className: 'pp-hint' }, translate('tray.selected', { n: tray.length })),
                queue.length > 0 ? h('span', { className: 'pp-hint' }, translate('tray.queue', { n: queue.length })) : null,
                h('span', { className: 'pp-grow' }),
                h('button', { type: 'button', className: 'pp-link', onClick: () => poolActions.clearTray() }, translate('tray.clear')),
              ),
              h(
                'div',
                { className: 'pp-tray' },
                tray.map((entry, index) => {
                  if (trayEditing && trayEditing.key === entry.key) {
                    return h(
                      'div',
                      { key: entry.key, className: 'pp-edit', style: { margin: '4px 0' } },
                      h('textarea', {
                        className: 'pp-textarea',
                        value: trayEditing.body,
                        placeholder: translate('row.bodyPlaceholder'),
                        rows: 4,
                        autoFocus: true,
                        onChange: (event) => setTrayEditing({ ...trayEditing, body: event.target.value }),
                        onKeyDown: (event) => {
                          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                            event.preventDefault();
                            saveTrayEdit();
                          }
                        },
                      }),
                      h(
                        'div',
                        { className: 'pp-edit-actions' },
                        h('button', { type: 'button', className: 'pp-mini', onClick: () => setTrayEditing(null) }, translate('row.cancel')),
                        h('button', { type: 'button', className: 'pp-primary', onClick: saveTrayEdit }, translate('row.save')),
                      ),
                    );
                  }
                  return h(
                    'div',
                    { key: entry.key, className: 'pp-chip' },
                    h('span', { className: 'pp-chip-n' }, String(index + 1) + '.'),
                    h('div', { className: 'pp-chip-t' }, entry.body),
                    h(
                      'div',
                      { className: 'pp-chip-actions' },
                      h(IconButton, { name: 'up', label: translate('row.up'), disabled: index === 0, onClick: () => poolActions.moveTray(entry.key, -1) }),
                      h(IconButton, {
                        name: 'down',
                        label: translate('row.down'),
                        disabled: index === tray.length - 1,
                        onClick: () => poolActions.moveTray(entry.key, 1),
                      }),
                      h(IconButton, {
                        name: 'edit',
                        label: translate('row.edit'),
                        onClick: () => setTrayEditing({ key: entry.key, body: entry.body || '' }),
                      }),
                      h(IconButton, { name: 'copy', label: translate('tray.duplicate'), onClick: () => poolActions.duplicateTray(entry.key) }),
                      h(IconButton, { name: 'close', label: translate('tray.remove'), onClick: () => poolActions.removeTray(entry.key) }),
                    ),
                  );
                }),
              ),
              confirming
                ? h(
                    'div',
                    null,
                    h('div', { className: 'pp-hint', style: { marginBottom: '6px' } }, translate('confirm.title', { n: tray.length })),
                    h(
                      'div',
                      { className: 'pp-edit-actions' },
                      h('button', { type: 'button', className: 'pp-mini', onClick: () => setConfirming(false) }, translate('confirm.cancel')),
                      h('button', { type: 'button', className: 'pp-primary', onClick: release }, translate('confirm.ok')),
                    ),
                  )
                : h(
                    'div',
                    null,
                    h('div', { className: 'pp-hint', style: { marginBottom: '6px' } }, translate('tray.hint')),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'pp-primary',
                        style: { width: '100%' },
                        disabled: busy,
                        onClick: () => setConfirming(true),
                      },
                      translate('tray.release'),
                    ),
                  ),
            )
          : null,
      );
    }

    // ----------------------------------------------------------------- helpers
    function frames(count) {
      return new Promise((resolve) => {
        let left = count;
        const step = () => {
          if (left <= 0) {
            resolve();
            return;
          }
          left -= 1;
          if (typeof requestAnimationFrame === 'function') requestAnimationFrame(step);
          else setTimeout(step, 16);
        };
        step();
      });
    }

    function waitFor(check, timeoutMs) {
      return new Promise((resolve) => {
        const started = Date.now();
        const tick = () => {
          let ok = false;
          try {
            ok = check() === true;
          } catch (_error) {
            ok = false;
          }
          if (ok) {
            resolve(true);
            return;
          }
          if (Date.now() - started >= timeoutMs) {
            resolve(false);
            return;
          }
          setTimeout(tick, 40);
        };
        tick();
      });
    }

    // -------------------------------------------------------------------- css
    const CSS =
      '.pp-panel,.pp-page,.pp-settings,.pp-root{--pp-accent:var(--dsw-alias-state-business-primary,var(--dsw-alias-brand-primary));--pp-accent-soft:color-mix(in srgb,var(--pp-accent) 13%,transparent);--pp-accent-line:color-mix(in srgb,var(--pp-accent) 55%,transparent);--pp-ink:var(--dsw-alias-label-primary);--pp-ink-2:var(--dsw-alias-label-secondary);--pp-line:var(--dsw-alias-border-l1);--pp-line-2:var(--dsw-alias-border-l2);--pp-surface:var(--dsw-alias-bg-layer-1);--pp-surface-2:var(--dsw-alias-bg-overlay);--pp-hover:var(--dsw-alias-interactive-bg-hover,var(--dsw-alias-bg-layer-2));--pp-danger:var(--dsw-alias-state-error-primary);--pp-danger-soft:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);--pp-ok:var(--dsw-alias-state-success-primary);--pp-on-accent:#ffffff}' +
      '.pp-btn{display:inline-flex;align-items:center;justify-content:center;gap:5px;height:28px;min-width:28px;padding:0 6px;border:0;border-radius:8px;background:transparent;color:var(--pp-ink-2);cursor:pointer;font:inherit;font-size:12px;line-height:1}' +
      '.pp-btn:hover{background:var(--pp-hover);color:var(--pp-ink)}' +
      '.pp-btn[data-open="true"]{background:var(--pp-hover);color:var(--pp-ink)}' +
      '.pp-badge{min-width:15px;height:15px;padding:0 4px;border-radius:8px;border:1px solid var(--pp-line-2);color:var(--pp-ink-2);font-size:10px;line-height:13px;text-align:center;font-variant-numeric:tabular-nums}' +
      '.pp-panel{position:absolute;left:6px;right:6px;bottom:0;margin:0 auto;max-width:760px;z-index:40;display:flex;flex-direction:column;max-height:min(58vh,520px);border:1px solid var(--pp-line);border-radius:var(--dsw-radius-panel,12px);background:var(--pp-surface-2);box-shadow:var(--dsw-elevation-soft,0 10px 30px rgba(0,0,0,.16));overflow:hidden;font-size:13px;line-height:1.5;color:var(--pp-ink);text-align:left}' +
      '.pp-head{display:flex;align-items:center;gap:8px;padding:10px 12px 6px}' +
      '.pp-head-title{font-weight:600;font-size:13px}' +
      '.pp-head-count{color:var(--pp-ink-2);font-size:11px;font-variant-numeric:tabular-nums}' +
      '.pp-grow{flex:1;min-width:0}' +
      '.pp-x{width:22px;height:22px;border:0;border-radius:6px;background:transparent;color:var(--pp-ink-2);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:12px;line-height:1}' +
      '.pp-x:hover{background:var(--pp-hover);color:var(--pp-ink)}' +
      '.pp-bar{display:flex;align-items:center;gap:6px;padding:0 12px 8px;flex-wrap:wrap}' +
      '.pp-tab{height:24px;padding:0 9px;border-radius:7px;border:1px solid transparent;background:transparent;color:var(--pp-ink-2);font:inherit;font-size:12px;cursor:pointer}' +
      '.pp-tab:hover{background:var(--pp-hover)}' +
      '.pp-tab[data-active="true"]{border-color:var(--pp-accent);background:var(--pp-accent-soft);color:var(--pp-accent);font-weight:600}' +
      '.pp-tab-add{padding:0 7px;color:var(--pp-ink-2)}' +
      '.pp-tab-addwrap{display:inline-flex;align-items:center}' +
      '.pp-tab-sep{flex:none;width:1px;height:16px;margin:0 7px;background:color-mix(in srgb, var(--pp-ink-2) 45%, transparent)}' +
      '.pp-tab-x{margin-left:4px;padding:0 2px;border-radius:4px;font-size:11px;line-height:1;color:var(--pp-ink-2)}' +
      '.pp-tab-x:hover{color:var(--pp-danger)}' +
      '.pp-tab-input{height:24px;width:110px;padding:0 7px;border:1px solid var(--pp-accent);border-radius:7px;background:var(--dsw-alias-bg-base);color:inherit;font:inherit;font-size:12px;outline:none}' +
      '.pp-modal{position:absolute;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;background:color-mix(in srgb,var(--pp-ink) 22%,transparent)}' +
      '.pp-modal-card{width:100%;max-width:400px;display:flex;flex-direction:column;gap:14px;padding:16px 18px;border:1px solid var(--pp-line);border-radius:12px;background:var(--pp-surface-2);box-shadow:0 18px 48px rgba(0,0,0,.24)}' +
      '.pp-modal-text{font-size:13px;line-height:1.65;color:var(--pp-ink)}' +
      '.pp-modal-actions{display:flex;justify-content:flex-end;gap:8px}' +
      '.pp-mini{height:24px;padding:0 9px;border-radius:7px;border:1px solid var(--pp-line);background:transparent;color:var(--pp-ink);font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}' +
      '.pp-mini:hover{background:var(--pp-hover)}' +
      '.pp-set-btn{display:inline-flex;align-items:center;gap:5px;padding:0 9px}' +
      '.pp-set-btn[data-active="true"]{border-color:var(--pp-accent);color:var(--pp-accent)}' +
      '.pp-set-btn-icon{display:inline-flex;align-items:center}' +
      '.pp-list{overflow-y:auto;padding:2px 6px 8px;flex:1;min-height:0}' +
      '.pp-page{position:relative;display:flex;flex-direction:column;height:100%;min-height:0;background:var(--dsw-alias-bg-base);color:var(--pp-ink);font-size:13px;line-height:1.5}' +
      '.pp-page-head{display:flex;align-items:center;gap:8px;padding:12px 12px 8px;border-bottom:1px solid var(--pp-line);flex-wrap:wrap}' +
      '.pp-page-title{font-size:14px;font-weight:600}' +
      '.pp-page-sub{color:var(--pp-ink-2);font-size:12px}' +
      '.pp-search{height:26px;flex:1;min-width:120px;border:1px solid var(--pp-line);border-radius:8px;background:var(--pp-surface);color:inherit;font:inherit;font-size:12px;padding:0 9px;outline:none}' +
      '.pp-search:focus{border-color:var(--pp-accent)}' +
      '.pp-settings{max-width:640px;padding:16px 20px;color:var(--pp-ink);font-size:13px;line-height:1.6}' +
      '.pp-set-title{font-size:15px;font-weight:600;margin-bottom:4px}' +
      '.pp-set-group{margin-top:14px}' +
      '.pp-set-row{display:flex;align-items:flex-start;gap:8px;cursor:pointer}' +
      '.pp-set-row input{margin:3px 0 0;accent-color:var(--pp-accent);cursor:pointer}' +
      '.pp-set-hint{margin-top:2px;padding-left:22px}' +
      '.pp-set-divider{height:1px;background:var(--pp-line-2);margin:14px 0 12px}' +
        '.pp-set-line{display:flex;align-items:center;gap:12px;padding:4px 0}' +
        '.pp-set-ws{display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;min-width:0}' +
        '.pp-set-ws input{margin:0;accent-color:var(--pp-accent);cursor:pointer}' +
        '.pp-set-ws-name{font-size:12px;color:var(--pp-ink);white-space:nowrap}' +
        '.pp-set-ws-tag{margin-left:6px;padding:0 5px;border-radius:5px;background:var(--pp-accent-soft);color:var(--pp-accent);font-size:10px}' +
        '.pp-set-ws-path{margin-left:auto;color:var(--pp-ink-2);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:340px}' +
        '.pp-set-name{min-width:78px;font-size:12px;color:var(--pp-ink)}' +
        '.pp-set-modes{display:flex;flex-wrap:wrap;gap:16px}' +
        '.pp-set-inline{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--pp-ink);cursor:pointer}' +
        '.pp-set-inline input{margin:0;accent-color:var(--pp-accent);cursor:pointer}' +
        '.pp-set-label{font-size:12px;color:var(--pp-ink-2);margin:2px 0 4px}' +
      '.pp-set-card{padding:10px 12px;border:1px solid var(--pp-line-2);border-radius:10px;background:var(--pp-surface);box-shadow:0 1px 3px rgba(0,0,0,.08)}' +
      '.pp-set-card .pp-set-label{margin:0 0 6px;font-size:12px;font-weight:600;color:var(--pp-ink)}' +
      '.pp-set-card .pp-set-row{padding:3px 0}' +
      '.pp-set-card .pp-set-hint{padding-left:0;margin:2px 0 8px}' +
      '.pp-set-item + .pp-set-item{margin-top:8px}' +
      '.pp-page-body{flex:1;min-height:0;overflow-y:auto;padding:6px 8px 20px}' +
      '.pp-ws{display:flex;flex-direction:column;gap:8px;min-width:0}' +
      '.pp-ws-rail{display:flex;flex-wrap:wrap;align-items:center;gap:4px;min-width:0}' +
      '.pp-ws-tab{display:inline-flex;align-items:center;gap:5px;max-width:100%;min-width:0;padding:3px 9px;border:1px solid var(--pp-line);border-radius:999px;background:transparent;color:var(--pp-ink-2);font:inherit;font-size:12px;line-height:18px;cursor:pointer}' +
      '.pp-ws-tab:hover{background:var(--pp-hover);color:var(--pp-ink)}' +
      '.pp-ws-tab[data-active="true"]{background:var(--pp-accent-soft);border-color:var(--pp-accent);color:var(--pp-accent);font-weight:600}' +
      '.pp-ws-name{min-width:0;max-width:168px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.pp-ws-count{flex:none;font-size:10px;font-variant-numeric:tabular-nums;color:var(--pp-ink-2)}' +
      '.pp-ws-body{min-width:0}' +
      '.pp-page-foot{display:flex;flex-direction:column;gap:8px;margin:8px 10px 10px;padding:10px 12px;border:1px solid var(--pp-line-2);border-radius:10px;background:var(--pp-surface);box-shadow:0 1px 3px rgba(0,0,0,.08);max-height:52%;overflow-y:auto}' +
      '.pp-page-foot .pp-tray{max-height:none}' +
      '.pp-page-item{padding:10px 12px;border-radius:10px;border:1px solid transparent}' +
      '.pp-page-item:hover{background:var(--pp-surface);border-color:var(--pp-line)}' +
      '.pp-page-item .pp-actions{opacity:.35}' +
      '.pp-page-item:hover .pp-actions{opacity:1}' +
      '.pp-empty{padding:22px 16px;color:var(--pp-ink-2);text-align:center;font-size:12px}' +
      '.pp-group{display:flex;align-items:center;gap:6px;padding:10px 8px 4px;font-size:11px;font-weight:500;color:var(--pp-ink-2);letter-spacing:.02em}' +
      '.pp-row{display:flex;align-items:flex-start;gap:8px;padding:7px 8px;border-radius:8px}' +
      '.pp-row:hover{background:var(--pp-hover)}' +
      '.pp-check{margin:2px 0 0;accent-color:var(--pp-accent);cursor:pointer;flex:none}' +
      '.pp-toggle{width:26px;height:26px;flex:none;margin-top:-1px;border:0;border-radius:6px;background:transparent;color:var(--pp-ink-2);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0}' +
      '.pp-toggle:hover{background:var(--pp-hover);color:var(--pp-ink)}' +
      '.pp-toggle[data-selected="true"]{color:var(--pp-accent)}' +
      '.pp-main{flex:1;min-width:0;cursor:pointer}' +
      '.pp-title{font-size:12.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.pp-body{color:var(--pp-ink-2);font-size:12px;white-space:pre-wrap;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word}' +
      '.pp-tag{flex:none;margin-top:2px;padding:0 5px;border-radius:5px;border:1px solid var(--pp-accent-line);background:var(--pp-accent-soft);color:var(--pp-accent);font-size:10px;line-height:15px}' +
      '.pp-actions{display:flex;gap:2px;opacity:0;flex:none}' +
      '.pp-row:hover .pp-actions,.pp-row:focus-within .pp-actions{opacity:1}' +
      '.pp-icon{width:26px;height:26px;border:0;border-radius:6px;background:transparent;color:var(--pp-ink-2);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;flex:none}' +
      '.pp-icon:hover{background:var(--pp-surface);color:var(--pp-ink)}' +
      '.pp-icon:disabled{opacity:.35;cursor:default}' +
      '.pp-icon[data-danger="true"]:hover{color:var(--pp-danger)}' +
      '.pp-icon[data-active="true"]{color:var(--pp-accent)}' +
      '.pp-edit{padding:8px;border-radius:8px;background:var(--pp-surface);border:1px solid var(--pp-line);display:flex;flex-direction:column;gap:6px}' +
      '.pp-input,.pp-textarea{width:100%;box-sizing:border-box;border:1px solid var(--pp-line);border-radius:6px;background:var(--dsw-alias-bg-base);color:var(--pp-ink);font:inherit;font-size:12px;padding:5px 7px;outline:none;resize:vertical}' +
      '.pp-input:focus,.pp-textarea:focus{border-color:var(--pp-accent)}' +
      '.pp-mention{position:relative;flex:1;display:flex}' +
        '.pp-mention-menu{position:absolute;z-index:6;top:100%;left:0;right:0;margin-top:2px;max-height:180px;overflow:auto;border:1px solid var(--pp-line-2);border-radius:8px;background:var(--pp-surface);box-shadow:0 8px 24px rgba(0,0,0,.14)}' +
        '.pp-mention-note{padding:8px 10px;font-size:11px;color:var(--pp-ink-2)}' +
        '.pp-mention-item{display:flex;gap:8px;align-items:baseline;width:100%;padding:6px 10px;border:0;background:none;text-align:left;font:inherit;color:var(--pp-ink);cursor:pointer}' +
        '.pp-mention-item[data-active="true"],.pp-mention-item:hover{background:var(--pp-hover)}' +
        '.pp-mention-name{font-size:12px;white-space:nowrap}' +
        '.pp-mention-hint{color:var(--pp-ink-2);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
        '.pp-textarea{min-height:64px}' +
      '.pp-edit-actions{display:flex;gap:6px;align-items:center;justify-content:flex-end}' +
      '.pp-primary{height:28px;padding:0 14px;border-radius:8px;border:1px solid var(--pp-accent);background:var(--pp-accent);color:var(--pp-on-accent);font:inherit;font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap}' +
      '.pp-primary:hover{filter:brightness(1.06)}' +
      '.pp-primary:disabled{opacity:.5;cursor:default}' +
      '.pp-link{border:0;background:transparent;color:var(--pp-ink-2);font:inherit;font-size:11px;cursor:pointer;padding:0;text-decoration:underline;text-underline-offset:2px}' +
      '.pp-link:hover{color:var(--pp-ink)}' +
      '.pp-foot{border-top:1px solid var(--pp-line);padding:8px 12px 10px;display:flex;flex-direction:column;gap:6px;background:var(--pp-surface)}' +
      '.pp-foot-head{display:flex;align-items:center;gap:6px}' +
      '.pp-foot-title{font-size:12px;font-weight:600;color:var(--pp-ink)}' +
      '.pp-tray{display:flex;flex-direction:column;gap:6px;max-height:260px;overflow-y:auto}' +
      '.pp-foot .pp-tray{max-height:min(40vh,220px)}' +
      '.pp-chip{display:flex;align-items:flex-start;gap:6px;padding:5px 7px;border-radius:8px;border:1px solid var(--pp-line);background:var(--pp-surface-2);min-width:0}' +
      '.pp-chip-actions{display:flex;gap:2px;flex:none;align-self:flex-start}' +
      '.pp-chip-n{flex:none;padding-top:1px;font-size:11px;line-height:1.55;font-variant-numeric:tabular-nums;color:var(--pp-ink-2)}' +
      '.pp-chip-t{flex:1;min-width:0;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;font-size:12px;line-height:1.55;color:var(--pp-ink)}' +
      '.pp-chip .pp-icon{width:22px;height:22px}' +
      '.pp-hint{color:var(--pp-ink-2);font-size:11px}' +
      '.pp-status{padding:0 12px 8px;font-size:11px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}' +
      '.pp-status[data-kind="error"]{color:var(--pp-danger)}' +
      '.pp-status[data-kind="ok"]{color:var(--pp-ok)}';

    // ------------------------------------------------------------------- plugin
    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        localeCtx = ctx.locale;
        pluginCtx = ctx;
        // Optional services: bind late, and stay idle when they never mount.
        const bindOptional = (names, assign) => {
          const run = (target) => {
            try {
              assign(target);
            } catch (_error) {
              /* a missing service is not an error */
            }
          };
          run(ctx);
          if (typeof ctx.inject === 'function') ctx.inject(names, (serviceCtx) => run(serviceCtx));
        };
        bindOptional(['remote'], (target) => {
          remoteFace = serviceOf(target, 'remote');
        });
        bindOptional(['uiWorkspace'], (target) => {
          workspaceFace = serviceOf(target, 'uiWorkspace');
        });
        if (ctx.locale && typeof ctx.locale.register === 'function' && typeof ctx.locale.bind === 'function') {
          ctx.effect(() => ctx.locale.register(NS, { zh: ZH, en: EN }));
          translate = ctx.locale.bind(NS);
        }
        ctx.slots.inject('conversation.input.right', () =>
          ctx.slots.register(
            { name: 'conversation.input.right', id: 'prompt-pool', order: 10, label: () => translate('button.label') },
            PromptPoolButton,
          ),
        );
        ctx.slots.inject('conversation.input.overlay', () =>
          ctx.slots.register(
            { name: 'conversation.input.overlay', id: 'prompt-pool-panel', order: 12, label: () => translate('panel.title') },
            PromptPoolPanel,
          ),
        );

        ctx.slots.inject('settings.section', () =>
          ctx.slots.register(
            { name: 'settings.section', id: 'prompt-pool', order: 120, label: () => translate('settings.nav') },
            PromptPoolSettings,
          ),
        );

        // Right-sidebar tool page: `dsh-better-sidebar` owns the tools list and
        // the tab strip. It is an optional dependency, so a profile without it
        // keeps the composer panel only.
        const mountSidebarTab = (service) => {
          if (!service || typeof service.registerTab !== 'function') return;
          service.registerTab({
            id: 'prompt-pool:pool',
            title: () => translate('page.title'),
            description: () => translate('tab.description'),
            icon: (size) => h(PromptPoolIcon, { size, active: false }),
            order: 80,
            single: true,
            component: () => h(PromptPoolPage, null),
          });
        };
        try {
          const sidebar = typeof ctx.get === 'function' ? ctx.get('betterSidebar') : ctx.betterSidebar;
          if (sidebar) {
            mountSidebarTab(sidebar);
          } else if (typeof ctx.inject === 'function') {
            ctx.inject(['betterSidebar'], (sidebarCtx) => {
              mountSidebarTab(typeof sidebarCtx.get === 'function' ? sidebarCtx.get('betterSidebar') : sidebarCtx.betterSidebar);
            });
          }
        } catch (_error) {
          /* the sidebar plugin is optional */
        }
      },
    };
  },
});



