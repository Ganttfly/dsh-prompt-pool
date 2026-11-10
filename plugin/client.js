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
    /** The sidebar tool tab this plugin owns; it also names the open tab. */
    const SIDEBAR_TAB_ID = 'prompt-pool:pool';
    /** Native right-sidebar registry identity (DSH 0.2) and the page kind it opens. */
    const NATIVE_TAB_ID = 'dsh-prompt-pool';
    const NATIVE_TAB_KIND = 'prompt-pool';
    /** Shown in the settings about card; keep in step with plugin/package.json. */
    const PLUGIN_VERSION = '0.1.92';
    const PLUGIN_AUTHOR = 'GanttShen';
    /** Replace once the public repository exists; the row hides while it is empty. */
    const PLUGIN_REPO = 'https://github.com/ganttfly/dsh-prompt-pool';
    /** The sidebar service, kept so the page can correct a restored tab title. */
    let sidebarService = null;
    const IMAGE_DB = 'dsh-prompt-pool-images.v1';
    const IMAGE_STORE = 'images';
    const MAX_IMAGES = 6;
    const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
    const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    const EMPTY_PENDING = [];

    // ---------------------------------------------------------------- locale
    const ZH = {
      'button.label': '提示池',
      'button.pending': '待发送 {n} 条',
      'panel.title': '提示池',
      'panel.close': '关闭',
      'panel.capture': '存草稿',
      'panel.captureHint': '把输入框里的内容复制一份存进池子；输入框里的字会保留',
      'panel.resize': '拖动调整高度，双击还原',
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
      'page.title': '提示池',
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
      'sidebar.label': '提示池',
      'settings.nav': '提示池',
      'settings.open': '提示池设置',
      'settings.button': '设置',
      'settings.tab.order': '分组',
      'settings.display': '分组怎么显示',
      'settings.table': '分组的顺序与显示',
      'settings.tableHint': '箭头调整先后顺序；右侧三列决定这一组怎么显示。',
      'settings.tableGroup': '分组',
      'settings.tableOrder': '顺序',
      'settings.moveUp': '上移',
      'settings.moveDown': '下移',
      'settings.display.builtin': '内置分组',
      'settings.display.custom': '自定义分组',
      'settings.display.workspace': '工作区分组',
      'settings.mode.tabs': '展开',
      'settings.mode.nested': '折叠',
      'settings.mode.hidden': '隐藏',
      'settings.tab.workspace': '工作区',
      'settings.tab.prompts': '提示词',
      'settings.keep': '用过之后，条目留在池子里吗',
      'settings.keepInsert': '插入输入框后，仍旧保留在池子中',
      'settings.keepInsertHint': '关闭后，插入成功的条目会从池子移出；提示条上的「撤销」可以恢复。',
      'settings.keepQueue': '加入待发送队列后，仍旧保留在池子中',
      'settings.keepQueueHint': '关闭后，条目一加入队列就从池子移出；队列里的那一条不受影响。',
      'settings.about': '插件信息',
      'settings.aboutAuthor': '作者',
      'settings.aboutRepo': '仓库',
      'settings.tab.display': '展示',
      'settings.customNested': '自定义分组折叠成一个 Tab',
      'settings.customNestedHint': '分组多时打开：Tab 行只保留一个「自定义」，组内用横排胶囊切换。',
      'settings.workspaceCard': '工作区如何展示',
        'settings.workspacesVisible': '显示哪些工作区',
        'settings.workspacesCurrent': '当前',
        'settings.workspacesEmpty': '还没有读到工作区列表。打开一次提示池页面后，这里会列出全部工作区。',
      'settings.leading': '哪一组排在前面',
      'settings.leading.workspace': '工作区',
      'settings.leading.custom': '自定义分组',
      'settings.leading.builtin': '内置分组',
      'settings.leadingHint': '「全部」始终在最前；这里决定它后面先出现哪一组，另外两组按固定顺序跟随。',
      'settings.reload': '重新加载界面',
      'settings.reloadHint': '插件代码更新后，界面不会自动换新。点这里重新加载（比重启应用快）。',
      'settings.title': '提示池',
      'settings.desc': '控制提示池 Tab 的显示方式。改动立即生效。',
      'settings.workspaceTabs': '在工作区 Tab 中列出全部工作区',
      'settings.workspaceTabsHint': '「工作区」Tab 里用横向胶囊切换工作区；关掉后只保留当前工作区。',
      'settings.currentWorkspaceTab': '当前工作区排在最前',
      'settings.currentWorkspaceTabHint': '当前会话所属的工作区固定排第一；其余按原顺序。',
      'settings.label': '提示池',
      'row.edit': '编辑',
      'row.delete': '删除',
      'row.deleteTitle': '删除这条提示词',
      'row.deleteConfirm': '「{title}」会从池子里移出。',
      'row.deleteAction': '删除',
      'row.up': '上移',
      'row.down': '下移',
      'row.save': '保存',
      'row.cancel': '取消',
      'row.titlePlaceholder': '标题（可留空）',
      'row.bodyPlaceholder': '提示词内容',
      'image.add': '添加图片',
      'image.pasteHint': '或直接 Ctrl+V 粘贴',
      'image.remove': '移除图片',
      'image.only': '图片',
      'image.inserted': '已插入图片',
      'image.insertFailed': '图片插入失败',
      'image.missing': '有图片已丢失，请重新添加',
      'image.tooMany': '最多只能添加 {n} 张图片',
      'image.badType': '只支持 PNG / JPEG / WebP / GIF 图片',
      'image.tooLarge': '图片不能超过 {n} MB',
      'row.familyBuiltin': '内置',
      'row.familyCustom': '自定义',
      'row.familyWorkspace': '工作区分组',
      'tab.familyBuiltin': '内置分组',
      'row.categoryLabel': '自定义分组',
      'row.classification': '分组',
      'page.new': '提示词',
      'row.noCategory': '未分组',
      'tray.title': '待发送队列',
      'tray.selected': '已选 {n} 条',
      'tray.release': '发送',
      'tray.clear': '清空',
      'tray.clearTitle': '清空待发送队列',
      'tray.clearConfirm': '队列里的 {n} 条会被一起移出，这个操作不能撤销。',
      'tray.clearAction': '清空',
      'tray.empty': '还没选中任何条目，点左侧「＋」加入',
      'tray.remove': '移出',
      'tray.removeTitle': '移出这一条',
      'tray.removeConfirm': '「{title}」会从待发送队列移出；这条如果在队列里改过，改动不会保留。',
      'tray.removeAction': '移出',
      'tray.duplicate': '复制一份，追加到末尾',
      'tray.hint': '释放后会按这个顺序排队，当前这轮结束后自动接着执行。',
      'tray.queue': '队列中 {n}',
      'tray.collapseTitle': '收起待发送队列',
      'tray.expandTitle': '展开待发送队列',
      'confirm.title': '将按此顺序排队 {n} 条：',
      'confirm.ok': '确认释放',
      'confirm.cancel': '再想想',
      'status.saved': '已存入池子',
      'status.savedTextOnly': '已存入池子，但这 {n} 个附件没有一起保存',
      'status.nothing': '草稿是空的，先写点什么',
      'status.emptyBody': '内容不能是空的',
      'status.inserted': '已插入到输入框',
      'status.insertedAndRemoved': '已插入到输入框，并从池子移出',
      'status.queuedAndRemoved': '已加入待发送队列，并从池子移出',
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
      'button.pending': '{n} waiting to send',
      'panel.title': 'Prompt pool',
      'panel.close': 'Close',
      'panel.capture': 'Save draft',
      'panel.captureHint': 'Copy the composer draft into the pool; the composer keeps its text',
      'panel.resize': 'Drag to resize, double-click to reset',
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
      'settings.open': 'Prompt pool settings',
      'settings.button': 'Settings',
      'settings.tab.order': 'Groups',
      'settings.display': 'How groups show up',
      'settings.table': 'Group order and display',
      'settings.tableHint': 'Use the arrows to reorder; the three columns decide how each family shows up.',
      'settings.tableGroup': 'Group',
      'settings.tableOrder': 'Order',
      'settings.moveUp': 'Move up',
      'settings.moveDown': 'Move down',
      'settings.display.builtin': 'Built-in groups',
      'settings.display.custom': 'Custom groups',
      'settings.display.workspace': 'Workspace groups',
      'settings.mode.tabs': 'Expanded',
      'settings.mode.nested': 'Folded',
      'settings.mode.hidden': 'Hidden',
      'settings.tab.workspace': 'Workspaces',
      'settings.tab.prompts': 'Prompts',
      'settings.keep': 'What happens to an item once it is used',
      'settings.keepInsert': 'Keep it in the pool after inserting it into the composer',
      'settings.keepInsertHint': 'Turned off, an inserted item leaves the pool; the toast offers an undo.',
      'settings.keepQueue': 'Keep it in the pool after adding it to the send queue',
      'settings.keepQueueHint': 'Turned off, the item leaves the pool as soon as it is queued; the queued copy stays.',
      'settings.about': 'Plugin info',
      'settings.aboutAuthor': 'Author',
      'settings.aboutRepo': 'Repository',
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
      'row.deleteTitle': 'Delete this prompt',
      'row.deleteConfirm': '{title} will be removed from the pool.',
      'row.deleteAction': 'Delete',
      'row.up': 'Move up',
      'row.down': 'Move down',
      'row.save': 'Save',
      'row.cancel': 'Cancel',
      'row.titlePlaceholder': 'Title (optional)',
      'row.bodyPlaceholder': 'Prompt text',
      'image.add': 'Add image',
      'image.pasteHint': 'or paste with Ctrl+V',
      'image.remove': 'Remove image',
      'image.only': 'Image',
      'image.inserted': 'Image inserted',
      'image.insertFailed': 'Could not insert the image',
      'image.missing': 'An image is missing; add it again',
      'image.tooMany': 'At most {n} images',
      'image.badType': 'Only PNG / JPEG / WebP / GIF images are supported',
      'image.tooLarge': 'Each image must be under {n} MB',
      'row.familyBuiltin': 'Built-in',
      'row.familyCustom': 'Custom',
      'row.familyWorkspace': 'Workspace groups',
      'tab.familyBuiltin': 'Built-in groups',
      'row.categoryLabel': 'Custom',
      'row.classification': 'Group',
      'page.new': 'Prompt',
      'row.noCategory': 'Ungrouped',
      'tray.title': 'Send queue',
      'tray.selected': '{n} selected',
      'tray.release': 'Send',
      'tray.clear': 'Clear',
      'tray.clearTitle': 'Clear the send queue',
      'tray.clearConfirm': 'All {n} queued items are removed at once. This cannot be undone.',
      'tray.clearAction': 'Clear',
      'tray.empty': 'Nothing selected yet — use the ＋ control on a row',
      'tray.remove': 'Remove',
      'tray.removeTitle': 'Remove this queued item',
      'tray.removeConfirm': '{title} will be removed from the send queue. Edits made to this queued copy are lost.',
      'tray.removeAction': 'Remove',
      'tray.duplicate': 'Duplicate and append to the end',
      'tray.hint': 'Released items queue up in this order and run as soon as the current turn ends.',
      'tray.queue': '{n} in queue',
      'tray.collapseTitle': 'Collapse the send queue',
      'tray.expandTitle': 'Expand the send queue',
      'confirm.title': 'Queue {n} in this order:',
      'confirm.ok': 'Queue them',
      'confirm.cancel': 'Not yet',
      'status.saved': 'Saved to the pool',
      'status.savedTextOnly': 'Saved to the pool; {n} attachment(s) were not captured',
      'status.nothing': 'The composer is empty',
      'status.emptyBody': 'The content cannot be empty',
      'status.inserted': 'Inserted into the composer',
      'status.insertedAndRemoved': 'Inserted, and removed from the pool',
      'status.queuedAndRemoved': 'Queued, and removed from the pool',
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
    let skillsFace = null;
    let workspaceFace = null;
    let sessionsFace = null;
    let conversationFace = null;

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

    /** The name an item shows under, also used when a confirmation names it. */
    function itemLabel(item) {
      const image = item.images && item.images[0];
      return item.title
        || firstLine(item.body)
        || (image && (image.name || translate('image.only')))
        || translate('group.untitled');
    }

    /**
     * A readable title for a captured draft. The composer publishes chips in their
     * clipboard form (`@name(dsh-session:…)`, `@C:\dir\file.docx`), which is far
     * too long for a row title; only the display name survives. The body keeps the
     * original text so inserting it back still sends the same reference.
     * `occurrences` carries the exact chip ranges when the host publishes them.
     */
    function draftTitle(text, occurrences) {
      const source = String(text || '');
      let cleaned = source;
      const chips = Array.isArray(occurrences) ? occurrences.slice() : [];
      if (chips.length > 0) {
        // Replace from the end so the earlier offsets stay valid.
        chips.sort((left, right) => Number(right.offset) - Number(left.offset));
        for (const chip of chips) {
          const start = Number(chip.offset);
          const length = Number(chip.length);
          const label = String(chip.label || '').trim();
          if (!Number.isFinite(start) || !Number.isFinite(length) || !label) continue;
          if (start < 0 || start + length > cleaned.length) continue;
          cleaned = cleaned.slice(0, start) + '@' + label + cleaned.slice(start + length);
        }
      }
      cleaned = cleaned
        // Hosts without chip metadata: drop the machine id and the directory chain.
        .replace(/\((?:dsh-[a-z0-9-]+):[^)]*\)/gi, '')
        .replace(/(^|\s)@[A-Za-z]:\\(?:[^\\\n]*\\)+/g, (match, lead) => lead + '@')
        .replace(/(^|\s)@(?:[^\s\\\n]*\/)+/g, (match, lead) => lead + '@')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
      return firstLine(cleaned || source);
    }

    // ------------------------------------------------------------- local images
    function isImageType(type) {
      return IMAGE_TYPES.indexOf(String(type || '').toLowerCase()) >= 0;
    }

    function imageTypeOf(file) {
      const type = String((file && file.type) || '').toLowerCase();
      if (isImageType(type)) return type;
      const name = String((file && file.name) || '').toLowerCase();
      if (/\.png$/.test(name)) return 'image/png';
      if (/\.jpe?g$/.test(name)) return 'image/jpeg';
      if (/\.webp$/.test(name)) return 'image/webp';
      if (/\.gif$/.test(name)) return 'image/gif';
      return '';
    }

    function imagePathOf(file) {
      try {
        const bridge = typeof window !== 'undefined' ? window.__DSH_HOST_PATHS__ : null;
        if (bridge && typeof bridge.pathFor === 'function') {
          const value = bridge.pathFor(file);
          if (typeof value === 'string') return value;
        }
      } catch (_error) {
        /* the desktop path bridge is optional */
      }
      return typeof (file && file.path) === 'string' ? file.path : '';
    }

    /** Only metadata enters localStorage; the bytes live in IndexedDB. */
    function normalizeImages(raw) {
      if (!Array.isArray(raw)) return [];
      return raw
        .slice(0, MAX_IMAGES)
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return null;
          const id = typeof entry.id === 'string' ? entry.id : '';
          const type = String(entry.type || '').toLowerCase();
          if (!id || !isImageType(type)) return null;
          const thumb =
            typeof entry.thumb === 'string' && entry.thumb.length <= 200000 && /^data:image\//.test(entry.thumb) ? entry.thumb : '';
          return {
            id,
            type,
            name: typeof entry.name === 'string' ? entry.name : '',
            path: typeof entry.path === 'string' ? entry.path : '',
            size: Number.isFinite(entry.size) ? entry.size : 0,
            thumb,
          };
        })
        .filter(Boolean);
    }

    let imageDbPromise = null;

    function openImageDb() {
      if (typeof indexedDB === 'undefined') return Promise.reject(new Error('image-store-unavailable'));
      if (!imageDbPromise) {
        imageDbPromise = new Promise((resolve, reject) => {
          const request = indexedDB.open(IMAGE_DB, 1);
          request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(IMAGE_STORE)) db.createObjectStore(IMAGE_STORE);
          };
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error || new Error('image-store-unavailable'));
          request.onblocked = () => reject(new Error('image-store-blocked'));
        });
      }
      return imageDbPromise;
    }

    function putImageBlob(id, blob) {
      return openImageDb().then(
        (db) =>
          new Promise((resolve, reject) => {
            const tx = db.transaction(IMAGE_STORE, 'readwrite');
            tx.objectStore(IMAGE_STORE).put(blob, id);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error || new Error('image-store-failed'));
            tx.onabort = () => reject(tx.error || new Error('image-store-failed'));
          }),
      );
    }

    function getImageBlob(id) {
      return openImageDb().then(
        (db) =>
          new Promise((resolve, reject) => {
            const tx = db.transaction(IMAGE_STORE, 'readonly');
            const request = tx.objectStore(IMAGE_STORE).get(id);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error || new Error('image-read-failed'));
          }),
      );
    }

    /** A small data-URL thumbnail keeps the list rendering synchronous. */
    function makeImageThumb(file) {
      return new Promise((resolve) => {
        let settled = false;
        const finish = (value) => {
          if (settled) return;
          settled = true;
          resolve(value);
        };
        const render = (source, width, height) => {
          try {
            const scale = Math.min(1, 128 / Math.max(width || 1, height || 1));
            const w = Math.max(1, Math.round((width || 1) * scale));
            const h = Math.max(1, Math.round((height || 1) * scale));
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const context = canvas.getContext('2d');
            if (!context) {
              finish('');
              return;
            }
            context.drawImage(source, 0, 0, w, h);
            let data = '';
            try {
              data = canvas.toDataURL('image/webp', 0.72);
            } catch (_error) {
              data = '';
            }
            if (!data) data = canvas.toDataURL('image/jpeg', 0.72);
            finish(data);
          } catch (_error) {
            finish('');
          }
        };
        const viaUrl = () => {
          try {
            const url = URL.createObjectURL(file);
            const image = new Image();
            image.onload = () => {
              URL.revokeObjectURL(url);
              render(image, image.naturalWidth, image.naturalHeight);
            };
            image.onerror = () => {
              URL.revokeObjectURL(url);
              finish('');
            };
            image.src = url;
          } catch (_error) {
            finish('');
          }
        };
        if (typeof createImageBitmap === 'function') {
          createImageBitmap(file)
            .then((bitmap) => {
              render(bitmap, bitmap.width, bitmap.height);
              if (typeof bitmap.close === 'function') bitmap.close();
            })
            .catch(viaUrl);
        } else {
          viaUrl();
        }
      });
    }

    async function createImageAsset(file) {
      const type = imageTypeOf(file);
      if (!type) throw new Error(translate('image.badType'));
      if (Number(file.size) > MAX_IMAGE_BYTES) throw new Error(translate('image.tooLarge', { n: Math.round(MAX_IMAGE_BYTES / (1024 * 1024)) }));
      const thumb = await makeImageThumb(file);
      const asset = {
        id: uid(),
        name: typeof file.name === 'string' && file.name ? file.name : 'image',
        type,
        path: imagePathOf(file),
        size: Number(file.size) || 0,
        thumb,
      };
      await putImageBlob(asset.id, file);
      return asset;
    }

    async function appendImageAssets(files, existing, onError) {
      const list = Array.isArray(existing) ? existing.slice() : [];
      const incoming = Array.isArray(files) ? files : [];
      if (incoming.length === 0) return list;
      const room = MAX_IMAGES - list.length;
      if (room <= 0) {
        if (onError) onError(translate('image.tooMany', { n: MAX_IMAGES }));
        return list;
      }
      if (incoming.length > room && onError) onError(translate('image.tooMany', { n: MAX_IMAGES }));
      for (const file of incoming.slice(0, room)) {
        try {
          list.push(await createImageAsset(file));
        } catch (error) {
          if (onError) onError(String((error && error.message) || error));
        }
      }
      return list;
    }

    function sanitizeItem(raw) {
      if (!raw || typeof raw !== 'object') return null;
      const body = typeof raw.body === 'string' ? raw.body : '';
      const images = normalizeImages(raw.images);
      if (!body.trim() && images.length === 0) return null;
      const now = Date.now();
      return {
        id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
        group: groupOf(raw),
        title: typeof raw.title === 'string' ? raw.title : '',
        body,
        images,
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
      const rest = flags.order;
      return [
        // 全部 always anchors the row; the chosen block leads the rest.
        { id: 'all', label: translate('tab.all'), group: 'all' },
        ...rest.reduce((list, name) => list.concat(blocks[name]), []),
      ];
    }

    /** Shared confirm modal: backdrop click and Escape both cancel. */
    function ConfirmModal(props) {
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
          { className: 'pp-modal-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': props.label },
          h('div', { className: 'pp-modal-text' }, props.text),
          h(
            'div',
            { className: 'pp-modal-actions' },
            h('button', { type: 'button', className: 'pp-mini', onClick: props.onCancel }, props.cancelText),
            h('button', { type: 'button', className: 'pp-primary', autoFocus: true, onClick: props.onConfirm }, props.confirmText),
          ),
        ),
      );
    }

    /** Confirmation for deleting one of the user's own tabs, as a modal. */
    function CategoryDeleteConfirm(props) {
      return h(ConfirmModal, {
        label: translate('tab.delete'),
        text: translate('tab.deleteConfirm'),
        cancelText: translate('tab.cancelAction'),
        confirmText: translate('tab.deleteAction'),
        onCancel: props.onCancel,
        onConfirm: props.onConfirm,
      });
    }

    /** Confirmation before the queue is dropped in one click. */
    function TrayClearConfirm(props) {
      return h(ConfirmModal, {
        label: translate('tray.clearTitle'),
        text: translate('tray.clearConfirm', { n: props.count }),
        cancelText: translate('row.cancel'),
        confirmText: translate('tray.clearAction'),
        onCancel: props.onCancel,
        onConfirm: props.onConfirm,
      });
    }

    /** Confirmation before one pool item is deleted. */
    function ItemDeleteConfirm(props) {
      return h(ConfirmModal, {
        label: translate('row.deleteTitle'),
        text: translate('row.deleteConfirm', { title: props.title }),
        cancelText: translate('row.cancel'),
        confirmText: translate('row.deleteAction'),
        onCancel: props.onCancel,
        onConfirm: props.onConfirm,
      });
    }

    /** Confirmation before one queued occurrence leaves the send queue. */
    function TrayRemoveConfirm(props) {
      return h(ConfirmModal, {
        label: translate('tray.removeTitle'),
        text: translate('tray.removeConfirm', { title: props.title }),
        cancelText: translate('row.cancel'),
        confirmText: translate('tray.removeAction'),
        onCancel: props.onCancel,
        onConfirm: props.onConfirm,
      });
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
        return item ? { key: uid(), itemId: raw, body: item.body, images: normalizeImages(item.images) } : null;
      }
      if (!raw || typeof raw !== 'object') return null;
      const itemId = typeof raw.itemId === 'string' ? raw.itemId : '';
      const source = byId.get(itemId);
      const body = typeof raw.body === 'string' ? raw.body : source ? source.body : '';
      const images = normalizeImages(Array.isArray(raw.images) ? raw.images : source ? source.images : []);
      if (!body.trim() && images.length === 0) return null;
      return { key: typeof raw.key === 'string' && raw.key ? raw.key : uid(), itemId, body, images };
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
      // Keep the stored seed level: `Boolean(...)` collapsed 2 to false, so a
      // reload re-added every seed item the user had deleted.
      return { version: POOL_VERSION, categories, items, tray, settings: normalizeSettings(data && data.settings), seeded: Number(data && data.seeded) || 0 };
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
      const leaders = ['builtin', 'workspace', 'custom'];
      const modes = ['tabs', 'nested', 'hidden'];
      const defaults = { builtin: 'tabs', custom: 'tabs', workspace: 'nested' };
      const stored = settings.display && typeof settings.display === 'object' ? settings.display : {};
      const display = {};
      for (const family of ['builtin', 'custom', 'workspace']) {
        const value = stored[family];
        // Legacy: the old customNested flag folded custom groups.
        const legacy = family === 'custom' && settings.customNested === true ? 'nested' : undefined;
        display[family] = modes.indexOf(value) >= 0 ? value : legacy || defaults[family];
      }
      return {
        hiddenWorkspaces: Array.isArray(settings.hiddenWorkspaces)
          ? settings.hiddenWorkspaces.filter((value) => typeof value === 'string' && value !== '')
          : [],
        currentWorkspaceTab: settings.currentWorkspaceTab !== false,
        queueCollapsed: settings.queueCollapsed === true,
        // Whether an item leaves the pool after it is used.
        keepAfterInsert: settings.keepAfterInsert !== false,
        keepAfterQueue: settings.keepAfterQueue !== false,
        // 0 keeps the default height; anything else is a dragged height in px.
        panelHeight: (() => {
          const value = Number(settings.panelHeight);
          return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
        })(),
        orderExplicit: settings.orderExplicit === true,
        order: (() => {
          const stored = Array.isArray(settings.order) ? settings.order.filter((name) => leaders.indexOf(name) >= 0) : [];
          // The pre-table default (workspace, custom, builtin) is replaced once by the
          // new default; any order the user picked in the table is kept.
          const legacyDefault =
            settings.orderExplicit !== true &&
            stored.length === 3 &&
            stored[0] === 'workspace' &&
            stored[1] === 'custom' &&
            stored[2] === 'builtin';
          const seed = stored.length === 3 && !legacyDefault ? stored : leaders;
          return [...seed, ...leaders.filter((name) => seed.indexOf(name) < 0)];
        })(),
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
          // The folded built-in tab names the whole family, like the settings table does.
          builtin: translate('tab.familyBuiltin'),
          custom: translate('row.familyCustom'),
          workspace: translate('row.familyWorkspace'),
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
        mutate((state) => ({
          ...state,
          settings: {
            ...normalizeSettings(state.settings),
            [key]: value,
            ...(key === 'order' ? { orderExplicit: true } : {}),
          },
        }));
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
          return { ...state, tray: [...state.tray, { key: uid(), itemId, body: item.body, images: normalizeImages(item.images) }] };
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
          return h(
            'svg',
            base,
            h('rect', { x: 4.3, y: 4.3, width: 5.5, height: 5.5, rx: 1.1 }),
            h('path', { d: 'M4.3 7.6H2.6A1.2 1.2 0 0 1 1.4 6.4V2.6A1.2 1.2 0 0 1 2.6 1.4h3.8a1.2 1.2 0 0 1 1.2 1.2v1.7' }),
          );
        case 'insert':
          return h('svg', base, h('path', { d: 'M1.8 3.4v5.2M2 6h5.2M5.4 3.9L7.6 6 5.4 8.1' }), h('path', { d: 'M9.2 2.2h.8v7.6h-.8' }));
        case 'close':
          return h('svg', base, h('path', { d: 'M3 3l6 6M9 3l-6 6' }));
        case 'chevronDown':
          return h('svg', base, h('path', { d: 'M3 4.5L6 7.5l3-3' }));
        case 'chevronUp':
          return h('svg', base, h('path', { d: 'M3 7.5L6 4.5l3 3' }));
        case 'image':
          return h(
            'svg',
            base,
            h('rect', { x: 1.6, y: 2.2, width: 8.8, height: 7.6, rx: 1.2 }),
            h('circle', { cx: 4.2, cy: 4.8, r: 0.9 }),
            h('path', { d: 'M2.2 8.4l2.6-2.4 2.2 1.9 1.7-1.5 1.7 1.7' }),
          );
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
      const queued = count > 0;
      const hint = queued ? translate('button.pending', { n: count }) : label;
      return h(
        React.Fragment,
        null,
        h('style', { key: 'css' }, CSS),
        h(
          'button',
          {
            key: 'btn',
            type: 'button',
            className: 'pp-btn pp-root pp-trigger',
            'data-pp-trigger': 'true',
            'data-open': view.open ? 'true' : 'false',
            'data-queued': queued ? 'true' : 'false',
            title: hint,
            'aria-label': hint,
            'aria-haspopup': 'dialog',
            'aria-expanded': view.open ? 'true' : 'false',
            onMouseDown: (event) => event.preventDefault(),
            onClick: () => ui.set({ open: !ui.get().open }),
          },
          icon('pool'),
          h('span', { className: 'pp-trigger-label' }, label),
          queued ? h('span', { className: 'pp-badge' }, String(count)) : null,
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

    /** Small thumbnail row for an item, a queue chip, or the image editor. */
    function ImageStrip(props) {
      const list = Array.isArray(props.images) ? props.images : [];
      const limit = typeof props.max === 'number' ? props.max : list.length;
      const visible = list.slice(0, limit);
      if (visible.length === 0) return null;
      return h(
        'div',
        { className: 'pp-images' + (props.compact === true ? ' pp-images-compact' : '') },
        visible.map((image) =>
          h(
            'span',
            {
              key: image.id,
              className: 'pp-image',
              title: image.name || image.path || '',
              role: props.onOpen ? 'button' : undefined,
              tabIndex: props.onOpen ? 0 : undefined,
              onClick: props.onOpen
                ? (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    props.onOpen(image);
                  }
                : undefined,
              onKeyDown: props.onOpen
                ? (event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    event.stopPropagation();
                    props.onOpen(image);
                  }
                : undefined,
            },
            image.thumb
              ? h('img', { src: image.thumb, alt: image.name || '', draggable: false })
              : h('span', { className: 'pp-image-empty' }, icon('image')),
            props.onRemove
              ? h(
                  'button',
                  {
                    type: 'button',
                    className: 'pp-image-x',
                    title: translate('image.remove'),
                    'aria-label': translate('image.remove'),
                    onClick: (event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      props.onRemove(image);
                    },
                  },
                  '×',
                )
              : null,
          ),
        ),
        list.length > visible.length ? h('span', { className: 'pp-image-more' }, '+' + String(list.length - visible.length)) : null,
      );
    }

    /** Pick local images, write the bytes to IndexedDB, keep a small thumb in the item. */
    function ImagePicker(props) {
      const inputRef = useRef(null);
      const [busy, setBusy] = useState(false);
      const list = Array.isArray(props.images) ? props.images : [];
      const addFiles = async (files) => {
        if (!files || files.length === 0) return;
        setBusy(true);
        try {
          const next = await appendImageAssets(files, list, props.onError);
          props.onChange(next);
        } finally {
          setBusy(false);
        }
      };
      return h(
        'div',
        { className: 'pp-image-picker' },
        h(ImageStrip, {
          images: list,
          onRemove: (image) => props.onChange(list.filter((entry) => entry.id !== image.id)),
          onOpen: props.onOpen,
        }),
        h(
          'button',
          {
            type: 'button',
            className: 'pp-mini pp-image-add',
            disabled: busy,
            onClick: () => {
              if (inputRef.current) inputRef.current.click();
            },
          },
          '＋ ',
          translate('image.add'),
        ),
        h('span', { className: 'pp-hint' }, translate('image.pasteHint')),
        h('input', {
          ref: inputRef,
          type: 'file',
          accept: IMAGE_TYPES.join(','),
          multiple: true,
          style: { display: 'none' },
          onChange: (event) => {
            const files = Array.from(event.target.files || []);
            event.target.value = '';
            addFiles(files);
          },
        }),
      );
    }

    /** Full-size preview state for one thumbnail click. */
    function useImagePreview() {
      const [preview, setPreview] = useState(null);
      const token = useRef(0);
      const objectUrl = useRef('');
      const openImage = (image) => {
        if (!image) return;
        const current = ++token.current;
        setPreview({ url: image.thumb || '', name: image.name || '' });
        getImageBlob(image.id)
          .then((blob) => {
            if (!blob || current !== token.current) return;
            const next = URL.createObjectURL(blob);
            if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
            objectUrl.current = next;
            setPreview({ url: next, name: image.name || '' });
          })
          .catch(() => {
            /* keep the thumbnail */
          });
      };
      const closeImage = () => {
        token.current += 1;
        if (objectUrl.current) {
          URL.revokeObjectURL(objectUrl.current);
          objectUrl.current = '';
        }
        setPreview(null);
      };
      useEffect(
        () => () => {
          token.current += 1;
          if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
        },
        [],
      );
      useEffect(() => {
        if (!preview) return undefined;
        const onKey = (event) => {
          if (event.key !== 'Escape') return;
          event.preventDefault();
          event.stopPropagation();
          closeImage();
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
      }, [preview]);
      return { preview, openImage, closeImage };
    }

    function ImageLightbox(props) {
      if (!props.preview) return null;
      const name = props.preview.name || translate('image.only');
      return h(
        'div',
        { className: 'pp-lightbox', role: 'dialog', 'aria-modal': 'true', onClick: props.onClose },
        h(
          'div',
          { className: 'pp-lightbox-body', onClick: (event) => event.stopPropagation() },
          props.preview.url
            ? h('img', { src: props.preview.url, alt: name })
            : h('div', { className: 'pp-lightbox-empty' }, translate('image.missing')),
          h(
            'div',
            { className: 'pp-lightbox-bar' },
            h('span', { className: 'pp-lightbox-name' }, name),
            h(
              'button',
              {
                type: 'button',
                className: 'pp-lightbox-close',
                title: translate('panel.close'),
                'aria-label': translate('panel.close'),
                onClick: props.onClose,
              },
              '✕',
            ),
          ),
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
      const queueCollapsed = state.settings && state.settings.queueCollapsed === true;
      const workspaces = useWorkspaceDir();
      const sessionHint = useSessionDir().sessionId;
      const pageSessionId = (props && ((props.scope && props.scope.sessionId) || props.sessionId)) || '';
      const workspaceList = workspaces && Array.isArray(workspaces.items) ? workspaces.items : [];
      const pageWorkspace = pageSessionId
        ? workspaceList.find((entry) => Array.isArray(entry.sessionIds) && entry.sessionIds.indexOf(pageSessionId) >= 0)
        : null;
      const pageWorkspaceId = pageWorkspace ? pageWorkspace.workspaceId : '';
      const currentWorkspaceId = pageWorkspaceId || (workspaces && workspaces.currentId) || '';
      // No panel mounted, so no published session: borrow one from this workspace.
      const workspaceSession = (() => {
        const current = workspaceList.find((entry) => entry.workspaceId === currentWorkspaceId);
        const pool = current && Array.isArray(current.sessionIds) ? current.sessionIds : [];
        return pool.length > 0 ? pool[pool.length - 1] : '';
      })();
      const activeSessionId = pageSessionId || sessionHint || workspaceSession || '';
      const [tab, setTab] = useState('all');
      const [query, setQuery] = useState('');
      const [editing, setEditing] = useState(null);
      const [trayEditing, setTrayEditing] = useState(null);
      const [settingsOpen, setSettingsOpen] = useState(false);
      const [pendingCategory, setPendingCategory] = useState(null);
      const [confirmClear, setConfirmClear] = useState(false);
      const [pendingDelete, setPendingDelete] = useState(null);
      const [pendingRemove, setPendingRemove] = useState(null);
      const [wsSelected, setWsSelected] = useState('');
      const [customPick, setCustomPick] = useState('');
      const [builtinPick, setBuiltinPick] = useState('');
      const [status, setStatus] = useState(null);
      const { preview, openImage, closeImage } = useImagePreview();
      const statusTimer = useRef(0);
      const flash = useCallback((next) => {
        setStatus(next);
        window.clearTimeout(statusTimer.current);
        statusTimer.current = window.setTimeout(() => setStatus(null), 5000);
      }, []);
      useEffect(() => () => window.clearTimeout(statusTimer.current), []);
      const trayRef = useRef(null);
      const trayCount = state.tray.length;
      const lastTrayCount = useRef(trayCount);
      useEffect(() => {
        if (trayCount > lastTrayCount.current) {
          const node = trayRef.current;
          if (node) node.scrollTop = node.scrollHeight;
        }
        lastTrayCount.current = trayCount;
      }, [trayCount]);
      // A release can empty the queue while the confirm is up; drop the prompt
      // with it so it cannot pop back when the next item is queued.
      useEffect(() => {
        if (trayCount === 0) setConfirmClear(false);
      }, [trayCount]);
      // A capture appends to the end of the list; keep the new row in view.
      const pageListRef = useRef(null);
      const pageItemCount = state.items.length;
      const lastPageItemCount = useRef(pageItemCount);
      useEffect(() => {
        if (pageItemCount > lastPageItemCount.current && pageListRef.current) {
          pageListRef.current.scrollTop = pageListRef.current.scrollHeight;
        }
        lastPageItemCount.current = pageItemCount;
      }, [pageItemCount]);
      useEffect(() => {
        if (!pageWorkspaceId) return;
        const snapshot = workspaceDir.get();
        if (snapshot.currentId === pageWorkspaceId) return;
        workspaceDir.set({ ...snapshot, currentId: pageWorkspaceId });
      }, [pageWorkspaceId]);
      // A tab restored from the stored sidebar layout keeps the title saved with
      // it, so an old label would survive both a reload and a language switch.
      useEffect(() => {
        const service = sidebarService;
        if (!service || typeof service.updateTab !== 'function') return;
        try {
          service.updateTab(SIDEBAR_TAB_ID, { title: translate('page.title') }, pageSessionId || undefined);
        } catch (_error) {
          /* a closed tab is a no-op for the sidebar */
        }
      }, [pageSessionId]);

      const confirmCategoryDelete = () => {
        const target = pendingCategory;
        setPendingCategory(null);
        if (!target || target.indexOf('custom:') !== 0) return;
        poolActions.removeCategory(target.slice(7));
        if (tab === target) setTab('all');
      };

      const rail = workspaceRail(workspaces.items, state.settings, currentWorkspaceId);
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
        if (!trayEditing.body.trim() && !(trayEditing.images && trayEditing.images.length)) {
          flash({ kind: 'error', text: translate('status.emptyBody') });
          return;
        }
        poolActions.patchTray(trayEditing.key, { body: trayEditing.body, images: trayEditing.images || [] });
        setTrayEditing(null);
      };

      const pasteTrayImages = (files) => {
        const key = trayEditing && trayEditing.key;
        appendImageAssets(files, trayEditing && trayEditing.images ? trayEditing.images : [], (text) => flash({ kind: 'error', text })).then((images) => {
          setTrayEditing((current) => (current && current.key === key ? { ...current, images } : current));
        });
      };

      const sendToComposer = async (command, okText, onSuccess) => {
        let result;
        try {
          result = await bridge.request(command);
        } catch (error) {
          result = { ok: false, reason: String((error && error.message) || error) };
        }
        if (result && result.ok) {
          flash({ kind: 'ok', text: okText });
          if (typeof onSuccess === 'function') onSuccess();
          return;
        }
        const reason = result && result.reason;
        let text = command && command.type === 'insert' ? translate('status.insertFailed') : translate('status.noComposer');
        if (reason === 'draft-busy') text = translate('status.draftBusy');
        else if (reason === 'empty') text = translate('status.emptyBody');
        else if (command && command.type === 'insert' && reason === 'unavailable') text = translate('status.noComposer');
        else if (command && command.type === 'insert' && typeof reason === 'string' && reason !== 'insert-failed' && reason !== 'bad-command') text = reason;
        flash({ kind: 'error', text });
      };

      /** The page cannot read the composer, so the mounted panel performs it. */
      const captureDraft = () => {
        let result;
        try {
          result = bridge.request({ type: 'capture' });
        } catch (error) {
          result = { ok: false, reason: String((error && error.message) || error) };
        }
        Promise.resolve(result).then(
          (value) => {
            if (value && value.ok) {
              const skipped = Number(value.skipped) || 0;
              flash(skipped > 0
                ? { kind: 'info', text: translate('status.savedTextOnly', { n: skipped }) }
                : { kind: 'ok', text: translate('status.saved') });
              return;
            }
            const reason = value && value.reason;
            flash({ kind: 'error', text: translate(reason === 'empty' ? 'status.nothing' : 'status.noComposer') });
          },
          () => flash({ kind: 'error', text: translate('status.noComposer') }),
        );
      };

      const save = () => {
        if (!editing) return;
        if (!editing.body.trim() && (!editing.images || editing.images.length === 0)) {
          flash({ kind: 'error', text: translate('status.emptyBody') });
          return;
        }
        poolActions.patch(editing.id, {
          group: editing.group,
          title: editing.title.trim(),
          body: editing.body,
          images: editing.images || [],
        });
        setEditing(null);
        flash({ kind: 'ok', text: translate('status.savedToPool') });
      };

      const pasteImages = (files) => {
        const id = editing && editing.id;
        appendImageAssets(files, editing && editing.images ? editing.images : [], (text) => flash({ kind: 'error', text })).then((images) => {
          setEditing((current) => (current && current.id === id ? { ...current, images } : current));
        });
      };

      /** The confirmed delete: drop the item, then offer the same undo as the panel. */
      const removeItem = (item, text) => {
        const index = pool.get().items.findIndex((entry) => entry.id === item.id);
        poolActions.remove(item.id);
        flash({
          kind: 'info',
          text: text || translate('status.deleted', { title: itemLabel(item) }),
          undo: () => {
            poolActions.restore(item, index);
            setStatus(null);
          },
        });
      };

      /** Queue one occurrence, dropping it from the pool when retention is off. */
      const queueItem = (item) => {
        const before = pool.get().tray.length;
        poolActions.addToTray(item.id);
        if (pool.get().tray.length === before) return;
        if (!normalizeSettings(state.settings).keepAfterQueue) removeItem(item, translate('status.queuedAndRemoved'));
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
          images: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        setEditing({ id: item.id, group, title: '', body: '', images: [] });
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
              sessionId: activeSessionId,
              onChange: (event) => setEditing({ ...editing, body: event.target.value }),
              onPasteImages: pasteImages,
              onKeyDown: (event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault();
                  save();
                }
              },
            }),
            h(ImagePicker, {
              images: editing.images || [],
              onChange: (images) => setEditing((current) => (current ? { ...current, images } : current)),
              onError: (text) => flash({ kind: 'error', text }),
              onOpen: openImage,
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
          h(IconButton, {
            name: 'insert',
            label: translate('row.insert'),
            onClick: () => sendToComposer(
              { type: 'insert', text: item.body, images: normalizeImages(item.images) },
              item.body.trim() ? translate('status.inserted') : translate('image.inserted'),
              () => {
                if (!normalizeSettings(state.settings).keepAfterInsert) removeItem(item, translate('status.insertedAndRemoved'));
              },
            ),
          }),
          h(TrayAdd, { label: translate('row.select'), onClick: () => queueItem(item) }),
          h(
            'div',
            { className: 'pp-main', onClick: () => setEditing({ id: item.id, group: groupOf(item), title: item.title, body: item.body, images: normalizeImages(item.images) }) },
            h('div', { className: 'pp-title' }, item.title || item.body.split('\n')[0] || (item.images && item.images[0] && (item.images[0].name || translate('image.only'))) || translate('group.untitled')),
            item.body.trim() === (item.title || '').trim() ? null : h('div', { className: 'pp-body' }, item.body),
            h(ImageStrip, { images: item.images, compact: true, onOpen: openImage }),
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
            h(IconButton, { name: 'edit', label: translate('row.edit'), onClick: () => setEditing({ id: item.id, group: groupOf(item), title: item.title, body: item.body, images: normalizeImages(item.images) }) }),
            h(IconButton, { name: 'copy', label: translate('row.duplicate'), onClick: () => poolActions.duplicateItem(item.id) }),
            h(IconButton, { name: 'trash', label: translate('row.delete'), danger: true, onClick: () => setPendingDelete(item) }),
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
          h('button', { type: 'button', className: 'pp-mini', title: translate('panel.captureHint'), onClick: captureDraft }, translate('panel.capture')),
          h(SettingsButton, { active: settingsOpen, onClick: () => setSettingsOpen(!settingsOpen) }),
        ),
        h(
          'div',
          { className: 'pp-bar', style: { padding: '8px 12px 2px' } },
          h(TabBar, {
            tabs: buildTabs(state.categories, workspaces.items, state.settings, currentWorkspaceId),
            active: tab,
            ...tabHandlers((next) => {
              setSettingsOpen(false);
              setTab(next);
            }, tab),
            onDelete: (id) => setPendingCategory(id),
          }),
        ),
        pendingCategory ? h(CategoryDeleteConfirm, { onConfirm: confirmCategoryDelete, onCancel: () => setPendingCategory(null) }) : null,
        confirmClear && state.tray.length > 0
          ? h(TrayClearConfirm, {
              count: state.tray.length,
              onConfirm: () => {
                poolActions.clearTray();
                setConfirmClear(false);
              },
              onCancel: () => setConfirmClear(false),
            })
          : null,
        pendingDelete
          ? h(ItemDeleteConfirm, {
              title: itemLabel(pendingDelete),
              onCancel: () => setPendingDelete(null),
              onConfirm: () => {
                removeItem(pendingDelete);
                setPendingDelete(null);
              },
            })
          : null,
        pendingRemove && state.tray.some((entry) => entry.key === pendingRemove.key)
          ? h(TrayRemoveConfirm, {
              title: itemLabel(pendingRemove),
              onCancel: () => setPendingRemove(null),
              onConfirm: () => {
                poolActions.removeTray(pendingRemove.key);
                setPendingRemove(null);
              },
            })
          : null,
        h(
          'div',
          { className: 'pp-page-body', ref: pageListRef },
          settingsOpen
            ? h(PromptPoolSettings, { currentWorkspaceId })
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
          { className: 'pp-queue-dock' },
          status
            ? h(
                'div',
                { className: 'pp-status pp-status-float', 'data-kind': status.kind || 'info' },
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
          settingsOpen
          ? null
          : queueCollapsed
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'pp-queue-strip',
                  title: translate('tray.expandTitle'),
                  'aria-label': translate('tray.expandTitle'),
                  'aria-expanded': 'false',
                  onClick: () => poolActions.setSetting('queueCollapsed', false),
                },
                h('span', { className: 'pp-queue-strip-action' }, icon('chevronUp')),
                h('span', { className: 'pp-queue-strip-title' }, translate('tray.title')),
                h('span', { className: 'pp-hint' }, translate('tray.selected', { n: state.tray.length })),
                h('span', { className: 'pp-grow' }),
              )
            : h(
              'div',
              { className: 'pp-page-foot' },
              h(
                'div',
                { className: 'pp-foot-head' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'pp-queue-toggle',
                    title: translate('tray.collapseTitle'),
                    'aria-label': translate('tray.collapseTitle'),
                    'aria-expanded': 'true',
                    onClick: () => poolActions.setSetting('queueCollapsed', true),
                  },
                  h('span', { className: 'pp-queue-toggle-icon' }, icon('chevronDown')),
                ),
                h('span', { className: 'pp-foot-title' }, translate('tray.title')),
                h('span', { className: 'pp-hint' }, translate('tray.selected', { n: state.tray.length })),
                h('span', { className: 'pp-grow' }),
                state.tray.length > 0
                  ? h('button', { type: 'button', className: 'pp-link', onClick: () => setConfirmClear(true) }, translate('tray.clear'))
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
                ? h(
                    'div',
                    { className: 'pp-tray pp-tray-empty', ref: trayRef },
                    h('div', { className: 'pp-hint' }, translate('tray.empty')),
                  )
                : h(
                    'div',
                    {
                      className: 'pp-tray',
                      ref: trayRef,
                    },
                    state.tray.map((entry, index) => {
                      if (trayEditing && trayEditing.key === entry.key) {
                        return h(
                          'div',
                          { key: entry.key, className: 'pp-edit', style: { margin: '4px 0' } },
                          h(MentionField, {
                            value: trayEditing.body,
                            placeholder: translate('row.bodyPlaceholder'),
                            rows: 4,
                            autoFocus: true,
                            sessionId: activeSessionId,
                            onChange: (event) => setTrayEditing((current) => (current ? { ...current, body: event.target.value } : current)),
                            onPasteImages: pasteTrayImages,
                            onKeyDown: (event) => {
                              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                                event.preventDefault();
                                saveTrayEdit();
                              }
                            },
                          }),
                          h(ImagePicker, {
                            images: trayEditing.images || [],
                            onChange: (images) => setTrayEditing((current) => (current ? { ...current, images } : current)),
                            onError: (text) => flash({ kind: 'error', text }),
                            onOpen: openImage,
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
                        h('div', { className: 'pp-chip-t', title: entry.body }, entry.body),
                        h(ImageStrip, { images: entry.images, compact: true, max: 4, onOpen: openImage }),
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
                            onClick: () => setTrayEditing({ key: entry.key, body: entry.body || '', images: normalizeImages(entry.images) }),
                          }),
                          h(IconButton, { name: 'copy', label: translate('tray.duplicate'), onClick: () => poolActions.duplicateTray(entry.key) }),
                          h(IconButton, { name: 'close', label: translate('tray.remove'), onClick: () => setPendingRemove(entry) }),
                        ),
                      );
                    }),
                  ),
            ),
        h(ImageLightbox, { preview, onClose: closeImage }),
        ),
      );
    }

    /** Body of the native right-sidebar tab (DSH 0.2); the slot forwards the session. */
    function PromptPoolSidebarTab(props) {
      const sessionId = (props && props.sessionId) || (props && props.tab && props.tab.sessionId) || '';
      return h(PromptPoolPage, { ...props, scope: { sessionId }, sessionId });
    }

    /** Live chip title for the native tab, so a language switch is not frozen in. */
    function PromptPoolSidebarTitle() {
      useLocaleTick();
      return h(
        'span',
        { style: { display: 'inline-flex', alignItems: 'center', gap: '5px' } },
        h(PromptPoolIcon, { size: 14 }),
        translate('page.title'),
      );
    }

    // --------------------------------------------------------------- settings
    function PromptPoolSettings(props) {
      useLocaleTick();
      const state = usePoolState();
      const settings = normalizeSettings(state.settings);
      const wsDir = useWorkspaceDir();
      const wsItems = wsDir && Array.isArray(wsDir.items) ? wsDir.items : [];
      const wsCurrentId = (props && typeof props.currentWorkspaceId === 'string' && props.currentWorkspaceId) || (wsDir && typeof wsDir.currentId === 'string' ? wsDir.currentId : '');
      const hiddenWorkspaces = settings.hiddenWorkspaces;
      const toggleWorkspace = (workspaceId) => {
        const next = hiddenWorkspaces.indexOf(workspaceId) >= 0
          ? hiddenWorkspaces.filter((value) => value !== workspaceId)
          : [...hiddenWorkspaces, workspaceId];
        poolActions.setSetting('hiddenWorkspaces', next);
      };
      const [section, setSection] = useState('order');
      const moveOrder = (index, delta) => {
        const order = settings.order.slice();
        const to = index + delta;
        if (to < 0 || to >= order.length) return;
        const [moved] = order.splice(index, 1);
        order.splice(to, 0, moved);
        poolActions.setSetting('order', order);
      };
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
        h('div', { className: 'pp-hint', style: { marginBottom: '10px' } }, translate('settings.desc')),
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
          h(
            'button',
            {
              type: 'button',
              className: 'pp-tab',
              'data-active': section === 'prompts' ? 'true' : 'false',
              onClick: () => setSection('prompts'),
            },
            translate('settings.tab.prompts'),
          ),
        ),
        h(
          'div',
          { className: 'pp-set-group pp-set-card', style: { display: section === 'prompts' ? '' : 'none' } },
          h('div', { className: 'pp-set-label' }, translate('settings.keep')),
          check('keepAfterInsert', 'settings.keepInsert', 'settings.keepInsertHint'),
          h('div', { className: 'pp-set-divider' }),
          check('keepAfterQueue', 'settings.keepQueue', 'settings.keepQueueHint'),
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
          h('div', { className: 'pp-set-label' }, translate('settings.table')),
          h('div', { className: 'pp-hint pp-set-hint' }, translate('settings.tableHint')),
          h(
            'div',
            { className: 'pp-set-tr pp-set-th' },
            h('span', null, translate('settings.tableGroup')),
            ['tabs', 'nested', 'hidden'].map((mode) =>
              h('span', { key: mode, className: 'pp-set-th-cell' }, translate('settings.mode.' + mode)),
            ),
            h('span', { className: 'pp-set-th-cell' }, translate('settings.tableOrder')),
          ),
          settings.order.map((family, index) =>
            h(
              'div',
              { key: family, className: 'pp-set-tr' },
              h('span', { className: 'pp-set-td-name' }, translate('settings.display.' + family)),
              ['tabs', 'nested', 'hidden'].map((mode) =>
                h(
                  'span',
                  { key: mode, className: 'pp-set-td-cell' },
                  h('input', {
                    type: 'radio',
                    name: 'pp-display-' + family,
                    checked: settings.display[family] === mode,
                    onChange: () => poolActions.setSetting('display', { ...settings.display, [family]: mode }),
                  }),
                ),
              ),
              h(
                'span',
                { className: 'pp-set-td-order' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'pp-mini',
                    disabled: index === 0,
                    title: translate('settings.moveUp'),
                    onClick: () => moveOrder(index, -1),
                  },
                  '↑',
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'pp-mini',
                    disabled: index === settings.order.length - 1,
                    title: translate('settings.moveDown'),
                    onClick: () => moveOrder(index, 1),
                  },
                  '↓',
                ),
              ),
            ),
          ),
        ),
        // Always visible, whichever tab is open: who made this and what it needs.
        h(
          'div',
          { className: 'pp-set-group pp-set-card pp-about' },
          h('div', { className: 'pp-set-label' }, translate('settings.about')),
          h(
            'div',
            { className: 'pp-about-name' },
            translate('settings.title'),
            h('span', { className: 'pp-about-version' }, 'v' + PLUGIN_VERSION),
          ),
          h('div', { className: 'pp-hint pp-about-desc' }, translate('tab.description')),
          h(
            'div',
            { className: 'pp-about-row' },
            h('span', { className: 'pp-about-key' }, translate('settings.aboutAuthor')),
            h('span', null, PLUGIN_AUTHOR),
          ),
          PLUGIN_REPO
            ? h(
                'div',
                { className: 'pp-about-row' },
                h('span', { className: 'pp-about-key' }, translate('settings.aboutRepo')),
                h('a', { className: 'pp-link', href: PLUGIN_REPO, target: '_blank', rel: 'noreferrer' }, PLUGIN_REPO.replace(/^https?:\/\//, '')),
              )
            : null,
        ),
      );
    }

    // ------------------------------------------------------------- completions
    /** Lazy views of the two data sources; both may mount after this plugin. */
    function completionService(key) {
      if (key === 'remote') return remoteFace || serviceOf(pluginCtx, 'remote');
      if (key === 'uiWorkspace') return workspaceFace || serviceOf(pluginCtx, 'uiWorkspace');
      if (key === 'sessions') return sessionsFace || serviceOf(pluginCtx, 'sessions');
      if (key === 'skills') {
        if (skillsFace) return skillsFace;
        try {
          return remoteFace && remoteFace.skills ? remoteFace.skills : null;
        } catch (_error) {
          return null;
        }
      }
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
      const [menuFrame, setMenuFrame] = useState(null);
      const field = useRef(null);

      const close = () => {
        setToken(null);
        setItems([]);
        setNote('');
        setActive(0);
      };

      /** The menu is fixed-positioned so a scrolling queue tray cannot clip it. */
      const placeMenu = () => {
        const node = field.current;
        if (!node || typeof node.getBoundingClientRect !== 'function' || typeof window === 'undefined') {
          setMenuFrame(null);
          return;
        }
        const rect = node.getBoundingClientRect();
        const gap = 4;
        const roomBelow = window.innerHeight - rect.bottom - gap;
        const roomAbove = rect.top - gap;
        const openUp = roomBelow < 140 && roomAbove > roomBelow;
        const width = Math.max(160, Math.min(rect.width || 220, window.innerWidth - 16));
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
        const maxHeight = Math.max(90, Math.min(220, (openUp ? roomAbove : roomBelow) - 8));
        if (openUp) {
          setMenuFrame({ left, width, maxHeight, bottom: window.innerHeight - rect.top + gap, top: undefined });
        } else {
          setMenuFrame({ left, width, maxHeight, top: rect.bottom + gap, bottom: undefined });
        }
      };

      useEffect(() => {
        if (!token) return undefined;
        const update = () => placeMenu();
        window.addEventListener('resize', update);
        document.addEventListener('scroll', update, true);
        return () => {
          window.removeEventListener('resize', update);
          document.removeEventListener('scroll', update, true);
        };
      }, [token]);

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
        placeMenu();
        setNote(translate('mention.loading'));
        if (char === '/') {
          const skills = completionService('skills');
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
          // A synchronous throw here used to escape the handler and leave the menu
          // parked on "loading", so every failure is converted into a visible note.
          let request;
          try {
            request = Promise.resolve(
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
          } catch (error) {
            window.clearTimeout(timer);
            setItems([]);
            setNote(
              translate('mention.failed') + '：' + String((error && error.message) || error).slice(0, 90) + ' · ' + sessionTag(),
            );
            return;
          }
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
            try {
              openFor(event.target.value, event.target.selectionStart || 0);
            } catch (error) {
              setItems([]);
              setNote(translate('mention.failed') + '：' + String((error && error.message) || error).slice(0, 90));
            }
          },
          onPaste: (event) => {
            if (props.onPaste) props.onPaste(event);
            const data = event.clipboardData;
            if (!data || typeof props.onPasteImages !== 'function') return;
            const files = [];
            if (data.items) {
              for (const item of Array.from(data.items)) {
                if (item.kind !== 'file') continue;
                const file = item.getAsFile();
                if (file && imageTypeOf(file)) files.push(file);
              }
            }
            if (files.length === 0 && data.files) {
              for (const file of Array.from(data.files)) if (imageTypeOf(file)) files.push(file);
            }
            if (files.length === 0) return;
            event.preventDefault();
            props.onPasteImages(files);
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
              {
                className: 'pp-mention-menu',
                style: menuFrame
                  ? {
                      position: 'fixed',
                      left: menuFrame.left,
                      width: menuFrame.width,
                      maxHeight: menuFrame.maxHeight,
                      right: 'auto',
                      top: typeof menuFrame.top === 'number' ? menuFrame.top : 'auto',
                      bottom: typeof menuFrame.bottom === 'number' ? menuFrame.bottom : 'auto',
                      marginTop: 0,
                      marginBottom: 0,
                      zIndex: 2147482000,
                    }
                  : { position: 'fixed', left: -9999, top: -9999 },
              },
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
      const currentWorkspaceId = wsCurrent;
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
      // Attachments are browser-owned ids, not text, so a capture cannot keep them.
      const attachmentCount = input && Array.isArray(input.attachmentIds) ? input.attachmentIds.length : 0;
      const occurrences = input && Array.isArray(input.occurrences) ? input.occurrences : [];

      const draftRef = useRef('');
      draftRef.current = draft;
      const attachmentRef = useRef(0);
      attachmentRef.current = attachmentCount;
      const occurrenceRef = useRef([]);
      occurrenceRef.current = occurrences;
      const phaseRef = useRef('plain');
      phaseRef.current = phase;
      const queueRef = useRef([]);
      queueRef.current = queue;
      const sessionSelector = typeof props.useSession === 'function' ? props.useSession : null;
      const pendingSubmissions = sessionSelector
        ? sessionSelector((snapshot) => (snapshot && Array.isArray(snapshot.pendingSubmissions) ? snapshot.pendingSubmissions : EMPTY_PENDING))
        : EMPTY_PENDING;
      const pendingRef = useRef([]);
      pendingRef.current = Array.isArray(pendingSubmissions) ? pendingSubmissions : EMPTY_PENDING;
      const busyRef = useRef(false);

      const [tab, setTab] = useState('all');
      const [query, setQuery] = useState('');
      const [editing, setEditing] = useState(null);
      const [trayEditing, setTrayEditing] = useState(null);
      const [settingsOpen, setSettingsOpen] = useState(false);
      const [pendingCategory, setPendingCategory] = useState(null);
      const [wsSelected, setWsSelected] = useState('');
      const [customPick, setCustomPick] = useState('');
      const [builtinPick, setBuiltinPick] = useState('');
      const [confirmClear, setConfirmClear] = useState(false);
      const [pendingDelete, setPendingDelete] = useState(null);
      const [pendingRemove, setPendingRemove] = useState(null);
      const [status, setStatus] = useState(null);
      const [busy, setBusy] = useState(false);
      const { preview, openImage, closeImage } = useImagePreview();

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

      // The panel can be dragged taller or shorter; 0 means the CSS default.
      const [dragHeight, setDragHeight] = useState(0);
      const panelHeight = dragHeight || normalizeSettings(state.settings).panelHeight;
      const panelHeightRef = useRef(panelHeight);
      panelHeightRef.current = panelHeight;
      const startResize = (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        event.preventDefault();
        const startY = event.clientY;
        const startHeight = panelRef.current ? panelRef.current.getBoundingClientRect().height : panelHeightRef.current;
        const apply = (clientY) => {
          const limit = Math.max(360, window.innerHeight - 96);
          setDragHeight(Math.round(Math.min(limit, Math.max(320, startHeight + (startY - clientY)))));
        };
        const onMove = (moveEvent) => {
          moveEvent.preventDefault();
          apply(moveEvent.clientY);
        };
        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          poolActions.setSetting('panelHeight', Math.round(panelHeightRef.current));
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      };
      const resetResize = () => {
        setDragHeight(0);
        poolActions.setSetting('panelHeight', 0);
      };

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
        if (!view.open || preview) return undefined;
        const onKey = (event) => {
          if (event.key !== 'Escape') return;
          if (editing) {
            setEditing(null);
          } else {
            ui.set({ open: false });
          }
          event.stopPropagation();
          event.preventDefault();
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
      }, [view.open, editing, preview]);

      const rail = workspaceRail(workspaces.items, state.settings, currentWorkspaceId);
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
        const needle = query.trim().toLowerCase();
        const scoped = tab === 'nested:workspace'
          ? state.items.filter((item) => groupOf(item) === (wsActive ? 'workspace:' + wsActive.slice(3) : ''))
          : state.items.filter((item) => matchesTab(item, tab));
        if (!needle) return scoped;
        return scoped.filter((item) => (item.title + '\n' + item.body).toLowerCase().indexOf(needle) >= 0);
      }, [state.items, tab, wsActive, query]);

      const actions = props.inputActions;
      const canAct = actions && typeof actions.setDraft === 'function';

      const setDraft = (text) => {
        if (!canAct) return;
        actions.setDraft(text);
      };

      const addImages = async (images) => {
        const list = normalizeImages(images);
        if (list.length === 0) return 0;
        if (!actions || typeof actions.addAttachments !== 'function') throw new Error(translate('image.insertFailed'));
        const api = conversationFace || serviceOf(pluginCtx, 'conversation');
        if (!api || typeof api.createDrafts !== 'function' || !props.sessionId) throw new Error(translate('image.insertFailed'));
        const files = [];
        for (const image of list) {
          const blob = await getImageBlob(image.id);
          if (!blob) throw new Error(translate('image.missing'));
          files.push(new File([blob], image.name || 'image', { type: image.type || blob.type || 'image/png' }));
        }
        const drafts = api.createDrafts(props.sessionId, files);
        if (!Array.isArray(drafts) || drafts.length !== files.length) throw new Error(translate('image.insertFailed'));
        try {
          actions.addAttachments(drafts.map((draft) => draft.id));
        } catch (error) {
          try {
            if (typeof api.releaseDraftAttachments === 'function') api.releaseDraftAttachments(drafts);
          } catch (_cleanupError) {
            /* the draft attachment owner may already be gone */
          }
          throw error;
        }
        return drafts.length;
      };

      const insertItem = async (item) => {
        if (!actions || typeof actions.captureInsertion !== 'function' || typeof actions.insertText !== 'function') {
          flash({ kind: 'error', text: translate('status.insertFailed') });
          return { ok: false, reason: 'insert-failed' };
        }
        const body = typeof item.body === 'string' ? item.body : '';
        const images = normalizeImages(item.images);
        if (!body.trim() && images.length === 0) {
          flash({ kind: 'error', text: translate('status.emptyBody') });
          return { ok: false, reason: 'empty' };
        }
        try {
          const added = images.length > 0 ? await addImages(images) : 0;
          if (body.trim()) {
            const span = actions.captureInsertion();
            if (!actions.insertText(body, span)) {
              flash({ kind: 'error', text: translate('status.insertFailed') });
              return { ok: false, reason: 'insert-failed' };
            }
          }
          flash({ kind: 'ok', text: added > 0 && !body.trim() ? translate('image.inserted') : translate('status.inserted') });
          if (!normalizeSettings(state.settings).keepAfterInsert) deleteItem(item, translate('status.insertedAndRemoved'));
          return { ok: true };
        } catch (error) {
          flash({ kind: 'error', text: String((error && error.message) || error) });
          return { ok: false, reason: String((error && error.message) || error) };
        }
      };

      const saveTrayEdit = () => {
        if (!trayEditing) return;
        if (!trayEditing.body.trim() && !(trayEditing.images && trayEditing.images.length)) {
          flash({ kind: 'error', text: translate('status.emptyBody') });
          return;
        }
        poolActions.patchTray(trayEditing.key, { body: trayEditing.body, images: trayEditing.images || [] });
        setTrayEditing(null);
      };

      const pasteTrayImages = (files) => {
        const key = trayEditing && trayEditing.key;
        appendImageAssets(files, trayEditing && trayEditing.images ? trayEditing.images : [], (text) => flash({ kind: 'error', text })).then((images) => {
          setTrayEditing((current) => (current && current.key === key ? { ...current, images } : current));
        });
      };

      /** Copies the composer draft into the pool; the draft itself is left alone. */
      const captureDraft = () => {
        const text = draftRef.current;
        if (!text || !text.trim()) {
          flash({ kind: 'error', text: translate('status.nothing') });
          return { ok: false, reason: 'empty' };
        }
        const item = {
          id: uid(),
          group: BUILTIN_GROUP.note,
          title: draftTitle(text, occurrenceRef.current),
          body: text,
          images: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        poolActions.add(item);
        // The copy lands in 便签, which a folded/workspace tab cannot show.
        if (!matchesTab(item, tab)) setTab('all');
        const skipped = attachmentRef.current;
        flash(skipped > 0
          ? { kind: 'info', text: translate('status.savedTextOnly', { n: skipped }) }
          : { kind: 'ok', text: translate('status.saved') });
        return { ok: true, skipped };
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
          images: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        setEditing({ id: item.id, group, title: '', body: '', images: [] });
      };

      const startEdit = (item) => setEditing({ id: item.id, group: groupOf(item), title: item.title, body: item.body, images: normalizeImages(item.images) });

      const saveEdit = () => {
        if (!editing) return;
        if (!editing.body.trim() && (!editing.images || editing.images.length === 0)) {
          flash({ kind: 'error', text: translate('status.emptyBody') });
          return;
        }
        poolActions.patch(editing.id, {
          group: editing.group,
          title: editing.title.trim(),
          body: editing.body,
          images: editing.images || [],
        });
        setEditing(null);
      };

      const pasteImages = (files) => {
        const id = editing && editing.id;
        appendImageAssets(files, editing && editing.images ? editing.images : [], (text) => flash({ kind: 'error', text })).then((images) => {
          setEditing((current) => (current && current.id === id ? { ...current, images } : current));
        });
      };

      const deleteItem = (item, text) => {
        const index = pool.get().items.findIndex((entry) => entry.id === item.id);
        poolActions.remove(item.id);
        flash({
          kind: 'info',
          text: text || translate('status.deleted', { title: itemLabel(item) }),
          undo: () => {
            poolActions.restore(item, index);
            setStatus(null);
          },
        });
      };

      /** Queue one occurrence, dropping it from the pool when retention is off. */
      const queueItem = (item) => {
        const before = pool.get().tray.length;
        poolActions.addToTray(item.id);
        if (pool.get().tray.length === before) return;
        if (!normalizeSettings(state.settings).keepAfterQueue) deleteItem(item, translate('status.queuedAndRemoved'));
      };

      const release = async () => {
        if (busyRef.current) return;
        const entries = state.tray.slice();
        if (entries.length === 0) return;
        if (draftRef.current.trim() !== '') {
          flash({ kind: 'error', text: translate('status.draftBusy') });
          return;
        }
        busyRef.current = true;
        setBusy(true);
        setStatus({ kind: 'info', text: translate('status.releasing', { n: entries.length }) });
        let sent = 0;
        try {
          for (const entry of entries) {
            const body = typeof entry.body === 'string' ? entry.body : '';
            const images = normalizeImages(entry.images);
            if (!body.trim() && images.length === 0) continue;
            const clear = await waitFor(() => draftRef.current.trim() === '' && phaseRef.current === 'plain', 2500);
            if (!clear) break;
            try {
              if (images.length > 0) await addImages(images);
            } catch (error) {
              flash({ kind: 'error', text: String((error && error.message) || error) });
              break;
            }
            if (typeof actions.submit !== 'function') break;
            const queuedBefore = queueRef.current.length;
            const pendingBefore = pendingRef.current.length;
            try {
              setDraft(body);
            } catch (error) {
              flash({ kind: 'error', text: String((error && error.message) || error) });
              break;
            }
            // Wait until the editor really holds this occurrence before submitting it.
            const loaded = await waitFor(() => draftRef.current.trim() === body.trim(), 2500);
            if (!loaded) break;
            try {
              actions.submit();
            } catch (error) {
              flash({ kind: 'error', text: String((error && error.message) || error) });
              break;
            }
            const accepted = await waitFor(
              () =>
                (queueRef.current.length > queuedBefore || pendingRef.current.length > pendingBefore) &&
                draftRef.current.trim() === '',
              3000,
            );
            if (!accepted) {
              // The first send of an idle session becomes the live turn, not a queue row.
              if (!(sent === 0 && draftRef.current.trim() === '')) break;
            }
            await waitFor(() => phaseRef.current === 'plain', 1500);
            sent += 1;
          }
        } catch (error) {
          flash({ kind: 'error', text: String((error && error.message) || error) });
        } finally {
          busyRef.current = false;
          setBusy(false);
        }
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
              onPasteImages: pasteImages,
              onKeyDown: (event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault();
                  saveEdit();
                }
              },
            }),
            h(ImagePicker, {
              images: editing.images || [],
              onChange: (images) => setEditing((current) => (current ? { ...current, images } : current)),
              onError: (text) => flash({ kind: 'error', text }),
              onOpen: openImage,
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
          { key: item.id, className: 'pp-row pp-page-item' },
          h(IconButton, { name: 'insert', label: translate('row.insert'), onClick: () => insertItem(item) }),
          h(TrayAdd, { label: translate('row.select'), onClick: () => queueItem(item) }),
          h(
            'div',
            { className: 'pp-main', title: translate('row.insert'), onClick: () => insertItem(item) },
            h('div', { className: 'pp-title' }, item.title || item.body.split('\n')[0] || (item.images && item.images[0] && (item.images[0].name || translate('image.only'))) || translate('group.untitled')),
            item.body.trim() === (item.title || '').trim() ? null : h('div', { className: 'pp-body' }, item.body),
            h(ImageStrip, { images: item.images, compact: true, onOpen: openImage }),
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
            h(IconButton, { name: 'trash', label: translate('row.delete'), danger: true, onClick: () => setPendingDelete(item) }),
          ),
        );
      };

      const tray = state.tray;
      const queueCollapsed = normalizeSettings(state.settings).queueCollapsed;

      // A capture appends to the end of the list; keep the new row in view.
      const listRef = useRef(null);
      const itemCount = state.items.length;
      const lastItemCount = useRef(itemCount);
      useEffect(() => {
        if (itemCount > lastItemCount.current && listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight;
        }
        lastItemCount.current = itemCount;
      }, [itemCount]);

      // Same rule as the page: an emptied queue dismisses the confirmation.
      useEffect(() => {
        if (tray.length === 0) setConfirmClear(false);
      }, [tray.length]);

      // The sidebar tab has no composer access, so it posts commands here.
      const bridgeRef = useRef(null);
      bridgeRef.current = { insert: insertItem, release, capture: captureDraft };
      useEffect(() => {
        return bridge.listen((command) => {
          const api = bridgeRef.current;
          if (!api || !command) return { ok: false, reason: 'unavailable' };
          if (command.type === 'insert') {
            if (typeof command.text !== 'string') return { ok: false, reason: 'bad-command' };
            return Promise.resolve(api.insert({ body: command.text, images: normalizeImages(command.images) }))
              .then((result) => result || { ok: true })
              .catch((error) => ({ ok: false, reason: String((error && error.message) || error) }));
          }
          if (command.type === 'release') {
            if (draftRef.current.trim() !== '') return { ok: false, reason: 'draft-busy' };
            api.release();
            return { ok: true };
          }
          // The sidebar page cannot read the composer, so it asks for the capture.
          if (command.type === 'capture') {
            const result = api.capture();
            if (result && result.ok) return result;
            return { ok: false, reason: (result && result.reason) || 'empty' };
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
          style: panelHeight ? { height: 'min(' + panelHeight + 'px, 90vh)', maxHeight: 'none' } : undefined,
          onMouseDown: (event) => event.stopPropagation(),
        },
        h('style', null, CSS),
        h(
          'div',
          {
            key: 'grip',
            className: 'pp-panel-grip',
            role: 'separator',
            'aria-orientation': 'horizontal',
            title: translate('panel.resize'),
            onPointerDown: startResize,
            onDoubleClick: resetResize,
          },
          h('span', { className: 'pp-grip-bar' }),
        ),
        // Same header and tab strip as the sidebar page, so both views read alike.
        h(
          'div',
          { className: 'pp-page-head' },
          h('span', { className: 'pp-page-title' }, translate('panel.title')),
          h('span', { className: 'pp-page-sub' }, translate('page.count', { n: panelCount })),
          h('span', { className: 'pp-grow' }),
          h('input', {
            className: 'pp-search',
            value: query,
            placeholder: translate('page.search'),
            onChange: (event) => setQuery(event.target.value),
          }),
          h('button', { type: 'button', className: 'pp-mini', onClick: newItem }, '＋ ', translate('page.new')),
          h('button', { type: 'button', className: 'pp-mini', title: translate('panel.captureHint'), onClick: captureDraft }, translate('panel.capture')),
          h(SettingsButton, { active: settingsOpen, onClick: () => setSettingsOpen(!settingsOpen) }),
          h(
            'button',
            { type: 'button', className: 'pp-x', title: translate('panel.close'), 'aria-label': translate('panel.close'), onClick: () => ui.set({ open: false }) },
            '✕',
          ),
        ),
        h(
          'div',
          { className: 'pp-bar', style: { padding: '8px 12px 2px' } },
          h(TabBar, {
            tabs: buildTabs(state.categories, workspaces.items, state.settings, currentWorkspaceId),
            active: tab,
            ...tabHandlers((next) => {
              setSettingsOpen(false);
              setTab(next);
            }, tab),
            onDelete: (id) => setPendingCategory(id),
          }),
        ),
        pendingCategory ? h(CategoryDeleteConfirm, { onConfirm: confirmCategoryDelete, onCancel: () => setPendingCategory(null) }) : null,
        confirmClear && tray.length > 0
          ? h(TrayClearConfirm, {
              count: tray.length,
              onConfirm: () => {
                poolActions.clearTray();
                setConfirmClear(false);
              },
              onCancel: () => setConfirmClear(false),
            })
          : null,
        pendingDelete
          ? h(ItemDeleteConfirm, {
              title: itemLabel(pendingDelete),
              onCancel: () => setPendingDelete(null),
              onConfirm: () => {
                deleteItem(pendingDelete);
                setPendingDelete(null);
              },
            })
          : null,
        pendingRemove && tray.some((entry) => entry.key === pendingRemove.key)
          ? h(TrayRemoveConfirm, {
              title: itemLabel(pendingRemove),
              onCancel: () => setPendingRemove(null),
              onConfirm: () => {
                poolActions.removeTray(pendingRemove.key);
                setPendingRemove(null);
              },
            })
          : null,
        h(
          'div',
          { className: 'pp-list', ref: listRef },
          settingsOpen
            ? h(PromptPoolSettings, { currentWorkspaceId })
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
        h(
          'div',
          { className: 'pp-panel-dock' },
          status
          ? h(
              'div',
              { className: 'pp-status pp-status-float', 'data-kind': status.kind || 'info' },
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
        !settingsOpen
          ? queueCollapsed
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'pp-queue-strip',
                  title: translate('tray.expandTitle'),
                  'aria-label': translate('tray.expandTitle'),
                  'aria-expanded': 'false',
                  onClick: () => poolActions.setSetting('queueCollapsed', false),
                },
                h('span', { className: 'pp-queue-strip-action' }, icon('chevronUp')),
                h('span', { className: 'pp-queue-strip-title' }, translate('tray.title')),
                h('span', { className: 'pp-hint' }, translate('tray.selected', { n: tray.length })),
                h('span', { className: 'pp-grow' }),
              )
            : h(
              'div',
              { className: 'pp-page-foot' },
              h(
                'div',
                { className: 'pp-foot-head' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'pp-queue-toggle',
                    title: translate('tray.collapseTitle'),
                    'aria-label': translate('tray.collapseTitle'),
                    'aria-expanded': 'true',
                    onClick: () => poolActions.setSetting('queueCollapsed', true),
                  },
                  h('span', { className: 'pp-queue-toggle-icon' }, icon('chevronDown')),
                ),
                h('span', { className: 'pp-foot-title' }, translate('tray.title')),
            h('span', { className: 'pp-hint' }, translate('tray.selected', { n: tray.length })),
                queue.length > 0 ? h('span', { className: 'pp-hint' }, translate('tray.queue', { n: queue.length })) : null,
                h('span', { className: 'pp-grow' }),
                tray.length > 0 ? h('button', { type: 'button', className: 'pp-link', onClick: () => setConfirmClear(true) }, translate('tray.clear')) : null,
                tray.length > 0
                  ? h('button', { type: 'button', className: 'pp-primary', disabled: busy, onClick: release }, translate('tray.release'))
                  : null,
              ),
              h(
                'div',
                { className: tray.length === 0 ? 'pp-tray pp-tray-empty' : 'pp-tray' },
                tray.length === 0
                  ? h('div', { className: 'pp-hint' }, translate('tray.empty'))
                  : tray.map((entry, index) => {
                  if (trayEditing && trayEditing.key === entry.key) {
                    return h(
                      'div',
                      { key: entry.key, className: 'pp-edit', style: { margin: '4px 0' } },
                      h(MentionField, {
                        value: trayEditing.body,
                        placeholder: translate('row.bodyPlaceholder'),
                        rows: 4,
                        autoFocus: true,
                        sessionId: props.sessionId,
                        onChange: (event) => setTrayEditing((current) => (current ? { ...current, body: event.target.value } : current)),
                        onPasteImages: pasteTrayImages,
                        onKeyDown: (event) => {
                          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                            event.preventDefault();
                            saveTrayEdit();
                          }
                        },
                      }),
                      h(ImagePicker, {
                        images: trayEditing.images || [],
                        onChange: (images) => setTrayEditing((current) => (current ? { ...current, images } : current)),
                        onError: (text) => flash({ kind: 'error', text }),
                        onOpen: openImage,
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
                    h('div', { className: 'pp-chip-t', title: entry.body }, entry.body),
                    h(ImageStrip, { images: entry.images, compact: true, max: 4, onOpen: openImage }),
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
                        onClick: () => setTrayEditing({ key: entry.key, body: entry.body || '', images: normalizeImages(entry.images) }),
                      }),
                      h(IconButton, { name: 'copy', label: translate('tray.duplicate'), onClick: () => poolActions.duplicateTray(entry.key) }),
                      h(IconButton, { name: 'close', label: translate('tray.remove'), onClick: () => setPendingRemove(entry) }),
                    ),
                  );
                }),
              ),
            )
          : null,
        ),
        h(ImageLightbox, { preview, onClose: closeImage }),
      );
    }

    // ----------------------------------------------------------------- helpers
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
      '.pp-panel,.pp-page,.pp-settings,.pp-root{--pp-accent:var(--dsw-alias-state-business-primary,var(--dsw-alias-brand-primary));--pp-accent-soft:color-mix(in srgb,var(--pp-accent) 13%,transparent);--pp-accent-line:color-mix(in srgb,var(--pp-accent) 55%,transparent);--pp-ink:var(--dsw-alias-label-primary);--pp-ink-2:var(--dsw-alias-label-secondary);--pp-line:var(--dsw-alias-border-l1);--pp-line-2:var(--dsw-alias-border-l2);--pp-surface:var(--dsw-alias-bg-layer-1);--pp-surface-2:var(--dsw-alias-bg-overlay);--pp-queue-bg:color-mix(in srgb,var(--pp-accent) 5%,var(--dsw-alias-bg-base,var(--pp-surface)));--pp-queue-head-bg:color-mix(in srgb,var(--pp-accent) 14%,var(--dsw-alias-bg-base,var(--pp-surface)));--pp-hover:var(--dsw-alias-interactive-bg-hover,var(--dsw-alias-bg-layer-2));--pp-danger:var(--dsw-alias-state-error-primary);--pp-danger-soft:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);--pp-ok:var(--dsw-alias-state-success-primary);--pp-on-accent:#ffffff}' +
      '.pp-btn{display:inline-flex;align-items:center;justify-content:center;gap:5px;height:28px;min-width:28px;padding:0 6px;border:0;border-radius:8px;background:transparent;color:var(--pp-ink-2);cursor:pointer;font:inherit;font-size:12px;line-height:1}' +
      '.pp-btn:hover{background:var(--pp-hover);color:var(--pp-ink)}' +
      '.pp-btn[data-open="true"]{background:var(--pp-hover);color:var(--pp-ink)}' +
      '.pp-badge{min-width:15px;height:15px;padding:0 4px;border-radius:8px;border:1px solid var(--pp-line-2);color:var(--pp-ink-2);font-size:10px;line-height:13px;text-align:center;font-variant-numeric:tabular-nums}' +
      // The composer trigger names itself, and switches to the accent colour once
      // something is queued so the pending count is hard to miss.
      '.pp-trigger{gap:6px;padding:0 9px;border:1px solid transparent}' +
      '.pp-trigger-label{white-space:nowrap}' +
      '.pp-trigger[data-queued="true"]{border-color:var(--pp-accent-line);background:var(--pp-accent-soft);color:var(--pp-accent);font-weight:600}' +
      '.pp-trigger[data-queued="true"]:hover{background:color-mix(in srgb,var(--pp-accent) 20%,transparent);color:var(--pp-accent)}' +
      '.pp-trigger[data-queued="true"] .pp-badge{border-color:var(--pp-accent);background:var(--pp-accent);color:var(--pp-on-accent);font-weight:600}' +
      '.pp-panel{position:absolute;left:auto;right:0;bottom:0;margin:0;max-width:min(920px,100%);z-index:40;display:flex;flex-direction:column;height:min(70vh,720px);max-height:min(70vh,720px);border:1px solid var(--pp-line);border-radius:var(--dsw-radius-panel,12px);background:var(--dsw-alias-bg-base,var(--pp-surface-2));box-shadow:var(--dsw-elevation-soft,0 10px 30px rgba(0,0,0,.16));overflow:hidden;font-size:13px;line-height:1.5;color:var(--pp-ink);text-align:left}' +
      // The grip above the header resizes the panel; a long queue may keep half the list.
      '.pp-panel-grip{flex:none;display:flex;align-items:center;justify-content:center;height:11px;cursor:ns-resize;touch-action:none}' +
      '.pp-grip-bar{width:44px;height:4px;border-radius:2px;background:var(--pp-line-2);transition:background .12s ease}' +
      '.pp-panel-grip:hover .pp-grip-bar{background:var(--pp-accent)}' +
      // flex:none keeps the card at its content height (or its cap) instead of
      // shrinking until the chips clip inside the panel.
      '.pp-panel .pp-page-foot{flex:none;max-height:45%;min-height:0}' +
      // flex:1 would collapse an auto-height card to zero and clip the empty hint;
      // the tray sizes to its content and only shrinks (then scrolls) at the cap.
      '.pp-panel .pp-page-foot .pp-tray{max-height:none;min-height:0;flex:0 1 auto}' +
      '.pp-panel .pp-foot-head{flex:none}' +
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
      '.pp-list{overflow-y:auto;padding:6px 8px 20px;flex:1;min-height:0}' +
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
      '.pp-set-tr{display:grid;grid-template-columns:1fr 64px 64px 64px 76px;align-items:center;gap:8px;padding:5px 0;border-top:1px solid var(--pp-line-2)}' +
        '.pp-set-tr.pp-set-th{border-top:0;padding-bottom:2px;font-size:11px;color:var(--pp-ink-2)}' +
        '.pp-set-td-name{font-size:12px;color:var(--pp-ink)}' +
        '.pp-set-td-cell{display:flex;justify-content:center}' +
        '.pp-set-th-cell{text-align:center}' +
        '.pp-set-td-order{display:flex;justify-content:center;gap:4px}' +
        '.pp-set-divider{height:1px;background:var(--pp-line-2);margin:14px 0 12px}' +
      '.pp-about{margin-top:14px}' +
      '.pp-about-name{display:flex;align-items:baseline;gap:8px;font-size:13px;font-weight:600;color:var(--pp-ink)}' +
      '.pp-about-version{font-size:11px;font-weight:400;color:var(--pp-ink-2);font-variant-numeric:tabular-nums}' +
      '.pp-about-desc{margin:4px 0 8px}' +
      '.pp-about-row{display:flex;gap:10px;padding:2px 0;font-size:12px;color:var(--pp-ink);min-width:0}' +
      '.pp-about-key{flex:none;width:60px;color:var(--pp-ink-2)}' +
      '.pp-about-row a{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
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
      '.pp-page-foot{display:flex;flex-direction:column;gap:8px;margin:8px 10px 10px;padding:10px 12px;border:1px solid var(--pp-line-2);border-radius:10px;background:var(--pp-queue-bg);box-shadow:0 1px 3px rgba(0,0,0,.08);max-height:min(640px,66vh);overflow:hidden}' +
      // The card sizes itself to the queue: an empty tray is one hint row, a full
      // one stops at half the page so the pool above keeps the room it needs.
      '.pp-page-foot .pp-tray{max-height:min(520px,52vh);min-height:0;flex:0 1 auto;overflow-y:auto}' +
      '.pp-tray-empty{justify-content:flex-start;align-items:flex-start;padding:2px 2px 4px;text-align:left}' +
      '.pp-queue-toggle{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;margin-left:-4px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--pp-ink-2);font:inherit;font-size:11px;cursor:pointer}' +
      '.pp-queue-toggle:hover{background:color-mix(in srgb,var(--pp-accent) 10%,transparent);color:var(--pp-accent)}' +
      '.pp-queue-toggle:focus-visible{outline:2px solid var(--pp-accent);outline-offset:1px}' +
      '.pp-queue-toggle-icon{display:inline-flex;align-items:center}' +
      '.pp-queue-toggle svg{width:13px;height:13px;stroke-width:1.2}' +
      '.pp-queue-strip{display:flex;align-items:center;gap:8px;height:34px;flex:none;margin:0 10px 10px;padding:0 12px;border:1px solid var(--pp-line-2);border-radius:8px;background:var(--pp-queue-head-bg);font:inherit;font-size:12px;color:var(--pp-ink-2);cursor:pointer;text-align:left}' +
      '.pp-queue-strip:hover{background:color-mix(in srgb,var(--pp-accent) 18%,var(--dsw-alias-bg-base,var(--pp-surface)))}' +
      '.pp-queue-strip:focus-visible{outline:2px solid var(--pp-accent);outline-offset:1px}' +
      '.pp-queue-strip-title{font-weight:600;color:var(--pp-ink)}' +
      '.pp-queue-strip-action{display:inline-flex;align-items:center;gap:3px;font-size:11px;color:var(--pp-accent)}' +
      '.pp-queue-strip svg{width:13px;height:13px;stroke-width:1.2}' +
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
      '.pp-images{display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin-top:4px}' +
      '.pp-images-compact{gap:3px;margin-top:3px}' +
      '.pp-image{position:relative;display:inline-flex;width:44px;height:44px;flex:none;border:1px solid var(--pp-line);border-radius:6px;background:var(--pp-surface-2);overflow:hidden;cursor:zoom-in}' +
      '.pp-images-compact .pp-image{width:32px;height:32px}' +
      '.pp-image img{width:100%;height:100%;object-fit:cover;display:block}' +
      '.pp-image-empty{display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:var(--pp-ink-2)}' +
      '.pp-image-empty svg{width:16px;height:16px}' +
      '.pp-image-x{position:absolute;top:1px;right:1px;width:15px;height:15px;padding:0;border:0;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;font:inherit;font-size:11px;line-height:1;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}' +
      '.pp-image-x:hover{background:var(--pp-danger)}' +
      '.pp-image-more{display:inline-flex;align-items:center;justify-content:center;min-width:32px;height:32px;padding:0 4px;border-radius:6px;border:1px dashed var(--pp-line-2);color:var(--pp-ink-2);font-size:11px}' +
      '.pp-image-picker{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:2px}' +
      '.pp-image-add{height:26px}' +
      '.pp-chip .pp-images{flex:none;margin-top:0;align-self:center;max-width:150px}' +
      '.pp-chip .pp-image{width:28px;height:28px}' +
      '.pp-lightbox{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:28px;background:rgba(0,0,0,.72)}' +
      '.pp-lightbox-body{display:flex;flex-direction:column;align-items:center;gap:8px;max-width:min(92vw,1200px);max-height:92vh}' +
      '.pp-lightbox-body img{max-width:100%;max-height:calc(92vh - 48px);object-fit:contain;border-radius:8px;background:var(--pp-surface);box-shadow:0 18px 48px rgba(0,0,0,.35)}' +
      '.pp-lightbox-empty{display:flex;align-items:center;justify-content:center;min-width:180px;min-height:120px;padding:16px;border:1px dashed rgba(255,255,255,.35);border-radius:8px;color:#fff;font-size:12px}' +
      '.pp-lightbox-bar{display:flex;align-items:center;gap:12px;max-width:100%;color:#fff;font-size:12px}' +
      '.pp-lightbox-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.9}' +
      '.pp-lightbox-close{width:26px;height:26px;border:1px solid rgba(255,255,255,.35);border-radius:50%;background:rgba(0,0,0,.35);color:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;font:inherit}' +
      '.pp-lightbox-close:hover{background:rgba(0,0,0,.6)}' +
      '.pp-primary{height:28px;padding:0 14px;border-radius:8px;border:1px solid var(--pp-accent);background:var(--pp-accent);color:var(--pp-on-accent);font:inherit;font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap}' +
      '.pp-primary:hover{filter:brightness(1.06)}' +
      '.pp-primary:disabled{opacity:.5;cursor:default}' +
      '.pp-link{border:0;background:transparent;color:var(--pp-ink-2);font:inherit;font-size:11px;cursor:pointer;padding:0;text-decoration:underline;text-underline-offset:2px}' +
      '.pp-link:hover{color:var(--pp-ink)}' +
      '.pp-foot{border-top:1px solid var(--pp-line);padding:8px 12px 10px;display:flex;flex-direction:column;gap:6px;background:var(--pp-queue-bg)}' +
      '.pp-foot-head{display:flex;align-items:center;gap:6px}' +
      '.pp-page-foot .pp-foot-head{margin:-10px -12px 0;padding:8px 12px;border-radius:9px 9px 0 0;background:var(--pp-queue-head-bg)}' +
      '.pp-foot .pp-foot-head{margin:-8px -12px 0;padding:8px 12px;background:var(--pp-queue-head-bg)}' +
      '.pp-foot-title{font-size:12px;font-weight:600;color:var(--pp-ink)}' +
      '.pp-tray{display:flex;flex-direction:column;gap:6px;max-height:260px;overflow-y:auto}' +
      '.pp-foot .pp-tray{max-height:min(40vh,220px)}' +
      '.pp-chip{display:flex;align-items:flex-start;gap:6px;padding:5px 7px;border-radius:8px;border:1px solid var(--pp-line);background:transparent;min-width:0;transition:background-color .12s ease,border-color .12s ease}' +
      '.pp-chip:hover,.pp-chip:focus-within{background:color-mix(in srgb,var(--pp-accent) 9%,transparent);border-color:color-mix(in srgb,var(--pp-accent) 40%,var(--pp-line))}' +
      '.pp-chip-actions{display:flex;gap:2px;flex:none;align-self:flex-start;opacity:.3;transition:opacity .12s ease}' +
      '.pp-chip:hover .pp-chip-actions,.pp-chip:focus-within .pp-chip-actions{opacity:1}' +
      '@media (hover:none){.pp-chip-actions{opacity:1}}' +
      '.pp-chip-n{flex:none;padding-top:1px;font-size:11px;line-height:1.55;font-variant-numeric:tabular-nums;color:var(--pp-ink-2)}' +
      '.pp-chip-t{flex:1;min-width:0;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;font-size:12px;line-height:1.55;color:var(--pp-ink);display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}' +
      '.pp-chip .pp-icon{width:22px;height:22px}' +
      '.pp-actions .pp-icon svg,.pp-chip-actions .pp-icon svg{width:13px;height:13px;stroke-width:1.2}' +
      '.pp-hint{color:var(--pp-ink-2);font-size:11px}' +
      '.pp-status{padding:0 12px 8px;font-size:11px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}' +
      '.pp-status[data-kind="error"]{color:var(--pp-danger)}' +
      '.pp-status[data-kind="ok"]{color:var(--pp-ok)}' +
      '.pp-queue-dock,.pp-panel-dock{position:relative;flex:none;display:flex;flex-direction:column}' +
      '.pp-status-float{position:absolute;left:10px;right:auto;width:max-content;max-width:calc(100% - 20px);bottom:100%;margin-bottom:6px;padding:6px 12px;border:1px solid var(--pp-line-2);border-radius:8px;background:var(--pp-surface);box-shadow:0 4px 14px rgba(0,0,0,.10);z-index:5;pointer-events:none;animation:pp-status-in .16s ease}' +
      '.pp-panel .pp-status-float{pointer-events:auto}' +
      // The page's status float stays click-through, so only the undo link takes clicks.
      '.pp-status-float .pp-link{pointer-events:auto}' +
      '@keyframes pp-status-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}';

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
          if (typeof ctx.inject === 'function') {
            try {
              ctx.inject(names, (serviceCtx) => run(serviceCtx));
            } catch (_error) {
              /* an optional service that is not installed */
            }
          }
        };
        bindOptional(['remote', 'remote.skills'], (target) => {
          remoteFace = serviceOf(target, 'remote');
          skillsFace = null;
          try {
            skillsFace = remoteFace && remoteFace.skills ? remoteFace.skills : null;
          } catch (_error) {
            // remote.skills needs its own inject; stay quiet until it is granted.
            skillsFace = null;
          }
        });
        bindOptional(['uiWorkspace'], (target) => {
          workspaceFace = serviceOf(target, 'uiWorkspace');
        });
        bindOptional(['conversation'], (target) => {
          conversationFace = serviceOf(target, 'conversation');
        });
        if (ctx.locale && typeof ctx.locale.register === 'function' && typeof ctx.locale.bind === 'function') {
          ctx.effect(() => ctx.locale.register(NS, { zh: ZH, en: EN }));
          translate = ctx.locale.bind(NS);
        }
        // The composer keeps two pieces: the trigger beside the input, and the
        // overlay panel. The overlay stays mounted even while closed, which is
        // what lets the sidebar page post insert/release through the bridge.
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
        // Two possible homes for the sidebar page: the native right-sidebar tab
        // registry that DSH 0.2 ships, or dsh-better-sidebar on older hosts.
        let betterTabDispose = null;
        let nativeTabDispose = null;

        const mountSidebarTab = (service) => {
          if (!service || typeof service.registerTab !== 'function' || betterTabDispose) return;
          sidebarService = service;
          const off = service.registerTab({
            id: SIDEBAR_TAB_ID,
            title: () => translate('page.title'),
            description: () => translate('tab.description'),
            icon: (size) => h(PromptPoolIcon, { size, active: false }),
            order: 80,
            single: true,
            component: (props) => h(PromptPoolPage, props),
          });
          betterTabDispose = typeof off === 'function' ? off : () => {};
          // The sidebar snapshots a tab's title when the tab opens, so a language
          // switch would leave the old label behind. Retitle the open tab too.
          if (typeof service.updateTab === 'function' && ctx.locale && typeof ctx.locale.subscribe === 'function') {
            ctx.effect(() => {
              const offTitle = ctx.locale.subscribe(() => {
                try {
                  service.updateTab(SIDEBAR_TAB_ID, { title: translate('page.title') });
                } catch (_error) {
                  /* closed tabs are a no-op for the sidebar; nothing to repair here */
                }
              });
              return typeof offTitle === 'function' ? offTitle : undefined;
            });
          }
        };

        /** Registers the page as a native right-sidebar tab type, with its guide entry. */
        const mountNativeSidebarTab = (scope) => {
          const tabs = scope && scope.sidebarRightTabs;
          if (!tabs || typeof tabs.register !== 'function' || nativeTabDispose) return;
          if (betterTabDispose) {
            try { betterTabDispose(); } catch (_error) { /* already gone */ }
            betterTabDispose = null;
          }
          nativeTabDispose = ctx.effect(() => {
            const disposers = [];
            const keep = (fn) => { if (typeof fn === 'function') disposers.push(fn); };
            keep(tabs.register({
              id: NATIVE_TAB_ID,
              kind: NATIVE_TAB_KIND,
              title: () => translate('page.title'),
              guide: [{
                order: 80,
                title: () => translate('page.title'),
                description: () => translate('tab.description'),
                icon: () => h(PromptPoolIcon, { size: 17 }),
              }],
            }));
            keep(ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register(
              { name: 'sidebar.right.pane.tab', key: NATIVE_TAB_ID },
              PromptPoolSidebarTab,
            )));
            keep(ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register(
              { name: 'sidebar.right.pane.tab.title', key: NATIVE_TAB_ID },
              PromptPoolSidebarTitle,
            )));
            return () => {
              while (disposers.length > 0) {
                const dispose = disposers.pop();
                try { dispose(); } catch (_error) { /* plugin already torn down */ }
              }
            };
          });
        };

        const nativeTabs = typeof ctx.get === 'function' ? ctx.get('sidebarRightTabs') : ctx.sidebarRightTabs;
        if (nativeTabs) {
          mountNativeSidebarTab({ sidebarRightTabs: nativeTabs });
        } else {
          // The native registry may still arrive; if it does it takes over and the
          // better-sidebar tab below is disposed inside mountNativeSidebarTab.
          if (typeof ctx.inject === 'function') ctx.inject(['sidebarRightTabs'], (scope) => mountNativeSidebarTab(scope));
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
        }
      },
    };
  },
});



