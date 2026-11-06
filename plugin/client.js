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
      'tab.pinned': '常用',
      'tab.workspace': '工作区',
      'tab.currentWorkspace': '当前工作区',
      'ws.none': '没有可用的工作区',
      'ws.empty': '这个工作区还没有条目',
      'tab.note': '便签',
      'tab.snippet': '模板',
      'tab.skill': '技能',
      'tab.add': '新建类别',
      'tab.namePlaceholder': '类别名，回车确认',
      'tab.renameHint': '双击重命名',
      'tab.delete': '删除这个类别（条目会变成未分类）',
      'tab.deleteConfirm': '确定要删除这个分类么？删除后该分类的提示词条目将会放入【未分类】内。',
      'tab.deleteAction': '删除',
      'tab.cancelAction': '取消',
      'kind.note': '便签',
      'kind.snippet': '模板',
      'kind.skill': '技能',
      'kind.untitled': '（未命名）',
      'skill.group.project': '项目级',
      'skill.group.global': '全局级',
      'skill.group.other': '其他',
      'skill.loading': '正在读取技能目录…',
      'skill.empty': '没有可用的技能。',
      'skill.failed': '读取技能失败',
      'skill.unavailable': '当前环境没有技能目录接口',
      'skill.refresh': '刷新',
      'skill.insert': '插入 /{name}',
      'skill.userOnly': '仅手动',
      'status.skillInserted': '已插入 /{name}',
      'row.insert': '插入到输入框',
      'row.pin': '标为常用',
      'row.unpin': '取消常用',
      'row.select': '加入已选列表',
      'row.copy': '复制内容',
      'row.duplicate': '复制一份，追加到池子末尾',
      'page.title': '提示词池',
      'tab.description': '暂存、编辑、编排你的提示词，按住顺序一次性释放',
      'page.count': '共 {n} 条',
      'page.search': '搜索标题或内容…',
      'page.empty': '还没有内容。点右上角「＋ 便签」开始。',
      'page.emptyPinned': '还没有常用项。点条目右侧的 ☆ 标记。',
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
      'row.kindLabel': '类型',
      'row.categoryLabel': '类别',
      'row.classification': '分类',
      'page.new': '提示词',
      'row.noCategory': '未分类',
      'tray.selected': '已选 {n} 条',
      'tray.release': '发送列表',
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
      'tab.pinned': 'Pinned',
      'tab.workspace': 'Workspaces',
      'tab.currentWorkspace': 'Current workspace',
      'ws.none': 'No workspaces available',
      'ws.empty': 'No items in this workspace yet',
      'tab.note': 'Notes',
      'tab.snippet': 'Templates',
      'tab.skill': 'Skills',
      'tab.add': 'New category',
      'tab.namePlaceholder': 'Category name, Enter to confirm',
      'tab.renameHint': 'Double-click to rename',
      'tab.delete': 'Delete this category (its items become uncategorized)',
      'tab.deleteConfirm': 'Delete this category? Its prompt items will move to Uncategorized.',
      'tab.deleteAction': 'Delete',
      'tab.cancelAction': 'Cancel',
      'kind.note': 'Note',
      'kind.snippet': 'Template',
      'kind.skill': 'Skill',
      'kind.untitled': '(untitled)',
      'skill.group.project': 'Project',
      'skill.group.global': 'Global',
      'skill.group.other': 'Other',
      'skill.loading': 'Loading the skill catalog…',
      'skill.empty': 'No skills available.',
      'skill.failed': 'Could not load skills',
      'skill.unavailable': 'No skill catalog interface in this build',
      'skill.refresh': 'Refresh',
      'skill.insert': 'Insert /{name}',
      'skill.userOnly': 'Manual only',
      'status.skillInserted': 'Inserted /{name}',
      'row.insert': 'Insert into the composer',
      'row.pin': 'Mark as pinned',
      'row.unpin': 'Unpin',
      'row.select': 'Add to the selected list',
      'row.copy': 'Copy the text',
      'row.duplicate': 'Duplicate and append to the pool',
      'page.title': 'Prompt pool',
      'tab.description': 'Stage, edit and arrange prompts, then release them in order',
      'page.count': '{n} items',
      'page.search': 'Search title or text…',
      'page.empty': 'Nothing yet. Use “+ Note” in the top right.',
      'page.emptyPinned': 'Nothing pinned yet. Use the ☆ control on a row.',
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
      'row.kindLabel': 'Kind',
      'row.categoryLabel': 'Category',
      'row.classification': 'Classification',
      'page.new': 'Prompt',
      'row.noCategory': 'Uncategorized',
      'tray.selected': '{n} selected',
      'tray.release': 'Send list',
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

    /** `ctx.remote.skills`, resolved lazily: the Remote service may mount after this plugin. */
    let pluginCtx = null;
    let skillRemote = null;

    function resolveSkillRemote() {
      if (skillRemote) return skillRemote;
      const ctx = pluginCtx;
      if (!ctx) return null;
      try {
        const remote = typeof ctx.get === 'function' ? ctx.get('remote') : ctx.remote;
        if (remote && remote.skills && typeof remote.skills.list === 'function') skillRemote = remote.skills;
      } catch (_error) {
        skillRemote = null;
      }
      return skillRemote;
    }

    const SKILL_SCOPES = ['project', 'global', 'other'];

    /** A skill summary's `source` encodes where it was discovered. */
    function scopeOfSkill(skill) {
      const source = skill && typeof skill.source === 'string' ? skill.source : '';
      if (source.indexOf('project') === 0) return 'project';
      if (source.indexOf('user') === 0) return 'global';
      return 'other';
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
      const kind = raw.kind === 'snippet' ? 'snippet' : raw.kind === 'skill' ? 'skill' : 'note';
      return {
        id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
        kind,
        title: typeof raw.title === 'string' ? raw.title : '',
        body,
        pinned: raw.pinned === true,
        categoryId: typeof raw.categoryId === 'string' ? raw.categoryId : '',
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

    function categoryIdOf(tab) {
      if (typeof tab !== 'string') return '';
      return tab.indexOf('cat:') === 0 || tab.indexOf('ws:') === 0 ? tab : '';
    }

    /** Workspace tabs are derived from the live workspace list, never persisted. */
    function workspaceTabId(workspaceId) {
      return 'ws:' + workspaceId;
    }

    /** One classification control: an item is either a kind or a category/workspace entry. */
    function withClassification(draft, value) {
      if (typeof value === 'string' && value.indexOf('kind:') === 0) {
        return { ...draft, kind: value === 'kind:snippet' ? 'snippet' : 'note', categoryId: '' };
      }
      return { ...draft, categoryId: value };
    }

    /** Tab filter shared by the composer panel and the sidebar page. */
    function matchesTab(item, tab) {
      if (tab === 'all') return true;
      if (tab === 'pinned') return item.pinned === true;
      if (categoryIdOf(tab)) return (item.categoryId || '') === tab;
      return item.kind === tab;
    }

    /** Tab actions shared by the composer panel and the sidebar page. */
    function tabHandlers(setTab, currentTab) {
      return {
        onSelect: (id) => setTab(id),
        onAdd: (name) => {
          const created = poolActions.addCategory(name);
          if (created) setTab('cat:' + created.id);
        },
        onRename: (id, name) => {
          if (id.indexOf('cat:') === 0) poolActions.renameCategory(id.slice(4), name);
        },
        onDelete: (id) => {
          if (id.indexOf('cat:') !== 0) return;
          poolActions.removeCategory(id.slice(4));
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
    }

    /** One 「工作区」 tab replaces the per-workspace tabs; its content is vertical. */
    function buildTabs(categories, workspaces, settings, currentWorkspaceId) {
      const flags = normalizeSettings(settings);
      const showWorkspaceTab = (flags.workspaceTabs || flags.currentWorkspaceTab) && (workspaces || []).length > 0;
      return [
        // Three blocks: the user's categories, the built-in views, then workspaces.
        ...categories.map((category) => ({ id: 'cat:' + category.id, label: category.name, category: true, group: 'custom' })),
        { id: 'all', label: translate('tab.all'), group: 'builtin' },
        { id: 'pinned', label: translate('tab.pinned'), group: 'builtin' },
        { id: 'note', label: translate('tab.note'), group: 'builtin' },
        { id: 'snippet', label: translate('tab.snippet'), group: 'builtin' },
        { id: 'skill', label: translate('tab.skill'), group: 'builtin' },
        ...(showWorkspaceTab
          ? [{ id: 'workspace', label: translate(flags.workspaceTabs ? 'tab.workspace' : 'tab.currentWorkspace'), group: 'workspace' }]
          : []),
      ];
    }

    /** Confirmation for deleting one of the user's own tabs. */
    function CategoryDeleteConfirm(props) {
      return h(
        'div',
        { className: 'pp-confirm' },
        h('div', { className: 'pp-confirm-text' }, translate('tab.deleteConfirm')),
        h(
          'div',
          { className: 'pp-edit-actions' },
          h('button', { type: 'button', className: 'pp-mini', onClick: props.onCancel }, translate('tab.cancelAction')),
          h('button', { type: 'button', className: 'pp-primary', onClick: props.onConfirm }, translate('tab.deleteAction')),
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
                title: workspace.name,
                onClick: () => props.onSelect(workspace.id),
              },
              h('span', { className: 'pp-ws-name' }, workspace.name),
              h('span', { className: 'pp-ws-count' }, String(props.counts[workspace.id] || 0)),
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
      const categoryIds = new Set(categories.map((category) => 'cat:' + category.id));
      const items = (Array.isArray(data && data.items) ? data.items.map(sanitizeItem).filter(Boolean) : []).map((item) => {
        const ref = item.categoryId || '';
        if (!ref) return item;
        if (ref.indexOf('ws:') === 0) return item;
        const migrated = ref.indexOf('cat:') === 0 ? ref : 'cat:' + ref;
        return categoryIds.has(migrated) ? { ...item, categoryId: migrated } : { ...item, categoryId: '' };
      });
      const byId = new Map(items.map((item) => [item.id, item]));
      const rawTray = Array.isArray(data && data.tray) ? data.tray : [];
      const tray = rawTray.map((entry) => normalizeTrayEntry(entry, byId)).filter(Boolean);
      return { version: 1, categories, items, tray, settings: normalizeSettings(data && data.settings) };
    }

    function emptyPool() {
      return { version: 1, categories: [], items: [], tray: [], settings: normalizeSettings(undefined) };
    }

    function loadPool() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return emptyPool();
        return normalizePool(JSON.parse(raw));
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
          return { id: workspaceTabId(workspaceId), workspaceId, name };
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
      return {
        workspaceTabs: settings.workspaceTabs !== false,
        currentWorkspaceTab: settings.currentWorkspaceTab !== false,
      };
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
      togglePin(id) {
        mutate((state) => {
          if (!state.items.some((item) => item.id === id)) return null;
          return { ...state, items: state.items.map((item) => (item.id === id ? { ...item, pinned: item.pinned !== true } : item)) };
        });
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
          items: state.items.map((item) => (item.categoryId === 'cat:' + id ? { ...item, categoryId: '' } : item)),
        }));
      },
      setCategory(itemId, categoryId) {
        mutate((state) => ({
          ...state,
          items: state.items.map((item) => (item.id === itemId ? { ...item, categoryId } : item)),
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
        width: 12,
        height: 12,
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
          { width: 13, height: 13, viewBox: '0 0 14 14', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
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
      if (!addPlaced) nodes.unshift(h('span', { key: 'add-custom', className: 'pp-tab-addwrap' }, renderAdd()));
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
    function PromptPoolPage() {
      useLocaleTick();
      const state = usePoolState();
      const workspaces = useWorkspaceDir();
      const [tab, setTab] = useState('all');
      const [query, setQuery] = useState('');
      const [editing, setEditing] = useState(null);
      const [trayEditing, setTrayEditing] = useState(null);
      const [settingsOpen, setSettingsOpen] = useState(false);
      const [pendingCategory, setPendingCategory] = useState(null);
      const [wsSelected, setWsSelected] = useState('');
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
        if (!target || target.indexOf('cat:') !== 0) return;
        poolActions.removeCategory(target.slice(4));
        if (tab === target) setTab('all');
      };

      const rail = workspaceRail(workspaces.items, state.settings, workspaces.currentId);
      const wsActive = rail.some((entry) => entry.id === wsSelected) ? wsSelected : rail.length > 0 ? rail[0].id : '';
      const wsCounts = useMemo(() => {
        const counts = {};
        for (const item of state.items) if (item.categoryId) counts[item.categoryId] = (counts[item.categoryId] || 0) + 1;
        return counts;
      }, [state.items]);

      const items = useMemo(() => {
        if (tab === 'workspace') {
          const needle = query.trim().toLowerCase();
          return state.items.filter((item) => {
            if (item.categoryId !== wsActive) return false;
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
          kind: editing.kind,
          title: editing.title.trim(),
          body: editing.body,
          categoryId: editing.categoryId || '',
        });
        setEditing(null);
        flash({ kind: 'ok', text: translate('status.savedToPool') });
      };

      /** One entry point: the current tab decides the new item's classification. */
      const create = () => {
        const inWorkspace = tab === 'workspace';
        const categoryId = inWorkspace ? wsActive : categoryIdOf(tab) || '';
        const nextKind = tab === 'snippet' ? 'snippet' : 'note';
        // Category and workspace tabs keep their own context; plain tabs land on the kind.
        if (!inWorkspace && !categoryId) setTab(nextKind);
        setQuery('');
        const item = poolActions.add({
          id: uid(),
          kind: nextKind,
          title: '',
          body: '',
          categoryId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        setEditing({ id: item.id, kind: nextKind, title: '', body: '', categoryId });
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
            h('textarea', {
              className: 'pp-textarea',
              value: editing.body,
              placeholder: translate('row.bodyPlaceholder'),
              rows: 5,
              autoFocus: true,
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
                  value: editing.categoryId || 'kind:' + (editing.kind === 'snippet' ? 'snippet' : 'note'),
                  'aria-label': translate('row.classification'),
                  onChange: (event) => setEditing(withClassification(editing, event.target.value)),
                },
                h(
                  'optgroup',
                  { label: translate('row.kindLabel') },
                  h('option', { value: 'kind:note' }, translate('kind.note')),
                  h('option', { value: 'kind:snippet' }, translate('kind.snippet')),
                ),
                workspaces.items.length > 0
                  ? h(
                      'optgroup',
                      { label: translate('tab.workspace') },
                      workspaces.items.map((workspace) => h('option', { key: workspace.id, value: workspace.id }, workspace.name)),
                    )
                  : null,
                state.categories.length > 0
                  ? h(
                      'optgroup',
                      { label: translate('row.categoryLabel') },
                      state.categories.map((category) => h('option', { key: category.id, value: 'cat:' + category.id }, category.name)),
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
          h(TrayAdd, { label: translate('row.select'), onClick: () => poolActions.addToTray(item.id) }),
          h(
            'div',
            { className: 'pp-main', onClick: () => setEditing({ id: item.id, kind: item.kind, title: item.title, body: item.body, categoryId: item.categoryId || '' }) },
            h('div', { className: 'pp-title' }, item.title || item.body.split('\n')[0] || translate('kind.untitled')),
            item.body.trim() === (item.title || '').trim() ? null : h('div', { className: 'pp-body' }, item.body),
          ),
          item.kind === 'snippet'
            ? h('span', { className: 'pp-kind' }, translate('kind.snippet'))
            : item.kind === 'skill'
              ? h('span', { className: 'pp-kind' }, translate('kind.skill'))
              : null,
          h(
            'div',
            { className: 'pp-actions' },
            h(IconButton, {
              name: item.pinned === true ? 'starFill' : 'star',
              label: translate(item.pinned === true ? 'row.unpin' : 'row.pin'),
              active: item.pinned === true,
              onClick: () => poolActions.togglePin(item.id),
            }),
            h(IconButton, { name: 'up', label: translate('row.up'), disabled: index === 0, onClick: () => poolActions.move(item.id, -1) }),
            h(IconButton, {
              name: 'down',
              label: translate('row.down'),
              disabled: index === items.length - 1,
              onClick: () => poolActions.move(item.id, 1),
            }),
            h(IconButton, { name: 'insert', label: translate('row.insert'), onClick: () => sendToComposer({ type: 'insert', text: item.body }, translate('status.inserted')) }),
            h(IconButton, { name: 'edit', label: translate('row.edit'), onClick: () => setEditing({ id: item.id, kind: item.kind, title: item.title, body: item.body, categoryId: item.categoryId || '' }) }),
            h(IconButton, { name: 'copy', label: translate('row.duplicate'), onClick: () => poolActions.duplicateItem(item.id) }),
            h(IconButton, { name: 'trash', label: translate('row.delete'), danger: true, onClick: () => poolActions.remove(item.id) }),
          ),
        );
      };

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
            : tab === 'workspace'
              ? renderWorkspacePanes({
                  rail: rail,
                  items: items,
                  activeId: wsActive,
                  onSelect: setWsSelected,
                  counts: wsCounts,
                  renderRow: rowOf,
                  emptyText: translate('ws.empty'),
                })
              : items.length === 0
                ? h(
                    'div',
                    { className: 'pp-empty' },
                    translate(
                      state.items.length === 0
                        ? 'page.empty'
                        : tab === 'pinned' && !state.items.some((item) => item.pinned === true)
                          ? 'page.emptyPinned'
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
      const row = (key, label, hint) =>
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
        );
      return h(
        'div',
        { className: 'pp-settings' },
        h('style', null, CSS),
        h('div', { className: 'pp-set-title' }, translate('settings.title')),
        h('div', { className: 'pp-hint', style: { marginBottom: '6px' } }, translate('settings.desc')),
        row('workspaceTabs', 'settings.workspaceTabs', 'settings.workspaceTabsHint'),
        row('currentWorkspaceTab', 'settings.currentWorkspaceTab', 'settings.currentWorkspaceTabHint'),
      );
    }

    // ------------------------------------------------------------------ panel
    function PromptPoolPanel(props) {
      useLocaleTick();
      const state = usePoolState();
      const view = useUiState();
      const workspaces = useWorkspaceDir();

      // This view can read the workspace roster; publish it for both views.
      const wsSnapshot = typeof props.useWorkspaces === 'function' ? props.useWorkspaces(selectAllInput) : undefined;
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
      const [confirming, setConfirming] = useState(false);
      const [status, setStatus] = useState(null);
      const [busy, setBusy] = useState(false);
      const [skills, setSkills] = useState({ status: 'idle', sessionId: undefined, items: [], error: '' });

      const loadSkills = useCallback(async (sessionId) => {
        const remote = resolveSkillRemote();
        if (!remote || typeof remote.list !== 'function') {
          setSkills({ status: 'error', sessionId, items: [], error: translate('skill.unavailable') });
          return;
        }
        setSkills({ status: 'loading', sessionId, items: [], error: '' });
        try {
          const result = await remote.list({ sessionId });
          if (result && result.ok === true) {
            const value = result.value || {};
            const list = Array.isArray(value.skills) ? value.skills : [];
            setSkills({ status: 'ready', sessionId, items: list, error: '' });
            return;
          }
          const failure = (result && result.error) || {};
          const message = failure.message || failure.code || translate('skill.failed');
          setSkills({ status: 'error', sessionId, items: [], error: String(message) });
        } catch (error) {
          setSkills({ status: 'error', sessionId, items: [], error: String((error && error.message) || error) });
        }
      }, []);

      useEffect(() => {
        if (!view.open || tab !== 'skill') return;
        if (skills.status === 'loading') return;
        if (skills.sessionId === props.sessionId && skills.status !== 'idle') return;
        loadSkills(props.sessionId);
      }, [view.open, tab, skills.status, skills.sessionId, props.sessionId, loadSkills]);

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
        if (!target || target.indexOf('cat:') !== 0) return;
        poolActions.removeCategory(target.slice(4));
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
        for (const item of state.items) if (item.categoryId) counts[item.categoryId] = (counts[item.categoryId] || 0) + 1;
        return counts;
      }, [state.items]);

      const items = useMemo(
        () => (tab === 'workspace' ? state.items.filter((item) => item.categoryId === wsActive) : state.items.filter((item) => matchesTab(item, tab))),
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
          kind: 'note',
          title: firstLine(text),
          body: text,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        setDraft('');
        flash({ kind: 'ok', text: translate('status.saved') });
      };

      const newItem = () => {
        const nextKind = tab === 'snippet' ? 'snippet' : 'note';
        const inWorkspace = tab === 'workspace';
        const categoryId = inWorkspace ? wsActive : categoryIdOf(tab) || '';
        // A skill tab holds a fetched catalog, not pool rows: land on the list first.
        if (!inWorkspace && !categoryId) setTab(nextKind);
        const item = poolActions.add({
          id: uid(),
          kind: nextKind,
          title: '',
          body: '',
          categoryId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        setEditing({ id: item.id, kind: nextKind, title: '', body: '', categoryId });
      };

      const startEdit = (item) => setEditing({ id: item.id, kind: item.kind, title: item.title, body: item.body, categoryId: item.categoryId || '' });

      const saveEdit = () => {
        if (!editing) return;
        if (!editing.body.trim()) {
          flash({ kind: 'error', text: translate('status.emptyBody') });
          return;
        }
        poolActions.patch(editing.id, {
          kind: editing.kind,
          title: editing.title.trim(),
          body: editing.body,
          categoryId: editing.categoryId || '',
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
            h('textarea', {
              className: 'pp-textarea',
              value: editing.body,
              placeholder: translate('row.bodyPlaceholder'),
              rows: 4,
              autoFocus: true,
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
                  value: editing.categoryId || 'kind:' + (editing.kind === 'snippet' ? 'snippet' : 'note'),
                  'aria-label': translate('row.classification'),
                  onChange: (event) => setEditing(withClassification(editing, event.target.value)),
                },
                h(
                  'optgroup',
                  { label: translate('row.kindLabel') },
                  h('option', { value: 'kind:note' }, translate('kind.note')),
                  h('option', { value: 'kind:snippet' }, translate('kind.snippet')),
                ),
                workspaces.items.length > 0
                  ? h(
                      'optgroup',
                      { label: translate('tab.workspace') },
                      workspaces.items.map((workspace) => h('option', { key: workspace.id, value: workspace.id }, workspace.name)),
                    )
                  : null,
                state.categories.length > 0
                  ? h(
                      'optgroup',
                      { label: translate('row.categoryLabel') },
                      state.categories.map((category) => h('option', { key: category.id, value: 'cat:' + category.id }, category.name)),
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
          h(TrayAdd, { label: translate('row.select'), onClick: () => poolActions.addToTray(item.id) }),
          h(
            'div',
            { className: 'pp-main', title: translate('row.insert'), onClick: () => insertItem(item) },
            h('div', { className: 'pp-title' }, item.title || item.body.split('\n')[0] || translate('kind.untitled')),
            item.body.trim() === (item.title || '').trim() ? null : h('div', { className: 'pp-body' }, item.body),
          ),
          item.kind === 'snippet'
            ? h('span', { className: 'pp-kind' }, translate('kind.snippet'))
            : item.kind === 'skill'
              ? h('span', { className: 'pp-kind' }, translate('kind.skill'))
              : null,
          h(
            'div',
            { className: 'pp-actions' },
            h(IconButton, {
              name: item.pinned === true ? 'starFill' : 'star',
              label: translate(item.pinned === true ? 'row.unpin' : 'row.pin'),
              active: item.pinned === true,
              onClick: () => poolActions.togglePin(item.id),
            }),
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

      const addSkillToTray = (skill) => {
        const id = 'skill:' + skill.name;
        let item = pool.get().items.find((entry) => entry.id === id);
        if (!item) {
          item = poolActions.add({
            id,
            kind: 'skill',
            title: '/' + skill.name,
            body: '/' + skill.name + ' ',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
        poolActions.addToTray(item.id);
      };

      const skillRowOf = (skill) => {
        const id = 'skill:' + skill.name;
        return h(
          'div',
          { key: id, className: 'pp-row' },
          h(TrayAdd, { label: translate('row.select'), onClick: () => addSkillToTray(skill) }),
          h(
            'div',
            { className: 'pp-main', title: translate('skill.insert', { name: skill.name }), onClick: () => insertItem({ body: '/' + skill.name + ' ' }) },
            h('div', { className: 'pp-title' }, '/' + skill.name),
            skill.description ? h('div', { className: 'pp-body' }, String(skill.description)) : null,
          ),
          skill.modelInvocable === false ? h('span', { className: 'pp-kind' }, translate('skill.userOnly')) : null,
        );
      };

      const skillGroups = SKILL_SCOPES.map((scope) => [scope, skills.items.filter((skill) => scopeOfSkill(skill) === scope)]).filter(
        (entry) => entry[1].length > 0,
      );
      const skillScoped = skills.items.some((skill) => typeof skill.source === 'string' && skill.source !== '');

      const renderSkillList = () => {
        if (skills.status === 'idle' || skills.status === 'loading') return h('div', { className: 'pp-empty' }, translate('skill.loading'));
        if (skills.status === 'error') return h('div', { className: 'pp-empty' }, translate('skill.failed') + '：' + skills.error);
        if (skills.items.length === 0) return h('div', { className: 'pp-empty' }, translate('skill.empty'));
        if (!skillScoped) return skills.items.map(skillRowOf);
        return skillGroups.map((entry) =>
          h(
            'div',
            { key: entry[0] },
            h(
              'div',
              { className: 'pp-group' },
              translate('skill.group.' + entry[0]),
              h('span', { className: 'pp-hint' }, String(entry[1].length)),
            ),
            entry[1].map(skillRowOf),
          ),
        );
      };

      const panelCount = tab === 'skill' ? skills.items.length : state.items.length;

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
          tab === 'skill'
            ? h('button', { type: 'button', className: 'pp-mini', onClick: () => loadSkills(props.sessionId) }, translate('skill.refresh'))
            : h('button', { type: 'button', className: 'pp-mini', onClick: newItem }, '＋ ', translate('panel.new')),
        ),
        pendingCategory ? h(CategoryDeleteConfirm, { onConfirm: confirmCategoryDelete, onCancel: () => setPendingCategory(null) }) : null,
        h(
          'div',
          { className: 'pp-list' },
          settingsOpen
            ? h(PromptPoolSettings, null)
            : tab === 'workspace'
              ? renderWorkspacePanes({
                  rail: rail,
                  items: items,
                  activeId: wsActive,
                  onSelect: setWsSelected,
                  counts: wsCounts,
                  renderRow: rowOf,
                  emptyText: translate('ws.empty'),
                })
              : tab === 'skill'
                ? renderSkillList()
                : items.length === 0
                  ? h(
                      'div',
                      { className: 'pp-empty' },
                      translate(
                        state.items.length === 0
                          ? 'panel.empty'
                          : tab === 'pinned' && !state.items.some((item) => item.pinned === true)
                            ? 'page.emptyPinned'
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
      '.pp-panel,.pp-page,.pp-settings,.pp-root{--pp-accent:var(--dsw-alias-brand-primary);--pp-accent-soft:color-mix(in srgb,var(--dsw-alias-brand-primary) 13%,transparent);--pp-accent-line:color-mix(in srgb,var(--dsw-alias-brand-primary) 55%,transparent);--pp-ink:var(--dsw-alias-label-primary);--pp-ink-2:var(--dsw-alias-label-secondary);--pp-line:var(--dsw-alias-border-l1);--pp-line-2:var(--dsw-alias-border-l2);--pp-surface:var(--dsw-alias-bg-layer-1);--pp-surface-2:var(--dsw-alias-bg-overlay);--pp-hover:var(--dsw-alias-interactive-bg-hover,var(--dsw-alias-bg-layer-2));--pp-danger:var(--dsw-alias-state-error-primary);--pp-danger-soft:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);--pp-ok:var(--dsw-alias-state-success-primary);--pp-on-accent:#ffffff}' +
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
      '.pp-tab-sep{flex:none;width:1px;height:14px;margin:0 3px;background:var(--pp-line)}' +
      '.pp-tab-x{margin-left:4px;padding:0 2px;border-radius:4px;font-size:11px;line-height:1;color:var(--pp-ink-2)}' +
      '.pp-tab-x:hover{color:var(--pp-danger)}' +
      '.pp-tab-input{height:24px;width:110px;padding:0 7px;border:1px solid var(--pp-accent);border-radius:7px;background:var(--dsw-alias-bg-base);color:inherit;font:inherit;font-size:12px;outline:none}' +
      '.pp-confirm{display:flex;flex-direction:column;gap:6px;padding:8px 12px;border-bottom:1px solid var(--pp-line);background:var(--pp-surface)}' +
      '.pp-confirm-text{font-size:12px;line-height:1.6;color:var(--pp-ink)}' +
      '.pp-mini{height:24px;padding:0 9px;border-radius:7px;border:1px solid var(--pp-line);background:transparent;color:var(--pp-ink);font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}' +
      '.pp-mini:hover{background:var(--pp-hover)}' +
      '.pp-set-btn{display:inline-flex;align-items:center;gap:5px;padding:0 9px}' +
      '.pp-set-btn[data-active="true"]{border-color:var(--pp-accent);color:var(--pp-accent)}' +
      '.pp-set-btn-icon{display:inline-flex;align-items:center}' +
      '.pp-list{overflow-y:auto;padding:2px 6px 8px;flex:1;min-height:0}' +
      '.pp-page{display:flex;flex-direction:column;height:100%;min-height:0;background:var(--dsw-alias-bg-base);color:var(--pp-ink);font-size:13px;line-height:1.5}' +
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
      '.pp-page-body{flex:1;min-height:0;overflow-y:auto;padding:6px 8px 20px}' +
      '.pp-ws{display:flex;flex-direction:column;gap:8px;min-width:0}' +
      '.pp-ws-rail{display:flex;flex-wrap:wrap;align-items:center;gap:4px;min-width:0}' +
      '.pp-ws-tab{display:inline-flex;align-items:center;gap:5px;max-width:100%;min-width:0;padding:3px 9px;border:1px solid var(--pp-line);border-radius:999px;background:transparent;color:var(--pp-ink-2);font:inherit;font-size:12px;line-height:18px;cursor:pointer}' +
      '.pp-ws-tab:hover{background:var(--pp-hover);color:var(--pp-ink)}' +
      '.pp-ws-tab[data-active="true"]{background:var(--pp-accent-soft);border-color:var(--pp-accent);color:var(--pp-accent);font-weight:600}' +
      '.pp-ws-name{min-width:0;max-width:168px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.pp-ws-count{flex:none;font-size:10px;font-variant-numeric:tabular-nums;color:var(--pp-ink-2)}' +
      '.pp-ws-body{min-width:0}' +
      '.pp-page-foot{display:flex;flex-direction:column;gap:6px;padding:10px 12px;border-top:1px solid var(--pp-line);background:var(--pp-surface);max-height:55%;overflow-y:auto}' +
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
      '.pp-toggle{width:22px;height:22px;flex:none;margin-top:-1px;border:0;border-radius:6px;background:transparent;color:var(--pp-ink-2);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0}' +
      '.pp-toggle:hover{background:var(--pp-hover);color:var(--pp-ink)}' +
      '.pp-toggle[data-selected="true"]{color:var(--pp-accent)}' +
      '.pp-main{flex:1;min-width:0;cursor:pointer}' +
      '.pp-title{font-size:12.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.pp-body{color:var(--pp-ink-2);font-size:12px;white-space:pre-wrap;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word}' +
      '.pp-kind{flex:none;margin-top:2px;padding:0 5px;border-radius:5px;border:1px solid var(--pp-accent-line);background:var(--pp-accent-soft);color:var(--pp-accent);font-size:10px;line-height:15px}' +
      '.pp-actions{display:flex;gap:2px;opacity:0;flex:none}' +
      '.pp-row:hover .pp-actions,.pp-row:focus-within .pp-actions{opacity:1}' +
      '.pp-icon{width:22px;height:22px;border:0;border-radius:6px;background:transparent;color:var(--pp-ink-2);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;flex:none}' +
      '.pp-icon:hover{background:var(--pp-surface);color:var(--pp-ink)}' +
      '.pp-icon:disabled{opacity:.35;cursor:default}' +
      '.pp-icon[data-danger="true"]:hover{color:var(--pp-danger)}' +
      '.pp-icon[data-active="true"]{color:var(--pp-accent)}' +
      '.pp-edit{padding:8px;border-radius:8px;background:var(--pp-surface);border:1px solid var(--pp-line);display:flex;flex-direction:column;gap:6px}' +
      '.pp-input,.pp-textarea{width:100%;box-sizing:border-box;border:1px solid var(--pp-line);border-radius:6px;background:var(--dsw-alias-bg-base);color:var(--pp-ink);font:inherit;font-size:12px;padding:5px 7px;outline:none;resize:vertical}' +
      '.pp-input:focus,.pp-textarea:focus{border-color:var(--pp-accent)}' +
      '.pp-textarea{min-height:64px}' +
      '.pp-edit-actions{display:flex;gap:6px;align-items:center;justify-content:flex-end}' +
      '.pp-primary{height:28px;padding:0 14px;border-radius:8px;border:1px solid var(--pp-accent);background:var(--pp-accent);color:var(--pp-on-accent);font:inherit;font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap}' +
      '.pp-primary:hover{filter:brightness(1.06)}' +
      '.pp-primary:disabled{opacity:.5;cursor:default}' +
      '.pp-link{border:0;background:transparent;color:var(--pp-ink-2);font:inherit;font-size:11px;cursor:pointer;padding:0;text-decoration:underline;text-underline-offset:2px}' +
      '.pp-link:hover{color:var(--pp-ink)}' +
      '.pp-foot{border-top:1px solid var(--pp-line);padding:8px 12px 10px;display:flex;flex-direction:column;gap:6px;background:var(--pp-surface)}' +
      '.pp-foot-head{display:flex;align-items:center;gap:6px}' +
      '.pp-tray{display:flex;flex-direction:column;gap:6px;max-height:260px;overflow-y:auto}' +
      '.pp-foot .pp-tray{max-height:min(40vh,220px)}' +
      '.pp-chip{display:flex;align-items:flex-start;gap:6px;padding:5px 7px;border-radius:8px;border:1px solid var(--pp-line);background:var(--pp-surface-2);min-width:0}' +
      '.pp-chip-actions{display:flex;gap:2px;flex:none;align-self:flex-start}' +
      '.pp-chip-n{flex:none;padding-top:1px;font-size:11px;line-height:1.55;font-variant-numeric:tabular-nums;color:var(--pp-ink-2)}' +
      '.pp-chip-t{flex:1;min-width:0;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;font-size:12px;line-height:1.55;color:var(--pp-ink)}' +
      '.pp-chip .pp-icon{width:18px;height:18px}' +
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
