window.__ModuleLoader__.load({
  id: 'dsh-prompt-pool',
  factory(require) {
    'use strict';

    const React = require('react');
    const h = React.createElement;
    const { useCallback, useEffect, useMemo, useRef, useState } = React;

    const useSyncExternalStore = React.useSyncExternalStore;

    const NS = 'prompt-pool';
    const STORAGE_KEY = 'dsh.prompt-pool.v1';
    /** One pre-migration copy of the stored payload, written before the first rewrite. */
    const BACKUP_KEY = STORAGE_KEY + '.backup';
    /** The sidebar tool tab this plugin owns; it also names the open tab. */
    const SIDEBAR_TAB_ID = 'prompt-pool:pool';
    /** Native right-sidebar registry identity (DSH 0.2) and the page kind it opens. */
    const NATIVE_TAB_ID = 'dsh-prompt-pool';
    const NATIVE_TAB_KIND = 'prompt-pool';
    /** Shown in the settings about card; keep in step with plugin/package.json. */
    const PLUGIN_VERSION = '1.3.0';
    const PLUGIN_AUTHOR = 'GanttShen';
    /** Replace once the public repository exists; the row hides while it is empty. */
    const PLUGIN_REPO = 'https://github.com/Ganttfly/dsh-prompt-pool';
    /** The sidebar service, kept so the page can correct a restored tab title. */
    let sidebarService = null;
    const IMAGE_DB = 'dsh-prompt-pool-images.v1';
    const IMAGE_STORE = 'images';
    const MAX_IMAGES = 6;
    const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
    const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    const EMPTY_PENDING = [];
    /**
     * Space kept between the panel's top edge and the pane that clips it: the
     * panel is anchored to the composer, which in a new session sits well above
     * the window bottom, so its height has to stop at the pane instead of
     * running past it.
     */
    const PANEL_TOP_GAP = 10;
    /** How long a release waits on the composer at each step, in ms. */
    const RELEASE_WAIT = { idle: 2500, accept: 3000, plain: 1500 };

    /**
     * Top of the nearest ancestor that clips its overflow — the pane the panel
     * is drawn in. The window top is not enough: the app's own top bar sits
     * above that pane, and a panel sized to the window hides its header under
     * the clip. 0 when nothing clips.
     */
    function clipTopOf(node) {
      let top = 0;
      for (let current = node.parentElement; current; current = current.parentElement) {
        const style = getComputedStyle(current);
        if (style.overflowX === 'visible' && style.overflowY === 'visible') continue;
        const rect = current.getBoundingClientRect();
        if (rect.top > top) top = rect.top;
      }
      return Math.max(0, Math.round(top));
    }

    // ---------------------------------------------------------------- locale
    const ZH = {
      'button.label': '提示池',
      'button.pending': '待发送 {n} 条',
      'panel.title': '提示池',
      'panel.close': '关闭',
      'panel.capture': '保存草稿',
      'panel.captureHint': '把输入框里的内容复制一份存进池子（图片附件一起存）；输入框里的字会保留',
      'panel.resize': '拖动调整高度，双击还原',
      'panel.resizeWidth': '拖动调整宽度，双击还原',
      'panel.pin': '钉住面板',
      'panel.unpin': '取消钉住',
      'panel.empty': '池子是空的。写一句，然后点「存草稿」。',
      'panel.emptyTab': '这一栏还没有内容。',
      'tab.all': '全部',
      'tab.oftenuse': '常用',
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
      'mention.noSessionTag': '无会话',
      'mention.directory': '目录',
      'mention.noSkillService': '读不到技能目录（remote 服务未绑定）',
      'mention.noSessionService': '读不到会话服务（sessions 未绑定）',
      'mention.sessionClosed': '会话未打开，无法读取技能目录',
      'mention.failed': '读取失败',
      'mention.timeout': '读取超时：宿主没有响应（可能没有活跃会话）',
      'row.insert': '生成草稿',
      'row.select': '加入待发送队列',
      'row.duplicate': '复制一份，追加到池子末尾',
      'page.title': '提示池',
      'tab.description': '暂存、编辑、编排你的提示词，按住顺序一次性释放',
      'page.search': '搜索标题或内容…',
      'page.empty': '还没有内容。点右上角「＋ 提示词」开始。',
      'page.emptyOftenuse': '还没有常用条目。把条目的「分组」改成「常用」即可。',
      'page.noMatch': '没有匹配的条目。',
      'status.noComposer': '没有可用的输入框：请先打开一个对话页签',
      'status.releaseSent': '已交给输入框，按顺序排队中',
      'status.savedToPool': '已保存',
      'settings.nav': '提示池',
      'settings.open': '提示池设置',
      'settings.button': '设置',
      'settings.tab.order': '分组',
      'settings.defaultTab': '打开时默认选中',
      'settings.defaultTabNotes': '批注',
      'settings.defaultTabWorkspace': '当前工作区',
      'settings.defaultTabOther': '其他',
      'settings.tab.notes': '批注',
      'settings.notesIntro': '批注和当前会话绑定。\n在正文中添加的批注同时也会出现在提示池的【批注】页面，也可以把它存为提示词，或直接插入会话输入框。',
      'settings.notesKeepDraft': '生成草稿后，仍旧保留',
      'settings.notesKeepDraftHint': '关闭后，生成草稿成功的批注会从列表移除。',
      'settings.notesKeepStore': '存为提示词后，仍旧保留',
      'settings.notesKeepStoreHint': '关闭后，存成提示词成功的批注会从列表移除。',
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
      'settings.seedCard': '内置提示词',
      'settings.seedHint': '当前有 {builtin} 条内置提示词，其中 {edited} 条已编辑。重置只影响内置条目，自定义条目和队列不受影响。',
      'settings.seedLanguageZh': '中文',
      'settings.seedLanguageEn': 'English',
      'settings.seedNote': '将按当前界面语言「{language}」重置。',
      'settings.seedKeepEdited': '保留已编辑的内置条目',
      'settings.seedKeepEditedHint': '勾选后，编辑过的内置条目会转成普通条目保留；未勾选则一起删除。',
      'settings.seedResetButton': '重置内置提示词',
      'settings.seedResetTitle': '重置内置提示词？',
      'settings.seedResetConfirm': '将移除 {removed} 条内置提示词，保留 {kept} 条编辑为普通条目，并按「{language}」重新写入 {added} 条。',
      'settings.seedResetDone': '已重置：移除 {removed} 条，保留 {kept} 条编辑，写入 {added} 条。',
      'settings.about': '插件信息',
      'settings.aboutAuthor': '作者',
      'settings.aboutRepo': '仓库',
      'settings.workspaceCard': '工作区如何展示',
        'settings.workspacesVisible': '显示哪些工作区',
        'settings.workspacesCurrent': '当前',
        'settings.workspacesEmpty': '还没有读到工作区列表。打开一次提示池页面后，这里会列出全部工作区。',
      'settings.title': '提示池',
      'settings.desc': '控制分组顺序、显示方式和工作区 Tab。改动立即生效。',
      'settings.currentWorkspaceTab': '当前工作区排在最前',
      'settings.currentWorkspaceTabHint': '当前会话所属的工作区固定排第一；其余按原顺序。',
      'row.edit': '编辑',
      'row.delete': '删除',
      'row.deleteTitle': '删除这条提示词',
      'row.deleteConfirm': '删除后这条会从池子里移出，可以在提示条上撤销。',
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
      'row.classification': '分组',
      'page.new': '提示词',
      'row.noCategory': '未分组',
      'tray.title': '待发送队列',
      'tray.selected': '已选 {n} 条',
      'tray.release': '发送',
      'tray.clear': '清空',
      'tray.clearTitle': '清空待发送队列',
      'tray.clearConfirm': '队列里的 {n} 条会被一起移出。',
      'tray.clearAction': '清空',
      'tray.empty': '还没选中任何条目，点左侧「＋」加入',
      'tray.remove': '移出',
      'tray.removeTitle': '移出这一条',
      'tray.removeConfirm': '移出后不可撤销；这条如果在队列里改过，改动不会保留。',
      'tray.removeAction': '移出',
      'tray.duplicate': '复制一份，追加到末尾',
      'tray.queue': '队列中 {n}',
      'tray.collapseTitle': '收起待发送队列',
      'tray.expandTitle': '展开待发送队列',
      'status.saved': '已存入池子',
      'status.savedPartial': '已存入池子，但这 {n} 个附件没有一起保存',
      'status.savedTo': '已存入「{group}」',
      'status.savedPartialTo': '已存入「{group}」，但 {n} 个附件没有保存',
      'capture.title': '存到哪个分组？',
      'menu.title': '添加到提示池',
      'menu.pool': '+ 提示词',
      'menu.group': '提示池',
      'menu.copy': '复制',
      'menu.copied': '已复制',
      'menu.copyFailed': '复制失败：请按 {shortcut}',
      'note.add': '+ 批注',
      'note.title': '批注',
      'note.placeholder': '写点什么：回答、疑问或修改意见',
      'note.empty': '没有匹配的批注',
      'note.emptyIntro': '还没有批注。在会话区选中一句话，右键「+ 批注」即可添加。',
      'note.save': '保存',
      'note.cancel': '取消',
      'note.delete': '删除',
      'note.compose': '生成草稿',
      'note.composeHint': '把列表中全部批注生成一份草稿放入对话框',
      'note.composeStoreHint': '把列表中全部批注存成一条提示词',
      'note.insert': '插入',
      'note.locate': '定位',
      'note.locateFailed': '这条批注暂时找不到原文（回复可能被折叠或改写了）。',
      'note.deleteConfirm': '删除这条批注？',
      'note.default': '默认',
      'note.reset': '重置位置',
      'note.store': '存成提示词',
      'note.stored': '已存入 {group}',
      'note.composeStore': '存成提示词',
      'note.composeStored': '已存成提示词到 {group}',
      'note.inserted': '已插入输入框',
      'note.insertFailed': '输入框暂不可用，稍后再试',
      'note.quoteMissing': '这条批注暂时找不到原文位置（回复可能被折叠或改写了）。',
      'note.kind.comment': '意见',
      'note.kind.question': '提问',
      'note.kind.agree': '同意',
      'note.kind.disagree': '反对',
      'note.kind.idea': '想法',
      'note.kind.todo': '待办',
      'menu.last': '上次',
      'menu.count': '{n} 条',
      'menu.saved': '已加入「{group}」',
      'status.storageFailed': '保存失败：浏览器存储不可写（可能已满）。改动只在当前页面有效。',
      'status.nothing': '草稿是空的，先写点什么',
      'status.emptyBody': '内容不能是空的',
      'status.inserted': '已插入到输入框',
      'status.insertedAndRemoved': '已插入到输入框，并从池子移出',
      'status.queuedAndRemoved': '已加入待发送队列，并从池子移出',
      'status.insertFailed': '输入框刚被改动，请重试',
      'status.released': '已释放 {n} 条',
      'status.releaseStopped': '已释放 {n} 条，其余 {rest} 条没发出去：输入框繁忙或内容被改动',
      'status.draftBusy': '输入框里还有内容，先清空或存进池子再释放',
      'status.deleted': '已删除这条提示词',
      'status.cleared': '已清空 {n} 条待发送',
      'status.undo': '撤销',
      'release.title': '正在发送',
      'release.progress': '已发送 {sent} / {total} 条',
      'release.hint': '发送期间请勿操作输入框',
      'release.stop': '停止',
      'release.stopping': '正在停止…',
      'status.releaseHalted': '已停止：发送了 {n} 条，剩余 {rest} 条还在队列里',
      'status.releaseFailed': '队列提交失败：已发送 {n} 条，剩余 {rest} 条还在队列里',
      'status.queueFailed': '提交到队列失败',
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
      'panel.resizeWidth': 'Drag to resize the width, double-click to reset',
      'panel.pin': 'Pin the panel',
      'panel.unpin': 'Unpin the panel',
      'panel.empty': 'The pool is empty. Write something, then press Save draft.',
      'panel.emptyTab': 'Nothing in this tab yet.',
      'tab.all': 'All',
      'tab.oftenuse': 'Frequent',
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
      'mention.noSessionTag': 'no session',
      'mention.directory': 'folder',
      'mention.noSkillService': 'Skill catalog unavailable (remote service not bound)',
      'mention.noSessionService': 'Session service unavailable (sessions not bound)',
      'mention.sessionClosed': 'The session is not open, so the catalog is unavailable',
      'mention.failed': 'Failed to load',
      'mention.timeout': 'Timed out: the host did not answer (no live session?)',
      'row.insert': 'Generate draft',
      'row.select': 'Add to the send queue',
      'row.duplicate': 'Duplicate and append to the pool',
      'page.title': 'Prompt pool',
      'tab.description': 'Stage, edit and arrange prompts, then release them in order',
      'page.search': 'Search title or text…',
      'page.empty': 'Nothing yet. Use “+ Prompt” in the top right.',
      'page.emptyOftenuse': 'Nothing here yet. Set an item’s group to Frequent.',
      'page.noMatch': 'No matching item.',
      'status.noComposer': 'No composer available: open a conversation tab first',
      'status.releaseSent': 'Handed to the composer; queuing in order',
      'status.savedToPool': 'Saved',
      'settings.nav': 'Prompt pool',
      'settings.open': 'Prompt pool settings',
      'settings.button': 'Settings',
      'settings.tab.order': 'Groups',
      'settings.defaultTab': 'Open on',
      'settings.defaultTabNotes': 'Annotations',
      'settings.defaultTabWorkspace': 'Current workspace',
      'settings.defaultTabOther': 'Other',
      'settings.tab.notes': 'Annotations',
      'settings.notesIntro': 'Annotations are bound to the current session.\nAnnotations added in the transcript also appear in the prompt pool\'s Annotations tab; they can also be saved as a prompt or inserted straight into the conversation composer.',
      'settings.notesKeepDraft': 'Keep annotations after generating a draft',
      'settings.notesKeepDraftHint': 'Turned off, annotations leave the list once a draft is generated.',
      'settings.notesKeepStore': 'Keep annotations after saving as a prompt',
      'settings.notesKeepStoreHint': 'Turned off, annotations leave the list once saved as a prompt.',
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
      'settings.seedCard': 'Built-in prompts',
      'settings.seedHint': 'The pool has {builtin} built-in prompts, {edited} of them edited. Resetting only touches built-ins; custom items and the queue are left alone.',
      'settings.seedLanguageZh': 'Chinese',
      'settings.seedLanguageEn': 'English',
      'settings.seedNote': 'Resets in the current interface language: {language}.',
      'settings.seedKeepEdited': 'Keep edited built-in items',
      'settings.seedKeepEditedHint': 'Checked, edited built-ins become ordinary items; unchecked, they are removed too.',
      'settings.seedResetButton': 'Reset built-in prompts',
      'settings.seedResetTitle': 'Reset built-in prompts?',
      'settings.seedResetConfirm': 'Remove {removed} built-in prompts, keep {kept} edited as ordinary items, and add {added} in {language}.',
      'settings.seedResetDone': 'Reset: {removed} removed, {kept} edits kept, {added} added.',
      'settings.about': 'Plugin info',
      'settings.aboutAuthor': 'Author',
      'settings.aboutRepo': 'Repository',
      'settings.workspaceCard': 'How workspaces appear',
        'settings.workspacesVisible': 'Workspaces to show',
        'settings.workspacesCurrent': 'current',
        'settings.workspacesEmpty': 'No workspace roster yet. Open the prompt pool page once and every workspace will be listed here.',
      'settings.title': 'Prompt pool',
      'settings.desc': 'Controls group order, how each family is displayed, and the workspace tabs. Changes apply immediately.',
      'settings.currentWorkspaceTab': 'Put the current workspace first',
      'settings.currentWorkspaceTabHint': 'The workspace owning this session stays first; the rest keep their order.',
      'row.edit': 'Edit',
      'row.delete': 'Delete',
      'row.deleteTitle': 'Delete this prompt',
      'row.deleteConfirm': 'This prompt will be removed from the pool. You can undo it from the toast.',
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
      'row.classification': 'Group',
      'page.new': 'Prompt',
      'row.noCategory': 'Ungrouped',
      'tray.title': 'Send queue',
      'tray.selected': '{n} selected',
      'tray.release': 'Send',
      'tray.clear': 'Clear',
      'tray.clearTitle': 'Clear the send queue',
      'tray.clearConfirm': 'All {n} queued items are removed at once.',
      'tray.clearAction': 'Clear',
      'tray.empty': 'Nothing selected yet — use the ＋ control on a row',
      'tray.remove': 'Remove',
      'tray.removeTitle': 'Remove this queued item',
      'tray.removeConfirm': 'This cannot be undone. Edits made to this queued copy are lost.',
      'tray.removeAction': 'Remove',
      'tray.duplicate': 'Duplicate and append to the end',
      'tray.queue': '{n} in queue',
      'tray.collapseTitle': 'Collapse the send queue',
      'tray.expandTitle': 'Expand the send queue',
      'status.saved': 'Saved to the pool',
      'status.savedPartial': 'Saved to the pool; {n} attachment(s) were not captured',
      'status.savedTo': 'Saved to {group}',
      'status.savedPartialTo': 'Saved to {group}; {n} attachment(s) were not captured',
      'capture.title': 'Save to which group?',
      'menu.title': 'Add to the prompt pool',
      'menu.pool': '+ Prompt',
      'menu.group': 'Prompt pool',
      'menu.copy': 'Copy',
      'menu.copied': 'Copied',
      'menu.copyFailed': 'Copy failed: press {shortcut}',
      'note.add': '+ Annotate',
      'note.title': 'Annotations',
      'note.placeholder': 'Write an answer, a question or a correction',
      'note.empty': 'No matching annotations',
      'note.emptyIntro': 'No annotations yet. Select a passage in the conversation area and right-click “+ Annotate” to add one.',
      'note.save': 'Save',
      'note.cancel': 'Cancel',
      'note.delete': 'Delete',
      'note.compose': 'Generate draft',
      'note.composeHint': 'Turn every annotation in the list into one draft in the composer',
      'note.composeStoreHint': 'Save every annotation in the list as one prompt',
      'note.insert': 'Insert',
      'note.locate': 'Locate',
      'note.locateFailed': 'This note cannot find its passage right now (the reply may be folded or rewritten).',
      'note.deleteConfirm': 'Delete this annotation?',
      'note.default': 'Default',
      'note.reset': 'Reset position',
      'note.store': 'Save as prompt',
      'note.stored': 'Saved to {group}',
      'note.composeStore': 'Save as prompt',
      'note.composeStored': 'Saved as a prompt in {group}',
      'note.inserted': 'Inserted into the composer',
      'note.insertFailed': 'The composer is not available; try again',
      'note.quoteMissing': 'This note cannot find its text right now (the reply may be folded or rewritten).',
      'note.kind.comment': 'Note',
      'note.kind.question': 'Question',
      'note.kind.agree': 'Agree',
      'note.kind.disagree': 'Disagree',
      'note.kind.idea': 'Idea',
      'note.kind.todo': 'To do',
      'menu.last': 'Last used',
      'menu.count': '{n} item(s)',
      'menu.saved': 'Added to {group}',
      'status.storageFailed': 'Could not save: browser storage is unwritable (possibly full). Changes last only for this page.',
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
      'status.cleared': 'Cleared {n} queued items',
      'status.undo': 'Undo',
      'release.title': 'Sending',
      'release.progress': '{sent} of {total} sent',
      'release.hint': 'Leave the composer alone while this runs',
      'release.stop': 'Stop',
      'release.stopping': 'Stopping…',
      'status.releaseHalted': 'Stopped: {n} sent, {rest} left in the queue',
      'status.releaseFailed': 'Queueing failed: {n} sent, {rest} left in the queue',
      'status.queueFailed': 'Could not queue the prompt',
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

    /**
     * Whether the last write reached localStorage. Both views surface this,
     * because a full quota would otherwise look like a successful save.
     */
    const storageState = createStore({ failed: false });

    /** Progress of the one release in flight, shared by the panel and the page. */
    const RELEASE_SINGLETON = '__dshPromptPoolReleaseV1';
    const releaseState = (() => {
      const initial = { active: false, sent: 0, total: 0, stopping: false };
      if (typeof window === 'undefined') return createStore(initial);
      if (!window[RELEASE_SINGLETON]) window[RELEASE_SINGLETON] = createStore(initial);
      return window[RELEASE_SINGLETON];
    })();
    let releaseCancel = false;

    /** Ask the running release to stop after the item it is sending. */
    function requestReleaseStop() {
      const state = releaseState.get();
      if (!state.active || releaseCancel) return false;
      releaseCancel = true;
      releaseState.set({ ...state, stopping: true });
      return true;
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

    /**
     * Copy text while the menu still holds the pointer gesture. The legacy path
     * answers synchronously, which is what lets the menu report a failed copy;
     * the async Clipboard API is the fallback for hosts that refuse execCommand.
     */
    function copyText(text) {
      try {
        if (typeof document !== 'undefined' && document.body) {
          const area = document.createElement('textarea');
          area.value = text;
          area.setAttribute('readonly', '');
          area.style.position = 'fixed';
          area.style.top = '-1000px';
          area.style.opacity = '0';
          document.body.appendChild(area);
          let copied = false;
          try {
            area.select();
            copied = document.execCommand('copy') === true;
          } finally {
            document.body.removeChild(area);
          }
          if (copied) return true;
        }
      } catch (_error) {
        /* fall through to the async clipboard */
      }
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          const result = navigator.clipboard.writeText(text);
          if (result && typeof result.catch === 'function') result.catch(() => {});
          return true;
        }
      } catch (_error) {
        /* nothing else to try */
      }
      return false;
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

    function deleteImageBlobs(ids) {
      const list = (Array.isArray(ids) ? ids : []).filter((id) => typeof id === 'string' && id);
      if (list.length === 0) return Promise.resolve(true);
      return openImageDb().then(
        (db) =>
          new Promise((resolve, reject) => {
            const tx = db.transaction(IMAGE_STORE, 'readwrite');
            const store = tx.objectStore(IMAGE_STORE);
            for (const id of list) store.delete(id);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error || new Error('image-delete-failed'));
            tx.onabort = () => reject(tx.error || new Error('image-delete-failed'));
          }),
      );
    }

    /** Drop bytes the editor added but never saved; stored images stay. */
    function discardUnsavedImages(edited, stored) {
      const keep = new Set(((stored && stored.images) || []).map((image) => image.id));
      const drop = ((edited && edited.images) || []).map((image) => image.id).filter((imageId) => !keep.has(imageId));
      if (drop.length > 0) deleteImageBlobs(drop).catch(() => {});
    }

    /**
     * Every image id the pool still points at. Duplicated items and queued
     * copies share ids, so an id is garbage only when nothing references it.
     */
    function referencedImageIds() {
      const keep = new Set();
      const state = pool.get();
      for (const item of state.items) for (const image of item.images || []) keep.add(image.id);
      for (const entry of state.tray) for (const image of entry.images || []) keep.add(image.id);
      return keep;
    }

    /**
     * Delete blobs nothing references, once per page load. This also clears the
     * bytes of items deleted earlier, which cannot be freed immediately because
     * the delete offers an undo.
     */
    function sweepImageBlobs() {
      return new Promise((resolve, reject) => {
        openImageDb().then((db) => {
          const tx = db.transaction(IMAGE_STORE, 'readonly');
          const request = tx.objectStore(IMAGE_STORE).getAllKeys();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error || new Error('image-read-failed'));
        }, reject);
      }).then((keys) => {
        const keep = referencedImageIds();
        const drop = keys.filter((key) => !keep.has(key));
        return drop.length > 0 ? deleteImageBlobs(drop) : null;
      });
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
        ...(raw.seed === true ? { seed: true } : {}),
        ...(raw.locale === 'zh' || raw.locale === 'en' ? { locale: raw.locale } : {}),
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


    /**
     * The one read path: item → canonical group id. Older pools predate the
     * group id and stored pinned / categoryId (`cat:<id>`) / kind instead, so
     * map those once on load rather than dropping the user's classification.
     */
    function groupOf(item) {
      const group = item && typeof item.group === 'string' ? item.group : '';
      if (group && familyOf(group)) return group;
      const categoryId = item && typeof item.categoryId === 'string' ? item.categoryId : '';
      if (categoryId) return 'custom:' + categoryId.replace(/^cat:/, '');
      if (item && item.pinned === true) return BUILTIN_GROUP.oftenuse;
      if (item && item.kind === 'snippet') return BUILTIN_GROUP.template;
      return BUILTIN_GROUP.note;
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
          // Folded groups share one tab; a hidden family has no tab to aim at.
          const mode = normalizeSettings(pool.get().settings).display.custom;
          setTab(mode === 'nested' ? 'nested:custom' : mode === 'hidden' ? 'all' : 'custom:' + created.id);
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

    /**
     * The tab a freshly opened pool lands on. An unavailable preference (a
     * deleted group, a hidden workspace, no annotations yet) falls back to all.
     */
    function resolveDefaultTab(pref, tabs, currentWorkspaceId, hasNotes) {
      if (!pref) return '';
      const ids = (tabs || []).map((tab) => tab.id);
      // The annotation tab always exists now, so the preference always applies.
      if (pref === 'notes') return 'notes';
      if (pref === '__workspace__') {
        const id = currentWorkspaceId ? 'workspace:' + currentWorkspaceId : '';
        return id && ids.indexOf(id) >= 0 ? id : 'all';
      }
      if (pref.indexOf('tab:') === 0) {
        const id = pref.slice(4);
        return ids.indexOf(id) >= 0 ? id : 'all';
      }
      return '';
    }

    /** Small chooser: where should the captured draft go? */
    function CaptureMenu(props) {
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
          { className: 'pp-modal-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': translate('capture.title') },
          h('div', { className: 'pp-modal-text' }, translate('capture.title')),
          h(
            'div',
            { className: 'pp-capture-options' },
            props.groups.map((group, index) => h(
              'button',
              {
                key: group.value,
                type: 'button',
                className: 'pp-mini pp-capture-option',
                autoFocus: index === 0,
                onClick: () => props.onPick(group.value),
              },
              group.label,
            )),
          ),
          h(
            'div',
            { className: 'pp-modal-actions' },
            h('button', { type: 'button', className: 'pp-mini', onClick: props.onCancel }, translate('row.cancel')),
          ),
        ),
      );
    }

    /** Shared confirm modal: backdrop click and Escape both cancel. */
    function ConfirmModal(props) {
      const cardRef = useRef(null);
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

      // Keep focus inside the dialog and start on the safe action, never on
      // the destructive one (Enter must not delete by accident).
      useEffect(() => {
        const card = cardRef.current;
        if (!card || typeof document === 'undefined') return undefined;
        const focusables = () => Array.from(card.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((node) => !node.disabled);
        const first = focusables()[0];
        if (first) first.focus();
        const onTab = (event) => {
          if (event.key !== 'Tab') return;
          const list = focusables();
          if (list.length === 0) return;
          const firstNode = list[0];
          const lastNode = list[list.length - 1];
          if (event.shiftKey && document.activeElement === firstNode) {
            event.preventDefault();
            lastNode.focus();
          } else if (!event.shiftKey && document.activeElement === lastNode) {
            event.preventDefault();
            firstNode.focus();
          }
        };
        card.addEventListener('keydown', onTab);
        return () => card.removeEventListener('keydown', onTab);
      }, []);

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
          { ref: cardRef, className: 'pp-modal-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': props.label },
          h('div', { className: 'pp-modal-text' }, props.text),
          h(
            'div',
            { className: 'pp-modal-actions' },
            h('button', { type: 'button', className: 'pp-mini', autoFocus: true, onClick: props.onCancel }, props.cancelText),
            h('button', { type: 'button', className: 'pp-primary', onClick: props.onConfirm }, props.confirmText),
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
        text: translate('row.deleteConfirm'),
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
        text: translate('tray.removeConfirm'),
        cancelText: translate('row.cancel'),
        confirmText: translate('tray.removeAction'),
        onCancel: props.onCancel,
        onConfirm: props.onConfirm,
      });
    }

    /** Confirmation before the built-in set is replaced with a fresh language batch. */
    function SeedResetConfirm(props) {
      return h(ConfirmModal, {
        label: translate('settings.seedResetTitle'),
        text: translate('settings.seedResetConfirm', {
          removed: props.removed,
          kept: props.kept,
          added: props.added,
          language: props.language,
        }),
        cancelText: translate('row.cancel'),
        confirmText: translate('settings.seedResetButton'),
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
                      tabIndex: 0,
                      title: translate('tab.delete'),
                      onClick: (event) => {
                        event.stopPropagation();
                        if (props.onDelete) props.onDelete(workspace.id);
                      },
                      onKeyDown: (event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return;
                        event.preventDefault();
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
      return { version: POOL_VERSION, categories: [], items: [], tray: [], settings: normalizeSettings(undefined), seeded: SEED_LEVEL };
    }

    /**
     * First-run content: five behaviour switches that stay valid as one-liners.
     * They land in the 常用 / Frequent group and stay ordinary, deletable items.
     * The locale is fixed at first run; switching languages later does not rewrite
     * items the user may already have edited.
     */
    const SEED_PROMPTS = {
      zh: [
        ['seed:plan-first', '先给方案', '先列改动清单：要改哪些文件、每处改什么、怎么验证。等我确认后再动手。'],
        ['seed:scope-guard', '不动无关代码', '只改与目标直接相关的行；看到别的问题只记录，不顺手修。'],
        [
          'seed:pre-delivery',
          '交付前自检',
          '交付前给一条最小验证（命令或测试），并回答三件事：最可能出问题的地方、怎么回滚、哪些假设我没验证过。',
        ],
        ['seed:stop-restate', '停下重述', '停一下：重述我的原始要求和当前实际在做的事，指出偏差，再决定继续还是回退。'],
        ['seed:commands', '给命令不给描述', '需要我操作时直接给可粘贴的命令、路径或代码块。'],
      ],
      en: [
        [
          'seed:plan-first',
          'Plan first',
          'List the changes before touching code: which files, what changes in each, and how you will verify. Wait for my go-ahead before editing.',
        ],
        [
          'seed:scope-guard',
          'Stay in scope',
          'Change only the lines directly related to the goal. If you spot other issues, note them instead of fixing them.',
        ],
        [
          'seed:pre-delivery',
          'Check before delivery',
          'Before delivering, give one minimal verification (a command or test) and answer three things: what is most likely to break, how to roll back, and which assumptions I have not verified.',
        ],
        [
          'seed:stop-restate',
          'Stop and restate',
          'Pause: restate my original request and what you are actually doing, call out the drift, then decide whether to continue or roll back.',
        ],
        [
          'seed:commands',
          'Commands, not prose',
          'When I need to act, give me commands, paths, or code blocks I can paste directly.',
        ],
      ],
    };

    /** Templates: each one has a hole to fill and a shape the answer must take. */
    const SEED_TEMPLATES = {
      zh: [
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
      ],
      en: [
        [
          'seed:review',
          'Code review',
          'Review {{paste a diff or file}}: open with a one-sentence verdict (mergeable, and where it is blocked), then list issues as Blocking / Suggestion / Optional, each with line number, trigger, and fix. Do not restate what the code does.',
        ],
        [
          'seed:options',
          'Compare options',
          'For {{decision point}}, give 2–3 candidates in a table comparing change scope, risk, rollback difficulty, and maintenance cost. End with the recommended option and one reason.',
        ],
        [
          'seed:acceptance',
          'Acceptance checklist',
          'For {{feature name}}, output a checkable list grouped by Happy path / Edge cases / Failure recovery; each line must be an observable result that can be executed or verified.',
        ],
        [
          'seed:changelog',
          'Changelog entry',
          'Write the {{version}} entry in Keep a Changelog style: start each line with a verb, one change per line, and do not mix fixes with additions. Give breaking changes their own section.',
        ],
        [
          'seed:explain',
          'Explain this code',
          'Explain {{code or module}}: one sentence on the problem it solves, then the key invariants it relies on, the most likely pitfalls, and what must not break when changing it.',
        ],
      ],
    };

    /** A build bumps this and adds one batch; older pools receive only the new batch. */
    /** Bump when the stored item shape changes: older pools are reseeded, not migrated. */
    const POOL_VERSION = 2;

    const SEED_LEVEL = 2;
    const SEED_TOTAL = SEED_PROMPTS.en.length + SEED_TEMPLATES.en.length;

    function seedItem([id, title, body], group, now, locale) {
      return { id, group, title, body, seed: true, locale, createdAt: now, updatedAt: now };
    }

    /**
     * Every built-in id knows both language variants. The locale marker on a
     * saved item plus an exact title/body match is what proves it is still the
     * untouched built-in rather than a user edit.
     */
    const SEED_CATALOG = new Map();
    function registerSeedBatch(entries, locale, level, group) {
      for (const [id, title, body] of entries) {
        const record = SEED_CATALOG.get(id) || { level, group, content: {} };
        record.content[locale] = { title, body };
        SEED_CATALOG.set(id, record);
      }
    }
    registerSeedBatch(SEED_PROMPTS.zh, 'zh', 1, BUILTIN_GROUP.oftenuse);
    registerSeedBatch(SEED_PROMPTS.en, 'en', 1, BUILTIN_GROUP.oftenuse);
    registerSeedBatch(SEED_TEMPLATES.zh, 'zh', 2, BUILTIN_GROUP.template);
    registerSeedBatch(SEED_TEMPLATES.en, 'en', 2, BUILTIN_GROUP.template);

    function seedsAbove(level, now, locale) {
      const language = locale === 'zh' ? 'zh' : 'en';
      const batches = [
        { level: 1, items: SEED_PROMPTS[language].map((entry) => seedItem(entry, BUILTIN_GROUP.oftenuse, now, language)) },
        { level: 2, items: SEED_TEMPLATES[language].map((entry) => seedItem(entry, BUILTIN_GROUP.template, now, language)) },
      ];
      return batches.filter((batch) => batch.level > level).reduce((list, batch) => list.concat(batch.items), []);
    }

    /**
     * An untitled empty pool is not the same as a deliberate empty one: it waits
     * for apply() so the first-run seeds can follow the host locale.
     */
    function pendingPool() {
      return {
        version: POOL_VERSION,
        categories: [],
        items: [],
        tray: [],
        settings: normalizeSettings(undefined),
        seeded: 0,
      };
    }

    function seedItems(existing, level, locale) {
      const taken = new Set(existing.map((item) => item.id));
      return seedsAbove(level, Date.now(), locale).filter((item) => !taken.has(item.id));
    }

    function loadPool() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return pendingPool();
        const parsed = JSON.parse(raw);
        const storedVersion = parsed && typeof parsed.version === 'number' ? parsed.version : 1;
        if (storedVersion < POOL_VERSION) {
          // Keep the payload this build first saw: normalization is lossy, and the
          // backup is the only way back if an older shape maps differently.
          try {
            localStorage.setItem(BACKUP_KEY, raw);
          } catch (_error) {
            /* the backup is best effort; the pool itself still loads */
          }
        }
        // Seed batches are added in apply(), where the host locale is known.
        return normalizePool(parsed);
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

    // Clear orphaned image bytes once the pool is readable; the delay keeps the
    // first paint cheap and lets another window finish its own load.
    if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined' && typeof window.setTimeout === 'function') {
      window.setTimeout(() => {
        sweepImageBlobs().catch(() => {});
      }, 5000);
    }

    const ui = createStore({ open: false });

    /**
     * The sidebar page's active group tab. The pane can be remounted by the
     * host when another sidebar tab is shown, so this lives outside the
     * component and survives that remount.
     */
    const PAGE_TAB_SINGLETON = '__dshPromptPoolPageTabV1';
    const pageTabState = (() => {
      const initial = { id: 'all' };
      if (typeof window === 'undefined') return createStore(initial);
      if (!window[PAGE_TAB_SINGLETON]) window[PAGE_TAB_SINGLETON] = createStore(initial);
      return window[PAGE_TAB_SINGLETON];
    })();

    /**
     * Live workspace directory: derived (never persisted) and published by
     * whichever view can read the workspace snapshot, so one tab appears per
     * workspace in both views.
     */
    const workspaceDir = createStore({ items: [] });
    /** The composer panel knows the active session; the sidebar page does not. */
    const sessionDir = createStore({ sessionId: '' });
    /** The composer knows how many submissions are still waiting; the page does not. */
    const queueDir = createStore({ pending: 0 });

    function useSessionDir() {
      return useSyncExternalStore(sessionDir.subscribe, sessionDir.get, sessionDir.get);
    }

    function useQueueDir() {
      return useSyncExternalStore(queueDir.subscribe, queueDir.get, queueDir.get);
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
        // The group the right-click menu offered last, so it can lead the list.
        lastCaptureGroup: typeof settings.lastCaptureGroup === 'string' ? settings.lastCaptureGroup : '',
        // Annotations: where their markers draw, not what they hold.
        notesHighlight: settings.notesHighlight !== false,
        // Which tab a freshly opened pool lands on: notes, this workspace, or a
        // concrete tab ("tab:<id>").
        defaultTab: typeof settings.defaultTab === 'string' ? settings.defaultTab : '',
        // Annotations survive the two actions unless the user opts out.
        noteKeepAfterDraft: settings.noteKeepAfterDraft !== false,
        noteKeepAfterStore: settings.noteKeepAfterStore !== false,
        // Whether an item leaves the pool after it is used.
        keepAfterInsert: settings.keepAfterInsert !== false,
        keepAfterQueue: settings.keepAfterQueue !== false,
        // 0 keeps the default height; anything else is a dragged height in px.
        panelHeight: (() => {
          const value = Number(settings.panelHeight);
          return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
        })(),
        // 0 keeps the default width; anything else is a dragged width in px.
        panelWidth: (() => {
          const value = Number(settings.panelWidth);
          return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
        })(),
        // A pinned panel ignores outside clicks and stays over the conversation.
        panelPinned: settings.panelPinned === true,
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

    /** Item counts per group id for one family, for the nested rail chips. */
    function groupCounts(items, family) {
      const counts = {};
      for (const item of items) {
        const group = groupOf(item);
        if (familyOf(group) === family) counts[group] = (counts[group] || 0) + 1;
      }
      return counts;
    }

    /** Per-tab counts: every group id, each folded family, and the all tab. */
    function tabCountsOf(items) {
      const counts = { all: (items || []).length };
      for (const item of items || []) {
        const group = groupOf(item);
        counts[group] = (counts[group] || 0) + 1;
        const family = familyOf(group);
        if (family) counts['nested:' + family] = (counts['nested:' + family] || 0) + 1;
      }
      return counts;
    }

    /** Destinations offered when a captured draft is saved: the groups on show. */
    function captureChoices(categories, workspaces, currentWorkspaceId, settings) {
      const flags = normalizeSettings(settings).display;
      const list = [];
      if (flags.builtin !== 'hidden') {
        list.push({ value: BUILTIN_GROUP.note, label: translate('group.note') });
        list.push({ value: BUILTIN_GROUP.oftenuse, label: translate('group.oftenuse') });
        list.push({ value: BUILTIN_GROUP.template, label: translate('group.template') });
      }
      if (flags.custom !== 'hidden') {
        for (const category of categories || []) list.push({ value: 'custom:' + category.id, label: category.name });
      }
      if (flags.workspace !== 'hidden') {
        for (const workspace of workspaceRail(workspaces, settings, currentWorkspaceId)) {
          list.push({ value: 'workspace:' + workspace.workspaceId, label: workspace.name });
        }
      }
      // A pool with every family hidden still needs one destination.
      if (list.length === 0) list.push({ value: BUILTIN_GROUP.note, label: translate('group.note') });
      return list;
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
        const handlers = [];
        return {
          listen(fn) {
            handlers.push(fn);
            return () => {
              const at = handlers.lastIndexOf(fn);
              if (at >= 0) handlers.splice(at, 1);
            };
          },
          request(command) {
            // The newest mounted panel owns the composer; an older one takes
            // over again when the newer unmounts.
            const handler = handlers[handlers.length - 1];
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
        if (storageState.get().failed) storageState.set({ failed: false });
      } catch (_error) {
        // The in-memory copy stays usable, but both views now say it is not saved.
        if (!storageState.get().failed) storageState.set({ failed: true });
      }
    }

    /**
     * Screenshot/test override: setting this key to 'en' or 'zh' makes the
     * plugin's own copy and its new seed batches use that language without
     * changing the host UI. Unset in normal use.
     */
    const PREVIEW_LOCALE_KEY = 'dsh.prompt-pool.preview-locale';

    function previewLocaleId() {
      try {
        const value = localStorage.getItem(PREVIEW_LOCALE_KEY);
        return value === 'zh' || value === 'en' ? value : null;
      } catch (_error) {
        return null;
      }
    }

    /** The host locale at first run; unsupported locales fall back to English seeds. */
    function activeLocaleId() {
      const preview = previewLocaleId();
      if (preview) return preview;
      try {
        const snapshot =
          localeCtx && typeof localeCtx.getLocale === 'function'
            ? localeCtx.getLocale()
            : localeCtx && typeof localeCtx.getSnapshot === 'function'
              ? localeCtx.getSnapshot()
              : null;
        const active = snapshot && (snapshot.active || snapshot.id || snapshot.locale || snapshot.language);
        if (typeof active === 'string' && active) return active.toLowerCase().startsWith('zh') ? 'zh' : 'en';
      } catch (_error) {
        /* a locale service that cannot answer still gets the document fallback */
      }
      try {
        const htmlLang = typeof document !== 'undefined' && document.documentElement ? document.documentElement.lang : '';
        if (typeof htmlLang === 'string' && htmlLang) return htmlLang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
      } catch (_error) {
        /* no document in a non-browser host */
      }
      return 'en';
    }

    /**
     * Add the missing seed batches now that apply() knows the host locale. A
     * brand-new pool is seeded only here; an existing pool keeps every saved
     * item, and its ids prevent a batch from being duplicated.
     */
    function seedPoolIfNeeded() {
      const current = pool.get();
      const level = current.seeded === true ? SEED_LEVEL : Number(current.seeded) || 0;
      if (level >= SEED_LEVEL) return;
      const missing = seedItems(current.items, level, activeLocaleId());
      const next = { ...current, items: [...current.items, ...missing], seeded: SEED_LEVEL };
      persist(next);
      pool.set(next);
    }

    /** Which language variant this item still exactly matches, or null once edited. */
    function seedContentLocale(item, record) {
      for (const locale of ['zh', 'en']) {
        const content = record.content[locale];
        if (content && item.title === content.title && item.body === content.body) return locale;
      }
      return null;
    }

    /** An extra image also counts as an edit, because a reset would lose it. */
    function seedIsEdited(item, record) {
      return seedContentLocale(item, record) === null || (Array.isArray(item.images) && item.images.length > 0);
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
      /**
       * Replace every built-in item with a fresh set in `target`. A kept edit
       * becomes an ordinary item with a new id, so the incoming set can use the
       * canonical ids without a duplicate. Custom items and the tray are untouched.
       */
      resetBuiltins(target, keepEdited) {
        const language = target === 'zh' ? 'zh' : 'en';
        const current = pool.get();
        const now = Date.now();
        const items = [];
        let removed = 0;
        let kept = 0;
        for (const item of current.items) {
          const record = SEED_CATALOG.get(item.id);
          if (!record) {
            items.push(item);
            continue;
          }
          if (keepEdited && seedIsEdited(item, record)) {
            const preserved = { ...item, id: uid() };
            delete preserved.seed;
            delete preserved.locale;
            items.push(preserved);
            kept += 1;
          } else {
            removed += 1;
          }
        }
        const fresh = seedsAbove(0, now, language);
        const next = { ...current, items: [...items, ...fresh], seeded: SEED_LEVEL };
        persist(next);
        pool.set(next);
        return { removed, kept, added: fresh.length, language };
      },
      /** Copy one pool item (current text) and append the copy last. */
      duplicateItem(id) {
        mutate((state) => {
          const found = state.items.find((item) => item.id === id);
          if (!found) return null;
          const now = Date.now();
          const copy = { ...found, id: uid(), createdAt: now, updatedAt: now };
          return { ...state, items: [...state.items, copy] };
        });
      },
      patch(id, fields) {
        const before = pool.get().items.find((item) => item.id === id);
        mutate((state) => ({
          ...state,
          items: state.items.map((item) => (item.id === id ? { ...item, ...fields, updatedAt: Date.now() } : item)),
        }));
        // Saving is the point of no return for an image removed in the editor.
        // A duplicate or a queued copy may share the id, so drop it only when
        // nothing else points at it any more.
        if (before && Array.isArray(fields.images)) {
          const keep = new Set(fields.images.map((image) => image.id));
          const drop = (before.images || []).map((image) => image.id).filter((imageId) => !keep.has(imageId));
          const used = referencedImageIds();
          const garbage = drop.filter((imageId) => !used.has(imageId));
          if (garbage.length > 0) deleteImageBlobs(garbage).catch(() => {});
        }
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
      /** Drop exactly these entries, so a release cannot overwrite concurrent edits. */
      removeTrayKeys(keys) {
        const drop = new Set(keys);
        mutate((state) => {
          const next = state.tray.filter((entry) => !drop.has(entry.key));
          if (next.length === state.tray.length) return null;
          return { ...state, tray: next };
        });
      },
      /** Put cleared entries back in front; anything queued since stays behind them. */
      restoreTray(entries) {
        const restore = Array.isArray(entries) ? entries : [];
        if (restore.length === 0) return;
        mutate((state) => {
          const present = new Set(state.tray.map((entry) => entry.key));
          const missing = restore.filter((entry) => !present.has(entry.key));
          if (missing.length === 0) return null;
          return { ...state, tray: [...missing, ...state.tray] };
        });
      },
      clearTray() {
        mutate((state) => (state.tray.length === 0 ? null : { ...state, tray: [] }));
      },
    };

    function usePoolState() {
      return useSyncExternalStore(pool.subscribe, pool.get, pool.get);
    }

    function useStorageState() {
      return useSyncExternalStore(storageState.subscribe, storageState.get, storageState.get);
    }

    function useReleaseState() {
      return useSyncExternalStore(releaseState.subscribe, releaseState.get, releaseState.get);
    }

    /**
     * Editor state shared by both views: the item being edited plus the save and
     * cancel paths. Keeping them here stops the empty-row and unsaved-image
     * rules from drifting between the panel and the page.
     */
    function usePoolEditor(flash) {
      const [editing, setEditing] = useState(null);

      const startEdit = (item) => setEditing({
        id: item.id,
        group: groupOf(item),
        title: item.title,
        body: item.body,
        images: normalizeImages(item.images),
      });

      const cancelEdit = () => {
        const current = editing;
        setEditing(null);
        if (!current) return;
        const stored = pool.get().items.find((item) => item.id === current.id);
        discardUnsavedImages(current, stored);
        if (stored && !stored.body.trim() && !(stored.images && stored.images.length > 0)) poolActions.remove(stored.id);
      };

      const save = () => {
        if (!editing) return false;
        if (!editing.body.trim() && (!editing.images || editing.images.length === 0)) {
          flash({ kind: 'error', text: translate('status.emptyBody') });
          return false;
        }
        poolActions.patch(editing.id, {
          group: editing.group,
          title: editing.title.trim(),
          body: editing.body,
          images: editing.images || [],
        });
        setEditing(null);
        flash({ kind: 'ok', text: translate('status.savedToPool') });
        return true;
      };

      const pasteImages = (files) => {
        const id = editing && editing.id;
        appendImageAssets(files, editing && editing.images ? editing.images : [], (text) => flash({ kind: 'error', text })).then((images) => {
          setEditing((current) => (current && current.id === id ? { ...current, images } : current));
        });
      };

      return { editing, setEditing, startEdit, save, cancelEdit, pasteImages };
    }

    /** Editor state for a queued copy; the queue card is shared by both views. */
    function useTrayEditor(flash) {
      const [trayEditing, setTrayEditing] = useState(null);

      const saveTrayEdit = () => {
        if (!trayEditing) return;
        if (!trayEditing.body.trim() && (!trayEditing.images || trayEditing.images.length === 0)) {
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

      return { trayEditing, setTrayEditing, saveTrayEdit, pasteTrayImages };
    }

    /** One pool row (or its editor), shared by the panel and the page. */
    function renderPoolRow(props) {
      const {
        item, index, total, editing, setEditing, categories, workspaces, sessionId,
        editRows, editStyle, mainTitle, showTag, onInsert, onMain, onStartEdit,
        onQueue, onDelete, onSave, onCancel, onPasteImages, onOpenImage, onError,
      } = props;

      if (editing && editing.id === item.id) {
        return h(
          'div',
          { key: item.id, className: 'pp-edit', ...(editStyle ? { style: editStyle } : {}) },
          h('input', {
            className: 'pp-input',
            value: editing.title,
            placeholder: translate('row.titlePlaceholder'),
            onChange: (event) => setEditing({ ...editing, title: event.target.value }),
          }),
          h(MentionField, {
            value: editing.body,
            placeholder: translate('row.bodyPlaceholder'),
            rows: editRows || 4,
            autoFocus: true,
            sessionId,
            onChange: (event) => setEditing({ ...editing, body: event.target.value }),
            onPasteImages,
            onKeyDown: (event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
                onSave();
              }
            },
          }),
          h(ImagePicker, {
            images: editing.images || [],
            onChange: (images) => setEditing((current) => (current ? { ...current, images } : current)),
            onError,
            onOpen: onOpenImage,
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
              workspaces.length > 0
                ? h(
                    'optgroup',
                    { label: translate('row.familyWorkspace') },
                    workspaces.map((workspace) => h('option', { key: workspace.id, value: 'workspace:' + workspace.workspaceId }, workspace.name)),
                  )
                : null,
              categories.length > 0
                ? h(
                    'optgroup',
                    { label: translate('row.familyCustom') },
                    categories.map((category) => h('option', { key: category.id, value: 'custom:' + category.id }, category.name)),
                  )
                : null,
            ),
            h('span', { className: 'pp-grow' }),
            h('button', { type: 'button', className: 'pp-mini', onClick: onCancel }, translate('row.cancel')),
            h('button', { type: 'button', className: 'pp-primary', onClick: onSave }, translate('row.save')),
          ),
        );
      }

      return h(
        'div',
        { key: item.id, className: 'pp-row pp-page-item' },
        h(IconButton, { name: 'insert', label: translate('row.insert'), onClick: () => onInsert(item) }),
        h(TrayAdd, { label: translate('row.select'), onClick: () => onQueue(item) }),
        h(
          'div',
          { className: 'pp-main', ...(mainTitle ? { title: mainTitle } : {}), onClick: () => (onMain || onStartEdit)(item) },
          h('div', { className: 'pp-title' }, item.title || item.body.split('\n')[0] || (item.images && item.images[0] && (item.images[0].name || translate('image.only'))) || translate('group.untitled')),
          item.body.trim() === (item.title || '').trim() ? null : h('div', { className: 'pp-body' }, item.body),
          h(ImageStrip, { images: item.images, compact: true, onOpen: onOpenImage }),
        ),
        showTag ? h('span', { className: 'pp-tag' }, clipLabel(groupLabelOf(item, categories, workspaces))) : null,
        h(
          'div',
          { className: 'pp-actions' },
          h(IconButton, { name: 'up', label: translate('row.up'), disabled: index === 0, onClick: () => poolActions.move(item.id, -1) }),
          h(IconButton, { name: 'down', label: translate('row.down'), disabled: index === total - 1, onClick: () => poolActions.move(item.id, 1) }),
          h(IconButton, { name: 'edit', label: translate('row.edit'), onClick: () => onStartEdit(item) }),
          h(IconButton, { name: 'copy', label: translate('row.duplicate'), onClick: () => poolActions.duplicateItem(item.id) }),
          h(IconButton, { name: 'trash', label: translate('row.delete'), danger: true, onClick: () => onDelete(item) }),
        ),
      );
    }

    /** The send-queue card, shared by the panel and the page. */
    function renderTrayCard(props) {
      const {
        entries, queuePending, collapsed, busy, sessionId, trayRef,
        editing, setEditing, onSaveEdit, onPasteImages, onClear, onRelease,
        onRemove, onOpenImage, onError,
      } = props;

      if (collapsed) {
        return h(
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
          h('span', { className: 'pp-hint' }, translate('tray.selected', { n: entries.length })),
          h('span', { className: 'pp-grow' }),
        );
      }

      return h(
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
          h('span', { className: 'pp-hint' }, translate('tray.selected', { n: entries.length })),
          queuePending > 0 ? h('span', { className: 'pp-hint' }, translate('tray.queue', { n: queuePending })) : null,
          h('span', { className: 'pp-grow' }),
          entries.length > 0 ? h('button', { type: 'button', className: 'pp-link', onClick: onClear }, translate('tray.clear')) : null,
          entries.length > 0
            ? h('button', { type: 'button', className: 'pp-primary', disabled: busy, onClick: onRelease }, translate('tray.release'))
            : null,
        ),
        h(
          'div',
          { className: entries.length === 0 ? 'pp-tray pp-tray-empty' : 'pp-tray', ref: trayRef },
          entries.length === 0
            ? h('div', { className: 'pp-hint' }, translate('tray.empty'))
            : entries.map((entry, index) => {
              if (editing && editing.key === entry.key) {
                return h(
                  'div',
                  { key: entry.key, className: 'pp-edit', style: { margin: '4px 0' } },
                  h(MentionField, {
                    value: editing.body,
                    placeholder: translate('row.bodyPlaceholder'),
                    rows: 4,
                    autoFocus: true,
                    sessionId,
                    onChange: (event) => setEditing((current) => (current ? { ...current, body: event.target.value } : current)),
                    onPasteImages,
                    onKeyDown: (event) => {
                      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                        event.preventDefault();
                        onSaveEdit();
                      }
                    },
                  }),
                  h(ImagePicker, {
                    images: editing.images || [],
                    onChange: (images) => setEditing((current) => (current ? { ...current, images } : current)),
                    onError,
                    onOpen: onOpenImage,
                  }),
                  h(
                    'div',
                    { className: 'pp-edit-actions' },
                    h('button', { type: 'button', className: 'pp-mini', onClick: () => setEditing(null) }, translate('row.cancel')),
                    h('button', { type: 'button', className: 'pp-primary', onClick: onSaveEdit }, translate('row.save')),
                  ),
                );
              }
              return h(
                'div',
                { key: entry.key, className: 'pp-chip' },
                h('span', { className: 'pp-chip-n' }, String(index + 1) + '.'),
                h('div', { className: 'pp-chip-t', title: entry.body }, entry.body),
                h(ImageStrip, { images: entry.images, compact: true, max: 4, onOpen: onOpenImage }),
                h(
                  'div',
                  { className: 'pp-chip-actions' },
                  h(IconButton, { name: 'up', label: translate('row.up'), disabled: index === 0, onClick: () => poolActions.moveTray(entry.key, -1) }),
                  h(IconButton, { name: 'down', label: translate('row.down'), disabled: index === entries.length - 1, onClick: () => poolActions.moveTray(entry.key, 1) }),
                  h(IconButton, { name: 'edit', label: translate('row.edit'), onClick: () => setEditing({ key: entry.key, body: entry.body || '', images: normalizeImages(entry.images) }) }),
                  h(IconButton, { name: 'copy', label: translate('tray.duplicate'), onClick: () => poolActions.duplicateTray(entry.key) }),
                  h(IconButton, { name: 'close', label: translate('tray.remove'), onClick: () => onRemove(entry) }),
                ),
              );
            }),
        ),
      );
    }

    /** Blocks the pool while a release runs; only Stop is allowed. */
    function renderReleaseOverlay(props) {
      const state = props.state;
      if (!state || !state.active) return null;
      return h(
        'div',
        {
          className: 'pp-release-mask',
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': translate('release.title'),
          onMouseDown: (event) => event.stopPropagation(),
          onKeyDown: (event) => {
            if (event.key === 'Tab') event.preventDefault();
          },
        },
        h(
          'div',
          { className: 'pp-release-card' },
          h('div', { className: 'pp-release-title' }, translate('release.title')),
          h('div', { className: 'pp-release-count', 'aria-live': 'polite' }, translate('release.progress', { sent: state.sent, total: state.total })),
          h('div', { className: 'pp-hint' }, translate('release.hint')),
          h(
            'button',
            { type: 'button', className: 'pp-primary', autoFocus: true, disabled: state.stopping, onClick: props.onStop },
            state.stopping ? translate('release.stopping') : translate('release.stop'),
          ),
        ),
      );
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
          // The same glyph as an annotation's "generate draft" action: an arrow
          // dropping into the composer box.
          return h(
            'svg',
            { width: 15, height: 15, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
            h('path', { d: 'M3.6 12.4h12.8v3.4H3.6z' }),
            h('path', { d: 'M10 3v6.4' }),
            h('path', { d: 'M7.4 6.9 10 9.4l2.6-2.5' }),
          );
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
        case 'pin':
          return h(
            'svg',
            base,
            h('path', { d: 'M3.6 1.6h4.8' }),
            h('path', { d: 'M4.5 1.6v3.4L2.6 7h6.8L7.5 5V1.6' }),
            h('path', { d: 'M6 7v3.6' }),
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
      const release = useReleaseState();
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
            disabled: release.active,
            title: hint,
            'aria-label': hint,
            'aria-haspopup': 'dialog',
            'aria-expanded': view.open ? 'true' : 'false',
            onMouseDown: (event) => event.preventDefault(),
            onClick: () => {
              if (release.active) return;
              ui.set({ open: !ui.get().open });
            },
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
        const count = props.counts && typeof props.counts[tab.id] === 'number' ? props.counts[tab.id] : 0;
        return h(
          'button',
          {
            key: tab.id,
            type: 'button',
            className: 'pp-tab',
            'data-active': active ? 'true' : 'false',
            'data-group': tab.group,
            title: tab.category ? translate('tab.renameHint') : undefined,
            onClick: () => props.onSelect(tab.id),
            onDoubleClick: tab.category ? () => setRenaming({ id: tab.id, name: tab.label, original: tab.label }) : undefined,
          },
          tab.label,
          count > 0 && tab.id !== 'all'
            ? h('span', { className: 'pp-tab-count' }, String(count))
            : null,
          tab.category && active
            ? h(
                'span',
                {
                  className: 'pp-tab-x',
                  role: 'button',
                  tabIndex: 0,
                  title: translate('tab.delete'),
                  onClick: (event) => {
                    event.stopPropagation();
                    props.onDelete(tab.id);
                  },
                  onKeyDown: (event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
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
      const storage = useStorageState();
      const releaseInfo = useReleaseState();
      const noteBar = useNoteStatus();
      const queueCollapsed = state.settings && state.settings.queueCollapsed === true;
      const workspaces = useWorkspaceDir();
      const sessionHint = useSessionDir().sessionId;
      const queuePending = useQueueDir().pending;
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
      const notesState = useNotesState();
      const notesList = notesState.items
        .filter((note) => note.sessionId === activeSessionId)
        .sort((left, right) => (left.order - right.order) || (left.createdAt - right.createdAt));
      const baseTabs = buildTabs(state.categories, workspaceList, state.settings, currentWorkspaceId);
      // The annotation tab is always present, so the feature stays discoverable.
      const tabs = [{ id: 'notes', label: translate('note.title'), group: 'notes' }, ...baseTabs];
      const captureGroups = captureChoices(state.categories, workspaceList, currentWorkspaceId, state.settings);
      const tabCounts = {
        ...tabCountsOf(state.items),
        notes: notesList.length,
      };
      const [tab, setPageTab] = useState(() => pageTabState.get().id || 'all');
      const setTab = (id) => {
        pageTabState.set({ id });
        setPageTab(id);
      };
      // The page opens on the tab chosen in Settings (once per mount).
      const defaultAppliedRef = useRef(false);
      useEffect(() => {
        if (defaultAppliedRef.current) return;
        defaultAppliedRef.current = true;
        const pref = normalizeSettings(state.settings).defaultTab;
        const resolved = resolveDefaultTab(pref, tabs, currentWorkspaceId, notesList.length > 0);
        if (resolved) setTab(resolved);
      }, []);
      const [query, setQuery] = useState('');
      const [settingsOpen, setSettingsOpen] = useState(false);
      const [pendingCategory, setPendingCategory] = useState(null);
      const [confirmClear, setConfirmClear] = useState(false);
      const [pendingDelete, setPendingDelete] = useState(null);
      const [pendingRemove, setPendingRemove] = useState(null);
      const [captureOpen, setCaptureOpen] = useState(false);
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
      const { editing, setEditing, startEdit, save, cancelEdit, pasteImages } = usePoolEditor(flash);
      const { trayEditing, setTrayEditing, saveTrayEdit, pasteTrayImages } = useTrayEditor(flash);
      // A stored tab can point at a group that was hidden or deleted since.
      useEffect(() => {
        if (tabs.some((entry) => entry.id === tab)) return;
        setTab('all');
      }, [tabs, tab]);
      // A failed write outranks a transient toast: the change is not saved.
      const notice = status || (storage.failed ? { kind: 'error', text: translate('status.storageFailed') } : null);
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

      /** Ask the panel whether the composer has content before opening the chooser. */
      const openCapture = () => {
        let result;
        try {
          result = bridge.request({ type: 'capture-check' });
        } catch (error) {
          result = { ok: false, reason: String((error && error.message) || error) };
        }
        Promise.resolve(result).then(
          (value) => {
            if (value && value.ok) {
              if (value.ready) {
                setCaptureOpen(true);
              } else {
                flash({ kind: 'error', text: translate('status.nothing') });
              }
              return;
            }
            flash({ kind: 'error', text: translate('status.noComposer') });
          },
          () => flash({ kind: 'error', text: translate('status.noComposer') }),
        );
      };

      /** The page has no composer, so the mounted panel inserts the reply. */
      const composeSessionNotes = () => {
        let result;
        try {
          result = bridge.request({ type: 'compose-notes' });
        } catch (_error) {
          return false;
        }
        const ok = Boolean(result && result.ok);
        if (ok && normalizeSettings(state.settings).noteKeepAfterDraft === false) {
          notesActions.clearSession(activeSessionId);
        }
        return ok;
      };

      /** The page cannot write the composer, so the mounted panel inserts the note. */
      const insertNote = (note) => {
        let result;
        try {
          result = bridge.request({ type: 'insert-text', text: composeNoteLine(note) });
        } catch (_error) {
          return false;
        }
        return Boolean(result && result.ok);
      };

      /** Store the session's annotations as one prompt, from the page header. */
      const storeNotesPrompt = (event) => {
        const choices = captureChoices(state.categories, workspaceList, currentWorkspaceId, state.settings);
        const preferred = currentWorkspaceId && choices.some((entry) => entry.value === 'workspace:' + currentWorkspaceId)
          ? 'workspace:' + currentWorkspaceId
          : BUILTIN_GROUP.oftenuse;
        const ordered = choices.some((entry) => entry.value === preferred)
          ? [...choices.filter((entry) => entry.value === preferred), ...choices.filter((entry) => entry.value !== preferred)]
          : choices;
        const rect = event && event.currentTarget && event.currentTarget.getBoundingClientRect
          ? event.currentTarget.getBoundingClientRect()
          : null;
        notePrompt.set({
          open: true,
          target: { kind: 'reply' },
          choices: ordered,
          defaultValue: preferred,
          anchor: rect
            ? { left: Math.round(rect.left), right: Math.round(rect.right), top: Math.round(rect.top), bottom: Math.round(rect.bottom) }
            : { left: 120, right: 160, top: 60, bottom: 90 },
          token: Date.now(),
          onPick: (group) => {
            closeNotePrompt();
            if (!group) return;
            const text = composeNotesReply(notesList);
            poolActions.add({
              id: uid(),
              group,
              title: draftTitle(text),
              body: text,
              images: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
            if (normalizeSettings(state.settings).noteKeepAfterStore === false) {
              notesActions.clearSession(activeSessionId);
            }
            const resolved = resolveGroup(group, state.categories, workspaceList);
            showToast(translate('note.composeStored', { group: resolved ? resolved.label : translate('row.noCategory') }), 'ok');
          },
        });
      };

      /** The page cannot read the composer, so the mounted panel performs it. */
      const captureDraft = (group) => {
        let result;
        try {
          result = bridge.request({ type: 'capture', group });
        } catch (error) {
          result = { ok: false, reason: String((error && error.message) || error) };
        }
        Promise.resolve(result).then(
          (value) => {
            if (value && value.ok) {
              const skipped = Number(value.skipped) || 0;
              const label = typeof value.label === 'string' ? value.label : '';
              flash(skipped > 0
                ? {
                    kind: 'info',
                    text: label
                      ? translate('status.savedPartialTo', { group: label, n: skipped })
                      : translate('status.savedPartial', { n: skipped }),
                  }
                : {
                    kind: 'ok',
                    text: label ? translate('status.savedTo', { group: label }) : translate('status.saved'),
                  });
              return;
            }
            const reason = value && value.reason;
            flash({ kind: 'error', text: translate(reason === 'empty' ? 'status.nothing' : 'status.noComposer') });
          },
          () => flash({ kind: 'error', text: translate('status.noComposer') }),
        );
      };

      /** The confirmed delete: drop the item, then offer the same undo as the panel. */
      const removeItem = (item, text) => {
        const index = pool.get().items.findIndex((entry) => entry.id === item.id);
        poolActions.remove(item.id);
        flash({
          kind: 'info',
          text: text || translate('status.deleted'),
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

      const rowOf = (item, index) => renderPoolRow({
        key: item.id,
        item,
        index,
        total: items.length,
        editing,
        setEditing,
        categories: state.categories,
        workspaces: workspaces.items,
        sessionId: activeSessionId,
        editRows: 5,
        editStyle: { margin: '6px 0' },
        showTag: tab === 'all',
        onInsert: (entry) => sendToComposer(
          { type: 'insert', text: entry.body, images: normalizeImages(entry.images) },
          entry.body.trim() ? translate('status.inserted') : translate('image.inserted'),
          () => {
            if (!normalizeSettings(state.settings).keepAfterInsert) removeItem(entry, translate('status.insertedAndRemoved'));
          },
        ),
        onMain: startEdit,
        onStartEdit: startEdit,
        onQueue: queueItem,
        onDelete: setPendingDelete,
        onSave: save,
        onCancel: cancelEdit,
        onPasteImages: pasteImages,
        onOpenImage: openImage,
        onError: (text) => flash({ kind: 'error', text }),
      });

      // A folded family renders its groups as chips inside one tab.
      const customGroups = state.categories.map((category) => ({ id: 'custom:' + category.id, name: category.name }));
      const customActive = customGroups.some((entry) => entry.id === customPick)
        ? customPick
        : customGroups.length > 0
          ? customGroups[0].id
          : '';
      const customCounts = groupCounts(state.items, 'custom');
      const builtinCounts = groupCounts(state.items, 'builtin');
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
                  counts: builtinCounts,
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
          h('input', {
            key: 'search',
            className: 'pp-search',
            value: query,
            placeholder: translate('page.search'),
            'aria-label': translate('page.search'),
            onChange: (event) => setQuery(event.target.value),
          }),
          tab === 'notes'
            ? [
                h('button', { key: 'store', type: 'button', className: 'pp-mini', title: translate('note.composeStoreHint'), onClick: storeNotesPrompt }, translate('note.composeStore')),
                h('button', { key: 'draft', type: 'button', className: 'pp-mini', title: translate('note.composeHint'), onClick: composeSessionNotes }, translate('note.compose')),
              ]
            : [
                h('button', { key: 'new', type: 'button', className: 'pp-mini', onClick: create }, '＋ ', translate('page.new')),
                h('button', { key: 'capture', type: 'button', className: 'pp-mini', title: translate('panel.captureHint'), onClick: openCapture }, translate('panel.capture')),
              ],
          h(SettingsButton, { active: settingsOpen, onClick: () => setSettingsOpen(!settingsOpen) }),
        ),
        h(
          'div',
          { className: 'pp-bar', style: { padding: '8px 12px 2px' } },
          h(TabBar, {
            tabs: tabs,
            counts: tabCounts,
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
                const entries = pool.get().tray.slice();
                poolActions.clearTray();
                setConfirmClear(false);
                if (entries.length === 0) return;
                flash({
                  kind: 'info',
                  text: translate('status.cleared', { n: entries.length }),
                  undo: () => {
                    poolActions.restoreTray(entries);
                    setStatus(null);
                  },
                });
              },
              onCancel: () => setConfirmClear(false),
            })
          : null,
        pendingDelete
          ? h(ItemDeleteConfirm, {
              onCancel: () => setPendingDelete(null),
              onConfirm: () => {
                removeItem(pendingDelete);
                setPendingDelete(null);
              },
            })
          : null,
        pendingRemove && state.tray.some((entry) => entry.key === pendingRemove.key)
          ? h(TrayRemoveConfirm, {
              onCancel: () => setPendingRemove(null),
              onConfirm: () => {
                poolActions.removeTray(pendingRemove.key);
                setPendingRemove(null);
              },
            })
          : null,
        captureOpen
          ? h(CaptureMenu, {
              groups: captureGroups,
              onPick: (group) => {
                setCaptureOpen(false);
                captureDraft(group);
              },
              onCancel: () => setCaptureOpen(false),
            })
          : null,
        h(
          'div',
          { className: 'pp-page-body', ref: pageListRef },
          settingsOpen
            ? h(PromptPoolSettings, { currentWorkspaceId })
            : tab === 'notes'
              ? h(NotesView, {
                  notes: notesList,
                  sessionId: activeSessionId,
                  onCompose: composeSessionNotes,
                  onInsertNote: insertNote,
                  hideActions: true,
                  filter: query,
                  categories: state.categories,
                  workspaces: workspaceList,
                  currentWorkspaceId,
                  settings: state.settings,
                })
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
          tab === 'notes' && noteBar.text
            ? h('div', { className: 'pp-notes-bar', 'data-kind': noteBar.kind, role: 'status' }, noteBar.text)
            : null,
          notice
            ? h(
                'div',
                { className: 'pp-status pp-status-float', role: 'status', 'aria-live': 'polite', 'data-kind': notice.kind || 'info' },
                h('span', null, notice.text),
                notice.undo
                  ? h(
                      'button',
                      {
                        type: 'button',
                        className: 'pp-link',
                        onClick: () => {
                          notice.undo();
                        },
                      },
                      translate('status.undo'),
                    )
                  : null,
              )
            : null,
          settingsOpen || tab === 'notes'
            ? null
            : renderTrayCard({
                entries: state.tray,
                queuePending,
                collapsed: queueCollapsed,
                sessionId: activeSessionId,
                trayRef,
                editing: trayEditing,
                setEditing: setTrayEditing,
                onSaveEdit: saveTrayEdit,
                onPasteImages: pasteTrayImages,
                onClear: () => setConfirmClear(true),
                onRelease: () => sendToComposer({ type: 'release' }, translate('status.releaseSent')),
                onRemove: setPendingRemove,
                onOpenImage: openImage,
                onError: (text) => flash({ kind: 'error', text }),
              }),
        h(ImageLightbox, { preview, onClose: closeImage }),
        ),
        renderReleaseOverlay({ state: releaseInfo, onStop: () => bridge.request({ type: 'stop' }) }),
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
      const tabOptions = buildTabs(state.categories, wsItems, settings, wsCurrentId);
      const defaultTab = settings.defaultTab || '';
      const defaultTabMode = defaultTab === 'notes'
        ? 'notes'
        : defaultTab === '__workspace__'
          ? 'workspace'
          : defaultTab.indexOf('tab:') === 0
            ? 'custom'
            : '';
      const [seedKeepEdited, setSeedKeepEdited] = useState(true);
      const [seedConfirm, setSeedConfirm] = useState(false);
      const [seedStatus, setSeedStatus] = useState('');
      const seedItems = state.items.filter((item) => SEED_CATALOG.has(item.id));
      const editedSeeds = seedItems.filter((item) => seedIsEdited(item, SEED_CATALOG.get(item.id)));
      const seedLanguageLabel = translate(
        activeLocaleId() === 'zh' ? 'settings.seedLanguageZh' : 'settings.seedLanguageEn',
      );
      const seedRemoveCount = seedItems.length - (seedKeepEdited ? editedSeeds.length : 0);
      const seedKeptCount = seedKeepEdited ? editedSeeds.length : 0;
      const resetSeeds = () => {
        const result = poolActions.resetBuiltins(activeLocaleId(), seedKeepEdited);
        setSeedConfirm(false);
        setSeedStatus(translate('settings.seedResetDone', result));
      };
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
          hint ? h('div', { className: 'pp-hint pp-set-hint' }, translate(hint)) : null,
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
          h(
            'button',
            {
              type: 'button',
              className: 'pp-tab',
              'data-active': section === 'notes' ? 'true' : 'false',
              onClick: () => setSection('notes'),
            },
            translate('settings.tab.notes'),
          ),
        ),
        h(
          'div',
          { className: 'pp-set-group pp-set-card', style: { display: section === 'notes' ? '' : 'none' } },
          h('div', { className: 'pp-hint pp-set-intro' }, translate('settings.notesIntro')),
          h('div', { className: 'pp-set-divider' }),
          check('noteKeepAfterDraft', 'settings.notesKeepDraft', 'settings.notesKeepDraftHint'),
          h('div', { className: 'pp-set-divider' }),
          check('noteKeepAfterStore', 'settings.notesKeepStore', 'settings.notesKeepStoreHint'),
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
          { className: 'pp-set-group pp-set-card', style: { display: section === 'prompts' ? '' : 'none' } },
          h('div', { className: 'pp-set-label' }, translate('settings.seedCard')),
          h(
            'div',
            { className: 'pp-hint' },
            translate('settings.seedHint', { builtin: seedItems.length, edited: editedSeeds.length }),
          ),
          h(
            'label',
            { className: 'pp-set-row' },
            h('input', {
              type: 'checkbox',
              name: 'seedKeepEdited',
              checked: seedKeepEdited,
              onChange: () => setSeedKeepEdited((value) => !value),
            }),
            h('span', null, translate('settings.seedKeepEdited')),
          ),
          h('div', { className: 'pp-hint pp-set-hint' }, translate('settings.seedKeepEditedHint')),
          h(
            'div',
            { className: 'pp-set-actions' },
            h(
              'span',
              { className: 'pp-hint pp-set-note' },
              translate('settings.seedNote', { language: seedLanguageLabel }),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'pp-mini',
                'data-pp': 'seed-reset',
                onClick: () => setSeedConfirm(true),
              },
              translate('settings.seedResetButton'),
            ),
          ),
          seedStatus ? h('div', { className: 'pp-hint' }, seedStatus) : null,
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
          h('div', { className: 'pp-set-label' }, translate('settings.defaultTab')),
          h(
            'div',
            { className: 'pp-set-radios' },
            [
              { mode: 'notes', key: 'settings.defaultTabNotes', value: 'notes' },
              { mode: 'workspace', key: 'settings.defaultTabWorkspace', value: '__workspace__' },
              { mode: 'custom', key: 'settings.defaultTabOther', value: '' },
            ].map((entry) => h(
              'div',
              { key: entry.mode, className: 'pp-set-radio-row' },
              h(
                'label',
                { className: 'pp-set-radio' },
                h('input', {
                  type: 'radio',
                  name: 'pp-default-tab',
                  checked: defaultTabMode === entry.mode,
                  onChange: () => {
                    if (entry.mode === 'custom') {
                      const previous = defaultTab.indexOf('tab:') === 0 ? defaultTab : '';
                      const first = tabOptions[0];
                      poolActions.setSetting('defaultTab', previous || (first ? 'tab:' + first.id : ''));
                      return;
                    }
                    poolActions.setSetting('defaultTab', entry.value);
                  },
                }),
                h('span', null, translate(entry.key)),
              ),
              entry.mode === 'custom'
                ? h(
                    'select',
                    {
                      className: 'pp-select',
                      // Always visible next to "other"; picking a tab here also
                      // switches the choice to it.
                      value: defaultTabMode === 'custom' ? defaultTab.slice(4) : (tabOptions[0] ? tabOptions[0].id : ''),
                      onChange: (event) => poolActions.setSetting('defaultTab', 'tab:' + event.target.value),
                    },
                    tabOptions.map((tab) => h(
                      'option',
                      { key: tab.id, value: tab.id },
                      tab.label,
                    )),
                  )
                : null,
            )),
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
        seedConfirm
          ? h(SeedResetConfirm, {
              removed: seedRemoveCount,
              kept: seedKeptCount,
              added: SEED_TOTAL,
              language: seedLanguageLabel,
              onCancel: () => setSeedConfirm(false),
              onConfirm: resetSeeds,
            })
          : null,
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

      const sessionTag = () => (props.sessionId ? 'session=' + String(props.sessionId).slice(-8) : translate('mention.noSessionTag'));

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
              translate('mention.failed') + ': ' + String((error && error.message) || error).slice(0, 90) + ' · ' + sessionTag(),
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
                (abort.signal.aborted ? translate('mention.timeout') : translate('mention.failed') + ': ' + message) +
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
            apply(entriesOfListing(listing).map((entry) => ({ name: entry.name, hint: entry.directory ? translate('mention.directory') : '' })), query);
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
              setNote(translate('mention.failed') + ': ' + String((error && error.message) || error).slice(0, 90));
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

    // ------------------------------------------------------------------ notes
    /**
     * Annotations on a rendered assistant reply. They are stored by value (the
     * quoted text plus its surroundings) instead of by DOM node, so a re-render,
     * a fold or a paging remount costs the pin only until the text is back.
     */
    const NOTES_KEY = 'dsh.prompt-pool.notes.v1';
    const NOTES_SINGLETON = '__dshPromptPoolNotesV1';
    /** One Highlight object carries every annotated range. */
    const NOTE_HIGHLIGHT = 'prompt-pool-note';
    /** The always-open note card: fixed width so the gutter test is exact. */
    /** Narrower columns fall back to numbered pins instead of cards. */
    /** Tallest a card can get, for the occlusion test against a floating panel. */

    /** Bumped when badge placement changes, so old chips are rebuilt in place. */
    const NOTE_CHIP_VERSION = '3';

    /** Annotation kinds: the glyph, tint and label drive the badge and highlight. */
    const NOTE_KINDS = [
      { id: 'comment', icon: '✎', tint: '255,191,36', label: 'note.kind.comment' },
      { id: 'question', icon: '?', tint: '244,114,114', label: 'note.kind.question' },
      { id: 'agree', icon: '✓', tint: '74,222,128', label: 'note.kind.agree' },
      { id: 'disagree', icon: '✕', tint: '239,68,68', label: 'note.kind.disagree' },
      { id: 'idea', icon: '💡', tint: '96,165,250', label: 'note.kind.idea' },
      { id: 'todo', icon: '□', tint: '251,191,36', label: 'note.kind.todo' },
    ];
    const NOTE_KIND_IDS = NOTE_KINDS.map((kind) => kind.id);
    const NOTE_KIND_DEFAULT = 'comment';
    /** Inline annotations are a short badge: ten characters at most. */
    const NOTE_BODY_MAX = 10;

    function noteKind(kind) {
      return NOTE_KINDS.find((entry) => entry.id === kind) || NOTE_KINDS[0];
    }

    /** The visible badge text, whitespace-collapsed and capped. */
    function noteBodyText(body) {
      const text = String(body || '').replace(/\s+/g, ' ').trim();
      return text.length > NOTE_BODY_MAX ? text.slice(0, NOTE_BODY_MAX) + '…' : text;
    }

    /** Keep only fields the annotation UI reads; anything else is dropped. */
    function normalizeNote(raw) {
      if (!raw || typeof raw !== 'object') return null;
      const quote = typeof raw.quote === 'string' ? raw.quote : '';
      if (!quote.trim()) return null;
      return {
        id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
        sessionId: typeof raw.sessionId === 'string' ? raw.sessionId : '',
        nodeKey: typeof raw.nodeKey === 'string' ? raw.nodeKey : '',
        quote,
        prefix: typeof raw.prefix === 'string' ? raw.prefix : '',
        suffix: typeof raw.suffix === 'string' ? raw.suffix : '',
        offset: Number.isFinite(Number(raw.offset)) ? Number(raw.offset) : 0,
        order: Number.isFinite(Number(raw.order)) ? Number(raw.order) : 0,
        kind: NOTE_KIND_IDS.indexOf(raw.kind) >= 0 ? raw.kind : NOTE_KIND_DEFAULT,
        // Where the user dragged this note's card, relative to its passage.
        dx: Number.isFinite(Number(raw.dx)) ? Number(raw.dx) : 0,
        dy: Number.isFinite(Number(raw.dy)) ? Number(raw.dy) : 0,
        // Set once the note was promoted into a pool group; the row keeps it
        // visible with a "stored" marker instead of deleting the record.
        promotedGroup: typeof raw.promotedGroup === 'string' ? raw.promotedGroup : '',
        promotedAt: Number.isFinite(Number(raw.promotedAt)) ? Number(raw.promotedAt) : 0,
        body: typeof raw.body === 'string' ? raw.body : '',
        createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now(),
        updatedAt: Number.isFinite(Number(raw.updatedAt)) ? Number(raw.updatedAt) : Date.now(),
      };
    }

    function loadNotes() {
      try {
        const raw = localStorage.getItem(NOTES_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        const items = Array.isArray(parsed && parsed.items) ? parsed.items.map(normalizeNote).filter(Boolean) : [];
        return { version: 1, items };
      } catch (_error) {
        return { version: 1, items: [] };
      }
    }

    const notes = (() => {
      if (typeof window === 'undefined') return createStore({ version: 1, items: [] });
      if (!window[NOTES_SINGLETON]) window[NOTES_SINGLETON] = createStore(loadNotes());
      return window[NOTES_SINGLETON];
    })();

    function mutateNotes(fn) {
      const prev = notes.get();
      const next = fn(prev);
      if (!next || next === prev) return;
      notes.set(next);
      try {
        localStorage.setItem(NOTES_KEY, JSON.stringify(next));
      } catch (_error) {
        /* a full store keeps the in-memory copy; the pool reports write failures */
      }
    }

    const notesActions = {
      add(note) {
        mutateNotes((state) => ({ ...state, items: [...state.items, note] }));
        return note;
      },
      patch(id, fields) {
        mutateNotes((state) => ({
          ...state,
          items: state.items.map((note) => (note.id === id ? { ...note, ...fields, updatedAt: Date.now() } : note)),
        }));
      },
      remove(id) {
        mutateNotes((state) => (state.items.some((note) => note.id === id)
          ? { ...state, items: state.items.filter((note) => note.id !== id) }
          : null));
      },
      clearSession(sessionId) {
        mutateNotes((state) => {
          const items = state.items.filter((note) => note.sessionId !== sessionId);
          return items.length === state.items.length ? null : { ...state, items };
        });
      },
      /** Drop every drag offset in one session: the cards return to their anchors. */
      resetPositions(sessionId) {
        mutateNotes((state) => {
          let touched = false;
          const items = state.items.map((note) => {
            if (note.sessionId !== sessionId) return note;
            if ((note.dx || 0) === 0 && (note.dy || 0) === 0) return note;
            touched = true;
            return { ...note, dx: 0, dy: 0 };
          });
          return touched ? { ...state, items } : null;
        });
      },
    };

    /**
     * A frame-level toast. The notes views live inside the composer overlay or a
     * sidebar column, so an inline status would be clipped or lost in the list;
     * the toast is appended to the body and floats above every surface.
     */
    let toastNode = null;
    let toastTimer = 0;
    function ensureToastStyle() {
      if (typeof document === 'undefined') return;
      if (document.querySelector('style[data-pp-toast]')) return;
      const style = document.createElement('style');
      style.setAttribute('data-pp-toast', '');
      style.textContent = '.pp-toast{position:fixed;left:50%;bottom:30px;z-index:2147483000;max-width:min(520px,calc(100vw - 32px));padding:7px 13px;border-radius:8px;background:rgba(24,24,26,.94);color:#fff;font-size:12px;line-height:1.5;box-shadow:0 12px 30px rgba(0,0,0,.28);opacity:0;transform:translate(-50%,8px);transition:opacity .16s ease,transform .16s ease;pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pp-toast[data-show="true"]{opacity:1;transform:translate(-50%,0)}.pp-toast[data-kind="error"]{background:rgba(160,38,38,.95)}';
      document.head.appendChild(style);
    }
    function showToast(text, kind) {
      if (typeof document === 'undefined' || !text) return;
      ensureToastStyle();
      if (!toastNode) {
        toastNode = document.createElement('div');
        toastNode.className = 'pp-toast';
        toastNode.setAttribute('role', 'status');
        document.body.appendChild(toastNode);
      }
      toastNode.textContent = text;
      toastNode.setAttribute('data-kind', kind === 'error' ? 'error' : 'ok');
      toastNode.setAttribute('data-show', 'true');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        if (toastNode) toastNode.removeAttribute('data-show');
      }, 2300);
    }

    /** The session whose transcript is on screen; published by the notes layer. */
    const chatView = (() => {
      if (typeof window === 'undefined') return createStore({ sessionId: '' });
      if (!window.__dshPromptPoolNotesViewV1) window.__dshPromptPoolNotesViewV1 = createStore({ sessionId: '' });
      return window.__dshPromptPoolNotesViewV1;
    })();
    /** A newly captured anchor waiting for the overlay to open its editor. */
    const noteDraft = (() => {
      if (typeof window === 'undefined') return createStore({ anchor: null, sessionId: '', token: 0 });
      if (!window.__dshPromptPoolNotesDraftV1) window.__dshPromptPoolNotesDraftV1 = createStore({ anchor: null, sessionId: '', token: 0 });
      return window.__dshPromptPoolNotesDraftV1;
    })();
    /** A request to scroll to one annotation and open it. */
    const noteFocus = (() => {
      if (typeof window === 'undefined') return createStore({ id: '', token: 0 });
      if (!window.__dshPromptPoolNotesFocusV1) window.__dshPromptPoolNotesFocusV1 = createStore({ id: '', token: 0 });
      return window.__dshPromptPoolNotesFocusV1;
    })();

    /**
     * The "pick a group" popup for storing a prompt. It lives in the frame
     * overlay (not in the pool list) so it can float over the panel instead of
     * pushing content around or being clipped by the list.
     */
    const notePrompt = (() => {
      const empty = { open: false, target: null, choices: [], anchor: null, defaultValue: '', onPick: null, token: 0 };
      if (typeof window === 'undefined') return createStore(empty);
      if (!window.__dshPromptPoolNotePromptV1) window.__dshPromptPoolNotePromptV1 = createStore(empty);
      return window.__dshPromptPoolNotePromptV1;
    })();
    const closeNotePrompt = () => notePrompt.set({ open: false, target: null, choices: [], anchor: null, defaultValue: '', onPick: null, token: 0 });

    /** The "delete this annotation?" popup; the confirmation floats, never inline. */
    const noteConfirm = (() => {
      const empty = { open: false, anchor: null, onConfirm: null, token: 0 };
      if (typeof window === 'undefined') return createStore(empty);
      if (!window.__dshPromptPoolNoteConfirmV1) window.__dshPromptPoolNoteConfirmV1 = createStore(empty);
      return window.__dshPromptPoolNoteConfirmV1;
    })();
    const closeNoteConfirm = () => noteConfirm.set({ open: false, anchor: null, onConfirm: null, token: 0 });

    /** A short status line in the annotations tab's bottom strip (locate misses). */
    const noteStatus = (() => {
      const empty = { text: '', kind: '', token: 0 };
      if (typeof window === 'undefined') return createStore(empty);
      if (!window.__dshPromptPoolNoteStatusV1) window.__dshPromptPoolNoteStatusV1 = createStore(empty);
      return window.__dshPromptPoolNoteStatusV1;
    })();
    function showNoteStatus(text, kind) {
      const token = Date.now();
      noteStatus.set({ text: String(text || ''), kind: kind === 'error' ? 'error' : 'ok', token });
      if (typeof window !== 'undefined') {
        window.setTimeout(() => {
          if (noteStatus.get().token === token) noteStatus.set({ text: '', kind: '', token: 0 });
        }, 2800);
      }
    }
    function openNoteConfirm(run, event) {
      const rect = event && event.currentTarget && event.currentTarget.getBoundingClientRect
        ? event.currentTarget.getBoundingClientRect()
        : null;
      noteConfirm.set({
        open: true,
        anchor: rect
          ? { left: Math.round(rect.left), right: Math.round(rect.right), top: Math.round(rect.top), bottom: Math.round(rect.bottom) }
          : { left: 120, right: 160, top: 90, bottom: 120 },
        onConfirm: typeof run === 'function' ? run : null,
        token: Date.now(),
      });
    }

    const useNotesState = () => useSyncExternalStore(notes.subscribe, notes.get, notes.get);
    const useChatView = () => useSyncExternalStore(chatView.subscribe, chatView.get, chatView.get);
    const useNoteDraft = () => useSyncExternalStore(noteDraft.subscribe, noteDraft.get, noteDraft.get);
    const useNoteFocus = () => useSyncExternalStore(noteFocus.subscribe, noteFocus.get, noteFocus.get);
    const useNotePrompt = () => useSyncExternalStore(notePrompt.subscribe, notePrompt.get, notePrompt.get);
    const useNoteConfirm = () => useSyncExternalStore(noteConfirm.subscribe, noteConfirm.get, noteConfirm.get);
    const useNoteStatus = () => useSyncExternalStore(noteStatus.subscribe, noteStatus.get, noteStatus.get);

    /** One line of quote text for a row, a pin tooltip or the composed reply. */
    function noteQuoteText(quote, limit) {
      const text = String(quote || '').replace(/\s+/g, ' ').trim();
      const max = limit || 80;
      return text.length > max ? text.slice(0, max) + '…' : text;
    }

    /** The reply a session's annotations produce: numbered, each with its quote. */
    /** One note as a prompt line, without a number (single-note drafts). */
    function composeNoteLine(note) {
      const kind = noteKind(note.kind);
      const label = translate(kind.label);
      const body = String(note.body || '').replace(/\s+/g, ' ').trim();
      return `【${label}】「${noteQuoteText(note.quote)}」${body ? '：' + body : ''}`;
    }

    /** The reply a session's annotations produce: numbered, each with its quote. */
    function composeNotesReply(list) {
      return list
        .slice()
        .sort((left, right) => (left.order - right.order) || (left.createdAt - right.createdAt))
        .map((note, index) => `${index + 1}. ${composeNoteLine(note)}`)
        .join('\n');
    }

    /** The selection's start as an index into the element's plain textContent. */
    function textOffsetIn(source, container, offset) {
      try {
        const walker = document.createTreeWalker(source, typeof NodeFilter === 'undefined' ? 4 : NodeFilter.SHOW_TEXT);
        let total = 0;
        let node = walker.nextNode();
        while (node) {
          if (node === container) return total + offset;
          total += node.nodeValue ? node.nodeValue.length : 0;
          node = walker.nextNode();
        }
        if (container.nodeType !== 1) return total;
        // An element boundary: sum the text before its child at `offset`.
        let before = 0;
        const probe = document.createRange();
        probe.selectNodeContents(source);
        try {
          probe.setEnd(container, offset);
        } catch (_error) {
          return total;
        }
        const inner = document.createTreeWalker(source, typeof NodeFilter === 'undefined' ? 4 : NodeFilter.SHOW_TEXT);
        let text = inner.nextNode();
        while (text) {
          const nodeRange = document.createRange();
          nodeRange.selectNodeContents(text);
          if (probe.compareBoundaryPoints(Range.END_TO_END, nodeRange) >= 0) {
            before += text.nodeValue ? text.nodeValue.length : 0;
          }
          text = inner.nextNode();
        }
        return before;
      } catch (_error) {
        return 0;
      }
    }

    /**
     * Capture the selected assistant text as a value anchor. Runs while the
     * gesture still owns the selection, so it reads the live DOM once and never
     * depends on that DOM again.
     */
    function captureNoteAnchor(sessionId) {
      try {
        if (typeof document === 'undefined') return null;
        const selection = document.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
        const range = selection.getRangeAt(0);
        if (!range || range.collapsed) return null;
        const startNode = range.startContainer;
        const startElement = startNode && startNode.nodeType === 1 ? startNode : startNode && startNode.parentElement;
        const endNode = range.endContainer;
        const endElement = endNode && endNode.nodeType === 1 ? endNode : endNode && endNode.parentElement;
        if (!startElement || !startElement.closest || !endElement || !endElement.closest) return null;
        const source = startElement.closest('[data-text-interaction-source]');
        if (!source || endElement.closest('[data-text-interaction-source]') !== source) return null;
        const row = source.closest('[data-chat-flow-kind]');
        if (!row || row.getAttribute('data-chat-flow-kind') !== 'assistant-step') return null;
        const keyed = source.closest('[data-chat-node-key]');
        const nodeKey = keyed ? keyed.getAttribute('data-chat-node-key') || '' : '';
        if (!nodeKey) return null;
        const rawQuote = range.toString();
        const quote = rawQuote.trim();
        if (!quote) return null;
        // A browser selection often starts on the whitespace that ends the
        // previous line; trimmed here so the anchor (and its inline badge) starts
        // on the first visible character instead of the line above.
        const lead = rawQuote.length - rawQuote.trimStart().length;
        // Offsets are stored against the element's textContent (block boundaries
        // are not characters there), which is also what resolution walks.
        const offset = textOffsetIn(source, range.startContainer, range.startOffset) + lead;
        const text = source.textContent || '';
        const prefix = text.slice(Math.max(0, offset - 24), offset);
        const suffix = text.slice(offset + quote.length, offset + quote.length + 24);
        let rowIndex = 0;
        const scroll = noteChatRoot(sessionId);
        if (scroll) {
          const rows = scroll.querySelectorAll('[data-chat-node-key]');
          // A row that is not in this list (a nested copy, a paging remount) must
          // sort last rather than first: order 0 would put a later note above the
          // earlier ones and drag their cards down with it.
          const at = Array.prototype.indexOf.call(rows, keyed);
          rowIndex = at >= 0 ? at : rows.length;
        }
        return { nodeKey, quote, prefix, suffix, offset, order: rowIndex * 1000000 + offset };
      } catch (_error) {
        return null;
      }
    }

    /**
     * Find the stored quote inside one element's text. Context match wins over
     * the stored offset, because a reply can be re-rendered with different
     * neighbour nodes while its text stays the same.
     */
    function locateQuote(text, quote, prefix, suffix, offset) {
      if (!text || !quote) return -1;
      let best = -1;
      let bestScore = -Infinity;
      let index = text.indexOf(quote);
      while (index >= 0) {
        let score = 0;
        if (prefix && text.slice(Math.max(0, index - prefix.length), index) === prefix) score += 2;
        if (suffix && text.slice(index + quote.length, index + quote.length + suffix.length) === suffix) score += 2;
        score -= Math.abs(index - offset) / Math.max(1, text.length);
        if (score > bestScore) {
          bestScore = score;
          best = index;
        }
        index = text.indexOf(quote, index + 1);
      }
      return best;
    }

    /** Collapse whitespace runs for a tolerant comparison. */
    function collapseWhitespace(value) {
      return String(value || '').replace(/\s+/g, ' ').trim();
    }

    /** One collapsed string plus, per character, its index in the original. */
    function collapsedText(text) {
      const chars = [];
      const positions = [];
      let pendingSpace = false;
      for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        if (/\s/u.test(char)) {
          pendingSpace = chars.length > 0;
          continue;
        }
        if (pendingSpace) {
          chars.push(' ');
          positions.push(index);
          pendingSpace = false;
        }
        chars.push(char);
        positions.push(index);
      }
      return { text: chars.join(''), positions };
    }

    /**
     * The span of one quoted passage inside a source's text. The exact match wins;
     * a re-render can serialize the same words with different whitespace, so a
     * collapsed comparison is the fallback.
     */
    function findQuoteSpan(text, quote, prefix, suffix, offset) {
      if (!text || !quote) return null;
      // Older anchors may carry the whitespace that ended the previous line; the
      // passage itself starts on the first visible character.
      const clean = String(quote).trim();
      if (!clean) return null;
      const exact = locateQuote(text, clean, prefix, suffix, offset);
      if (exact >= 0) return { start: exact, end: exact + clean.length };
      const target = collapseWhitespace(clean);
      if (!target) return null;
      const collapsed = collapsedText(text);
      const at = collapsed.text.indexOf(target);
      if (at < 0) return null;
      const start = collapsed.positions[at];
      const end = collapsed.positions[at + target.length - 1] + 1;
      return end > start ? { start, end } : null;
    }

    /** Build a live DOM Range for a character span of one element's text. */
    function rangeFromTextOffset(source, start, length) {
      if (typeof document === 'undefined' || length <= 0) return null;
      try {
        const walker = document.createTreeWalker(source, typeof NodeFilter === 'undefined' ? 4 : NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();
        let consumed = 0;
        let from = null;
        while (node) {
          const size = node.nodeValue ? node.nodeValue.length : 0;
          if (from === null && consumed + size >= start) from = { node, offset: start - consumed };
          if (from !== null && consumed + size >= start + length) {
            const range = document.createRange();
            range.setStart(from.node, from.offset);
            range.setEnd(node, start + length - consumed);
            return range;
          }
          consumed += size;
          node = walker.nextNode();
        }
      } catch (_error) {
        /* a half-built tree during a re-render */
      }
      return null;
    }

    /**
     * The main conversation's scroll container. The sidebar renders session
     * previews with the same conversation attributes, so pick the container that
     * belongs to this session and owns the composer (previews own neither).
     */
    function noteChatRoot(sessionId) {
      if (typeof document === 'undefined') return null;
      const candidates = Array.from(document.querySelectorAll('[data-conversation-scroll]'));
      if (candidates.length === 0) return null;
      const sameSession = sessionId
        ? candidates.filter((element) => {
            const owner = element.closest('[data-conversation-session]');
            return owner !== null && owner.getAttribute('data-conversation-session') === sessionId;
          })
        : [];
      const pool = sameSession.length > 0 ? sameSession : candidates;
      const withComposer = pool.filter((element) => element.querySelector('[data-composer-seat]') !== null);
      const preferred = withComposer.length > 0 ? withComposer : pool;
      let best = null;
      let bestWidth = 0;
      for (const element of preferred) {
        const rect = element.getBoundingClientRect();
        if (rect.height > 0 && rect.width > bestWidth) {
          best = element;
          bestWidth = rect.width;
        }
      }
      return best || preferred[0] || null;
    }


    /** Resolve an anchor or a stored note to its live range and transcript row. */
    function resolveNote(anchor, root) {
      if (!root || !anchor || typeof document === 'undefined') return null;
      const rows = root.querySelectorAll('[data-chat-node-key]');
      // Prefer the row the note was captured from; if its key changed, the same
      // words can still be found elsewhere in the transcript.
      const ordered = [];
      const rest = [];
      for (const row of rows) {
        if (row.getAttribute('data-chat-node-key') === anchor.nodeKey) ordered.push(row);
        else rest.push(row);
      }
      for (const row of [...ordered, ...rest]) {
        const sources = row.querySelectorAll('[data-text-interaction-source]');
        for (const source of sources) {
          const text = source.textContent || '';
          const span = findQuoteSpan(text, anchor.quote, anchor.prefix, anchor.suffix, anchor.offset);
          if (!span) continue;
          const range = rangeFromTextOffset(source, span.start, span.end - span.start);
          if (range) return { range, row };
        }
      }
      return null;
    }

    /** The range alone, for callers that only need to paint or scroll it. */
    function resolveNoteRange(anchor, root) {
      const resolved = resolveNote(anchor, root);
      return resolved ? resolved.range : null;
    }

    /** Paint every annotated range, tinted by its kind. */
    function applyNoteHighlights(items) {
      try {
        // The module has its own `CSS` string for the pool panel, so reach for
        // the browser namespace explicitly.
        const registry = typeof globalThis === 'undefined' ? undefined : globalThis.CSS;
        const HighlightType = typeof globalThis === 'undefined' ? undefined : globalThis.Highlight;
        if (!registry || !registry.highlights || typeof HighlightType !== 'function') return;
        for (const id of NOTE_KIND_IDS) registry.highlights.delete(NOTE_HIGHLIGHT + '-' + id);
        if (!items || items.length === 0) return;
        const buckets = new Map();
        for (const item of items) {
          if (!item || !item.range) continue;
          const id = noteKind(item.kind).id;
          if (!buckets.has(id)) buckets.set(id, []);
          buckets.get(id).push(item.range);
        }
        for (const [id, ranges] of buckets) {
          registry.highlights.set(NOTE_HIGHLIGHT + '-' + id, new HighlightType(...ranges));
        }
      } catch (_error) {
        /* older engines: the inline badges still work */
      }
    }

    /**
     * Pins, highlights and the inline editor, drawn into the frame-wide overlay.
     * The markdown DOM is never touched: live ranges are measured and the layer is
     * positioned over them, so selection, copy and the host's rendering still work.
     */
    function NotesLayer() {
      useLocaleTick();
      const notesState = useNotesState();
      const view = useChatView();
      const draft = useNoteDraft();
      const focus = useNoteFocus();
      const prompt = useNotePrompt();
      const confirm = useNoteConfirm();
      const pool = usePoolState();
      const [editing, setEditing] = useState(null);
      const [body, setBody] = useState('');
      const [kind, setKind] = useState(NOTE_KIND_DEFAULT);
      const [missing, setMissing] = useState(false);
      const [anchorPoint, setAnchorPoint] = useState(null);
      const bubbleRef = useRef(null);
      const frameRef = useRef(0);
      const sessionId = view.sessionId;
      const sessionNotes = notesState.items
        .filter((note) => note.sessionId === sessionId)
        .sort((left, right) => (left.order - right.order) || (left.createdAt - right.createdAt));
      const notesRef = useRef(sessionNotes);
      notesRef.current = sessionNotes;
      // The open editor's passage: highlighted (and tinted by the pending kind)
      // before anything is saved, and dropped again when the bubble closes.
      const draftRef = useRef(null);
      draftRef.current = editing ? { id: editing.id || '', anchor: editing.anchor || null, kind } : null;
      const highlightOn = !pool.settings || pool.settings.notesHighlight !== false;
      const highlightRef = useRef(highlightOn);
      highlightRef.current = highlightOn;

      /**
       * The last visible character of a passage. Trailing whitespace in the
       * selection is skipped so the badge sits right after the text.
       */
      const visibleEnd = (range) => {
        try {
          const take = (node, offset) => {
            const data = node.nodeValue || '';
            let at = Math.min(offset, data.length);
            while (at > 0 && /\s/.test(data[at - 1])) at -= 1;
            return at > 0 ? { node, offset: at } : null;
          };
          if (range.endContainer.nodeType === 3) {
            const hit = take(range.endContainer, range.endOffset);
            if (hit) return hit;
          }
          const walker = document.createTreeWalker(range.commonAncestorContainer, typeof NodeFilter === 'undefined' ? 4 : NodeFilter.SHOW_TEXT);
          let node = walker.nextNode();
          let last = null;
          while (node) {
            const position = range.comparePoint(node, 0);
            if (position === 1) break;
            if (position === 0 || node === range.startContainer) last = node;
            node = walker.nextNode();
          }
          if (last) {
            const hit = take(last, last.nodeValue ? last.nodeValue.length : 0);
            if (hit) return hit;
          }
        } catch (_error) {
          /* fall back to the range's own end */
        }
        return { node: range.endContainer, offset: range.endOffset };
      };

      /**
       * The inline badge: a short chip inserted right before the passage. It is
       * foreign to the host's React tree, so it is re-inserted whenever a
       * re-render drops it; the chip itself carries no text the transcript would
       * copy (it is user-select:none and clickable).
       */
      const insertChip = (range, note, meta, shown) => {
        if (!range || !range.startContainer) return;
        try {
          const chip = document.createElement('span');
          chip.className = 'pp-note-inline';
          chip.setAttribute('data-pp-inline', note.id);
          chip.setAttribute('data-kind', meta.id);
          chip.setAttribute('data-text', shown);
          chip.setAttribute('data-version', NOTE_CHIP_VERSION);
          chip.setAttribute('role', 'button');
          chip.setAttribute('tabindex', '0');
          chip.setAttribute('title', shown ? `${translate(meta.label)}：${shown}` : translate(meta.label));
          const icon = document.createElement('span');
          icon.className = 'pp-note-inline-icon';
          icon.textContent = meta.icon;
          const text = document.createElement('span');
          text.className = 'pp-note-inline-text';
          // A kind-only note is just its glyph.
          text.textContent = shown;
          chip.appendChild(icon);
          if (shown) chip.appendChild(text);
          const open = (event) => {
            event.preventDefault();
            event.stopPropagation();
            openNote(note.id);
          };
          chip.addEventListener('click', open);
          chip.addEventListener('pointerdown', (event) => {
            // Keep the pointer from starting a text selection; the click itself
            // still has to reach the badge.
            event.stopPropagation();
          });
          chip.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') open(event);
          });
          const at = document.createRange();
          const end = visibleEnd(range);
          at.setStart(end.node, end.offset);
          at.collapse(true);
          at.insertNode(chip);
        } catch (_error) {
          /* the passage moved or the node refused insertion; the tab still lists it */
        }
      };

      const syncChips = () => {
        if (typeof document === 'undefined') return;
        const root = noteChatRoot(sessionId);
        if (!root) return;
        const wanted = new Map();
        for (const note of notesRef.current) wanted.set(note.id, note);
        // A fresh layer (or a session switch) rebuilds every badge once, so
        // anchors placed by an older insertion rule are corrected too.
        const resetKey = sessionId;
        const fresh = chipResetRef.current !== resetKey;
        chipResetRef.current = resetKey;
        if (fresh) {
          for (const chip of root.querySelectorAll('[data-pp-inline]')) chip.remove();
        }
        for (const chip of root.querySelectorAll('[data-pp-inline]')) {
          if (!wanted.has(chip.getAttribute('data-pp-inline'))) chip.remove();
        }
        for (const note of wanted.values()) {
          const meta = noteKind(note.kind);
          const shown = noteBodyText(note.body);
          const existing = root.querySelector('[data-pp-inline="' + note.id + '"]');
          if (existing) {
            const same = existing.getAttribute('data-kind') === meta.id
              && existing.getAttribute('data-text') === shown
              && existing.getAttribute('data-version') === NOTE_CHIP_VERSION;
            if (same) continue;
            existing.remove();
          }
          const hit = resolveNote(note, root);
          if (!hit) continue;
          // A streaming row rebuilds every token; only settled text keeps a badge.
          if (hit.row && hit.row.querySelector('[data-streaming]')) continue;
          insertChip(hit.range, note, meta, shown);
        }
      };
      const syncRef = useRef(syncChips);
      syncRef.current = syncChips;
      const chipResetRef = useRef('');

      const measure = useCallback(() => {
        const list = notesRef.current;
        const root = noteChatRoot(sessionId);
        if (!root || list.length === 0) {
          applyNoteHighlights([]);
          return;
        }
        const items = [];
        for (const note of list) {
          const hit = resolveNote(note, root);
          if (hit) items.push({ id: note.id, range: hit.range, kind: note.kind });
        }
        // The open bubble's passage is underlined immediately, following the
        // pending kind until Save or Cancel.
        const draftNote = draftRef.current;
        if (draftNote) {
          if (draftNote.id) {
            const at = items.findIndex((item) => item.id === draftNote.id);
            if (at >= 0) items[at] = { ...items[at], kind: draftNote.kind };
            else {
              const note = notesRef.current.find((entry) => entry.id === draftNote.id);
              const hit = note ? resolveNote(note, root) : null;
              if (hit) items.push({ id: draftNote.id, range: hit.range, kind: draftNote.kind });
            }
          } else if (draftNote.anchor) {
            const range = resolveNoteRange(draftNote.anchor, root);
            if (range) items.push({ id: '', range, kind: draftNote.kind });
          }
        }
        if (highlightRef.current) applyNoteHighlights(items);
        else applyNoteHighlights([]);
      }, [sessionId]);

      useEffect(() => {
        if (typeof document === 'undefined') return undefined;
        const root = noteChatRoot(sessionId);
        if (!root || notesRef.current.length === 0) {
          applyNoteHighlights([]);
          return undefined;
        }
        // The flow can mount after the effect (switching back to Chat from another
        // view); the observer below schedules a measure once its rows appear.
        const schedule = () => {
          if (frameRef.current) return;
          const run = () => {
            frameRef.current = 0;
            measure();
            syncRef.current();
          };
          frameRef.current = typeof window !== 'undefined' && window.requestAnimationFrame
            ? window.requestAnimationFrame(run)
            : window.setTimeout(run, 16);
        };
        root.addEventListener('scroll', schedule, true);
        window.addEventListener('resize', schedule);
        const resizer = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
        if (resizer) resizer.observe(root);
        const observer = typeof MutationObserver === 'function' ? new MutationObserver(schedule) : null;
        if (observer) observer.observe(root, { childList: true, subtree: true, characterData: true });
        schedule();
        return () => {
          root.removeEventListener('scroll', schedule, true);
          window.removeEventListener('resize', schedule);
          if (resizer) resizer.disconnect();
          if (observer) observer.disconnect();
          if (frameRef.current && typeof window !== 'undefined' && window.cancelAnimationFrame) window.cancelAnimationFrame(frameRef.current);
          frameRef.current = 0;
        };
      }, [measure, sessionId, sessionNotes.length]);

      // Adding, editing or deleting a note redraws the inline badges; the text
      // itself never changes.
      useEffect(() => {
        syncRef.current();
      }, [notesState.items, sessionId]);

      useEffect(() => {
        if (!draft.anchor || (draft.sessionId && draft.sessionId !== sessionId)) return;
        setEditing({ id: '', anchor: draft.anchor, body: '' });
        setBody('');
        setKind(NOTE_KIND_DEFAULT);
        setMissing(false);
        // The bubble follows the passage, so the note is written where it belongs.
        const root = noteChatRoot(sessionId);
        const range = root ? resolveNoteRange(draft.anchor, root) : null;
        if (range && root) {
          const rect = range.getBoundingClientRect();
          setAnchorPoint({ x: rect.right, y: Math.round(rect.top + rect.height / 2) });
          const box = root.getBoundingClientRect();
          if (rect.top < box.top + 40 || rect.bottom > box.bottom - 40) {
            root.scrollTop += rect.top - box.top - Math.min(120, box.height / 3);
          }
        } else {
          setAnchorPoint(null);
        }
        noteDraft.set({ anchor: null, sessionId: '', token: 0 });
      }, [draft.anchor, draft.sessionId, draft.token, sessionId]);

      // The open bubble's passage is underlined while it is being written; a
      // kind switch re-tints it live instead of waiting for Save.
      useEffect(() => {
        measure();
      }, [editing, kind, measure]);

      // The floating popups (group picker, delete confirmation); a click outside
      // or Escape puts them away without changing anything.
      useEffect(() => {
        if ((!prompt.open && !confirm.open) || typeof document === 'undefined') return undefined;
        const onDown = (event) => {
          const element = event.target instanceof Element ? event.target : null;
          if (element && element.closest && element.closest('.pp-note-prompt')) return;
          closeNotePrompt();
          closeNoteConfirm();
        };
        const onKey = (event) => {
          if (event.key !== 'Escape') return;
          closeNotePrompt();
          closeNoteConfirm();
        };
        document.addEventListener('pointerdown', onDown, true);
        document.addEventListener('keydown', onKey, true);
        return () => {
          document.removeEventListener('pointerdown', onDown, true);
          document.removeEventListener('keydown', onKey, true);
        };
      }, [prompt.open, prompt.token, confirm.open, confirm.token]);

      useEffect(() => {
        if (!focus.id) return;
        const note = notesState.items.find((entry) => entry.id === focus.id);
        const wantsEditor = focus.edit === true;
        noteFocus.set({ id: '', token: 0, edit: false });
        if (!note) return;
        const root = noteChatRoot(sessionId);
        const range = root ? resolveNoteRange(note, root) : null;
      // 定位 means locate: scroll the passage into view (editing is explicit).
        // only an explicit edit opens the bubble.
        if (!wantsEditor) {
          if (!range || !root) return;
          const rect = range.getBoundingClientRect();
          const box = root.getBoundingClientRect();
          if (rect.top < box.top + 40 || rect.bottom > box.bottom - 40) {
            root.scrollTop += rect.top - box.top - Math.min(120, box.height / 3);
          }
          return;
        }
        setEditing({ id: note.id, anchor: null, body: note.body });
        setBody(note.body);
        setMissing(!range);
        if (range) {
          setAnchorPoint({ x: range.getBoundingClientRect().right, y: Math.round(range.getBoundingClientRect().top + range.getBoundingClientRect().height / 2) });
        } else {
          setAnchorPoint(null);
        }
        if (range && root) {
          const rect = range.getBoundingClientRect();
          const box = root.getBoundingClientRect();
          if (rect.top < box.top + 40 || rect.bottom > box.bottom - 40) {
            root.scrollTop += rect.top - box.top - Math.min(120, box.height / 3);
          }
        }
      }, [focus.id, focus.token, notesState.items]);


      useEffect(() => {
        if (highlightOn) return;
        applyNoteHighlights([]);
      }, [highlightOn]);

      useEffect(() => () => {
        applyNoteHighlights([]);
      }, []);


      /** Open one saved note; its pin is on screen, so the bubble anchors there. */
      const openNote = (id) => {
        const note = notesRef.current.find((entry) => entry.id === id);
        if (!note) return;
        setEditing({ id, anchor: null, body: note.body });
        setBody(note.body);
        setKind(noteKind(note.kind).id);
        setMissing(false);
        const root = noteChatRoot(sessionId);
        const range = root ? resolveNoteRange(note, root) : null;
        if (range) {
          const rect = range.getBoundingClientRect();
          setAnchorPoint({ x: rect.right, y: Math.round(rect.top + rect.height / 2) });
        } else {
          setAnchorPoint(null);
        }
      };

      const cancelEditing = () => {
        setEditing(null);
        setBody('');
        setMissing(false);
        setAnchorPoint(null);
      };

      const save = () => {
        if (!editing) return;
        const value = body.trim();
        if (editing.id) {
          notesActions.patch(editing.id, { body: value, kind });
        } else if (editing.anchor) {
          notesActions.add({
            id: uid(),
            sessionId,
            nodeKey: editing.anchor.nodeKey,
            quote: editing.anchor.quote,
            prefix: editing.anchor.prefix,
            suffix: editing.anchor.suffix,
            offset: editing.anchor.offset,
            order: editing.anchor.order,
            kind,
            body: value,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
        setEditing(null);
        setBody('');
        setAnchorPoint(null);
      };

      const removeEditing = () => {
        if (!editing || !editing.id) return;
        notesActions.remove(editing.id);
        setEditing(null);
        setBody('');
        setAnchorPoint(null);
      };

      // Clicking anywhere else saves a non-empty note and drops an empty draft.
      useEffect(() => {
        if (!editing || typeof document === 'undefined') return undefined;
        const onDown = (event) => {
          const bubble = bubbleRef.current;
          if (bubble && event.target instanceof Node && bubble.contains(event.target)) return;
          const element = event.target instanceof Element ? event.target : null;
          if (element && element.closest && element.closest('.pp-note-prompt')) return;
          if (body.trim()) save();
          else cancelEditing();
        };
        document.addEventListener('pointerdown', onDown, true);
        return () => document.removeEventListener('pointerdown', onDown, true);
      });

      const onEditorKeyDown = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          cancelEditing();
          return;
        }
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          save();
        }
      };

      const editingNote = editing && editing.id ? sessionNotes.find((note) => note.id === editing.id) : null;
      const point = anchorPoint;
      const docElement = typeof document === 'undefined' ? null : document.documentElement;
      const viewportWidth = typeof window === 'undefined'
        ? 0
        : Math.min(window.innerWidth, (docElement && docElement.clientWidth) || window.innerWidth);
      const viewportHeight = typeof window === 'undefined'
        ? 0
        : Math.min(window.innerHeight, (docElement && docElement.clientHeight) || window.innerHeight);
      // The bubble opens on the passage's right, but flips to its left when the
      // right edge would land on the window border or its scrollbar (the save
      // button used to sit on the scrollbar and could not be clicked).
      const bubbleStyle = point && viewportWidth > 0
        ? (() => {
            const width = 300;
            const margin = 16;
            const right = point.x + 14;
            const left = right + width <= viewportWidth - margin
              ? right
              : Math.max(margin, point.x - width - 14);
            const top = Math.min(Math.max(margin, point.y - 24), Math.max(margin, viewportHeight - 250));
            return {
              left: Math.round(Math.max(margin, Math.min(left, viewportWidth - width - margin))) + 'px',
              top: Math.round(top) + 'px',
            };
          })()
        : { left: '50%', top: '38%', transform: 'translate(-50%, -50%)' };

      // The group popup: anchored under the button that opened it, flipped above
      // when it would leave the frame, and always in the overlay (never clipped
      // by the pool list).
      const placePopup = (anchor, width, height) => {
        if (!anchor) return null;
        const docElement = typeof document === 'undefined' ? null : document.documentElement;
        const vw = typeof window === 'undefined' ? 0 : Math.min(window.innerWidth, (docElement && docElement.clientWidth) || window.innerWidth);
        const vh = typeof window === 'undefined' ? 0 : Math.min(window.innerHeight, (docElement && docElement.clientHeight) || window.innerHeight);
        // Right-aligned with the button when left-alignment would leave the frame.
        const left = anchor.left + width + 8 <= vw ? anchor.left : anchor.right - width;
        const x = Math.max(8, Math.min(left, Math.max(8, vw - width - 8)));
        let y = anchor.bottom + 6;
        if (y + height > vh - 8) y = Math.max(8, anchor.top - height - 6);
        return { left: Math.round(x) + 'px', top: Math.round(y) + 'px' };
      };
      const promptStyle = prompt.open && prompt.anchor ? placePopup(prompt.anchor, 210, 280) : null;
      const confirmStyle = confirm.open && confirm.anchor ? placePopup(confirm.anchor, 240, 110) : null;

      return h(
        'div',
        { className: 'pp-note-layer' },
        h('style', { key: 'css' }, NOTES_CSS),
        prompt.open && promptStyle
          ? h(
              'div',
              {
                key: 'prompt',
                className: 'pp-note-prompt',
                style: promptStyle,
                role: 'dialog',
                'aria-label': translate('capture.title'),
                onPointerDown: (event) => event.stopPropagation(),
              },
              h('div', { key: 'title', className: 'pp-note-prompt-title' }, translate('capture.title')),
              h(
                'div',
                { key: 'list', className: 'pp-note-prompt-list' },
                (prompt.choices || []).map((choice) => h(
                  'button',
                  {
                    key: choice.value,
                    type: 'button',
                    className: 'pp-note-prompt-row',
                    onClick: () => {
                      const pick = notePrompt.get().onPick;
                      if (typeof pick === 'function') pick(choice.value);
                    },
                  },
                  h('span', { key: 'name', className: 'pp-note-prompt-name' }, choice.label),
                  choice.value === prompt.defaultValue
                    ? h('span', { key: 'default', className: 'pp-note-prompt-tag' }, translate('note.default'))
                    : null,
                )),
              ),
              h('div', { key: 'sep', className: 'pp-note-prompt-sep' }),
              h('button', { key: 'cancel', type: 'button', className: 'pp-note-prompt-row pp-note-prompt-cancel', onClick: () => closeNotePrompt() }, translate('note.cancel')),
            )
          : null,
        confirm.open && confirmStyle
          ? h(
              'div',
              {
                key: 'confirm',
                className: 'pp-note-prompt',
                style: confirmStyle,
                role: 'alertdialog',
                'aria-label': translate('note.deleteConfirm'),
                onPointerDown: (event) => event.stopPropagation(),
              },
              h('div', { key: 'msg', className: 'pp-note-prompt-message' }, translate('note.deleteConfirm')),
              h(
                'div',
                { key: 'actions', className: 'pp-note-prompt-actions' },
                h('button', { key: 'no', type: 'button', className: 'pp-note-btn', onClick: () => closeNoteConfirm() }, translate('note.cancel')),
                h(
                  'button',
                  {
                    key: 'yes',
                    type: 'button',
                    className: 'pp-note-btn pp-note-btn-danger',
                    onClick: () => {
                      const run = noteConfirm.get().onConfirm;
                      closeNoteConfirm();
                      if (typeof run === 'function') run();
                    },
                  },
                  translate('note.delete'),
                ),
              ),
            )
          : null,
        editing
          ? h(
              'div',
              {
                key: 'bubble',
                ref: bubbleRef,
                className: 'pp-note-bubble',
                style: { ...bubbleStyle, '--pp-bubble-tint': noteKind(kind).tint },
                'data-kind': kind,
                onPointerDown: (event) => event.stopPropagation(),
              },
              h(
                'div',
                { className: 'pp-note-bubble-quote' },
                h('span', { className: 'pp-note-bubble-quote-icon' }, noteKind(kind).icon),
                noteQuoteText(editingNote ? editingNote.quote : editing.anchor.quote, 10),
              ),
              missing
                ? h(
                    'div',
                    { className: 'pp-note-bubble-hint' },
                    translate('note.quoteMissing'),
                  )
                : null,
              h(
                'div',
                { className: 'pp-note-kinds' },
                NOTE_KINDS.map((entry) => h(
                  'button',
                  {
                    key: entry.id,
                    type: 'button',
                    className: 'pp-note-kind',
                    'data-kind': entry.id,
                    'data-active': kind === entry.id ? 'true' : 'false',
                    onClick: () => setKind(entry.id),
                  },
                  h('span', { className: 'pp-note-kind-icon' }, entry.icon),
                  translate(entry.label),
                )),
              ),
              h('textarea', {
                className: 'pp-note-input',
                value: body,
                rows: 2,
                maxLength: NOTE_BODY_MAX,
                placeholder: translate('note.placeholder'),
                autoFocus: true,
                onChange: (event) => setBody(event.target.value),
                onKeyDown: onEditorKeyDown,
              }),
              h(
                'div',
                { className: 'pp-note-bubble-foot' },
                editingNote
                  ? h(
                      'button',
                      {
                        key: 'remove',
                        type: 'button',
                        className: 'pp-note-btn pp-note-btn-quiet-danger',
                        onClick: (event) => openNoteConfirm(removeEditing, event),
                      },
                      translate('note.delete'),
                    )
                  : null,
                h(
                  'span',
                  { key: 'limit', className: 'pp-note-limit' },
                  h('span', { className: 'pp-note-limit-count' }, `${body.trim().length}/${NOTE_BODY_MAX}`),
                ),
                h(
                  'div',
                  { key: 'acts', className: 'pp-note-bubble-actions' },
                  h('button', { type: 'button', className: 'pp-note-btn', onClick: cancelEditing }, translate('note.cancel')),
                  h(
                    'button',
                    { type: 'button', className: 'pp-note-btn pp-note-btn-primary', onClick: save },
                    translate('note.save'),
                  ),
                ),
              ),
            )
          : null,
      );
    }

    /**
     * The session's annotations, shown as a tab inside both prompt-pool views.
     * A note can be promoted into a pool group (defaulting to this session's
     * workspace); the caller keeps the compose path: the composer panel inserts
     * directly, the sidebar page asks the panel over the bridge.
     */
    /** Tiny stroke icons for the annotation row actions. */
    function NoteActionIcon(props) {
      const kind = props.kind;
      const common = {
        width: 14,
        height: 14,
        viewBox: '0 0 20 20',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.6,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
        style: { display: 'block' },
      };
      if (kind === 'edit') {
        return h('svg', common, h('path', { d: 'M4 16l.6-3.6 9-9a1.7 1.7 0 0 1 2.4 2.4l-9 9L4 16z' }));
      }
      if (kind === 'insert') {
        return h(
          'svg',
          common,
          h('path', { d: 'M3.6 12.4h12.8v3.4H3.6z' }),
          h('path', { d: 'M10 3v6.4' }),
          h('path', { d: 'M7.4 6.9 10 9.4l2.6-2.5' }),
        );
      }
      if (kind === 'store') {
        return h(
          'svg',
          common,
          h('path', { d: 'M10 3v7' }),
          h('path', { d: 'M7 7.2 10 10l3-2.8' }),
          h('path', { d: 'M3.6 13.6v2.6h12.8v-2.6' }),
        );
      }
      if (kind === 'locate') {
        return h(
          'svg',
          common,
          h('circle', { cx: 10, cy: 10, r: 4.6 }),
          h('path', { d: 'M10 2.2v2.6M10 15.2v2.6M2.2 10h2.6M15.2 10h2.6' }),
        );
      }
      return h(
        'svg',
        common,
        h('path', { d: 'M4 6h12' }),
        h('path', { d: 'M8 6V4h4v2' }),
        h('path', { d: 'M6 6l.7 10h6.6L14 6' }),
      );
    }

    function NotesView(props) {
      useLocaleTick();
      const list = Array.isArray(props.notes) ? props.notes : [];
      const sessionId = typeof props.sessionId === 'string' ? props.sessionId : '';
      const categories = Array.isArray(props.categories) ? props.categories : [];
      const workspaceList = Array.isArray(props.workspaces) ? props.workspaces : [];
      const currentWorkspaceId = typeof props.currentWorkspaceId === 'string' ? props.currentWorkspaceId : '';
      const filter = typeof props.filter === 'string' ? props.filter.trim().toLowerCase() : '';
      const matches = (note) => !filter
        || String(note.quote || '').toLowerCase().indexOf(filter) >= 0
        || String(note.body || '').toLowerCase().indexOf(filter) >= 0
        || translate(noteKind(note.kind).label).toLowerCase().indexOf(filter) >= 0;

      const flash = (text, kind) => showToast(text, kind);

      const compose = () => {
        let ok = false;
        try {
          ok = props.onCompose() === true;
        } catch (_error) {
          ok = false;
        }
        if (ok && normalizeSettings(props.settings).noteKeepAfterDraft === false) {
          notesActions.clearSession(sessionId);
        }
        flash(ok ? translate('note.inserted') : translate('note.insertFailed'), ok ? 'ok' : 'error');
      };

      const labelOfGroup = (group) => {
        const resolved = resolveGroup(group, categories, workspaceList);
        return resolved ? resolved.label : translate('row.noCategory');
      };

      // The workspace this session belongs to leads the chooser; 常用 is the
      // fallback when the workspace family is hidden or unknown.
      const choices = captureChoices(categories, workspaceList, currentWorkspaceId, props.settings);
      const preferred = currentWorkspaceId && choices.some((entry) => entry.value === 'workspace:' + currentWorkspaceId)
        ? 'workspace:' + currentWorkspaceId
        : BUILTIN_GROUP.oftenuse;
      const ordered = choices.some((entry) => entry.value === preferred)
        ? [...choices.filter((entry) => entry.value === preferred), ...choices.filter((entry) => entry.value !== preferred)]
        : choices;

      const promote = (note, group) => {
        poolActions.add({
          id: uid(),
          group,
          title: draftTitle(note.quote),
          // The prompt carries the quoted passage, so inserting it into the
          // composer later still has the original text (the title is only a label).
          body: composeNoteLine(note),
          images: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        if (normalizeSettings(props.settings).noteKeepAfterStore === false) {
          notesActions.remove(note.id);
        } else {
          // The record stays: the row keeps a "stored" marker so the note is not
          // silently lost from the conversation it belongs to.
          notesActions.patch(note.id, { promotedGroup: group, promotedAt: Date.now() });
        }
        flash(translate('note.stored', { group: labelOfGroup(group) }), 'ok');
      };

      /** Compose the annotations into one prompt and file it in a group. */
      const storePrompt = (group) => {
        const text = composeNotesReply(list);
        poolActions.add({
          id: uid(),
          group,
          title: draftTitle(text),
          body: text,
          images: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        if (normalizeSettings(props.settings).noteKeepAfterStore === false) {
          notesActions.clearSession(sessionId);
        }
        flash(translate('note.composeStored', { group: labelOfGroup(group) }), 'ok');
      };

      /** Open the group popup just under the button that asked for it. */
      const openPrompt = (target, event) => {
        const rect = event && event.currentTarget && event.currentTarget.getBoundingClientRect
          ? event.currentTarget.getBoundingClientRect()
          : null;
        notePrompt.set({
          open: true,
          target,
          choices: ordered,
          defaultValue: preferred,
          anchor: rect
            ? { left: Math.round(rect.left), right: Math.round(rect.right), top: Math.round(rect.top), bottom: Math.round(rect.bottom) }
            : { left: Math.round((window.innerWidth || 0) / 2), right: Math.round((window.innerWidth || 0) / 2) + 40, top: 60, bottom: 90 },
          onPick: (group) => {
            closeNotePrompt();
            if (!group) return;
            if (target && target.kind === 'note' && target.note) promote(target.note, group);
            else storePrompt(group);
          },
          token: Date.now(),
        });
      };

      /** Scroll the transcript to this note. */
      const locate = (note) => {
        const root = noteChatRoot(sessionId);
        const hit = root ? resolveNote(note, root) : null;
        if (!hit) {
          showNoteStatus(translate('note.locateFailed'), 'error');
          return;
        }
        const rect = hit.range.getBoundingClientRect();
        const box = root.getBoundingClientRect();
        if (rect.top < box.top + 40 || rect.bottom > box.bottom - 40) {
          root.scrollTop += rect.top - box.top - Math.min(120, box.height / 3);
        }
        noteFocus.set({ id: note.id, token: Date.now(), edit: false });
      };

      /** Insert one note (as a one-line prompt) into the composer. */
      const insertNote = (note) => {
        let ok = false;
        try {
          ok = props.onInsertNote ? props.onInsertNote(note) === true : false;
        } catch (_error) {
          ok = false;
        }
        if (ok && normalizeSettings(props.settings).noteKeepAfterDraft === false) {
          notesActions.remove(note.id);
        }
        flash(ok ? translate('note.inserted') : translate('note.insertFailed'), ok ? 'ok' : 'error');
      };

      return h(
        'div',
        { className: 'pp-notes pp-notes-embedded' },
        h('style', { key: 'css' }, NOTES_CSS),
        props.hideActions !== true || list.some((note) => (note.dx || 0) !== 0 || (note.dy || 0) !== 0)
          ? h(
              'div',
              { className: 'pp-notes-head' },
              h('span', { className: 'pp-notes-grow' }),
              props.hideActions !== true
                ? [
                    h(
                      'button',
                      { key: 'compose-store', type: 'button', className: 'pp-note-btn pp-note-btn-primary', onClick: (event) => openPrompt({ kind: 'reply' }, event) },
                      translate('note.composeStore'),
                    ),
                    h('button', { key: 'compose', type: 'button', className: 'pp-note-btn', onClick: compose }, translate('note.compose')),
                  ]
                : null,
              list.some((note) => (note.dx || 0) !== 0 || (note.dy || 0) !== 0)
                ? h(
                    'button',
                    { key: 'reset', type: 'button', className: 'pp-note-link', onClick: () => notesActions.resetPositions(sessionId) },
                    translate('note.reset'),
                  )
                : null,
            )
          : null,
        h(
          'div',
          { className: 'pp-notes-list' },
          list.map((note, index) => {
            if (!matches(note)) return null;
            const meta = noteKind(note.kind);
            return h(
              'div',
              {
                className: 'pp-notes-row',
                key: note.id,
                'data-promoted': note.promotedGroup ? 'true' : undefined,
              },
              h(
                'button',
                {
                  type: 'button',
                  className: 'pp-note-icon pp-note-insert',
                  title: translate('note.insert'),
                  'aria-label': translate('note.insert'),
                  onClick: () => insertNote(note),
                },
                h(NoteActionIcon, { kind: 'insert' }),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'pp-note-icon pp-note-locate',
                  title: translate('note.locate'),
                  'aria-label': translate('note.locate'),
                  onClick: () => locate(note),
                },
                h(NoteActionIcon, { kind: 'locate' }),
              ),
              h('span', { className: 'pp-notes-n' }, String(index + 1)),
              h(
                'div',
                { className: 'pp-notes-main' },
                h(
                  'div',
                  { className: 'pp-notes-quote', title: note.quote },
                  h('span', { className: 'pp-notes-kind', 'data-kind': meta.id, title: translate(meta.label) }, meta.icon),
                  h('span', { className: 'pp-notes-quote-text' }, noteQuoteText(note.quote)),
                  note.promotedGroup
                    ? h('span', { className: 'pp-notes-tag' }, translate('note.stored', { group: labelOfGroup(note.promotedGroup) }))
                    : null,
                ),
                h('div', { className: 'pp-notes-text' }, note.body || translate(meta.label)),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'pp-note-icon',
                  title: translate('note.store'),
                  'aria-label': translate('note.store'),
                  onClick: (event) => openPrompt({ kind: 'note', note }, event),
                },
                h(NoteActionIcon, { kind: 'store' }),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'pp-note-icon pp-note-link-danger',
                  title: translate('note.delete'),
                  'aria-label': translate('note.delete'),
                  onClick: (event) => openNoteConfirm(() => notesActions.remove(note.id), event),
                },
                h(NoteActionIcon, { kind: 'delete' }),
              ),
            );
          }),
        ),
        list.length === 0
          ? h('div', { key: 'intro', className: 'pp-notes-empty' }, translate('note.emptyIntro'))
          : filter && !list.some(matches)
            ? h('div', { key: 'empty', className: 'pp-notes-empty' }, translate('note.empty'))
            : null,
      );
    }

    // --------------------------------------------------- conversation selection
    /**
     * Right-click destinations for text selected in the conversation. The host
     * opens this surface at the pointer; the top level keeps Copy (the menu
     * replaces the browser's own) and one pool entry whose submenu lists the
     * groups on show. Picking a group stores the selection there, and the group
     * used last time leads that submenu. The surface only exists while the Chat
     * view is mounted, and a selection lost between the gesture and this mount
     * leaves it with nothing to offer.
     */
    function SelectionMenu(props) {
      useLocaleTick();
      const state = usePoolState();
      const published = useWorkspaceDir();
      // The Chat view can read the workspace roster itself; the module store is
      // the fallback for a host that does not hand `useWorkspaces` to this seat.
      const snapshot = typeof props.useWorkspaces === 'function' ? props.useWorkspaces(selectAllInput) : undefined;
      const workspaces = snapshot ? workspaceEntriesOf(snapshot) : published.items || [];
      const currentWorkspaceId = snapshot ? currentWorkspaceOf(snapshot, props.sessionId) : published.currentId || '';
      // The gesture captured the text before this surface mounted; keeping it in
      // state means a collapsed selection cannot empty the menu mid-click.
      const [body] = useState(() => {
        const text = typeof props.readText === 'function' ? props.readText() : null;
        return typeof text === 'string' ? text.replace(/\r\n?/g, '\n').trim() : '';
      });
      const [done, setDone] = useState(null);
      // The group list lives one level down; Copy stays at the top.
      const [submenu, setSubmenu] = useState(false);
      // Annotating needs the assistant row and its text, captured while the
      // selection still owns the DOM.
      const [anchor] = useState(() => captureNoteAnchor(props.sessionId));
      const timer = useRef(0);
      const dismiss = typeof props.dismiss === 'function' ? props.dismiss : () => {};

      useEffect(() => () => window.clearTimeout(timer.current), []);
      useEffect(() => {
        // The selection was gone before the surface mounted; nothing to offer.
        if (!body) dismiss();
      }, [body, dismiss]);

      if (!body) return null;

      const choices = captureChoices(state.categories, workspaces, currentWorkspaceId, state.settings);
      const last = state.settings && state.settings.lastCaptureGroup;
      const remembered = choices.find((choice) => choice.value === last) || null;
      const ordered = remembered ? [remembered, ...choices.filter((choice) => choice !== remembered)] : choices;
      const counts = {};
      for (const item of state.items) {
        const group = groupOf(item);
        counts[group] = (counts[group] || 0) + 1;
      }

      const pick = (choice) => {
        if (done) return;
        const now = Date.now();
        poolActions.add({
          id: uid(),
          group: choice.value,
          title: draftTitle(body),
          body,
          images: [],
          createdAt: now,
          updatedAt: now,
        });
        // Remembering the destination makes the next right-click a single pick.
        poolActions.setSetting('lastCaptureGroup', choice.value);
        // The write can fail on a full or blocked store; say so instead of
        // claiming a save the pool would lose on reload.
        const failed = storageState.get().failed === true;
        setDone({ kind: failed ? 'failed' : 'saved', label: choice.label });
        timer.current = window.setTimeout(() => dismiss(), failed ? 2600 : 900);
      };

      /**
       * The menu replaces the browser's own menu, so it has to keep Copy. The
       * selection is already captured, and the click still counts as a gesture.
       */
      const copySelection = () => {
        if (done) return;
        const copied = copyText(body);
        setDone({ kind: copied ? 'copied' : 'copyFailed' });
        // A failed copy stays up so the shortcut hint can be read and used.
        if (copied) timer.current = window.setTimeout(() => dismiss(), 900);
      };

      /** Open the destination submenu; a click serves touch, hover serves mouse. */
      const openGroups = () => {
        if (done !== null) return;
        setSubmenu(true);
      };

      /** Hand the captured anchor to the overlay, which opens its editor. */
      const startNote = () => {
        if (!anchor) return;
        noteDraft.set({ anchor, sessionId: props.sessionId || '', token: Date.now() });
        dismiss();
      };

      const error = done !== null && (done.kind === 'failed' || done.kind === 'copyFailed');
      const shortcut = /Mac|iPhone|iPad/.test(typeof navigator === 'undefined' ? '' : String(navigator.userAgent || '')) ? '⌘C' : 'Ctrl+C';
      const doneText = done === null
        ? ''
        : done.kind === 'saved'
          ? translate('menu.saved', { group: done.label })
          : done.kind === 'copied'
            ? translate('menu.copied')
            : done.kind === 'copyFailed'
              ? translate('menu.copyFailed', { shortcut })
              : translate('status.storageFailed');

      return h(
        'div',
        {
          className: 'pp-selwrap',
          role: 'menu',
          'aria-label': translate('menu.title'),
          // Keep the browser selection alive while the pointer is over the menu.
          onPointerDown: (event) => event.preventDefault(),
        },
        h('style', { key: 'css' }, MENU_CSS),
        done !== null
          ? h(
              'div',
              { key: 'done', className: 'pp-selmenu pp-seldonecard' },
              h(
                'div',
                { className: 'pp-seldone', 'data-kind': error ? 'error' : 'ok', role: 'status' },
                h('span', { key: 'mark', className: 'pp-seldone-mark', 'aria-hidden': true }, error ? '!' : '✓'),
                h('span', { key: 'text', className: 'pp-seldone-text' }, doneText),
              ),
            )
          : [
              h(
                'div',
                { key: 'main', className: 'pp-selmenu' },
                h(
                  'button',
                  {
                    key: 'copy',
                    type: 'button',
                    role: 'menuitem',
                    className: 'pp-selrow',
                    onClick: copySelection,
                    // Moving back to the first row folds the submenu away.
                    onPointerEnter: () => setSubmenu(false),
                  },
                  h('span', { key: 'name', className: 'pp-selname' }, translate('menu.copy')),
                  h('span', { key: 'key', className: 'pp-selkey' }, shortcut),
                ),
                h(
                  'div',
                  { key: 'poolgroup', className: 'pp-selgroup' },
                  h('div', { key: 'label', className: 'pp-selgroup-label' }, h(PromptPoolIcon, { key: 'icon', size: 12 }), translate('menu.group')),
                  anchor
                  ? h(
                      'button',
                      {
                        key: 'note',
                        type: 'button',
                        role: 'menuitem',
                        className: 'pp-selrow',
                        onClick: startNote,
                        onPointerEnter: () => setSubmenu(false),
                      },
                      h('span', { key: 'name', className: 'pp-selname' }, translate('note.add')),
                    )
                  : null,
                h(
                  'button',
                  {
                    key: 'pool',
                    type: 'button',
                    role: 'menuitem',
                    className: 'pp-selrow',
                    'aria-haspopup': 'menu',
                    'aria-expanded': submenu,
                    onClick: openGroups,
                    onPointerEnter: openGroups,
                  },
                  h('span', { key: 'name', className: 'pp-selname' }, translate('menu.pool')),
                  h('span', { key: 'chev', className: 'pp-selchev', 'aria-hidden': true }, '▸'),
                ),
                ),
              ),
              submenu
                ? h(
                    'div',
                    { key: 'groups', className: 'pp-selpanel', role: 'menu', 'aria-label': translate('menu.pool') },
                    h(
                      'div',
                      { key: 'list', className: 'pp-sellist' },
                      ordered.map((choice) =>
                        h(
                          'button',
                          {
                            key: choice.value,
                            type: 'button',
                            role: 'menuitem',
                            className: 'pp-selrow',
                            onClick: () => pick(choice),
                          },
                          h('span', { key: 'name', className: 'pp-selname' }, choice.label),
                          remembered && choice === remembered
                            ? h('span', { key: 'last', className: 'pp-sellast' }, translate('menu.last'))
                            : null,
                          h(
                            'span',
                            {
                              key: 'count',
                              className: 'pp-selcount',
                              title: translate('menu.count', { n: counts[choice.value] || 0 }),
                            },
                            String(counts[choice.value] || 0),
                          ),
                        ),
                      ),
                    ),
                  )
                : null,
            ],
      );
    }

    // ------------------------------------------------------------------ panel
    function PromptPoolPanel(props) {
      useLocaleTick();
      const state = usePoolState();
      const storage = useStorageState();
      const releaseInfo = useReleaseState();
      const view = useUiState();
      const noteBar = useNoteStatus();
      const workspaces = useWorkspaceDir();
      const sessionHint = useSessionDir().sessionId;
      const notesState = useNotesState();
      const notesSessionId = typeof props.sessionId === 'string' ? props.sessionId : '';
      const notesList = notesState.items
        .filter((note) => note.sessionId === notesSessionId)
        .sort((left, right) => (left.order - right.order) || (left.createdAt - right.createdAt));

      // This view can read the workspace roster; publish it for both views.
      const wsSnapshot = typeof props.useWorkspaces === 'function' ? props.useWorkspaces(selectAllInput) : undefined;
      useEffect(() => {
        sessionDir.set({ sessionId: props.sessionId || '' });
        // The overlay is root-scoped; this session-scoped seat tells it which
        // transcript the annotation cards belong to.
        chatView.set({ sessionId: props.sessionId || '' });
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
      // Attachments are browser-owned ids; their files only come back through the
      // conversation service, so the ids are kept for the capture path.
      const attachmentIds = input && Array.isArray(input.attachmentIds) ? input.attachmentIds : [];
      const occurrences = input && Array.isArray(input.occurrences) ? input.occurrences : [];

      const draftRef = useRef('');
      draftRef.current = draft;
      const attachmentIdsRef = useRef([]);
      attachmentIdsRef.current = attachmentIds;
      const occurrenceRef = useRef([]);
      occurrenceRef.current = occurrences;
      const phaseRef = useRef('plain');
      phaseRef.current = phase;
      const queueRef = useRef([]);
      queueRef.current = queue;
      // The sidebar page shows the same count from this shared value.
      useEffect(() => {
        if (queueDir.get().pending === queue.length) return;
        queueDir.set({ pending: queue.length });
      }, [queue.length]);
      const sessionSelector = typeof props.useSession === 'function' ? props.useSession : null;
      const pendingSubmissions = sessionSelector
        ? sessionSelector((snapshot) => (snapshot && Array.isArray(snapshot.pendingSubmissions) ? snapshot.pendingSubmissions : EMPTY_PENDING))
        : EMPTY_PENDING;
      const pendingRef = useRef([]);
      pendingRef.current = Array.isArray(pendingSubmissions) ? pendingSubmissions : EMPTY_PENDING;
      const busyRef = useRef(false);

      const [tab, setTab] = useState('all');
      const [query, setQuery] = useState('');
      const [settingsOpen, setSettingsOpen] = useState(false);
      const [pendingCategory, setPendingCategory] = useState(null);
      const [wsSelected, setWsSelected] = useState('');
      const [customPick, setCustomPick] = useState('');
      const [builtinPick, setBuiltinPick] = useState('');
      const [confirmClear, setConfirmClear] = useState(false);
      const [pendingDelete, setPendingDelete] = useState(null);
      const [pendingRemove, setPendingRemove] = useState(null);
      const [captureOpen, setCaptureOpen] = useState(false);
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

      const { editing, setEditing, startEdit, save, cancelEdit, pasteImages } = usePoolEditor(flash);
      const { trayEditing, setTrayEditing, saveTrayEdit, pasteTrayImages } = useTrayEditor(flash);

      // A failed write outranks a transient toast: the change is not saved.
      const notice = status || (storage.failed ? { kind: 'error', text: translate('status.storageFailed') } : null);

      const confirmCategoryDelete = () => {
        const target = pendingCategory;
        setPendingCategory(null);
        if (!target || target.indexOf('custom:') !== 0) return;
        poolActions.removeCategory(target.slice(7));
        if (tab === target) setTab('all');
      };

      const panelRef = useRef(null);
      const panelChrome = normalizeSettings(state.settings);

      // The panel can be dragged taller or shorter; 0 means the CSS default.
      const [dragHeight, setDragHeight] = useState(0);
      const panelHeight = dragHeight || panelChrome.panelHeight;
      const panelHeightRef = useRef(panelHeight);
      panelHeightRef.current = panelHeight;

      // The panel's left edge can be dragged too; 0 means the CSS default width.
      const [dragWidth, setDragWidth] = useState(0);
      const panelWidth = dragWidth || panelChrome.panelWidth;
      const panelWidthRef = useRef(panelWidth);
      panelWidthRef.current = panelWidth;
      const panelPinned = panelChrome.panelPinned;

      // Room from the top of the pane that clips the panel down to the panel's
      // own bottom edge. The overlay anchors that bottom edge to the composer,
      // and a new session puts the composer mid-page, so the panel is capped by
      // that pane rather than by 70vh of a viewport it does not reach. This runs
      // after every render because a layout shift can move the composer without
      // a resize; the equality check ends the extra render.
      const [room, setRoom] = useState(0);
      const roomRef = useRef(0);
      roomRef.current = room;
      const layoutEffect = React.useLayoutEffect || useEffect;
      layoutEffect(() => {
        if (!view.open) return undefined;
        const node = panelRef.current;
        if (!node) return undefined;
        const measure = () => {
          // Only the list and the queue tray scroll. If something inside the
          // panel takes focus, the browser can scroll this box instead, which
          // parks the header above its own viewport; pin it back.
          if (node.scrollTop !== 0) node.scrollTop = 0;
          const ceiling = node.getBoundingClientRect().bottom - clipTopOf(node) - PANEL_TOP_GAP;
          const next = Math.max(160, Math.round(ceiling));
          setRoom((previous) => (previous === next ? previous : next));
        };
        measure();
        // The composer can settle a frame or two after the panel opens (fonts,
        // entry animation, a restored draft), so follow the first measurement.
        const timers = [120, 400].map((delay) => window.setTimeout(measure, delay));
        node.addEventListener('scroll', measure);
        window.addEventListener('resize', measure);
        return () => {
          timers.forEach((timer) => window.clearTimeout(timer));
          node.removeEventListener('scroll', measure);
          window.removeEventListener('resize', measure);
        };
      });

      const startResize = (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        event.preventDefault();
        const startY = event.clientY;
        const startHeight = panelRef.current ? panelRef.current.getBoundingClientRect().height : panelHeightRef.current;
        const apply = (clientY) => {
          const ceiling = roomRef.current > 0 ? roomRef.current : window.innerHeight - 96;
          const limit = Math.max(320, Math.min(ceiling, window.innerHeight - 96));
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

      const startResizeWidth = (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        event.preventDefault();
        const node = panelRef.current;
        const rect = node ? node.getBoundingClientRect() : null;
        const startX = event.clientX;
        const startWidth = rect ? rect.width : panelWidthRef.current || 920;
        // The slot wrapper around the panel can be a zero-width anchor, so the
        // limit comes from the containing block (offsetParent) and the panel's
        // anchored right edge, not from parentElement.
        const containing = node && node.offsetParent ? node.offsetParent.getBoundingClientRect() : null;
        const byParent = containing && containing.width > 0 ? containing.width : Infinity;
        const byRight = rect && rect.right > 0 ? rect.right - 8 : window.innerWidth - 24;
        const ceiling = Math.max(360, Math.round(Math.min(window.innerWidth - 24, byParent, byRight)));
        let latest = Math.round(startWidth);
        const apply = (clientX) => {
          latest = Math.round(Math.min(ceiling, Math.max(360, startWidth + (startX - clientX))));
          setDragWidth(latest);
        };
        const onMove = (moveEvent) => {
          moveEvent.preventDefault();
          apply(moveEvent.clientX);
        };
        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          poolActions.setSetting('panelWidth', latest);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      };
      const resetResizeWidth = () => {
        setDragWidth(0);
        poolActions.setSetting('panelWidth', 0);
      };

      useEffect(() => {
        if (!view.open || panelPinned) return undefined;
        const onPointerDown = (event) => {
          const target = event.target;
          if (!(target instanceof Element)) return;
          if (panelRef.current && panelRef.current.contains(target)) return;
          if (target.closest('[data-pp-trigger="true"]')) return;
          ui.set({ open: false });
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        return () => document.removeEventListener('pointerdown', onPointerDown, true);
      }, [view.open, panelPinned]);

      useEffect(() => {
        if (!view.open || preview) return undefined;
        const onKey = (event) => {
          if (event.key !== 'Escape' || captureOpen) return;
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
      }, [view.open, editing, preview, captureOpen]);

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

      /** Bytes for pooled images, as browser files the host can accept. */
      const loadImageFiles = async (images) => {
        const files = [];
        for (const image of normalizeImages(images)) {
          const blob = await getImageBlob(image.id);
          if (!blob) throw new Error(translate('image.missing'));
          files.push(new File([blob], image.name || 'image', { type: image.type || blob.type || 'image/png' }));
        }
        return files;
      };

      /**
       * The host's queue admission, if this context can reach it. Sending here
       * keeps the composer untouched, which is the only way a batch release
       * avoids resizing the input for every item.
       */
      const resolveDirectQueue = () => {
        if (!props.sessionId) return null;
        const candidates = [];
        const base = conversationFace || serviceOf(pluginCtx, 'conversation');
        if (base) candidates.push(base);
        const sessions = sessionsFace || serviceOf(pluginCtx, 'sessions');
        if (sessions && typeof sessions.scope === 'function') {
          try {
            const scoped = sessions.scope(props.sessionId);
            const scopedConversation = serviceOf(scoped, 'conversation');
            if (scopedConversation) candidates.push(scopedConversation);
          } catch (_error) {
            /* the context is not session-scoped */
          }
        }
        for (const api of candidates) {
          if (typeof api.createDrafts !== 'function' || typeof api.sendSession !== 'function' || typeof api.scopedSession !== 'function') continue;
          try {
            const session = api.scopedSession('send');
            if (session && typeof session.prompt === 'function' && typeof session.beginSubmission === 'function') return { api, session };
          } catch (_error) {
            /* root-scoped service; try the next candidate */
          }
        }
        return null;
      };

      /** Queue one occurrence without touching the composer. */
      const sendDirect = async (direct, body, images) => {
        const files = images.length > 0 ? await loadImageFiles(images) : [];
        let drafts = [];
        if (files.length > 0) {
          drafts = direct.api.createDrafts(props.sessionId, files);
          if (!Array.isArray(drafts) || drafts.length !== files.length) throw new Error(translate('image.insertFailed'));
        }
        try {
          const outcome = await direct.api.sendSession(direct.session, body, drafts.map((draft) => draft.id), 'queue');
          if (!outcome || outcome.kind !== 'success') throw new Error(translate('status.queueFailed'));
        } catch (error) {
          if (drafts.length > 0 && typeof direct.api.releaseDraftAttachments === 'function') {
            try {
              direct.api.releaseDraftAttachments(drafts);
            } catch (_cleanupError) {
              /* the draft attachment owner may already be gone */
            }
          }
          throw error;
        }
        return drafts.length;
      };

      const addImages = async (images) => {
        const files = await loadImageFiles(images);
        if (files.length === 0) return 0;
        if (!actions || typeof actions.addAttachments !== 'function') throw new Error(translate('image.insertFailed'));
        const api = conversationFace || serviceOf(pluginCtx, 'conversation');
        if (!api || typeof api.createDrafts !== 'function' || !props.sessionId) throw new Error(translate('image.insertFailed'));
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

      /** The composer's draft attachments as descriptors, when the host exposes them. */
      const resolveAttachments = () => {
        const api = conversationFace || serviceOf(pluginCtx, 'conversation');
        if (!api || typeof api.resolveDraftAttachments !== 'function') return [];
        try {
          const list = api.resolveDraftAttachments(attachmentIdsRef.current);
          return Array.isArray(list) ? list : [];
        } catch (_error) {
          return [];
        }
      };

      /** Only open the destination chooser when the composer has something. */
      const openCapture = () => {
        if (!draftRef.current.trim()) {
          flash({ kind: 'error', text: translate('status.nothing') });
          return;
        }
        setCaptureOpen(true);
      };

      /**
       * Copies the composer content into the pool; the composer keeps its text.
       * Attached images come along (their browser files are copied into the pool's
       * image store); other files have no local copy to keep, so they are counted.
       */
      const captureDraft = async (groupArg) => {
        const group = typeof groupArg === 'string' && familyOf(groupArg) ? groupArg : BUILTIN_GROUP.note;
        const text = draftRef.current;
        if (!text || !text.trim()) {
          flash({ kind: 'error', text: translate('status.nothing') });
          return { ok: false, reason: 'empty' };
        }
        const drafts = resolveAttachments();
        const images = drafts.filter((draft) => draft.kind === 'image' && draft.file);
        const others = drafts.filter((draft) => draft.kind !== 'image');
        let stored = [];
        if (images.length > 0) {
          stored = await appendImageAssets(images.map((draft) => draft.file), [], (text) => flash({ kind: 'error', text }));
        }
        const item = {
          id: uid(),
          group,
          title: draftTitle(text, occurrenceRef.current),
          body: text,
          images: normalizeImages(stored),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        poolActions.add(item);
        // The copy lands in the chosen group, which a folded/workspace tab may not show.
        if (!matchesTab(item, tab)) setTab('all');
        const skipped = others.length + (images.length - item.images.length);
        const label = groupLabelOf(item, state.categories, workspaces.items);
        flash(skipped > 0
          ? { kind: 'info', text: translate('status.savedPartialTo', { group: label, n: skipped }) }
          : { kind: 'ok', text: translate('status.savedTo', { group: label }) });
        return { ok: true, skipped, label };
      };

      const newItem = () => {
        const inWorkspace = tab === 'nested:workspace';
        const group = groupForTab(tab, inWorkspace && wsActive ? 'workspace:' + wsActive.slice(3) : '');
        // The new row must land on a visible list, so plain tabs switch to the kind tab.
        if (!inWorkspace && !familyOf(tab)) setTab(group);
        // A search would filter the brand-new empty row out of the list.
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

      const deleteItem = (item, text) => {
        const index = pool.get().items.findIndex((entry) => entry.id === item.id);
        poolActions.remove(item.id);
        flash({
          kind: 'info',
          text: text || translate('status.deleted'),
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
        const direct = resolveDirectQueue();
        if (!direct && draftRef.current.trim() !== '') {
          flash({ kind: 'error', text: translate('status.draftBusy') });
          return;
        }
        busyRef.current = true;
        setBusy(true);
        releaseCancel = false;
        releaseState.set({ active: true, sent: 0, total: entries.length, stopping: false });
        setStatus({ kind: 'info', text: translate('status.releasing', { n: entries.length }) });
        let sent = 0;
        let canceled = false;
        let failed = false;
        // Keys finished by this run; the queue is filtered by key afterwards so
        // rows queued (or removed) meanwhile are not overwritten.
        const done = [];
        try {
          for (const entry of entries) {
            if (releaseCancel) {
              canceled = true;
              break;
            }
            const body = typeof entry.body === 'string' ? entry.body : '';
            const images = normalizeImages(entry.images);
            if (!body.trim() && images.length === 0) {
              done.push(entry.key);
              continue;
            }
            if (direct) {
              try {
                // Straight into the host queue: the composer is never touched,
                // so a batch release cannot resize the input per item.
                await sendDirect(direct, body, images);
              } catch (error) {
                failed = true;
                flash({ kind: 'error', text: String((error && error.message) || error) });
                break;
              }
              sent += 1;
              done.push(entry.key);
              releaseState.set({ active: true, sent, total: entries.length, stopping: releaseCancel });
              if (releaseCancel) {
                canceled = true;
                break;
              }
              continue;
            }
            const clear = await waitFor(() => draftRef.current.trim() === '' && phaseRef.current === 'plain', RELEASE_WAIT.idle);
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
              // The host applies setDraft as a discrete editor update and submit
              // clears the draft in the same transaction. Submitting here keeps
              // the prompt from being painted into the composer between the two
              // steps, which made the conversation flash for every queued item.
              actions.submit();
            } catch (error) {
              flash({ kind: 'error', text: String((error && error.message) || error) });
              break;
            }
            const accepted = await waitFor(
              () =>
                (queueRef.current.length > queuedBefore || pendingRef.current.length > pendingBefore) &&
                draftRef.current.trim() === '',
              RELEASE_WAIT.accept,
            );
            if (!accepted) {
              // The first send of an idle session becomes the live turn, not a queue row.
              if (!(sent === 0 && draftRef.current.trim() === '')) break;
            }
            await waitFor(() => phaseRef.current === 'plain', RELEASE_WAIT.plain);
            sent += 1;
            done.push(entry.key);
            releaseState.set({ active: true, sent, total: entries.length, stopping: releaseCancel });
            if (releaseCancel) {
              canceled = true;
              break;
            }
          }
        } catch (error) {
          flash({ kind: 'error', text: String((error && error.message) || error) });
        } finally {
          busyRef.current = false;
          setBusy(false);
          releaseState.set({ active: false, sent, total: entries.length, stopping: false });
          releaseCancel = false;
        }
        poolActions.removeTrayKeys(done);
        if (canceled) {
          flash({ kind: 'info', text: translate('status.releaseHalted', { n: sent, rest: entries.length - sent }) });
        } else if (failed) {
          flash({ kind: 'error', text: translate('status.releaseFailed', { n: sent, rest: entries.length - sent }) });
        } else {
          flash(
            sent === entries.length
              ? { kind: 'ok', text: translate('status.released', { n: sent }) }
              : { kind: 'error', text: translate('status.releaseStopped', { n: sent, rest: entries.length - sent }) },
          );
        }
      };

      const rowOf = (item, index) => renderPoolRow({
        key: item.id,
        item,
        index,
        total: items.length,
        editing,
        setEditing,
        categories: state.categories,
        workspaces: workspaces.items,
        sessionId: props.sessionId,
        editRows: 4,
        mainTitle: translate('row.insert'),
        showTag: tab === 'all',
        onInsert: insertItem,
        onMain: insertItem,
        onStartEdit: startEdit,
        onQueue: queueItem,
        onDelete: setPendingDelete,
        onSave: save,
        onCancel: cancelEdit,
        onPasteImages: pasteImages,
        onOpenImage: openImage,
        onError: (text) => flash({ kind: 'error', text }),
      });

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
      /** The annotations tab's reply: numbered, each note quotes its passage. */
      /** Write a block of text into the composer through the host's actions. */
      const insertComposerText = (text) => {
        const actions = props.inputActions;
        if (!actions || typeof actions.insertText !== 'function') return false;
        try {
          const span = typeof actions.captureInsertion === 'function' ? actions.captureInsertion() : undefined;
          return actions.insertText(text, span) === true;
        } catch (_error) {
          return false;
        }
      };
      const composeSessionNotes = () => insertComposerText(composeNotesReply(notesList));
      const insertNoteText = (note) => insertComposerText(composeNoteLine(note));

      /** Store the session's annotations as one prompt, from the panel header. */
      const storeNotesPrompt = (event) => {
        const choices = captureChoices(state.categories, workspaces.items, currentWorkspaceId, state.settings);
        const preferred = currentWorkspaceId && choices.some((entry) => entry.value === 'workspace:' + currentWorkspaceId)
          ? 'workspace:' + currentWorkspaceId
          : BUILTIN_GROUP.oftenuse;
        const ordered = choices.some((entry) => entry.value === preferred)
          ? [...choices.filter((entry) => entry.value === preferred), ...choices.filter((entry) => entry.value !== preferred)]
          : choices;
        const rect = event && event.currentTarget && event.currentTarget.getBoundingClientRect
          ? event.currentTarget.getBoundingClientRect()
          : null;
        notePrompt.set({
          open: true,
          target: { kind: 'reply' },
          choices: ordered,
          defaultValue: preferred,
          anchor: rect
            ? { left: Math.round(rect.left), right: Math.round(rect.right), top: Math.round(rect.top), bottom: Math.round(rect.bottom) }
            : { left: 120, right: 160, top: 60, bottom: 90 },
          token: Date.now(),
          onPick: (group) => {
            closeNotePrompt();
            if (!group) return;
            const text = composeNotesReply(notesList);
            poolActions.add({
              id: uid(),
              group,
              title: draftTitle(text),
              body: text,
              images: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
            if (normalizeSettings(state.settings).noteKeepAfterStore === false) {
              notesActions.clearSession(notesSessionId);
            }
            const resolved = resolveGroup(group, state.categories, workspaces.items);
            showToast(translate('note.composeStored', { group: resolved ? resolved.label : translate('row.noCategory') }), 'ok');
          },
        });
      };

      bridgeRef.current = { insert: insertItem, release, capture: captureDraft, composeNotes: composeSessionNotes, insertText: insertComposerText };
      useEffect(() => {
        return bridge.listen((command) => {
          const api = bridgeRef.current;
          if (!api || !command) return { ok: false, reason: 'unavailable' };
          if (command.type === 'compose-notes') {
            return { ok: api.composeNotes() === true };
          }
          if (command.type === 'insert-text') {
            if (typeof command.text !== 'string') return { ok: false, reason: 'bad-command' };
            return { ok: api.insertText(command.text) === true };
          }
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
          if (command.type === 'stop') {
            return { ok: requestReleaseStop() };
          }
          // The sidebar page cannot read the composer, so it asks for the capture.
          if (command.type === 'capture-check') {
            return { ok: true, ready: draftRef.current.trim() !== '' };
          }
          if (command.type === 'capture') {
            // The capture is async (it copies attachments), so the answer is a promise;
            // reading `.ok` off it always failed and reported an empty composer.
            const group = typeof command.group === 'string' ? command.group : '';
            return Promise.resolve(api.capture(group)).then(
              (result) => (result && result.ok ? result : { ok: false, reason: (result && result.reason) || 'empty' }),
              (error) => ({ ok: false, reason: String((error && error.message) || error) }),
            );
          }
          return { ok: false, reason: 'unknown' };
        });
      }, []);

      // The panel lands on the Settings default each time it opens. The tab list
      // is built here because render-time tabs are computed after this hook.
      const wasOpenRef = useRef(false);
      useEffect(() => {
        const open = view.open === true;
        if (open && !wasOpenRef.current) {
          const pref = normalizeSettings(state.settings).defaultTab;
          const baseTabs = buildTabs(state.categories, workspaces.items, state.settings, currentWorkspaceId);
          const resolved = resolveDefaultTab(pref, baseTabs, currentWorkspaceId, notesList.length > 0);
          if (resolved) setTab(resolved);
        }
        wasOpenRef.current = open;
      }, [view.open]);

      if (!view.open) return null;

      const panelCount = state.items.length;
      const captureGroups = captureChoices(state.categories, workspaces.items, currentWorkspaceId, state.settings);
      const baseTabs = buildTabs(state.categories, workspaces.items, state.settings, currentWorkspaceId);
      // The annotation tab is always present, so the feature stays discoverable.
      const tabs = [{ id: 'notes', label: translate('note.title'), group: 'notes' }, ...baseTabs];
      const tabCounts = {
        ...tabCountsOf(state.items),
        notes: notesList.length,
      };

      // A folded family renders its groups as chips inside one tab.
      const customGroups = state.categories.map((category) => ({ id: 'custom:' + category.id, name: category.name }));
      const customActive = customGroups.some((entry) => entry.id === customPick)
        ? customPick
        : customGroups.length > 0
          ? customGroups[0].id
          : '';
      const customCounts = groupCounts(state.items, 'custom');
      const builtinCounts = groupCounts(state.items, 'builtin');
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
                  counts: builtinCounts,
                  emptyText: translate('panel.emptyTab'),
                  scoped: state.items.filter((item) => groupOf(item) === builtinActive),
                }
              : null;

      // --pp-room carries the measured cap into the stylesheet; a dragged height
      // is capped by the same value, so no path can push the header above the
      // pane that clips the panel. --pp-h is the panel's own height, which the
      // queue card uses to keep itself to a share of the panel.
      const panelStyle = {};
      if (room > 0) panelStyle['--pp-room'] = room + 'px';
      if (panelHeight) {
        const size = 'min(' + panelHeight + 'px, var(--pp-room, 90vh))';
        panelStyle['--pp-h'] = size;
        panelStyle.height = size;
        panelStyle.maxHeight = 'none';
      }
      if (panelWidth) panelStyle['--pp-w'] = panelWidth + 'px';

      return h(
        'div',
        {
          className: 'pp-panel',
          role: 'dialog',
          'aria-label': translate('panel.title'),
          ref: panelRef,
          style: Object.keys(panelStyle).length > 0 ? panelStyle : undefined,
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
        h(
          'div',
          {
            key: 'grip-width',
            className: 'pp-panel-grip-x',
            role: 'separator',
            'aria-orientation': 'vertical',
            title: translate('panel.resizeWidth'),
            onPointerDown: startResizeWidth,
            onDoubleClick: resetResizeWidth,
          },
          h('span', { className: 'pp-grip-bar-x' }),
        ),
        // Same header and tab strip as the sidebar page, so both views read alike.
        h(
          'div',
          { className: 'pp-page-head' },
          h(
            'span',
            { className: 'pp-page-title pp-panel-title' },
            h(PromptPoolIcon, { key: 'icon', size: 16 }),
            translate('panel.title'),
          ),
          h('input', {
            key: 'search',
            className: 'pp-search',
            value: query,
            placeholder: translate('page.search'),
            'aria-label': translate('page.search'),
            onChange: (event) => setQuery(event.target.value),
          }),
          tab === 'notes'
            ? [
                h('button', { key: 'store', type: 'button', className: 'pp-mini', title: translate('note.composeStoreHint'), onClick: storeNotesPrompt }, translate('note.composeStore')),
                h('button', { key: 'draft', type: 'button', className: 'pp-mini', title: translate('note.composeHint'), onClick: composeSessionNotes }, translate('note.compose')),
              ]
            : [
                h('button', { key: 'new', type: 'button', className: 'pp-mini', onClick: newItem }, '＋ ', translate('page.new')),
                h('button', { key: 'capture', type: 'button', className: 'pp-mini', title: translate('panel.captureHint'), onClick: openCapture }, translate('panel.capture')),
              ],
          h(SettingsButton, { active: settingsOpen, onClick: () => setSettingsOpen(!settingsOpen) }),
          h(IconButton, {
            name: 'pin',
            label: panelPinned ? translate('panel.unpin') : translate('panel.pin'),
            active: panelPinned,
            onClick: () => poolActions.setSetting('panelPinned', !panelPinned),
          }),
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
            tabs,
            counts: tabCounts,
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
                const entries = pool.get().tray.slice();
                poolActions.clearTray();
                setConfirmClear(false);
                if (entries.length === 0) return;
                flash({
                  kind: 'info',
                  text: translate('status.cleared', { n: entries.length }),
                  undo: () => {
                    poolActions.restoreTray(entries);
                    setStatus(null);
                  },
                });
              },
              onCancel: () => setConfirmClear(false),
            })
          : null,
        pendingDelete
          ? h(ItemDeleteConfirm, {
              onCancel: () => setPendingDelete(null),
              onConfirm: () => {
                deleteItem(pendingDelete);
                setPendingDelete(null);
              },
            })
          : null,
        pendingRemove && tray.some((entry) => entry.key === pendingRemove.key)
          ? h(TrayRemoveConfirm, {
              onCancel: () => setPendingRemove(null),
              onConfirm: () => {
                poolActions.removeTray(pendingRemove.key);
                setPendingRemove(null);
              },
            })
          : null,
        captureOpen
          ? h(CaptureMenu, {
              groups: captureGroups,
              onPick: (group) => {
                setCaptureOpen(false);
                captureDraft(group);
              },
              onCancel: () => setCaptureOpen(false),
            })
          : null,
        h(
          'div',
          { className: 'pp-list', ref: listRef },
          settingsOpen
            ? h(PromptPoolSettings, { currentWorkspaceId })
            : tab === 'notes'
              ? h(NotesView, {
                  notes: notesList,
                  sessionId: notesSessionId,
                  onCompose: composeSessionNotes,
                  onInsertNote: insertNoteText,
                  hideActions: true,
                  filter: query,
                  categories: state.categories,
                  workspaces: workspaces.items,
                  currentWorkspaceId,
                  settings: state.settings,
                })
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
          tab === 'notes' && noteBar.text
            ? h('div', { className: 'pp-notes-bar', 'data-kind': noteBar.kind, role: 'status' }, noteBar.text)
            : null,
          notice
          ? h(
              'div',
              { className: 'pp-status pp-status-float', role: 'status', 'aria-live': 'polite', 'data-kind': notice.kind || 'info' },
              h('span', null, notice.text),
              notice.undo
                ? h(
                    'button',
                    {
                      type: 'button',
                      className: 'pp-link',
                      onClick: () => {
                        notice.undo();
                      },
                    },
                    translate('status.undo'),
                  )
                : null,
            )
          : null,
        !settingsOpen && tab !== 'notes'
          ? renderTrayCard({
              entries: tray,
              queuePending: queue.length,
              collapsed: queueCollapsed,
              busy,
              sessionId: props.sessionId,
              editing: trayEditing,
              setEditing: setTrayEditing,
              onSaveEdit: saveTrayEdit,
              onPasteImages: pasteTrayImages,
              onClear: () => setConfirmClear(true),
              onRelease: release,
              onRemove: setPendingRemove,
              onOpenImage: openImage,
              onError: (text) => flash({ kind: 'error', text }),
            })
          : null,
        ),
        h(ImageLightbox, { preview, onClose: closeImage }),
        renderReleaseOverlay({ state: releaseInfo, onStop: requestReleaseStop }),
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
      '.pp-trigger[disabled]{opacity:.55;cursor:not-allowed}' +
      '.pp-trigger-label{white-space:nowrap}' +
      '.pp-trigger[data-queued="true"]{border-color:var(--pp-accent-line);background:var(--pp-accent-soft);color:var(--pp-accent);font-weight:600}' +
      '.pp-trigger[data-queued="true"]:hover{background:color-mix(in srgb,var(--pp-accent) 20%,transparent);color:var(--pp-accent)}' +
      '.pp-trigger[data-queued="true"] .pp-badge{border-color:var(--pp-accent);background:var(--pp-accent);color:var(--pp-on-accent);font-weight:600}' +
      '.pp-panel{position:absolute;left:auto;right:0;bottom:0;margin:0;width:min(var(--pp-w,920px),100%);max-width:min(var(--pp-w,920px),100%);z-index:40;display:flex;flex-direction:column;--pp-h:min(70vh,720px,var(--pp-room,100vh));height:var(--pp-h);max-height:var(--pp-h);border:1px solid var(--pp-line);border-radius:var(--dsw-radius-panel,12px);background:var(--dsw-alias-bg-base,var(--pp-surface-2));box-shadow:var(--dsw-elevation-soft,0 10px 30px rgba(0,0,0,.16));overflow:hidden;overflow:clip;font-size:13px;line-height:1.5;color:var(--pp-ink);text-align:left}' +
      // The grip above the header resizes the panel; a long queue may keep half the list.
      '.pp-panel-grip{flex:none;display:flex;align-items:center;justify-content:center;height:11px;cursor:ns-resize;touch-action:none}' +
      '.pp-panel-grip-x{position:absolute;left:0;top:0;bottom:0;width:8px;z-index:5;display:flex;align-items:center;justify-content:center;cursor:ew-resize;touch-action:none}' +
      '.pp-grip-bar-x{width:3px;height:44px;border-radius:2px;background:var(--pp-line-2);opacity:0;transition:opacity .12s ease}' +
      '.pp-panel-grip-x:hover .pp-grip-bar-x,.pp-panel-grip-x:active .pp-grip-bar-x{opacity:1;background:var(--pp-accent)}' +
      '.pp-grip-bar{width:44px;height:4px;border-radius:2px;background:var(--pp-line-2);transition:background .12s ease}' +
      '.pp-panel-grip:hover .pp-grip-bar{background:var(--pp-accent)}' +
      // flex:none keeps the card at its content height (or its cap) instead of
      // shrinking until the chips clip inside the panel.
      // A short panel used to cap the card at 45% of itself, so even two chips
      // scrolled; a generous share of the panel keeps a few rows whole, and only a
      // genuinely long queue scrolls inside the card.
      // The card sizes to its rows and only then scrolls. A percentage cap here
      // resolves against an auto-height dock and collapses the card to one row,
      // so the cap is expressed against the panel's own measured cap instead.
      '.pp-panel .pp-page-foot{flex:none;max-height:min(calc(var(--pp-h, 100vh) * 0.7), 320px);min-height:0}' +
      // flex:1 would collapse an auto-height card to zero and clip the empty hint;
      // the tray sizes to its content and only shrinks (then scrolls) at the cap.
      '.pp-panel .pp-page-foot .pp-tray{max-height:none;min-height:0;flex:0 1 auto}' +
      '.pp-panel .pp-foot-head{flex:none}' +
      '.pp-grow{flex:1;min-width:0}' +
      '.pp-x{width:22px;height:22px;border:0;border-radius:6px;background:transparent;color:var(--pp-ink-2);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:12px;line-height:1}' +
      '.pp-x:hover{background:var(--pp-hover);color:var(--pp-ink)}' +
      '.pp-bar{display:flex;align-items:center;gap:6px;padding:0 12px 8px;flex-wrap:wrap}' +
      '.pp-tab{height:24px;padding:0 9px;border-radius:7px;border:1px solid transparent;background:transparent;color:var(--pp-ink-2);font:inherit;font-size:12px;cursor:pointer}' +
      '.pp-tab:not([data-active="true"]){color:color-mix(in srgb,var(--pp-accent) 78%,var(--pp-ink-2))}' +
      '.pp-tab[data-group="notes"]:not([data-active="true"]){color:#8a6200}' +
      '.pp-tab:hover{background:var(--pp-hover)}' +
      '.pp-tab[data-active="true"]{border-color:var(--pp-accent);background:var(--pp-accent-soft);color:var(--pp-accent);font-weight:600}' +
      '.pp-tab[data-group="notes"][data-active="true"]{border-color:rgba(232,176,40,.9);background:rgba(232,176,40,.2);color:#9a6b00}' +
      '.pp-tab[data-group="notes"] .pp-tab-count{background:rgba(232,176,40,.22);color:#8a6200}' +
      '.pp-tab-count{margin-left:5px;padding:0 5px;vertical-align:1px;border-radius:999px;background:color-mix(in srgb, currentColor 12%, transparent);color:inherit;font-size:10px;font-weight:600;line-height:16px;height:16px;display:inline-flex;align-items:center}' +
      '.pp-tab:not([data-group="notes"]) .pp-tab-count{background:color-mix(in srgb,var(--pp-accent) 12%,transparent);color:var(--pp-accent)}' +
      '.pp-tab-add{padding:0 7px;color:var(--pp-ink-2)}' +
      '.pp-select{height:26px;min-width:170px;max-width:100%;padding:0 8px;border:1px solid var(--pp-line);border-radius:7px;background:var(--pp-surface);color:var(--pp-ink);font:inherit;font-size:12px}' +
      '.pp-set-intro{white-space:pre-line}' +
      '.pp-set-radios{display:flex;flex-direction:column;gap:4px;padding:2px 0 4px}' +
      '.pp-set-radio-row{display:flex;align-items:center;gap:10px}' +
      '.pp-set-radio{display:inline-flex;align-items:center;gap:6px;cursor:pointer}' +
      '.pp-tab-addwrap{display:inline-flex;align-items:center}' +
      '.pp-tab-sep{flex:none;width:1px;height:16px;margin:0 7px;background:color-mix(in srgb, var(--pp-ink-2) 45%, transparent)}' +
      '.pp-tab-x{margin-left:4px;padding:0 2px;border-radius:4px;font-size:11px;line-height:1;color:var(--pp-ink-2);cursor:pointer}' +
      '.pp-tab-x:focus-visible{outline:2px solid var(--pp-accent);outline-offset:1px}' +
      '.pp-tab-x:hover{color:var(--pp-danger)}' +
      '.pp-tab-input{height:24px;width:110px;padding:0 7px;border:1px solid var(--pp-accent);border-radius:7px;background:var(--dsw-alias-bg-base);color:inherit;font:inherit;font-size:12px;outline:none}' +
      '.pp-release-mask{position:absolute;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:16px;background:color-mix(in srgb,var(--pp-ink) 28%,transparent)}' +
      '.pp-release-card{width:100%;max-width:300px;display:flex;flex-direction:column;align-items:center;gap:10px;padding:16px 18px;border:1px solid var(--pp-line);border-radius:12px;background:var(--pp-surface-2);box-shadow:0 18px 48px rgba(0,0,0,.24);text-align:center}' +
      '.pp-release-title{font-weight:600;font-size:13px}' +
      '.pp-release-count{font-size:12px;color:var(--pp-ink-2);font-variant-numeric:tabular-nums}' +
      '.pp-modal{position:absolute;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;background:color-mix(in srgb,var(--pp-ink) 22%,transparent)}' +
      '.pp-modal-card{width:100%;max-width:400px;display:flex;flex-direction:column;gap:14px;padding:16px 18px;border:1px solid var(--pp-line);border-radius:12px;background:var(--pp-surface-2);box-shadow:0 18px 48px rgba(0,0,0,.24)}' +
      '.pp-modal-text{font-size:13px;line-height:1.65;color:var(--pp-ink)}' +
      '.pp-modal-actions{display:flex;justify-content:flex-end;gap:8px}' +
      '.pp-capture-options{display:flex;flex-direction:column;gap:6px;max-height:280px;overflow:auto}' +
      '.pp-capture-option{justify-content:flex-start;height:auto;min-height:26px;padding:5px 9px;text-align:left;white-space:normal}' +
      '.pp-mini{height:24px;padding:0 9px;border-radius:7px;border:1px solid var(--pp-line);background:transparent;color:var(--pp-ink);font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}' +
      '.pp-mini:hover{background:var(--pp-hover)}' +
      '.pp-set-btn{display:inline-flex;align-items:center;gap:5px;padding:0 9px}' +
      '.pp-set-btn[data-active="true"]{border-color:var(--pp-accent);color:var(--pp-accent)}' +
      '.pp-set-btn-icon{display:inline-flex;align-items:center}' +
      '.pp-list{overflow-y:auto;padding:6px 8px 20px;flex:1;min-height:0}' +
      '.pp-page{position:relative;display:flex;flex-direction:column;height:100%;min-height:0;background:var(--dsw-alias-bg-base);color:var(--pp-ink);font-size:13px;line-height:1.5}' +
      '.pp-page-head{display:flex;align-items:center;gap:8px;padding:12px 12px 8px;border-bottom:1px solid var(--pp-line);flex-wrap:wrap}' +
      '.pp-page-title{font-size:14px;font-weight:600}' +
      '.pp-panel-title{display:inline-flex;align-items:center;gap:6px;flex:none;margin-right:2px}' +
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
        '.pp-set-ws{display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;min-width:0}' +
        '.pp-set-ws input{margin:0;accent-color:var(--pp-accent);cursor:pointer}' +
        '.pp-set-ws-name{font-size:12px;color:var(--pp-ink);white-space:nowrap}' +
        '.pp-set-ws-tag{margin-left:6px;padding:0 5px;border-radius:5px;background:var(--pp-accent-soft);color:var(--pp-accent);font-size:10px}' +
        '.pp-set-ws-path{margin-left:auto;color:var(--pp-ink-2);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:340px}' +
        '.pp-set-label{font-size:12px;color:var(--pp-ink-2);margin:2px 0 4px}' +
        '.pp-set-note{margin-right:auto;padding:0;line-height:1.4}' +
        '.pp-set-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:8px}' +
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
      '.pp-row{display:flex;align-items:flex-start;gap:8px;padding:7px 8px;border-radius:8px}' +
      '.pp-row:hover{background:color-mix(in srgb,var(--pp-accent) 10%,transparent)}' +
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
      '.pp-foot-head{display:flex;align-items:center;gap:6px}' +
      '.pp-page-foot .pp-foot-head{margin:-10px -12px 0;padding:8px 12px;border-radius:9px 9px 0 0;background:var(--pp-queue-head-bg)}' +
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
      '.pp-notes-bar{margin:0 10px 10px;padding:8px 12px;border:1px solid color-mix(in srgb,var(--pp-danger) 30%,var(--pp-line-2));border-radius:9px;background:color-mix(in srgb,var(--pp-danger) 9%,transparent);color:var(--pp-danger);font-size:12px;line-height:1.5}' +
      '.pp-notes-bar[data-kind="ok"]{border-color:color-mix(in srgb,var(--pp-ok) 30%,var(--pp-line-2));background:color-mix(in srgb,var(--pp-ok) 9%,transparent);color:var(--pp-ok)}' +
      '.pp-status-float{position:absolute;left:10px;right:auto;width:max-content;max-width:calc(100% - 20px);bottom:100%;margin-bottom:6px;padding:6px 12px;border:1px solid var(--pp-line-2);border-radius:8px;background:var(--pp-surface);box-shadow:0 4px 14px rgba(0,0,0,.10);z-index:5;pointer-events:none;animation:pp-status-in .16s ease}' +
      '.pp-panel .pp-status-float{pointer-events:auto}' +
      // The page's status float stays click-through, so only the undo link takes clicks.
      '.pp-status-float .pp-link{pointer-events:auto}' +
      '@keyframes pp-status-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}';

    /**
     * The right-click menu is mounted by the conversation view, not by a pool
     * view, so it carries its own copy of the shared tokens. The host positions
     * the surrounding surface and caps its height; `max-height: inherit` lets the
     * lists scroll inside that cap instead of running past the pointer. The menu
     * and its submenu are two cards in one wrapping row: the host measures the
     * grown surface and moves it back inside the pane, and a narrow pane drops
     * the submenu under the menu instead of clipping it.
     */
    const MENU_CSS =
      '.pp-selwrap{--pp-accent:var(--dsw-alias-state-business-primary,var(--dsw-alias-brand-primary));--pp-accent-soft:color-mix(in srgb,var(--pp-accent) 13%,transparent);--pp-ink:var(--dsw-alias-label-primary);--pp-ink-2:var(--dsw-alias-label-secondary);--pp-line:var(--dsw-alias-border-l1);--pp-surface:var(--dsw-alias-bg-overlay);--pp-ok:var(--dsw-alias-state-success-primary);--pp-danger:var(--dsw-alias-state-error-primary);display:flex;flex-wrap:wrap;align-items:flex-start;gap:6px;max-height:inherit}' +
      '.pp-selmenu,.pp-selpanel{display:flex;flex-direction:column;box-sizing:border-box;max-width:100%;max-height:inherit;padding:6px;border:1px solid var(--pp-line);border-radius:10px;background:var(--pp-surface);box-shadow:0 12px 32px rgba(0,0,0,.18);color:var(--pp-ink);font-size:12px;line-height:1.5;text-align:left;overflow:hidden}' +
      '.pp-selmenu{width:214px}' +
      '.pp-selpanel{width:190px}' +
      '.pp-seldonecard{width:280px}' +
      '.pp-sellist{display:flex;flex-direction:column;min-height:0;overflow-y:auto}' +
      '.pp-selrule{height:1px;margin:3px 4px;background:var(--pp-line)}' +
      '.pp-selgroup{display:flex;flex-direction:column;margin-top:4px;padding:3px 3px 4px;border:1px solid var(--pp-line);border-radius:8px;background:color-mix(in srgb,var(--pp-ink) 3%,transparent)}' +
      '.pp-selgroup-label{display:flex;align-items:center;gap:4px;padding:1px 8px 3px;color:var(--pp-ink-2);font-size:10px;letter-spacing:.02em}' +
      '.pp-selrow{display:flex;align-items:center;gap:8px;width:100%;height:26px;padding:0 8px;border:0;border-radius:6px;background:transparent;color:var(--pp-ink);font:inherit;font-size:12px;text-align:left;cursor:pointer}' +
      '.pp-selrow:hover,.pp-selrow:focus-visible{background:color-mix(in srgb,var(--pp-accent) 11%,transparent)}' +
      '.pp-selrow:focus-visible{outline:2px solid var(--pp-accent);outline-offset:-2px}' +
      '.pp-selname{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.pp-selchev{flex:none;color:var(--pp-ink-2);font-size:11px}' +
      '.pp-selkey{flex:none;color:var(--pp-ink-2);font-size:11px}' +
      '.pp-selcount{flex:none;color:var(--pp-ink-2);font-size:11px;font-variant-numeric:tabular-nums}' +
      '.pp-sellast{flex:none;padding:0 5px;border-radius:5px;background:var(--pp-accent-soft);color:var(--pp-accent);font-size:10px;line-height:16px}' +
      '.pp-seldone{display:flex;align-items:flex-start;gap:6px;padding:2px;color:var(--pp-ink);font-size:12px}' +
      '.pp-seldone-text{flex:1;min-width:0;line-height:1.5}' +
      '.pp-seldone[data-kind="error"]{color:var(--pp-danger)}' +
      '.pp-seldone-mark{flex:none;color:var(--pp-ok);font-size:12px}' +
      '.pp-seldone[data-kind="error"] .pp-seldone-mark{color:var(--pp-danger)}';

    /**
     * Annotations live in the frame overlay and in the composer dock, so they
     * carry their own tokens and controls. The highlight rule is global: the
     * Highlight API paints ranges that the markdown DOM never contains.
     */
    const NOTES_CSS =
      '::highlight(prompt-pool-note-comment){text-decoration-line:underline;text-decoration-style:solid;text-decoration-color:rgba(255,191,36,.95);text-decoration-thickness:1px;text-underline-offset:2px}' +
      '::highlight(prompt-pool-note-question){text-decoration-line:underline;text-decoration-style:solid;text-decoration-color:rgba(244,114,114,.95);text-decoration-thickness:1px;text-underline-offset:2px}' +
      '::highlight(prompt-pool-note-agree){text-decoration-line:underline;text-decoration-style:solid;text-decoration-color:rgba(74,222,128,.95);text-decoration-thickness:1px;text-underline-offset:2px}' +
      '::highlight(prompt-pool-note-disagree){text-decoration-line:underline;text-decoration-style:solid;text-decoration-color:rgba(239,68,68,.95);text-decoration-thickness:1px;text-underline-offset:2px}' +
      '::highlight(prompt-pool-note-idea){text-decoration-line:underline;text-decoration-style:solid;text-decoration-color:rgba(96,165,250,.95);text-decoration-thickness:1px;text-underline-offset:2px}' +
      '::highlight(prompt-pool-note-todo){text-decoration-line:underline;text-decoration-style:dashed;text-decoration-color:rgba(251,191,36,.95);text-decoration-thickness:1px;text-underline-offset:2px}' +
      '.pp-note-layer{--pp-note-accent:var(--dsw-alias-state-business-primary,var(--dsw-alias-brand-primary));--pp-note-ink:var(--dsw-alias-label-primary);--pp-note-ink-2:var(--dsw-alias-label-secondary);--pp-note-line:var(--dsw-alias-border-l1);--pp-note-surface:var(--dsw-alias-bg-overlay);--pp-note-hover:color-mix(in srgb,var(--pp-note-ink) 8%,transparent);--pp-note-danger:var(--dsw-alias-state-error-primary);--pp-note-ok:var(--dsw-alias-state-success-primary);position:fixed;inset:0;z-index:2147482000;pointer-events:none}' +
      '.pp-note-bubble{position:fixed;z-index:1;display:flex;flex-direction:column;gap:8px;width:310px;max-width:calc(100vw - 24px);max-height:calc(100vh - 24px);overflow:auto;box-sizing:border-box;padding:11px;border:1px solid var(--pp-note-line);border-radius:12px;background:var(--pp-note-surface);box-shadow:0 18px 48px rgba(0,0,0,.22),0 2px 6px rgba(0,0,0,.08);color:var(--pp-note-ink);font-size:12px;line-height:1.5;text-align:left;pointer-events:auto}' +
      '.pp-note-bubble-quote{box-sizing:border-box;padding:6px 8px;border-radius:8px;background:rgba(var(--pp-bubble-tint),.10);color:var(--pp-note-ink-2);font-size:11px;line-height:1.5;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}.pp-note-bubble-quote-icon{margin-right:4px;color:rgb(var(--pp-bubble-tint))}' +
      '.pp-note-bubble-hint{color:var(--pp-note-danger);font-size:11px}' +
      
      '.pp-note-input{width:100%;box-sizing:border-box;min-height:48px;max-height:120px;padding:6px 8px;border:1px solid var(--pp-note-line);border-radius:8px;background:color-mix(in srgb,var(--pp-note-ink) 3%,transparent);color:inherit;font:inherit;font-size:12px;line-height:1.5;resize:none;outline:none}' +
      '.pp-note-input:focus{border-color:rgba(var(--pp-bubble-tint),.9);box-shadow:0 0 0 2px rgba(var(--pp-bubble-tint),.14)}' +
      '.pp-note-bubble-foot{display:flex;align-items:center;gap:8px}.pp-note-bubble-ask{flex:1;color:var(--pp-note-ink-2);font-size:11px;line-height:1.4}.pp-note-bubble-actions{display:flex;gap:6px;margin-left:auto}.pp-note-bubble .pp-note-btn{height:24px;padding:0 9px;font-size:11px;border-radius:7px}.pp-note-btn-quiet-danger{border-color:transparent;background:transparent;color:var(--pp-note-danger)}.pp-note-btn-quiet-danger:hover{background:rgba(var(--pp-note-danger-rgb,239,68,68),.10)}' +
      '.pp-note-btn{height:24px;padding:0 10px;border:1px solid var(--pp-note-line);border-radius:7px;background:transparent;color:var(--pp-note-ink);font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}' +
      '.pp-note-btn:hover{background:var(--pp-note-hover)}' +
      '.pp-note-btn:disabled{opacity:.45;cursor:default}' +
      '.pp-note-btn-primary{border-color:var(--pp-note-accent);background:var(--pp-note-accent);color:#fff}' +
      '.pp-note-btn-primary:hover{background:var(--pp-note-accent);filter:brightness(1.05)}' +
      '.pp-note-btn-danger{color:var(--pp-note-danger);border-color:color-mix(in srgb,var(--pp-note-danger) 40%,transparent)}' +
      '.pp-note-btn-danger:hover{background:color-mix(in srgb,var(--pp-note-danger) 10%,transparent)}' +
      '.pp-notes{--pp-note-accent:var(--dsw-alias-state-business-primary,var(--dsw-alias-brand-primary));--pp-note-ink:var(--dsw-alias-label-primary);--pp-note-ink-2:var(--dsw-alias-label-secondary);--pp-note-line:var(--dsw-alias-border-l1);--pp-note-surface:var(--dsw-alias-bg-overlay);--pp-note-hover:color-mix(in srgb,var(--pp-note-ink) 8%,transparent);--pp-note-danger:var(--dsw-alias-state-error-primary);--pp-note-ok:var(--dsw-alias-state-success-primary);display:flex;flex-direction:column;box-sizing:border-box;width:100%;border:1px solid var(--pp-note-line);border-radius:10px;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#e0a800) 5%,var(--dsw-alias-bg-base,#fff));color:var(--pp-note-ink);font-size:12px;line-height:1.5}' +
      '.pp-notes-embedded{border:0;border-radius:0;background:transparent}' +
      '.pp-notes-embedded .pp-notes-head{padding:8px 2px 4px}' +
      '.pp-notes-embedded .pp-notes-list{max-height:none;overflow:visible;padding:0}' +
      '.pp-notes-embedded .pp-notes-row{background:transparent}' +
      '.pp-notes-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-height:32px;padding:5px 10px}' +
      '.pp-notes-title{font-weight:600}' +
      '.pp-notes-count{color:var(--pp-note-ink-2);font-size:11px;font-variant-numeric:tabular-nums}' +
      '.pp-notes-status{font-size:11px}' +
      '.pp-notes-status[data-kind="error"]{color:var(--pp-note-danger)}' +
      '.pp-notes-status[data-kind="ok"]{color:var(--pp-note-ok)}' +
      '.pp-notes-grow{flex:1;min-width:8px}' +
      '.pp-notes-ask{color:var(--pp-note-ink-2);font-size:11px}' +
      '.pp-notes-list{display:flex;flex-direction:column;gap:4px;max-height:180px;overflow-y:auto;padding:0 8px 8px}' +
      '.pp-notes-row{display:flex;align-items:flex-start;gap:8px;padding:6px 7px;border:1px solid transparent;border-radius:8px;background:transparent}' +
      '.pp-notes-row:hover{background:rgba(232,176,40,.22)}' +
      '.pp-notes-n{flex:none;min-width:16px;height:16px;margin-top:1px;border-radius:999px;background:rgba(232,176,40,.22);color:var(--pp-note-ink-2);font-size:10px;line-height:16px;text-align:center}' +
      '.pp-notes-main{flex:1;min-width:0}' +
      '.pp-notes-quote{display:flex;align-items:center;gap:6px;color:var(--pp-note-ink-2);font-size:11px;white-space:nowrap;overflow:hidden}' +
      '.pp-notes-quote-text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}' +
      '.pp-notes-empty{padding:14px 12px;color:var(--pp-note-ink-2);font-size:12px;line-height:1.6}' +
      '.pp-notes-tag{flex:none;padding:0 5px;border-radius:5px;background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#2f9e63) 14%,transparent);color:var(--dsw-alias-state-success-primary,#2f9e63);font-size:10px;line-height:16px}' +
      '.pp-notes-row[data-promoted="true"]{border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary,#2f9e63) 35%,var(--pp-note-line))}' +
      '.pp-notes-kind{flex:none;display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;margin-right:4px;border-radius:4px;background:rgba(var(--pp-inline-tint),.18);color:rgb(var(--pp-inline-tint));font-size:10px;line-height:1}' +
      '.pp-note-inline[data-kind="comment"],.pp-notes-kind[data-kind="comment"],.pp-note-kind[data-kind="comment"]{--pp-inline-tint:255,191,36}' +
      '.pp-note-inline[data-kind="question"],.pp-notes-kind[data-kind="question"],.pp-note-kind[data-kind="question"]{--pp-inline-tint:244,114,114}' +
      '.pp-note-inline[data-kind="agree"],.pp-notes-kind[data-kind="agree"],.pp-note-kind[data-kind="agree"]{--pp-inline-tint:74,222,128}' +
      '.pp-note-inline[data-kind="disagree"],.pp-notes-kind[data-kind="disagree"],.pp-note-kind[data-kind="disagree"]{--pp-inline-tint:239,68,68}' +
      '.pp-note-inline[data-kind="idea"],.pp-notes-kind[data-kind="idea"],.pp-note-kind[data-kind="idea"]{--pp-inline-tint:96,165,250}' +
      '.pp-note-inline[data-kind="todo"],.pp-notes-kind[data-kind="todo"],.pp-note-kind[data-kind="todo"]{--pp-inline-tint:251,191,36}' +
      '.pp-note-inline{display:inline-flex;align-items:center;gap:3px;height:17px;margin:0 1px 0 4px;padding:0 5px;border:1px dashed rgba(var(--pp-inline-tint),.85);border-radius:5px;background:rgba(var(--pp-inline-tint),.15);color:inherit;font:inherit;font-size:11px;line-height:17px;vertical-align:middle;white-space:nowrap;user-select:none;-webkit-user-select:none;cursor:pointer}' +
      '.pp-note-inline-icon{font-size:10px;line-height:1;color:rgb(var(--pp-inline-tint))}' +
      '.pp-note-inline-text{white-space:nowrap}' +
      '.pp-note-inline:hover{border-color:rgb(var(--pp-inline-tint));background:rgba(var(--pp-inline-tint),.26)}' +
      '.pp-note-kinds{display:flex;flex-wrap:wrap;gap:2px;margin:0}' +
      '.pp-note-kind{display:inline-flex;align-items:center;gap:3px;height:20px;padding:0 5px;border:1px solid var(--pp-note-line);border-radius:999px;background:transparent;color:var(--pp-note-ink-2);font:inherit;font-size:10.5px;cursor:pointer}' +
      '.pp-note-kind[data-active="true"]{border-color:rgba(var(--pp-inline-tint),.9);color:var(--pp-note-ink);background:rgba(var(--pp-inline-tint),.16)}' +
      '.pp-note-kind-icon{font-size:10px;line-height:1;color:rgb(var(--pp-inline-tint))}' +
      '.pp-note-limit{color:var(--pp-note-ink-2);font-size:10px;font-variant-numeric:tabular-nums}' +
      '.pp-note-limit-count{font-variant-numeric:tabular-nums}' +
      '.pp-note-prompt{position:fixed;z-index:3;display:flex;flex-direction:column;gap:2px;width:210px;box-sizing:border-box;padding:5px;border:1px solid var(--pp-note-line);border-radius:10px;background:var(--pp-note-surface);box-shadow:0 14px 34px rgba(0,0,0,.2);color:var(--pp-note-ink);font-size:12px;line-height:1.5;text-align:left;pointer-events:auto}' +
      '.pp-note-prompt-title{padding:2px 8px 4px;color:var(--pp-note-ink-2);font-size:11px}' +
      '.pp-note-prompt-list{display:flex;flex-direction:column;max-height:250px;overflow-y:auto}' +
      '.pp-note-prompt-row{display:flex;align-items:center;gap:6px;width:100%;height:26px;padding:0 8px;border:0;border-radius:6px;background:transparent;color:var(--pp-note-ink);font:inherit;font-size:12px;text-align:left;cursor:pointer}' +
      '.pp-note-prompt-row:hover,.pp-note-prompt-row:focus-visible{background:var(--pp-note-hover);outline:none}' +
      '.pp-note-prompt-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.pp-note-prompt-tag{flex:none;padding:0 5px;border-radius:5px;background:rgba(var(--pp-bubble-tint,232,176,40),.16);color:var(--pp-note-ink-2);font-size:10px;line-height:16px}' +
      '.pp-note-prompt-sep{height:1px;margin:3px 6px;background:var(--pp-note-line)}' +
      '.pp-note-prompt-cancel{color:var(--pp-note-ink-2)}' +
      '.pp-note-prompt-message{padding:2px 8px;color:var(--pp-note-ink);font-size:12px;line-height:1.5}' +
      '.pp-note-prompt-actions{display:flex;justify-content:flex-end;gap:6px;padding:2px}' +
      '.pp-note-groups{display:flex;flex-direction:column;gap:4px;margin:2px 0 6px;padding:8px;border:1px solid var(--pp-note-line);border-radius:8px;background:var(--pp-note-surface)}' +
      '.pp-note-groups-title{font-size:11px;color:var(--pp-note-ink-2)}' +
      '.pp-note-groups-list{display:flex;flex-wrap:wrap;gap:4px}' +
      '.pp-note-group{display:inline-flex;align-items:center;gap:4px;height:24px;padding:0 9px;border:1px solid var(--pp-note-line);border-radius:7px;background:transparent;color:var(--pp-note-ink);font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}' +
      '.pp-note-group:hover{border-color:var(--pp-note-accent)}' +
      '.pp-note-group[data-default="true"]{border-color:var(--pp-note-accent);background:color-mix(in srgb,var(--pp-note-accent) 10%,transparent)}' +
      '.pp-note-group-default{font-size:10px;color:var(--pp-note-accent)}' +
      '.pp-notes-text{white-space:pre-wrap;word-break:break-word;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}' +
      '.pp-note-link{border:0;background:transparent;color:var(--pp-note-ink-2);font:inherit;font-size:11px;cursor:pointer;padding:2px 0;white-space:nowrap}' +
      '.pp-note-link:hover{color:var(--pp-note-ink);text-decoration:underline;text-underline-offset:2px}' +
      '.pp-note-link-danger:hover{color:var(--pp-note-danger)}.pp-note-icon{display:inline-flex;align-items:center;justify-content:center;flex:none;width:22px;height:22px;padding:0;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--pp-note-ink-2);cursor:pointer}.pp-note-icon:hover{background:var(--pp-note-hover);color:var(--pp-note-ink)}.pp-note-icon.pp-note-link-danger:hover{color:var(--pp-note-danger)}.pp-note-ask{display:inline-flex;align-items:center;gap:4px;color:var(--pp-note-ink-2);font-size:11px;white-space:nowrap}';

    // ------------------------------------------------------------------- plugin
    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        localeCtx = ctx.locale;
        pluginCtx = ctx;
        seedPoolIfNeeded();
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
        bindOptional(['sessions'], (target) => {
          sessionsFace = serviceOf(target, 'sessions');
        });
        // Right-click on selected conversation text: the host asks plugins in
        // registration order and the first surface that opens wins. Only the
        // context-menu trigger is claimed, so the built-in Quote action keeps the
        // plain drag selection. A host without this service keeps its native menu.
        let selectionMenuMounted = false;
        bindOptional(['uiConversation'], (target) => {
          if (selectionMenuMounted) return;
          const service = serviceOf(target, 'uiConversation');
          const interactions = service && service.interactions;
          if (!interactions || typeof interactions.register !== 'function') return;
          selectionMenuMounted = true;
          try {
            ctx.effect(() =>
              interactions.register({
                id: 'prompt-pool',
                onInteraction(request) {
                  if (!request || request.trigger !== 'contextmenu') return;
                  if (typeof request.readText !== 'function' || request.readText() === null) return;
                  // Opening alone does not suppress the browser menu: without this
                  // the native menu and our surface would both show.
                  request.preventDefault();
                  request.open();
                },
              }),
            );
          } catch (_error) {
            selectionMenuMounted = false;
          }
        });
        if (ctx.locale && typeof ctx.locale.register === 'function' && typeof ctx.locale.bind === 'function') {
          ctx.effect(() => ctx.locale.register(NS, { zh: ZH, en: EN }));
          const preview = previewLocaleId();
          if (preview) {
            const table = preview === 'zh' ? ZH : EN;
            translate = (key, params) => interpolate(table[key] || key, params);
          } else {
            translate = ctx.locale.bind(NS);
          }
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
        // The Chat view renders the surface the interaction above opened, keyed by
        // that interaction's id. The slot is declared only while Chat is mounted.
        ctx.slots.inject('conversation.chat.text-interaction', () =>
          ctx.slots.register(
            { name: 'conversation.chat.text-interaction', key: 'prompt-pool', locale: NS },
            SelectionMenu,
          ),
        );
        // Annotations: cards and the inline editor in the frame overlay; the list
        // and the composed reply live in the prompt pool views' annotation tab.
        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register(
            { name: 'shell.overlay', id: 'prompt-pool-notes', order: 30, label: () => translate('note.title') },
            NotesLayer,
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