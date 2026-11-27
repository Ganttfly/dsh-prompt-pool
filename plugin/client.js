window.__ModuleLoader__.load({
  id: 'dsh-prompt-pool',
  factory(require) {
    'use strict';

    const React = require('react');
    const h = React.createElement;
    const { useCallback, useEffect, useMemo, useRef, useState } = React;

    const useSyncExternalStore = React.useSyncExternalStore;

    /**
     * The shell's hover bubble when this host exposes it. Older hosts and the
     * stubbed test renderer fall back to the button's native title instead of
     * failing the plugin's first render.
     */
    let HostTooltip = null;
    try {
      const primitives = require('@deepseek-ai/dsh-client-ui-primitives');
      HostTooltip = primitives && typeof primitives.Tooltip === 'function' ? primitives.Tooltip : null;
    } catch (error) {
      HostTooltip = null;
    }

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
    const PLUGIN_VERSION = '2.1.0';
    const PLUGIN_AUTHOR = 'GanttShen';
    /** Replace once the public repository exists; the row hides while it is empty. */
    const PLUGIN_REPO = 'https://github.com/Ganttfly/dsh-prompt-pool';
    /** The sidebar service, kept so the page can correct a restored tab title. */
    let sidebarService = null;
    /** The native right sidebar, once it mounts; null on hosts without one. */
    let rightSidebarFace = null;
    /** True once our page kind is registered, so openTab has somewhere to land. */
    let nativeTabReady = false;
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
      'tip.pool': '打开提示池，开启与AI高效协作模式',
      'tip.notes': '在大段会话中随手提问题、定决策，一键汇总成提示词',
      'tip.noteCount': '此会话已标注{n}条批注',
      'tip.prompts': '随时记录需求、灵感和指令；提前编排多步骤指令队列，一键发送。',
      'panel.title': '提示池',
      'panel.close': '关闭',
      'panel.resize': '拖动调整高度，双击还原',
      'panel.resizeWidth': '拖动调整宽度，双击还原',
      'panel.pin': '钉住面板',
      'panel.unpin': '取消钉住',
      'panel.empty': '池子是空的。点「添加提示词」新建，或在输入栏「提示池」菜单里点「保存草稿」收下输入框内容。',
      'panel.emptyTab': '这一栏还没有内容。',
      'page.emptyTab': '这里还没有提示词。',
      'tab.all': '全部',
      'tab.oftenuse': '常用',
      'ws.none': '没有可用的工作区',

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
      'group.untitled': '无标题',
      'mention.loading': '正在读取…',
      'mention.empty': '没有匹配项',
      'mention.noSessionTag': '无会话',
      'mention.directory': '目录',
      'mention.noSkillService': '读不到技能目录（remote 服务未绑定）',
      'mention.noSessionService': '读不到会话服务（sessions 未绑定）',
      'mention.sessionClosed': '会话未打开，无法读取技能目录',
      'mention.failed': '读取失败',
      'mention.timeout': '读取超时：宿主没有响应（可能没有活跃会话）',
      'row.insert': '插入输入框',
      'row.select': '加入待发送',
      'row.duplicate': '复制',
      'page.title': '提示池',
      'tab.description': '暂存、编辑、编排你的提示词，按住顺序一次性释放',
      'page.search': '搜索标题或内容…',
      'page.empty': '把反复使用的指令存在这里，下次一键插入或排队发送。',
      'page.noMatch': '没有匹配的条目。',
      'help.open': '使用说明',
      'help.title': '提示池怎么用',
      'help.intro': '提示池专注于提升与AI的交互体验，\n帮你抓住会话中的关键点，为下一次对话高效组织提示词。',
      'help.notesTitle': '批注',
      'help.notesWhy': '大段会话内容阅读太费劲？\n疑问、决策、思路等散落各处不好整理？',
      'help.notesBody': '直接在会话中添加批注，一键汇总成提示词，让交互更高效。\n你可以选中文字后右键「划词批注」，或点「连续批注」启动自动识别功能后，连续点击选中内容为其添加批注。',
      'help.promptsTitle': '提示词',
      'help.promptsWhy': '思路和灵感无处安放？\n常用提示词需要每次重复书写？\n多条连续指令想要一次编排好再发？',
      'help.promptsBody': '使用提示词功能，随时记录思路和灵感。\n把需要反复写的指令存起来，随时需要随时发送。\n你还可以把多条连续指令加入有序队列批量发送，让多步骤任务更好管理。',
      'help.close': '知道了',
      'status.noComposer': '没有可用的输入框：请先打开一个对话页签',
      'status.noWorkspace': '当前会话还没有工作区，无法新建工作区提示词。',
      'status.releaseSent': '已交给输入框，按顺序排队中',
      'status.savedToPool': '已保存',
      'status.finishEditFirst': '先保存或取消正在编辑的那条提示词，再存这一条。',
      'settings.nav': '提示池',
      'settings.open': '提示池设置',
      'settings.tab.notes': '批注',
      'settings.notesIntro': '批注和当前会话绑定，存进提示池的提示词不再跟会话走。',
      'settings.notesKeepInsert': '插入输入框后，仍旧保留',
      'settings.notesKeepInsertHint': '关闭后，插入成功的批注会从列表移除；批注高亮和正文里的标记随之消失。',
      'settings.notesKeepReview': '汇总发送后，仍旧保留',
      'settings.notesKeepReviewHint': '关闭后，一键汇总发出的批注会从列表移除；整理卡里「停放」到提示词的待办不受影响。',
      'settings.notesKeepStore': '存为提示词后，仍旧保留',
      'settings.notesKeepStoreHint': '关闭后，存成提示词成功的批注会从列表移除。保存步骤不会把会话、原文节点和上下文带进提示词。',
      'settings.table': '全局共享池的分组',
      'settings.tableHint': '每行决定这一组在全局共享池里怎么显示；箭头调整先后顺序。工作区提示词不参与这些分组。',
      'settings.showAllTab': '显示「全部」标签页',
      'settings.showAllTabHint': '关闭后在全局共享池的标签栏里隐藏「全部」；其他分组页签仍可正常切换，停在「全部」的视图会自动落到第一个可用页签。',
      'settings.tableGroup': '分组',
      'settings.tableOrder': '顺序',
      'settings.moveUp': '上移',
      'settings.moveDown': '下移',
      'settings.display.builtin': '内置分组',
      'settings.display.custom': '自定义分组',
      'settings.mode.tabs': '展开',
      'settings.mode.nested': '折叠',
      'settings.mode.hidden': '隐藏',
      'settings.tab.prompts': '提示词',
      'settings.back': '返回提示池',
      'settings.keep': '用过之后',
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
      'settings.title': '提示池',
      'settings.desc': '控制批注保留、提示词使用后的保留，以及全局共享池的分组显示。改动立即生效。',
      'row.edit': '编辑',
      'row.delete': '删除',
      'row.deleteTitle': '删除这条提示词',
      'row.deleteConfirm': '删除后这条会从池子里移出，可以在提示条上撤销。',
      'row.deleteAction': '删除',
      'row.up': '上移',
      'row.down': '下移',
      'row.save': '保存',
      'row.cancel': '取消',
      'editor.unsavedTitle': '保存当前修改？',
      'editor.unsavedText': '切换项目会丢弃尚未保存的内容。',
      'editor.unsavedStay': '继续编辑',
      'editor.unsavedDiscard': '不保存',
      'editor.unsavedSave': '保存并切换',
      'row.lengthHint': '最多 500 个全角或 1,000 个半角字符，支持 @ 引用文件',
      'row.titlePlaceholder': '标题（可留空）',
      'row.bodyPlaceholder': '提示词内容',
      'row.type': '类型',
      'row.typeClear': '清除类型',
      'prompt.type.decision': '决策',
      'prompt.type.question': '提问',
      'prompt.type.opinion': '意见',
      'prompt.type.idea': '思路',
      'prompt.type.supplement': '补充',
      'prompt.type.todo': '待办',
      'prompt.type.inspiration': '灵感',
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
      // Chips under a folded family tab: the whole family, then each group.
      'tab.familyGroups': '分组',
      'row.classification': '分组',
      'page.new': '添加提示词',

      'row.noCategory': '未分组',
      'tray.title': '待发送队列',
      'tray.titleHint': '这里只放提示词；批注在「预览提示词」卡里直接发送或存成提示词。',
      'tray.source.prompt': '提示词',
      'tray.source.review': '汇总',
      'tray.source.annotation': '批注',
      'tray.selected': '共 {n} 条',
      'tray.release': '发送',
      'tray.digest': '合并发送',
      'tray.mode': '发送方式',
      'tray.mode.single': '逐条',
      'tray.mode.merge': '合并',
      'merge.title': '合并预览',
      'merge.chosen': '共 {n} 条',
      'merge.subtitle': '按待发送队列的顺序合并为一条消息。',
      'merge.previewHint': '按当前顺序合并为一条消息；发送前可以直接修改。',
      'merge.attachments': '图片附件（{n}）：作为附件随合并消息发送，不写入提示词正文。',
      'merge.empty': '没有可合并的条目',
      'merge.sending': '正在合并…',
      'merge.preview': '合并预览',
      'merge.confirm': '合并发送',
      'tray.clearTitle': '清空待发送队列',
      'tray.clearConfirm': '队列里的 {n} 条会被一起移出。',
      'tray.clearAction': '清空',
      'tray.empty': '队列里还没有提示词；在提示词行点「＋」加入。',
      'tray.remove': '移出',
      'tray.removeTitle': '移出这一条',
      'tray.removeConfirm': '移出后不可撤销；这条如果在队列里改过，改动不会保留。',
      'tray.removeAction': '移出',
      'tray.duplicate': '复制一份，追加到末尾',

      'tray.collapseTitle': '收起待发送队列',
      'tray.resize': '拖动调整高度，双击复位',
      'tray.expandTitle': '展开待发送队列',
      'status.saved': '已存入池子',
      'status.savedPartial': '已存入池子，但这 {n} 个附件没有一起保存',
      'status.savedTo': '已存入「{group}」',
      'status.savedPartialTo': '已存入「{group}」，但 {n} 个附件没有保存',
      'capture.title': '存到哪个分组？',
      'menu.title': '添加到提示池',
      'menu.pool': '添加提示词',
      'menu.group': '提示池',
      'menu.copy': '复制',
      'menu.copied': '已复制',
      'menu.copyFailed': '复制失败：请按 {shortcut}',
      'note.addPick': '连续批注',
      'note.addSel': '划词批注',
      'note.pick.page': '连续批注',
      'note.pick.hint': '移到段落上点击标注，类型和内容写在气泡里；Esc 退出',
      'note.pick.count': '已添加 {n} 条',
      'note.pick.done': '完成',
      'note.pick.anchorFailed': '无法定位这个段落，请换一段试试。',
      'note.pick.meta': '{kind} · {n} 字',
      'note.pick.paragraph': '段落',
      'note.pick.listItem': '列表项',
      'note.pick.heading': '标题',
      'note.pick.quote': '引用',
      'note.pick.code': '代码块',
      'note.pick.cell': '表格单元',
      'note.pick.reply': '整条回复',
      'note.anchorFailed': '无法定位这段选中文字，请重新选择助手回复中的一句话。',
      'note.title': '批注',
      'scope.notes': '批注',
      'scope.prompts': '提示词',
      'scope.workspace': '当前工作区',
      'scope.global': '共享池',
      'scope.hint.notes': '仅当前会话',
      'scope.hint.prompts': '仅当前工作区',
      'scope.hint.global': '所有工作区共用',
      'scope.hint.notes.title': '批注按会话保存，只显示当前会话的批注。',
      'scope.hint.prompts.title': '这里的提示词只属于当前工作区，不会出现在其他工作区。',
      'scope.hint.global.title': '内置分组和自定义分组在所有工作区共用。',
      'note.placeholder': '写点什么：回答、疑问或修改意见',
      'note.limitHint': '最多 500 个全角或 1,000 个半角字符',

      'note.noneSelected': '先勾选至少一条批注',
      'note.review.title': '预览提示词',
      'note.review.heading': '【汇总批注】',
      'note.review.intro': '请按类型逐条回应每条批注，同时必须保留批注编号。\n默认只回应，不要修改文件或执行任务，除非该条目带有【立即实施…】标记。\n如需立即实施，先完成该条目的回应，然后再严格按照批注中的要求实施并报告结果；如实施相关的任意条件不满足或任何原因导致无法实施，则不应实施并说明未实施原因。\n若某条目所引用原文只是选项或不完整片段，则应结合会话中上一条回复的完整原文理解；仍无法确定时先说明并询问，不要猜。\n只输出对批注本身的回应，回应要尽量言简意赅，条理清晰，通俗易懂。',
      'note.review.contextQuestion': '问题：{text}',
      'note.review.context': '上下文：{text}',
      'note.review.attachments': '附件：{n} 张图片。',
      'note.review.group.question': '逐条回答。',
      'note.review.group.comment': '逐条说明接受、不接受或需要补充，并给出理由。',
      'note.review.group.agree': '确认收到结论即可，不必展开。',
      'note.review.group.disagree': '确认收到否定结论；带【立即实施…】标记的按标记执行。',
      'note.review.group.idea': '补充需要的信息，评估可行性、收益和风险，给出建议方案。',
      'note.review.group.supplement': '这条批注补充了新信息。请结合它重新检查相关结论，指出哪些结论需要修正、哪些保持不变，并给出更新后的判断；不要修改文件或执行任务。',
      'note.review.group.todo': '执行并逐项报告结果；如果受阻或需要确认，先说明并等待。',
      'note.review.immediate.comment': '采纳时立即实施',
      'note.review.immediate.agree': '按此方案立即实施',
      'note.review.immediate.idea': '可行时立即实施',
      'note.review.immediate.disagree': '按照用户要求立即执行',
      'note.review.immediateMark.comment': '【立即实施（采纳后）】',
      'note.review.immediateMark.agree': '【立即实施（按此方案）】',
      'note.review.immediateMark.idea': '【立即实施（可行时）】',
      'note.review.immediateMark.disagree': '【立即实施（按用户要求）】',
      'note.review.immediateMark.todo': '【立即实施】',
      'note.review.immediateCount': '本轮立即实施 {n} 条',
      'note.review.todo.execute': '立即实施',
      'note.review.todo.prompt': '存为提示词',
      'note.review.parkOnly': '没有需要发送给 Agent 的批注；待办可以存入提示池。',
      'note.review.parked': '已将 {n} 条待办存入提示池',
      'note.review.queuedParked': '已发送汇总，并将 {n} 条待办存入提示池',
      'note.review.selected': '已选 {n} 条',
      'note.review.open': '汇总批注',
      'note.review.collapse': '收起',
      'note.review.resize': '拖动调整高度，双击复位',
      'note.review.previewHint': '按当前勾选和立即实施选项生成；可直接修改。',
      'note.review.processTitle': '按当前勾选重新生成提示词',
      'note.review.refresh': '刷新',
      'note.review.idleHint': '点击「汇总批注」，勾选需要处理的批注、可自动生成汇总后的提示词。',
      'note.review.stale': '批注已变更，点「刷新」更新提示词。',
      'note.review.nothingSelected': '还没有勾选批注；在上方列表勾选后再生成提示词。',
      'note.review.selectAll': '全选',
      'note.review.cancel': '取消',
      'note.review.clearAll': '清空选择',
      'note.review.select': '选择此批注',
      'note.review.parkAction': '存入提示池',
      'note.review.send': '发送',
      'note.summary.title': '汇总批注',
      'note.summary.count': '{n} 条批注',
      'note.summary.desc': '把当前会话的全部批注合并成一条带编号和回应要求的提示词，放入输入框；不会自动发送。',
      'note.summary.keep': '完成后保留批注',
      'note.summary.immediate': '允许立即执行',
      'note.summary.immediateHint': '勾选后，同意、意见、思路、反对、待办会带上【立即实施…】标记；提问、补充信息只回应。',
      'note.summary.ok': '生成草稿',
      'note.summary.working': '正在生成…',
      'note.summary.done': '已生成草稿',
      'note.summary.failed': '无法写入输入框，请稍后再试。',
      'note.menu.summary': '一键汇总',
      'note.menu.view': '查看批注',
      'prompt.menu.save': '保存草稿',
      'prompt.menu.new': '添加提示词',
      'prompt.menu.view': '查看提示词',
      'note.review.savePrompt': '存成提示词',
      'note.review.sending': '正在发送…',
      'note.review.queued': '已送入会话队列',
      'note.review.inserted': '已插入输入框；确认后请手动发送。',
      'note.review.failed': '发送失败：{reason}',
      'note.review.unsupported': '当前宿主没有队列直投接口',
      'note.empty': '没有匹配的批注',
      'note.emptyIntro': '还没有批注。在回复里选中一句话，右键选择「批注」。',
      'note.save': '保存',
      'note.cancel': '取消',
      'note.delete': '删除',
      'note.edit': '编辑批注',
      'note.emptyBody': '待补充',
      'note.justAdded': '刚刚添加',
      'note.compose': '汇总批注',
      'note.composeHint': '把选中的批注汇总后插入输入框',
      'note.composeStoreHint': '把选中的批注存成一条提示词',
      'note.insert': '插入输入框',
      'note.locate': '定位到原文位置',
      'note.locateFailed': '这条批注暂时找不到原文（回复可能被折叠或改写了）。',
      'note.deleteConfirm': '删除这条批注？',
      'note.deleteHint': '删除后这条批注会从当前会话移除。',
      'note.default': '默认',
      'note.reset': '重置位置',
      'note.store': '存为提示词',
      'note.stored': '已存入 {group}',
      'note.composeStore': '存成提示词',
      'note.save.contextWarning': '转为提示词后不会保留会话上下文，请确认内容可以独立理解。',
      'note.composeStored': '已存成提示词到 {group}',
      'note.prompt.quote': '【原文】',
      'note.prompt.body': '【批注】',
      'note.prompt.end': '。',
      'note.prompt.lead.agree': '同意：',
      'note.prompt.lead.disagree': '不同意：',
      'note.prompt.lead.question': '疑问：',
      'note.prompt.lead.comment': '意见：',
      'note.prompt.lead.idea': '思路：',
      'note.prompt.lead.supplement': '补充：',
      'note.prompt.lead.todo': '待办：',
      'note.inserted': '已插入输入框',
      'note.insertedAndRemoved': '已插入输入框，并从列表移出',
      'note.insertFailed': '输入框暂不可用，稍后再试',
      'note.quoteMissing': '这条批注暂时找不到原文位置（回复可能被折叠或改写了）。',
      'note.kind.comment': '意见',
      'note.kind.question': '提问',
      'note.kind.agree': '同意',
      'note.kind.disagree': '反对',
      'note.kind.idea': '思路',
      'note.kind.supplement': '补充信息',
      'note.kind.todo': '待办',
      'menu.last': '上次',
      'menu.count': '{n} 条',
      'menu.saved': '已加入「{group}」',
      'status.storageFailed': '保存失败：浏览器存储不可写（可能已满）。改动只在当前页面有效。',
      'status.nothing': '草稿是空的，先写点什么',
      'status.emptyBody': '内容不能是空的',
      'status.inserted': '已插入到输入框',
      'status.insertedAndRemoved': '已插入到输入框，并从池子移出',
      'status.queued': '已加入待发送队列',
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
      'tip.pool': 'Open the prompt pool and work with the model in flow',
      'tip.notes': 'Ask and decide while reading a long reply; fold it into one prompt',
      'tip.noteCount': '{n} annotations in this session',
      'tip.prompts': 'Keep needs, ideas and instructions; queue multi-step prompts and send them in one go',
      'panel.title': 'Prompt pool',
      'panel.close': 'Close',
      'panel.resize': 'Drag to resize, double-click to reset',
      'panel.resizeWidth': 'Drag to resize the width, double-click to reset',
      'panel.pin': 'Pin the panel',
      'panel.unpin': 'Unpin the panel',
      'panel.empty': 'The pool is empty. Press Add prompt to create one, or pick Save draft in the composer\'s pool menu.',
      'panel.emptyTab': 'Nothing in this tab yet.',
      'page.emptyTab': 'No prompts here yet.',
      'tab.all': 'All',
      'tab.oftenuse': 'Frequent',
      'ws.none': 'No workspaces available',

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
      'group.untitled': 'Untitled',
      'mention.loading': 'Loading…',
      'mention.empty': 'No matches',
      'mention.noSessionTag': 'no session',
      'mention.directory': 'folder',
      'mention.noSkillService': 'Skill catalog unavailable (remote service not bound)',
      'mention.noSessionService': 'Session service unavailable (sessions not bound)',
      'mention.sessionClosed': 'The session is not open, so the catalog is unavailable',
      'mention.failed': 'Failed to load',
      'mention.timeout': 'Timed out: the host did not answer (no live session?)',
      'row.insert': 'Insert into the composer',
      'row.select': 'Add to the send queue',
      'row.duplicate': 'Duplicate',
      'page.title': 'Prompt pool',
      'tab.description': 'Stage, edit and arrange prompts, then release them in order',
      'page.search': 'Search title or text…',
      'page.empty': 'Keep the instructions you reuse here, then insert or queue them in one click.',
      'page.noMatch': 'No matching item.',
      'help.open': 'How it works',
      'help.title': 'How the prompt pool works',
      'help.intro': 'The prompt pool exists for better exchanges with the model:\ncatch what matters in a conversation, and have the next prompt ready.',
      'help.notesTitle': 'Annotations',
      'help.notesWhy': 'A long reply hard to read?\nQuestions, decisions and ideas scattered all over?',
      'help.notesBody': 'Annotate in the conversation and fold the marks into one prompt; it keeps the exchange moving.\nSelect the words and right-click “Select to annotate”, or click “Continuous” to start picking, then keep clicking the content you want annotated.',
      'help.promptsTitle': 'Prompts',
      'help.promptsWhy': 'No place for an idea when it strikes?\nRetyping the same instruction every time?\nWant to line several steps up before sending?',
      'help.promptsBody': 'Keep ideas and inspiration in Prompts as they come.\nSave the instructions you write again and again, and send them whenever you need.\nYou can also queue several steps and send them in order, so multi-step work stays manageable.',
      'help.close': 'Got it',
      'status.noComposer': 'No composer available: open a conversation tab first',
      'status.noWorkspace': 'This session has no workspace yet, so a workspace prompt cannot be created.',
      'status.releaseSent': 'Handed to the composer; queuing in order',
      'status.savedToPool': 'Saved',
      'status.finishEditFirst': 'Save or cancel the prompt you are editing before filing this one.',
      'settings.nav': 'Prompt pool',
      'settings.open': 'Prompt pool settings',
      'settings.tab.notes': 'Annotations',
      'settings.notesIntro': 'Annotations are tied to the session; a prompt filed into the pool is not.',
      'settings.notesKeepInsert': 'Keep annotations after inserting one into the composer',
      'settings.notesKeepInsertHint': 'Turned off, an inserted annotation leaves the list with its highlight and its mark in the passage.',
      'settings.notesKeepReview': 'Keep annotations after a summary is sent',
      'settings.notesKeepReviewHint': 'Turned off, a sent summary takes its annotations out of the list. To-dos parked into a prompt by the review card stay put.',
      'settings.notesKeepStore': 'Keep annotations after saving as a prompt',
      'settings.notesKeepStoreHint': 'Turned off, annotations leave the list once saved as a prompt. The save step does not copy the session, source node or context into the prompt.',
      'settings.table': 'Groups in the global shared pool',
      'settings.tableHint': 'Each row decides how that family shows up in the global shared pool; the arrows reorder them. Workspace prompts do not use these groups.',
      'settings.showAllTab': 'Show the “All” tab',
      'settings.showAllTabHint': 'Turned off, the global shared pool hides “All”; group tabs still switch normally, and a view parked on “All” lands on the first available tab.',
      'settings.tableGroup': 'Group',
      'settings.tableOrder': 'Order',
      'settings.moveUp': 'Move up',
      'settings.moveDown': 'Move down',
      'settings.display.builtin': 'Built-in groups',
      'settings.display.custom': 'Custom groups',
      'settings.mode.tabs': 'Expanded',
      'settings.mode.nested': 'Folded',
      'settings.mode.hidden': 'Hidden',
      'settings.tab.prompts': 'Prompts',
      'settings.back': 'Back to prompt pool',
      'settings.keep': 'After use',
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
      'settings.title': 'Prompt pool',
      'settings.desc': 'Controls annotation retention, prompt retention after use, and how the global shared pool groups are displayed. Changes apply immediately.',
      'row.edit': 'Edit',
      'row.delete': 'Delete',
      'row.deleteTitle': 'Delete this prompt',
      'row.deleteConfirm': 'This prompt will be removed from the pool. You can undo it from the toast.',
      'row.deleteAction': 'Delete',
      'row.up': 'Move up',
      'row.down': 'Move down',
      'row.save': 'Save',
      'row.cancel': 'Cancel',
      'editor.unsavedTitle': 'Save your changes?',
      'editor.unsavedText': 'Switching to another item discards your unsaved changes.',
      'editor.unsavedStay': 'Keep editing',
      'editor.unsavedDiscard': 'Discard',
      'editor.unsavedSave': 'Save and switch',
      'row.lengthHint': 'Up to 500 full-width or 1,000 half-width characters; use @ to reference files',
      'row.titlePlaceholder': 'Title (optional)',
      'row.bodyPlaceholder': 'Prompt text',
      'row.type': 'Type',
      'row.typeClear': 'Clear type',
      'prompt.type.decision': 'Decision',
      'prompt.type.question': 'Question',
      'prompt.type.opinion': 'Opinion',
      'prompt.type.idea': 'Idea',
      'prompt.type.supplement': 'Supplement',
      'prompt.type.todo': 'To-do',
      'prompt.type.inspiration': 'Inspiration',
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
      'tab.familyGroups': 'Groups',
      'row.classification': 'Group',
      'page.new': 'Add prompt',

      'row.noCategory': 'Ungrouped',
      'tray.title': 'Send queue',
      'tray.titleHint': 'Prompts only; annotations are sent or saved from the Prompt preview card.',
      'tray.source.prompt': 'Prompt',
      'tray.source.review': 'Summary',
      'tray.source.annotation': 'Annotation',
      'tray.selected': '{n} prompt(s)',
      'tray.release': 'Send',
      'tray.digest': 'Merge & send',
      'tray.mode': 'Send mode',
      'tray.mode.single': 'One by one',
      'tray.mode.merge': 'Merge',
      'merge.title': 'Merge preview',
      'merge.chosen': '{n} item(s)',
      'merge.subtitle': 'Combines the outbox entries into one message in their current order.',
      'merge.previewHint': 'Merged into one message in the current order. Edit it before sending.',
      'merge.attachments': '{n} image(s) attached to the merged message; not inserted into the prompt text.',
      'merge.empty': 'No entries to merge',
      'merge.sending': 'Merging…',
      'merge.preview': 'Merged preview',
      'merge.confirm': 'Merge & send',
      'tray.clearTitle': 'Clear the send queue',
      'tray.clearConfirm': 'All {n} queued items are removed at once.',
      'tray.clearAction': 'Clear',
      'tray.empty': 'No prompts queued yet — use the ＋ control on a prompt row.',
      'tray.remove': 'Remove',
      'tray.removeTitle': 'Remove this queued item',
      'tray.removeConfirm': 'This cannot be undone. Edits made to this queued copy are lost.',
      'tray.removeAction': 'Remove',
      'tray.duplicate': 'Duplicate and append to the end',

      'tray.collapseTitle': 'Collapse the send queue',
      'tray.resize': 'Drag to resize; double-click to reset',
      'tray.expandTitle': 'Expand the send queue',
      'status.saved': 'Saved to the pool',
      'status.savedPartial': 'Saved to the pool; {n} attachment(s) were not captured',
      'status.savedTo': 'Saved to {group}',
      'status.savedPartialTo': 'Saved to {group}; {n} attachment(s) were not captured',
      'capture.title': 'Save to which group?',
      'menu.title': 'Add to the prompt pool',
      'menu.pool': 'Add prompt',
      'menu.group': 'Prompt pool',
      'menu.copy': 'Copy',
      'menu.copied': 'Copied',
      'menu.copyFailed': 'Copy failed: press {shortcut}',
      'note.addPick': 'Continuous',
      'note.addSel': 'Select to annotate',
      'note.pick.page': 'Continuous',
      'note.pick.hint': 'Move over a paragraph, click to annotate; type and text live in the bubble. Esc to exit',
      'note.pick.count': '{n} added',
      'note.pick.done': 'Done',
      'note.pick.anchorFailed': 'Could not anchor this block. Try another one.',
      'note.pick.meta': '{kind} · {n} chars',
      'note.pick.paragraph': 'Paragraph',
      'note.pick.listItem': 'List item',
      'note.pick.heading': 'Heading',
      'note.pick.quote': 'Quote',
      'note.pick.code': 'Code block',
      'note.pick.cell': 'Table cell',
      'note.pick.reply': 'Whole reply',
      'note.anchorFailed': 'Could not anchor that selection. Select a passage in the assistant reply again.',
      'note.title': 'Annotations',
      'scope.notes': 'Annotations',
      'scope.prompts': 'Prompts',
      'scope.workspace': 'Current workspace',
      'scope.global': 'Shared',
      'scope.hint.notes': 'This session only',
      'scope.hint.prompts': 'This workspace only',
      'scope.hint.global': 'Shared across workspaces',
      'scope.hint.notes.title': 'Annotations are saved with this session and appear only here.',
      'scope.hint.prompts.title': 'Prompts here belong to this workspace and do not appear in other workspaces.',
      'scope.hint.global.title': 'Built-in and custom groups are shared across all workspaces.',
      'note.placeholder': 'Write an answer, a question or a correction',
      'note.limitHint': 'Up to 500 full-width or 1,000 half-width characters',

      'note.noneSelected': 'Select at least one annotation first',
      'note.review.title': 'Prompt preview',
      'note.review.heading': '[Summarized annotations]',
      'note.review.intro': 'Respond to each annotation by kind, one by one, and always keep its annotation ID.\nBy default, respond only: do not modify files or run tasks, unless that item carries an [Execute now…] marker.\nTo execute, finish the response to that item first, then carry out the work exactly as the annotation asks and report the result; if any condition for the work is unmet, or anything else blocks it, do not execute and say why.\nIf an item quotes only an option or an incomplete fragment, read it against the full text of the previous reply in the session; if it is still unclear, say so and ask instead of guessing.\nOutput only the responses to the annotations themselves, and keep them brief, well ordered and easy to follow.',
      'note.review.contextQuestion': 'Question: {text}',
      'note.review.context': 'Context: {text}',
      'note.review.attachments': 'Attachments: {n} image(s).',
      'note.review.group.question': 'Answer each one.',
      'note.review.group.comment': 'Say whether you accept, reject or need more input, with reasons.',
      'note.review.group.agree': 'Confirm the conclusion; no need to elaborate.',
      'note.review.group.disagree': 'Confirm the rejection; items marked Execute now follow their marker.',
      'note.review.group.idea': 'Gather what is needed, assess feasibility, upside and risk, and propose next steps.',
      'note.review.group.supplement': 'This annotation adds new information. Use it to revisit the related conclusions, say which need correcting and which stay the same, and give the updated judgement; do not modify files or run tasks.',
      'note.review.group.todo': 'Execute and report the result; if blocked or in need of confirmation, explain and wait.',
      'note.review.immediate.comment': 'Implement if adopted',
      'note.review.immediate.agree': 'Implement the approved proposal',
      'note.review.immediate.idea': 'Implement if feasible',
      'note.review.immediate.disagree': 'Execute now as requested',
      'note.review.immediateMark.comment': '[Execute now (once adopted)]',
      'note.review.immediateMark.agree': '[Execute now (approved proposal)]',
      'note.review.immediateMark.idea': '[Execute now (if feasible)]',
      'note.review.immediateMark.disagree': '[Execute now (as requested)]',
      'note.review.immediateMark.todo': '[Execute now]',
      'note.review.immediateCount': '{n} to execute this round',
      'note.review.todo.execute': 'Execute now',
      'note.review.todo.prompt': 'Save as prompt',
      'note.review.parkOnly': 'Nothing to send to the agent; to-dos can be saved to the prompt pool.',
      'note.review.parked': 'Saved {n} to-do(s) to the prompt pool',
      'note.review.queuedParked': 'Summary sent; {n} to-do(s) saved to the prompt pool',
      'note.review.selected': '{n} selected',
      'note.review.open': 'Summarize',
      'note.review.collapse': 'Collapse',
      'note.review.resize': 'Drag to resize; double-click to reset',
      'note.review.previewHint': 'Generated from the checked annotations and immediate choices; edit freely.',
      'note.review.processTitle': 'Regenerate the prompt from the current selection',
      'note.review.refresh': 'Refresh',
      'note.review.idleHint': 'Click Summarize, check the annotations you need to process, and the combined prompt is generated automatically.',
      'note.review.stale': 'Annotations changed; press Refresh to update the prompt.',
      'note.review.nothingSelected': 'No annotations checked; check some rows above to generate a prompt.',
      'note.review.selectAll': 'Select all',
      'note.review.cancel': 'Cancel',
      'note.review.clearAll': 'Clear',
      'note.review.select': 'Select this annotation',
      'note.review.parkAction': 'Save to prompt pool',
      'note.review.send': 'Send',
      'note.summary.title': 'Summarize annotations',
      'note.summary.count': '{n} annotation(s)',
      'note.summary.desc': 'Combine every annotation in this session into one numbered prompt with response requirements and put it in the composer; nothing is sent automatically.',
      'note.summary.keep': 'Keep annotations after generating',
      'note.summary.immediate': 'Allow immediate execution',
      'note.summary.immediateHint': 'When checked, agreements, opinions, ideas, disagreements and to-dos carry an [Execute now…] marker; questions and additional info only get a response.',
      'note.summary.ok': 'Generate draft',
      'note.summary.working': 'Generating…',
      'note.summary.done': 'Draft generated',
      'note.summary.failed': 'Could not write to the composer. Try again later.',
      'note.menu.summary': 'Summarize in one click',
      'note.menu.view': 'View annotations',
      'prompt.menu.save': 'Save draft',
      'prompt.menu.new': 'Add prompt',
      'prompt.menu.view': 'View prompts',
      'note.review.savePrompt': 'Save as prompt',
      'note.review.sending': 'Sending…',
      'note.review.queued': 'Sent to the session queue',
      'note.review.inserted': 'Inserted into the composer; send it when ready.',
      'note.review.failed': 'Could not send: {reason}',
      'note.review.unsupported': 'This host exposes no direct queue admission',
      'note.empty': 'No matching annotations',
      'note.emptyIntro': 'No annotations yet. Select a passage in the reply, then right-click and choose “Annotate”.',
      'note.save': 'Save',
      'note.cancel': 'Cancel',
      'note.delete': 'Delete',
      'note.edit': 'Edit annotation',
      'note.emptyBody': 'Add details',
      'note.justAdded': 'Just added',
      'note.compose': 'Summarize',
      'note.composeHint': 'Summarize the selected annotations into one draft',
      'note.composeStoreHint': 'Save the selected annotations as one prompt',
      'note.insert': 'Insert into the composer',
      'note.locate': 'Locate the passage',
      'note.locateFailed': 'This note cannot find its passage right now (the reply may be folded or rewritten).',
      'note.deleteConfirm': 'Delete this annotation?',
      'note.deleteHint': 'This annotation will be removed from the current session.',
      'note.default': 'Default',
      'note.reset': 'Reset position',
      'note.store': 'Save as prompt',
      'note.stored': 'Saved to {group}',
      'note.composeStore': 'Save as prompt',
      'note.save.contextWarning': 'Saving as a prompt does not keep the conversation context; make sure the text stands on its own.',
      'note.composeStored': 'Saved as a prompt in {group}',
      'note.prompt.quote': '【Original】',
      'note.prompt.body': '【Annotation】',
      'note.prompt.end': '.',
      'note.prompt.lead.agree': 'Agreed: ',
      'note.prompt.lead.disagree': 'Disagree: ',
      'note.prompt.lead.question': 'Question: ',
      'note.prompt.lead.comment': 'Comment: ',
      'note.prompt.lead.idea': 'Idea: ',
      'note.prompt.lead.supplement': 'Adding: ',
      'note.prompt.lead.todo': 'To do: ',
      'note.inserted': 'Inserted into the composer',
      'note.insertedAndRemoved': 'Inserted, and removed from the list',
      'note.insertFailed': 'The composer is not available; try again',
      'note.quoteMissing': 'This note cannot find its text right now (the reply may be folded or rewritten).',
      'note.kind.comment': 'Note',
      'note.kind.question': 'Question',
      'note.kind.agree': 'Agree',
      'note.kind.disagree': 'Disagree',
      'note.kind.idea': 'Idea',
      'note.kind.supplement': 'Additional info',
      'note.kind.todo': 'To do',
      'menu.last': 'Last used',
      'menu.count': '{n} item(s)',
      'menu.saved': 'Added to {group}',
      'status.storageFailed': 'Could not save: browser storage is unwritable (possibly full). Changes last only for this page.',
      'status.nothing': 'The composer is empty',
      'status.emptyBody': 'The content cannot be empty',
      'status.inserted': 'Inserted into the composer',
      'status.insertedAndRemoved': 'Inserted, and removed from the pool',
      'status.queued': 'Added to the send queue',
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
    function normalizeImages(raw, limit) {
      if (!Array.isArray(raw)) return [];
      const max = Number.isFinite(Number(limit)) ? Math.max(0, Number(limit)) : MAX_IMAGES;
      return raw
        .slice(0, max)
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

    /** Unique image descriptors across several notes, in first-seen order. */
    function imagesForNotes(list) {
      const images = new Map();
      for (const note of Array.isArray(list) ? list : []) {
        for (const image of normalizeImages(note && note.images)) images.set(image.id, image);
      }
      return [...images.values()];
    }

    /** Bytes for pooled images, as browser files the host can accept. */
    async function loadImageFiles(images, limit = Number.MAX_SAFE_INTEGER) {
      const files = [];
      for (const image of normalizeImages(images, limit)) {
        const blob = await getImageBlob(image.id);
        if (!blob) throw new Error(translate('image.missing'));
        files.push(new File([blob], image.name || 'image', { type: image.type || blob.type || 'image/png' }));
      }
      return files;
    }

    /**
     * The host's queue admission for one session, if this context can reach it.
     * Sending there keeps the composer untouched: it is the only way a batch
     * release avoids resizing the input once per item.
     */
    function resolveDirectQueue(sessionId) {
      if (!sessionId) return null;
      const candidates = [];
      const base = conversationFace || serviceOf(pluginCtx, 'conversation');
      if (base) candidates.push(base);
      const sessions = sessionsFace || serviceOf(pluginCtx, 'sessions');
      if (sessions && typeof sessions.scope === 'function') {
        try {
          const scoped = sessions.scope(sessionId);
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
    }

    /** Queue one occurrence without touching the composer. */
    async function sendDirect(direct, sessionId, body, images) {
      const files = images.length > 0 ? await loadImageFiles(images) : [];
      let drafts = [];
      if (files.length > 0) {
        drafts = direct.api.createDrafts(sessionId, files);
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
      // Annotation images and the review batches that quote them live outside
      // the pool store, so the sweep must see both.
      for (const note of notes.get().items) for (const image of note.images || []) keep.add(image.id);
      for (const batch of batches.get().items) for (const image of batch.images || []) keep.add(image.id);
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
        type: normalizePromptType(raw.type),
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
    function groupForTab(tab, workspaceGroup, picked) {
      if (tab === 'nested:workspace') return workspaceGroup || BUILTIN_GROUP.note;
      if (familyOf(tab)) return tab;
      // A folded family keeps its groups as chips under the strip, so the new
      // item follows the chip the user is looking at; with no chip picked it
      // lands in the family's first group rather than in a different family.
      const family = foldedFamilyOf(tab);
      if (family && familyOf(picked) === family) return picked;
      if (family) {
        const first = familyChips(family, pool.get().categories)[0];
        if (first) return first.id;
      }
      return BUILTIN_GROUP.note;
    }

    /**
     * Prompt bodies are reusable instructions, not documents: 500 full-width or
     * 1,000 half-width characters (1,000 cells) leaves room for a detailed brief
     * while stopping a pasted essay. Both editors share the same cell budget.
     */
    const PROMPT_BODY_MAX = 1000;

    /**
     * Prompt intents: the glyph names the kind of instruction, and the hue is
     * shared with the annotation kinds where the meanings overlap. A prompt has
     * at most one type; the type is optional.
     */
    const PROMPT_TYPES = [
      { id: 'decision', label: 'prompt.type.decision', icon: 'check', color: '#22c55e' },
      { id: 'question', label: 'prompt.type.question', icon: 'question', color: '#3b82f6' },
      { id: 'opinion', label: 'prompt.type.opinion', icon: 'pen', color: '#0891b2' },
      { id: 'idea', label: 'prompt.type.idea', icon: 'bulb', color: '#f97316' },
      { id: 'supplement', label: 'prompt.type.supplement', icon: 'info', color: '#8b5cf6' },
      { id: 'todo', label: 'prompt.type.todo', icon: 'todo', color: '#e0a800' },
      { id: 'inspiration', label: 'prompt.type.inspiration', icon: 'sparkle', color: '#ec4899' },
    ];
    const PROMPT_TYPE_IDS = PROMPT_TYPES.map((entry) => entry.id);

    function normalizePromptType(value) {
      return PROMPT_TYPE_IDS.indexOf(value) >= 0 ? value : '';
    }

    function promptTypeMeta(value) {
      const id = normalizePromptType(value);
      return PROMPT_TYPES.find((entry) => entry.id === id) || null;
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
    function tabHandlers(setTab, currentTab, fallback) {
      return {
        onSelect: (id) => setTab(id),
        onAdd: (name) => {
          const created = poolActions.addCategory(name);
          if (!created) return;
          // Folded groups share one tab; a hidden family has no tab to aim at.
          const mode = normalizeSettings(pool.get().settings).display.custom;
          setTab(mode === 'nested' ? 'nested:custom' : mode === 'hidden' ? (fallback || 'all') : 'custom:' + created.id);
        },
        onRename: (id, name) => {
          if (id.indexOf('custom:') === 0) poolActions.renameCategory(id.slice(7), name);
        },
        onDelete: (id) => {
          if (id.indexOf('custom:') !== 0) return;
          poolActions.removeCategory(id.slice(7));
          if (currentTab === id) setTab(fallback || 'all');
        },
      };
    }

    /** Every family's tab block, ordered by the leading-group preference. */
    function buildTabs(categories, workspaces, settings, currentWorkspaceId) {
      const flags = normalizeSettings(settings);
      const blocks = {
        builtin: displayBlock('builtin', familyChips('builtin'), settings),
        custom: displayBlock('custom', familyChips('custom', categories), settings),
      };
      const rest = flags.order;
      // 全部 anchors the row unless the user hid it; the chosen block leads the rest.
      const all = flags.showAllTab === false ? [] : [{ id: 'all', label: translate('tab.all'), group: 'all' }];
      return [
        ...all,
        ...rest.reduce((list, name) => list.concat(blocks[name] || []), []),
      ];
    }

    /**
     * The tab a freshly opened pool lands on. An unavailable preference (a
     * deleted group, a hidden workspace, a hidden "all" tab) falls back to the
     * first available group tab, then the annotations tab.
     */
    function fallbackTabFor(tabs) {
      const list = Array.isArray(tabs) ? tabs : [];
      // "All" is the catch-all whenever the user kept it.
      const all = list.find((tab) => tab && tab.id === 'all');
      if (all) return 'all';
      // The annotation tab is always mounted, but a group tab reads better as
      // the landing spot when "all" is hidden.
      const groupTab = list.find((tab) => tab && tab.id !== 'notes');
      return groupTab ? groupTab.id : (list[0] && list[0].id) || '';
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
          style: props.style,
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) props.onCancel();
          },
        },
        h(
          'div',
          {
            ref: cardRef,
            className: 'pp-modal-card' + (props.cardClassName ? ' ' + props.cardClassName : ''),
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': props.label,
          },
          props.text ? h('div', { className: 'pp-modal-text' }, props.text) : null,
          props.children || null,
          h(
            'div',
            { className: 'pp-modal-actions' },
            h('button', { type: 'button', className: props.confirmText ? 'pp-mini' : 'pp-primary', autoFocus: true, onClick: props.onCancel }, props.cancelText),
            props.discardText
              ? h('button', { type: 'button', className: 'pp-mini pp-modal-discard', onClick: props.onDiscard }, props.discardText)
              : null,
            props.confirmText
              ? h('button', { type: 'button', className: 'pp-primary', onClick: props.onConfirm }, props.confirmText)
              : null,
          ),
        ),
      );
    }

    /** Ask before a switch would drop an editor's unsaved work. */
    function UnsavedSwitchDialog(props) {
      return h(ConfirmModal, {
        label: translate('editor.unsavedTitle'),
        children: h(
          'div',
          { className: 'pp-modal-copy' },
          h('div', { className: 'pp-modal-title' }, translate('editor.unsavedTitle')),
          h('div', { className: 'pp-modal-text' }, translate('editor.unsavedText')),
        ),
        cancelText: translate('editor.unsavedStay'),
        discardText: translate('editor.unsavedDiscard'),
        confirmText: translate('editor.unsavedSave'),
        onCancel: props.onCancel,
        onDiscard: props.onDiscard,
        onConfirm: props.onSave,
      });
    }

    /** The annotation delete confirmation, on the same shared modal as prompt deletion. */
    function NoteDeleteConfirm(props) {
      const rect = props.rect;
      const style = rect
        ? {
            position: 'fixed',
            left: Math.round(rect.left) + 'px',
            top: Math.round(rect.top) + 'px',
            width: Math.round(rect.width) + 'px',
            height: Math.round(rect.height) + 'px',
            right: 'auto',
            bottom: 'auto',
          }
        : undefined;
      return h(ConfirmModal, {
        label: translate('note.deleteConfirm'),
        text: translate('note.deleteHint'),
        cancelText: translate('note.cancel'),
        confirmText: translate('note.delete'),
        onCancel: typeof props.onCancel === 'function' ? props.onCancel : closeNoteConfirm,
        onConfirm: typeof props.onConfirm === 'function' ? props.onConfirm : runNoteConfirm,
        style,
      });
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

    /** Two-column orientation card, opened from the header's question mark. */
    function HelpDialog(props) {
      const column = (iconName, title, why, body) => h(
        'section',
        { className: 'pp-help-col' },
        h('div', { className: 'pp-help-head' }, h('span', { className: 'pp-help-icon' }, icon(iconName)), title),
        h('p', { className: 'pp-help-why' }, why),
        h('p', { className: 'pp-help-body' }, body),
      );
      return h(
        ConfirmModal,
        {
          label: translate('help.title'),
          cancelText: translate('help.close'),
          cardClassName: 'pp-help-card',
          onCancel: props.onClose,
        },
        h(
          'div',
          { className: 'pp-help' },
          h('div', { className: 'pp-help-title' }, translate('help.title')),
          h('div', { className: 'pp-help-intro' }, translate('help.intro')),
          h(
            'div',
            { className: 'pp-help-grid' },
            column('annotation', translate('help.notesTitle'), translate('help.notesWhy'), translate('help.notesBody')),
            column('prompt', translate('help.promptsTitle'), translate('help.promptsWhy'), translate('help.promptsBody')),
          ),
        ),
      );
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
    function normalizeTraySource(raw) {
      if (!raw || typeof raw !== 'object') return null;
      const source = {
        noteId: typeof raw.noteId === 'string' ? raw.noteId : '',
        kind: typeof raw.kind === 'string' ? raw.kind : '',
        quote: typeof raw.quote === 'string' ? raw.quote : '',
        body: typeof raw.body === 'string' ? raw.body : '',
        order: Number.isFinite(Number(raw.order)) ? Number(raw.order) : 0,
      };
      return source.noteId || source.kind || source.quote ? source : null;
    }

    function normalizeTrayEntry(raw, byId) {
      if (typeof raw === 'string') {
        const item = byId.get(raw);
        return item ? { key: uid(), itemId: raw, body: item.body, images: normalizeImages(item.images), targetSessionId: '', type: 'prompt', source: null } : null;
      }
      if (!raw || typeof raw !== 'object') return null;
      const itemId = typeof raw.itemId === 'string' ? raw.itemId : '';
      const source = byId.get(itemId);
      const body = typeof raw.body === 'string' ? raw.body : source ? source.body : '';
      const images = normalizeImages(Array.isArray(raw.images) ? raw.images : source ? source.images : []);
      if (!body.trim() && images.length === 0) return null;
      return {
        key: typeof raw.key === 'string' && raw.key ? raw.key : uid(),
        itemId,
        body,
        images,
        targetSessionId: typeof raw.targetSessionId === 'string' ? raw.targetSessionId : '',
        type: raw.type === 'review' ? 'review' : raw.type === 'annotation' ? 'annotation' : 'prompt',
        source: normalizeTraySource(raw.source),
      };
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

    function needsSettingsMigration(raw) {
      const settings = raw && typeof raw === 'object' ? raw : null;
      if (!settings) return false;
      if ('defaultTab' in settings || 'currentWorkspaceTab' in settings || 'hiddenWorkspaces' in settings) return true;
      if (settings.display && typeof settings.display === 'object' && 'workspace' in settings.display) return true;
      return Array.isArray(settings.order) && settings.order.indexOf('workspace') >= 0;
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
        const next = normalizePool(parsed);
        if (needsSettingsMigration(parsed && parsed.settings)) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch (_error) {
            /* the in-memory cleaned settings still apply */
          }
        }
        return next;
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
     * What the opener asked the sidebar page for: a destination, a new draft,
     * or nothing but the page itself. A store rather than props because the
     * page is often already mounted when the trigger asks again; `seq` lets the
     * page act on one ask exactly once.
     */
    const pageIntent = (() => {
      const initial = { scope: '', create: false, seq: 0, draft: null };
      if (typeof window === 'undefined') return createStore(initial);
      if (!window.__dshPromptPoolPageIntentV1) window.__dshPromptPoolPageIntentV1 = createStore(initial);
      return window.__dshPromptPoolPageIntentV1;
    })();

    function usePageIntent() {
      return useSyncExternalStore(pageIntent.subscribe, pageIntent.get, pageIntent.get);
    }

    /** The ask the page already acted on; a remount must not replay it. */
    let pageIntentHandled = 0;

    /** Whether the page currently has a prompt editor open (a second ask waits). */
    let pageDraftOpen = false;

    /** The right sidebar, once it exists and our page is registered with it. */
    function rightSidebar() {
      const face = rightSidebarFace || serviceOf(pluginCtx, 'sidebarRight');
      return nativeTabReady && face && typeof face.openTab === 'function' ? face : null;
    }

    /**
     * Open the pool on the right sidebar. An empty scope leaves the page where
     * it was; otherwise the page switches to that destination. A draft gives the
     * add-prompt step its content (an annotation filed as a prompt arrives
     * written). Returns false on a host without a right sidebar so the caller
     * can fall back to the composer panel.
     */
    function openPageView(scope, create, draft) {
      const sidebar = rightSidebar();
      if (!sidebar) return false;
      const seq = (pageIntent.get().seq || 0) + 1;
      pageIntent.set({
        scope: scope || '',
        create: create === true,
        seq,
        draft: draft && typeof draft === 'object' ? draft : null,
      });
      try {
        sidebar.openTab(NATIVE_TAB_KIND, {});
        return true;
      } catch (_error) {
        /* a host that refuses the tab falls back to the composer panel */
        pageIntent.set({ scope: '', create: false, seq: seq + 1, draft: null });
        return false;
      }
    }

    /**
     * Live workspace directory: derived (never persisted) and published by
     * whichever view can read the workspace snapshot, so one tab appears per
     * workspace in both views.
     */
    const workspaceDir = createStore({ items: [] });
    /** The composer panel knows the active session; the sidebar page does not. */
    const sessionDir = createStore({ sessionId: '' });
    /** The composer knows how many submissions are still waiting; the page does not. */
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
      const leaders = ['builtin', 'custom'];
      const modes = ['tabs', 'nested', 'hidden'];
      const defaults = { builtin: 'tabs', custom: 'tabs' };
      const stored = settings.display && typeof settings.display === 'object' ? settings.display : {};
      const display = {};
      for (const family of leaders) {
        const value = stored[family];
        // Legacy: the old customNested flag folded custom groups.
        const legacy = family === 'custom' && settings.customNested === true ? 'nested' : undefined;
        display[family] = modes.indexOf(value) >= 0 ? value : legacy || defaults[family];
      }
      return {
        // The "all" tab is the catch-all view; hiding it leaves the group tabs.
        showAllTab: settings.showAllTab !== false,
        // A queued batch starts as one quiet strip; expanding it is a choice.
        queueCollapsed: settings.queueCollapsed !== false,
        // The group the right-click menu offered last, so it can lead the list.
        lastCaptureGroup: typeof settings.lastCaptureGroup === 'string' ? settings.lastCaptureGroup : '',
        // Annotations: where their markers draw, not what they hold.
        notesHighlight: settings.notesHighlight !== false,
        // Annotations survive Store unless the user opts out.
        noteKeepAfterStore: settings.noteKeepAfterStore !== false,
        // Same question for the two other ways a mark is used up: inserting it
        // into the composer, and sending the summarised batch. Insertion keeps
        // them by default; a sent summary has always taken its marks with it,
        // so keeping those is the opt-in.
        noteKeepAfterInsert: settings.noteKeepAfterInsert !== false,
        noteKeepAfterReview: settings.noteKeepAfterReview === true,
        // The kind the block picker stamps on a new annotation; the picker bar
        // lets the user change it, and the choice carries over next time.
        pickKind: typeof settings.pickKind === 'string' ? settings.pickKind : 'comment',
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
        // 0 keeps the review card's default height; else a dragged px height.
        reviewHeight: (() => {
          const value = Number(settings.reviewHeight);
          return Number.isFinite(value) && value > 0 ? Math.min(Math.round(value), 900) : 0;
        })(),
        // 0 keeps the Outbox card's default height; else a dragged px height.
        trayHeight: (() => {
          const value = Number(settings.trayHeight);
          return Number.isFinite(value) && value > 0 ? Math.min(Math.round(value), 900) : 0;
        })(),
        // A pinned panel ignores outside clicks and stays over the conversation.
        panelPinned: settings.panelPinned === true,
        orderExplicit: settings.orderExplicit === true,
        order: (() => {
          const storedOrder = Array.isArray(settings.order) ? settings.order.filter((name) => leaders.indexOf(name) >= 0) : [];
          return [...storedOrder, ...leaders.filter((name) => storedOrder.indexOf(name) < 0)];
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

    /**
     * A new row exists in the store as soon as its editor opens, so it can be
     * patched on save. Tab counts must ignore it until that save happens.
     */
    function countPoolItems(items, editing) {
      const list = Array.isArray(items) ? items : [];
      if (!editing || editing.isNew !== true) return list;
      return list.filter((item) => item.id !== editing.id);
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
      if (currentWorkspaceId) {
        const current = (workspaces || []).find((workspace) => workspace.workspaceId === currentWorkspaceId);
        list.push({
          value: 'workspace:' + currentWorkspaceId,
          label: current ? current.name : translate('scope.workspace'),
        });
      }
      // A pool with every family hidden still needs one destination.
      if (list.length === 0) list.push({ value: BUILTIN_GROUP.note, label: translate('group.note') });
      return list;
    }

    /** The family a folded tab stands for; '' for every other tab id. */
    function foldedFamilyOf(tab) {
      const value = String(tab || '');
      return value.indexOf('nested:') === 0 ? value.slice(7) : '';
    }

    /** One family's groups, as tabs when expanded and as chips when folded. */
    function familyChips(family, categories) {
      if (family === 'builtin') {
        return [
          { id: BUILTIN_GROUP.oftenuse, label: translate('tab.oftenuse'), group: 'builtin' },
          { id: BUILTIN_GROUP.note, label: translate('tab.note'), group: 'builtin' },
          { id: BUILTIN_GROUP.template, label: translate('tab.template'), group: 'builtin' },
        ];
      }
      if (family === 'custom') {
        return (categories || []).map((category) => ({
          id: 'custom:' + category.id,
          label: category.name,
          category: true,
          group: 'custom',
        }));
      }
      return [];
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

    /**
     * A host can deliver the same click twice (for example, a synthesized click
     * after the pointer gesture). Queueing the same prompt twice within one
     * gesture adds only the first occurrence; a deliberate second click later is
     * still allowed.
     */
    const queueClickGuard = { id: '', at: 0 };
    function queueClickAllowed(itemId) {
      const now = Date.now();
      if (queueClickGuard.id === itemId && now - queueClickGuard.at < 450) return false;
      queueClickGuard.id = itemId;
      queueClickGuard.at = now;
      return true;
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
      addToTray(itemId, sessionId) {
        mutate((state) => {
          const item = state.items.find((candidate) => candidate.id === itemId);
          if (!item) return null;
          return {
            ...state,
            tray: [...state.tray, {
              key: uid(),
              itemId,
              body: item.body,
              images: normalizeImages(item.images),
              targetSessionId: typeof sessionId === 'string' ? sessionId : '',
              type: 'prompt',
            }],
          };
        });
      },
      /** Add a pre-composed message, such as a review batch, to the outbox. */
      addTextToTray(entry) {
        const body = entry && typeof entry.body === 'string' ? entry.body : '';
        const images = normalizeImages(entry && entry.images);
        if (!body.trim() && images.length === 0) return null;
        const row = {
          key: uid(),
          itemId: '',
          body,
          images,
          targetSessionId: typeof entry.targetSessionId === 'string' ? entry.targetSessionId : '',
          type: entry.type === 'review' ? 'review' : entry.type === 'annotation' ? 'annotation' : 'prompt',
          source: normalizeTraySource(entry.source),
        };
        mutate((state) => ({ ...state, tray: [...state.tray, row] }));
        return row;
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

    /** True when the prompt editor holds work the store does not have yet. */
    function poolEditChanged(editing) {
      if (!editing) return false;
      const stored = pool.get().items.find((item) => item.id === editing.id);
      const imagesOf = (value) => normalizeImages(value).map((entry) => entry.id).join('|');
      if (!stored) {
        return Boolean(
          String(editing.title || '').trim()
          || String(editing.body || '').trim()
          || normalizePromptType(editing.type)
          || imagesOf(editing.images),
        );
      }
      return editing.title !== stored.title
        || editing.body !== stored.body
        || normalizePromptType(editing.type) !== normalizePromptType(stored.type)
        || groupOf(editing) !== groupOf(stored)
        || imagesOf(editing.images) !== imagesOf(stored.images);
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
        type: normalizePromptType(item.type),
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
          type: normalizePromptType(editing.type),
          images: editing.images || [],
        });
        // A draft opened from an annotation carries that annotation along: on
        // save it is either marked as filed or retired, by the same rule the
        // composer's save sheet uses. A cancelled draft leaves it untouched.
        const source = editing.source && typeof editing.source === 'object' ? editing.source : null;
        const noteIds = source && Array.isArray(source.noteIds) ? source.noteIds.filter((id) => typeof id === 'string' && id) : [];
        if (noteIds.length > 0) {
          const keep = normalizeSettings(pool.get().settings).noteKeepAfterStore !== false;
          if (!keep) notesActions.removeMany(noteIds);
          else if (source.markStored === true) {
            for (const id of noteIds) notesActions.patch(id, { promotedGroup: editing.group, promotedAt: Date.now() });
          }
        }
        // A review that handed its text over still has its own bookkeeping.
        if (source && typeof source.onSaved === 'function') {
          try {
            source.onSaved();
          } catch (_error) {
            /* A cleanup failure must not undo the saved prompt. */
          }
        }
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

    /**
     * The kind chips shared by the annotation and prompt editors. One control,
     * one geometry: the icon carries the kind hue, the capsule stays neutral
     * until picked.
     */
    function editorKinds(props) {
      const entries = Array.isArray(props.entries) ? props.entries : [];
      const value = props.value || '';
      return h(
        'div',
        { className: 'pp-type-picks', role: 'group', 'aria-label': props.label || translate('row.type') },
        entries.map((entry) => {
          const active = value === entry.id;
          const canClear = active && props.clearable === true;
          return h(
            'button',
            {
              key: entry.id,
              type: 'button',
              className: 'pp-type-pick',
              'data-kind': entry.id,
              'data-active': active ? 'true' : 'false',
              style: { '--pp-kind': entry.color },
              title: canClear ? translate('row.typeClear') : translate(entry.label),
              'aria-label': canClear
                ? translate(entry.label) + ' · ' + translate('row.typeClear')
                : translate(entry.label),
              'aria-pressed': active ? 'true' : 'false',
              onClick: () => props.onPick(entry.id, active),
            },
            h('span', { className: 'pp-type-pick-icon', 'aria-hidden': true }, icon(entry.icon)),
            translate(entry.label),
            canClear
              ? h('span', { className: 'pp-type-pick-x', 'aria-hidden': true }, icon('close'))
              : null,
          );
        }),
      );
    }

    /** One pool row (or its editor), shared by the panel and the page. */
    function renderPoolRow(props) {
      const {
        item, index, total, editing, setEditing, categories, workspaces, sessionId,
        editStyle, mainTitle, showTag, onInsert, onMain, onStartEdit,
        onQueue, onDelete, onSave, onCancel, onPasteImages, onOpenImage, onError,
      } = props;

      if (editing && editing.id === item.id) {
        const editType = promptTypeMeta(editing.type);
        const editTypeId = normalizePromptType(editing.type);
        const editImages = Array.isArray(editing.images) ? editing.images : [];
        return h(
          'div',
          {
            key: item.id,
            className: 'pp-edit',
            'data-domain': 'prompts',
            ...(editStyle ? { style: editStyle } : {}),
          },
          h(
            'div',
            { className: 'pp-edit-title' },
            h(TypeMark, {
              name: editType ? editType.icon : 'prompt',
              title: editType ? translate(editType.label) : translate('row.type'),
              tone: editType ? editType.color : undefined,
            }),
            h('input', {
              className: 'pp-input pp-edit-title-input',
              value: editing.title,
              placeholder: translate('row.titlePlaceholder'),
              onChange: (event) => setEditing({ ...editing, title: event.target.value }),
            }),
          ),
          editorKinds({
            entries: PROMPT_TYPES,
            value: editTypeId,
            label: translate('row.type'),
            onPick: (id, active) => setEditing((current) => (current
              ? { ...current, type: active ? '' : id }
              : current)),
            clearable: true,
          }),
          h(
            'div',
            {
              className: 'pp-edit-body',
              'data-has-images': editImages.length > 0 ? 'true' : undefined,
            },
            editImages.length > 0
              ? h(
                  'div',
                  { className: 'pp-edit-attachments' },
                  h(ImageStrip, {
                    images: editImages,
                    onRemove: (image) => setEditing((current) => (current
                      ? { ...current, images: (current.images || []).filter((entry) => entry.id !== image.id) }
                      : current)),
                    onOpen: onOpenImage,
                  }),
                )
              : null,
            h(MentionField, {
              value: editing.body,
              placeholder: translate('row.bodyPlaceholder'),
              rows: 4,
              autoFocus: true,
              sessionId,
              onChange: (event) => {
                const value = String(event.target.value || '');
                setEditing({ ...editing, body: mergeBodyInput(editing.body, value, PROMPT_BODY_MAX) });
              },
              onPasteImages,
              onKeyDown: (event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault();
                  onSave();
                }
              },
            }),
            h(
              'div',
              { className: 'pp-edit-tools' },
              h(ImagePicker, {
                images: editing.images || [],
                compact: true,
                onChange: (images) => setEditing((current) => (current ? { ...current, images } : current)),
                onError,
                onOpen: onOpenImage,
              }),
            ),
          ),
          h(
            'div',
            { className: 'pp-edit-meta' },
            h('span', { className: 'pp-edit-hint' }, translate('row.lengthHint')),
            h(
              'span',
              {
                className: 'pp-edit-count',
                'data-near': bodyWidth(editing.body) >= PROMPT_BODY_MAX * 0.9 && bodyWidth(editing.body) < PROMPT_BODY_MAX ? 'true' : undefined,
                'data-full': bodyWidth(editing.body) >= PROMPT_BODY_MAX ? 'true' : undefined,
              },
              `${bodyWidth(editing.body)} / ${PROMPT_BODY_MAX}`,
            ),
          ),
          h(
            'div',
            { className: 'pp-edit-actions' },
            h(
              'select',
              {
                className: 'pp-input pp-edit-select',
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

      const typeMeta = promptTypeMeta(item.type);
      return h(
        'div',
        { key: item.id, className: 'pp-row pp-page-item' },
        h(
          'div',
          { className: 'pp-main', ...(mainTitle ? { title: mainTitle } : {}), onClick: () => (onMain || onStartEdit)(item) },
          h(
            'div',
            { className: 'pp-title' },
            typeMeta
              ? h(TypeMark, { name: typeMeta.icon, title: translate(typeMeta.label), tone: typeMeta.color })
              : null,
            h('span', { className: 'pp-title-text' }, item.title || translate('group.untitled')),
          ),
          item.body.trim() === (item.title || '').trim() ? null : h('div', { className: 'pp-body' }, item.body),
          h(ImageStrip, { images: item.images, compact: true, onOpen: onOpenImage }),
        ),
        // A list that mixes groups (the All tab, or a folded family) says which
        // group each row came from; a single group's list does not need it.
        showTag ? h('span', { className: 'pp-tag' }, clipLabel(groupLabelOf(item, categories, workspaces))) : null,
        h(
          'div',
          { className: 'pp-row-actions' },
          h(RowActionIcon, { name: 'insert', label: translate('row.insert'), onClick: () => onInsert(item) }),
          h(RowActionIcon, { name: 'plus', label: translate('row.select'), onClick: () => onQueue(item) }),
          h(RowActionIcon, { name: 'copy', label: translate('row.duplicate'), onClick: () => poolActions.duplicateItem(item.id) }),
          h(RowActionIcon, { name: 'trash', label: translate('row.delete'), danger: true, onClick: () => onDelete(item) }),
        ),
      );
    }

    /** Human label for an outbox entry's source. */
    function traySourceLabel(type) {
      if (type === 'review') return translate('tray.source.review');
      if (type === 'annotation') return translate('tray.source.annotation');
      return translate('tray.source.prompt');
    }

    function traySourceIcon(type) {
      if (type === 'review') return 'review';
      if (type === 'annotation') return 'annotation';
      return 'prompt';
    }

    /** Merge every queued entry into one editable message. */
    function MergeReviewCard(props) {
      const entries = Array.isArray(props.entries) ? props.entries : [];
      const height = Number(props.height) || 0;
      const [draft, setDraft] = useState(null);
      const images = normalizeImages(
        entries.reduce((list, entry) => list.concat(entry.images || []), []),
        Number.MAX_SAFE_INTEGER,
      );
      const generated = entries.map((entry, index) => `${index + 1}. ${entry.body}`).join('\n\n');
      const text = draft == null ? generated : draft;
      return h(
        'div',
        {
          className: 'pp-page-foot pp-review-foot pp-merge-foot',
          style: height ? { height: Math.round(height) + 'px', maxHeight: 'calc(100vh - 160px)' } : undefined,
        },
        h(
          'div',
          { className: 'pp-notes pp-notes-embedded pp-review' },
          h('style', { key: 'css' }, NOTES_CSS),
          h(
            'div',
            { className: 'pp-review-top' },
            h(
              'div',
              { className: 'pp-review-head' },
              h('span', { className: 'pp-review-mark', 'aria-hidden': true }, icon('edit')),
              h(
                'div',
                { className: 'pp-review-title' },
                h(
                  'div',
                  { className: 'pp-review-headline' },
                  h('strong', null, translate('merge.title')),
                  h('span', { className: 'pp-review-chip' }, translate('merge.chosen', { n: entries.length })),
                ),
                h('span', { className: 'pp-review-batch' }, translate('merge.subtitle')),
              ),
              h('span', { className: 'pp-notes-grow' }),
              h('button', {
                type: 'button',
                className: 'pp-review-close',
                title: translate('note.cancel'),
                onClick: props.onClose,
              }, icon('close')),
            ),
          ),
          h(
            'div',
            { className: 'pp-review-pane', 'data-active': 'true' },
            entries.length === 0
              ? h('div', { className: 'pp-notes-empty' }, translate('merge.empty'))
              : h(
                  'div',
                  { className: 'pp-review-preview-wrap' },
                  h('div', { className: 'pp-review-preview-hint' }, translate('merge.previewHint')),
                  images.length > 0
                    ? h(
                        'div',
                        { className: 'pp-merge-attachments' },
                        h('div', { className: 'pp-merge-attachments-label' }, translate('merge.attachments', { n: images.length })),
                        h(ImageStrip, { images, compact: true, max: 8, onOpen: props.onOpenImage }),
                      )
                    : null,
                  h('textarea', {
                    className: 'pp-review-text',
                    'aria-label': translate('merge.preview'),
                    value: text,
                    spellCheck: false,
                    onChange: (event) => setDraft(event.target.value),
                  }),
                ),
          ),
          h(
            'div',
            { className: 'pp-review-actions' },
            h('button', {
              type: 'button',
              className: 'pp-note-btn pp-review-cancel',
              onClick: props.onClose,
            }, translate('note.cancel')),
            h('button', {
              type: 'button',
              className: 'pp-note-btn pp-note-btn-primary',
              disabled: props.busy || entries.length === 0 || text.trim() === '',
              onClick: () => props.onConfirm(text),
            }, props.busy ? translate('merge.sending') : translate('merge.confirm')),
          ),
        ),
      );
    }

    /** The send-queue card, shared by the panel and the page. */
    function renderTrayCard(props) {
      const {
        entries, collapsed, busy, sessionId, trayRef,
        height, cardRef, onResizeStart, onResizeBy, onResizeReset,
        editing, setEditing, onSaveEdit, onPasteImages, onClear, onRelease,
        onDigest, mode, onModeChange, onRemove, onOpenImage, onError,
      } = props;

      if (!entries || entries.length === 0) return null;

      if (collapsed) {
        return h(
          'div',
          { className: 'pp-queue-strip' },
          h(
            'button',
            {
              type: 'button',
              className: 'pp-queue-open',
              title: translate('tray.expandTitle'),
              'aria-label': translate('tray.expandTitle'),
              'aria-expanded': 'false',
              onClick: () => poolActions.setSetting('queueCollapsed', false),
            },
            h('span', { className: 'pp-queue-strip-action' }, icon('chevronUp')),
            h('span', { className: 'pp-queue-strip-title' }, translate('tray.title')),
            h('span', { className: 'pp-hint' }, translate('tray.selected', { n: entries.length })),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'pp-primary pp-queue-send',
              disabled: busy === true,
              onClick: onRelease,
            },
            translate('tray.release'),
          ),
        );
      }

      const canMerge = entries.length > 1 && typeof onDigest === 'function';
      const mergeMode = canMerge && mode === 'merge';
      return h(
        'div',
        {
          className: 'pp-page-foot pp-tray-foot',
          'data-resized': height > 0 ? 'true' : 'false',
          ref: cardRef,
          style: height ? { height: Math.round(height) + 'px', maxHeight: 'calc(100vh - 160px)' } : undefined,
        },
        h(
          'div',
          {
            className: 'pp-tray-grip',
            role: 'separator',
            tabIndex: 0,
            'aria-orientation': 'horizontal',
            'aria-label': translate('tray.resize'),
            'aria-valuemin': TRAY_MIN_HEIGHT,
            'aria-valuemax': TRAY_MAX_HEIGHT,
            'aria-valuenow': height || 0,
            title: translate('tray.resize'),
            onPointerDown: onResizeStart,
            onDoubleClick: onResizeReset,
            onKeyDown: (event) => {
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                onResizeBy(20);
              } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                onResizeBy(-20);
              }
            },
          },
          h('span', { className: 'pp-grip-bar' }),
        ),
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
          h('span', { className: 'pp-foot-title', title: translate('tray.titleHint') }, translate('tray.title')),
          h('span', { className: 'pp-hint' }, translate('tray.selected', { n: entries.length })),
          h('span', { className: 'pp-grow' }),
          entries.length > 0
            ? h('button', {
                type: 'button',
                className: 'pp-icon-btn',
                title: translate('tray.clearTitle'),
                'aria-label': translate('tray.clearTitle'),
                onClick: onClear,
              }, icon('trash'))
            : null,
          canMerge
            ? h(
                'div',
                { className: 'pp-mode', role: 'group', 'aria-label': translate('tray.mode') },
                h('button', {
                  type: 'button',
                  'data-active': mergeMode ? 'false' : 'true',
                  'aria-pressed': mergeMode ? 'false' : 'true',
                  onClick: () => { if (onModeChange) onModeChange('single'); },
                }, translate('tray.mode.single')),
                h('button', {
                  type: 'button',
                  'data-active': mergeMode ? 'true' : 'false',
                  'aria-pressed': mergeMode ? 'true' : 'false',
                  onClick: () => { if (onModeChange) onModeChange('merge'); },
                }, translate('tray.mode.merge')),
              )
            : null,
          entries.length > 0
            ? h('button', {
                type: 'button',
                className: 'pp-primary',
                disabled: busy,
                onClick: mergeMode ? onDigest : onRelease,
              }, mergeMode ? translate('tray.digest') : translate('tray.release'))
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
                h('span', {
                  className: 'pp-chip-source',
                  'data-type': entry.type || 'prompt',
                },
                h('span', { className: 'pp-chip-source-icon', 'aria-hidden': true }, icon(traySourceIcon(entry.type))),
                traySourceLabel(entry.type)),
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
    // One geometry for every glyph: a 24px artboard, a 1.8px stroke and round
    // joins. Context chooses the rendered size in CSS (12/14/16/20), never an
    // individual shape; color is always currentColor.
    function icon(name) {
      const base = {
        width: 16,
        height: 16,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
      };
      switch (name) {
        case 'up':
          return h('svg', base, h('path', { d: 'M12 19V5M6.5 10.5 12 5l5.5 5.5' }));
        case 'down':
          return h('svg', base, h('path', { d: 'M12 5v14M6.5 13.5 12 19l5.5-5.5' }));
        case 'edit':
        case 'pen':
          return h('svg', base,
            h('path', { d: 'M4 20l4.4-.9L20 7.5a2.2 2.2 0 0 0-3.1-3.1L5.3 16 4 20z' }),
            h('path', { d: 'M14.8 6.5l2.7 2.7' }));
        case 'trash':
          return h('svg', base,
            h('path', { d: 'M4.5 7h15M9.5 7V4.8h5V7' }),
            h('path', { d: 'M6.8 7l.9 12.2h8.6L17.2 7M10 10.5v5.5M14 10.5v5.5' }));
        case 'copy':
          return h('svg', base,
            h('rect', { x: 9, y: 9, width: 10.5, height: 10.5, rx: 2.2 }),
            h('path', { d: 'M6.5 15H5.2A2.2 2.2 0 0 1 3 12.8V5.2A2.2 2.2 0 0 1 5.2 3h7.6A2.2 2.2 0 0 1 15 5.2v1.3' }));
        case 'insert':
          return h('svg', base,
            h('path', { d: 'M12 4v11M7 10l5 5 5-5M5 20h14' }));
        case 'close':
        case 'x':
          return h('svg', base, h('path', { d: 'M6 6l12 12M18 6 6 18' }));
        case 'check':
          return h('svg', base, h('path', { d: 'M4.5 12.5l4.8 4.8L19.5 7' }));
        case 'chevronDown':
          return h('svg', base, h('path', { d: 'M6 9l6 6 6-6' }));
        case 'chevronUp':
          return h('svg', base, h('path', { d: 'M6 15l6-6 6 6' }));
        case 'image':
          return h('svg', base,
            h('rect', { x: 3, y: 4, width: 18, height: 16, rx: 3 }),
            h('circle', { cx: 8.5, cy: 9, r: 1.5 }),
            h('path', { d: 'M4.5 17l4.5-4.5 3.5 3.5 2.5-2.5 4.5 4.5' }));
        case 'gear':
          // A real cog: one closed outline with eight teeth and a round hub. The
          // two sliders it replaced read as a mixer, not settings.
          return h('svg', base,
            h('path', { d: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z' }),
            h('circle', { cx: 12, cy: 12, r: 3.1 }));
        case 'store':
          // Storing an annotation as a prompt: the chevron is the mark the
          // Prompts tab already wears, and the plus says a new prompt is
          // being started. The sheet-with-a-fold it replaced read as "new
          // document" and its little plus collapsed at 16px.
          return h('svg', base,
            h('path', { d: 'M4.4 6.6 9.9 12 4.4 17.4' }),
            h('path', { d: 'M17 9.2v5.6M14.2 12h5.6' }));
        case 'capture':
          // Filing a draft: an arrow dropping into an open tray. A bookmark
          // outline read as a navigation pin next to the help and settings
          // glyphs, and it said nothing about where the text goes.
          return h('svg', base,
            h('path', { d: 'M4 14.4h4.1l1.2 2.1h5.4l1.2-2.1H20' }),
            h('path', { d: 'M4 14.4v4.1A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-4.1' }),
            h('path', { d: 'M12 4.2v8.2M8.8 9.4 12 12.6l3.2-3.2' }));
        case 'pick':
          // Continuous annotation: a pointer landing on a line of the reply.
          // The corner-plus shape the picker turns the cursor into collapses
          // into a single blob at the 15px a menu row draws, so it keeps the
          // arrow and borrows only the line under it.
          return h('svg', base,
            h('path', { d: 'M6.9 4 18.4 9.8l-4.7 1.3-1.6 4.7z' }),
            h('path', { d: 'M4.2 19h15.6' }));
        case 'funnel':
          // Summarize: many marks go in, one instruction comes out.
          return h('svg', base, h('path', { d: 'M3.8 5h16.4l-6.2 7.4v5.9l-4 2.3v-8.2z' }));
        case 'plusBox':
          // Add a prompt: a new entry in the pool, not another chevron — the
          // chevron alone already means the Prompts destination one row down.
          return h('svg', base,
            h('path', { d: 'M5.2 4.6h13.6a1.6 1.6 0 0 1 1.6 1.6v11.6a1.6 1.6 0 0 1-1.6 1.6H5.2a1.6 1.6 0 0 1-1.6-1.6V6.2a1.6 1.6 0 0 1 1.6-1.6z' }),
            h('path', { d: 'M12 8.6v6.8M8.6 12h6.8' }));
        case 'review':
          return h('svg', base,
            h('path', { d: 'M4 7h7M4 12h7M4 17h7' }),
            h('path', { d: 'M15 6.5l1.5 1.5L20 4.5M15 16.5l1.5 1.5L20 14.5' }));
        case 'queue':
          return h('svg', base,
            h('path', { d: 'M4 6h9M4 12h9M4 18h6' }),
            h('path', { d: 'M17 13v7M13.5 16.5h7' }));
        case 'locate':
          // A map pin: the annotation is tied to a spot in the transcript, and
          // this is the shape everyone already reads as "that place". The
          // viewfinder corners it replaced said screenshot or full screen.
          // The centre is filled rather than hollow — a hole this small closes
          // up at the 16px the row actions render at.
          return h('svg', base,
            h('path', { d: 'M19.8 10.2c0 6.2-7.8 11.4-7.8 11.4s-7.8-5.2-7.8-11.4a7.8 7.8 0 0 1 15.6 0z' }),
            h('circle', { cx: 12, cy: 10.2, r: 2.5, fill: 'currentColor', stroke: 'none' }));
        case 'annotation':
          return h('svg', base,
            h('rect', { x: 3.5, y: 4.5, width: 17, height: 11.5, rx: 2 }),
            h('path', { d: 'M8.5 16l-4.5 3.5V16' }),
            h('path', { d: 'M7.5 9h9M7.5 12h5.5' }));
        case 'prompt':
          return h('svg', base,
            h('path', { d: 'M4 6l6 6-6 6M13 18h7' }));
        case 'layers':
          return h('svg', base,
            h('path', { d: 'M12 3l9 5-9 5-9-5 9-5z' }),
            h('path', { d: 'M3 13l9 5 9-5' }));
        case 'plus':
          return h('svg', base, h('path', { d: 'M12 5v14M5 12h14' }));
        case 'more':
          return h(
            'svg',
            { ...base, fill: 'currentColor', stroke: 'none' },
            h('circle', { cx: 5.5, cy: 12, r: 1.6 }),
            h('circle', { cx: 12, cy: 12, r: 1.6 }),
            h('circle', { cx: 18.5, cy: 12, r: 1.6 }),
          );
        case 'back':
          return h('svg', base, h('path', { d: 'M19 12H5M11 6l-6 6 6 6' }));
        case 'help':
          return h('svg', base,
            h('circle', { cx: 12, cy: 12, r: 9 }),
            h('path', { d: 'M9.3 9.2a2.7 2.7 0 0 1 5.3.8c0 1.8-2.6 2-2.6 4' }),
            h('path', { d: 'M12 17.5h.01' }));
        case 'question':
          return h('svg', base,
            h('path', { d: 'M8.6 8.4a3.6 3.6 0 0 1 7 .9c0 2.6-3.4 2.9-3.4 5.7' }),
            h('path', { d: 'M12.2 18.2h.01' }));
        case 'bulb':
          return h('svg', base,
            h('path', { d: 'M9 18h6M10 21h4' }),
            h('path', { d: 'M9.2 15.4a6 6 0 1 1 5.6 0c-.9.6-1.3 1.4-1.3 2.6h-3c0-1.2-.4-2-1.3-2.6z' }));
        case 'info':
          return h('svg', base,
            h('circle', { cx: 12, cy: 12, r: 8.5 }),
            h('path', { d: 'M12 11v6M12 7.5h.01' }));
        case 'todo':
          return h('svg', base,
            h('rect', { x: 4, y: 4, width: 16, height: 16, rx: 3 }),
            h('path', { d: 'M8 12.2l3 3 5.5-6' }));
        case 'sparkle':
          return h('svg', base,
            h('path', { d: 'M12 3.5l1.7 4.8L18.5 10l-4.8 1.7L12 16.5l-1.7-4.8L5.5 10l4.8-1.7L12 3.5z' }));
        case 'pool':
          return h('svg', base,
            h('path', { d: 'M4 6h16M4 12h16M4 18h8' }),
            h('path', { d: 'M17.5 15v6M14.5 18h6' }));
        case 'pin':
          return h('svg', base,
            h('path', { d: 'M12 21c3.6-4.4 6-7.2 6-10.2a6 6 0 1 0-12 0C6 13.8 8.4 16.6 12 21z' }),
            h('circle', { cx: 12, cy: 10.8, r: 2.2 }));
        case 'pinActive':
          return h(
            'svg',
            base,
            h('path', {
              d: 'M12 21c3.6-4.4 6-7.2 6-10.2a6 6 0 1 0-12 0C6 13.8 8.4 16.6 12 21zM12 8.6a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4z',
              fill: 'currentColor',
              fillRule: 'evenodd',
              stroke: 'none',
            }),
          );
        default:
          return null;
      }
    }

    // The inline annotation chip lives outside React, so it needs the same
    // geometry as an SVG string. Only static icon markup is ever passed here.
    function iconMarkup(name) {
      const attr = (key) => key === 'viewBox' ? key : key.replace(/[A-Z]/g, (ch) => '-' + ch.toLowerCase());
      const walk = (node) => {
        if (node === null || node === undefined) return '';
        if (typeof node === 'string') return node;
        const props = node.props || {};
        const attrs = Object.keys(props)
          .filter((key) => key !== 'children' && props[key] !== null && props[key] !== undefined && typeof props[key] !== 'function')
          .map((key) => `${attr(key)}="${String(props[key])}"`)
          .join(' ');
        const children = props.children === null || props.children === undefined ? [] : [].concat(props.children);
        return `<${node.type}${attrs ? ' ' + attrs : ''}>${children.map(walk).join('')}</${node.type}>`;
      };
      return walk(icon(name));
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

    /**
     * A row of a tray menu. Each row carries its own mark: the menus used to
     * repeat one glyph per menu, which said nothing the label did not already
     * say, and then had none at all. A row's mark is what the action does, the
     * way a row action's is.
     *
     * Called as a plain function, not as `h(MenuItem, …)`: the row has no state
     * of its own, and building the button inline keeps the rendered tree honest
     * for the tests that read it.
     */
    function MenuItem(options) {
      return h(
        'button',
        {
          key: options.id,
          type: 'button',
          role: 'menuitem',
          className: 'pp-trigger-menu-item',
          title: options.title,
          disabled: options.disabled === true,
          onClick: options.onClick,
        },
        h('span', { className: 'pp-trigger-menu-mark', 'aria-hidden': true }, icon(options.icon)),
        h('span', { className: 'pp-trigger-menu-label' }, options.label),
        options.trailing === undefined ? null : options.trailing,
      );
    }

    // ----------------------------------------------------------------- button
    function PromptPoolButton(props) {
      useLocaleTick();
      const view = useUiState();
      const release = useReleaseState();
      const pool = usePoolState();
      const notesState = useNotesState();
      const sessionId = (props && props.sessionId) || useSessionDir().sessionId || '';
      const notes = notesState.items.filter((note) => note.sessionId === sessionId);
      const [summaryOpen, setSummaryOpen] = useState(false);
      const [domainMenu, setDomainMenu] = useState(null);
      const [keepNotes, setKeepNotes] = useState(true);
      const [allowImmediate, setAllowImmediate] = useState(false);
      const [summaryBusy, setSummaryBusy] = useState(false);
      const [summaryError, setSummaryError] = useState('');
      const [captureOpen, setCaptureOpen] = useState(false);
      const [captureGroups, setCaptureGroups] = useState([]);
      const [captureBusy, setCaptureBusy] = useState(false);
      const [notice, setNotice] = useState(null);
      const barRef = useRef(null);
      const noticeTimer = useRef(0);
      const label = translate('button.label');
      // The cap reads as the pool's name; its tooltip says what opening it gives you.

      useEffect(() => () => {
        if (noticeTimer.current) clearTimeout(noticeTimer.current);
      }, []);

      useEffect(() => {
        if (!captureOpen && !summaryOpen && !domainMenu) return undefined;
        const onDown = (event) => {
          if (barRef.current && barRef.current.contains(event.target)) return;
          setCaptureOpen(false);
          setSummaryOpen(false);
          setDomainMenu(null);
        };
        const onKey = (event) => {
          if (event.key !== 'Escape') return;
          setCaptureOpen(false);
          setSummaryOpen(false);
          setDomainMenu(null);
        };
        document.addEventListener('pointerdown', onDown, true);
        window.addEventListener('keydown', onKey, true);
        window.addEventListener('resize', onDown);
        window.addEventListener('scroll', onDown, true);
        return () => {
          document.removeEventListener('pointerdown', onDown, true);
          window.removeEventListener('keydown', onKey, true);
          window.removeEventListener('resize', onDown);
          window.removeEventListener('scroll', onDown, true);
        };
      }, [captureOpen, summaryOpen, domainMenu]);

      const showNotice = (kind, text) => {
        setNotice({ kind, text });
        if (noticeTimer.current) clearTimeout(noticeTimer.current);
        noticeTimer.current = typeof setTimeout === 'function'
          ? setTimeout(() => setNotice(null), kind === 'error' ? 5000 : 2400)
          : 0;
      };

      const openDomain = (which) => {
        if (release.active) return;
        if (domainMenu === which) {
          setDomainMenu(null);
          return;
        }
        setCaptureOpen(false);
        setSummaryOpen(false);
        setNotice(null);
        setDomainMenu(which);
      };

      /**
       * The trigger and the composer menus share one entry: the right sidebar
       * page when the host has one, the composer panel otherwise. The panel is
       * the fallback surface, not a destination of its own.
       */
      const openPoolView = (scopeName, create) => {
        setDomainMenu(null);
        if (openPageView(scopeName, create === true)) return;
        ui.set({ open: true });
        try {
          bridge.request({ type: 'open-view', scope: scopeName, create: create === true });
        } catch (_error) {
          /* the panel will report an unavailable workspace if needed */
        }
      };

      const openCaptureMenu = async () => {
        if (release.active || captureBusy) return;
        if (captureOpen) {
          setCaptureOpen(false);
          return;
        }
        setDomainMenu(null);
        setNotice(null);
        setSummaryOpen(false);
        setCaptureBusy(true);
        let result;
        try {
          result = await bridge.request({ type: 'capture-options' });
        } catch (error) {
          result = { ok: false, reason: String((error && error.message) || error) };
        }
        setCaptureBusy(false);
        if (!result || result.ok !== true || !Array.isArray(result.groups)) {
          showNotice('error', translate('status.noComposer'));
          return;
        }
        const last = normalizeSettings(pool.settings).lastCaptureGroup;
        const groups = result.groups.slice().sort((left, right) => {
          if (left.value === last) return -1;
          if (right.value === last) return 1;
          return 0;
        });
        setCaptureGroups(groups);
        setCaptureOpen(true);
      };

      const saveDraft = async (group) => {
        setCaptureOpen(false);
        let result;
        try {
          result = await bridge.request({ type: 'capture', group });
        } catch (error) {
          result = { ok: false, reason: String((error && error.message) || error) };
        }
        if (!result || result.ok !== true) {
          showNotice('error', translate(result && result.reason === 'empty' ? 'status.nothing' : 'status.noComposer'));
          return;
        }
        const skipped = Number(result.skipped) || 0;
        const groupLabel = typeof result.label === 'string' ? result.label : '';
        showNotice(
          skipped > 0 ? 'info' : 'ok',
          skipped > 0
            ? (groupLabel
                ? translate('status.savedPartialTo', { group: groupLabel, n: skipped })
                : translate('status.savedPartial', { n: skipped }))
            : (groupLabel ? translate('status.savedTo', { group: groupLabel }) : translate('status.saved')),
        );
      };

      const openSummary = () => {
        if (release.active || notes.length === 0) return;
        if (summaryOpen) {
          setSummaryOpen(false);
          return;
        }
        setCaptureOpen(false);
        setDomainMenu(null);
        setNotice(null);
        setKeepNotes(normalizeSettings(pool.settings).noteKeepAfterReview === true);
        setAllowImmediate(false);
        setSummaryError('');
        setSummaryOpen(true);
      };

      const runSummary = async () => {
        if (summaryBusy) return;
        setSummaryBusy(true);
        setSummaryError('');
        const images = imagesForNotes(notes);
        const immediateIds = allowImmediate
          ? notes.filter((note) => REVIEW_IMMEDIATE_MARKERS[note.kind]).map((note) => note.id)
          : [];
        const text = buildReviewPrompt(notes, images, immediateIds);
        let result;
        try {
          result = await bridge.request({ type: 'insert-text', text, images });
        } catch (error) {
          result = { ok: false, reason: String((error && error.message) || error) };
        }
        setSummaryBusy(false);
        if (!result || result.ok !== true) {
          setSummaryError(translate('note.summary.failed'));
          return;
        }
        if (!keepNotes) {
          notesActions.removeMany(notes.map((note) => note.id));
          // The marks that just left can come back, same as on the review card.
          showToast(translate('note.summary.done'), 'ok', () => notesActions.restore(notes));
        } else {
          showNotice('ok', translate('note.summary.done'));
        }
        setSummaryOpen(false);
      };

      return h(
        React.Fragment,
        null,
        h('style', { key: 'css' }, CSS),
        h(
          'div',
          { key: 'shell', className: 'pp-trigger-shell pp-root', 'data-pp-trigger': 'true', ref: barRef },
          h(
            'div',
            { className: 'pp-trigger-bar' },
          h(
            'button',
            {
              type: 'button',
              className: 'pp-btn pp-trigger',
              'data-open': view.open ? 'true' : 'false',
              disabled: release.active,
              title: translate('tip.pool'),
              'aria-label': label,
              'aria-haspopup': 'dialog',
              'aria-expanded': view.open ? 'true' : 'false',
              onMouseDown: (event) => event.preventDefault(),
              onClick: () => {
                if (release.active) return;
                setDomainMenu(null);
                setCaptureOpen(false);
                setSummaryOpen(false);
                setNotice(null);
                // The brand opens the workbench; on a sidebar host that is the
                // right-sidebar page, and the composer panel is the fallback.
                if (openPageView('', false)) return;
                ui.set({ open: !ui.get().open });
              },
            },
            h('span', { className: 'pp-trigger-brand', 'aria-hidden': true }, h(PromptPoolBrandMark, { size: 20 })),
            h('span', { className: 'pp-trigger-label' }, label),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'pp-trigger-action',
              'data-domain': 'annotations',
              title: translate('tip.notes'),
              'aria-label': translate('scope.notes'),
              'aria-haspopup': 'menu',
              'aria-expanded': domainMenu === 'annotations' ? 'true' : 'false',
              'data-open': domainMenu === 'annotations' ? 'true' : 'false',
              disabled: release.active,
              onMouseDown: (event) => event.preventDefault(),
              onClick: () => openDomain('annotations'),
            },
            icon('annotation'),
            h('span', null, translate('scope.notes')),
            notes.length > 0
              ? h('span', { className: 'pp-trigger-count', 'aria-hidden': true, title: translate('tip.noteCount', { n: notes.length }) }, String(notes.length))
              : null,
            h('span', { className: 'pp-trigger-chevron', 'aria-hidden': true }, icon('chevronDown'))
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'pp-trigger-action',
              'data-domain': 'prompts',
              title: translate('tip.prompts'),
              'aria-label': translate('scope.prompts'),
              'aria-haspopup': 'menu',
              'aria-expanded': domainMenu === 'prompts' ? 'true' : 'false',
              'data-open': domainMenu === 'prompts' ? 'true' : 'false',
              disabled: release.active,
              onMouseDown: (event) => event.preventDefault(),
              onClick: () => openDomain('prompts'),
            },
            icon('prompt'),
            h('span', null, translate('scope.prompts')),
            h('span', { className: 'pp-trigger-chevron', 'aria-hidden': true }, icon('chevronDown')),
          ),
        ),
        domainMenu
          ? h(
              'div',
              {
                key: 'domain-menu',
                className: 'pp-trigger-menu pp-root',
                'data-domain': domainMenu,
                role: 'menu',
                'aria-label': label + ' · ' + translate(domainMenu === 'annotations' ? 'scope.notes' : 'scope.prompts'),
              },
              domainMenu === 'annotations'
                ? [
                    MenuItem({
                      id: 'annotate',
                      icon: 'pick',
                      label: translate('note.addPick'),
                      onClick: () => {
                        setDomainMenu(null);
                        notePickActions.start(sessionId);
                      },
                    }),
                    MenuItem({
                      id: 'summary',
                      icon: 'funnel',
                      label: translate('note.menu.summary'),
                      // Hovering explains the rules the generated prompt carries.
                      title: translate('note.review.intro'),
                      disabled: notes.length === 0,
                      trailing: notes.length > 0
                        ? h('span', { className: 'pp-trigger-menu-count' }, String(notes.length))
                        : null,
                      onClick: () => {
                        setDomainMenu(null);
                        openSummary();
                      },
                    }),
                    MenuItem({
                      id: 'view',
                      icon: 'annotation',
                      label: translate('note.menu.view'),
                      onClick: () => openPoolView('notes', false),
                    }),
                  ]
                : [
                    MenuItem({
                      id: 'save',
                      icon: 'capture',
                      label: translate('prompt.menu.save'),
                      onClick: () => { void openCaptureMenu(); },
                    }),
                    MenuItem({
                      id: 'new',
                      icon: 'plusBox',
                      label: translate('prompt.menu.new'),
                      onClick: () => openPoolView('workspace', true),
                    }),
                    MenuItem({
                      id: 'view',
                      icon: 'prompt',
                      label: translate('prompt.menu.view'),
                      onClick: () => openPoolView('workspace', false),
                    }),
                  ],
            )
          : null,
        captureOpen
          ? h(
              'div',
              {
                key: 'capture-menu',
                className: 'pp-trigger-menu pp-root',
                role: 'menu',
                'aria-label': translate('capture.title'),
              },
              h('div', { className: 'pp-trigger-menu-title' }, translate('capture.title')),
              captureGroups.map((group) => h(
                'button',
                {
                  key: group.value,
                  type: 'button',
                  role: 'menuitem',
                  className: 'pp-trigger-menu-item',
                  onClick: () => { void saveDraft(group.value); },
                },
                group.label,
              )),
            )
          : null,
        summaryOpen
          ? h(
              'div',
              {
                key: 'summary',
                className: 'pp-summary-pop pp-root',
                role: 'dialog',
                'aria-label': translate('note.summary.title'),
              },
              h(
                'div',
                { className: 'pp-summary-head' },
                h('span', { className: 'pp-summary-mark' }, icon('annotation')),
                h('strong', null, translate('note.summary.title')),
                h('span', { className: 'pp-summary-count' }, translate('note.summary.count', { n: notes.length })),
              ),
              h('div', { className: 'pp-summary-desc' }, translate('note.summary.desc')),
              h(
                'label',
                { className: 'pp-summary-check' },
                h('input', {
                  type: 'checkbox',
                  checked: keepNotes,
                  onChange: () => setKeepNotes((current) => !current),
                }),
                h('span', null, translate('note.summary.keep')),
              ),
              h(
                'label',
                { className: 'pp-summary-check' },
                h('input', {
                  type: 'checkbox',
                  checked: allowImmediate,
                  onChange: () => setAllowImmediate((current) => !current),
                }),
                h('span', null, translate('note.summary.immediate')),
              ),
              h('div', { className: 'pp-summary-note' }, translate('note.summary.immediateHint')),
              summaryError ? h('div', { className: 'pp-summary-error', role: 'alert' }, summaryError) : null,
              h(
                'div',
                { className: 'pp-summary-actions' },
                h('button', {
                  type: 'button',
                  className: 'pp-mini',
                  disabled: summaryBusy,
                  onClick: () => setSummaryOpen(false),
                }, translate('row.cancel')),
                h('button', {
                  type: 'button',
                  className: 'pp-primary',
                  disabled: summaryBusy,
                  onClick: () => { void runSummary(); },
                }, translate(summaryBusy ? 'note.summary.working' : 'note.summary.ok')),
              ),
            )
          : null,
        notice
          ? h(
              'div',
              {
                key: 'notice',
                className: 'pp-trigger-notice pp-root',
                'data-kind': notice.kind,
                role: 'status',
                'aria-live': 'polite',
              },
              notice.text,
            )
          : null,
        ),
      );
    }

    // ------------------------------------------------------------ sidebar icon
    // Three bars with the selected row in signal green: a host tab strip and a
    // menu list draw an icon in the current text colour, so a bare mark turns
    // into a black smudge there. The outer rows stay muted ink (they follow the
    // theme), the middle row keeps the brand green with a hairline outline so it
    // reads at 14px in either theme and cannot be mistaken for a list glyph.
    function PromptPoolIcon(props) {
      const size = typeof props.size === 'number' && props.size > 0 ? props.size : 18;
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          'aria-hidden': true,
          style: { display: 'block' },
        },
        h('rect', { x: 5.2, y: 4.7, width: 9.4, height: 2.9, rx: 1.45, fill: 'currentColor', opacity: 0.52 }),
        h('rect', {
          x: 5.2,
          y: 10.55,
          width: 13.4,
          height: 2.9,
          rx: 1.45,
          fill: '#D8F36A',
          stroke: '#16211F',
          strokeWidth: 0.9,
        }),
        h('rect', { x: 5.2, y: 16.4, width: 7.8, height: 2.9, rx: 1.45, fill: 'currentColor', opacity: 0.52 }),
      );
    }

    // Brand mark for the panel header and trigger: three unequal prompt bars
    // with no tile. The unselected rows are muted rules; the selected row is
    // slightly longer, signal green, and is followed by a single chevron. Drops
    // the arrow tail on purpose: at 44px a tail plus a filled head reads as a
    // play key, while a bare chevron stays a quiet "next / forward" mark. Equal
    // heights keep the three rows reading as one queue; the longer selected bar
    // and a hairline outline carry the focus instead of two heavy black blocks.
    function PromptPoolBrandMark(props) {
      const size = typeof props.size === 'number' && props.size > 0 ? props.size : 44;
      const compact = size <= 24;
      const rowOpacity = compact ? 0.62 : 0.42;
      const rowHeight = compact ? 2.9 : 2.8;
      const selectedStroke = compact ? 0.85 : 0.55;
      const arrowStroke = compact ? 1.6 : 0.9;
      const bars = [
        { y: 3.3, width: 12.4, height: rowHeight },
        { y: 10.1, width: 15.4, height: rowHeight, selected: true },
        { y: 16.9, width: 8.4, height: rowHeight },
      ];
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true, style: { display: 'block' } },
        bars.map((bar, index) =>
          h('rect', {
            key: 'bar-' + index,
            x: 2.1,
            y: bar.y,
            width: bar.width,
            height: bar.height,
            rx: bar.height / 2,
            fill: bar.selected ? '#D8F36A' : 'currentColor',
            opacity: bar.selected ? 1 : rowOpacity,
            stroke: bar.selected ? '#16211F' : 'none',
            strokeWidth: bar.selected ? selectedStroke : 0,
          }),
        ),
        h('path', {
          // One chevron at every size, no tail. It is a direction mark rather
          // than a literal "send" glyph; the selected green row above it does
          // the work of saying which item is current.
          d: compact ? 'M20 9.8L22 11.5L20 13.2' : 'M19.95 10.46L21.53 11.5L19.95 12.54',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: arrowStroke,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      );
    }

    /** Round "add one occurrence" control; the same item may be added repeatedly. */
    /** One shared type badge for annotations and prompts. */
    function TypeMark({ name, title, tone }) {
      return h(
        'span',
        {
          className: 'pp-type-mark',
          title: title || '',
          'data-tone': tone ? 'true' : undefined,
          style: tone ? { '--pp-kind': tone } : undefined,
        },
        icon(name || 'prompt'),
      );
    }

    /** Shared empty state with a domain mark. */
    function EmptyState({ iconName, text, className }) {
      return h(
        'div',
        { className: className || 'pp-empty' },
        h('span', { className: 'pp-empty-mark', 'aria-hidden': true }, icon(iconName)),
        h('span', null, text),
      );
    }

    function RowActionIcon({ name, label, onClick, disabled, danger }) {
      return h(
        'button',
        {
          type: 'button',
          className: 'pp-row-action',
          title: label,
          'aria-label': label,
          disabled: disabled === true,
          'data-danger': danger === true ? 'true' : 'false',
          onMouseDown: (event) => event.preventDefault(),
          onClick: (event) => {
            event.stopPropagation();
            onClick(event);
          },
        },
        icon(name),
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
      const compact = props.compact === true;
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
      const fileInput = h('input', {
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
      });
      if (compact) {
        return h(
          'span',
          { className: 'pp-image-picker pp-image-picker-compact' },
          h(
            'button',
            {
              type: 'button',
              className: 'pp-body-add',
              title: translate('image.add') + ' · ' + translate('image.pasteHint'),
              'aria-label': translate('image.add'),
              disabled: busy,
              onClick: () => {
                if (inputRef.current) inputRef.current.click();
              },
            },
            icon('plus'),
          ),
          fileInput,
        );
      }
      return h(
        'div',
        { className: 'pp-image-picker' },
        props.showStrip === false
          ? null
          : h(ImageStrip, {
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
        fileInput,
      );
    }

    /** Image files carried by a paste gesture, for the annotation editor. */
    function imageFilesFromClipboard(event) {
      const data = event && event.clipboardData;
      if (!data) return [];
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
      return files;
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
    // Horizontal tablist keyboard model: one tab stop per row, arrows move the
    // focus and activate, Home/End jump to the edges. Inputs inside a tablist
    // (rename/new-group fields) keep their own caret movement.
    function focusTabByKey(event) {
      const key = event.key;
      if (key !== 'ArrowRight' && key !== 'ArrowLeft' && key !== 'Home' && key !== 'End') return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const origin = event.target;
      if (!origin || String(origin.tagName || '').toUpperCase() === 'INPUT') return;
      const tabs = event.currentTarget.querySelectorAll('[role="tab"]');
      if (!tabs.length) return;
      const start = origin.closest ? origin.closest('[role="tab"]') : null;
      // A close chip is a sibling button, not a tab: let it keep its own keys.
      if (!start) return;
      const current = Array.prototype.indexOf.call(tabs, start);
      let next;
      if (key === 'Home') next = 0;
      else if (key === 'End') next = tabs.length - 1;
      else next = (current < 0 ? 0 : current + (key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      event.preventDefault();
      tabs[next].focus();
      tabs[next].click();
    }

    /**
     * A rounded rule that slides under the active tab of an underline bar. The
     * rule is positioned in the bar's padding box, so it follows the tab's real
     * label width (icons included) and survives a horizontally scrolled row.
     */
    function useTabIndicator(activeKey, tone) {
      const barRef = useRef(null);
      const [indicator, setIndicator] = useState(null);
      useEffect(() => {
        const bar = barRef.current;
        if (!bar) return undefined;
        let live = true;
        let frame = 0;
        const measure = () => {
          if (!live) return;
          frame = 0;
          const active = bar.querySelector('[role="tab"][aria-selected="true"]');
          if (!active || !active.offsetWidth) {
            setIndicator(null);
            return;
          }
          const next = {
            left: active.offsetLeft,
            top: active.offsetTop + active.offsetHeight - 3,
            width: active.offsetWidth,
            tone,
          };
          setIndicator((previous) => (
            previous
              && previous.left === next.left
              && previous.top === next.top
              && previous.width === next.width
              && previous.tone === next.tone
              ? previous
              : next
          ));
        };
        const schedule = () => {
          if (!live || frame) return;
          frame = window.requestAnimationFrame(measure);
        };
        measure();
        const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
        const mutation = typeof MutationObserver === 'function' ? new MutationObserver(schedule) : null;
        if (observer) {
          observer.observe(bar);
          const active = bar.querySelector('[role="tab"][aria-selected="true"]');
          if (active) observer.observe(active);
        }
        if (mutation) {
          mutation.observe(bar, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['aria-selected', 'data-active', 'class', 'style'],
          });
        }
        window.addEventListener('resize', schedule);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule, () => {});
        return () => {
          live = false;
          if (frame) window.cancelAnimationFrame(frame);
          if (observer) observer.disconnect();
          if (mutation) mutation.disconnect();
          window.removeEventListener('resize', schedule);
        };
      }, [activeKey, tone]);
      return [barRef, indicator];
    }

    /**
     * One-row, edge-faded viewport for the group tabs. The wheel moves the row
     * sideways, the active tab is kept in view, and a fade appears only on a
     * side that still has hidden tabs.
     */
    function TabScroller(props) {
      const scrollRef = useRef(null);
      const firstReveal = useRef(true);
      const [fade, setFade] = useState('none');

      useEffect(() => {
        const node = scrollRef.current;
        if (!node) return undefined;
        const update = () => {
          const max = node.scrollWidth - node.clientWidth;
          if (max <= 1) {
            setFade('none');
            return;
          }
          const start = node.scrollLeft <= 1;
          const end = node.scrollLeft >= max - 1;
          setFade(start ? (end ? 'none' : 'end') : end ? 'start' : 'both');
        };
        const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
        if (observer) {
          observer.observe(node);
          if (node.firstElementChild) observer.observe(node.firstElementChild);
        }
        const onScroll = () => update();
        const onWheel = (event) => {
          if (event.ctrlKey || event.metaKey || event.shiftKey) return;
          if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
          const max = node.scrollWidth - node.clientWidth;
          if (max <= 1 || event.deltaY === 0) return;
          const step = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
          const before = node.scrollLeft;
          node.scrollLeft = Math.max(0, Math.min(max, before + step));
          if (node.scrollLeft !== before) {
            event.preventDefault();
            update();
          }
        };
        node.addEventListener('scroll', onScroll, { passive: true });
        node.addEventListener('wheel', onWheel, { passive: false });
        window.addEventListener('resize', update);
        update();
        return () => {
          if (observer) observer.disconnect();
          node.removeEventListener('scroll', onScroll);
          node.removeEventListener('wheel', onWheel);
          window.removeEventListener('resize', update);
        };
      }, [props.revision]);

      useEffect(() => {
        const node = scrollRef.current;
        if (!node) return undefined;
        const smooth = !firstReveal.current;
        firstReveal.current = false;
        const frame = window.requestAnimationFrame(() => {
          const active = node.querySelector('[role="tab"][aria-selected="true"]');
          if (!active) return;
          const view = node.getBoundingClientRect();
          const tab = active.getBoundingClientRect();
          const edge = 16;
          let delta = 0;
          if (tab.left < view.left + edge) delta = tab.left - view.left - edge;
          else if (tab.right > view.right - edge) delta = tab.right - view.right + edge;
          if (!delta) return;
          const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          node.scrollTo({
            left: Math.max(0, node.scrollLeft + delta),
            behavior: smooth && !reduce ? 'smooth' : 'auto',
          });
        });
        return () => window.cancelAnimationFrame(frame);
      }, [props.active, props.revision]);

      return h(
        'div',
        { ref: scrollRef, className: 'pp-tabscroll', 'data-fade': fade },
        props.children,
      );
    }

    // Three destinations on the page, two in the panel: the panel is too narrow
    // to carry the shared pool, and its list is workspace prompts only.
    const PAGE_SCOPE_ENTRIES = [
      { id: 'notes', label: 'scope.notes', icon: 'annotation' },
      { id: 'prompts', label: 'scope.prompts', icon: 'prompt' },
      { id: 'global', label: 'scope.global', icon: 'layers' },
    ];
    const PANEL_SCOPE_ENTRIES = PAGE_SCOPE_ENTRIES.slice(0, 2);
    const PAGE_SCOPE_HINTS = {
      notes: { label: 'scope.notes', text: 'scope.hint.notes', title: 'scope.hint.notes.title' },
      prompts: { label: 'scope.prompts', text: 'scope.hint.prompts', title: 'scope.hint.prompts.title' },
      global: { label: 'scope.global', text: 'scope.hint.global', title: 'scope.hint.global.title' },
    };

    function ScopeBar(props) {
      const entries = props.entries || PAGE_SCOPE_ENTRIES;
      const active = entries.some((entry) => entry.id === props.value) ? props.value : entries[0].id;
      const counts = props.counts || {};
      const [barRef, indicator] = useTabIndicator(active, active === 'notes' ? 'notes' : 'accent');
      return h(
        'div',
        {
          className: 'pp-bar pp-scope-bar',
          ref: barRef,
          role: 'tablist',
          'data-indicator': indicator ? 'true' : 'false',
          onKeyDown: focusTabByKey,
        },
        indicator
          ? h('span', {
              className: 'pp-tab-indicator',
              'data-tone': indicator.tone,
              'aria-hidden': true,
              style: { left: indicator.left, top: indicator.top, width: indicator.width },
            })
          : null,
        entries.map((entry) => h(
          'button',
          {
            key: entry.id,
            type: 'button',
            className: 'pp-tab',
            role: 'tab',
            'aria-selected': active === entry.id ? 'true' : 'false',
            tabIndex: active === entry.id ? 0 : -1,
            'data-scope': entry.id,
            'data-group': entry.id === 'notes' ? 'notes' : undefined,
            'data-active': active === entry.id ? 'true' : 'false',
            onClick: () => props.onChange(entry.id),
          },
          h('span', {
            className: 'pp-tab-icon',
            'aria-hidden': true,
          }, icon(entry.icon)),
          translate(entry.label),
          counts[entry.id] > 0
            ? h('span', { className: 'pp-tab-count' }, String(counts[entry.id]))
            : null,
        )),
      );
    }

    function TabBar(props) {
      const [adding, setAdding] = useState(null);
      const [renaming, setRenaming] = useState(null);
      const tabs = props.tabs || [];
      // When the stored tab no longer exists, keep the row keyboard reachable
      // by landing the single tab stop on the first tab.
      const fallbackStop = tabs.some((item) => item.id === props.active) ? null : (tabs[0] && tabs[0].id);

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
        const closable = Boolean(tab.category && active);
        const tabStop = active || tab.id === fallbackStop;
        const closeLabel = translate('tab.delete');
        const closeButton = closable
          ? h(
              'button',
              {
                type: 'button',
                className: 'pp-tab-x',
                // The shell bubble carries the hint on hosts that expose it;
                // the title keeps the fallback for every other host.
                title: HostTooltip ? undefined : closeLabel,
                'aria-label': closeLabel,
                onClick: (event) => {
                  event.stopPropagation();
                  props.onDelete(tab.id);
                },
              },
              '×',
            )
          : null;
        const closeControl = closeButton && HostTooltip
          ? h(
              HostTooltip,
              { label: closeLabel, side: 'bottom', portal: true, delayMs: 280 },
              closeButton,
            )
          : closeButton;
        return h(
          'span',
          {
            key: tab.id,
            className: 'pp-tabcell',
            'data-active': active ? 'true' : 'false',
            'data-closable': closable ? 'true' : 'false',
          },
          h(
            'button',
            {
              type: 'button',
              className: 'pp-tab',
              role: 'tab',
              'aria-selected': active ? 'true' : 'false',
              tabIndex: tabStop ? 0 : -1,
              'data-active': active ? 'true' : 'false',
              'data-group': tab.group,
              'data-tab-id': tab.id,
              title: tab.category ? translate('tab.renameHint') : undefined,
              onClick: () => props.onSelect(tab.id),
              onDoubleClick: tab.category ? () => setRenaming({ id: tab.id, name: tab.label, original: tab.label }) : undefined,
            },
            tab.label,
            count > 0 && tab.id !== 'all'
              ? h('span', { className: 'pp-tab-count' }, String(count))
              : null,
          ),
          closeControl,
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
      // A chip row under a folded tab leaves the strip to own the add button.
      const showAdd = props.showAdd !== false;
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
        if (showAdd && !addPlaced && tab.group === 'custom' && (!next || next.group !== 'custom')) {
          addPlaced = true;
          nodes.push(h('span', { key: 'add-custom', className: 'pp-tab-addwrap' }, renderAdd()));
        }
      });
      if (showAdd && !addPlaced) nodes.push(h('span', { key: 'add-custom', className: 'pp-tab-addwrap' }, renderAdd()));
      return h(React.Fragment, null, nodes);
    }

    /** Settings entry that reads like the host's own footer row: gear + label. */
    function SettingsButton(props) {
      return h(
        'button',
        {
          type: 'button',
          className: 'pp-icon pp-set-btn',
          'data-active': props.active === true ? 'true' : 'false',
          title: translate('settings.open'),
          'aria-label': translate('settings.open'),
          onClick: props.onClick,
        },
        h('span', { className: 'pp-set-btn-icon' }, icon('gear')),
      );
    }

    // ------------------------------------------------------------- full page
    function PromptPoolPage(props) {
      useLocaleTick();
      const state = usePoolState();
      const reviewResize = useDockResize(normalizeSettings(state.settings).reviewHeight, 'reviewHeight', REVIEW_MIN_HEIGHT, REVIEW_MAX_HEIGHT);
      const trayResize = useDockResize(normalizeSettings(state.settings).trayHeight, 'trayHeight', TRAY_MIN_HEIGHT, TRAY_MAX_HEIGHT);
      const storage = useStorageState();
      const releaseInfo = useReleaseState();
      const noteBar = useNoteStatus();
      const queueCollapsed = normalizeSettings(state.settings).queueCollapsed;
      const publishedWorkspaces = useWorkspaceDir();
      const sessionHint = useSessionDir().sessionId;
      const pageSessionId = (props && ((props.scope && props.scope.sessionId) || props.sessionId)) || '';
      // This page can be the only plugin surface mounted, so it reads the host
      // roster itself instead of waiting for the panel to publish it.
      const pageWsSnapshot = typeof props.useWorkspaces === 'function' ? props.useWorkspaces(selectAllInput) : undefined;
      const workspaceList = pageWsSnapshot
        ? workspaceEntriesOf(pageWsSnapshot)
        : (publishedWorkspaces && Array.isArray(publishedWorkspaces.items) ? publishedWorkspaces.items : []);
      const pageWorkspace = pageSessionId
        ? workspaceList.find((entry) => Array.isArray(entry.sessionIds) && entry.sessionIds.indexOf(pageSessionId) >= 0)
        : null;
      const pageWorkspaceId = pageWorkspace ? pageWorkspace.workspaceId : '';
      const currentWorkspaceId = pageWorkspaceId || (publishedWorkspaces && publishedWorkspaces.currentId) || '';
      const pageWsSignature = pageWsSnapshot ? JSON.stringify(workspaceList) + '|' + currentWorkspaceId : '';
      useEffect(() => {
        if (!pageWsSnapshot || !pageWsSignature) return;
        workspaceDir.set({ items: workspaceList, currentId: currentWorkspaceId });
      }, [pageWsSignature]);
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
      const noteSelectionState = useNoteSelection();
      const reviewState = useNoteReview();
      const selectedNotes = notesForSelection(notesList, activeSessionId, noteSelectionState);
      const reviewSelection = reviewSplit(selectedNotes, reviewState);
      const baseTabs = buildTabs(state.categories, workspaceList, state.settings, currentWorkspaceId);
      // The annotation tab is always present, so the feature stays discoverable.
      const tabs = [{ id: 'notes', label: translate('note.title'), group: 'notes' }, ...baseTabs];
      const globalTabs = tabs.filter((entry) => entry.id === 'all' || entry.group === 'builtin' || entry.group === 'custom');
      const workspaceGroup = currentWorkspaceId ? 'workspace:' + currentWorkspaceId : '';
      const [tab, setPageTab] = useState(() => {
        const stored = pageTabState.get().id;
        return stored && tabs.some((entry) => entry.id === stored) ? stored : fallbackTabFor(tabs);
      });
      const setTab = (id) => {
        pageTabState.set({ id });
        setPageTab(id);
      };
      // The page opens on the tab chosen in Settings (once per mount).
      const [query, setQuery] = useState('');
      const [scope, setScope] = useState(() => (
        props && (props.initialScope === 'global' || props.initialScope === 'workspace') ? props.initialScope : 'notes'
      ));
      const [settingsOpen, setSettingsOpen] = useState(false);
      const [helpOpen, setHelpOpen] = useState(false);
      const [reviewOpen, setReviewOpen] = useState(false);
      const [reviewProcessing, setReviewProcessing] = useState(false);
      const [reviewVersion, setReviewVersion] = useState(0);
      const [mergeOpen, setMergeOpen] = useState(false);
      const [mergeHeight, setMergeHeight] = useState(0);
      const [mergeBusy, setMergeBusy] = useState(false);
      const [trayMode, setTrayMode] = useState('single');
      const [pendingCategory, setPendingCategory] = useState(null);
      const [confirmClear, setConfirmClear] = useState(false);
      const [pendingDelete, setPendingDelete] = useState(null);
      const [pendingRemove, setPendingRemove] = useState(null);
      const [pendingStart, setPendingStart] = useState(null);
      // Which group of a folded family the list is showing; '' keeps the whole
      // family in one view. Chips under the strip set it.
      const [familyPick, setFamilyPick] = useState('');
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
      // Openers outside the page ask whether a draft can take their content.
      pageDraftOpen = editing !== null;
      const countedItems = countPoolItems(state.items, editing);
      const sharedItems = countedItems.filter((item) => {
        const family = familyOf(groupOf(item));
        return family === 'builtin' || family === 'custom';
      });
      const tabCounts = tabCountsOf(sharedItems);
      const workspaceCount = countedItems.filter((item) => groupOf(item) === workspaceGroup).length;
      // A stored tab can point at a group that was hidden or deleted since.
      useEffect(() => {
        if (tabs.some((entry) => entry.id === tab)) return;
        setTab(fallbackTabFor(tabs));
      }, [tabs, tab]);
      const activeGlobalTab = globalTabs.some((entry) => entry.id === tab) ? tab : (globalTabs.find((entry) => entry.id === 'all') || globalTabs[0] || { id: 'all' }).id;
      // A folded family keeps one tab in the strip and its groups as chips under
      // it, so the chips are reachable without expanding the strip again.
      const foldedFamily = foldedFamilyOf(activeGlobalTab);
      const familyGroups = foldedFamily ? familyChips(foldedFamily, state.categories) : [];
      const familyPickId = familyOf(familyPick) === foldedFamily ? familyPick : '';
      const changeScope = (next) => {
        setScope(next);
        setSettingsOpen(false);
        setReviewOpen(false);
        setReviewProcessing(false);
        setMergeOpen(false);
        setConfirmClear(false);
        setPendingRemove(null);
        if (next === 'global' && !globalTabs.some((entry) => entry.id === tab)) setTab(activeGlobalTab);
      };
      const activeMode = scope === 'notes' ? 'notes' : scope === 'global' ? 'global' : 'prompts';
      const switchMode = (next) => {
        if (next === 'notes') changeScope('notes');
        else if (next === 'global') changeScope('global');
        else changeScope('workspace');
      };
      // A failed write outranks a transient toast: the change is not saved.
      const notice = status || (storage.failed ? { kind: 'error', text: translate('status.storageFailed') } : null);
      const trayRef = useRef(null);
      const sessionTray = state.tray.filter((entry) => !entry.targetSessionId || entry.targetSessionId === activeSessionId);
      const trayCount = sessionTray.length;
      const openMerge = () => {
        if (sessionTray.length < 2) return;
        const node = trayResize.cardRef.current;
        const measured = node && node.getBoundingClientRect ? Math.round(node.getBoundingClientRect().height) : 0;
        setMergeHeight(measured);
        setReviewOpen(false);
        setReviewProcessing(false);
        setMergeOpen(true);
      };
      const closeMerge = () => {
        setMergeOpen(false);
      };
      const confirmMerge = async (mergedText) => {
        if (mergeBusy) return;
        const entries = sessionTray.slice();
        if (entries.length === 0) return;
        setMergeBusy(true);
        const fallback = entries.map((entry, index) => `${index + 1}. ${entry.body}`).join('\n\n');
        const text = typeof mergedText === 'string' && mergedText.trim() ? mergedText : fallback;
        const images = normalizeImages(entries.reduce((list, entry) => list.concat(entry.images || []), []), Number.MAX_SAFE_INTEGER);
        let result;
        try {
          result = await bridge.request({ type: 'queue-review', text, sessionId: activeSessionId, images });
        } catch (error) {
          result = { ok: false, reason: String((error && error.message) || error) };
        }
        setMergeBusy(false);
        if (!result || result.ok !== true) {
          flash({ kind: 'error', text: (result && result.reason) || translate('note.review.unsupported') });
          return;
        }
        poolActions.removeTrayKeys(entries.map((entry) => entry.key));
        closeMerge();
        flash({ kind: 'ok', text: translate('status.released', { n: 1 }) });
      };

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
        if (tab === target) setTab(fallbackTabFor(tabs.filter((entry) => entry.id !== target)));
        // A chip must not keep pointing at a group that no longer exists.
        if (familyPick === target) setFamilyPick('');
      };

      const items = useMemo(() => {
        if (scope === 'notes') return [];
        const base = scope === 'workspace'
          ? state.items.filter((item) => groupOf(item) === workspaceGroup)
          : state.items.filter((item) => {
              const family = familyOf(groupOf(item));
              if (family !== 'builtin' && family !== 'custom') return false;
              // A picked chip narrows the folded family to that one group.
              if (familyPickId) return groupOf(item) === familyPickId;
              return matchesTab(item, activeGlobalTab);
            });
        const needle = query.trim().toLowerCase();
        if (!needle) return base;
        return base.filter((item) => (item.title + '\n' + item.body).toLowerCase().indexOf(needle) >= 0);
      }, [state.items, scope, workspaceGroup, activeGlobalTab, familyPickId, query]);

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



      /** The page has no composer, so the mounted panel inserts the reply. */
      const composeSessionNotes = (notes) => {
        const chosen = Array.isArray(notes) ? notes : selectedNotes;
        if (chosen.length === 0) {
          flash({ kind: 'error', text: translate('note.noneSelected') });
          return false;
        }
        let result;
        try {
          result = bridge.request({ type: 'compose-notes' });
        } catch (_error) {
          return false;
        }
        // The mounted panel owns the notes it composed, so it removes exactly
        // those when the retention setting is off.
        return Boolean(result && result.ok);
      };

      /** The page cannot write the composer, so the mounted panel inserts the note. */
      const insertNote = (note) => {
        let result;
        try {
          result = bridge.request({ type: 'insert-text', text: composeNoteLine(note), images: note.images || [] });
        } catch (_error) {
          return false;
        }
        return Boolean(result && result.ok);
      };

      const openReview = () => {
        closeMerge();
        setReviewOpen(true);
        setReviewProcessing(false);
      };

      const startReview = () => {
        closeMerge();
        setReviewOpen(true);
        setReviewProcessing(true);
      };

      /** Move the unchecked to-dos into the current workspace's prompt pool. */
      const moveReviewTodos = (review) => {
        const ids = Array.isArray(review && review.parkedIds) ? review.parkedIds : [];
        if (ids.length === 0) return 0;
        const wanted = new Set(ids);
        const notes = notesList.filter((note) => wanted.has(note.id));
        if (notes.length === 0) return 0;
        const group = reviewTodoGroup(currentWorkspaceId, workspaceList);
        const now = Date.now();
        for (const note of notes) {
          poolActions.add({
            id: uid(),
            group,
            title: draftTitle(note.body || note.quote),
            body: composeNoteLine(note),
            images: normalizeImages(note.images),
            createdAt: now,
            updatedAt: now,
          });
        }
        const movedIds = notes.map((note) => note.id);
        notesActions.removeMany(movedIds);
        deselectNotes(activeSessionId, movedIds);
        resetNoteReview(activeSessionId, movedIds);
        return movedIds.length;
      };

      const parkReviewTodos = async (review) => {
        const moved = moveReviewTodos(review);
        if (moved === 0) return { ok: false, reason: translate('status.storageFailed') };
        setReviewOpen(false);
        setReviewProcessing(false);
        setReviewVersion((value) => value + 1);
        flash({ kind: 'ok', text: translate('note.review.parked', { n: moved }) });
        return { ok: true };
      };

      /** Queue one reviewed batch through the mounted panel, or insert it into the composer. */
      const queueReview = async (review) => {
        let result;
        try {
          result = await bridge.request({ type: 'queue-review', text: review.text, sessionId: activeSessionId, images: review.images });
        } catch (error) {
          result = { ok: false, reason: String((error && error.message) || error) };
        }
        let inserted = false;
        if (!result || result.ok !== true) {
          if (result && result.reason === 'unavailable') {
            try {
              result = await bridge.request({ type: 'insert-text', text: review.text, images: review.images });
            } catch (error) {
              result = { ok: false, reason: String((error && error.message) || error) };
            }
            inserted = Boolean(result && result.ok === true);
          }
          if (!inserted) {
            const reason = result && result.reason === 'unavailable'
              ? translate('note.review.unsupported')
              : result && result.reason;
            return { ok: false, reason: reason || translate('note.review.unsupported') };
          }
        }
        commitReviewBatch({ ...review, sessionId: activeSessionId });
        const moved = moveReviewTodos(review);
        setReviewOpen(false);
        setReviewProcessing(false);
        setReviewVersion((value) => value + 1);
        flash({
          kind: 'ok',
          text: inserted
            ? translate('note.review.inserted')
            : moved > 0
              ? translate('note.review.queuedParked', { n: moved })
              : translate('note.review.queued'),
        });
        return { ok: true };
      };


      /** Save the reviewed text as a normal prompt, without sending or queueing it. */
      const saveReviewPrompt = (review) => {
        const chosen = notesList.filter((note) => review.noteIds.indexOf(note.id) >= 0);
        const choices = captureChoices(state.categories, workspaceList, currentWorkspaceId, state.settings);
        const preferred = currentWorkspaceId && choices.some((entry) => entry.value === 'workspace:' + currentWorkspaceId)
          ? 'workspace:' + currentWorkspaceId
          : BUILTIN_GROUP.oftenuse;
        const ordered = choices.some((entry) => entry.value === preferred)
          ? [...choices.filter((entry) => entry.value === preferred), ...choices.filter((entry) => entry.value !== preferred)]
          : choices;
        setReviewOpen(false);
        setReviewProcessing(false);
        setReviewVersion((value) => value + 1);
        // A filed prompt keeps the same sentence shape as a single annotation,
        // not the sending contract: the review card's numbered groups and rules
        // exist to be answered, while a stored prompt is read again later.
        const text = composeNotesReply(chosen);
        const done = () => {
          moveReviewTodos({ parkedIds: review.parkedIds });
          resetNoteReview(activeSessionId, review.noteIds);
        };
        const filed = currentWorkspaceId && !pageDraftOpen
          ? openPageView('workspace', true, {
            title: '',
            body: text,
            // The batch inherits a type only when every mark shares one.
            type: promptTypeForNotes(chosen),
            images: review.images,
            source: { noteIds: review.noteIds, markStored: false, onSaved: done },
          })
          : false;
        if (filed) return { ok: true };
        openNoteSave({
          noteIds: review.noteIds,
          markStored: false,
          title: '',
          body: text,
          type: promptTypeForNotes(chosen),
          images: review.images,
          choices: ordered,
          defaultGroup: preferred,
          onSaved: done,
        });
        return { ok: true };
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
        if (!queueClickAllowed(item.id)) return;
        const before = pool.get().tray.length;
        poolActions.addToTray(item.id, activeSessionId);
        if (pool.get().tray.length === before) return;
        if (!normalizeSettings(state.settings).keepAfterQueue) removeItem(item, translate('status.queuedAndRemoved'));
        else flash({ kind: 'ok', text: translate('status.queued') });
      };

      /**
       * The active scope decides the new item's classification. A seed lets an
       * opener hand the draft over already written (an annotation filed as a
       * prompt); `source` rides along so saving can retire that annotation.
       */
      const create = (targetScope, seed) => {
        // One editor at a time: a second draft would leave the first one
        // unsaved and counted again.
        if (editing) return;
        // The trigger can ask for a draft before the scope switch has rendered,
        // so the ask names its own destination.
        const activeScope = targetScope === 'workspace' || targetScope === 'global' ? targetScope : scope;
        if (activeScope === 'workspace' && !workspaceGroup) {
          flash({ kind: 'error', text: translate('status.noWorkspace') });
          return;
        }
        const draft = seed && typeof seed === 'object' ? seed : null;
        const seededType = normalizePromptType(draft && draft.type);
        const group = activeScope === 'workspace'
          ? workspaceGroup
          : groupForTab(activeGlobalTab, '', familyPickId);
        setQuery('');
        const item = poolActions.add({
          id: uid(),
          group,
          title: draft && typeof draft.title === 'string' ? draft.title : '',
          body: draft && typeof draft.body === 'string' ? draft.body : '',
          type: seededType,
          images: normalizeImages(draft && draft.images),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        setEditing({
          id: item.id,
          group,
          title: item.title,
          body: item.body,
          type: seededType,
          images: normalizeImages(item.images),
          isNew: true,
          source: draft && draft.source && typeof draft.source === 'object' ? draft.source : null,
        });
      };

      // An opener outside the page names a destination (and sometimes a new
      // draft) before calling; act on that ask once, when the page can. The
      // marker lives outside the hook cells so a remount cannot replay an ask
      // that would otherwise reopen a draft every time the tab comes back.
      const pageIntentState = usePageIntent();
      useEffect(() => {
        if (!pageIntentState || !pageIntentState.seq || pageIntentState.seq === pageIntentHandled) return;
        pageIntentHandled = pageIntentState.seq;
        const target = pageIntentState.scope;
        if (target === 'notes' || target === 'workspace' || target === 'global') changeScope(target);
        if (pageIntentState.create) {
          if (editing) flash({ kind: 'error', text: translate('status.finishEditFirst') });
          else create(target, pageIntentState.draft);
        }
        // Keep the seq (it is the ask's identity) but drop the payload, so a
        // later remount or plugin reload finds nothing left to replay.
        pageIntent.set({ scope: '', create: false, seq: pageIntentState.seq, draft: null });
      }, [pageIntentState]);

      /** Opening another row must not silently drop the current editor. */
      const requestStart = (item) => {
        if (!editing || editing.id === item.id) {
          if (!editing) startEdit(item);
          return;
        }
        if (!poolEditChanged(editing)) {
          cancelEdit();
          startEdit(item);
          return;
        }
        setPendingStart(item);
      };

      const settlePendingStart = (action) => {
        const target = pendingStart;
        if (!target) return;
        setPendingStart(null);
        if (action === 'stay') return;
        if (action === 'save') {
          if (!save()) return;
        } else {
          cancelEdit();
        }
        const fresh = pool.get().items.find((entry) => entry.id === target.id);
        if (fresh) startEdit(fresh);
      };

      const rowOf = (item, index) => renderPoolRow({
        key: item.id,
        item,
        index,
        total: items.length,
        editing,
        setEditing,
        categories: state.categories,
        workspaces: workspaceList,
        sessionId: activeSessionId,
        editStyle: { margin: '6px 0' },
        showTag: scope === 'global' && (activeGlobalTab === 'all' || (Boolean(foldedFamily) && !familyPickId)),
        onInsert: (entry) => sendToComposer(
          { type: 'insert', text: entry.body, images: normalizeImages(entry.images) },
          entry.body.trim() ? translate('status.inserted') : translate('image.inserted'),
          () => {
            if (!normalizeSettings(state.settings).keepAfterInsert) removeItem(entry, translate('status.insertedAndRemoved'));
          },
        ),
        onMain: requestStart,
        onStartEdit: requestStart,
        onQueue: queueItem,
        onDelete: setPendingDelete,
        onSave: save,
        onCancel: cancelEdit,
        onPasteImages: pasteImages,
        onOpenImage: openImage,
        onError: (text) => flash({ kind: 'error', text }),
      });

      return h(
        'div',
        { className: 'pp-page', 'data-settings': settingsOpen ? 'true' : undefined },
        h('style', null, CSS),
        h(
          'div',
          { className: 'pp-page-head' },
          h(
            'div',
            { className: 'pp-page-tabs' },
            h(ScopeBar, {
              value: activeMode,
              counts: { notes: notesList.length, prompts: workspaceCount, global: sharedItems.length },
              onChange: switchMode,
            }),
            h('span', {
              className: 'pp-scope-note',
              'data-scope': activeMode,
              title: translate(PAGE_SCOPE_HINTS[activeMode].title),
            },
              h('span', { className: 'pp-scope-note-subject' }, translate(PAGE_SCOPE_HINTS[activeMode].label)),
              h('span', { className: 'pp-scope-note-scope' }, translate(PAGE_SCOPE_HINTS[activeMode].text))),
          ),
          scope === 'global'
            ? h(
                'div',
                { className: 'pp-prompt-bar' },
                h(
                  TabScroller,
                  { active: activeGlobalTab, revision: globalTabs.length },
                  h(
                    'div',
                    { className: 'pp-bar pp-global-bar', role: 'tablist', onKeyDown: focusTabByKey },
                    h(TabBar, {
                      tabs: globalTabs,
                      counts: tabCounts,
                      active: activeGlobalTab,
                      ...tabHandlers((next) => {
                        setSettingsOpen(false);
                        setReviewOpen(false);
                        setReviewProcessing(false);
                        // Landing on a family tab means the whole family, so a
                        // chip picked earlier is dropped.
                        setFamilyPick('');
                        setTab(next);
                      }, activeGlobalTab, fallbackTabFor(globalTabs)),
                      onDelete: (id) => setPendingCategory(id),
                    }),
                  ),
                ),
              )
            : null,
          scope === 'global' && foldedFamily && familyGroups.length > 1
            ? h(
                'div',
                // A folded family keeps its groups one click away instead of
                // mixing them into one list: the strip folds, the chips do not.
                // There is no "all groups" chip: the family tab above already
                // means the whole family, so a second control for it would be
                // two buttons for one state. Clicking the family tab again
                // clears a picked chip.
                { className: 'pp-group-bar', onKeyDown: focusTabByKey },
                h(
                  'span',
                  { className: 'pp-group-track', role: 'tablist', 'aria-label': translate('tab.familyGroups') },
                  h(TabBar, {
                    tabs: familyGroups,
                    counts: tabCounts,
                    active: familyPickId,
                    showAdd: false,
                    ...tabHandlers((next) => {
                      setFamilyPick(next === familyPickId ? '' : next);
                    }, familyPickId, ''),
                    onDelete: (id) => setPendingCategory(id),
                  }),
                ),
              )
            : null,
          h(
            'div',
            { className: 'pp-head-tools' },
            h('input', {
              className: 'pp-search',
              value: query,
              placeholder: translate('page.search'),
              'aria-label': translate('page.search'),
              onChange: (event) => setQuery(event.target.value),
            }),
            scope === 'notes'
              ? h('button', {
                  type: 'button',
                  className: 'pp-primary pp-new-prompt',
                  onClick: () => {
                    setReviewOpen(false);
                    setSettingsOpen(false);
                    notePickActions.start(activeSessionId, 'page');
                  },
                }, translate('note.pick.page'))
              : h('button', { type: 'button', className: 'pp-primary pp-new-prompt', onClick: create },
                  translate('page.new')),
            h('button', {
              type: 'button',
              className: 'pp-icon pp-menu-trigger',
              title: translate('help.open'),
              'aria-label': translate('help.open'),
              onClick: () => setHelpOpen(true),
            }, icon('help')),
            h('button', {
              type: 'button',
              className: 'pp-icon pp-menu-trigger',
              title: translate('settings.open'),
              'aria-label': translate('settings.open'),
              onClick: () => { setReviewOpen(false); setSettingsOpen(!settingsOpen); },
            }, icon('gear')),
          ),
        ),
        pendingCategory ? h(CategoryDeleteConfirm, { onConfirm: confirmCategoryDelete, onCancel: () => setPendingCategory(null) }) : null,
        confirmClear && sessionTray.length > 0
          ? h(TrayClearConfirm, {
              count: sessionTray.length,
              onConfirm: () => {
                const entries = sessionTray.slice();
                poolActions.removeTrayKeys(entries.map((entry) => entry.key));
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
        pendingStart
          ? h(UnsavedSwitchDialog, {
              onCancel: () => settlePendingStart('stay'),
              onDiscard: () => settlePendingStart('discard'),
              onSave: () => settlePendingStart('save'),
            })
          : null,
        pendingRemove && sessionTray.some((entry) => entry.key === pendingRemove.key)
          ? h(TrayRemoveConfirm, {
              onCancel: () => setPendingRemove(null),
              onConfirm: () => {
                poolActions.removeTray(pendingRemove.key);
                setPendingRemove(null);
              },
            })
          : null,
        helpOpen ? h(HelpDialog, { onClose: () => setHelpOpen(false) }) : null,
        h(
          'div',
          { className: 'pp-page-body', ref: pageListRef },
          settingsOpen
            ? h(PromptPoolSettings, { currentWorkspaceId, onBack: () => setSettingsOpen(false) })
            : scope === 'notes'
              ? h(NotesView, {
                  notes: notesList,
                  sessionId: activeSessionId,
                  reviewMode: reviewOpen && reviewProcessing,
                  onCompose: composeSessionNotes,
                  onInsertNote: insertNote,
                  hideActions: true,
                  filter: query,
                  categories: state.categories,
                  workspaces: workspaceList,
                  currentWorkspaceId,
                  settings: state.settings,
                })
              : items.length === 0
                ? h(
                    EmptyState,
                    {
                      iconName: scope === 'global' ? 'layers' : 'prompt',
                      text: translate(
                        query.trim()
                          ? 'page.noMatch'
                          : scope === 'global' && activeGlobalTab === 'all'
                            ? 'page.empty'
                            : 'page.emptyTab',
                      ),
                    },
                  )
                : items.map(rowOf),
        ),
        h(
          'div',
          { className: 'pp-queue-dock' },
          scope === 'notes' && noteBar.text
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
          !settingsOpen && scope === 'notes'
            ? renderReviewDock({
                sessionId: activeSessionId,
                selectedNotes,
                sentNotes: reviewSelection.sent,
                parkedNotes: reviewSelection.parked,
                immediateIds: reviewSelection.immediateIds,
                count: selectedNotes.length,
                total: notesList.length,
                open: reviewOpen,
                version: reviewVersion,
                height: reviewResize.height,
                cardRef: reviewResize.cardRef,
                onResizeStart: reviewResize.startResize,
                onResizeBy: reviewResize.resizeBy,
                onResizeReset: reviewResize.reset,
                onExpand: openReview,
                onStart: startReview,
                processing: reviewOpen && reviewProcessing,
                onSelectAll: () => selectAllNotes(activeSessionId),
                onClearSelection: () => clearNoteSelection(activeSessionId, notesList.map((note) => note.id)),
                onCollapse: () => { setReviewOpen(false); setReviewProcessing(false); },
                onSend: queueReview,
                onSavePrompt: saveReviewPrompt,
                onPark: parkReviewTodos,
              })
            : null,
          !settingsOpen && scope !== 'notes' && mergeOpen
            ? h(MergeReviewCard, {
                entries: sessionTray,
                height: mergeHeight,
                busy: mergeBusy,
                onClose: closeMerge,
                onConfirm: confirmMerge,
                onOpenImage: openImage,
              })
            : null,
          !settingsOpen && scope !== 'notes' && !mergeOpen
            ? renderTrayCard({
                entries: sessionTray,
                collapsed: queueCollapsed,
                sessionId: activeSessionId,
                trayRef,
                height: trayResize.height,
                cardRef: trayResize.cardRef,
                onResizeStart: trayResize.startResize,
                onResizeBy: trayResize.resizeBy,
                onResizeReset: trayResize.reset,
                editing: trayEditing,
                setEditing: setTrayEditing,
                onSaveEdit: saveTrayEdit,
                onPasteImages: pasteTrayImages,
                onClear: () => setConfirmClear(true),
                onRelease: () => sendToComposer({ type: 'release' }, translate('status.releaseSent')),
                onDigest: openMerge,
                mode: trayMode,
                onModeChange: setTrayMode,
                onRemove: setPendingRemove,
                onOpenImage: openImage,
                onError: (text) => flash({ kind: 'error', text }),
              })
            : null,
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
        // The tab wears the brand mark, chevron included, not the three-bar
        // stamp: at 14px the bars alone read as a generic list glyph.
        h(PromptPoolBrandMark, { size: 15 }),
        translate('page.title'),
      );
    }

    // --------------------------------------------------------------- settings
    function PromptPoolSettings(props) {
      useLocaleTick();
      const state = usePoolState();
      const settings = normalizeSettings(state.settings);
      const [section, setSection] = useState('notes');
      const [tabBarRef, tabIndicator] = useTabIndicator(section, section === 'notes' ? 'notes' : 'accent');
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
        h(
          'div',
          { className: 'pp-set-head' },
          h(
            'div',
            { className: 'pp-set-heading' },
            // The way back reads as a caption for the title, not a peer of it.
            props.onBack
              ? h(
                  'button',
                  { type: 'button', className: 'pp-set-back', onClick: props.onBack },
                  h('span', { className: 'pp-btn-icon', 'aria-hidden': true }, icon('back')),
                  translate('settings.back'),
                )
              : null,
            h('div', { className: 'pp-set-title' }, translate('settings.title')),
            h('div', { className: 'pp-hint' }, translate('settings.desc')),
          ),
        ),
        h(
          'div',
          {
            className: 'pp-bar pp-set-tabs',
            ref: tabBarRef,
            style: { padding: '0 0 10px' },
            role: 'tablist',
            'data-indicator': tabIndicator ? 'true' : 'false',
            onKeyDown: focusTabByKey,
          },
          tabIndicator
            ? h('span', {
                className: 'pp-tab-indicator',
                'data-tone': tabIndicator.tone,
                'aria-hidden': true,
                style: { left: tabIndicator.left, top: tabIndicator.top, width: tabIndicator.width },
              })
            : null,
          h(
            'button',
            {
              type: 'button',
              className: 'pp-tab',
              role: 'tab',
              'aria-selected': section === 'notes' ? 'true' : 'false',
              tabIndex: section === 'notes' ? 0 : -1,
              'data-active': section === 'notes' ? 'true' : 'false',
              'data-scope': 'notes',
              onClick: () => setSection('notes'),
            },
            h('span', { className: 'pp-tab-icon', 'aria-hidden': true }, icon('annotation')),
            translate('settings.tab.notes'),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'pp-tab',
              role: 'tab',
              'aria-selected': section === 'prompts' ? 'true' : 'false',
              tabIndex: section === 'prompts' ? 0 : -1,
              'data-active': section === 'prompts' ? 'true' : 'false',
              'data-scope': 'prompts',
              onClick: () => setSection('prompts'),
            },
            h('span', { className: 'pp-tab-icon', 'aria-hidden': true }, icon('prompt')),
            translate('settings.tab.prompts'),
          ),
        ),
        h(
          'div',
          { className: 'pp-set-group pp-set-card', style: { display: section === 'notes' ? '' : 'none' } },
          h('div', { className: 'pp-hint' }, translate('settings.notesIntro')),
          check('noteKeepAfterInsert', 'settings.notesKeepInsert', 'settings.notesKeepInsertHint'),
          h('div', { className: 'pp-set-divider' }),
          check('noteKeepAfterReview', 'settings.notesKeepReview', 'settings.notesKeepReviewHint'),
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
          // The reset belongs to the family it acts on, so it sits on the
          // heading line instead of drifting to the card's bottom edge.
          h(
            'div',
            { className: 'pp-set-cardhead' },
            h('div', { className: 'pp-set-label' }, translate('settings.seedCard')),
            h(
              'button',
              {
                type: 'button',
                className: 'pp-mini',
                'data-pp': 'seed-reset',
                // The confirm step spells the language out anyway; the hover
                // text saves the paragraph that used to repeat it here.
                title: translate('settings.seedNote', { language: seedLanguageLabel }),
                onClick: () => setSeedConfirm(true),
              },
              translate('settings.seedResetButton'),
            ),
          ),
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
          seedStatus ? h('div', { className: 'pp-hint' }, seedStatus) : null,
        ),
        h(
          'div',
          { className: 'pp-set-group pp-set-card', style: { display: section === 'prompts' ? '' : 'none' } },
          h('div', { className: 'pp-set-label' }, translate('settings.table')),
          h(
            'div',
            { className: 'pp-set-item', style: { marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--pp-line-2)' } },
            h(
              'label',
              { className: 'pp-set-row' },
              h('input', {
                type: 'checkbox',
                name: 'pp-show-all-tab',
                checked: settings.showAllTab !== false,
                onChange: () => poolActions.setSetting('showAllTab', settings.showAllTab === false),
              }),
              h('span', null, translate('settings.showAllTab')),
            ),
            h('div', { className: 'pp-hint pp-set-hint' }, translate('settings.showAllTabHint')),
          ),
          h('div', { className: 'pp-hint pp-set-hint' }, translate('settings.tableHint')),
          // Each family answers its own row: the three ways to show it are
          // segments on that row, so the eye never travels up to a header to
          // learn what the dots under a name mean.
          h(
            'div',
            { className: 'pp-set-fams', role: 'group', 'aria-label': translate('settings.tableGroup') },
            settings.order.map((family, index) =>
              h(
                'div',
                { key: family, className: 'pp-set-fam' },
                h('span', { className: 'pp-set-fam-name' }, translate('settings.display.' + family)),
                h(
                  'span',
                  { className: 'pp-seg', role: 'radiogroup', 'aria-label': translate('settings.display.' + family) },
                  ['tabs', 'nested', 'hidden'].map((mode) =>
                    h(
                      'label',
                      {
                        key: mode,
                        className: 'pp-seg-opt',
                        'data-active': settings.display[family] === mode ? 'true' : 'false',
                      },
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
                h(
                  'span',
                  { className: 'pp-set-fam-order', 'aria-label': translate('settings.tableOrder') },
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
        ),
        // Always visible, whichever tab is open. The header above already says
        // what this plugin is and does, so the card carries only the credits.
        h(
          'div',
          { className: 'pp-set-group pp-set-card pp-about' },
          h(
            'div',
            { className: 'pp-set-label' },
            translate('settings.about'),
            h('span', { className: 'pp-about-version' }, 'v' + PLUGIN_VERSION),
          ),
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
    /** Review batches sent to the session queue; the note records point here. */
    const BATCHES_KEY = 'dsh.prompt-pool.batches.v1';
    const BATCHES_SINGLETON = '__dshPromptPoolBatchesV1';
    /** One Highlight object carries every annotated range. */
    const NOTE_HIGHLIGHT = 'prompt-pool-note';
    /** The always-open note card: fixed width so the gutter test is exact. */
    /** Narrower columns fall back to numbered pins instead of cards. */
    /** Tallest a card can get, for the occlusion test against a floating panel. */

    /** Bumped when badge placement or styling changes, so old chips are rebuilt in place. */
    const NOTE_CHIP_VERSION = '7';

    /**
     * Annotation kinds: the glyph and label name the type, and a vivid hue makes
     * it recognisable at a glance in the badge, the editor and the highlighted
     * passage. The hues are semantic, not decorative: the amber wash stays the
     * annotation layer's own accent in the dock chrome.
     */
    const NOTE_KINDS = [
      { id: 'agree', icon: 'check', prefix: 'Agree-', label: 'note.kind.agree', color: '#22c55e' },
      { id: 'disagree', icon: 'x', prefix: 'Disagree-', label: 'note.kind.disagree', color: '#ef4444' },
      { id: 'question', icon: 'question', prefix: 'Question-', label: 'note.kind.question', color: '#3b82f6' },
      { id: 'comment', icon: 'pen', prefix: 'Comment-', label: 'note.kind.comment', color: '#0891b2' },
      { id: 'idea', icon: 'bulb', prefix: 'Idea-', label: 'note.kind.idea', color: '#f97316' },
      { id: 'supplement', icon: 'info', prefix: 'Supplement-', label: 'note.kind.supplement', color: '#8b5cf6' },
      { id: 'todo', icon: 'todo', prefix: 'Todo-', label: 'note.kind.todo', color: '#e0a800' },
    ];
    const NOTE_KIND_IDS = NOTE_KINDS.map((kind) => kind.id);
    const NOTE_KIND_DEFAULT = 'agree';
    /**
     * Body budgets are measured in half-width cells, not UTF-16 units: 500
     * full-width characters (CJK, full-width punctuation, emoji) or 1,000
     * half-width ones, mixed text pro rata. The annotation editor, the prompt
     * editor and the inline annotation badge all use this same measure.
     */
    /** Zero-width code points: combining marks and emoji joiners/variations. */
    const BODY_ZERO_WIDTH = /[\u200b-\u200f\u2060\ufe0e\ufe0f]|\p{M}/u;
    /** Code points that take two cells: East Asian wide/fullwidth and emoji. */
    const BODY_WIDE = /[\u1100-\u115f\u2e80-\u303e\u3041-\u33ff\u3400-\u4dbf\u4e00-\u9fff\ua000-\ua4cf\ua960-\ua97f\uac00-\ud7a3\uf900-\ufaff\ufe10-\ufe19\ufe30-\ufe6f\uff00-\uff60\uffe0-\uffe6]|\p{Emoji_Presentation}/u;

    /** Half-width cells one code point occupies. */
    function bodyCharCells(char) {
      if (!char) return 0;
      if (BODY_ZERO_WIDTH.test(char)) return 0;
      return BODY_WIDE.test(char) ? 2 : 1;
    }

    /** The display width of a body in half-width cells. */
    function bodyWidth(body) {
      let width = 0;
      for (const char of String(body || '')) width += bodyCharCells(char);
      return width;
    }

    /** Cut a string to at most `limit` half-width cells without splitting a character. */
    function clampBodyText(value, limit) {
      let width = 0;
      let text = '';
      const max = Math.max(0, limit);
      for (const char of String(value || '')) {
        const cells = bodyCharCells(char);
        if (width + cells > max) break;
        text += char;
        width += cells;
      }
      return text;
    }

    /**
     * Apply one textarea edit without silently trimming the existing body.
     * A pure insertion that overflows keeps the old text and takes only the
     * part that still fits; a partial replacement is rejected rather than
     * cutting the old tail. A full replacement (select all, then paste) takes
     * as much of the new text as the budget allows.
     */
    function mergeBodyInput(previous, next, limit) {
      const prev = String(previous || '');
      const value = String(next || '');
      const max = Math.max(0, limit);
      if (bodyWidth(value) <= max) return value;
      const before = Array.from(prev);
      const after = Array.from(value);
      // The edit is one contiguous replacement: common head, changed middle,
      // common tail. This is what typing, pasting and IME composition produce.
      let head = 0;
      while (head < before.length && head < after.length && before[head] === after[head]) head += 1;
      let tail = 0;
      while (
        tail < before.length - head
        && tail < after.length - head
        && before[before.length - 1 - tail] === after[after.length - 1 - tail]
      ) tail += 1;
      const removed = before.slice(head, before.length - tail);
      const inserted = after.slice(head, after.length - tail).join('');
      // Select all + paste: the old body is intentionally gone, so the pasted
      // text may be trimmed instead of being swallowed whole.
      if (removed.length === before.length) return clampBodyText(value, max);
      const room = max - bodyWidth(prev) + bodyWidth(removed.join(''));
      const allowed = clampBodyText(inserted, room);
      // A replacement has to fit untouched; a pure insertion may take the
      // prefix that fits while the existing text stays intact.
      if (removed.length > 0 && Array.from(allowed).length !== Array.from(inserted).length) return prev;
      const result = [
        ...before.slice(0, head),
        ...Array.from(allowed),
        ...before.slice(head + removed.length),
      ].join('');
      return clampBodyText(result, max);
    }

    /** The annotation body budget: 500 full-width or 1,000 half-width characters. */
    const NOTE_BODY_MAX = 1000;

    function noteKind(kind) {
      return NOTE_KINDS.find((entry) => entry.id === kind)
        || NOTE_KINDS.find((entry) => entry.id === NOTE_KIND_DEFAULT)
        || NOTE_KINDS[0];
    }

    /** Annotation-specific names for the shared cell helpers. */
    function noteBodyWidth(body) {
      return bodyWidth(body);
    }

    function clampNoteText(value, limit) {
      return clampBodyText(value, limit);
    }

    function clampNoteBody(body) {
      return clampBodyText(body, NOTE_BODY_MAX);
    }

    function mergeNoteBodyInput(previous, next) {
      return mergeBodyInput(previous, next, NOTE_BODY_MAX);
    }

    /** The visible badge text, whitespace-collapsed and capped by display width. */
    function noteBodyText(body) {
      const text = String(body || '').replace(/\s+/g, ' ').trim();
      if (!text) return '';
      const clipped = clampNoteBody(text);
      return clipped.length < text.length ? clipped.replace(/\s+$/, '') + '…' : clipped;
    }

    /**
     * Whether the overlay has anything to paint. A draft counts on its own:
     * the first annotation has no stored note yet, but its passage must still
     * be underlined while the bubble is open.
     */
    function noteHighlightActive(noteCount, draft) {
      return noteCount > 0 || Boolean(draft);
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
        context: typeof raw.context === 'string' ? raw.context : '',
        contextKind: raw.contextKind === 'question' ? 'question' : raw.contextKind === 'sentence' ? 'sentence' : '',
        order: Number.isFinite(Number(raw.order)) ? Number(raw.order) : 0,
        kind: NOTE_KIND_IDS.indexOf(raw.kind) >= 0 ? raw.kind : NOTE_KIND_DEFAULT,
        // Where the user dragged this note's card, relative to its passage.
        dx: Number.isFinite(Number(raw.dx)) ? Number(raw.dx) : 0,
        dy: Number.isFinite(Number(raw.dy)) ? Number(raw.dy) : 0,
        // Set once the note was promoted into a pool group; the row keeps it
        // visible with a "stored" marker instead of deleting the record.
        promotedGroup: typeof raw.promotedGroup === 'string' ? raw.promotedGroup : '',
        promotedAt: Number.isFinite(Number(raw.promotedAt)) ? Number(raw.promotedAt) : 0,
        // Legacy batch markers kept for old records; the review flow removes
        // processed notes instead of showing a handled state.
        lastBatchId: typeof raw.lastBatchId === 'string' ? raw.lastBatchId : '',
        lastQueuedAt: Number.isFinite(Number(raw.lastQueuedAt)) ? Number(raw.lastQueuedAt) : 0,
        body: typeof raw.body === 'string' ? raw.body : '',
        images: normalizeImages(raw.images),
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

    /**
     * The annotation added last, so the list can reveal it without changing the
     * transcript order. The record ages out; the list reads it on mount too.
     */
    const NOTE_FRESH_MS = 3200;
    const noteFresh = (() => {
      const empty = { id: '', sessionId: '', token: 0, at: 0 };
      if (typeof window === 'undefined') return createStore(empty);
      if (!window.__dshPromptPoolNoteFreshV1) window.__dshPromptPoolNoteFreshV1 = createStore(empty);
      return window.__dshPromptPoolNoteFreshV1;
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
        if (note && note.id) {
          const at = Date.now();
          noteFresh.set({
            id: note.id,
            sessionId: typeof note.sessionId === 'string' ? note.sessionId : '',
            token: at,
            at,
          });
        }
        return note;
      },
      patch(id, fields) {
        const before = notes.get().items.find((note) => note.id === id);
        mutateNotes((state) => ({
          ...state,
          items: state.items.map((note) => (note.id === id ? { ...note, ...fields, updatedAt: Date.now() } : note)),
        }));
        // A note, a review batch or a saved prompt may share the same bytes;
        // an image removed from the editor goes only when nothing needs it.
        if (before && Array.isArray(fields.images)) {
          const keep = new Set(fields.images.map((image) => image.id));
          const drop = (before.images || []).map((image) => image.id).filter((imageId) => !keep.has(imageId));
          const used = referencedImageIds();
          const garbage = drop.filter((imageId) => !used.has(imageId));
          if (garbage.length > 0) deleteImageBlobs(garbage).catch(() => {});
        }
      },
      /** Apply the same fields to several notes in one write. */
      patchMany(ids, fields) {
        const targets = new Set(Array.isArray(ids) ? ids : []);
        if (targets.size === 0) return;
        mutateNotes((state) => {
          let touched = false;
          const items = state.items.map((note) => {
            if (!targets.has(note.id)) return note;
            touched = true;
            return { ...note, ...fields, updatedAt: Date.now() };
          });
          return touched ? { ...state, items } : null;
        });
      },
      remove(id) {
        mutateNotes((state) => (state.items.some((note) => note.id === id)
          ? { ...state, items: state.items.filter((note) => note.id !== id) }
          : null));
      },
      /** Drop several notes in one write; only the picked ones leave the list. */
      removeMany(ids) {
        const drop = new Set(Array.isArray(ids) ? ids : []);
        if (drop.size === 0) return;
        mutateNotes((state) => {
          const items = state.items.filter((note) => !drop.has(note.id));
          return items.length === state.items.length ? null : { ...state, items };
        });
      },
      /** Put removed notes back, without marking them as newly added. */
      restore(notes) {
        const back = (Array.isArray(notes) ? notes : []).filter((note) => note && note.id);
        if (back.length === 0) return;
        mutateNotes((state) => {
          const known = new Set(state.items.map((note) => note.id));
          const add = back.filter((note) => !known.has(note.id));
          return add.length === 0 ? null : { ...state, items: [...state.items, ...add] };
        });
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

    function normalizeBatch(raw) {
      if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !raw.id) return null;
      return {
        id: raw.id,
        sessionId: typeof raw.sessionId === 'string' ? raw.sessionId : '',
        noteIds: Array.isArray(raw.noteIds) ? raw.noteIds.filter((id) => typeof id === 'string') : [],
        parkedIds: Array.isArray(raw.parkedIds) ? raw.parkedIds.filter((id) => typeof id === 'string') : [],
        immediateIds: Array.isArray(raw.immediateIds) ? raw.immediateIds.filter((id) => typeof id === 'string') : [],
        mode: ['answer', 'decide', 'change', 'review'].indexOf(raw.mode) >= 0 ? raw.mode : 'review',
        text: typeof raw.text === 'string' ? raw.text : '',
        images: normalizeImages(raw.images, Number.MAX_SAFE_INTEGER),
        createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now(),
        queuedAt: Number.isFinite(Number(raw.queuedAt)) ? Number(raw.queuedAt) : 0,
        state: raw.state === 'inserted' ? 'inserted' : 'queued',
      };
    }

    function loadBatches() {
      try {
        const raw = localStorage.getItem(BATCHES_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        const items = Array.isArray(parsed && parsed.items) ? parsed.items.map(normalizeBatch).filter(Boolean) : [];
        return { version: 1, items };
      } catch (_error) {
        return { version: 1, items: [] };
      }
    }

    const batches = (() => {
      if (typeof window === 'undefined') return createStore({ version: 1, items: [] });
      if (!window[BATCHES_SINGLETON]) window[BATCHES_SINGLETON] = createStore(loadBatches());
      return window[BATCHES_SINGLETON];
    })();

    const batchesActions = {
      add(batch) {
        const record = normalizeBatch(batch);
        if (!record) return null;
        const next = { version: 1, items: [record, ...batches.get().items].slice(0, 40) };
        batches.set(next);
        try {
          localStorage.setItem(BATCHES_KEY, JSON.stringify(next));
        } catch (_error) {
          /* the note's batch marker is still kept in memory */
        }
        return record;
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
      style.textContent = '.pp-toast{position:fixed;left:50%;bottom:30px;z-index:2147483000;max-width:min(520px,calc(100vw - 32px));padding:7px 13px;border-radius:8px;background:rgba(24,24,26,.94);color:#fff;font-size:12px;line-height:1.5;box-shadow:0 12px 30px rgba(0,0,0,.28);opacity:0;transform:translate(-50%,8px);transition:opacity .16s ease,transform .16s ease;pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pp-toast[data-show="true"]{opacity:1;transform:translate(-50%,0)}.pp-toast[data-kind="error"]{background:rgba(160,38,38,.95)}.pp-toast[data-action="true"]{pointer-events:auto}.pp-toast-action{margin-left:9px;padding:0;border:0;background:none;color:#d8f36a;font:inherit;font-weight:600;cursor:pointer;text-decoration:underline;text-underline-offset:2px}.pp-toast-action:hover{color:#eaffa8}';
      document.head.appendChild(style);
    }
    function hideToast() {
      if (toastNode) toastNode.removeAttribute('data-show');
    }
    function showToast(text, kind, undo) {
      if (typeof document === 'undefined' || !text) return;
      ensureToastStyle();
      if (!toastNode) {
        toastNode = document.createElement('div');
        toastNode.className = 'pp-toast';
        toastNode.setAttribute('role', 'status');
        document.body.appendChild(toastNode);
      }
      toastNode.textContent = '';
      toastNode.appendChild(document.createTextNode(text));
      // An undo rides on the toast itself: the list it restores is often the
      // surface that just lost the row, so an inline status would be gone too.
      if (typeof undo === 'function') {
        const action = document.createElement('button');
        action.type = 'button';
        action.className = 'pp-toast-action';
        action.textContent = translate('status.undo');
        action.addEventListener('click', () => {
          hideToast();
          undo();
        });
        toastNode.appendChild(action);
        toastNode.setAttribute('data-action', 'true');
      } else {
        toastNode.removeAttribute('data-action');
      }
      toastNode.setAttribute('data-kind', kind === 'error' ? 'error' : 'ok');
      toastNode.setAttribute('data-show', 'true');
      window.clearTimeout(toastTimer);
      // An undo needs long enough to be read and hit; a plain confirmation does not.
      const dwell = typeof undo === 'function' ? 6500 : kind === 'error' ? 5000 : 2300;
      toastTimer = window.setTimeout(() => {
        if (toastNode) toastNode.removeAttribute('data-show');
      }, dwell);
    }

    /** The session whose transcript is on screen; published by the notes layer. */
    const chatView = (() => {
      if (typeof window === 'undefined') return createStore({ sessionId: '' });
      if (!window.__dshPromptPoolNotesViewV1) window.__dshPromptPoolNotesViewV1 = createStore({ sessionId: '' });
      return window.__dshPromptPoolNotesViewV1;
    })();
    /** A newly captured anchor waiting for the overlay to open its editor. */
    const noteDraft = (() => {
      if (typeof window === 'undefined') return createStore({ anchor: null, sessionId: '', token: 0, kind: '' });
      if (!window.__dshPromptPoolNotesDraftV1) window.__dshPromptPoolNotesDraftV1 = createStore({ anchor: null, sessionId: '', token: 0, kind: '' });
      return window.__dshPromptPoolNotesDraftV1;
    })();
    /** A request to scroll to one annotation and open it. */
    const noteFocus = (() => {
      if (typeof window === 'undefined') return createStore({ id: '', token: 0 });
      if (!window.__dshPromptPoolNotesFocusV1) window.__dshPromptPoolNotesFocusV1 = createStore({ id: '', token: 0 });
      return window.__dshPromptPoolNotesFocusV1;
    })();

    /**
     * Notes unchecked from the bulk draft/save actions. Keeping the excluded
     * ids instead of the picked ones means a new note starts selected, and a
     * session switch starts from "everything selected" without stale picks.
     */
    const noteSelection = (() => {
      const empty = { sessionId: '', excluded: [] };
      if (typeof window === 'undefined') return createStore(empty);
      if (!window.__dshPromptPoolNoteSelectionV1) window.__dshPromptPoolNoteSelectionV1 = createStore(empty);
      return window.__dshPromptPoolNoteSelectionV1;
    })();

    /** Per-note review choices; selection itself lives in noteSelection. */
    const noteReview = (() => {
      const empty = { sessionId: '', immediate: {}, todoMode: {} };
      if (typeof window === 'undefined') return createStore(empty);
      if (!window.__dshPromptPoolNoteReviewV1) window.__dshPromptPoolNoteReviewV1 = createStore(empty);
      return window.__dshPromptPoolNoteReviewV1;
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

    /** The explicit save-as-prompt step shared by single notes and batches. */
    const noteSave = (() => {
      const empty = {
        open: false, noteIds: [], markStored: false, title: '', body: '', images: [],
        choices: [], defaultGroup: '', token: 0,
      };
      if (typeof window === 'undefined') return createStore(empty);
      if (!window.__dshPromptPoolNoteSaveV1) window.__dshPromptPoolNoteSaveV1 = createStore(empty);
      return window.__dshPromptPoolNoteSaveV1;
    })();
    const closeNoteSave = () => noteSave.set({
      open: false, noteIds: [], markStored: false, title: '', body: '', images: [],
      choices: [], defaultGroup: '', token: 0,
    });
    const openNoteSave = (draft) => noteSave.set({
      open: true,
      noteIds: Array.isArray(draft.noteIds) ? draft.noteIds : [],
      markStored: draft.markStored === true,
      title: typeof draft.title === 'string' ? draft.title : '',
      body: typeof draft.body === 'string' ? draft.body : '',
      type: normalizePromptType(draft.type),
      images: normalizeImages(draft.images),
      choices: Array.isArray(draft.choices) ? draft.choices : [],
      defaultGroup: typeof draft.defaultGroup === 'string' ? draft.defaultGroup : '',
      onSaved: typeof draft.onSaved === 'function' ? draft.onSaved : null,
      token: Date.now(),
    });
    const useNoteSave = () => useSyncExternalStore(noteSave.subscribe, noteSave.get, noteSave.get);

    /** The "delete this annotation?" confirmation; rendered as the shared modal over its surface. */
    const noteConfirm = (() => {
      const empty = { open: false, surfaceRect: null, onConfirm: null, token: 0 };
      if (typeof window === 'undefined') return createStore(empty);
      if (!window.__dshPromptPoolNoteConfirmV1) window.__dshPromptPoolNoteConfirmV1 = createStore(empty);
      return window.__dshPromptPoolNoteConfirmV1;
    })();
    const closeNoteConfirm = () => noteConfirm.set({ open: false, surfaceRect: null, onConfirm: null, token: 0 });

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
    /** Block-level annotation picker: active while the cursor chooses a passage. */
    const notePick = (() => {
      const empty = { active: false, sessionId: '', source: '', token: 0 };
      if (typeof window === 'undefined') return createStore(empty);
      if (!window.__dshPromptPoolNotePickV1) window.__dshPromptPoolNotePickV1 = createStore(empty);
      return window.__dshPromptPoolNotePickV1;
    })();
    const notePickActions = {
      start(sessionId, source) {
        const id = typeof sessionId === 'string' ? sessionId : '';
        if (!id) return;
        notePick.set({ active: true, sessionId: id, source: source === 'page' ? 'page' : 'panel', token: Date.now() });
      },
      stop() {
        if (!notePick.get().active) return;
        notePick.set({ active: false, sessionId: '', source: '', token: 0 });
      },
    };

    function openNoteConfirm(run, event) {
      const target = event && event.currentTarget ? event.currentTarget : null;
      const surface = target && typeof target.closest === 'function' ? target.closest('.pp-page, .pp-panel') : null;
      const rect = surface && typeof surface.getBoundingClientRect === 'function' ? surface.getBoundingClientRect() : null;
      noteConfirm.set({
        open: true,
        surfaceRect: rect
          ? { left: Math.round(rect.left), top: Math.round(rect.top), width: Math.max(0, Math.round(rect.width)), height: Math.max(0, Math.round(rect.height)) }
          : null,
        onConfirm: typeof run === 'function' ? run : null,
        token: Date.now(),
      });
    }
    function runNoteConfirm() {
      const run = noteConfirm.get().onConfirm;
      closeNoteConfirm();
      if (typeof run === 'function') run();
    }

    const useNotesState = () => useSyncExternalStore(notes.subscribe, notes.get, notes.get);
    const useNoteFresh = () => useSyncExternalStore(noteFresh.subscribe, noteFresh.get, noteFresh.get);
    const useChatView = () => useSyncExternalStore(chatView.subscribe, chatView.get, chatView.get);
    const useNoteDraft = () => useSyncExternalStore(noteDraft.subscribe, noteDraft.get, noteDraft.get);
    const useNoteFocus = () => useSyncExternalStore(noteFocus.subscribe, noteFocus.get, noteFocus.get);
    const useNotePrompt = () => useSyncExternalStore(notePrompt.subscribe, notePrompt.get, notePrompt.get);
    const useNoteConfirm = () => useSyncExternalStore(noteConfirm.subscribe, noteConfirm.get, noteConfirm.get);
    const useNoteStatus = () => useSyncExternalStore(noteStatus.subscribe, noteStatus.get, noteStatus.get);
    const useNotePick = () => useSyncExternalStore(notePick.subscribe, notePick.get, notePick.get);
    const useNoteSelection = () => useSyncExternalStore(noteSelection.subscribe, noteSelection.get, noteSelection.get);
    const useNoteReview = () => useSyncExternalStore(noteReview.subscribe, noteReview.get, noteReview.get);

    /** One line of quote text for a row, a pin tooltip or the composed reply. */
    function noteQuoteText(quote, limit) {
      const text = String(quote || '').replace(/\s+/g, ' ').trim();
      const max = limit || 80;
      return text.length > max ? text.slice(0, max) + '…' : text;
    }

    /** The fixed opener each kind of note gets inside a prompt sentence. */
    const NOTE_PROMPT_LEADS = {
      agree: 'note.prompt.lead.agree',
      disagree: 'note.prompt.lead.disagree',
      question: 'note.prompt.lead.question',
      comment: 'note.prompt.lead.comment',
      idea: 'note.prompt.lead.idea',
      supplement: 'note.prompt.lead.supplement',
      todo: 'note.prompt.lead.todo',
    };

    function notePromptLead(note) {
      const kind = noteKind(note.kind);
      return translate(NOTE_PROMPT_LEADS[kind.id] || 'note.prompt.lead.comment');
    }

    /** Drop a full stop so two halves can share one line; ?! stay meaningful. */
    function trimSentenceEnd(text) {
      return String(text || '')
        .replace(/\s+/g, ' ')
        .replace(/[。．.]+$/u, '')
        .trim();
    }

    /**
     * One annotation as a prompt block: 【原文】passage on the first line,
     * 【批注】what was said on the next. The kind opens the annotation with its
     * fixed words, because the 【kind】 label that used to carry it is gone from
     * the prompt. `limit` truncates the passage for inline insertion; a filed
     * prompt keeps it whole.
     */
    function composeNoteBlock(note, limit) {
      const kind = noteKind(note.kind);
      const quote = trimSentenceEnd(limit ? noteQuoteText(note.quote, limit) : note.quote);
      const body = trimSentenceEnd(note.body);
      const spoken = body ? notePromptLead(note) + body : translate(kind.label);
      const parts = [];
      if (quote) parts.push(translate('note.prompt.quote') + quote);
      parts.push(translate('note.prompt.body') + spoken);
      // A question or an exclamation already ends the sentence.
      const end = /[！!？?]$/u.test(spoken) ? '' : translate('note.prompt.end');
      return parts.join('\n') + end;
    }

    /** Inline lines stay short: the passage is a reminder, not the whole reply. */
    function composeNoteLine(note) {
      return composeNoteBlock(note, 80);
    }

    /**
     * One annotation filed as a prompt: the passage it marks, then what was
     * written on it, in the same sentence shape the composer gets. A prompt is
     * asked to stand on its own, so it keeps the whole passage instead of the
     * 80-character preview.
     */
    function composeNotePrompt(note) {
      return composeNoteBlock(note, 0);
    }

    /** The reply a session's annotations produce: numbered blocks, quote then note. */
    function composeNotesReply(list) {
      return list
        .slice()
        .sort((left, right) => (left.order - right.order) || (left.createdAt - right.createdAt))
        .map((note, index) => `${index + 1}. ${composeNotePrompt(note).replace(/\n/g, '\n   ')}`)
        .join('\n');
    }

    /**
     * Annotation kinds and prompt types are two vocabularies for the same
     * ideas, so a filed prompt inherits the type of the note it came from:
     * agree→decision, disagree and comment→opinion (a rejected point is an
     * opinion), the rest keep their id. A batch that mixes kinds has no single
     * type to inherit, and stays untyped rather than guessing one.
     */
    const NOTE_PROMPT_TYPES = {
      agree: 'decision',
      disagree: 'opinion',
      question: 'question',
      comment: 'opinion',
      idea: 'idea',
      supplement: 'supplement',
      todo: 'todo',
    };

    function promptTypeForNotes(list) {
      const types = new Set(
        (Array.isArray(list) ? list : [])
          .map((note) => NOTE_PROMPT_TYPES[noteKind(note.kind).id] || ''),
      );
      if (types.size !== 1) return '';
      return normalizePromptType(Array.from(types)[0]);
    }

    const REVIEW_GROUP_PROMPTS = {
      question: 'note.review.group.question',
      comment: 'note.review.group.comment',
      agree: 'note.review.group.agree',
      disagree: 'note.review.group.disagree',
      idea: 'note.review.group.idea',
      supplement: 'note.review.group.supplement',
      todo: 'note.review.group.todo',
    };
    /** Kinds that can be authorized to implement from the review card. */
    const REVIEW_IMMEDIATE_LABELS = {
      comment: 'note.review.immediate.comment',
      agree: 'note.review.immediate.agree',
      idea: 'note.review.immediate.idea',
      disagree: 'note.review.immediate.disagree',
    };
    /** The conclusion written into the prompt for each authorized kind. */
    const REVIEW_IMMEDIATE_MARKERS = {
      comment: 'note.review.immediateMark.comment',
      agree: 'note.review.immediateMark.agree',
      idea: 'note.review.immediateMark.idea',
      disagree: 'note.review.immediateMark.disagree',
      todo: 'note.review.immediateMark.todo',
    };
    let batchSequence = 0;

    /** The workspace group as the parking place for unexecuted to-dos. */
    function reviewTodoGroup(currentWorkspaceId, workspaces) {
      const list = Array.isArray(workspaces) ? workspaces : [];
      if (currentWorkspaceId && list.some((entry) => entry && entry.workspaceId === currentWorkspaceId)) {
        return 'workspace:' + currentWorkspaceId;
      }
      return BUILTIN_GROUP.note;
    }

    /** A readable batch id; the sequence keeps two batches in one second apart. */
    function newBatchId(now) {
      const date = new Date(Number.isFinite(Number(now)) ? Number(now) : Date.now());
      const pad = (value) => String(value).padStart(2, '0');
      batchSequence = (batchSequence + 1) % 100;
      return `B-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
        + `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}-${pad(batchSequence)}`;
    }

    /** The review prompt: a type-specific response contract plus the notes. */
    function buildReviewPrompt(list, images, immediateIds) {
      const immediate = new Set(Array.isArray(immediateIds) ? immediateIds : []);
      const lines = [
        translate('note.review.heading'),
        translate('note.review.intro'),
        '',
      ];
      const attachmentCount = Array.isArray(images) ? images.length : 0;
      if (attachmentCount > 0) lines.splice(2, 0, translate('note.review.attachments', { n: attachmentCount }));
      for (const kind of NOTE_KINDS) {
        const group = list
          .filter((note) => note.kind === kind.id)
          .sort((left, right) => (left.order - right.order) || (left.createdAt - right.createdAt));
        if (group.length === 0) continue;
        lines.push(`【${translate(kind.label)}】`);
        lines.push(translate(REVIEW_GROUP_PROMPTS[kind.id]));
        group.forEach((note, index) => {
          const head = `${kind.prefix}${index + 1}.`;
          const markerKey = REVIEW_IMMEDIATE_MARKERS[kind.id];
          const mark = immediate.has(note.id) && markerKey
            ? ' ' + translate(markerKey)
            : '';
          // The item keeps its ID for the response, but reads in the same
          // 【原文】/【批注】 block a filed prompt uses; the note's own line is
          // indented under the ID so the block stays one unit.
          const prefix = `${head}${mark} `;
          const block = composeNoteBlock(note, 80);
          lines.push(prefix + block.replace(/\n/g, '\n' + ' '.repeat(prefix.length)));
          if (note.context && note.context.trim()) {
            lines.push('  ' + translate(
              note.contextKind === 'question' ? 'note.review.contextQuestion' : 'note.review.context',
              { text: note.context },
            ));
          }
        });
        lines.push('');
      }
      return lines.join('\n').trim();
    }

    /** Split the checked notes into one sent batch and the parked to-dos. */
    function reviewSplit(notes, state) {
      const sent = [];
      const parked = [];
      const immediateIds = [];
      for (const note of Array.isArray(notes) ? notes : []) {
        const immediate = noteReviewImmediate(state, note);
        if (note.kind === 'todo' && !immediate) {
          parked.push(note);
        } else {
          sent.push(note);
          if (immediate) immediateIds.push(note.id);
        }
      }
      return { sent, parked, immediateIds };
    }

    /** Record the batch, then take its processed notes out unless they are kept. */
    function commitReviewBatch(review) {
      const now = Date.now();
      const record = batchesActions.add({
        id: review.batchId,
        sessionId: review.sessionId,
        noteIds: review.noteIds,
        parkedIds: Array.isArray(review.parkedIds) ? review.parkedIds : [],
        immediateIds: Array.isArray(review.immediateIds) ? review.immediateIds : [],
        mode: 'review',
        text: review.text,
        // The bytes live in IndexedDB; keep only their identity in the batch log.
        images: normalizeImages(review.images, Number.MAX_SAFE_INTEGER).map((image) => ({ ...image, thumb: '' })),
        createdAt: review.createdAt || now,
        queuedAt: now,
        state: 'queued',
      });
      // A sent summary has always taken its marks with it; keeping them is the
      // opt-in, so the batch log records what was sent either way.
      const keep = normalizeSettings(pool.get().settings).noteKeepAfterReview === true;
      if (!keep) {
        notesActions.removeMany(review.noteIds);
        deselectNotes(review.sessionId, review.noteIds);
        resetNoteReview(review.sessionId, review.noteIds);
      }
      return record;
    }

    /** The selection for one session; another session starts with everything checked. */
    function selectionForSession(selection, sessionId) {
      const id = String(sessionId || '');
      return selection && selection.sessionId === id ? selection : { sessionId: id, excluded: [] };
    }

    /** Whether one note is checked for the bulk draft/save actions. */
    function noteSelected(selection, sessionId, noteId) {
      return selectionForSession(selection, sessionId).excluded.indexOf(noteId) < 0;
    }

    /** The checked notes, in the list's order. */
    function notesForSelection(list, sessionId, selection) {
      const excluded = selectionForSession(selection, sessionId).excluded;
      return list.filter((note) => excluded.indexOf(note.id) < 0);
    }

    /** Check or uncheck one note; switching sessions drops the old picks. */
    function toggleNoteSelected(sessionId, noteId) {
      const session = String(sessionId || '');
      const current = selectionForSession(noteSelection.get(), session);
      const at = current.excluded.indexOf(noteId);
      const excluded = at >= 0
        ? current.excluded.filter((entry) => entry !== noteId)
        : [...current.excluded, noteId];
      noteSelection.set({ sessionId: session, excluded });
    }

    /** Select every note in one session. */
    function selectAllNotes(sessionId) {
      noteSelection.set({ sessionId: String(sessionId || ''), excluded: [] });
    }

    /** Uncheck every note in one session. */
    function clearNoteSelection(sessionId, noteIds) {
      const ids = Array.isArray(noteIds) ? noteIds.map(String) : [];
      noteSelection.set({ sessionId: String(sessionId || ''), excluded: [...new Set(ids)] });
    }

    /** The review choices for one session; another session starts neutral. */
    function reviewForSession(state, sessionId) {
      const id = String(sessionId || '');
      return state && state.sessionId === id ? state : { sessionId: id, immediate: {}, todoMode: {} };
    }

    /** Whether a note is marked for immediate execution in this review. */
    function noteReviewImmediate(state, note) {
      if (!note || !note.id) return false;
      const current = reviewForSession(state, note.sessionId || '');
      if (note.kind === 'todo') return current.todoMode[note.id] === 'execute';
      return Boolean(current.immediate[note.id] && REVIEW_IMMEDIATE_LABELS[note.kind]);
    }

    /** Toggle the immediate marker for a non-to-do note. */
    function setReviewImmediate(sessionId, note) {
      if (!note || !note.id || note.kind === 'todo' || !REVIEW_IMMEDIATE_LABELS[note.kind]) return;
      const id = String(sessionId || note.sessionId || '');
      const current = reviewForSession(noteReview.get(), id);
      noteReview.set({
        ...current,
        sessionId: id,
        immediate: { ...current.immediate, [note.id]: !current.immediate[note.id] },
      });
    }

    /** Choose the to-do route for this review: execute now or save as a prompt. */
    function setReviewTodoMode(sessionId, note, mode) {
      if (!note || !note.id || note.kind !== 'todo') return;
      const id = String(sessionId || note.sessionId || '');
      const current = reviewForSession(noteReview.get(), id);
      noteReview.set({
        ...current,
        sessionId: id,
        todoMode: { ...current.todoMode, [note.id]: mode === 'execute' ? 'execute' : 'prompt' },
      });
    }

    /** Drop review choices for notes that left the list in one batch. */
    function resetNoteReview(sessionId, noteIds) {
      const ids = Array.isArray(noteIds) ? noteIds.map(String) : [];
      if (ids.length === 0) return;
      const id = String(sessionId || '');
      const current = reviewForSession(noteReview.get(), id);
      const immediate = { ...current.immediate };
      const todoMode = { ...current.todoMode };
      for (const noteId of ids) {
        delete immediate[noteId];
        delete todoMode[noteId];
      }
      noteReview.set({ ...current, sessionId: id, immediate, todoMode });
    }

    /** Uncheck a batch after it went into the session queue. */
    function deselectNotes(sessionId, noteIds) {
      const ids = Array.isArray(noteIds) ? noteIds.filter(Boolean) : [];
      if (ids.length === 0) return;
      const session = String(sessionId || '');
      const current = selectionForSession(noteSelection.get(), session);
      const excluded = current.excluded.slice();
      for (const id of ids) if (excluded.indexOf(id) < 0) excluded.push(id);
      noteSelection.set({ sessionId: session, excluded });
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

    /** Context is a complete sentence, never a fixed character window. */
    const NOTE_CONTEXT_MAX = 280;
    const NOTE_SENTENCE_BREAK = /[。！？!?；;\n]/;

    function normalizeContextText(value) {
      return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function sentenceSpanAt(text, start, end) {
      if (!text) return null;
      const from = Math.max(0, Math.min(Number(start) || 0, text.length));
      const to = Math.max(from, Math.min(Number(end) || from, text.length));
      let a = from;
      while (a > 0 && !NOTE_SENTENCE_BREAK.test(text[a - 1])) a -= 1;
      let b = to;
      while (b < text.length && !NOTE_SENTENCE_BREAK.test(text[b])) b += 1;
      if (b < text.length) b += 1;
      while (a < b && /\s/.test(text[a])) a += 1;
      while (b > a && /\s/.test(text[b - 1])) b -= 1;
      return b > a ? { start: a, end: b } : null;
    }

    function previousSentenceSpan(text, start) {
      if (!text || start <= 0) return null;
      let end = Math.max(0, Math.min(start, text.length));
      while (end > 0 && /\s/.test(text[end - 1])) end -= 1;
      if (end <= 0) return null;
      let a = end - 1;
      if (NOTE_SENTENCE_BREAK.test(text[a])) a -= 1;
      while (a >= 0 && !NOTE_SENTENCE_BREAK.test(text[a])) a -= 1;
      let s = a + 1;
      while (s < end && /\s/.test(text[s])) s += 1;
      while (end > s && /\s/.test(text[end - 1])) end -= 1;
      return end > s ? { start: s, end } : null;
    }

    function contextCore(value) {
      return String(value || '').replace(/[\s。！？!?；;、，,.]/g, '');
    }

    function isQuestionSentence(value) {
      const sentence = String(value || '');
      return /[？?]/.test(sentence)
        || /还是|或者|哪一个|哪个|which|whether|\bor\b/i.test(sentence);
    }

    /**
     * The optional context for a short quote: the complete sentence around it,
     * or the complete preceding question when the quote is an option. Returns
     * an empty context when the unit is missing, too long, or redundant.
     */
    function noteContextAt(text, offset, quote) {
      const source = String(text || '');
      const clean = String(quote || '').trim();
      if (!source || !clean) return { text: '', kind: '' };
      let from = Number(offset);
      if (!Number.isFinite(from) || from < 0) from = source.indexOf(clean);
      if (from < 0) return { text: '', kind: '' };
      const current = sentenceSpanAt(source, from, from + clean.length);
      if (!current) return { text: '', kind: '' };
      const currentText = normalizeContextText(source.slice(current.start, current.end));
      if (!currentText) return { text: '', kind: '' };
      // A full sentence or a long quote already carries its own context.
      if (clean.length > 48 || /[。！？!?；;]$/.test(clean)) return { text: '', kind: '' };
      const previous = previousSentenceSpan(source, current.start);
      const previousText = previous ? normalizeContextText(source.slice(previous.start, previous.end)) : '';
      const currentIsQuestion = isQuestionSentence(currentText);
      const previousIsQuestion = previousText ? isQuestionSentence(previousText) : false;
      let context = '';
      let kind = '';
      if (currentIsQuestion) {
        context = currentText;
        kind = 'question';
      } else if (previousIsQuestion) {
        context = previousText;
        kind = 'question';
      } else if (currentText !== clean && contextCore(currentText) !== contextCore(clean)) {
        context = currentText;
        kind = 'sentence';
      }
      if (!context || context.length > NOTE_CONTEXT_MAX) return { text: '', kind: '' };
      if (contextCore(context) === contextCore(clean)) return { text: '', kind: '' };
      return { text: context, kind };
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
        const commonNode = range.commonAncestorContainer;
        const commonElement = commonNode && commonNode.nodeType === 1 ? commonNode : commonNode && commonNode.parentElement;
        if (!startElement || !startElement.closest || !endElement || !endElement.closest) return null;
        const startSource = startElement.closest('[data-text-interaction-source]');
        const endSource = endElement.closest('[data-text-interaction-source]');
        const source = startSource && endSource && startSource === endSource
          ? startSource
          : (commonElement && commonElement.closest ? commonElement.closest('[data-text-interaction-source]') : null);
        if (!source) return null;
        const row = source.closest('[data-chat-flow-kind]')
          || (commonElement && commonElement.closest ? commonElement.closest('[data-chat-flow-kind]') : null);
        if (!row || row.getAttribute('data-chat-flow-kind') !== 'assistant-step') return null;
        const keyed = source.closest('[data-chat-node-key]')
          || (row.closest ? row.closest('[data-chat-node-key]') : null);
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
        const context = noteContextAt(text, offset, quote);
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
        return {
          nodeKey, quote, prefix, suffix, offset,
          context: context.text, contextKind: context.kind,
          order: rowIndex * 1000000 + offset,
        };
      } catch (_error) {
        return null;
      }
    }

    const PICK_KIND_LABELS = {
      paragraph: 'note.pick.paragraph',
      listItem: 'note.pick.listItem',
      heading: 'note.pick.heading',
      quote: 'note.pick.quote',
      code: 'note.pick.code',
      cell: 'note.pick.cell',
      reply: 'note.pick.reply',
    };
    const pickKindLabel = (kind) => PICK_KIND_LABELS[kind] || PICK_KIND_LABELS.paragraph;

    /** The label used by the block picker for one semantic block. */
    function pickKindForBlock(block, source) {
      if (!block || block === source) return 'reply';
      const tag = String(block.tagName || '').toLowerCase();
      if (tag === 'li') return 'listItem';
      if (/^h[1-6]$/.test(tag)) return 'heading';
      if (tag === 'blockquote') return 'quote';
      if (tag === 'pre') return 'code';
      if (tag === 'td' || tag === 'th') return 'cell';
      return 'paragraph';
    }

    /**
     * Resolve the semantic block under a viewport point. Only assistant replies
     * are annotatable; inline controls and the annotation overlay are ignored.
     */
    function pickTargetAt(x, y, sessionId) {
      try {
        if (typeof document === 'undefined') return null;
        const root = noteChatRoot(sessionId);
        if (!root) return null;
        const element = document.elementFromPoint(x, y);
        if (!element || !root.contains(element)) return null;
        const flow = element.closest('[data-chat-flow]');
        if (!flow || !root.contains(flow)) return null;
        if (element.closest('.pp-pick-bar, .pp-note-bubble, .pp-note-layer, .pp-root, .pp-note-inline')) return null;
        const source = element.closest('[data-text-interaction-source]');
        if (!source || !root.contains(source)) return null;
        const row = source.closest('[data-chat-flow-kind]');
        if (!row || row.getAttribute('data-chat-flow-kind') !== 'assistant-step') return null;
        const keyed = source.closest('[data-chat-node-key]') || row.closest('[data-chat-node-key]');
        const nodeKey = keyed ? keyed.getAttribute('data-chat-node-key') || '' : '';
        if (!nodeKey) return null;
        let block = element.closest('p,li,h1,h2,h3,h4,h5,h6,blockquote,pre,td,th');
        if (block && (!source.contains(block) || block.closest('.pp-note-inline'))) block = null;
        if (!block) {
          // The container itself is only a valid target when it has no block
          // children. Otherwise the pointer is on whitespace between paragraphs
          // and the whole reply would be an unexpectedly large target.
          if (source.querySelector('p,li,h1,h2,h3,h4,h5,h6,blockquote,pre,td,th')) return null;
          block = source;
        }
        const raw = block.textContent || '';
        const quote = raw.trim();
        if (!quote) return null;
        return {
          block,
          source,
          keyed,
          nodeKey,
          kind: pickKindForBlock(block, source),
          quote,
        };
      } catch (_error) {
        return null;
      }
    }

    /** Build the same value anchor as a text selection, but for a whole block. */
    function captureElementAnchor(sessionId, target) {
      try {
        if (!target || !target.block || !target.source) return null;
        const raw = target.block.textContent || '';
        const quote = raw.trim();
        if (!quote) return null;
        const lead = raw.length - raw.trimStart().length;
        const base = target.block === target.source ? 0 : textOffsetIn(target.source, target.block, 0);
        const offset = base + lead;
        const text = target.source.textContent || '';
        const prefix = text.slice(Math.max(0, offset - 24), offset);
        const suffix = text.slice(offset + quote.length, offset + quote.length + 24);
        const context = noteContextAt(text, offset, quote);
        let rowIndex = 0;
        const scroll = noteChatRoot(sessionId);
        if (scroll) {
          const rows = scroll.querySelectorAll('[data-chat-node-key]');
          const at = Array.prototype.indexOf.call(rows, target.keyed);
          rowIndex = at >= 0 ? at : rows.length;
        }
        return {
          nodeKey: target.nodeKey,
          quote,
          prefix,
          suffix,
          offset,
          context: context.text,
          contextKind: context.kind,
          order: rowIndex * 1000000 + offset,
        };
      } catch (_error) {
        return null;
      }
    }

    /**
     * The annotation already anchored at this exact semantic block. Blocks in
     * one reply share a node key, so the block-start offset tells paragraphs
     * apart; the quote keeps a phrase note that starts at the block's first
     * character from counting as a whole-block note.
     */
    function blockNoteAt(items, sessionId, anchor) {
      if (!Array.isArray(items) || !anchor) return null;
      return items.find((note) => (
        note
        && note.sessionId === sessionId
        && note.nodeKey === anchor.nodeKey
        && Number(note.offset) === Number(anchor.offset)
        && note.quote === anchor.quote
      )) || null;
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
    /** The save-as-prompt step: make the prompt self-contained before filing it. */
    function NoteSaveSheet(props) {
      useLocaleTick();
      const draft = props.draft;
      const [title, setTitle] = useState(draft.title || '');
      const [body, setBody] = useState(draft.body || '');
      const [group, setGroup] = useState(draft.defaultGroup || (draft.choices[0] && draft.choices[0].value) || BUILTIN_GROUP.note);
      const [images, setImages] = useState(normalizeImages(draft.images));
      const { preview, openImage, closeImage } = useImagePreview();

      const close = () => props.onClose();
      const save = () => {
        const text = body.trim();
        if (!text && images.length === 0) {
          showToast(translate('status.emptyBody'), 'error');
          return;
        }
        const choice = (draft.choices || []).find((entry) => entry.value === group);
        poolActions.add({
          id: uid(),
          group,
          title: title.trim(),
          body,
          // The kind travels with the annotation's text: the sheet is the
          // fallback path, and it files the same prompt as the page editor.
          type: normalizePromptType(draft.type),
          images,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        const keep = normalizeSettings(pool.get().settings).noteKeepAfterStore !== false;
        const noteIds = Array.isArray(draft.noteIds) ? draft.noteIds : [];
        if (!keep) notesActions.removeMany(noteIds);
        else if (draft.markStored) {
          for (const id of noteIds) notesActions.patch(id, { promotedGroup: group, promotedAt: Date.now() });
        }
        showToast(translate('note.composeStored', {
          group: choice ? choice.label : translate('row.noCategory'),
        }), 'ok');
        if (typeof draft.onSaved === 'function') {
          try {
            draft.onSaved(choice);
          } catch (_error) {
            /* A cleanup failure must not undo the saved prompt. */
          }
        }
        close();
      };

      return h(
        'div',
        {
          className: 'pp-note-save-mask',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) close();
          },
        },
        h(
          'div',
          { className: 'pp-note-save-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': translate('note.composeStore') },
          h(
            'div',
            { className: 'pp-note-save-head' },
            h('strong', null, translate('note.composeStore')),
            h('button', { type: 'button', className: 'pp-note-save-x', title: translate('note.cancel'), onClick: close }, '✕'),
          ),
          h('input', {
            className: 'pp-note-input',
            value: title,
            placeholder: translate('row.titlePlaceholder'),
            onChange: (event) => setTitle(event.target.value),
          }),
          h('textarea', {
            className: 'pp-note-input pp-note-save-body',
            value: body,
            rows: 5,
            placeholder: translate('row.bodyPlaceholder'),
            onChange: (event) => setBody(event.target.value),
          }),
          h(
            'div',
            { className: 'pp-note-save-row' },
            h(
              'select',
              {
                className: 'pp-note-save-select',
                value: group,
                'aria-label': translate('row.classification'),
                onChange: (event) => setGroup(event.target.value),
              },
              (draft.choices || []).map((entry) => h('option', { key: entry.value, value: entry.value }, entry.label)),
            ),
          ),
          h(ImagePicker, {
            images,
            onChange: setImages,
            onError: (text) => showToast(text, 'error'),
            onOpen: openImage,
          }),
          h('div', { className: 'pp-note-save-hint' }, translate('note.save.contextWarning')),
          h(
            'div',
            { className: 'pp-note-save-actions' },
            h('button', { type: 'button', className: 'pp-note-btn', onClick: close }, translate('note.cancel')),
            h('button', { type: 'button', className: 'pp-note-btn pp-note-btn-primary', onClick: save }, translate('row.save')),
          ),
        ),
        h(ImageLightbox, { preview, onClose: closeImage }),
      );
    }

    /**
     * The hover picker. It reads the live transcript, keeps its highlight on a
     * semantic block, and puts the annotation editor right on that block: the
     * click adds the annotation and opens its bubble, so the type and the text
     * are chosen where the passage is. Picking stays on, so the next block is
     * one click away; only Escape or Done leaves it.
     */
    function NotePicker() {
      const pick = useNotePick();
      const pool = usePoolState();
      const pickKind = noteKind(normalizeSettings(pool.settings).pickKind).id;
      const pickKindRef = useRef(pickKind);
      pickKindRef.current = pickKind;
      const [count, setCount] = useState(0);
      const boxRef = useRef(null);
      const labelRef = useRef(null);
      const barRef = useRef(null);

      useEffect(() => {
        if (!pick.active || !pick.sessionId) return undefined;
        setCount(0);
        const html = document.documentElement;
        html.classList.add('pp-pick-cursor');
        const box = boxRef.current;
        const label = labelRef.current;
        let raf = 0;
        let lastX = -1;
        let lastY = -1;
        let suppressClickUntil = 0;
        let hovered = null;
        const closestOf = (node, selector) => (node && node.closest ? node.closest(selector) : null);
        const setHover = (block) => {
          if (hovered === block) return;
          if (hovered) hovered.classList.remove('pp-pick-hover');
          hovered = block || null;
          if (hovered) hovered.classList.add('pp-pick-hover');
        };
        const hide = () => {
          setHover(null);
          if (box) box.style.display = 'none';
          if (label) label.style.display = 'none';
        };
        const placeBar = () => {
          const element = barRef.current;
          if (!element) return;
          const seat = document.querySelector('[data-composer-seat]');
          const offset = seat ? Math.max(18, window.innerHeight - seat.getBoundingClientRect().top + 10) : 22;
          element.style.bottom = Math.round(offset) + 'px';
        };
        const placeText = (text, x, y) => {
          if (!label) return;
          label.textContent = text;
          label.style.display = 'block';
          label.style.left = Math.max(8, Math.min(window.innerWidth - 280, x)) + 'px';
          label.style.top = Math.max(8, Math.min(window.innerHeight - 26, y)) + 'px';
        };
        const draw = () => {
          raf = 0;
          if (!pick.active) return;
          const root = noteChatRoot(pick.sessionId);
          if (!root || lastX < 0 || lastY < 0) {
            hide();
            return;
          }
          const element = document.elementFromPoint(lastX, lastY);
          const flow = closestOf(element, '[data-chat-flow]');
          if (!element || !flow || !root.contains(flow) || closestOf(element, '.pp-pick-bar')) {
            hide();
            return;
          }
          const target = pickTargetAt(lastX, lastY, pick.sessionId);
          if (!target) {
            hide();
            return;
          }
          setHover(target.block);
          const rect = target.block.getBoundingClientRect();
          const left = Math.max(4, rect.left);
          const top = Math.max(4, rect.top);
          const right = Math.min(window.innerWidth - 4, rect.right);
          const bottom = Math.min(window.innerHeight - 4, rect.bottom);
          if (right <= left || bottom <= top) {
            hide();
            return;
          }
          if (box) {
            box.style.display = 'block';
            box.style.left = Math.round(left) + 'px';
            box.style.top = Math.round(top) + 'px';
            box.style.width = Math.round(right - left) + 'px';
            box.style.height = Math.round(bottom - top) + 'px';
          }
          const kind = translate(pickKindLabel(target.kind));
          const labelTop = rect.top >= 30 ? rect.top - 22 : Math.min(window.innerHeight - 26, rect.bottom + 4);
          placeText(translate('note.pick.meta', { kind, n: target.quote.length }), rect.left, labelTop);
        };
        const schedule = (x, y) => {
          lastX = x;
          lastY = y;
          if (!raf) raf = window.requestAnimationFrame(draw);
        };
        const onMove = (event) => {
          if (event.pointerType === 'touch') return;
          schedule(event.clientX, event.clientY);
        };
        const onScroll = () => {
          if (lastX >= 0) schedule(lastX, lastY);
        };
        const onResize = () => {
          placeBar();
          if (lastX >= 0) schedule(lastX, lastY);
        };
        const flowFor = (node) => {
          const flow = closestOf(node, '[data-chat-flow]');
          if (!flow) return null;
          const root = noteChatRoot(pick.sessionId);
          return root && root.contains(flow) ? flow : null;
        };
        /**
         * Open the annotation's editor on the passage itself. The bubble owns
         * the type and the text, so the sidebar can stay exactly as it is, and
         * picking stays on so the next block is one click away.
         */
        const editNote = (id, fresh) => {
          if (!id) return;
          noteFocus.set({ id, token: Date.now(), edit: true, fresh: fresh === true });
        };
        const onDown = (event) => {
          // The bubble is the editor now: its clicks belong to the editor, not
          // to the picker, and must never end picking or be cancelled here.
          if (closestOf(event.target, '.pp-note-layer')) return;
          const flow = flowFor(event.target);
          if (event.button === 2) {
            if (!flow) {
              notePickActions.stop();
              return;
            }
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            notePickActions.stop();
            return;
          }
          if (event.button !== 0) return;
          if (closestOf(event.target, '.pp-pick-bar')) return;
          if (!flow) {
            notePickActions.stop();
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          suppressClickUntil = Date.now() + 500;
          const target = pickTargetAt(event.clientX, event.clientY, pick.sessionId);
          if (!target) return;
          const anchor = captureElementAnchor(pick.sessionId, target);
          if (!anchor) {
            showToast(translate('note.pick.anchorFailed'), 'error');
            return;
          }
          const existing = blockNoteAt(notes.get().items, pick.sessionId, anchor);
          if (existing) {
            editNote(existing.id);
            return;
          }
          const id = uid();
          const now = Date.now();
          notesActions.add({
            ...anchor,
            id,
            sessionId: pick.sessionId,
            kind: pickKindRef.current,
            dx: 0,
            dy: 0,
            promotedGroup: '',
            promotedAt: 0,
            body: '',
            images: [],
            createdAt: now,
            updatedAt: now,
          });
          setCount((value) => value + 1);
          editNote(id, true);
        };
        const onClick = (event) => {
          if (Date.now() > suppressClickUntil) return;
          if (closestOf(event.target, '.pp-pick-bar')) return;
          if (!flowFor(event.target)) return;
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
        };
        const onKey = (event) => {
          if (event.key !== 'Escape') return;
          event.preventDefault();
          event.stopPropagation();
          notePickActions.stop();
        };
        const onPrevent = (event) => {
          if (closestOf(event.target, '.pp-pick-bar')) return;
          if (!flowFor(event.target)) return;
          event.preventDefault();
        };
        const onContext = (event) => {
          if (!flowFor(event.target)) return;
          event.preventDefault();
          event.stopPropagation();
        };
        placeBar();
        window.addEventListener('pointermove', onMove, true);
        window.addEventListener('pointerdown', onDown, true);
        window.addEventListener('click', onClick, true);
        window.addEventListener('keydown', onKey, true);
        window.addEventListener('contextmenu', onContext, true);
        window.addEventListener('selectstart', onPrevent, true);
        window.addEventListener('dragstart', onPrevent, true);
        window.addEventListener('resize', onResize);
        document.addEventListener('scroll', onScroll, true);
        return () => {
          setHover(null);
          html.classList.remove('pp-pick-cursor');
          if (raf) window.cancelAnimationFrame(raf);
          window.removeEventListener('pointermove', onMove, true);
          window.removeEventListener('pointerdown', onDown, true);
          window.removeEventListener('click', onClick, true);
          window.removeEventListener('keydown', onKey, true);
          window.removeEventListener('contextmenu', onContext, true);
          window.removeEventListener('selectstart', onPrevent, true);
          window.removeEventListener('dragstart', onPrevent, true);
          window.removeEventListener('resize', onResize);
          document.removeEventListener('scroll', onScroll, true);
        };
      }, [pick.active, pick.sessionId, pick.token]);

      if (!pick.active) return null;
      return h(
        React.Fragment,
        null,
        h('div', { key: 'pick-box', ref: boxRef, className: 'pp-pick-box', 'aria-hidden': 'true' }),
        h('div', { key: 'pick-label', ref: labelRef, className: 'pp-pick-label', 'aria-hidden': 'true' }),
        h(
          'div',
          { key: 'pick-bar', ref: barRef, className: 'pp-pick-bar', role: 'status' },
          h('span', { className: 'pp-pick-text' }, count > 0
            ? translate('note.pick.count', { n: count })
            : translate('note.pick.hint')),
          h('button', { type: 'button', className: 'pp-pick-btn pp-pick-primary', onClick: () => notePickActions.stop() }, translate('note.pick.done')),
        ),
      );
    }

    function NotesLayer() {
      useLocaleTick();
      const notesState = useNotesState();
      const view = useChatView();
      const draft = useNoteDraft();
      const focus = useNoteFocus();
      const prompt = useNotePrompt();
      const savePrompt = useNoteSave();
      const confirm = useNoteConfirm();
      const pool = usePoolState();
      const pick = useNotePick();
      const [editing, setEditing] = useState(null);
      const [body, setBody] = useState('');
      const [kind, setKind] = useState(NOTE_KIND_DEFAULT);
      const [missing, setMissing] = useState(false);
      const [anchorPoint, setAnchorPoint] = useState(null);
      const [images, setImages] = useState([]);
      const { preview, openImage, closeImage } = useImagePreview();
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
      const draftOpen = draftRef.current !== null;
      const highlightOn = !pool.settings || pool.settings.notesHighlight !== false;
      const highlightRef = useRef(highlightOn);
      highlightRef.current = highlightOn;
      // A pick may open a second bubble while the first one is still open; the
      // first one is committed through the latest render's save/cancel so no
      // keystroke is lost and no empty annotation is left behind.
      const editingRef = useRef(null);
      editingRef.current = editing;
      const bodyRef = useRef('');
      bodyRef.current = body;
      const imagesRef = useRef([]);
      imagesRef.current = images;
      // The badge of the open bubble follows its pending kind, like its
      // underline does, so switching the kind repaints the mark at once.
      const kindRef = useRef(kind);
      kindRef.current = kind;
      const saveRef = useRef(null);
      const cancelRef = useRef(null);
      // The annotation this pick just created, if any. Closing its bubble
      // without saving discards it; an explicit save keeps it even when empty.
      const freshIdRef = useRef('');
      const commitEditing = () => {
        if (!editingRef.current) return;
        if (String(bodyRef.current || '').trim() || imagesRef.current.length > 0) saveRef.current();
        else cancelRef.current();
      };

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
          chip.style.setProperty('--pp-kind', meta.color);
          chip.setAttribute('data-text', shown);
          chip.setAttribute('data-version', NOTE_CHIP_VERSION);
          chip.setAttribute('role', 'button');
          chip.setAttribute('tabindex', '0');
          const chipLabel = shown ? `${translate(meta.label)}：${shown}` : translate(meta.label);
          chip.setAttribute('aria-label', chipLabel);
          const icon = document.createElement('span');
          icon.className = 'pp-note-inline-icon';
          icon.innerHTML = iconMarkup(meta.icon);
          const text = document.createElement('span');
          text.className = 'pp-note-inline-text';
          // Keep the chip out of textContent so block quotes and anchors never
          // pick up its label; the visible text comes from the data attribute.
          text.setAttribute('data-text', shown);
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
          const pending = editingRef.current && editingRef.current.id === note.id ? kindRef.current : note.kind;
          const meta = noteKind(pending);
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
      // The painted passages, kept for the click that has to find its note: the
      // highlight sits over ordinary text, so only the caret point can say which
      // annotation a click on the words belongs to.
      const spotsRef = useRef([]);

      const measure = useCallback(() => {
        const list = notesRef.current;
        const root = noteChatRoot(sessionId);
        const draftNote = draftRef.current;
        // A new note has no stored record yet, so the draft must keep the
        // measure alive on its own; otherwise the first bubble would not paint
        // its passage until Save.
        if (!root || !noteHighlightActive(list.length, draftNote)) {
          applyNoteHighlights([]);
          spotsRef.current = [];
          return;
        }
        const items = [];
        for (const note of list) {
          const hit = resolveNote(note, root);
          if (hit) items.push({ id: note.id, range: hit.range, kind: note.kind });
        }
        // The open bubble's passage is underlined immediately, following the
        // pending kind until Save or Cancel.
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
        // Saved notes only: a draft without an id opens through its own anchor,
        // and an empty id would make the click map hit the wrong entry.
        spotsRef.current = items.filter((item) => item.id);
      }, [sessionId]);

      useEffect(() => {
        if (typeof document === 'undefined') return undefined;
        const root = noteChatRoot(sessionId);
        if (!root || !noteHighlightActive(notesRef.current.length, draftOpen)) {
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
      }, [measure, sessionId, sessionNotes.length, draftOpen]);

      // Adding, editing or deleting a note redraws the inline badges; the text
      // itself never changes.
      useEffect(() => {
        syncRef.current();
      }, [notesState.items, sessionId]);

      // A kind switched in the open bubble repaints that badge immediately;
      // closing the bubble without saving puts the stored kind back.
      useEffect(() => {
        syncRef.current();
      }, [editing, kind]);

      useEffect(() => {
        if (!draft.anchor || (draft.sessionId && draft.sessionId !== sessionId)) return;
        commitEditing();
        setEditing({ id: '', anchor: draft.anchor, body: '' });
        setBody('');
        setKind(NOTE_KIND_IDS.indexOf(draft.kind) >= 0 ? draft.kind : NOTE_KIND_DEFAULT);
        setImages([]);
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
        noteDraft.set({ anchor: null, sessionId: '', token: 0, kind: '' });
      }, [draft.anchor, draft.sessionId, draft.token, draft.kind, sessionId]);

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
          if (element && element.closest && element.closest('.pp-note-prompt, .pp-modal')) return;
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
        // Clicking the passage that is already being written keeps the text
        // that is on the way instead of reloading the saved copy.
        if (wantsEditor && editingRef.current && editingRef.current.id === note.id) return;
        commitEditing();
        // Only a picker-created note is provisional; notes that already existed
        // keep their empty badge when the bubble closes.
        freshIdRef.current = wantsEditor && focus.fresh === true ? note.id : '';
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
        // The bubble opens on the annotation's own kind, so its chips, its
        // underline and the inline mark all start from the same value.
        setKind(noteKind(note.kind).id);
        setImages(normalizeImages(note.images));
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
        if (editingRef.current && editingRef.current.id === id) return;
        commitEditing();
        freshIdRef.current = '';
        setEditing({ id, anchor: null, body: note.body });
        setBody(note.body);
        setKind(noteKind(note.kind).id);
        setImages(normalizeImages(note.images));
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

      /**
       * The annotated words open the bubble too. The highlight is painted over
       * the host's own text, so the click is mapped back through the caret point;
       * the 200 ms grace lets a double-click select words instead of opening.
       */
      const openNoteRef = useRef(openNote);
      openNoteRef.current = openNote;
      const pickRef = useRef(pick.active);
      pickRef.current = pick.active;
      useEffect(() => {
        if (typeof document === 'undefined') return undefined;
        const caretAt = (x, y) => {
          if (typeof document.caretPositionFromPoint === 'function') {
            const spot = document.caretPositionFromPoint(x, y);
            return spot && spot.offsetNode ? { node: spot.offsetNode, offset: spot.offset } : null;
          }
          if (typeof document.caretRangeFromPoint === 'function') {
            const range = document.caretRangeFromPoint(x, y);
            return range ? { node: range.startContainer, offset: range.startOffset } : null;
          }
          return null;
        };
        let timer = 0;
        const onClick = (event) => {
          if (event.defaultPrevented || event.button !== 0) return;
          if (pickRef.current) return;
          const target = event.target;
          if (!(target instanceof Element)) return;
          if (target.closest('.pp-note-inline, .pp-note-layer, .pp-root, a, button, input, textarea, select, [contenteditable="true"]')) return;
          if (timer) window.clearTimeout(timer);
          const x = event.clientX;
          const y = event.clientY;
          timer = window.setTimeout(() => {
            timer = 0;
            const selection = window.getSelection();
            if (selection && !selection.isCollapsed && String(selection).trim()) return;
            const caret = caretAt(x, y);
            if (!caret) return;
            for (const spot of spotsRef.current) {
              let inside = false;
              try {
                inside = spot.range.comparePoint(caret.node, caret.offset) === 0;
              } catch (_error) {
                inside = false;
              }
              if (inside) {
                openNoteRef.current(spot.id);
                return;
              }
            }
          }, 200);
        };
        document.addEventListener('click', onClick);
        return () => {
          if (timer) window.clearTimeout(timer);
          document.removeEventListener('click', onClick);
        };
      }, []);

      const cancelEditing = () => {
        const current = editing;
        const freshId = freshIdRef.current;
        freshIdRef.current = '';
        if (current && current.id) {
          const note = notesRef.current.find((entry) => entry.id === current.id);
          // A picked passage that never received text, images or an explicit
          // save is not an annotation: closing its bubble discards it instead
          // of leaving an empty badge in the transcript.
          if (freshId === current.id && note
            && !String(note.body || '').trim()
            && normalizeImages(note.images).length === 0) {
            notesActions.remove(current.id);
          }
        }
        setEditing(null);
        setBody('');
        setImages([]);
        setMissing(false);
        setAnchorPoint(null);
      };

      const save = () => {
        if (!editing) return;
        const value = clampNoteBody(body.trim());
        const keptImages = normalizeImages(images);
        freshIdRef.current = '';
        if (editing.id) {
          // An empty save is a glyph-only annotation, not a cancel: the pick
          // stays in the list and the badge carries its kind mark alone.
          notesActions.patch(editing.id, { body: value, kind, images: keptImages });
        } else if (editing.anchor) {
          notesActions.add({
            id: uid(),
            sessionId,
            nodeKey: editing.anchor.nodeKey,
            quote: editing.anchor.quote,
            prefix: editing.anchor.prefix,
            suffix: editing.anchor.suffix,
            offset: editing.anchor.offset,
            context: editing.anchor.context,
            contextKind: editing.anchor.contextKind,
            order: editing.anchor.order,
            kind,
            body: value,
            images: keptImages,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
        setEditing(null);
        setBody('');
        setImages([]);
        setAnchorPoint(null);
      };
      saveRef.current = save;
      cancelRef.current = cancelEditing;

      const removeEditing = () => {
        if (!editing || !editing.id) return;
        notesActions.remove(editing.id);
        setEditing(null);
        setBody('');
        setImages([]);
        setAnchorPoint(null);
      };

      // Clicking anywhere else saves a note with text or images and drops an
      // otherwise empty draft.
      useEffect(() => {
        if (!editing || typeof document === 'undefined') return undefined;
        const onDown = (event) => {
          const bubble = bubbleRef.current;
          if (bubble && event.target instanceof Node && bubble.contains(event.target)) return;
          const element = event.target instanceof Element ? event.target : null;
          if (element && element.closest && element.closest('.pp-note-prompt')) return;
          if (body.trim() || images.length > 0) save();
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
            // The quote can now take several lines; cap the card to the room
            // below its top edge so it scrolls instead of leaving the viewport.
            const maxHeight = Math.max(180, Math.round(viewportHeight - top - margin));
            return {
              left: Math.round(Math.max(margin, Math.min(left, viewportWidth - width - margin))) + 'px',
              top: Math.round(top) + 'px',
              maxHeight: maxHeight + 'px',
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

      return h(
        'div',
        { className: 'pp-note-layer' },
        h('style', { key: 'css' }, NOTES_CSS),
        h(NotePicker, { key: 'picker' }),
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
        confirm.open
          ? h(NoteDeleteConfirm, { key: 'confirm', rect: confirm.surfaceRect })
          : null,
        editing
          ? h(
              'div',
              {
                key: 'bubble',
                ref: bubbleRef,
                className: 'pp-note-bubble',
                style: { ...bubbleStyle, '--pp-bubble-kind': noteKind(kind).color },
                'data-kind': kind,
                onPointerDown: (event) => event.stopPropagation(),
              },
              h(
                'div',
                { className: 'pp-note-bubble-quote' },
                h('span', { className: 'pp-note-bubble-quote-icon', 'aria-hidden': true }, icon(noteKind(kind).icon)),
                noteQuoteText(editingNote ? editingNote.quote : editing.anchor.quote, 80),
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
                    // The same sentence the review prompt sends for this kind, so
                    // hovering a chip says what the model will be asked to do.
                    title: translate(REVIEW_GROUP_PROMPTS[entry.id]),
                    'data-active': kind === entry.id ? 'true' : 'false',
                    style: { '--pp-kind': entry.color },
                    onClick: () => {
                      setKind(entry.id);
                      // While picking, the type chosen here is the one the next
                      // passage starts with, so a run of the same kind stays one
                      // click per passage.
                      if (pick.active) poolActions.setSetting('pickKind', entry.id);
                    },
                  },
                  h('span', { className: 'pp-note-kind-icon', 'aria-hidden': true }, icon(entry.icon)),
                  translate(entry.label),
                )),
              ),
              h('textarea', {
                className: 'pp-note-input',
                value: body,
                rows: 2,
                placeholder: translate('note.placeholder'),
                autoFocus: true,
                onChange: (event) => {
                  const next = event.target.value;
                  setBody((current) => mergeNoteBodyInput(current, next));
                },
                onPaste: (event) => {
                  const files = imageFilesFromClipboard(event);
                  if (files.length === 0) return;
                  event.preventDefault();
                  appendImageAssets(files, images, (text) => showToast(text, 'error')).then(setImages);
                },
                onKeyDown: onEditorKeyDown,
              }),
              h(ImagePicker, {
                images,
                onChange: setImages,
                onOpen: openImage,
                onError: (text) => showToast(text, 'error'),
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
                  { key: 'limit', className: 'pp-note-limit', title: translate('note.limitHint') },
                  h('span', { className: 'pp-note-limit-count' }, `${noteBodyWidth(body.trim())}/${NOTE_BODY_MAX}`),
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
        savePrompt.open
          ? h(NoteSaveSheet, {
              key: savePrompt.token,
              draft: savePrompt,
              onClose: closeNoteSave,
            })
          : null,
        h(ImageLightbox, { key: 'lightbox', preview, onClose: closeImage }),
      );
    }

    /**
     * The session's annotations, shown as a tab inside both prompt-pool views.
     * A note can be promoted into a pool group (defaulting to this session's
     * workspace); the caller keeps the compose path: the composer panel inserts
     * directly, the sidebar page asks the panel over the bridge.
     */
    function NotesView(props) {
      useLocaleTick();
      const list = Array.isArray(props.notes) ? props.notes : [];
      const sessionId = typeof props.sessionId === 'string' ? props.sessionId : '';
      const categories = Array.isArray(props.categories) ? props.categories : [];
      const workspaceList = Array.isArray(props.workspaces) ? props.workspaces : [];
      const currentWorkspaceId = typeof props.currentWorkspaceId === 'string' ? props.currentWorkspaceId : '';
      const filter = typeof props.filter === 'string' ? props.filter.trim().toLowerCase() : '';
      const selection = useNoteSelection();
      const reviewState = useNoteReview();
      const fresh = useNoteFresh();
      const reviewMode = props.reviewMode === true;
      const freshRows = useRef(new Map());
      const [editId, setEditId] = useState('');
      const [editBody, setEditBody] = useState('');
      const [editKind, setEditKind] = useState(NOTE_KIND_DEFAULT);
      const [editImages, setEditImages] = useState([]);
      const [pendingSwitch, setPendingSwitch] = useState(null);
      const [pendingDelete, setPendingDelete] = useState('');
      const immediateFor = (note) => noteReviewImmediate(reviewState, note);
      const { preview, openImage, closeImage } = useImagePreview();
      const picked = notesForSelection(list, sessionId, selection);
      const matches = (note) => note.id === editId
        || !filter
        || String(note.quote || '').toLowerCase().indexOf(filter) >= 0
        || String(note.body || '').toLowerCase().indexOf(filter) >= 0
        || translate(noteKind(note.kind).label).toLowerCase().indexOf(filter) >= 0;

      // The newest record is revealed once, then the marker fades out. The
      // transcript order stays the source of truth for the list.
      useEffect(() => {
        if (!fresh.id) return undefined;
        const token = fresh.token;
        const timer = window.setTimeout(() => {
          if (noteFresh.get().token === token) noteFresh.set({ id: '', sessionId: '', token: 0, at: 0 });
        }, Math.max(0, NOTE_FRESH_MS - (Date.now() - fresh.at)));
        return () => window.clearTimeout(timer);
      }, [fresh.id, fresh.token, fresh.at]);

      useEffect(() => {
        if (!fresh.id || fresh.sessionId !== sessionId) return;
        if (Date.now() - fresh.at > NOTE_FRESH_MS) return;
        const target = list.find((note) => note.id === fresh.id);
        if (!target || !matches(target)) return;
        const row = freshRows.current.get(fresh.id);
        if (row && typeof row.scrollIntoView === 'function') {
          row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }, [fresh.id, fresh.token, sessionId]);

      const flash = (text, kind, undo) => showToast(text, kind, undo);
      const keepInserted = normalizeSettings(props.settings).noteKeepAfterInsert !== false;
      /** An inserted mark leaves the list unless the user keeps them; Undo puts it back. */
      const retireInserted = (used) => {
        if (keepInserted) return 0;
        const gone = (Array.isArray(used) ? used : []).filter((note) => note && note.id);
        if (gone.length === 0) return 0;
        notesActions.removeMany(gone.map((note) => note.id));
        flash(translate('note.insertedAndRemoved'), 'info', () => notesActions.restore(gone));
        return gone.length;
      };

      const closeEdit = () => {
        setEditId('');
        setEditBody('');
        setEditKind(NOTE_KIND_DEFAULT);
        setEditImages([]);
      };
      const beginEdit = (note) => {
        if (reviewMode || !note) return;
        setEditId(note.id);
        setEditBody(note.body || '');
        setEditKind(noteKind(note.kind).id);
        setEditImages(normalizeImages(note.images));
      };
      const cancelEdit = () => {
        const note = list.find((entry) => entry.id === editId);
        if (note && editImages.length > 0) discardUnsavedImages({ images: editImages }, note);
        closeEdit();
      };
      const saveEdit = (note) => {
        if (!note) return;
        notesActions.patch(note.id, {
          kind: editKind,
          body: clampNoteBody(editBody.trim()),
          images: normalizeImages(editImages),
        });
        closeEdit();
      };

      /** True when the open editor differs from the saved annotation. */
      const editChanged = (note) => {
        if (!note) return false;
        const imagesOf = (value) => normalizeImages(value).map((entry) => entry.id).join('|');
        return editBody !== (note.body || '')
          || editKind !== noteKind(note.kind).id
          || imagesOf(editImages) !== imagesOf(note.images);
      };

      /** Opening another annotation must not silently drop the current edit. */
      const requestBeginEdit = (note) => {
        if (reviewMode || !note) return;
        if (editId === note.id) return;
        if (editId) {
          const current = list.find((entry) => entry.id === editId);
          if (current && editChanged(current)) {
            setPendingSwitch(note);
            return;
          }
          cancelEdit();
        }
        beginEdit(note);
      };

      const settleSwitch = (action) => {
        const target = pendingSwitch;
        if (!target) return;
        setPendingSwitch(null);
        if (action === 'stay') return;
        if (action === 'save') {
          const current = list.find((entry) => entry.id === editId);
          if (current) saveEdit(current);
          else closeEdit();
        } else {
          cancelEdit();
        }
        const fresh = list.find((entry) => entry.id === target.id);
        if (fresh) beginEdit(fresh);
      };

      const compose = () => {
        if (picked.length === 0) {
          flash(translate('note.noneSelected'), 'error');
          return;
        }
        let ok = false;
        try {
          ok = props.onCompose(picked) === true;
        } catch (_error) {
          ok = false;
        }
        if (!ok) {
          flash(translate('note.insertFailed'), 'error');
          return;
        }
        if (retireInserted(picked) === 0) flash(translate('note.inserted'), 'ok');
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
          images: imagesForNotes([note]),
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

      /** Compose the checked annotations into one prompt and file it in a group. */
      const storePrompt = (group, snapshot) => {
        const chosen = Array.isArray(snapshot) ? snapshot : picked;
        if (chosen.length === 0) {
          flash(translate('note.noneSelected'), 'error');
          return;
        }
        const text = composeNotesReply(chosen);
        poolActions.add({
          id: uid(),
          group,
          title: draftTitle(text),
          body: text,
          images: imagesForNotes(chosen),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        if (normalizeSettings(props.settings).noteKeepAfterStore === false) {
          notesActions.removeMany(chosen.map((note) => note.id));
        }
        flash(translate('note.composeStored', { group: labelOfGroup(group) }), 'ok');
      };

      /** Open the explicit save step with the current draft. */
      const openPrompt = (target) => {
        const notes = target && target.kind === 'note' && target.note ? [target.note] : picked;
        if (notes.length === 0) {
          flash(translate('note.noneSelected'), 'error');
          return;
        }
        const single = target && target.kind === 'note' && target.note ? target.note : null;
        const text = single ? composeNotePrompt(single) : composeNotesReply(notes);
        // Filing is an add-to-the-pool act, so on a host with the sidebar page
        // it lands there: the page's own editor opens with the draft already
        // written, instead of stacking a sheet over the annotations. The sheet
        // remains the fallback (composer panel hosts, no workspace, or a draft
        // the page is already holding).
        const filed = currentWorkspaceId && !pageDraftOpen
          ? openPageView('workspace', true, {
            // Filing never invents a title: 【原文】 and 【批注】 already say what
            // the two parts are, and a blank title keeps the prompt pasteable as
            // it stands — whether it is one annotation or a reviewed batch.
            title: '',
            body: text,
            // The prompt wears the annotation's own kind, so a filed 【批注】 and
            // the mark it came from read the same way in the pool.
            type: promptTypeForNotes(notes),
            images: imagesForNotes(notes),
            // The annotation retires when the page saves the draft, by the same
            // rule the sheet uses; cancelling the draft leaves it in place.
            source: {
              noteIds: notes.map((note) => note.id),
              markStored: single !== null,
            },
          })
          : false;
        if (filed) return;
        openNoteSave({
          noteIds: notes.map((note) => note.id),
          markStored: single !== null,
          title: '',
          body: text,
          type: promptTypeForNotes(notes),
          images: imagesForNotes(notes),
          choices: ordered,
          defaultGroup: preferred,
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
        if (!ok) {
          flash(translate('note.insertFailed'), 'error');
          return;
        }
        if (retireInserted([note]) === 0) flash(translate('note.inserted'), 'ok');
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
                      {
                        key: 'compose-store',
                        type: 'button',
                        className: 'pp-note-btn pp-note-btn-primary',
                        title: picked.length > 0 ? translate('note.composeStoreHint') : translate('note.noneSelected'),
                        disabled: picked.length === 0,
                        onClick: (event) => openPrompt({ kind: 'reply', notes: picked }, event),
                      },
                      translate('note.composeStore'),
                    ),
                    h('button', {
                      key: 'compose',
                      type: 'button',
                      className: 'pp-note-btn',
                      title: picked.length > 0 ? translate('note.composeHint') : translate('note.noneSelected'),
                      disabled: picked.length === 0,
                      onClick: compose,
                    }, translate('note.compose')),
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
          list.map((note) => {
            if (!matches(note)) return null;
            const editing = !reviewMode && editId === note.id;
            const meta = noteKind(editing ? editKind : note.kind);
            const isFresh = fresh.id === note.id
              && (!fresh.sessionId || fresh.sessionId === sessionId)
              && Date.now() - fresh.at < NOTE_FRESH_MS;
            return h(
              'div',
              {
                className: 'pp-notes-row',
                key: note.id,
                ref: (node) => {
                  if (node) freshRows.current.set(note.id, node);
                  else freshRows.current.delete(note.id);
                },
                'data-note-id': note.id,
                'data-promoted': note.promotedGroup ? 'true' : undefined,
                'data-editing': editing ? 'true' : undefined,
                'data-fresh': isFresh ? 'true' : undefined,
              },
              reviewMode
                ? h('input', {
                    type: 'checkbox',
                    className: 'pp-note-check pp-notes-review-check',
                    checked: noteSelected(selection, sessionId, note.id),
                    'aria-label': translate('note.review.select'),
                    onChange: () => toggleNoteSelected(sessionId, note.id),
                  })
                : null,
              editing
                ? null
                : h(RowActionIcon, {
                    name: 'locate',
                    label: translate('note.locate'),
                    onClick: () => locate(note),
                  }),
              h(
                'div',
                { className: 'pp-notes-main' },
                editing
                  ? null
                  : h(
                      'div',
                      { className: 'pp-notes-quote', title: note.quote },
                      h(TypeMark, {
                        name: meta.icon,
                        title: translate(meta.label),
                        tone: meta.color,
                      }),
                      h('span', { className: 'pp-notes-quote-text' }, noteQuoteText(note.quote)),
                      isFresh ? h('span', { className: 'pp-notes-fresh' }, translate('note.justAdded')) : null,
                      note.promotedGroup
                        ? h('span', { className: 'pp-notes-tag' }, translate('note.stored', { group: labelOfGroup(note.promotedGroup) }))
                        : null,
                    ),
                editing
                  ? h(
                      'div',
                      {
                        className: 'pp-edit',
                        'data-domain': 'annotations',
                        onClick: (event) => event.stopPropagation(),
                      },
                      h(
                        'div',
                        { className: 'pp-edit-title' },
                        h(TypeMark, {
                          name: meta.icon,
                          title: translate(meta.label),
                          tone: meta.color,
                        }),
                        h('span', { className: 'pp-edit-quote', title: note.quote }, noteQuoteText(note.quote)),
                      ),
                      editorKinds({
                        entries: NOTE_KINDS,
                        value: editKind,
                        label: translate('row.type'),
                        onPick: (id) => setEditKind(id),
                      }),
                      h(
                        'div',
                        {
                          className: 'pp-edit-body',
                          'data-has-images': editImages.length > 0 ? 'true' : undefined,
                        },
                        editImages.length > 0
                          ? h(
                              'div',
                              { className: 'pp-edit-attachments' },
                              h(ImageStrip, {
                                images: editImages,
                                onRemove: (image) => setEditImages((current) => current.filter((entry) => entry.id !== image.id)),
                                onOpen: openImage,
                              }),
                            )
                          : null,
                        h('textarea', {
                          className: 'pp-note-input pp-edit-input',
                          value: editBody,
                          rows: 4,
                          autoFocus: true,
                          placeholder: translate('note.placeholder'),
                          onChange: (event) => setEditBody(clampNoteBody(event.target.value)),
                          onPaste: (event) => {
                            const files = imageFilesFromClipboard(event);
                            if (files.length === 0) return;
                            event.preventDefault();
                            appendImageAssets(files, editImages, (text) => flash(text, 'error'))
                              .then((images) => setEditImages(normalizeImages(images)));
                          },
                          onKeyDown: (event) => {
                            if (event.key === 'Escape') {
                              event.preventDefault();
                              event.stopPropagation();
                              cancelEdit();
                            } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                              event.preventDefault();
                              event.stopPropagation();
                              saveEdit(note);
                            }
                          },
                        }),
                        h(
                          'div',
                          { className: 'pp-edit-tools' },
                          h(ImagePicker, {
                            images: editImages,
                            compact: true,
                            onChange: (images) => setEditImages(normalizeImages(images)),
                            onOpen: openImage,
                            onError: (text) => flash(text, 'error'),
                          }),
                        ),
                      ),
                      h(
                        'div',
                        { className: 'pp-edit-meta' },
                        h('span', { className: 'pp-edit-hint' }, translate('note.limitHint')),
                        h(
                          'span',
                          {
                            className: 'pp-edit-count',
                            'data-near': noteBodyWidth(editBody) >= NOTE_BODY_MAX * 0.9 && noteBodyWidth(editBody) < NOTE_BODY_MAX ? 'true' : undefined,
                            'data-full': noteBodyWidth(editBody) >= NOTE_BODY_MAX ? 'true' : undefined,
                          },
                          `${noteBodyWidth(editBody)} / ${NOTE_BODY_MAX}`,
                        ),
                      ),
                      h(
                        'div',
                        { className: 'pp-edit-actions' },
                        h('span', { className: 'pp-grow' }),
                        h('button', { type: 'button', className: 'pp-mini', onClick: cancelEdit }, translate('note.cancel')),
                        h('button', { type: 'button', className: 'pp-primary', onClick: () => saveEdit(note) }, translate('note.save')),
                      ),
                    )
                  : h('div', {
                      className: 'pp-notes-text',
                      'data-editable': reviewMode ? undefined : 'true',
                      'data-empty': !note.body ? 'true' : undefined,
                      title: reviewMode ? undefined : translate('note.edit'),
                      onClick: reviewMode ? undefined : () => requestBeginEdit(note),
                    }, note.body || translate('note.emptyBody')),
                !editing && note.images && note.images.length > 0
                  ? h(ImageStrip, { images: note.images, compact: true, max: 4, onOpen: openImage })
                  : null,
                reviewMode && note.kind === 'todo'
                  ? h(
                      'div',
                      { className: 'pp-review-todo-choice pp-notes-review-todo', role: 'radiogroup', 'aria-label': translate('note.kind.todo') },
                      h(
                        'label',
                        { className: 'pp-review-todo-option', 'data-active': immediateFor(note) ? 'true' : 'false' },
                        h('input', {
                          type: 'radio',
                          name: 'pp-note-review-todo-' + note.id,
                          value: 'execute',
                          checked: immediateFor(note),
                          onChange: () => setReviewTodoMode(sessionId, note, 'execute'),
                        }),
                        h('span', null, translate('note.review.todo.execute')),
                      ),
                      h(
                        'label',
                        { className: 'pp-review-todo-option', 'data-active': !immediateFor(note) ? 'true' : 'false' },
                        h('input', {
                          type: 'radio',
                          name: 'pp-note-review-todo-' + note.id,
                          value: 'prompt',
                          checked: !immediateFor(note),
                          onChange: () => setReviewTodoMode(sessionId, note, 'prompt'),
                        }),
                        h('span', null, translate('note.review.todo.prompt')),
                      ),
                    )
                  : reviewMode && REVIEW_IMMEDIATE_LABELS[note.kind]
                    ? h(
                        'label',
                        { className: 'pp-review-exec pp-notes-review-exec', 'data-active': immediateFor(note) ? 'true' : 'false' },
                        h('input', {
                          type: 'checkbox',
                          checked: immediateFor(note),
                          onChange: () => setReviewImmediate(sessionId, note),
                        }),
                        h('span', null, translate(REVIEW_IMMEDIATE_LABELS[note.kind])),
                      )
                    : null,
              ),
              reviewMode || editing
                ? null
                : h(
                    'div',
                    { className: 'pp-row-actions' },
                    h(RowActionIcon, { name: 'insert', label: translate('note.insert'), onClick: () => insertNote(note) }),
                    h(RowActionIcon, { name: 'store', label: translate('note.store'), onClick: () => openPrompt({ kind: 'note', note }) }),
                    h(RowActionIcon, { name: 'trash', label: translate('note.delete'), danger: true, onClick: () => setPendingDelete(note.id) }),
                  ),
            );
          }),
        ),
        list.length === 0
          ? h(EmptyState, { key: 'intro', iconName: 'annotation', className: 'pp-notes-empty', text: translate('note.emptyIntro') })
          : filter && !list.some(matches)
            ? h(EmptyState, { key: 'empty', iconName: 'annotation', className: 'pp-notes-empty', text: translate('note.empty') })
            : null,
        h(ImageLightbox, { key: 'lightbox', preview, onClose: closeImage }),
        pendingDelete
          ? h(NoteDeleteConfirm, {
              key: 'delete',
              onCancel: () => setPendingDelete(''),
              onConfirm: () => {
                notesActions.remove(pendingDelete);
                setPendingDelete('');
              },
            })
          : null,
        pendingSwitch && list.some((entry) => entry.id === pendingSwitch.id)
          ? h(UnsavedSwitchDialog, {
              onCancel: () => settleSwitch('stay'),
              onDiscard: () => settleSwitch('discard'),
              onSave: () => settleSwitch('save'),
            })
          : null,
      );
    }

    // The context menu is mounted after the contextmenu gesture; capture the
    // anchor while the live selection still exists, then hand it to the menu.
    let pendingNoteAnchor = null;

    /**
     * The bottom review card: generate one prompt from the notes checked in the
     * annotation tab, let the user edit it, then send or save it. The note list
     * and its review controls live in the tab; this card is only the composer.
     */
    function ReviewPromptCard(props) {
      useLocaleTick();
      const sentNotes = Array.isArray(props.sentNotes) ? props.sentNotes : [];
      const parkedNotes = Array.isArray(props.parkedNotes) ? props.parkedNotes : [];
      const selectedNotes = Array.isArray(props.selectedNotes) ? props.selectedNotes : [];
      const immediateIds = Array.isArray(props.immediateIds) ? props.immediateIds : [];
      const totalCount = Number(props.totalCount) || 0;
      const canSelectAll = totalCount > selectedNotes.length;
      const canClear = selectedNotes.length > 0;
      const processing = props.processing === true;
      const [batchId] = useState(() => newBatchId());
      const [draft, setDraft] = useState(null);
      const [stale, setStale] = useState(false);
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState('');
      const images = imagesForNotes(sentNotes);
      const generated = buildReviewPrompt(sentNotes, images, immediateIds);
      const signature = sentNotes
        .map((note) => note.id + ':' + note.kind + (immediateIds.indexOf(note.id) >= 0 ? '!' : ''))
        .join('|');
      const lastSignature = useRef(signature);
      const lastGenerated = useRef(generated);
      useEffect(() => {
        if (lastSignature.current === signature) return;
        const previous = lastGenerated.current;
        lastSignature.current = signature;
        lastGenerated.current = generated;
        if (draft == null || draft === previous) {
          setDraft(null);
          setStale(false);
        } else {
          setStale(true);
        }
      }, [signature, generated, draft]);
      const text = draft == null ? generated : draft;
      const canSend = sentNotes.length > 0 && text.trim() !== '';
      const canPark = sentNotes.length === 0 && parkedNotes.length > 0;
      const payload = () => ({
        batchId,
        sessionId: props.sessionId,
        text,
        images,
        noteIds: sentNotes.map((note) => note.id),
        parkedIds: parkedNotes.map((note) => note.id),
        immediateIds,
      });
      const submit = async (action) => {
        if (busy || !action) return;
        setBusy(true);
        setError('');
        try {
          const result = await action(payload());
          if (!result || result.ok !== true) {
            setBusy(false);
            setError((result && result.reason) || translate('note.review.failed', { reason: '?' }));
          }
        } catch (errorValue) {
          setBusy(false);
          setError(String((errorValue && errorValue.message) || errorValue));
        }
      };
      const regenerate = () => {
        setDraft(null);
        setStale(false);
        lastSignature.current = signature;
        lastGenerated.current = generated;
      };
      return h(
        'div',
        { className: 'pp-notes pp-notes-embedded pp-review' },
        h('style', { key: 'css' }, NOTES_CSS),
        h(
          'div',
          { className: 'pp-review-top' },
          h(
            'div',
            { className: 'pp-review-head' },
            h('button', {
              type: 'button',
              className: 'pp-review-close pp-review-toggle',
              title: translate('note.review.collapse'),
              'aria-label': translate('note.review.collapse'),
              onClick: props.onClose,
            }, icon('chevronDown')),
            h(
              'div',
              { className: 'pp-review-title' },
              h(
                'div',
                { className: 'pp-review-headline' },
                h('strong', null, translate('note.review.title')),
                processing
                  ? h('span', { key: 'selected', className: 'pp-review-chip' }, translate('note.review.selected', { n: selectedNotes.length }))
                  : null,
                processing && immediateIds.length > 0
                  ? h('span', { key: 'immediate', className: 'pp-review-chip pp-review-chip-accent' }, translate('note.review.immediateCount', { n: immediateIds.length }))
                  : null,
                // Selection tools sit with the count they act on, and only when
                // they can do something: no Select all when everything is
                // checked, no Clear when nothing is.
                processing && (canSelectAll || canClear)
                  ? h(
                      'span',
                      { key: 'tools', className: 'pp-review-select-actions pp-review-select-tools' },
                      canSelectAll
                        ? h('button', {
                            key: 'all',
                            type: 'button',
                            className: 'pp-note-link pp-review-select-link',
                            onClick: props.onSelectAll,
                          }, translate('note.review.selectAll'))
                        : null,
                      canSelectAll && canClear
                        ? h('span', { key: 'dot', className: 'pp-review-select-dot', 'aria-hidden': 'true' }, '·')
                        : null,
                      canClear
                        ? h('button', {
                            key: 'clear',
                            type: 'button',
                            className: 'pp-note-link pp-review-select-link',
                            onClick: props.onClearSelection,
                          }, translate('note.review.clearAll'))
                        : null,
                    )
                  : null,
              ),
            ),
            h('span', { className: 'pp-notes-grow' }),
            h(
              'span',
              { className: 'pp-review-head-actions' },
              !processing
                ? h('button', {
                    type: 'button',
                    className: 'pp-note-btn pp-note-btn-primary pp-review-process',
                    // The tooltip is the rule text the generated prompt carries.
                    title: translate('note.review.intro'),
                    disabled: busy,
                    onClick: props.onStart,
                  }, translate('note.review.open'))
                : [
                    // Leaving the summary touches nothing: the card closes and
                    // the checkboxes go back to being plain rows.
                    h('button', {
                      key: 'cancel',
                      type: 'button',
                      className: 'pp-note-link pp-review-select-link pp-review-cancel',
                      disabled: busy,
                      onClick: () => { if (!busy) props.onClose(); },
                    }, translate('note.review.cancel')),
                    sentNotes.length > 0
                      ? h('button', {
                          key: 'save',
                          type: 'button',
                          className: 'pp-note-btn pp-review-secondary',
                          disabled: busy || typeof props.onSavePrompt !== 'function',
                          onClick: () => submit(props.onSavePrompt),
                        }, translate('note.review.savePrompt'))
                      : null,
                    canPark
                      ? h('button', {
                          key: 'park',
                          type: 'button',
                          className: 'pp-note-btn pp-note-btn-primary',
                          disabled: busy,
                          onClick: () => submit(props.onPark),
                        }, translate('note.review.parkAction'))
                      : h('button', {
                          key: 'send',
                          type: 'button',
                          className: 'pp-note-btn pp-note-btn-primary',
                          disabled: busy || !canSend,
                          onClick: () => submit(props.onSend),
                        }, busy ? translate('note.review.sending') : translate('note.review.send')),
                  ],
            ),
          ),
        ),
        h(
          'div',
          { className: 'pp-review-pane', 'data-active': 'true' },
          !processing
            ? h(
                'div',
                { className: 'pp-review-idle' },
                h('div', { className: 'pp-review-idle-hint' }, translate('note.review.idleHint')),
              )
            : sentNotes.length > 0
            ? h(
                'div',
                { className: 'pp-review-preview-wrap' },
                h(
                  'div',
                  { className: 'pp-review-preview-hint' },
                  h(
                    'span',
                    { className: stale ? 'pp-review-stale' : 'pp-review-hint-text' },
                    stale ? translate('note.review.stale') : translate('note.review.previewHint'),
                  ),
                  h('button', {
                    type: 'button',
                    className: 'pp-note-link pp-review-refresh',
                    title: translate('note.review.processTitle'),
                    onClick: regenerate,
                  }, translate('note.review.refresh')),
                ),
                h('textarea', {
                  className: 'pp-review-text',
                  value: text,
                  spellCheck: false,
                  onChange: (event) => setDraft(event.target.value),
                }),
              )
            : h(
                'div',
                { className: 'pp-review-empty-send' },
                canPark ? translate('note.review.parkOnly') : translate('note.review.nothingSelected'),
              ),
        ),
        error ? h('div', { className: 'pp-review-error' }, error) : null,
      );
    }

    /** Bottom dock cards are draggable by their top edge; 0 means the CSS default. */
    const REVIEW_MIN_HEIGHT = 220;
    const REVIEW_MAX_HEIGHT = 720;
    const TRAY_MIN_HEIGHT = 160;
    const TRAY_MAX_HEIGHT = 640;

    function useDockResize(storedHeight, settingKey, minHeight, maxHeight) {
      const [dragHeight, setDragHeight] = useState(0);
      const height = dragHeight || storedHeight || 0;
      const heightRef = useRef(height);
      heightRef.current = height;
      const cardRef = useRef(null);
      const clamp = (next) => {
        const node = cardRef.current;
        const viewport = (typeof window !== 'undefined' && Number(window.innerHeight)) || 900;
        const panel = node && node.closest ? node.closest('.pp-panel') : null;
        const bottom = node && node.getBoundingClientRect ? node.getBoundingClientRect().bottom : viewport - 16;
        const top = panel && panel.getBoundingClientRect ? panel.getBoundingClientRect().top : 72;
        const ceiling = Math.max(minHeight, Math.min(maxHeight, bottom - top - 96, viewport - 160));
        return Math.round(Math.min(ceiling, Math.max(minHeight, next)));
      };
      const startResize = (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        event.preventDefault();
        const startY = event.clientY;
        const node = cardRef.current;
        const startHeight = (node && node.getBoundingClientRect ? node.getBoundingClientRect().height : 0)
          || heightRef.current
          || 420;
        const onMove = (moveEvent) => {
          if (moveEvent.cancelable) moveEvent.preventDefault();
          setDragHeight(clamp(startHeight + (startY - moveEvent.clientY)));
        };
        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          poolActions.setSetting(settingKey, clamp(heightRef.current));
          setDragHeight(0);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      };
      const resizeBy = (delta) => {
        const node = cardRef.current;
        const base = heightRef.current || (node && node.getBoundingClientRect ? node.getBoundingClientRect().height : 0) || 420;
        poolActions.setSetting(settingKey, clamp(base + delta));
        setDragHeight(0);
      };
      const reset = () => {
        setDragHeight(0);
        poolActions.setSetting(settingKey, 0);
      };
      return { height, cardRef, startResize, resizeBy, reset };
    }

    function renderReviewDock(props) {
      const {
        sessionId, open, count, total, version, height, cardRef,
        selectedNotes, sentNotes, parkedNotes, immediateIds,
        onResizeStart, onResizeBy, onResizeReset,
        processing, onStart, onSelectAll, onClearSelection,
        onExpand, onCollapse, onSend, onSavePrompt, onPark,
      } = props;
      return h(
        'div',
        { className: 'pp-review-dock', 'data-collapsed': open ? 'false' : 'true' },
        open
          ? null
          : h(
              'div',
              { className: 'pp-queue-strip' },
              h(
                'button',
                {
                  type: 'button',
                  className: 'pp-review-strip',
                  title: translate('note.review.title'),
                  'aria-label': translate('note.review.title'),
                  'aria-expanded': 'false',
                  onClick: onExpand,
                },
                h('span', { className: 'pp-queue-strip-action' }, icon('chevronUp')),
                h('span', { className: 'pp-queue-strip-title' }, translate('note.review.title')),
                h('span', { className: 'pp-hint' }, translate('note.review.selected', { n: count })),
                h('span', { className: 'pp-grow' }),
              ),
              h('button', {
                type: 'button',
                className: 'pp-primary pp-review-strip-go',
                onClick: onStart,
              }, translate('note.review.open')),
            ),
        h(
          'div',
          { className: 'pp-review-dock-body', hidden: !open },
          h(
            'div',
            {
              className: 'pp-page-foot pp-review-foot',
              ref: cardRef,
              style: height ? { height: Math.round(height) + 'px', maxHeight: 'calc(100vh - 160px)' } : undefined,
            },
            h(
              'div',
              {
                className: 'pp-review-grip',
                role: 'separator',
                tabIndex: 0,
                'aria-orientation': 'horizontal',
                'aria-label': translate('note.review.resize'),
                'aria-valuemin': REVIEW_MIN_HEIGHT,
                'aria-valuemax': REVIEW_MAX_HEIGHT,
                'aria-valuenow': height || 0,
                title: translate('note.review.resize'),
                onPointerDown: onResizeStart,
                onDoubleClick: onResizeReset,
                onKeyDown: (event) => {
                  if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    onResizeBy(20);
                  } else if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    onResizeBy(-20);
                  }
                },
              },
              h('span', { className: 'pp-grip-bar' }),
            ),
            h(ReviewPromptCard, {
              key: version,
              sessionId,
              processing,
              totalCount: total,
              onStart,
              onSelectAll,
              onClearSelection,
              selectedNotes,
              sentNotes,
              parkedNotes,
              immediateIds,
              onClose: onCollapse,
              onSend,
              onSavePrompt,
              onPark,
            }),
          ),
        ),
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
      const [noteKindsOpen, setNoteKindsOpen] = useState(false);
      // Annotating needs the assistant row and its text, captured while the
      // selection still owns the DOM.
      const [anchor] = useState(() => {
        const captured = pendingNoteAnchor || captureNoteAnchor(props.sessionId);
        pendingNoteAnchor = null;
        return captured;
      });
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
        setNoteKindsOpen(false);
        setSubmenu(true);
      };

      const openNoteKinds = () => {
        if (done !== null) return;
        setSubmenu(false);
        setNoteKindsOpen(true);
      };

      /** Hand the captured anchor and the chosen kind to the overlay. */
      const startNote = (kindId) => {
        const currentAnchor = anchor || captureNoteAnchor(props.sessionId);
        if (!currentAnchor) {
          showToast(translate('note.anchorFailed'), 'error');
          dismiss();
          return;
        }
        noteDraft.set({
          anchor: currentAnchor,
          sessionId: props.sessionId || '',
          token: Date.now(),
          kind: NOTE_KIND_IDS.indexOf(kindId) >= 0 ? kindId : NOTE_KIND_DEFAULT,
        });
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
                    // Moving back to the first row folds both submenus away.
                    onPointerEnter: () => {
                      setSubmenu(false);
                      setNoteKindsOpen(false);
                    },
                  },
                  h('span', { key: 'name', className: 'pp-selname' }, translate('menu.copy')),
                  h('span', { key: 'key', className: 'pp-selkey' }, shortcut),
                ),
                h(
                  'div',
                  { key: 'poolgroup', className: 'pp-selgroup' },
                  h('div', { key: 'label', className: 'pp-selgroup-label' }, h(PromptPoolIcon, { key: 'icon', size: 12 }), translate('menu.group')),
                  h(
                    'button',
                    {
                      key: 'note',
                      type: 'button',
                      role: 'menuitem',
                      className: 'pp-selrow',
                      'aria-haspopup': 'menu',
                      'aria-expanded': noteKindsOpen,
                      onClick: openNoteKinds,
                      onPointerEnter: openNoteKinds,
                    },
                    h('span', { key: 'name', className: 'pp-selname' }, translate('note.addSel')),
                    h('span', { key: 'chev', className: 'pp-selchev', 'aria-hidden': true }, '▸'),
                  ),
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
              noteKindsOpen
                ? h(
                    'div',
                    { key: 'notekinds', className: 'pp-selpanel', role: 'menu', 'aria-label': translate('note.title') },
                    h(
                      'div',
                      { key: 'list', className: 'pp-sellist' },
                      NOTE_KINDS.map((kind) => h(
                        'button',
                        {
                          key: kind.id,
                          type: 'button',
                          role: 'menuitem',
                          className: 'pp-selrow',
                          onClick: () => startNote(kind.id),
                        },
                        h(
                          'span',
                          {
                            key: 'icon',
                            className: 'pp-selkind-icon',
                            'aria-hidden': true,
                            style: { '--pp-kind': kind.color },
                          },
                          icon(kind.icon),
                        ),
                        h('span', { key: 'name', className: 'pp-selname' }, translate(kind.label)),
                      )),
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
      const reviewResize = useDockResize(normalizeSettings(state.settings).reviewHeight, 'reviewHeight', REVIEW_MIN_HEIGHT, REVIEW_MAX_HEIGHT);
      const trayResize = useDockResize(normalizeSettings(state.settings).trayHeight, 'trayHeight', TRAY_MIN_HEIGHT, TRAY_MAX_HEIGHT);
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
      const noteSelectionState = useNoteSelection();
      const reviewState = useNoteReview();
      const selectedNotes = notesForSelection(notesList, notesSessionId, noteSelectionState);
      const reviewSelection = reviewSplit(selectedNotes, reviewState);

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
      const workspaceGroup = currentWorkspaceId ? 'workspace:' + currentWorkspaceId : '';
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
      const sessionSelector = typeof props.useSession === 'function' ? props.useSession : null;
      const pendingSubmissions = sessionSelector
        ? sessionSelector((snapshot) => (snapshot && Array.isArray(snapshot.pendingSubmissions) ? snapshot.pendingSubmissions : EMPTY_PENDING))
        : EMPTY_PENDING;
      const pendingRef = useRef([]);
      pendingRef.current = Array.isArray(pendingSubmissions) ? pendingSubmissions : EMPTY_PENDING;
      const busyRef = useRef(false);

      const [tab, setTab] = useState(() => fallbackTabFor([
        { id: 'notes', label: translate('note.title'), group: 'notes' },
        ...buildTabs(state.categories, workspaces.items, state.settings, currentWorkspaceId),
      ]));
      const [query, setQuery] = useState('');
      const [scope, setScope] = useState(() => (
        props && (props.initialScope === 'global' || props.initialScope === 'workspace') ? props.initialScope : 'notes'
      ));
      const [settingsOpen, setSettingsOpen] = useState(false);
      const [helpOpen, setHelpOpen] = useState(false);
      const [reviewOpen, setReviewOpen] = useState(false);
      const [reviewProcessing, setReviewProcessing] = useState(false);
      const [reviewVersion, setReviewVersion] = useState(0);
      const [mergeOpen, setMergeOpen] = useState(false);
      const [mergeHeight, setMergeHeight] = useState(0);
      const [mergeBusy, setMergeBusy] = useState(false);
      const [trayMode, setTrayMode] = useState('single');
      const [pendingCategory, setPendingCategory] = useState(null);
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

      const { editing, setEditing, startEdit, save, cancelEdit, pasteImages } = usePoolEditor(flash);
      const { trayEditing, setTrayEditing, saveTrayEdit, pasteTrayImages } = useTrayEditor(flash);

      // A failed write outranks a transient toast: the change is not saved.
      const notice = status || (storage.failed ? { kind: 'error', text: translate('status.storageFailed') } : null);

      const confirmCategoryDelete = () => {
        const target = pendingCategory;
        setPendingCategory(null);
        if (!target || target.indexOf('custom:') !== 0) return;
        poolActions.removeCategory(target.slice(7));
        if (tab === target) setTab(fallbackTabFor(tabs.filter((entry) => entry.id !== target)));
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

      const items = useMemo(() => {
        if (scope === 'notes') return [];
        const scoped = state.items.filter((item) => groupOf(item) === workspaceGroup);
        const needle = query.trim().toLowerCase();
        if (!needle) return scoped;
        return scoped.filter((item) => (item.title + '\n' + item.body).toLowerCase().indexOf(needle) >= 0);
      }, [state.items, scope, workspaceGroup, query]);

      const actions = props.inputActions;
      const canAct = actions && typeof actions.setDraft === 'function';

      const setDraft = (text) => {
        if (!canAct) return;
        actions.setDraft(text);
      };

      // Queue admission, image files and the direct send live at module scope so
      // the composer dock can hand the same send queue over without the panel.

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
        // The copy lands in the chosen group, which a folded/workspace tab may
        // not show; "all" is the catch-all when the user kept it.
        if (!matchesTab(item, tab)) {
          const tabsWithNotes = [
            { id: 'notes', label: translate('note.title'), group: 'notes' },
            ...buildTabs(state.categories, workspaces.items, state.settings, currentWorkspaceId),
          ];
          setTab(fallbackTabFor(tabsWithNotes));
        }
        const skipped = others.length + (images.length - item.images.length);
        const label = groupLabelOf(item, state.categories, workspaces.items);
        flash(skipped > 0
          ? { kind: 'info', text: translate('status.savedPartialTo', { group: label, n: skipped }) }
          : { kind: 'ok', text: translate('status.savedTo', { group: label }) });
        return { ok: true, skipped, label };
      };

      const newItem = () => {
        // One editor at a time, same reason as the page's create().
        if (editing) return;
        if (!workspaceGroup) {
          flash({ kind: 'error', text: translate('status.noWorkspace') });
          return;
        }
        const group = workspaceGroup;
        setQuery('');
        const item = poolActions.add({
          id: uid(),
          group,
          title: '',
          body: '',
          type: '',
          images: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        setEditing({ id: item.id, group, title: '', body: '', type: '', images: [], isNew: true });
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
        if (!queueClickAllowed(item.id)) return;
        const before = pool.get().tray.length;
        poolActions.addToTray(item.id, notesSessionId);
        if (pool.get().tray.length === before) return;
        if (!normalizeSettings(state.settings).keepAfterQueue) deleteItem(item, translate('status.queuedAndRemoved'));
        else showToast(translate('status.queued'), 'ok');
      };

      const release = async () => {
        if (busyRef.current) return;
        const entries = tray.slice();
        if (entries.length === 0) return;
        const direct = resolveDirectQueue(props.sessionId);
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
                await sendDirect(direct, props.sessionId, body, images);
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

      const openMerge = () => {
        const entries = tray.slice();
        if (entries.length < 2) return;
        const node = trayResize.cardRef.current;
        const measured = node && node.getBoundingClientRect ? Math.round(node.getBoundingClientRect().height) : 0;
        setMergeHeight(measured);
        setReviewOpen(false);
        setReviewProcessing(false);
        setMergeOpen(true);
      };

      const closeMerge = () => {
        setMergeOpen(false);
      };

      const confirmMerge = async (mergedText) => {
        if (busyRef.current) return;
        const entries = tray.slice();
        if (entries.length === 0) return;
        const fallback = entries.map((entry, index) => `${index + 1}. ${entry.body}`).join('\n\n');
        const text = typeof mergedText === 'string' && mergedText.trim() ? mergedText : fallback;
        const images = normalizeImages(entries.reduce((list, entry) => list.concat(entry.images || []), []), Number.MAX_SAFE_INTEGER);
        busyRef.current = true;
        setBusy(true);
        const result = await queueReviewText(text, props.sessionId, images);
        busyRef.current = false;
        setBusy(false);
        if (!result || result.ok !== true) {
          flash({ kind: 'error', text: (result && result.reason) || translate('note.review.unsupported') });
          return;
        }
        poolActions.removeTrayKeys(entries.map((entry) => entry.key));
        closeMerge();
        flash({ kind: 'ok', text: translate('status.released', { n: 1 }) });
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
        mainTitle: translate('row.insert'),
        showTag: scope === 'global' && activeGlobalTab === 'all',
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

      const tray = state.tray.filter((entry) => !entry.targetSessionId || entry.targetSessionId === notesSessionId);
      const annotationEntries = tray.filter((entry) => entry.type === 'annotation' && entry.source && entry.source.kind);
      const annotationQueue = tray.length > 0 && annotationEntries.length === tray.length;
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
      const composeSessionNotes = (notes) => {
        const chosen = Array.isArray(notes) ? notes : selectedNotes;
        if (chosen.length === 0) {
          showToast(translate('note.noneSelected'), 'error');
          return false;
        }
        const ok = insertComposerText(composeNotesReply(chosen));
        return ok;
      };
      const insertNoteText = (note) => {
        const ok = insertComposerText(composeNoteLine(note));
        if (ok && note.images && note.images.length > 0) {
          addImages(note.images).catch((error) => showToast(String((error && error.message) || error), 'error'));
        }
        return ok;
      };

      const openReview = () => {
        closeMerge();
        setReviewOpen(true);
        setReviewProcessing(false);
      };

      const startReview = () => {
        closeMerge();
        setReviewOpen(true);
        setReviewProcessing(true);
      };

      /** Queue the review prompt in the host session queue, without touching the composer. */
      const queueReviewText = async (text, sessionId, images) => {
        const targetSession = typeof sessionId === 'string' && sessionId ? sessionId : notesSessionId;
        const direct = resolveDirectQueue(targetSession);
        if (!direct) return { ok: false, reason: 'unavailable' };
        try {
          await sendDirect(direct, targetSession, text, normalizeImages(images, Number.MAX_SAFE_INTEGER));
          return { ok: true };
        } catch (error) {
          return { ok: false, reason: String((error && error.message) || error) };
        }
      };

      /** Move the unchecked to-dos into the current workspace's prompt pool. */
      const moveReviewTodos = (review) => {
        const ids = Array.isArray(review && review.parkedIds) ? review.parkedIds : [];
        if (ids.length === 0) return 0;
        const wanted = new Set(ids);
        const notes = notesList.filter((note) => wanted.has(note.id));
        if (notes.length === 0) return 0;
        const group = reviewTodoGroup(currentWorkspaceId, workspaces.items);
        const now = Date.now();
        for (const note of notes) {
          poolActions.add({
            id: uid(),
            group,
            title: draftTitle(note.body || note.quote),
            body: composeNoteLine(note),
            images: normalizeImages(note.images),
            createdAt: now,
            updatedAt: now,
          });
        }
        const movedIds = notes.map((note) => note.id);
        notesActions.removeMany(movedIds);
        deselectNotes(notesSessionId, movedIds);
        resetNoteReview(notesSessionId, movedIds);
        return movedIds.length;
      };

      const parkReviewTodos = async (review) => {
        const moved = moveReviewTodos(review);
        if (moved === 0) return { ok: false, reason: translate('status.storageFailed') };
        setReviewOpen(false);
        setReviewProcessing(false);
        setReviewVersion((value) => value + 1);
        showToast(translate('note.review.parked', { n: moved }), 'ok');
        return { ok: true };
      };

      const queueReview = async (review) => {
        const result = await queueReviewText(review.text, notesSessionId, review.images);
        let inserted = false;
        if (!result || result.ok !== true) {
          if (result && result.reason === 'unavailable') {
            inserted = insertComposerText(review.text) === true;
            if (inserted && review.images && review.images.length > 0) {
              addImages(review.images).catch((error) => showToast(String((error && error.message) || error), 'error'));
            }
          }
          if (!inserted) {
            return {
              ok: false,
              reason: result && result.reason === 'unavailable'
                ? translate('note.review.unsupported')
                : (result && result.reason) || translate('note.review.unsupported'),
            };
          }
        }
        commitReviewBatch({ ...review, sessionId: notesSessionId });
        const moved = moveReviewTodos(review);
        setReviewOpen(false);
        setReviewProcessing(false);
        setReviewVersion((value) => value + 1);
        showToast(
          inserted
            ? translate('note.review.inserted')
            : moved > 0
              ? translate('note.review.queuedParked', { n: moved })
              : translate('note.review.queued'),
          'ok',
        );
        return { ok: true };
      };


      /** Save the reviewed text as a normal prompt, without sending or queueing it. */
      const saveReviewPrompt = (review) => {
        const chosen = notesList.filter((note) => review.noteIds.indexOf(note.id) >= 0);
        const choices = captureChoices(state.categories, workspaces.items, currentWorkspaceId, state.settings);
        const preferred = currentWorkspaceId && choices.some((entry) => entry.value === 'workspace:' + currentWorkspaceId)
          ? 'workspace:' + currentWorkspaceId
          : BUILTIN_GROUP.oftenuse;
        const ordered = choices.some((entry) => entry.value === preferred)
          ? [...choices.filter((entry) => entry.value === preferred), ...choices.filter((entry) => entry.value !== preferred)]
          : choices;
        setReviewOpen(false);
        setReviewProcessing(false);
        setReviewVersion((value) => value + 1);
        openNoteSave({
          noteIds: review.noteIds,
          markStored: false,
          title: draftTitle(review.text),
          body: review.text,
          type: promptTypeForNotes(chosen),
          images: review.images,
          choices: ordered,
          defaultGroup: preferred,
          onSaved: () => {
            moveReviewTodos({ parkedIds: review.parkedIds });
            resetNoteReview(notesSessionId, review.noteIds);
          },
        });
        return { ok: true };
      };


      bridgeRef.current = { insert: insertItem, release, digest: () => { openMerge(); return { ok: true }; }, capture: captureDraft, composeNotes: composeSessionNotes, insertText: insertComposerText, insertImages: addImages, queueReview: queueReviewText };
      useEffect(() => {
        return bridge.listen((command) => {
          const api = bridgeRef.current;
          if (!api || !command) return { ok: false, reason: 'unavailable' };
          if (command.type === 'compose-notes') {
            return { ok: api.composeNotes() === true };
          }
          if (command.type === 'queue-review') {
            if (typeof command.text !== 'string') return { ok: false, reason: 'bad-command' };
            return api.queueReview(command.text, command.sessionId, command.images);
          }
          if (command.type === 'insert-text') {
            if (typeof command.text !== 'string') return { ok: false, reason: 'bad-command' };
            const ok = api.insertText(command.text) === true;
            if (ok && Array.isArray(command.images) && command.images.length > 0 && typeof api.insertImages === 'function') {
              api.insertImages(command.images).catch((error) => showToast(String((error && error.message) || error), 'error'));
            }
            return { ok };
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
          if (command.type === 'digest') {
            if (typeof api.digest !== 'function') return { ok: false, reason: 'unavailable' };
            return api.digest();
          }
          if (command.type === 'stop') {
            return { ok: requestReleaseStop() };
          }
          // The sidebar page cannot read the composer, so it asks for the capture.
          if (command.type === 'open-view') {
            setSettingsOpen(false);
            setReviewOpen(false);
            setReviewProcessing(false);
            if (command.scope === 'notes' || command.scope === 'workspace') setScope(command.scope);
            if (command.create === true) newItem();
            return { ok: true };
          }
          if (command.type === 'capture-options') {
            return {
              ok: true,
              groups: captureChoices(state.categories, workspaces.items, currentWorkspaceId, state.settings),
            };
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

      // Hiding "all" (or a group) while the panel is open must not leave the
      // active tab pointing at a tab that no longer exists.
      useEffect(() => {
        if (!view.open) return;
        const baseTabs = buildTabs(state.categories, workspaces.items, state.settings, currentWorkspaceId);
        const tabsWithNotes = [{ id: 'notes', label: translate('note.title'), group: 'notes' }, ...baseTabs];
        if (tabsWithNotes.some((entry) => entry.id === tab)) return;
        setTab(fallbackTabFor(tabsWithNotes));
      }, [view.open, tab, state.categories, state.settings, workspaces.items, currentWorkspaceId]);

      if (!view.open) return null;

      const changeScope = (next) => {
        setScope(next);
        setSettingsOpen(false);
        setReviewOpen(false);
        setReviewProcessing(false);
        setMergeOpen(false);
        setConfirmClear(false);
        setPendingRemove(null);
      };
      const activeMode = scope === 'notes' ? 'notes' : 'prompts';
      const switchMode = (next) => changeScope(next === 'notes' ? 'notes' : 'workspace');

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
          'data-settings': settingsOpen ? 'true' : undefined,
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
        // A slim brand row identifies the panel; the window controls sit beside
        // it so the mode switch below never competes with pin and close.
        h(
          'div',
          { className: 'pp-page-head pp-panel-head' },
          h(
            'div',
            { className: 'pp-panel-brand' },
            h('span', { className: 'pp-panel-brand-mark', 'aria-hidden': true }, h(PromptPoolBrandMark, { size: 44 })),
            h('span', { className: 'pp-panel-brand-name' }, translate('panel.title')),
            h('span', { className: 'pp-grow' }),
            h(IconButton, {
              name: panelPinned ? 'pinActive' : 'pin',
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
            { className: 'pp-panel-headline' },
            h(ScopeBar, {
              entries: PANEL_SCOPE_ENTRIES,
              value: activeMode,
              counts: { notes: notesList.length, prompts: countPoolItems(state.items, editing).filter((item) => groupOf(item) === workspaceGroup).length },
              onChange: switchMode,
            }),
            h('span', { className: 'pp-grow' }),
          ),
          h(
            'div',
            { className: 'pp-panel-tools' },
            h('input', {
              className: 'pp-search',
              value: query,
              placeholder: translate('page.search'),
              'aria-label': translate('page.search'),
              onChange: (event) => setQuery(event.target.value),
            }),
            h('span', { className: 'pp-grow' }),
            scope === 'notes'
              ? null
              : h('button', { type: 'button', className: 'pp-primary pp-new-prompt', onClick: newItem },
                translate('page.new')),
            h('button', {
              type: 'button',
              className: 'pp-icon pp-menu-trigger',
              title: translate('help.open'),
              'aria-label': translate('help.open'),
              onClick: () => setHelpOpen(true),
            }, icon('help')),
            h('button', {
              type: 'button',
              className: 'pp-icon pp-menu-trigger',
              title: translate('settings.open'),
              'aria-label': translate('settings.open'),
              onClick: () => {
                setReviewOpen(false);
                setReviewProcessing(false);
                setSettingsOpen(!settingsOpen);
              },
            }, icon('gear')),
          ),
        ),
        pendingCategory ? h(CategoryDeleteConfirm, { onConfirm: confirmCategoryDelete, onCancel: () => setPendingCategory(null) }) : null,
        confirmClear && tray.length > 0
          ? h(TrayClearConfirm, {
              count: tray.length,
              onConfirm: () => {
                const entries = tray.slice();
                poolActions.removeTrayKeys(entries.map((entry) => entry.key));
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
        helpOpen ? h(HelpDialog, { onClose: () => setHelpOpen(false) }) : null,
        h(
          'div',
          { className: 'pp-list', ref: listRef },
          settingsOpen
            ? h(PromptPoolSettings, { currentWorkspaceId, onBack: () => setSettingsOpen(false) })
            : scope === 'notes'
              ? h(NotesView, {
                  notes: notesList,
                  sessionId: notesSessionId,
                  reviewMode: reviewOpen && reviewProcessing,
                  onCompose: composeSessionNotes,
                  onInsertNote: insertNoteText,
                  hideActions: true,
                  filter: query,
                  categories: state.categories,
                  workspaces: workspaces.items,
                  currentWorkspaceId,
                  settings: state.settings,
                })
              : items.length === 0
                ? h(EmptyState, {
                    iconName: 'prompt',
                    text: translate(query.trim() ? 'panel.emptyTab' : 'panel.empty'),
                  })
                : items.map(rowOf),
        ),
        h(
          'div',
          { className: 'pp-panel-dock' },
          scope === 'notes' && noteBar.text
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
        !settingsOpen && scope === 'notes'
          ? renderReviewDock({
              sessionId: notesSessionId,
              selectedNotes,
              sentNotes: reviewSelection.sent,
              parkedNotes: reviewSelection.parked,
              immediateIds: reviewSelection.immediateIds,
              count: selectedNotes.length,
              total: notesList.length,
              open: reviewOpen,
              version: reviewVersion,
              height: reviewResize.height,
              cardRef: reviewResize.cardRef,
              onResizeStart: reviewResize.startResize,
              onResizeBy: reviewResize.resizeBy,
              onResizeReset: reviewResize.reset,
              onExpand: openReview,
              onStart: startReview,
              processing: reviewOpen && reviewProcessing,
              onSelectAll: () => selectAllNotes(notesSessionId),
              onClearSelection: () => clearNoteSelection(notesSessionId, notesList.map((note) => note.id)),
              onCollapse: () => { setReviewOpen(false); setReviewProcessing(false); },
              onSend: queueReview,
              onSavePrompt: saveReviewPrompt,
              onPark: parkReviewTodos,
            })
          : null,
        !settingsOpen && scope !== 'notes' && mergeOpen
          ? h(MergeReviewCard, {
              entries: tray,
              height: mergeHeight,
              busy,
              onClose: closeMerge,
              onConfirm: confirmMerge,
              onOpenImage: openImage,
            })
          : null,
        !settingsOpen && scope !== 'notes' && !mergeOpen
          ? renderTrayCard({
              entries: tray,
              collapsed: queueCollapsed,
              busy,
              sessionId: props.sessionId,
              height: trayResize.height,
              cardRef: trayResize.cardRef,
              onResizeStart: trayResize.startResize,
              onResizeBy: trayResize.resizeBy,
              onResizeReset: trayResize.reset,
              editing: trayEditing,
              setEditing: setTrayEditing,
              onSaveEdit: saveTrayEdit,
              onPasteImages: pasteTrayImages,
              onClear: () => setConfirmClear(true),
              onRelease: release,
              onDigest: openMerge,
              mode: trayMode,
              onModeChange: setTrayMode,
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
      '.pp-panel,.pp-page,.pp-settings,.pp-root{--pp-accent:var(--dsw-alias-state-business-primary,var(--dsw-alias-brand-primary));--pp-accent-soft:color-mix(in srgb,var(--pp-accent) 13%,transparent);--pp-accent-line:color-mix(in srgb,var(--pp-accent) 55%,transparent);--pp-ink:var(--dsw-alias-label-primary);--pp-ink-2:var(--dsw-alias-label-secondary);--pp-line:var(--dsw-alias-border-l1);--pp-line-2:var(--dsw-alias-border-l2);--pp-surface:var(--dsw-alias-bg-layer-1);--pp-surface-2:var(--dsw-alias-bg-overlay);--pp-queue-bg:color-mix(in srgb,var(--pp-accent) 5%,var(--dsw-alias-bg-base,var(--pp-surface)));--pp-queue-head-bg:color-mix(in srgb,var(--pp-accent) 14%,var(--dsw-alias-bg-base,var(--pp-surface)));--pp-hover:var(--dsw-alias-interactive-bg-hover,var(--dsw-alias-bg-layer-2));--pp-danger:var(--dsw-alias-state-error-primary);--pp-danger-soft:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);--pp-ok:var(--dsw-alias-state-success-primary);--pp-on-accent:#ffffff;--pp-annotation:#8a6200;--pp-note:#d9a441;--pp-note-ink:color-mix(in srgb,var(--pp-note) 55%,var(--pp-ink));--pp-note-wash:color-mix(in srgb,var(--pp-note) 6%,transparent);--pp-note-line:color-mix(in srgb,var(--pp-note) 58%,transparent);--pp-annotation-soft:color-mix(in srgb,var(--pp-note) 16%,transparent);--pp-annotation-line:var(--pp-note-line);--pp-annotation-head-bg:color-mix(in srgb,var(--pp-note) 10%,var(--pp-surface));--pp-annotation-bg:color-mix(in srgb,var(--pp-note) 5%,var(--dsw-alias-bg-base,var(--pp-surface)))}' +
      '.pp-btn{display:inline-flex;align-items:center;justify-content:center;gap:5px;height:28px;min-width:28px;padding:0 6px;border:0;border-radius:8px;background:transparent;color:var(--pp-ink-2);cursor:pointer;font:inherit;font-size:12px;line-height:1}' +
      '.pp-btn:hover{background:var(--pp-hover);color:var(--pp-ink)}' +
      '.pp-btn[data-open="true"]{background:var(--pp-hover);color:var(--pp-ink)}' +
      // The composer trigger names itself.
      '.pp-trigger{gap:6px;padding:0 9px;border:1px solid transparent}' +
      '.pp-trigger[disabled]{opacity:.55;cursor:not-allowed}' +
      '.pp-trigger-label{white-space:nowrap}' +
      '.pp-trigger-shell{position:relative;display:inline-flex;flex:none}' +
      '.pp-trigger-bar{display:inline-flex;align-items:center;height:28px;flex:none;border:1px solid color-mix(in srgb,var(--pp-accent) 20%,var(--pp-line));border-radius:9px;background:var(--pp-surface);box-shadow:0 1px 2px rgba(0,0,0,.05);overflow:hidden}' +
      '.pp-trigger-bar .pp-trigger{height:26px;border:0;border-radius:0;padding:0 7px;gap:4px;font-weight:600;color:var(--pp-accent);background:color-mix(in srgb,var(--pp-accent) 7%,transparent)}' +
      '.pp-trigger-label{display:none}' +
      '.pp-trigger-brand{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;flex:none;color:var(--pp-ink);background:transparent}' +
      '.pp-trigger-brand svg{width:20px;height:20px}' +
      '.pp-trigger-bar .pp-trigger:hover{background:color-mix(in srgb,var(--pp-accent) 12%,transparent)}' +
      '.pp-trigger-bar .pp-trigger[data-open="true"]{background:color-mix(in srgb,var(--pp-accent) 15%,transparent)}' +
      '.pp-trigger-action{display:inline-flex;align-items:center;gap:4px;height:26px;padding:0 6px;border:0;border-left:1px solid color-mix(in srgb,var(--pp-accent) 14%,var(--pp-line));border-radius:0;background:transparent;color:var(--pp-ink-2);font:inherit;font-size:11px;line-height:1;cursor:pointer;white-space:nowrap;transition:background .14s ease,color .14s ease}' +
      '.pp-trigger-action > svg{width:12px;height:12px;flex:none;opacity:.8}' +
      '.pp-trigger-action:hover:not([disabled]){background:color-mix(in srgb,var(--pp-accent) 7%,transparent);color:var(--pp-accent)}' +
      '.pp-trigger-action[data-open="true"]{background:color-mix(in srgb,var(--pp-accent) 10%,transparent);color:var(--pp-accent)}' +
      '.pp-trigger-action[data-open="true"] > svg{opacity:1}' +
      '.pp-trigger-action[data-domain="annotations"]:hover:not([disabled]){background:color-mix(in srgb,var(--pp-note) 10%,transparent);color:var(--pp-note-ink)}' +
      '.pp-trigger-action[data-domain="annotations"][data-open="true"]{background:color-mix(in srgb,var(--pp-note) 12%,transparent);color:var(--pp-note-ink)}' +
      '.pp-trigger-action[data-domain="annotations"][data-open="true"] .pp-trigger-chevron{color:var(--pp-note-ink)}' +
      '.pp-trigger-action[data-domain="annotations"] .pp-trigger-count{background:color-mix(in srgb,var(--pp-note) 15%,transparent);color:var(--pp-note-ink)}' +
      '.pp-trigger-action[data-domain="annotations"]:focus-visible{outline-color:var(--pp-note-line)}' +
      '.pp-trigger-action[disabled]{opacity:.45;cursor:not-allowed}' +
      '.pp-trigger-action:focus-visible,.pp-trigger-bar .pp-trigger:focus-visible{outline:2px solid var(--pp-accent-line);outline-offset:-2px}' +
      '.pp-trigger-count{display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;padding:0 4px;border-radius:999px;background:color-mix(in srgb,var(--pp-accent) 12%,transparent);color:var(--pp-accent);font-size:9.5px;font-weight:600;line-height:16px;font-variant-numeric:tabular-nums}' +
      '.pp-trigger-chevron{transform:rotate(180deg);transition:transform .16s ease,color .16s ease,opacity .16s ease}' +
      '.pp-trigger-action[data-open="true"] .pp-trigger-chevron{color:var(--pp-accent);opacity:1;transform:none}' +

      '.pp-summary-pop{position:absolute;right:0;bottom:calc(100% + 8px);z-index:2147483000;box-sizing:border-box;width:min(300px,calc(100vw - 16px));padding:12px;border:1px solid var(--pp-line-2);border-radius:11px;background:var(--pp-surface-2);color:var(--pp-ink);box-shadow:0 14px 40px rgba(0,0,0,.22);font-size:12px;line-height:1.5}' +
      '.pp-trigger-menu{position:absolute;right:0;bottom:calc(100% + 8px);z-index:2147483000;box-sizing:border-box;width:100%;max-width:calc(100vw - 16px);max-height:320px;overflow:auto;padding:8px;border:1px solid var(--pp-line-2);border-radius:12px;background:var(--pp-surface);color:var(--pp-ink);box-shadow:0 16px 36px rgba(0,0,0,.17),0 2px 6px rgba(0,0,0,.06);font-size:12px;--pp-menu-ink:var(--pp-accent);--pp-menu-tint:var(--pp-accent);--pp-menu-soft:color-mix(in srgb,var(--pp-menu-tint) 13%,transparent);--pp-menu-line:color-mix(in srgb,var(--pp-menu-tint) 55%,transparent)}' +
      '.pp-trigger-menu[data-domain="annotations"]{--pp-menu-ink:var(--pp-note-ink);--pp-menu-tint:var(--pp-note)}' +
      '.pp-trigger-menu-title{padding:5px 9px 8px;margin:0 2px 4px;border-bottom:1px solid color-mix(in srgb,var(--pp-line) 82%,transparent);color:var(--pp-ink-2);font-size:11px;font-weight:600;line-height:1.4}' +
      '.pp-trigger-chevron{display:inline-flex;align-items:center;margin-left:-1px;opacity:.55}' +
      '.pp-trigger-chevron svg{width:12px;height:12px}' +
      '.pp-trigger-menu-item{display:flex;align-items:center;gap:7px;width:100%;min-height:32px;box-sizing:border-box;padding:3px 7px;border:0;border-radius:8px;background:transparent;color:var(--pp-ink);font:inherit;font-size:12px;text-align:left;cursor:pointer;white-space:nowrap;overflow:hidden;transition:background .14s ease,color .14s ease}' +
      '.pp-trigger-menu-item:hover:not([disabled]),.pp-trigger-menu-item:focus-visible:not([disabled]){background:var(--pp-menu-soft);color:var(--pp-menu-ink)}' +
      '.pp-trigger-menu-item:focus-visible{outline:2px solid var(--pp-menu-line);outline-offset:-2px}' +
      '.pp-trigger-menu-item[disabled]{opacity:.45;cursor:not-allowed}' +
      // A row's mark is what the action does, in the menu's own accent; it is
      // held a step quieter than the label so the label still leads.
      '.pp-trigger-menu-mark{display:inline-flex;align-items:center;justify-content:center;flex:none;width:16px;height:16px;color:var(--pp-menu-ink);opacity:.78}' +
      '.pp-trigger-menu-mark svg{width:15px;height:15px}' +
      '.pp-trigger-menu-item:hover:not([disabled]) .pp-trigger-menu-mark,.pp-trigger-menu-item:focus-visible:not([disabled]) .pp-trigger-menu-mark{opacity:1}' +
      '.pp-trigger-menu-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}' +
      '.pp-trigger-menu-count{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:color-mix(in srgb,var(--pp-menu-tint) 14%,transparent);color:var(--pp-menu-ink);font-size:10px;font-weight:600;line-height:18px;font-variant-numeric:tabular-nums;text-align:center}' +
      '.pp-trigger-notice{position:absolute;right:0;bottom:calc(100% + 8px);z-index:2147483000;max-width:min(300px,calc(100vw - 16px));padding:6px 10px;border:1px solid var(--pp-line-2);border-radius:8px;background:var(--pp-surface-2);color:var(--pp-ink-2);box-shadow:0 8px 24px rgba(0,0,0,.16);font-size:11px;line-height:1.4;pointer-events:none}' +
      '.pp-trigger-notice[data-kind="ok"]{color:var(--pp-ok)}' +
      '.pp-trigger-notice[data-kind="error"]{color:var(--pp-danger)}' +
      '.pp-summary-head{display:flex;align-items:center;gap:6px;margin-bottom:7px}' +
      '.pp-summary-head strong{font-size:13px;font-weight:600}' +
      '.pp-summary-mark{display:inline-flex;color:var(--pp-accent)}' +
      '.pp-summary-count{margin-left:auto;color:var(--pp-ink-2);font-size:11px}' +
      '.pp-summary-desc{color:var(--pp-ink-2);margin-bottom:8px}' +
      '.pp-summary-check{display:flex;align-items:flex-start;gap:6px;padding:3px 0;cursor:pointer}' +
      '.pp-summary-check input{margin:3px 0 0;accent-color:var(--pp-accent);cursor:pointer}' +
      '.pp-summary-note{padding:0 0 2px 18px;color:var(--pp-ink-2);font-size:11px}' +
      '.pp-summary-error{margin-top:7px;color:var(--pp-danger);font-size:11px}' +
      '.pp-summary-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}' +
      '.pp-panel{position:absolute;left:auto;right:0;bottom:0;margin:0;width:min(var(--pp-w,920px),100%);min-width:min(440px,100%);max-width:min(var(--pp-w,920px),100%);z-index:40;display:flex;flex-direction:column;--pp-h:min(70vh,720px,var(--pp-room,100vh));height:var(--pp-h);max-height:var(--pp-h);border:1px solid var(--pp-line);border-radius:var(--dsw-radius-panel,12px);background:var(--dsw-alias-bg-base,var(--pp-surface-2));box-shadow:var(--dsw-elevation-soft,0 10px 30px rgba(0,0,0,.16));overflow:hidden;overflow:clip;font-size:13px;line-height:1.5;color:var(--pp-ink);text-align:left}' +
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
      // One geometry for every tab row: a 26px label, a 5px icon gap and the
      // same focus ring, so the scope underlines, the segmented group control
      // and the settings underlines read as one family.
      '.pp-tab{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:5px;height:26px;padding:0 10px;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--pp-ink-2);font:inherit;font-size:12px;font-weight:500;line-height:1;white-space:nowrap;cursor:pointer;transition:background .13s ease,color .13s ease,border-color .13s ease,box-shadow .13s ease}' +
      '.pp-tab-icon{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;flex:none}.pp-tab-icon svg{width:14px;height:14px}' +
      '.pp-tab:hover{background:var(--pp-hover);color:var(--pp-ink)}' +
      '.pp-tab:focus-visible{outline:2px solid color-mix(in srgb,var(--pp-accent) 55%,transparent);outline-offset:1px}' +
      '.pp-tab-count{margin-left:0;padding:0 5px;min-width:16px;justify-content:center;border-radius:999px;background:color-mix(in srgb,currentColor 10%,transparent);color:inherit;font-size:10px;font-weight:600;line-height:16px;height:16px;display:inline-flex;align-items:center;font-variant-numeric:tabular-nums}' +
      '.pp-tab-add{width:26px;padding:0;font-size:15px;line-height:1;color:var(--pp-ink-2)}' +
      '.pp-tab-add:hover{background:var(--pp-hover);color:var(--pp-ink)}' +
      // The scope switcher is the page's primary navigation, so it reads as a
      // row of underlines: no fill and a wider column gap. A rounded rule slides
      // between the tabs instead of each tab carrying its own border.
      '.pp-scope-bar{position:relative;gap:6px 20px;padding:8px 12px 12px}' +
      '.pp-scope-bar .pp-tab{height:28px;padding:0 1px;border:0;border-bottom:2px solid transparent;border-radius:0;background:transparent}' +
      '.pp-scope-bar .pp-tab:hover{background:transparent;color:var(--pp-ink)}' +
      // Two destination themes: annotations underline in amber, prompts and the
      // shared pool in prompt blue. The amber label still mixes in the primary ink
      // so it stays legible on both themes.
      '.pp-scope-bar .pp-tab[data-scope="notes"][data-active="true"]{border-bottom-color:var(--pp-note-line);background:transparent;color:var(--pp-note-ink);font-weight:600}' +
      '.pp-scope-bar .pp-tab[data-scope="global"][data-active="true"],.pp-scope-bar .pp-tab[data-scope="prompts"][data-active="true"]{border-bottom-color:var(--pp-accent);background:transparent;color:var(--pp-accent);font-weight:600}' +
      // The sliding rule is the tab's underline; the border above is only the
      // pre-measurement fallback and steps aside once the rule has a position.
      '.pp-tab-indicator{position:absolute;z-index:1;height:3px;border-radius:999px;background:var(--pp-accent);pointer-events:none;transition:left .2s cubic-bezier(.2,.7,.2,1),width .2s cubic-bezier(.2,.7,.2,1)}' +
      '.pp-tab-indicator[data-tone="notes"]{background:var(--pp-note-line)}' +
      '.pp-scope-bar[data-indicator="true"] .pp-tab[data-active="true"]{border-bottom-color:transparent}' +
      // The group tabs stay on one line: the viewport scrolls sideways, the row
      // keeps its natural width, and the masks fade only the side that hides tabs.
      // The wheel handler (TabScroller) translates a vertical wheel when needed.
      '.pp-tabscroll{position:relative;max-width:100%;overflow-x:auto;overflow-y:hidden;margin:0 0 4px;padding:2px 0 4px;scrollbar-width:none;-ms-overflow-style:none;overscroll-behavior-x:contain}' +
      '.pp-tabscroll::-webkit-scrollbar{display:none}' +
      '.pp-tabscroll[data-fade="start"]{-webkit-mask-image:linear-gradient(to right,transparent,#000 32px);mask-image:linear-gradient(to right,transparent,#000 32px)}' +
      '.pp-tabscroll[data-fade="end"]{-webkit-mask-image:linear-gradient(to right,#000 calc(100% - 32px),transparent);mask-image:linear-gradient(to right,#000 calc(100% - 32px),transparent)}' +
      '.pp-tabscroll[data-fade="both"]{-webkit-mask-image:linear-gradient(to right,transparent,#000 32px,#000 calc(100% - 32px),transparent);mask-image:linear-gradient(to right,transparent,#000 32px,#000 calc(100% - 32px),transparent)}' +
      // The global pool's group tabs are one segmented control tinted with the
      // prompt blue: a pale recess instead of a neutral grey block, labels that
      // lean from the primary ink towards the accent, and the selected tab raised
      // back to the page surface. Group separators are dropped inside it so the
      // single row has no stray rules.
      '.pp-global-bar{display:inline-flex;flex-wrap:nowrap;align-items:center;gap:2px;width:max-content;max-width:none;margin:0 12px;padding:3px;border-radius:10px;background:color-mix(in srgb,var(--pp-accent) 7%,transparent);box-shadow:inset 0 1px 2px color-mix(in srgb,var(--pp-accent) 10%,transparent)}' +
      '.pp-global-bar .pp-tab{height:26px;padding:0 10px;border:0;border-radius:7px;color:color-mix(in srgb,var(--pp-ink-2) 62%,var(--pp-accent))}' +
      '.pp-global-bar .pp-tab:hover:not([data-active="true"]){background:color-mix(in srgb,var(--pp-accent) 11%,transparent);color:var(--pp-accent)}' +
      // The selected chip sits above the track on both host themes: on a light
      // theme the page surface is already the brightest layer, on a dark theme a
      // 12% white wash lifts it clear of the track.
      '.pp-global-bar .pp-tab[data-active="true"]{background:var(--dsw-alias-bg-base,var(--pp-surface));background-image:linear-gradient(0deg,rgba(255,255,255,.12),rgba(255,255,255,.12));color:var(--pp-ink);font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.06),0 0 0 1px color-mix(in srgb,var(--pp-accent) 16%,transparent)}' +
      '.pp-global-bar .pp-tab-add{width:24px;padding:0;margin-left:2px;border-radius:7px}' +
      // The track already groups the tabs; the block separators would dangle at
      // the end of a wrapped row, so they are dropped inside it.
      '.pp-global-bar .pp-tab-sep{display:none}' +
      // Settings tabs borrow the page's two destination themes, so the amber
      // and the prompt blue mean the same thing in both places.
      '.pp-set-tabs{position:relative;gap:0}' +
      '.pp-set-tabs .pp-tab{height:28px;padding:0 4px;margin-right:20px;border:0;border-bottom:2px solid transparent;border-radius:0;background:transparent}' +
      '.pp-set-tabs .pp-tab:hover{background:transparent;color:var(--pp-ink)}' +
      '.pp-set-tabs .pp-tab[data-active="true"]{background:transparent;color:var(--pp-ink);font-weight:600}' +
      '.pp-set-tabs .pp-tab[data-scope="notes"][data-active="true"]{border-bottom-color:var(--pp-note-line);color:var(--pp-note-ink)}' +
      '.pp-set-tabs .pp-tab[data-scope="prompts"][data-active="true"]{border-bottom-color:var(--pp-accent);color:var(--pp-accent)}' +
      '.pp-set-tabs[data-indicator="true"] .pp-tab[data-active="true"]{border-bottom-color:transparent}' +
      '.pp-select{height:26px;min-width:170px;max-width:100%;padding:0 8px;border:1px solid var(--pp-line);border-radius:7px;background:var(--pp-surface);color:var(--pp-ink);font:inherit;font-size:12px}' +
      // Settings replaces the whole pool surface: the header, context row and group
      // tabs belong to browsing, not to the settings destination, so they step aside
      // and the settings head provides the single way back.
      '.pp-page[data-settings="true"] .pp-page-head,.pp-page[data-settings="true"] .pp-prompt-bar,.pp-page[data-settings="true"] .pp-tabscroll{display:none}' +
      '.pp-panel[data-settings="true"] .pp-panel-tools,.pp-panel[data-settings="true"] .pp-panel-headline,.pp-panel[data-settings="true"] .pp-prompt-bar{display:none}' +
      '.pp-page[data-settings="true"] .pp-page-body{padding-top:12px}' +
      '.pp-panel[data-settings="true"] .pp-list{padding-top:12px}' +
      // Help is a two-column reference card, not a tour: it states the same model
      // as the header in one screen and closes back to wherever it was opened.
      '.pp-help-card{max-width:540px;gap:12px}' +
      '.pp-help{display:flex;flex-direction:column;gap:10px}' +
      '.pp-help-title{font-size:15px;font-weight:600;line-height:1.35}' +
      '.pp-help-intro{font-size:12px;line-height:1.65;color:var(--pp-ink-2);white-space:pre-line}' +
      '.pp-help-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}' +
      '.pp-help-col{display:flex;flex-direction:column;gap:6px;padding:10px 11px;border:1px solid var(--pp-line);border-radius:10px;background:color-mix(in srgb,var(--pp-surface) 65%,transparent)}' +
      '.pp-help-head{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--pp-ink)}' +
      '.pp-help-icon{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;flex:none;border-radius:6px;background:color-mix(in srgb,var(--pp-accent) 9%,transparent);color:var(--pp-accent)}' +
      '.pp-help-icon svg{width:14px;height:14px}' +
      '.pp-help-why{font-size:11.5px;line-height:1.6;color:var(--pp-ink);margin:0;white-space:pre-line}' +
      '.pp-help-body{font-size:11.5px;line-height:1.6;color:var(--pp-ink-2);white-space:pre-line;margin:0;padding-top:7px;border-top:1px dashed var(--pp-line)}' +
      '.pp-help-card .pp-modal-actions{margin-top:2px}' +
      // The page header stacks two rows: the three destinations, then the
      // search field with the contextual tools.
      '.pp-head-tools{display:flex;align-items:center;gap:6px;flex:none;width:100%;min-width:0;justify-content:flex-end}' +
      '.pp-head-tools .pp-search{flex:1 1 200px;min-width:80px;width:auto}' +
      '.pp-page-head .pp-scope-bar,.pp-panel-headline .pp-scope-bar{padding:0;column-gap:20px;min-width:0}' +
      '.pp-page-head .pp-scope-bar .pp-tab,.pp-panel-headline .pp-scope-bar .pp-tab{height:30px}' +
      '.pp-new-prompt{display:inline-flex;align-items:center;justify-content:center;gap:5px;height:26px;flex:none;padding:0 10px;font-size:12px;white-space:nowrap}' +
      '.pp-menu-trigger{width:26px;height:26px;border-radius:7px}' +
      // Filing a draft is the one header action that writes to the pool, but a
      // lone blue icon read as a different kind of control next to help and
      // settings, so it keeps the plain ink and only the icon shape marks it.
      // The shared pool gets one context row between the destinations and the
      // search field for its group tabs; workspace prompts go straight to the list.
      '.pp-prompt-bar{display:flex;align-items:center;gap:8px;height:38px;padding:0 12px;border-bottom:1px solid var(--pp-line);font-size:11.5px;color:var(--pp-ink-2)}' +
      '.pp-page-head .pp-prompt-bar{margin:0 -12px;padding:0 12px}' +
      '.pp-prompt-bar .pp-tabscroll{flex:0 1 auto;min-width:0;margin:0;padding:0}' +
      '.pp-prompt-bar .pp-global-bar{margin:0}' +
      // A folded family drops one level: the strip keeps the family tab, and its
      // groups ride underneath as small chips on a quieter track of their own, so
      // the strip still reads as the top level.
      '.pp-group-bar{display:flex;align-items:center;flex-wrap:nowrap;gap:2px;height:32px;margin:0 -12px;padding:0 12px;border-bottom:1px solid var(--pp-line);overflow-x:auto;scrollbar-width:none}' +
      '.pp-group-bar::-webkit-scrollbar{display:none}' +
      '.pp-group-track{display:inline-flex;flex-wrap:nowrap;align-items:center;gap:2px;padding:2px;border-radius:8px;background:color-mix(in srgb,var(--pp-ink) 4.5%,transparent)}' +
      '.pp-group-bar .pp-tabcell{flex:none}' +
      '.pp-group-bar .pp-tab{height:22px;padding:0 8px;border:0;border-radius:6px;font-size:11.5px;color:var(--pp-ink-2)}' +
      '.pp-group-bar .pp-tab:hover:not([data-active="true"]){background:color-mix(in srgb,var(--pp-ink) 6%,transparent);color:var(--pp-ink)}' +
      '.pp-group-bar .pp-tab[data-active="true"]{background:var(--dsw-alias-bg-base,var(--pp-surface));color:var(--pp-ink);font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.07)}' +
      '.pp-group-bar .pp-tab-count{background:color-mix(in srgb,currentColor 10%,transparent)}' +
      '.pp-group-bar .pp-tab-x{width:16px;height:16px;margin-left:-2px;font-size:11px}' +
      '.pp-group-bar .pp-tab-input{height:22px;font-size:11.5px}' +
      // Settings is a destination, not a dialog tab strip: it gets an explicit
      // way back to the pool, set above the title like a breadcrumb, and two
      // sections only.
      '.pp-set-head{display:block;margin-bottom:14px}' +
      '.pp-set-back{display:inline-flex;align-items:center;gap:3px;margin:0 0 5px;padding:0;border:0;background:transparent;color:var(--pp-ink-2);font:inherit;font-size:11.5px;line-height:1.3;cursor:pointer}' +
      '.pp-set-back:hover{color:var(--pp-ink);text-decoration:underline;text-underline-offset:2px}' +
      '.pp-set-back:focus-visible{outline:2px solid color-mix(in srgb,var(--pp-accent) 55%,transparent);outline-offset:2px;border-radius:4px}' +
      '.pp-set-back svg{width:13px;height:13px}' +
      '.pp-set-heading{min-width:0}' +
      // The page uses the full width of its host: rows, footer and queue share
      // the same 12px gutter as the header instead of a fixed reading column.
      '.pp-page .pp-page-foot{width:calc(100% - 24px);box-sizing:border-box;margin-left:auto;margin-right:auto;box-shadow:none}' +
      '.pp-page-item{min-height:44px;box-sizing:border-box;padding:5px 8px;border-radius:8px}' +
      '.pp-title{font-size:13px;font-weight:600;line-height:1.35}' +
      '.pp-icon svg,.pp-row-action svg{width:16px;height:16px}' +
      '.pp-tab-addwrap{display:inline-flex;align-items:center}' +
      '.pp-tab-sep{flex:none;width:1px;height:14px;margin:0 6px;background:color-mix(in srgb,var(--pp-ink-2) 40%,transparent)}' +
      // A closable group tab is one button plus a sibling close button, laid
      // over the tab's right padding: no interactive element is nested inside
      // another, and the chip still reads as a single unit.
      '.pp-tabcell{position:relative;display:inline-flex;align-items:center;flex:none}' +
      '.pp-tabcell[data-closable="true"] .pp-tab{padding-right:24px}' +
      '.pp-tab-x{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;padding:0;border:0;border-radius:5px;background:transparent;color:color-mix(in srgb,var(--pp-ink-2) 85%,transparent);font:inherit;font-size:12px;line-height:1;cursor:pointer;transition:background .13s ease,color .13s ease}' +
      // Inside a tab cell the close button floats over the tab's right padding;
      // the workspace rail still lays its close chip inline (no positioned parent).
      '.pp-tabcell .pp-tab-x{position:absolute;right:4px;top:50%;transform:translateY(-50%)}' +
      '.pp-tab-x:hover{background:var(--pp-danger-soft);color:var(--pp-danger)}' +
      '.pp-tab-x:focus-visible{outline:2px solid color-mix(in srgb,var(--pp-accent) 55%,transparent);outline-offset:1px}' +
      '.pp-tab-input{height:26px;width:110px;padding:0 8px;border:1px solid var(--pp-accent);border-radius:8px;background:var(--dsw-alias-bg-base);color:inherit;font:inherit;font-size:12px;outline:none}' +
      '@media (prefers-reduced-motion: reduce){.pp-tab,.pp-tab-x,.pp-tab-indicator{transition:none}}' +
      '.pp-release-mask{position:absolute;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:16px;background:color-mix(in srgb,var(--pp-ink) 28%,transparent)}' +
      '.pp-release-card{width:100%;max-width:300px;display:flex;flex-direction:column;align-items:center;gap:10px;padding:16px 18px;border:1px solid var(--pp-line);border-radius:12px;background:var(--pp-surface-2);box-shadow:0 18px 48px rgba(0,0,0,.24);text-align:center}' +
      '.pp-release-title{font-weight:600;font-size:13px}' +
      '.pp-release-count{font-size:12px;color:var(--pp-ink-2);font-variant-numeric:tabular-nums}' +
      '.pp-modal{position:absolute;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;background:color-mix(in srgb,var(--pp-ink) 22%,transparent)}' +
      '.pp-modal-card{width:100%;max-width:400px;display:flex;flex-direction:column;gap:14px;padding:16px 18px;border:1px solid var(--pp-line);border-radius:12px;background:var(--pp-surface-2);box-shadow:0 18px 48px rgba(0,0,0,.24)}' +
      '.pp-modal-copy{display:flex;flex-direction:column;gap:4px}' +
      '.pp-modal-title{font-size:13px;font-weight:600;line-height:1.4;color:var(--pp-ink)}' +
      '.pp-modal-text{font-size:13px;line-height:1.65;color:var(--pp-ink)}' +
      '.pp-modal-actions{display:flex;justify-content:flex-end;gap:8px}' +
      '.pp-modal-discard{color:var(--pp-danger)}' +
      '.pp-capture-options{display:flex;flex-direction:column;gap:6px;max-height:280px;overflow:auto}' +
      '.pp-capture-option{justify-content:flex-start;height:auto;min-height:26px;padding:5px 9px;text-align:left;white-space:normal}' +
      '.pp-mini{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;border-radius:7px;border:1px solid var(--pp-line);background:transparent;color:var(--pp-ink);font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}' +
      '.pp-mini:hover:not([disabled]){background:var(--pp-hover)}' +
      '.pp-mini:disabled{opacity:.5;cursor:not-allowed}' +
      '.pp-set-btn{display:inline-flex;align-items:center;gap:5px;padding:0 9px}' +
      '.pp-set-btn[data-active="true"]{border-color:var(--pp-accent);color:var(--pp-accent)}' +
      '.pp-set-btn-icon{display:inline-flex;align-items:center}' +
      '.pp-btn-icon{display:inline-flex;align-items:center;flex:none}.pp-btn-icon svg{width:14px;height:14px}' +
      '.pp-list{overflow-y:auto;padding:6px 12px 20px;flex:1;min-height:0}' +
      '.pp-page{position:relative;display:flex;flex-direction:column;height:100%;min-height:0;background:var(--dsw-alias-bg-base);color:var(--pp-ink);font-size:13px;line-height:1.5}' +
      '.pp-page-head{display:flex;flex-direction:column;align-items:stretch;gap:6px;min-width:0;padding:8px 12px 6px;border-bottom:1px solid var(--pp-line);flex-wrap:nowrap}' +
      '.pp-page-tabs{display:flex;align-items:center;gap:12px;min-width:0}' +
      '.pp-page-tabs .pp-scope-bar{flex:none}' +
      // The scope note is still pushed to the right, but it now says whose it
      // is and wears a frame tinted by the tab it belongs to, so the eye can
      // tie it back to the active tab across the empty middle of the row.
      '.pp-scope-note{margin-left:auto;display:inline-flex;align-items:baseline;min-width:0;max-width:62%;height:22px;padding:0 9px;border:1px solid var(--pp-line);border-radius:999px;background:transparent;color:var(--pp-ink-2);font-size:11px;line-height:20px;letter-spacing:.01em;white-space:nowrap;overflow:hidden}' +
      '.pp-scope-note-subject{flex:none;color:var(--pp-ink-2);opacity:.85}' +
      '.pp-scope-note-scope{min-width:0;overflow:hidden;text-overflow:ellipsis;font-weight:600}' +
      '.pp-scope-note-subject + .pp-scope-note-scope::before{content:"·";margin:0 5px;font-weight:400;opacity:.55}' +
      '.pp-scope-note[data-scope="notes"]{border-color:var(--pp-annotation-line);background:var(--pp-note-wash);color:var(--pp-note-ink)}' +
      '.pp-scope-note[data-scope="notes"] .pp-scope-note-scope{color:var(--pp-note-ink)}' +
      '.pp-scope-note[data-scope="prompts"],.pp-scope-note[data-scope="global"]{border-color:var(--pp-accent-line);background:color-mix(in srgb,var(--pp-accent) 6%,transparent);color:var(--pp-accent)}' +
      '.pp-scope-note[data-scope="prompts"] .pp-scope-note-scope,.pp-scope-note[data-scope="global"] .pp-scope-note-scope{color:var(--pp-accent)}' +
      '.pp-panel-head{flex-direction:column;align-items:stretch;gap:0;padding:0}' +
      '.pp-panel-brand{display:flex;align-items:center;gap:6px;min-width:0;padding:3px 12px 7px}' +
      '.pp-panel-brand-mark{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;flex:none;color:var(--pp-ink);background:transparent}' +
      '.pp-panel-brand-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px;font-weight:600;letter-spacing:.01em}' +
      '.pp-panel-headline{display:flex;align-items:center;gap:8px;min-width:0;padding:0 12px 6px;border-bottom:1px solid var(--pp-line);background:transparent}' +
      '.pp-panel-slogan{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--pp-ink-2);font-size:11px}' +
      '.pp-panel-tools{display:flex;align-items:center;gap:6px;padding:6px 12px}' +
      '.pp-panel-actions{display:flex;align-items:center;gap:8px;width:208px;flex:none}' +
      '.pp-panel-actions .pp-mini{width:100px;min-width:100px;padding:0 5px;justify-content:center;overflow:hidden;text-overflow:ellipsis}' +
      '.pp-panel-tools .pp-search{min-width:0;width:100%}' +
      '.pp-page-title{font-size:14px;font-weight:600}' +
      '.pp-panel-title{display:inline-flex;align-items:center;gap:6px;flex:none;margin-right:2px}' +
      '.pp-page-sub{color:var(--pp-ink-2);font-size:12px}' +
      '.pp-search{box-sizing:border-box;height:26px;flex:1;min-width:120px;border:1px solid var(--pp-line);border-radius:8px;background:var(--pp-surface);color:inherit;font:inherit;font-size:12px;padding:0 9px;outline:none}' +
      '.pp-search:focus{border-color:var(--pp-accent)}' +
      '.pp-settings{max-width:640px;padding:16px 20px;color:var(--pp-ink);font-size:13px;line-height:1.6}' +
      '.pp-set-title{font-size:15px;font-weight:600;line-height:1.35;margin-bottom:2px}' +
      '.pp-set-group{margin-top:14px}' +
      '.pp-set-row{display:flex;align-items:flex-start;gap:8px;cursor:pointer}' +
      '.pp-set-row input{margin:3px 0 0;accent-color:var(--pp-accent);cursor:pointer}' +
      '.pp-set-hint{margin-top:2px;padding-left:22px}' +
      '.pp-set-fams{display:flex;flex-direction:column}' +
        '.pp-set-fam{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--pp-line-2)}' +
        '.pp-set-fam:last-child{border-bottom:0}' +
        '.pp-set-fam-name{flex:0 0 108px;font-size:12px;color:var(--pp-ink)}' +
        '.pp-set-fam-order{display:flex;justify-content:flex-end;gap:4px;margin-left:auto}' +
        '.pp-seg{display:inline-flex;flex:none;padding:2px;border:1px solid var(--pp-line);border-radius:8px}' +
        '.pp-seg-opt{position:relative;display:inline-flex;align-items:center;justify-content:center;min-width:50px;height:22px;padding:0 6px;border-radius:6px;font-size:11.5px;line-height:1;color:var(--pp-ink-2);white-space:nowrap;cursor:pointer}' +
        '.pp-seg-opt input{position:absolute;inset:0;margin:0;opacity:0;cursor:pointer}' +
        '.pp-seg-opt:hover{color:var(--pp-ink)}' +
        '.pp-seg-opt[data-active="true"]{background:var(--pp-accent-soft);color:var(--pp-accent);font-weight:600}' +
        '.pp-seg-opt:focus-within{outline:2px solid color-mix(in srgb,var(--pp-accent) 55%,transparent);outline-offset:1px}' +
        '.pp-set-cardhead{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 6px}' +
        '.pp-set-cardhead .pp-set-label{margin:0}' +
        '.pp-set-divider{height:1px;background:var(--pp-line-2);margin:14px 0 12px}' +
      '.pp-about{margin-top:14px}' +
      '.pp-about-version{margin-left:6px;font-size:11px;font-weight:400;color:var(--pp-ink-2);font-variant-numeric:tabular-nums}' +
      '.pp-about-row{display:flex;gap:10px;padding:2px 0;font-size:12px;color:var(--pp-ink);min-width:0}' +
      '.pp-about-key{flex:none;width:60px;color:var(--pp-ink-2)}' +
      '.pp-about-row a{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
        '.pp-set-label{font-size:12px;color:var(--pp-ink-2);margin:2px 0 4px}' +
      '.pp-set-card{padding:10px 12px;border:1px solid var(--pp-line-2);border-radius:10px;background:var(--pp-surface);box-shadow:none}' +
      '.pp-set-card .pp-set-label{margin:0 0 6px;font-size:12px;font-weight:600;color:var(--pp-ink)}' +
      '.pp-set-card .pp-set-row{padding:3px 0}' +
      '.pp-set-card .pp-set-hint{padding-left:0;margin:2px 0 8px}' +
      '.pp-set-item + .pp-set-item{margin-top:8px}' +
      '.pp-page-body{flex:1;min-height:0;overflow-y:auto;padding:6px 12px 20px}' +
      '.pp-ws{display:flex;flex-direction:column;gap:8px;min-width:0}' +
      '.pp-ws-rail{display:flex;flex-wrap:wrap;align-items:center;gap:4px;min-width:0}' +
      '.pp-ws-tab{display:inline-flex;align-items:center;gap:5px;max-width:100%;min-width:0;padding:3px 9px;border:1px solid var(--pp-line);border-radius:999px;background:transparent;color:var(--pp-ink-2);font:inherit;font-size:12px;line-height:18px;cursor:pointer}' +
      '.pp-ws-tab:hover{background:var(--pp-hover);color:var(--pp-ink)}' +
      '.pp-ws-tab[data-active="true"]{background:var(--pp-accent-soft);border-color:var(--pp-accent);color:var(--pp-accent);font-weight:600}' +
      '.pp-ws-name{min-width:0;max-width:168px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.pp-ws-count{flex:none;font-size:10px;font-variant-numeric:tabular-nums;color:var(--pp-ink-2)}' +
      '.pp-ws-body{min-width:0}' +
      '.pp-page-foot{display:flex;flex-direction:column;gap:8px;margin:8px 10px 10px;padding:10px 12px;border:1px solid var(--pp-line-2);border-radius:10px;background:var(--pp-queue-bg);box-shadow:0 1px 3px rgba(0,0,0,.08);max-height:min(640px,66vh);overflow:hidden;box-sizing:border-box}' +
      '.pp-tray-foot{gap:0}' +
      '.pp-tray-foot .pp-tray{margin-top:8px}' +
      '.pp-page-foot.pp-tray-foot .pp-foot-head{margin:0 -12px 0}' +
      '.pp-tray-foot[data-resized="true"] .pp-tray{flex:1 1 auto;max-height:none;min-height:0;overflow-y:auto}' +
      '.pp-panel .pp-tray-foot[data-resized="true"] .pp-tray{flex:1 1 auto;max-height:none;min-height:0;overflow-y:auto}' +
      '.pp-tray-grip{flex:none;display:flex;align-items:center;justify-content:center;height:11px;margin:-10px -12px 0;cursor:ns-resize;touch-action:none}' +
      '.pp-tray-grip:hover .pp-grip-bar,.pp-tray-grip:active .pp-grip-bar{background:var(--pp-accent)}' +
      '.pp-tray-grip:focus-visible{outline:2px solid var(--pp-accent-line);outline-offset:-2px}' +
      '.pp-review-foot{padding:0;gap:0;height:min(360px,48vh);max-height:min(360px,48vh)}' +
      '.pp-review-dock{display:flex;flex-direction:column;flex:none;min-width:0}' +
      '.pp-review-dock-body[hidden]{display:none}' +
      '.pp-review-strip{flex:1;min-width:0;height:100%;display:flex;align-items:center;gap:8px;padding:0;border:0;border-radius:0;background:transparent;color:inherit;font:inherit;font-size:11px;text-align:left;cursor:pointer}' +
      '.pp-review-strip:hover .pp-queue-strip-title{color:var(--pp-accent)}' +
      '.pp-review-strip:focus-visible{outline:2px solid var(--pp-accent);outline-offset:-2px}' +
      '.pp-review-strip-go{flex:none;height:24px;padding:0 10px;border-radius:6px;font-size:11px}' +
      '.pp-notes-review-check{accent-color:var(--pp-note-accent)}' +
      '.pp-notes-review-exec,.pp-notes-review-todo{margin-top:5px}' +
      '.pp-review-stale{color:var(--pp-note-accent);font-weight:500}' +
      '.pp-review-idle{display:flex;flex-direction:column;gap:4px;margin:8px 12px;padding:10px 11px;border:1px dashed var(--pp-line-2);border-radius:8px;background:color-mix(in srgb,var(--pp-note-ink) 2%,transparent)}' +
      '.pp-review-idle-hint{font-size:11px;line-height:1.6;color:var(--pp-note-ink-2)}' +
      '.pp-review-grip{flex:none;display:flex;align-items:center;justify-content:center;height:11px;cursor:ns-resize;touch-action:none}' +
      '.pp-review-grip:hover .pp-grip-bar,.pp-review-grip:active .pp-grip-bar{background:var(--pp-accent)}' +
      '.pp-review-grip:focus-visible{outline:2px solid var(--pp-accent-line);outline-offset:-2px}' +
      '.pp-review-foot>.pp-review{flex:1;min-height:0;overflow-y:auto;padding:10px 12px}' +
      '.pp-panel .pp-review-foot{height:min(calc(var(--pp-h, 100vh) * 0.56), 360px);max-height:min(calc(var(--pp-h, 100vh) * 0.56), 360px)}' +
      // The card sizes itself to the queue: an empty tray is one hint row, a full
      // one stops at half the page so the pool above keeps the room it needs.
      '.pp-page-foot .pp-tray{max-height:min(520px,52vh);min-height:0;flex:0 1 auto;overflow-y:auto}' +
      '.pp-tray-empty{justify-content:flex-start;align-items:flex-start;padding:2px 2px 4px;text-align:left}' +
      '.pp-queue-toggle{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;margin-left:-4px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--pp-ink-2);font:inherit;font-size:11px;cursor:pointer}' +
      '.pp-queue-toggle:hover{background:color-mix(in srgb,var(--pp-accent) 10%,transparent);color:var(--pp-accent)}' +
      '.pp-queue-toggle:focus-visible{outline:2px solid var(--pp-accent);outline-offset:1px}' +
      '.pp-queue-toggle-icon{display:inline-flex;align-items:center}' +
      '.pp-queue-toggle svg{width:14px;height:14px}' +
      '.pp-queue-strip{display:flex;align-items:center;gap:6px;height:36px;flex:none;margin:0 10px 10px;padding:0 6px 0 10px;border:1px solid var(--pp-line-2);border-radius:8px;background:var(--pp-queue-head-bg);font:inherit;font-size:12px;color:var(--pp-ink-2)}' +
      '.pp-queue-open{display:flex;align-items:center;gap:7px;flex:1;min-width:0;height:100%;padding:0;border:0;border-radius:6px;background:transparent;color:inherit;font:inherit;font-size:12px;text-align:left;cursor:pointer}' +
      '.pp-queue-open:hover .pp-queue-strip-title{color:var(--pp-accent)}' +
      '.pp-queue-open:hover .pp-queue-strip-action{color:var(--pp-accent)}' +
      '.pp-queue-open:focus-visible{outline:2px solid var(--pp-accent);outline-offset:-2px}' +
      '.pp-queue-strip-title{font-weight:600;color:var(--pp-ink)}' +
      '.pp-queue-strip-action{display:inline-flex;align-items:center;gap:3px;flex:none;font-size:11px;color:var(--pp-ink-2)}' +
      '.pp-queue-strip .pp-hint{font-size:11px;color:var(--pp-ink-2);margin-left:2px}' +
      '.pp-queue-send{flex:none;height:24px;padding:0 10px;border-radius:6px;font-size:11px}' +
      '.pp-queue-strip svg{width:14px;height:14px}' +
      // The tray uses the page gutter, independent of which dock wrapper renders it.
      '.pp-queue-strip{width:calc(100% - 24px);margin:0 auto 10px;box-sizing:border-box}' +
      '.pp-page-item{padding:10px 12px;border-radius:10px;border:1px solid transparent}' +
      '.pp-page-item:hover{background:var(--pp-surface);border-color:var(--pp-line)}' +
      '.pp-page-item .pp-actions{opacity:.35}' +
      '.pp-page-item:hover .pp-actions{opacity:1}' +
      '.pp-empty{padding:22px 16px;color:var(--pp-ink-2);text-align:center;font-size:12px}' +
      '.pp-empty-mark{display:flex;align-items:center;justify-content:center;margin-bottom:7px;color:var(--pp-ink-2);opacity:.45}' +
      '.pp-empty-mark svg{width:20px;height:20px}' +
      '.pp-row{display:flex;align-items:flex-start;gap:8px;padding:7px 8px;border-radius:8px}' +
      '.pp-row:hover{background:color-mix(in srgb,var(--pp-accent) 10%,transparent)}' +
      '.pp-toggle{width:26px;height:26px;flex:none;margin-top:-1px;border:0;border-radius:6px;background:transparent;color:var(--pp-ink-2);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0}' +
      '.pp-toggle:hover{background:var(--pp-hover);color:var(--pp-ink)}' +
      '.pp-toggle[data-selected="true"]{color:var(--pp-accent)}' +
      '.pp-main{flex:1;min-width:0;cursor:pointer}' +
      '.pp-title{display:flex;align-items:center;gap:5px;min-width:0;font-size:12.5px;font-weight:500}' +
      '.pp-title-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.pp-body{color:var(--pp-ink-2);font-size:12px;white-space:pre-wrap;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word}' +
      '.pp-tag{flex:none;margin-top:2px;padding:0 5px;border-radius:5px;border:1px solid var(--pp-accent-line);background:var(--pp-accent-soft);color:var(--pp-accent);font-size:10px;line-height:15px}' +
      '.pp-actions{display:flex;gap:0;opacity:0;flex:none}' +
      '.pp-row:hover .pp-actions,.pp-row:focus-within .pp-actions{opacity:1}' +
      '.pp-icon{width:24px;height:24px;border:0;border-radius:6px;background:transparent;color:var(--pp-ink-2);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;flex:none}' +
      '.pp-icon:hover{background:var(--pp-surface);color:var(--pp-ink)}' +
      '.pp-icon:disabled{opacity:.35;cursor:default}' +
      '.pp-icon[data-danger="true"]:hover{color:var(--pp-danger)}' +
      '.pp-icon[data-active="true"]{color:var(--pp-accent)}' +
      '.pp-row-action{width:24px;height:24px;flex:none;display:inline-flex;align-items:center;justify-content:center;padding:0;border:0;border-radius:6px;background:transparent;color:var(--pp-ink-2);font:inherit;cursor:pointer}' +
      '.pp-row-action:hover:not([disabled]){background:var(--pp-hover);color:var(--pp-ink)}' +
      '.pp-row-action[disabled]{opacity:.35;cursor:default}' +
      '.pp-row-action[data-danger="true"]:hover:not([disabled]){color:var(--pp-danger)}' +
      '.pp-row-actions{display:flex;align-items:center;gap:2px;flex:none}' +
      '.pp-row-leading{display:inline-flex;align-items:center;flex:none;min-width:20px}' +
      '.pp-type-mark{flex:none;display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;border-radius:5px;background:color-mix(in srgb,var(--pp-ink) 5%,transparent);color:var(--pp-ink-2)}.pp-type-mark svg{width:12px;height:12px;stroke-width:2.1}' +
      '.pp-type-mark[data-tone="true"]{background:color-mix(in srgb,var(--pp-kind) 12%,transparent);color:color-mix(in srgb,var(--pp-kind) 74%,var(--pp-ink))}' +
      '.pp-edit{--pp-edit-accent:var(--pp-accent);--pp-edit-line:color-mix(in srgb,var(--pp-accent) 18%,var(--pp-line));--pp-edit-surface:color-mix(in srgb,var(--pp-accent) 2%,var(--pp-surface));display:flex;flex-direction:column;gap:8px;padding:10px;border:1px solid var(--pp-edit-line);border-radius:10px;background:var(--pp-edit-surface)}' +
      '.pp-edit[data-domain="annotations"]{--pp-edit-accent:var(--pp-note-accent);--pp-edit-line:color-mix(in srgb,var(--pp-note) 28%,var(--pp-line));--pp-edit-surface:color-mix(in srgb,var(--pp-note) 3%,var(--pp-surface))}' +
      '.pp-edit-title{display:flex;align-items:center;gap:7px;min-width:0}' +
      '.pp-edit-title .pp-input{flex:1;min-width:0}' +
      '.pp-edit .pp-edit-title-input{height:28px;padding:0 8px;border-radius:7px;background:color-mix(in srgb,var(--pp-edit-accent) 4%,var(--dsw-alias-bg-base));font-size:12px}' +
      '.pp-edit-quote{flex:1;min-width:0;display:flex;align-items:center;height:28px;box-sizing:border-box;padding:0 8px;border:1px solid var(--pp-edit-line);border-radius:7px;background:color-mix(in srgb,var(--pp-edit-accent) 5%,var(--dsw-alias-bg-base));color:var(--pp-ink-2);font-size:11px;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.pp-type-picks{display:flex;flex-wrap:wrap;align-items:center;gap:3px}' +
      '.pp-type-pick{display:inline-flex;align-items:center;gap:3px;height:22px;padding:0 6px;border:1px solid var(--pp-edit-line);border-radius:7px;background:transparent;color:var(--pp-ink-2);font:inherit;font-size:10.5px;cursor:pointer;white-space:nowrap}' +
      '.pp-type-pick:hover{background:color-mix(in srgb,var(--pp-kind) 8%,transparent);border-color:color-mix(in srgb,var(--pp-kind) 36%,var(--pp-edit-line));color:var(--pp-ink)}' +
      '.pp-type-pick[data-active="true"]{border-color:color-mix(in srgb,var(--pp-kind) 55%,transparent);background:color-mix(in srgb,var(--pp-kind) 14%,transparent);color:color-mix(in srgb,var(--pp-kind) 72%,var(--pp-ink))}' +
      '.pp-type-pick-icon{display:inline-flex;align-items:center;color:color-mix(in srgb,var(--pp-kind) 72%,var(--pp-ink))}' +
      '.pp-type-pick-icon svg{width:12px;height:12px;stroke-width:2.1}' +
      '.pp-type-pick-x{display:inline-flex;align-items:center;margin-left:1px;color:color-mix(in srgb,var(--pp-kind) 64%,var(--pp-ink))}' +
      '.pp-type-pick-x svg{width:10px;height:10px;stroke-width:2.2}' +
      '.pp-input,.pp-textarea{width:100%;box-sizing:border-box;border:1px solid var(--pp-line);border-radius:6px;background:var(--dsw-alias-bg-base);color:var(--pp-ink);font:inherit;font-size:12px;padding:5px 7px;outline:none;resize:vertical}' +
      '.pp-input:focus,.pp-textarea:focus{border-color:var(--pp-accent)}' +
      '.pp-edit .pp-edit-select{height:28px;padding:0 6px;border-radius:7px;font-size:11px}' +
      '.pp-edit-meta{display:flex;align-items:center;gap:8px;min-height:28px}' +
      '.pp-edit-tools{display:flex;align-items:center;gap:6px;padding:0 6px 6px}' +
      '.pp-edit .pp-image-picker-compact{display:flex;align-items:center;gap:0;margin:0;padding:0}' +
      '.pp-body-add{width:28px;height:28px;flex:none;display:inline-flex;align-items:center;justify-content:center;padding:0;border:0;border-radius:7px;background:transparent;color:var(--pp-ink-2);cursor:pointer}' +
      '.pp-body-add:hover:not([disabled]){background:color-mix(in srgb,var(--pp-edit-accent) 10%,transparent);color:var(--pp-edit-accent)}' +
      '.pp-body-add[disabled]{opacity:.4;cursor:default}' +
      '.pp-body-add svg{width:16px;height:16px}' +
      '.pp-edit-actions{display:flex;align-items:center;justify-content:flex-end;gap:6px;min-height:28px}' +
      '.pp-edit-actions .pp-grow{flex:1}' +
      '.pp-edit-actions .pp-mini{height:28px;padding:0 12px;border-radius:7px}' +
      '.pp-edit-actions .pp-primary{height:28px;padding:0 14px;border-radius:7px}' +
      '.pp-edit[data-domain="annotations"] .pp-primary{border-color:var(--pp-note-accent);background:var(--pp-note-accent)}' +
      '.pp-edit-hint{margin-right:auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--pp-ink-2);font-size:11px}' +
      '.pp-edit-count{flex:none;color:var(--pp-ink-2);font-size:11px;font-variant-numeric:tabular-nums}' +
      '.pp-edit-count[data-near="true"]{color:var(--pp-note-ink)}' +
      '.pp-edit-count[data-full="true"]{color:var(--pp-danger)}' +
      '.pp-mention{position:relative;flex:1;display:flex}' +
        '.pp-mention-menu{position:absolute;z-index:6;top:100%;left:0;right:0;margin-top:2px;max-height:180px;overflow:auto;border:1px solid var(--pp-line-2);border-radius:8px;background:var(--pp-surface);box-shadow:0 8px 24px rgba(0,0,0,.14)}' +
        '.pp-mention-note{padding:8px 10px;font-size:11px;color:var(--pp-ink-2)}' +
        '.pp-mention-item{display:flex;gap:8px;align-items:baseline;width:100%;padding:6px 10px;border:0;background:none;text-align:left;font:inherit;color:var(--pp-ink);cursor:pointer}' +
        '.pp-mention-item[data-active="true"],.pp-mention-item:hover{background:var(--pp-hover)}' +
        '.pp-mention-name{font-size:12px;white-space:nowrap}' +
        '.pp-mention-hint{color:var(--pp-ink-2);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
        '.pp-textarea{min-height:64px}' +
      '.pp-images{display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin-top:4px}' +
      '.pp-images-compact{gap:3px;margin-top:3px}' +
      '.pp-image{position:relative;display:inline-flex;width:44px;height:44px;flex:none;border:1px solid var(--pp-line);border-radius:6px;background:var(--pp-surface-2);overflow:hidden;cursor:zoom-in}' +
      '.pp-images-compact .pp-image{width:32px;height:32px}' +
      '.pp-image img{width:100%;height:100%;object-fit:cover;display:block}' +
      '.pp-image-empty{display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:var(--pp-ink-2)}' +
      '.pp-image-empty svg{width:20px;height:20px}' +
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
      '.pp-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:0;border-radius:7px;background:transparent;color:var(--pp-ink-2);font:inherit;cursor:pointer;flex:none}' +
      '.pp-icon-btn:hover{background:color-mix(in srgb,var(--pp-danger) 10%,transparent);color:var(--pp-danger)}' +
      '.pp-icon-btn svg{width:16px;height:16px}' +
      '.pp-mode{display:inline-flex;align-items:center;gap:2px;padding:2px;border-radius:8px;background:color-mix(in srgb,var(--pp-ink) 6%,transparent);flex:none}' +
      '.pp-mode button{height:22px;padding:0 9px;border:0;border-radius:6px;background:transparent;color:var(--pp-ink-2);font:inherit;font-size:11px;line-height:1;cursor:pointer;white-space:nowrap}' +
      '.pp-mode button[data-active="true"]{background:var(--pp-surface-2);color:var(--pp-ink);font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.07)}' +
      '.pp-mode button:focus-visible{outline:2px solid var(--pp-accent-line);outline-offset:-2px}' +
      '.pp-tray{display:flex;flex-direction:column;gap:6px;max-height:260px;overflow-y:auto}' +
      '.pp-foot .pp-tray{max-height:min(40vh,220px)}' +
      '.pp-chip{display:flex;align-items:flex-start;gap:6px;padding:5px 7px;border-radius:8px;border:1px solid var(--pp-line);background:transparent;min-width:0;transition:background-color .12s ease,border-color .12s ease}' +
      '.pp-chip:hover,.pp-chip:focus-within{background:color-mix(in srgb,var(--pp-accent) 9%,transparent);border-color:color-mix(in srgb,var(--pp-accent) 40%,var(--pp-line))}' +
      '.pp-chip-actions{display:flex;gap:2px;flex:none;align-self:flex-start;opacity:.45;transition:opacity .12s ease}' +
      '.pp-chip:hover .pp-chip-actions,.pp-chip:focus-within .pp-chip-actions{opacity:1}' +
      '@media (hover:none){.pp-chip-actions{opacity:1}}' +
      '.pp-chip-n{flex:none;padding-top:1px;font-size:11px;line-height:1.55;font-variant-numeric:tabular-nums;color:var(--pp-ink-2)}' +
      '.pp-chip-source{flex:none;align-self:flex-start;display:inline-flex;align-items:center;gap:3px;margin-top:2px;padding:0 5px;border-radius:5px;background:color-mix(in srgb,var(--pp-ink-2) 10%,transparent);color:var(--pp-ink-2);font-size:9.5px;line-height:15px}' +
      '.pp-chip-source-icon{display:inline-flex;align-items:center}.pp-chip-source-icon svg{width:12px;height:12px}' +
      '.pp-chip-t{flex:1;min-width:0;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;font-size:12px;line-height:1.55;color:var(--pp-ink);display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}' +
      '.pp-chip .pp-icon{width:22px;height:22px}' +
      '.pp-actions .pp-icon svg,.pp-chip-actions .pp-icon svg{width:14px;height:14px}' +
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
      '.pp-selkind-icon{flex:none;display:inline-flex;align-items:center;justify-content:center;width:16px;color:color-mix(in srgb,var(--pp-kind,#a97a24) 75%,var(--pp-ink))}.pp-selkind-icon svg{width:14px;height:14px}' +
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
      // Every kind carries its own vivid underline, matching its badge and the
      // chips in the editor. The 2px line stays light enough to read as one
      // annotation layer even when several kinds sit in the same reply.
      '::highlight(prompt-pool-note-agree){text-decoration-line:underline;text-decoration-style:solid;text-decoration-color:#22c55e;text-decoration-thickness:2px;text-underline-offset:2px}' +
      '::highlight(prompt-pool-note-disagree){text-decoration-line:underline;text-decoration-style:solid;text-decoration-color:#ef4444;text-decoration-thickness:2px;text-underline-offset:2px}' +
      '::highlight(prompt-pool-note-question){text-decoration-line:underline;text-decoration-style:solid;text-decoration-color:#3b82f6;text-decoration-thickness:2px;text-underline-offset:2px}' +
      '::highlight(prompt-pool-note-comment){text-decoration-line:underline;text-decoration-style:solid;text-decoration-color:#0891b2;text-decoration-thickness:2px;text-underline-offset:2px}' +
      '::highlight(prompt-pool-note-idea){text-decoration-line:underline;text-decoration-style:solid;text-decoration-color:#f97316;text-decoration-thickness:2px;text-underline-offset:2px}' +
      '::highlight(prompt-pool-note-supplement){text-decoration-line:underline;text-decoration-style:solid;text-decoration-color:#8b5cf6;text-decoration-thickness:2px;text-underline-offset:2px}' +
      '::highlight(prompt-pool-note-todo){text-decoration-line:underline;text-decoration-style:dashed;text-decoration-color:#e0a800;text-decoration-thickness:2px;text-underline-offset:2px}' +
      '.pp-note-layer{--pp-note-accent:var(--pp-annotation,#8a6200);--pp-note-ink:var(--dsw-alias-label-primary,#111827);--pp-note-ink-2:var(--dsw-alias-label-secondary,#6b7280);--pp-note-line:var(--dsw-alias-border-l1,#e5e7eb);--pp-note-surface:var(--dsw-alias-bg-overlay,#fff);--pp-note-hover:color-mix(in srgb,var(--pp-note-ink) 8%,transparent);--pp-note-danger:var(--dsw-alias-state-error-primary,#dc2626);--pp-note-ok:var(--dsw-alias-state-success-primary,#16a34a);position:fixed;inset:0;z-index:2147482000;pointer-events:none}' +
      '.pp-note-bubble{position:fixed;z-index:1;display:flex;flex-direction:column;gap:8px;width:310px;max-width:calc(100vw - 24px);max-height:calc(100vh - 24px);overflow:auto;box-sizing:border-box;padding:11px;border:1px solid var(--pp-note-line);border-radius:12px;background:var(--pp-note-surface);box-shadow:0 18px 48px rgba(0,0,0,.22),0 2px 6px rgba(0,0,0,.08);color:var(--pp-note-ink);font-size:12px;line-height:1.5;text-align:left;pointer-events:auto}' +
      '.pp-note-bubble-quote{box-sizing:border-box;padding:6px 8px;border-radius:8px;background:color-mix(in srgb,var(--pp-bubble-kind,#a97a24) 10%,transparent);color:var(--pp-note-ink-2);font-size:11px;line-height:1.5;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:4;overflow:hidden}.pp-note-bubble-quote-icon{display:inline-flex;align-items:center;vertical-align:-2px;margin-right:4px;color:color-mix(in srgb,var(--pp-bubble-kind,#a97a24) 75%,var(--pp-note-ink))}.pp-note-bubble-quote-icon svg{width:12px;height:12px;stroke-width:2.1}' +
      '.pp-note-bubble-hint{color:var(--pp-note-danger);font-size:11px}' +
      
      '.pp-note-input{width:100%;box-sizing:border-box;min-height:48px;max-height:120px;padding:6px 8px;border:1px solid var(--pp-note-line);border-radius:8px;background:color-mix(in srgb,var(--pp-note-ink) 3%,transparent);color:inherit;font:inherit;font-size:12px;line-height:1.5;resize:none;outline:none}' +
      '.pp-note-input:focus{border-color:color-mix(in srgb,var(--pp-bubble-kind,#a97a24) 72%,transparent);box-shadow:0 0 0 2px color-mix(in srgb,var(--pp-bubble-kind,#a97a24) 14%,transparent)}' +
      '.pp-edit .pp-edit-input,.pp-edit .pp-textarea{width:100%;box-sizing:border-box;min-height:84px;max-height:180px;padding:7px 9px;border:1px solid var(--pp-edit-line);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--pp-ink);font:inherit;font-size:12px;line-height:1.55;resize:none;outline:none}' +
      '.pp-edit .pp-edit-input:focus,.pp-edit .pp-textarea:focus{border-color:color-mix(in srgb,var(--pp-edit-accent) 72%,var(--pp-edit-line));box-shadow:0 0 0 2px color-mix(in srgb,var(--pp-edit-accent) 14%,transparent)}' +
      '.pp-edit-body{display:flex;flex-direction:column;min-height:90px;border:1px solid var(--pp-edit-line);border-radius:8px;background:var(--dsw-alias-bg-base);overflow:hidden}' +
      '.pp-edit-body:focus-within{border-color:color-mix(in srgb,var(--pp-edit-accent) 72%,var(--pp-edit-line));box-shadow:0 0 0 2px color-mix(in srgb,var(--pp-edit-accent) 14%,transparent)}' +
      '.pp-edit-attachments{display:flex;flex-wrap:wrap;gap:6px;padding:8px 8px 0}' +
      '.pp-edit .pp-edit-attachments .pp-images{margin-top:0;gap:6px}' +
      '.pp-edit .pp-edit-attachments .pp-image{width:52px;height:52px;border-radius:9px}' +
      '.pp-edit-body .pp-textarea,.pp-edit-body .pp-edit-input{flex:1;min-height:84px;max-height:180px;border:0;border-radius:0;background:transparent;box-shadow:none;padding:8px 9px}' +
      '.pp-edit-body .pp-textarea:focus,.pp-edit-body .pp-edit-input:focus{border-color:transparent;box-shadow:none}' +
      '.pp-note-bubble-foot{display:flex;align-items:center;gap:8px}.pp-note-bubble-ask{flex:1;color:var(--pp-note-ink-2);font-size:11px;line-height:1.4}.pp-note-bubble-actions{display:flex;gap:6px;margin-left:auto}.pp-note-bubble .pp-note-btn{height:24px;padding:0 9px;font-size:11px;border-radius:7px}.pp-note-btn-quiet-danger{border-color:transparent;background:transparent;color:var(--pp-note-danger)}.pp-note-btn-quiet-danger:hover{background:rgba(var(--pp-note-danger-rgb,239,68,68),.10)}' +
      '.pp-note-btn{height:24px;padding:0 10px;border:1px solid var(--pp-note-line);border-radius:7px;background:transparent;color:var(--pp-note-ink);font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}' +
      '.pp-review-secondary{border-color:var(--pp-line-2);background:var(--pp-surface);color:var(--pp-ink);font-weight:500;box-shadow:0 1px 2px rgba(0,0,0,.06)}' +
      '.pp-review-secondary:hover{background:var(--pp-hover);border-color:color-mix(in srgb,var(--pp-accent) 35%,var(--pp-line-2))}' +
      '.pp-review-secondary[disabled]{opacity:.55;cursor:default}' +
      '.pp-note-btn:hover{background:var(--pp-note-hover)}' +
      '.pp-note-btn:disabled{opacity:.45;cursor:default}' +
      '.pp-note-btn-primary{border-color:var(--pp-note-accent);background:var(--pp-note-accent);color:#fff}' +
      '.pp-note-btn-primary:hover{background:var(--pp-note-accent);filter:brightness(1.05)}' +
      '.pp-note-btn-danger{color:var(--pp-note-danger);border-color:color-mix(in srgb,var(--pp-note-danger) 40%,transparent)}' +
      '.pp-note-btn-danger:hover{background:color-mix(in srgb,var(--pp-note-danger) 10%,transparent)}' +
      '.pp-notes{--pp-note-accent:var(--pp-annotation,#8a6200);--pp-note-ink:var(--dsw-alias-label-primary,#111827);--pp-note-ink-2:var(--dsw-alias-label-secondary,#6b7280);--pp-note-line:var(--dsw-alias-border-l1,#e5e7eb);--pp-note-surface:var(--dsw-alias-bg-overlay,#fff);--pp-note-hover:color-mix(in srgb,var(--pp-note-ink) 8%,transparent);--pp-note-danger:var(--dsw-alias-state-error-primary,#dc2626);--pp-note-ok:var(--dsw-alias-state-success-primary,#16a34a);display:flex;flex-direction:column;box-sizing:border-box;width:100%;border:1px solid var(--pp-note-line);border-radius:10px;background:color-mix(in srgb,var(--pp-note) 4%,var(--dsw-alias-bg-base,#fff));color:var(--pp-note-ink);font-size:12px;line-height:1.5}' +
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
      '.pp-notes-row{display:flex;align-items:flex-start;gap:8px;min-height:44px;box-sizing:border-box;padding:5px 6px;border:1px solid transparent;border-radius:8px;background:transparent;transition:background-color .2s ease,border-color .2s ease,box-shadow .2s ease}' +
      '.pp-notes-row:hover{background:color-mix(in srgb,var(--pp-note) 9%,transparent)}' +
      '.pp-note-check{flex:none;width:14px;height:14px;margin:4px 0 0;accent-color:var(--pp-note);cursor:pointer}' +
      '.pp-notes-row .pp-notes-review-check{accent-color:var(--pp-note-accent)}' +
      '.pp-notes-n{flex:none;min-width:16px;height:16px;margin-top:1px;border-radius:999px;background:color-mix(in srgb,var(--pp-note) 18%,transparent);color:var(--pp-note-ink);font-size:10px;line-height:16px;text-align:center;font-variant-numeric:tabular-nums}' +
      '.pp-notes-main{flex:1;min-width:0}' +
      '.pp-notes-quote{display:flex;align-items:center;gap:6px;color:var(--pp-note-ink-2);font-size:11px;white-space:nowrap;overflow:hidden}' +
      '.pp-notes-quote .pp-type-mark{background:color-mix(in srgb,var(--pp-kind,var(--pp-note-accent)) 24%,transparent);color:color-mix(in srgb,var(--pp-kind,var(--pp-note-accent)) 72%,var(--pp-note-ink));border:0}' +
      '.pp-notes-quote-text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}' +
      '.pp-notes-empty{padding:14px 12px;color:var(--pp-note-ink-2);font-size:12px;line-height:1.6}' +
      '.pp-notes-empty .pp-empty-mark{justify-content:flex-start;margin-bottom:4px;opacity:.5}' +
      '.pp-notes-empty .pp-empty-mark svg{width:20px;height:20px}' +
      '.pp-page-foot.pp-review-foot{--pp-note-accent:var(--pp-annotation,#8a6200);--pp-note-ink:var(--dsw-alias-label-primary,#111827);--pp-note-ink-2:var(--dsw-alias-label-secondary,#6b7280);--pp-note-line:var(--dsw-alias-border-l1,#e5e7eb);--pp-note-surface:var(--dsw-alias-bg-overlay,#fff);padding:0;gap:0;border-color:var(--pp-line-2);background:var(--pp-queue-bg);box-shadow:0 1px 3px rgba(0,0,0,.08)}' +
      '.pp-page-foot.pp-merge-foot{--pp-note-accent:var(--pp-accent)}' +
      '.pp-page-foot.pp-merge-foot .pp-notes{--pp-note-accent:var(--pp-accent)}' +
      '.pp-review-foot>.pp-review{padding:0;gap:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}' +
      '.pp-review{display:flex;flex-direction:column;min-height:0}' +
      '.pp-review-top{position:sticky;top:0;z-index:4;background:var(--pp-queue-head-bg);border-bottom:1px solid var(--pp-line)}' +
      '.pp-review-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;row-gap:4px;padding:8px 12px 4px;background:transparent}' +
      '.pp-review-title{display:flex;flex-direction:column;gap:0;min-width:0}' +
      '.pp-review-headline{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0}' +
      '.pp-review-headline strong{font-size:13px;font-weight:600;line-height:1.25;white-space:nowrap}' +
      '.pp-review-batch{color:var(--pp-note-ink-2);font-size:9.5px;letter-spacing:.02em;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.pp-review-close{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:1px solid transparent;border-radius:7px;background:transparent;color:var(--pp-note-ink-2);cursor:pointer}' +
      '.pp-review-close svg{width:14px;height:14px}' +
      '.pp-review-toggle{margin-left:-4px}' +
      '.pp-review-process{flex:none;height:24px;padding:0 9px;border-radius:7px;font-size:11px;line-height:1}' +
      '.pp-review-close:hover{background:var(--pp-note-hover);color:var(--pp-note-ink)}' +
      '.pp-review-mark{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;flex:none;border-radius:8px;background:color-mix(in srgb,var(--pp-note-accent) 13%,transparent);color:var(--pp-note-accent)}.pp-review-mark svg{width:14px;height:14px}' +
      '.pp-review-steps{display:flex;align-items:center;gap:7px;padding:0 12px 6px}' +
      '.pp-review-step{display:inline-flex;align-items:center;gap:5px;color:var(--pp-note-ink-2);font-size:10.5px;line-height:1;opacity:.72}' +
      '.pp-review-step[data-active="true"]{color:var(--pp-note-accent);opacity:1;font-weight:600}' +
      '.pp-review-step-num{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border:1px solid color-mix(in srgb,var(--pp-note-line) 90%,transparent);border-radius:50%;font-size:9px;font-variant-numeric:tabular-nums}' +
      '.pp-review-step[data-active="true"] .pp-review-step-num{border-color:var(--pp-note-accent);background:var(--pp-note-accent);color:#fff}' +
      '.pp-review-step-sep{color:var(--pp-note-ink-2);font-size:11px;opacity:.45}' +
      '.pp-review-pane{display:flex;flex-direction:column;min-height:0}' +
      '.pp-review-pane[data-active="true"]{flex:1;min-height:0}' +
      '.pp-review-pane[hidden]{display:none}' +
      '.pp-review-chip{display:inline-flex;align-items:center;height:19px;padding:0 7px;border:1px solid color-mix(in srgb,var(--pp-note-line) 85%,transparent);border-radius:999px;background:color-mix(in srgb,var(--pp-note-ink) 3%,transparent);color:var(--pp-note-ink-2);font-size:10px;line-height:1;font-variant-numeric:tabular-nums}' +
      '.pp-review-chip-accent{border-color:color-mix(in srgb,var(--pp-note-accent) 34%,transparent);background:color-mix(in srgb,var(--pp-note-accent) 10%,transparent);color:var(--pp-note-accent)}' +
      '.pp-review-list{display:flex;flex-direction:column;gap:8px;padding:6px 12px 10px;max-height:none;overflow:visible}' +
      '.pp-review-group{display:flex;flex-direction:column;gap:4px}' +
      '.pp-review-group-title{display:flex;align-items:center;gap:6px;padding:1px 1px 2px;color:var(--pp-note-ink-2);font-size:10.5px;font-weight:600;letter-spacing:.02em}' +
      '.pp-review-group-dot{width:7px;height:7px;flex:none;border-radius:50%}' +
      '.pp-review-group-count{margin-left:auto;min-width:17px;height:17px;padding:0 5px;border-radius:999px;background:color-mix(in srgb,var(--pp-note-ink) 6%,transparent);color:var(--pp-note-ink-2);font-size:9.5px;line-height:17px;text-align:center;font-variant-numeric:tabular-nums}' +
      '.pp-review-row{display:flex;align-items:flex-start;gap:7px;padding:6px 8px;border:1px solid var(--pp-line);border-radius:8px;background:transparent;transition:background-color .12s ease,border-color .12s ease}' +
      '.pp-review-row:hover{background:color-mix(in srgb,var(--pp-accent) 6%,transparent);border-color:color-mix(in srgb,var(--pp-accent) 40%,var(--pp-line))}' +
      '.pp-review-row .pp-note-check{width:14px;height:14px;margin-top:4px;accent-color:var(--pp-note-accent)}' +
      '.pp-review-main{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}' +
      '.pp-review-quote{color:var(--pp-note-ink-2);font-size:11px;line-height:1.45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.pp-review-body{margin-top:1px;color:var(--pp-note-ink);font-size:12px;line-height:1.5;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;word-break:break-word}' +
      '.pp-review-exec{display:inline-flex;align-items:center;gap:5px;align-self:flex-start;margin-top:5px;padding:2px 7px;border:1px solid color-mix(in srgb,var(--pp-note-line) 85%,transparent);border-radius:999px;background:color-mix(in srgb,var(--pp-note-ink) 3%,transparent);color:var(--pp-note-ink-2);font-size:10.5px;line-height:16px;cursor:pointer;transition:border-color .15s,background .15s,color .15s}' +
      '.pp-review-exec:hover{border-color:color-mix(in srgb,var(--pp-note-accent) 30%,var(--pp-note-line))}' +
      '.pp-review-exec[data-active="true"]{border-color:color-mix(in srgb,var(--pp-note-accent) 42%,transparent);background:color-mix(in srgb,var(--pp-note-accent) 11%,transparent);color:var(--pp-note-accent)}' +
      '.pp-review-exec input{width:12px;height:12px;margin:0;accent-color:var(--pp-note-accent);cursor:pointer}' +
      '.pp-review-todo-choice{display:inline-flex;align-items:center;gap:2px;align-self:flex-start;margin-top:5px;padding:2px;border:1px solid color-mix(in srgb,var(--pp-note-line) 85%,transparent);border-radius:999px;background:color-mix(in srgb,var(--pp-note-ink) 3%,transparent)}' +
      '.pp-review-todo-option{display:inline-flex;align-items:center;gap:4px;height:20px;padding:0 7px;border-radius:999px;color:var(--pp-note-ink-2);font-size:10.5px;line-height:1;cursor:pointer;transition:background .15s,color .15s}' +
      '.pp-review-todo-option[data-active="true"]{background:color-mix(in srgb,var(--pp-note-accent) 11%,transparent);color:var(--pp-note-accent)}' +
      '.pp-review-todo-option input{width:11px;height:11px;margin:0;accent-color:var(--pp-note-accent);cursor:pointer}' +
      '.pp-review-preview-wrap{display:flex;flex:1;flex-direction:column;gap:5px;min-height:0;margin:8px 12px;padding:7px 8px;border:1px solid var(--pp-line);border-radius:8px;background:var(--pp-surface)}' +
      '.pp-review-head-actions{display:flex;align-items:center;justify-content:flex-end;gap:6px;flex:none;flex-wrap:wrap}' +
      '.pp-review-select-actions{display:flex;align-items:center;gap:8px;flex:none}' +
      '.pp-review-select-tools{gap:6px;margin-left:2px}' +
      '.pp-review-select-dot{color:var(--pp-ink-3);font-size:11px;line-height:1}' +
      '.pp-review-preview-hint{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:0 1px;color:var(--pp-note-ink-2);font-size:10.5px;line-height:1.45}' +
      '.pp-merge-attachments{display:flex;flex-direction:column;gap:4px;min-width:0;padding:0 1px}' +
      '.pp-merge-attachments-label{color:var(--pp-note-ink-2);font-size:10.5px;line-height:1.5}' +
      '.pp-review-hint-text{flex:1;min-width:0}' +
      '.pp-review-refresh{flex:none;padding:0;font-size:10.5px;line-height:1.45}' +
      '.pp-review-text{box-sizing:border-box;flex:1;width:100%;min-height:160px;padding:7px 8px;border:1px solid var(--pp-line);border-radius:7px;background:var(--pp-surface);color:var(--pp-ink);font:inherit;font-size:11.5px;line-height:1.5;resize:vertical;outline:none}' +
      '.pp-review-text:focus{border-color:var(--pp-note-accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--pp-note-accent) 14%,transparent)}' +
      // Dock-card consistency: the review card reuses the Outbox shell, header rhythm, grip and action sizes, with its own warm accent.
      '.pp-review-dock{--pp-summary-accent:var(--pp-annotation);--pp-summary-head-bg:var(--pp-annotation-head-bg);--pp-summary-bg:var(--pp-annotation-bg)}' +
      '.pp-review-dock .pp-page-foot.pp-review-foot{background:var(--pp-summary-bg);border-color:color-mix(in srgb,#e8b028 20%,var(--pp-line-2))}' +
      '.pp-review-dock .pp-review-top{background:var(--pp-summary-head-bg);border-bottom:0}' +
      '.pp-review-dock .pp-review-head{padding:8px 12px}' +
      '.pp-review-dock .pp-review-headline strong{font-size:12.5px;font-weight:600;color:var(--pp-summary-accent)}' +
      '.pp-review-dock .pp-review-chip-accent{border-color:color-mix(in srgb,var(--pp-summary-accent) 34%,transparent);background:color-mix(in srgb,var(--pp-summary-accent) 10%,transparent);color:var(--pp-summary-accent)}' +
      '.pp-review-dock .pp-review-head-actions .pp-note-btn{height:28px;padding:0 12px;border-radius:8px;font-size:12px}' +
      '.pp-review-dock .pp-review-process{height:28px;padding:0 12px;border-radius:8px;font-size:12px}' +
      '.pp-review-dock .pp-note-btn-primary{background:var(--pp-summary-accent);border-color:var(--pp-summary-accent);color:#fff}' +
      '.pp-review-dock .pp-review-secondary:hover{border-color:color-mix(in srgb,var(--pp-summary-accent) 35%,var(--pp-line-2))}' +
      '.pp-review-dock .pp-review-select-link{color:var(--pp-summary-accent);text-decoration-color:color-mix(in srgb,var(--pp-summary-accent) 45%,transparent)}' +
      '.pp-review-dock .pp-review-select-link:hover{color:var(--pp-ink);text-decoration-color:currentColor}' +
      '.pp-review-dock .pp-review-cancel{color:var(--pp-ink-2);margin-left:2px;margin-right:2px}' +
      '.pp-review-dock .pp-review-cancel:hover{color:var(--pp-ink)}' +
      '.pp-review-dock .pp-review-refresh{color:var(--pp-summary-accent)}' +
      '.pp-review-dock .pp-review-stale{color:var(--pp-summary-accent)}' +
      '.pp-review-dock .pp-review-grip:hover .pp-grip-bar,.pp-review-dock .pp-review-grip:active .pp-grip-bar{background:var(--pp-summary-accent)}' +
      '.pp-review-dock .pp-review-idle{border-color:color-mix(in srgb,var(--pp-summary-accent) 24%,var(--pp-line-2));background:color-mix(in srgb,var(--pp-summary-accent) 3%,transparent)}' +
      '.pp-review-dock .pp-review-text:focus{border-color:var(--pp-summary-accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--pp-summary-accent) 14%,transparent)}' +
      '.pp-review-dock .pp-queue-strip{background:var(--pp-summary-head-bg);border-color:color-mix(in srgb,var(--pp-summary-accent) 20%,var(--pp-line-2))}' +
      '.pp-review-dock .pp-queue-strip:hover{background:color-mix(in srgb,var(--pp-summary-accent) 16%,var(--pp-surface))}' +
      '.pp-review-dock .pp-queue-strip-action{color:var(--pp-summary-accent)}' +
      '.pp-review-dock .pp-review-strip:hover .pp-queue-strip-title{color:var(--pp-summary-accent)}' +
      '.pp-review-dock .pp-review-strip-go{background:var(--pp-summary-accent);border-color:var(--pp-summary-accent)}' +
      '.pp-review-dock .pp-queue-strip:focus-visible{outline-color:var(--pp-summary-accent)}' +
      '.pp-review-empty-send{margin:0 12px 8px;padding:7px 9px;border:1px dashed var(--pp-line);border-radius:8px;background:color-mix(in srgb,var(--pp-ink) 3%,transparent);color:var(--pp-ink-2);font-size:11px;line-height:1.5}' +
      '.pp-review-error{margin:0 12px 8px;padding:7px 9px;border-radius:7px;background:color-mix(in srgb,var(--pp-note-danger) 8%,transparent);color:var(--pp-note-danger);font-size:11px;line-height:1.5}' +
      '.pp-review-actions{position:sticky;bottom:0;z-index:4;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:7px;margin:auto 0 0;padding:8px 12px;border-top:1px solid var(--pp-line);background:var(--pp-queue-head-bg)}' +
      '.pp-review-actions .pp-note-btn{height:28px;padding:0 12px;border:1px solid var(--pp-line);border-radius:8px;background:var(--pp-surface);color:var(--pp-ink);font-weight:500}' +
      '.pp-review-actions .pp-note-btn:hover:not([disabled]){border-color:color-mix(in srgb,var(--pp-note-accent) 30%,var(--pp-note-line));background:color-mix(in srgb,var(--pp-note-ink) 3%,var(--pp-note-surface))}' +
      '.pp-review-actions .pp-note-btn-primary{border-color:transparent;background:var(--pp-note-accent);color:#fff;box-shadow:none}' +
      '.pp-review-actions .pp-note-btn-primary:hover:not([disabled]){background:var(--pp-note-accent);filter:brightness(1.05)}' +
      '.pp-review-actions .pp-review-cancel{border-color:transparent;background:transparent;color:var(--pp-note-ink-2)}' +
      '.pp-review-actions .pp-review-cancel:hover:not([disabled]){border-color:transparent;background:var(--pp-note-hover);color:var(--pp-note-ink)}' +
      '.pp-review-actions .pp-note-btn[disabled]{opacity:.5;cursor:not-allowed}' +
      '.pp-review .pp-notes-empty{margin:8px 12px}' +
      '.pp-note-bubble .pp-hint,.pp-notes .pp-hint{color:var(--pp-note-ink-2);font-size:11px;line-height:1.5}' +
      '.pp-note-bubble .pp-image-picker,.pp-notes .pp-image-picker{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:2px}' +
      '.pp-note-bubble .pp-image-add,.pp-notes .pp-image-add{height:26px;padding:0 9px;border:1px solid var(--pp-note-line);border-radius:7px;background:transparent;color:var(--pp-note-ink);font:inherit;font-size:12px;cursor:pointer}' +
      '.pp-note-bubble .pp-images,.pp-notes .pp-images{display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin-top:4px}' +
      '.pp-note-bubble .pp-images-compact,.pp-notes .pp-images-compact{gap:3px;margin-top:3px}' +
      '.pp-note-bubble .pp-image,.pp-notes .pp-image{position:relative;display:inline-flex;width:44px;height:44px;flex:none;border:1px solid var(--pp-note-line);border-radius:6px;background:color-mix(in srgb,var(--pp-note-ink) 5%,transparent);overflow:hidden;cursor:zoom-in}' +
      '.pp-note-bubble .pp-images-compact .pp-image,.pp-notes .pp-images-compact .pp-image{width:32px;height:32px}' +
      '.pp-note-bubble .pp-image img,.pp-notes .pp-image img{width:100%;height:100%;object-fit:cover;display:block}' +
      '.pp-note-bubble .pp-image-empty,.pp-notes .pp-image-empty{display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:var(--pp-note-ink-2)}' +
      '.pp-note-bubble .pp-image-x,.pp-notes .pp-image-x{position:absolute;top:1px;right:1px;width:15px;height:15px;padding:0;border:0;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;font:inherit;font-size:11px;line-height:1;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}' +
      '.pp-note-bubble .pp-image-x:hover,.pp-notes .pp-image-x:hover{background:var(--pp-note-danger)}' +
      '.pp-note-bubble .pp-image-more,.pp-notes .pp-image-more{display:inline-flex;align-items:center;justify-content:center;min-width:32px;height:32px;padding:0 4px;border-radius:6px;border:1px dashed var(--pp-note-line);color:var(--pp-note-ink-2);font-size:11px}' +
      '.pp-note-layer .pp-modal{pointer-events:auto;--pp-ink:var(--dsw-alias-label-primary,#111827);--pp-ink-2:var(--dsw-alias-label-secondary,#6b7280);--pp-line:var(--dsw-alias-border-l1,#e5e7eb);--pp-line-2:var(--dsw-alias-border-l2,#d1d5db);--pp-surface:var(--dsw-alias-bg-layer-1,#fff);--pp-surface-2:var(--dsw-alias-bg-overlay,#fff);--pp-hover:var(--dsw-alias-interactive-bg-hover,#f3f4f6);--pp-accent:var(--dsw-alias-state-business-primary,var(--dsw-alias-brand-primary,#2563eb));--pp-on-accent:#fff;--pp-danger:var(--dsw-alias-state-error-primary,#dc2626)}' +
      '.pp-note-layer .pp-lightbox,.pp-notes .pp-lightbox{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:28px;background:rgba(0,0,0,.72)}' +
      '.pp-note-layer .pp-lightbox-body,.pp-notes .pp-lightbox-body{display:flex;flex-direction:column;align-items:center;gap:8px;max-width:min(92vw,1200px);max-height:92vh}' +
      '.pp-note-layer .pp-lightbox-body img,.pp-notes .pp-lightbox-body img{max-width:100%;max-height:calc(92vh - 48px);object-fit:contain;border-radius:8px;background:var(--pp-note-surface,#fff);box-shadow:0 18px 48px rgba(0,0,0,.35)}' +
      '.pp-note-layer .pp-lightbox-empty,.pp-notes .pp-lightbox-empty{display:flex;align-items:center;justify-content:center;min-width:180px;min-height:120px;padding:16px;border:1px dashed rgba(255,255,255,.35);border-radius:8px;color:#fff;font-size:12px}' +
      '.pp-note-layer .pp-lightbox-bar,.pp-notes .pp-lightbox-bar{display:flex;align-items:center;gap:12px;max-width:100%;color:#fff;font-size:12px}' +
      '.pp-note-layer .pp-lightbox-name,.pp-notes .pp-lightbox-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.9}' +
      '.pp-note-layer .pp-lightbox-close,.pp-notes .pp-lightbox-close{width:26px;height:26px;border:1px solid rgba(255,255,255,.35);border-radius:50%;background:rgba(0,0,0,.35);color:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;font:inherit}' +
      '.pp-note-layer .pp-lightbox-close:hover,.pp-notes .pp-lightbox-close:hover{background:rgba(0,0,0,.6)}' +
      '.pp-notes-tag{flex:none;padding:0 5px;border-radius:5px;background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#2f9e63) 14%,transparent);color:var(--dsw-alias-state-success-primary,#2f9e63);font-size:10px;line-height:16px}' +
      '.pp-note-save-mask{position:fixed;inset:0;z-index:6;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.32);pointer-events:auto}' +
      '.pp-note-save-card{display:flex;flex-direction:column;gap:8px;width:min(420px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;padding:14px;border:1px solid var(--pp-note-line);border-radius:12px;background:var(--pp-note-surface);box-shadow:0 18px 48px rgba(0,0,0,.22);color:var(--pp-note-ink);font-size:12px;line-height:1.5;text-align:left}' +
      '.pp-note-save-head{display:flex;align-items:center;gap:8px}.pp-note-save-head strong{flex:1;font-size:13px}' +
      '.pp-note-save-x{width:24px;height:24px;border:0;border-radius:6px;background:transparent;color:var(--pp-note-ink-2);font:inherit;cursor:pointer}.pp-note-save-x:hover{background:var(--pp-note-hover);color:var(--pp-note-ink)}' +
      '.pp-note-save-body{min-height:96px;max-height:220px;resize:vertical}' +
      '.pp-note-save-card input.pp-note-input{height:28px;min-height:28px;max-height:28px;padding:0 8px}' +
      '.pp-note-save-row{display:flex;gap:6px}.pp-note-save-select{flex:1;min-width:0;height:28px;padding:0 6px;border:1px solid var(--pp-note-line);border-radius:7px;background:var(--pp-note-surface);color:inherit;font:inherit;font-size:11px}' +
      '.pp-note-save-hint{color:var(--pp-note-ink-2);font-size:10.5px;line-height:1.45}' +
      '.pp-note-save-actions{display:flex;justify-content:flex-end;gap:6px;margin-top:2px}' +
      '.pp-notes-row[data-promoted="true"]{border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary,#2f9e63) 35%,var(--pp-note-line))}' +
      '.pp-notes-row[data-fresh="true"]{background:color-mix(in srgb,var(--pp-note) 10%,transparent);border-color:color-mix(in srgb,var(--pp-note) 30%,var(--pp-note-line));box-shadow:inset 3px 0 0 var(--pp-note-accent)}' +
      '.pp-notes-fresh{flex:none;height:16px;padding:0 5px;border-radius:5px;background:color-mix(in srgb,var(--pp-note-accent) 14%,transparent);color:color-mix(in srgb,var(--pp-note-accent) 78%,var(--pp-note-ink));font-size:10px;line-height:16px;white-space:nowrap}' +
      // Type chips stay neutral until selected: each icon carries its kind hue,
      // and selecting one washes the capsule in that same hue.
      '.pp-note-inline{box-sizing:border-box;display:inline-flex;align-items:center;gap:.25em;height:auto;max-width:100%;margin:0 .12em 0 .32em;padding:.02em .36em;border:1px dashed color-mix(in srgb,var(--pp-kind,#a97a24) 80%,transparent);border-radius:5px;background:color-mix(in srgb,var(--pp-kind,#a97a24) 32%,transparent);color:inherit;font:inherit;font-family:var(--dsw-font-family,inherit);font-size:var(--dsh-content-font-size,14px);font-style:normal;font-weight:400;line-height:1.32;vertical-align:middle;white-space:normal;user-select:none;-webkit-user-select:none;cursor:pointer}' +
      '.pp-note-inline-icon{flex:none;display:inline-flex;align-items:center;color:color-mix(in srgb,var(--pp-kind,#a97a24) 76%,currentColor)}.pp-note-inline-icon svg{width:12px;height:12px;stroke-width:2.1}' +
      '.pp-note-inline-text{min-width:0;white-space:normal;overflow-wrap:anywhere;line-height:inherit}.pp-note-inline-text::before{content:attr(data-text)}' +
      '.pp-note-inline:hover{border-color:color-mix(in srgb,var(--pp-kind,#a97a24) 90%,transparent);background:color-mix(in srgb,var(--pp-kind,#a97a24) 40%,transparent)}' +
      '.pp-note-kinds{display:flex;flex-wrap:wrap;gap:2px;margin:0}' +
      '.pp-note-kind{display:inline-flex;align-items:center;gap:3px;height:20px;padding:0 5px;border:1px solid var(--pp-note-line);border-radius:999px;background:transparent;color:var(--pp-note-ink-2);font:inherit;font-size:10.5px;cursor:pointer}' +
      '.pp-note-kind[data-active="true"]{border-color:color-mix(in srgb,var(--pp-kind,#a97a24) 76%,transparent);color:color-mix(in srgb,var(--pp-kind,#a97a24) 52%,var(--pp-note-ink));background:color-mix(in srgb,var(--pp-kind,#a97a24) 30%,transparent)}' +
      '.pp-note-kind-icon{display:inline-flex;align-items:center;color:color-mix(in srgb,var(--pp-kind,#a97a24) 72%,var(--pp-note-ink))}.pp-note-kind-icon svg{width:12px;height:12px;stroke-width:2.1}' +
      '.pp-note-limit{color:var(--pp-note-ink-2);font-size:10px;font-variant-numeric:tabular-nums}' +
      '.pp-note-limit-count{font-variant-numeric:tabular-nums}' +
      '.pp-note-prompt{position:fixed;z-index:3;display:flex;flex-direction:column;gap:2px;width:210px;box-sizing:border-box;padding:5px;border:1px solid var(--pp-note-line);border-radius:10px;background:var(--pp-note-surface);box-shadow:0 14px 34px rgba(0,0,0,.2);color:var(--pp-note-ink);font-size:12px;line-height:1.5;text-align:left;pointer-events:auto}' +
      '.pp-note-prompt-title{padding:2px 8px 4px;color:var(--pp-note-ink-2);font-size:11px}' +
      '.pp-note-prompt-list{display:flex;flex-direction:column;max-height:250px;overflow-y:auto}' +
      '.pp-note-prompt-row{display:flex;align-items:center;gap:6px;width:100%;height:26px;padding:0 8px;border:0;border-radius:6px;background:transparent;color:var(--pp-note-ink);font:inherit;font-size:12px;text-align:left;cursor:pointer}' +
      '.pp-note-prompt-row:hover,.pp-note-prompt-row:focus-visible{background:var(--pp-note-hover);outline:none}' +
      '.pp-note-prompt-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.pp-note-prompt-tag{flex:none;padding:0 5px;border-radius:5px;background:color-mix(in srgb,var(--pp-note-accent,#8a6200) 12%,transparent);color:var(--pp-note-ink-2);font-size:10px;line-height:16px}' +
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
      '.pp-review-select-link{color:var(--pp-accent);text-decoration:underline;text-decoration-color:color-mix(in srgb,var(--pp-accent) 45%,transparent);text-underline-offset:3px;text-decoration-thickness:1px}' +
      '.pp-review-select-link:hover{color:var(--pp-ink);text-decoration-color:currentColor;text-decoration-thickness:1.5px}' +
      '.pp-note-link-danger:hover{color:var(--pp-note-danger)}.pp-note-icon{display:inline-flex;align-items:center;justify-content:center;flex:none;width:22px;height:22px;padding:0;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--pp-note-ink-2);cursor:pointer}.pp-note-icon:hover{background:var(--pp-note-hover);color:var(--pp-note-ink)}.pp-note-icon.pp-note-link-danger:hover{color:var(--pp-note-danger)}.pp-note-ask{display:inline-flex;align-items:center;gap:4px;color:var(--pp-note-ink-2);font-size:11px;white-space:nowrap}' +
      'html.pp-pick-cursor .pp-pick-hover,html.pp-pick-cursor .pp-pick-hover *{cursor:url("data:image/svg+xml,%3Csvg%20xmlns=\'http://www.w3.org/2000/svg\'%20width=\'24\'%20height=\'24\'%20viewBox=\'0%200%2024%2024\'%3E%3Cpath%20d=\'M5%203.5h7.5v2H7v6H5z\'%20fill=\'%23d9a441\'%20stroke=\'%23fff\'%20stroke-width=\'1\'/%3E%3Cpath%20d=\'M12%2011v9M7.5%2015.5h9\'%20stroke=\'%23d9a441\'%20stroke-width=\'2\'%20stroke-linecap=\'round\'/%3E%3C/svg%3E") 5 4,crosshair!important}' +
      'html.pp-pick-cursor .pp-pick-bar,html.pp-pick-cursor .pp-pick-bar *{cursor:default!important}' +
      'html.pp-pick-cursor .pp-pick-btn{cursor:pointer!important}' +
      '.pp-pick-box{position:fixed;z-index:1;display:none;box-sizing:border-box;border:1.5px solid rgba(217,164,65,.92);border-radius:4px;background:rgba(217,164,65,.09);box-shadow:0 0 0 1px rgba(255,255,255,.35) inset;pointer-events:none}' +
      '.pp-pick-label{position:fixed;z-index:3;display:none;max-width:272px;box-sizing:border-box;padding:2px 6px;border-radius:5px;background:var(--pp-note-accent);color:#fff;font:inherit;font-size:11px;line-height:1.45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,.16)}' +
      '.pp-pick-bar{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:4;display:flex;align-items:center;gap:6px;max-width:calc(100vw - 24px);box-sizing:border-box;padding:7px 8px 7px 12px;border:1px solid var(--pp-note-line);border-radius:10px;background:var(--pp-note-surface);box-shadow:0 12px 32px rgba(0,0,0,.18),0 2px 6px rgba(0,0,0,.08);color:var(--pp-note-ink);font:inherit;font-size:11px;line-height:1.4;pointer-events:auto;cursor:default}' +
      '.pp-pick-bar .pp-pick-text{flex:1 1 90px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--pp-note-ink-2)}' +
      '.pp-pick-btn{height:24px;padding:0 9px;border:1px solid var(--pp-note-line);border-radius:7px;background:transparent;color:var(--pp-note-ink);font:inherit;font-size:11px;white-space:nowrap;cursor:pointer}' +
      '.pp-pick-btn:hover{background:var(--pp-note-hover)}' +
      '.pp-pick-btn.pp-pick-primary{border-color:transparent;background:var(--pp-note-accent);color:#fff}' +
      '.pp-pick-btn.pp-pick-primary:hover{filter:brightness(1.06)}' +
      '.pp-notes-row[data-editing="true"]{background:transparent;border:0;padding:0}' +
      '.pp-notes-text[data-editable="true"]{cursor:text}' +
      '.pp-notes-text[data-editable="true"]:hover{color:var(--pp-ink)}' +
      '.pp-notes-text[data-empty="true"]{color:var(--pp-ink-2);font-style:italic}';

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
        // The right sidebar owns the page tab strip; the trigger opens our page
        // through it instead of the composer panel when it is present.
        bindOptional(['sidebarRight'], (target) => {
          rightSidebarFace = serviceOf(target, 'sidebarRight');
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
                  // Capture before the surface mounts: opening it may collapse
                  // the browser selection before the React state initializer runs.
                  pendingNoteAnchor = captureNoteAnchor(request.sessionId || (request.session && request.session.id) || '');
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
            icon: (size) => h(PromptPoolBrandMark, { size }),
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
                icon: () => h(PromptPoolBrandMark, { size: 17 }),
              }],
            }));
            // Only from here on does openTab have a page to land on.
            nativeTabReady = true;
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

