# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project uses
[semantic versioning](https://semver.org/).

## [Unreleased]

### Added

- Scope tabs: the composer panel now separates **Annotations** (current session) from **Prompts**
  (current workspace); the sidebar separates **Current session**, **Current workspace** and **Global
  shared pool**. Both default to the current session. Existing list rows, icons and actions are reused.
- Workspace prompts no longer use group tabs; they are filtered by a single prompt type. The global
  shared pool keeps the existing built-in/custom group tabs.
- Prompt types: decision / question / opinion / idea / supplement / to-do / inspiration, with a single
  optional value per prompt. Annotation kinds seed the type on save; the type is filterable and editable.
- A save-as-prompt step for notes: edit the title, body, images, type and target group, with a reminder
  that the conversation context is not carried over.
- Outbox entries now carry their target session, so queued prompt items are shown and released only in
  the session they were queued for. Legacy entries without a target remain visible everywhere.
- Annotations queue individually from the row, with kind, quote and body kept as structured source
  metadata. The selection checkboxes and the header Summary Review action were removed; annotations
  and prompts no longer expose a direct-send action, so Outbox is the only send path.
- Outbox entries are labelled by source: prompt, annotation or review.
- **Merge & send** now opens a read-only merge preview with per-entry selection, order, source labels
  and a combined-text preview before anything is submitted.
- Action icons are slightly tighter (24px buttons, no inter-button gap) while keeping the 24px hit area.
- Settings were rebased on the scope model: the page has **Annotations / Prompts / Global shared pool**
  and opens on Annotations. The old default-tab, workspace-visibility, current-workspace-first and
  workspace group-display controls are removed; stored copies are cleaned on load. Save and capture
  destinations now list the current workspace plus the global shared pool only.
- Non-image attachment capture: store the composer's files in the pool and re-attach them on insert
  and release.

### Changed

- Scope tabs now carry restrained active colors: amber for annotations, blue for the current
  workspace and muted teal for the global shared pool. The global pool's group tabs use the same teal
  accent; Settings tabs remain neutral, and the content rows, icons and type chips keep their existing
  colors.
- The global **Capture inspiration** shortcut was removed. Inspiration remains available as a prompt
  type when creating or editing an item.
- The composer dock strip, its **Push** action and the two queue counts were removed, along with the
  pending badge on the composer trigger. Outbox keeps its per-session send path, release progress/stop
  and direct host-queue admission.
- **Save draft** now uses an archive-box mark and **Save as prompt** uses a document-plus mark, so the
  two save actions no longer share the bookmark glyph.
- The composer trigger is now a segmented bar: **Prompt pool**, **Save draft**, and **Summarize
  annotations** with a count. Save draft opens an anchored group menu; Summarize opens an anchored
  small window with keep-annotations and allow-immediate-execution options, then generates one review
  prompt into the composer without sending.
- The composer quick bar uses compact pill segments, shorter labels, accent active states and a light
  container shadow; the group menu and summary window are anchored above it.
- The quick bar is now one continuous control with internal dividers. A brand cap with the prompt-pool
  mark and accent-tinted label makes the product identity stand out, while the save/summary actions stay
  neutral until opened.
- The panel header now has a dedicated title/slogan row and a second row for search, type filtering
  and the primary actions; Settings, pin and close stay in the title row.
- Settings is now an icon-only control. The annotation header no longer renders the old bulk store
  or summary-review actions; each annotation queues from its row instead.
- The panel title row now has a light accent-tinted background with a subtle separator, while the
  search and action row stays on the normal surface.
- The panel toolbar uses stable search / type-slot / action columns, so switching between 批注 and
  提示词 no longer moves the buttons. The type slot is reserved in the 批注 scope.
- Row actions are unified: locate/category on the left; insert-draft, add-to-outbox, source-specific
  actions and delete on the right. Action icons share one 14px glyph, 1.1px stroke and 24px hit area,
  with 2px gaps. Annotation and prompt types now share one 15px coloured type badge (prompt types use
  the same icon language instead of text chips). Insert-draft, add-to-outbox and save-as-prompt use
  three distinct silhouettes: composer box + arrow, queue lines + plus, and bookmark.
- Scope tabs now carry dedicated icons: a speech bubble for annotations, a command-prompt mark for
  prompts, and a layers mark for the global pool. The same domain marks now appear on Outbox source
  chips, empty states and settings tabs. Prompt-library reordering and annotation numbering
  were removed; Outbox reordering remains. The panel's minimum width is now 440px so the five right-side
  actions leave readable text.

## [1.5.0] — 2026-11-16

### Added

- A composer dock strip that bridges the pool's send queue to the host's own queued messages. It shows
  how many items the pool still has to send next to how many the session queue already holds (read from
  the `inbox` projection), and one **Push** action hands every queued item to the host queue in order —
  the same host admission the release uses, without the progress overlay and without touching the
  composer. Pushed entries leave the send queue; a host without queue admission keeps them and says so.
  The strip is its own cell of the `conversation.input.dock` slot, so it sits with the base queue UI
  instead of replacing it, and it renders nothing while both sides are empty.
- A checkbox on every annotation row. **Review** and the bulk **Save as prompt** now use only
  the checked annotations (all start checked); unchecking every note disables both actions.
- An annotation review sheet: the header action groups the checked notes by kind with a type-specific
  response contract, and previews an editable prompt. Opinions, ideas and agreements can be marked for
  same-turn execution; to-dos choose between **Execute now** and **Save as prompt** (the safe default).
  To-dos set to Save as prompt are saved to the current workspace's prompt pool instead of being sent.
  **Send to session queue** hands the prompt to the host queue without touching the composer; a successful
  send removes the sent notes from the list, with the batch log kept for audit. There are no open/handled
  status filters. The review view sits in the bottom dock as a card like the send queue, so the annotation
  list stays visible.
- Annotations can carry image attachments: add them from the bubble or paste them into the note body.
  Thumbnails appear in the bubble and annotation list, and the images travel with a review batch into the
  session queue and with a saved prompt. New annotations default to **同意**.
- The conversation menu's **Annotate** row now opens a seven-kind submenu; picking a kind opens the bubble
  with that type preselected.
- A new **补充信息 / Additional info** annotation kind. It has no immediate-execution checkbox; the review
  prompt uses it to re-check related conclusions and state what changes, rather than executing anything.
- The **All** tab is optional: Settings → Group order and display now has a **Show the “All” tab**
  switch. When it is hidden, the group tabs keep working and a view parked on All falls back to the
  first available group tab.

### Changed

- The review prompt now uses readable English kind IDs (`Agree-1`, `Comment-1`, `Todo-1`) and writes the
  immediate authorization on the item itself (for example `Comment-1 【立即实施（采纳后）】`) instead of
  repeating the checkbox explanation in every type rule. The review card header carries the selected and
  immediate counts, the yellow parking notice is gone, and the layout is tighter to reduce card height.
  The review is a two-step flow: set the annotations, choose **Preview prompt**, then send or go back to adjust.
- The review prompt is now type-driven instead of mode-driven: questions are answered, opinions get an
  adoption decision with reasons, agreement/disagreement are acknowledged, ideas are assessed, and to-dos
  are parked. Per-item immediate checkboxes (**if adopted / if feasible / approved**) default off and only
  authorize same-turn execution when no further discussion is needed. To-dos use the two choices **Execute
  now / Save as prompt** (safe default); Save as prompt to-dos are not sent and are saved to the current
  workspace's prompt pool.
- Inline annotations now take up to 100 full-width or 200 half-width characters (mixed text counts
  proportionally), up from ten characters. The badge truncates by the same display width and the
  editor's counter reports the used cells against 200.
- The annotation badge uses a deeper kind-colored wash and the annotated passage is underlined in a
  matching 2px deeper shade instead of a 1px pale line, so both stand out while reading.
- The annotation bubble now shows up to 80 characters of the quoted passage across four lines
  (previously ten characters on two), and the kind buttons place 提问 between 反对 and 意见.
- The annotation kinds have distinct colors again: question is orange, comment is purple, supplement is
  teal and to-do is bright yellow (agree, disagree and idea keep green, red and blue); no two kinds share
  one tint.
- Each kind now pairs a soft wash with a deeper ink shade for its border, icon and underline (green
  agree, red disagree, orange question, violet comment, blue idea, teal supplement, bright-yellow to-do),
  so the seven badges stay distinct without looking flat.

### Fixed

- The conversation menu's **+ Annotate** row no longer disappears when the browser collapses the selection
  before the menu mounts. The anchor is captured in the `contextmenu` handler, the row is always present for
  a text selection, and clicking it retries the anchor (with a clear message if the selection cannot be located).
- A new annotation's passage is underlined as soon as its bubble opens again. The draft highlight was
  cleared whenever the session had no saved annotations, so the first note only showed its underline
  after saving.
- Typing near the annotation editor's width limit no longer overwrites the tail of the existing text.
  An over-limit insertion keeps the old body and adds only the part that fits; a partial replacement
  is rejected, while pasting into an empty (or fully replaced) body still takes the prefix that fits.
- The inline annotation badge now uses the conversation's text size (and the matching line height)
  instead of a fixed 11px, so it no longer looks smaller than the reply and grows when the reading
  font is enlarged in Settings.

## [1.4.1] — 2026-11-16

### Changed

- The readmes now lead with the annotations workflow: annotating while reading, keeping notes attached
  to the exact passage, and generating one quoted draft. The English and Chinese screenshots were
  refreshed, and the full overview image leads the screenshot section. The plugin code is unchanged.

## [1.4.0] — 2026-11-13

### Added

- Inline annotations on assistant replies. Select a passage, right-click **Annotate**, choose a kind
  (note / question / agree / disagree / idea / to-do), and type up to ten characters (or leave it empty
  for a glyph-only badge). A coloured badge with the kind's glyph follows the passage and the passage is
  underlined in the same tint; clicking the badge edits it. Notes are stored per session and survive
  reloads.
- An **Annotations** tab in both prompt-pool views: locate a passage, insert one note into the composer,
  save one note into a pool group, generate one numbered draft from all notes, delete notes, and see a
  green marker on notes already saved. The Settings Annotations tab explains the session binding and
  controls keep-after-save.

## [1.3.0] — 2026-11-13

### Added

- Starter prompts are now localized: a new pool is seeded in the host language (Chinese or English),
  and Settings → Prompts can reset the built-in set in the current interface language. Built-ins carry
  a `seed`/locale marker, so a reset can replace them while keeping edited built-ins as ordinary items
  when "keep edited" is checked. Deleted built-ins come back; custom items, custom groups, and the
  send queue are left alone.

## [1.2.0] — 2026-11-11

### Added

- Right-click on selected conversation text now offers **Add to the prompt pool**. The menu is two
  levels: **Copy** (the menu replaces the browser's own, so that action stays one click away) and one
  pool entry whose submenu lists the groups currently on show (built-in, custom and visible
  workspaces). Picking a group stores the selection as a new item there, and the destination is
  remembered so it leads the next submenu. Only the context-menu gesture is claimed, so the built-in
  Quote action keeps drag selections; a right-click without selected text, and a host without the
  conversation interaction service, keep the native menu.

### Changed

- Destructive confirmations use one generic sentence instead of quoting the item text. A right-click
  capture is often a long paragraph, and its truncated first line made the delete dialog read like a
  fragment; the delete toast is generic for the same reason. The queued-item confirmation also says
  plainly that the removal cannot be undone.

## [1.1.1] — 2026-11-11

### Changed

- Refreshed the README screenshots for the 1.1.0 UI and added an npm version badge linked to the
  package page. The plugin code is unchanged.

## [1.1.0] — 2026-11-11

### Changed

- Releases now prefer the host's queue admission: text and images go straight into the send queue
  through the conversation service, so the composer is never filled and resized item by item. Hosts
  without that service fall back to the composer path.
- The panel and the page render rows and the send-queue card through shared render functions, so a
  row action or a queue-card change is written once instead of twice.
- The composer panel and the sidebar page share one editor path (start edit, save, cancel, paste
  image), so the empty-row and unsaved-image rules cannot drift between them.
- The settings copy and the empty-pool hints name the buttons that actually exist.
- Removed unused locale strings, unused CSS rules, and the React 18 fallback for
  `useSyncExternalStore`.

### Added

- A release now blocks the pool with a progress overlay and a Stop control. Stopping lets the item in
  flight finish, keeps the unsent queue, and works from the sidebar page too (its Stop travels over the
  bridge to the panel, which owns the composer). The composer trigger is disabled while a release runs.
- The composer panel's width is draggable from its left edge, remembered per profile, and reset by a
  double-click, like the height grip.
- Expansion of a group family no longer drops its counts: the per-group tabs now carry the same item
  count bubble the folded family chips show.
- Saving a draft now opens a small group chooser with exactly the groups currently shown in the tab
  bar (hidden families and hidden workspaces are not offered), and the toast names where it went. An
  empty composer is rejected before the chooser opens.
- The composer panel can be pinned: outside clicks then leave it open over the conversation, and the
  pin state is remembered. The close button, Escape and the trigger still close it.
- Keyboard support for the custom-tab delete control, a focus trap in confirmations that starts on
  the safe button, `aria-live` on the status line, and labels on both search boxes.
- `npm run check` runs a dependency-free lint (syntax, version, locale parity and dead keys) plus the
  whole test suite; GitHub Actions runs it on every push.
- Checks for a new group's tab target and for queue edits made while a release is running, plus bug
  and feature issue templates.

### Fixed

- The sidebar page keeps its active group tab when the host remounts the pane (for example after
  viewing another sidebar tab), instead of falling back to "All".
- The composer panel keeps a stable width when switching group tabs instead of resizing to the
  longest row in the active tab.
- The panel's save button now confirms with the same "saved to the pool" toast as the page.

## [1.0.3] — 2026-11-11

### Fixed

- Version upgrades no longer reset the pool: existing items, groups, queue and settings are normalized
  and kept, and the previous payload is copied to `localStorage["dsh.prompt-pool.v1.backup"]` before
  the first write.
- Legacy items that stored `pinned` / `categoryId` / `kind` instead of a group are mapped into the
  group model instead of all landing in Notes.
- A failed `localStorage` write is reported in both views instead of looking like a successful save.
- Image bytes are deleted when an image is removed and saved, or when a cancelled edit added it;
  unreferenced image blobs are swept on startup.
- The sidebar page keeps its composer bridge when a panel unmounts while another panel is mounted.

## [1.0.2] — 2026-11-11

### Fixed

- Clearing the send queue is undoable from the toast, as the readme promised; the confirmation no
  longer claims it cannot be undone.
- The composer panel has the duplicate action the readme promised, so both views share the same row
  actions.
- Cancelling a new prompt no longer leaves an empty "(untitled)" row behind.
- The composer panel clears its search when a new prompt is created, so the new row is visible.
- A release removes only the queued items it actually sent: rows queued or removed while it runs are
  no longer overwritten.
- Creating a custom group while the custom family is folded or hidden selects a visible view instead
  of a tab that does not exist.

### Changed

- The behavioural checks moved from the untracked `tools/oneshot/` folder to the committed
  `tools/verify/` folder, so the readme's test command works after a clone.

## [1.0.1] — 2026-11-11

### Fixed

- The composer panel no longer opens taller than the pane that clips it. It is anchored to the composer,
  which in a new session sits mid-page, so a 70vh panel ran past the top of the conversation pane and its
  header — title, search, close — was clipped under the app's top bar. The height is now capped to the room
  above the composer inside that pane, follows window resizes, and the box itself can no longer be scrolled
  out from under its own header.
- The send-queue card grows with its rows instead of collapsing to one row. Its height cap resolved as a
  percentage of an auto-height parent, so a second queued item already showed a scrollbar; the cap is now a
  share of the panel's own height, so the card only scrolls once it is genuinely long.

### Changed

- The readmes now carry screenshots of the composer panel, the sidebar page and the settings page.

## [1.0.0] — 2026-11-10

First public release.

### Added

- Composer trigger beside the send controls, showing the product name and, while something is queued,
  the accent colour with a count badge.
- Composer panel: search, group tabs, row actions (insert, queue, edit, duplicate, delete) and a
  send-queue card with collapse, clear and send.
- Right-sidebar page: native tab registry on DSH 0.2+, with `dsh-better-sidebar` as the fallback.
- Groups: built-in (frequent / notes / templates), custom categories, and one tab per workspace; each
  family can be expanded, folded into a tab, or hidden.
- Settings tabs for group order and display, visible workspaces, and post-use retention of items.
- 存草稿 captures the composer's text and image attachments into the pool without clearing the composer.
- Ordered release: each queued item is written into the composer and submitted only after the previous
  submission was accepted.
- Confirmations for deleting an item, clearing the queue and removing a queued entry; deletes and clears
  can be undone from the toast.
- Draggable panel height, persisted per profile.
- Plugin info card in settings with version, author and repository.
- Chinese and English copy, including a sidebar tab name that follows a language switch.

### Fixed

- Seed items no longer come back after being deleted (the stored seed level was collapsed to a boolean).
- Empty queue card keeps its hint instead of being clipped by the panel's flex shrink.
- Sidebar tab name is refreshed after a language switch and after a restored layout.

[Unreleased]: https://github.com/Ganttfly/dsh-prompt-pool/compare/v1.4.1...HEAD
[1.4.1]: https://github.com/Ganttfly/dsh-prompt-pool/releases/tag/v1.4.1
[1.4.0]: https://github.com/Ganttfly/dsh-prompt-pool/releases/tag/v1.4.0
[1.3.0]: https://github.com/Ganttfly/dsh-prompt-pool/releases/tag/v1.3.0
[1.2.0]: https://github.com/Ganttfly/dsh-prompt-pool/releases/tag/v1.2.0
[1.1.1]: https://github.com/Ganttfly/dsh-prompt-pool/releases/tag/v1.1.1
[1.1.0]: https://github.com/Ganttfly/dsh-prompt-pool/releases/tag/v1.1.0
[1.0.3]: https://github.com/Ganttfly/dsh-prompt-pool/releases/tag/v1.0.3
[1.0.2]: https://github.com/Ganttfly/dsh-prompt-pool/releases/tag/v1.0.2
[1.0.1]: https://github.com/Ganttfly/dsh-prompt-pool/releases/tag/v1.0.1
[1.0.0]: https://github.com/Ganttfly/dsh-prompt-pool/releases/tag/v1.0.0
