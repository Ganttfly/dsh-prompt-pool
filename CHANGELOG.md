# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project uses
[semantic versioning](https://semver.org/).

## [Unreleased]

### Added

- Point-and-click annotation. **+ Annotate** in the page header and **+ Annotate** in the composer's
  Annotations menu start a block picker: only assistant replies are eligible, and paragraphs, list items,
  headings, quotes, code blocks and table cells get an amber outline plus a size label. Each click adds an
  annotation and opens its editor in a bubble beside the block, so the pick never ends and the right
  sidebar is left exactly as it was: the bubble carries the seven kind chips and the text box, saving
  commits it even with an empty body (a glyph-only badge), and an unwritten pick is discarded instead
  of leaving an empty badge. Clicking a block that
  already carries an annotation opens that annotation's bubble. The bottom bar only reports **N added**
  and offers **Done**; Esc or a click outside the conversation exits. Only the eligible block under the
  pointer gets the pick cursor; ineligible blocks keep the normal pointer and show neither outline nor label.
  The picker stays inside the conversation body, so the composer and turn rail keep their normal cursor
  and click behavior.
- Annotation bodies are editable on the **Annotations** page: click a row's body to change its kind and
  text inline. The quoted passage stays read-only, the row's leading mark follows the kind picked in the
  editor before saving, and review mode keeps its checkbox and routing flow.
- Consecutive annotations keep their kind: the kind chosen in an annotation bubble becomes the next
  pick's default, and the picker starts on the kind last used there (initially **Note**).
- A newly added annotation is revealed without leaving transcript order: the list scrolls it into view,
  gives the row an amber inset accent and a **Just added** label for a few seconds, then returns it to the
  normal row. The order itself never changes, so the marker rather than the position points at the new note.
- Prompts carry an optional intent badge again: **Decision**, **Question**, **Opinion**, **Idea**,
  **Supplement**, **To-do** or **Inspiration**. The editor shows the seven chips, the chosen mark leads
  the row title in its own hue, and a prompt without a title reads **Untitled**.

### Changed

- The composer trigger's brand cap now opens the right sidebar page instead of the composer panel,
  leaving the page's current destination alone and keeping the conversation uncovered. The Annotations
  and Prompts menus lead to the page too, and no longer offer a separate way into the panel. The panel
  remains the fallback surface: on hosts without a right sidebar the cap and those menus still open it.
- Picking an annotation no longer opens the right sidebar. The editor appears in a bubble next to the
  block, so a pick neither expands the sidebar nor jumps its list into edit mode, and a host without a
  sidebar picks with the same gesture.
- The pool mark is redrawn as a queue: three uneven prompt bars, the middle one selected in signal
  green and followed by a chevron, in the composer trigger and the panel's brand row. The mark is
  bars-only at every size, so the 12–20px places (menus, sidebar title) keep their shape instead of
  falling back to a second, smaller drawing; the plugin icon carries the same mark with no tile and
  follows the light and dark scheme.
- The block picker opens existing block annotations instead of stacking duplicates: clicking a paragraph
  that already carries a block-level note opens that note's bubble without touching it or showing a
  notice, while different blocks in the same reply still each get their own note.
- Prompt rows no longer carry a separate edit icon: clicking the title opens the editor, while duplicate
  and delete stay as row actions. The type badge sits before the title instead of replacing the first line.
- The annotation delete confirmation now renders inside the page or panel that opened it. Pressing
  **Delete** removes that one note and leaves the surface open; the same guard keeps the inline annotation
  bubble's confirmation from dismissing itself on the button press.
- The annotation and prompt editors now share one card: the same 28px title row, 22px kind chips, 90px
  body, 28px meta row and 28px action row, with each domain keeping its amber or blue identity. The
  annotation quote moves into the title row and its locate/row actions hide while editing. Both editors
  keep image thumbnails inside the body card above their text fields and put an add-image plus at the
  bottom-left inside the text field, matching the composer; the annotation editor gains the image picker
  and paste handling, while the prompt editor puts the group selector in the action row. A
  selected prompt kind carries a small × and clicking the chip clears the type. Switching to another
  annotation or prompt while the editor has unsaved edits now asks first: keep editing, discard, or save
  and switch. Both editors now share one display-width budget: 500 full-width or 1,000 half-width
  characters, with a live count that turns amber near the cap and red at it; `@` still references
  files. The editor text field no longer shows the browser's native resize grip, so the shared card
  keeps its fixed rows.
- The send queue starts collapsed as a one-line strip in both the page and the panel; opening it is a
  choice and the state persists.
- The empty prompt panel now points at **+ Prompt** and **Save current input** instead of the old Save draft
  button.
- The sidebar page now has three destinations: **Annotations**, **Prompts** (current workspace only) and
  **Shared** (the built-in and custom groups), instead of nesting a workspace / shared switch under
  **Prompts**. Shared group tabs sit on their own context row; workspace prompts go straight to the list,
  and the composer panel keeps its two modes.
- The page header keeps the three destinations on their own row and moves the search field and the header
  actions to the row below, with the search field filling the width. **Shared** puts its group tabs between
  the destinations and the search field instead of below it. The destination row now ends with a one-line
  scope hint — **This session only**, **This workspace only** or **Shared across workspaces** — with the full
  explanation on hover.
- Underline tabs gained more breathing room: page destinations and panel modes now use a 20px gap,
  matching the settings tabs.
- The page and panel headers now expose **How it works**, **Save current input** and **Settings**
  directly instead of hiding them behind a `⋯` menu. The panel adds a brand row with the pool mark and
  name, and pin / close moved into it. The annotation context line is gone: the page lists notes without a
  count banner, and the bottom bar's **Summarize** is the only entry to the review card.
- Page and panel lists now use the full width of their host instead of a centered 760px reading column;
  rows, footer and send queue share the same 12px gutter as the header.
- Prompt rows expose duplicate and delete as separate icons, and annotation rows expose save and
  delete, instead of hiding them behind a `⋯` menu. Prompt rows are edited from the title.
- The composer pool menus match the width of the trigger bar. Hover and open states follow each side's
  identity: annotations use the amber note wash and ink, prompts keep the blue accent, and the same
  treatment applies to the menu rows, marks and count pills. The stale **Save draft** entry is now
  **Save current input**.
- Every icon now comes from one 24px grid with a 1.8px stroke and a 12 / 14 / 16 / 20px size ladder.
  Annotation kinds use distinct shapes instead of emoji, and inline chips, queue controls and header tools
  share the same outline set.
- Annotation kinds now have seven vivid, clearly separated colours: green agree, red disagree, blue
  question, cyan comment, orange idea, violet supplement and yellow to-do. The colour follows the kind
  through the body badge, the chip after the quoted passage, the kind chips in both editors, the review
  list and the quote underline. Chips use a stronger wash and outline so the kind reads at a glance; the
  picker outline, review card and trigger wash stay amber.
- Inline annotation chips no longer write their label into the conversation text, so a block quote never
  picks up chip text; older chips are rebuilt once (version 7).

## [2.1.0] — 2026-11-24

### Changed

- The pool is now organized around **two modes and one send queue**: **Annotations** (the current
  session) and **Prompts** (the library). The old **Current session / Current workspace / Global shared
  pool** row is gone; scope is a context line inside each mode, and the prompt mode switches between
  **Current workspace** and **Global shared pool** with a quiet segmented control. The composer panel shows
  the same two modes and the workspace list only.
- The annotation context line names the session and its count (`Current session · 5 annotations`) and
  carries **Review annotations** on the right. On the page, prompt mode adds the scope switch and, when
  no editor is open, the type filter on the same row; the composer panel keeps only the scope switch,
  because its editor already owns the type control.
- **Settings is a destination**, not a third tab row: it opens from the header menu, hides the browsing
  header, and offers two sections (**Annotations / Prompts**) with one back control. The global group
  order, seed reset, “All” switch and retention switches now live in the Prompts section; the separate
  Global settings tab was removed.
- A new prompt stays a draft until **Save**: its temporary row is left out of the mode and group counts,
  so the count reflects only stored prompts and changes after the save.
- **Rows show one verb, one queue action and an overflow menu.** Prompt rows are **Insert · + · ⋯**
  (edit / duplicate / delete); annotation rows keep **Locate** on the left and are **Insert · ⋯**
  (save as prompt / delete). The old five-icon strip is gone, every destructive action still asks first,
  and delete keeps its undo path.
- **The send queue is a shared 36px strip** with an expand control and a primary **Send** button. It
  renders nothing when the queue is empty, expands upward without covering the list, and is absent from
  annotation mode (annotations are summarized from their own card).
- **Annotations use one amber identity** instead of seven type colors: the same amber wash, left quote
  bar and text underline for every kind, with the type conveyed by glyph and label. Type marks in the
  annotation list and review card share that wash; the prompt row keeps its own type tints. Blue is
  reserved for primary actions, the active mode and the prompt scope, so a screen has at most two
  coloured focal points.
- The prompt pool uses a **stacked-prompt-cards** mark: two offset cards replace the three text lines in
  the composer trigger, sidebar tab, selection menu and tab icon. The trigger mark is 16px, one step
  above the 14px mode icons; queue source icons are 11px.
- The page and panel headers were rebuilt: mode switch on the left, search / primary action / overflow
  and help on the right. **Save current input** moved into the overflow menu and appears as a normal
  action only when it applies; the type filter moved next to the prompt scope on the page. The panel
  dropped its duplicated title/slogan row and accent gradient.
- The reading column is capped at **760px** and centered (rows, list, queue) while the scrollbar stays at
  the edge. Rows use a 44px minimum height, a 13px/600 title, 12px body and 16px/1.5px line icons;
  settings cards lost their drop shadows.
- Empty states and verbs now describe the model directly: annotations explain right-click **Annotate**,
  prompts explain insert and queue, and the send queue is consistently called **Send queue** (待发送队列)
  instead of Outbox in the UI.

### Added

- A **How it works** entry (question-mark button in the header) with a two-column card explaining
  annotations, prompts and the shared queue. It is a reference, not an automatic tour.
- The annotation context line exposes **Review annotations** only when the session has annotations, and
  both mode tabs carry live counts.

### Fixed

- Overflow menus in the composer panel (the header `⋯` and each row `⋯`) stay on screen when the host
  composer seat establishes a fixed-position containing block through `will-change: transform`; menu
  coordinates are now offset by that ancestor instead of assuming the viewport origin.
- The **+ Prompt** button vertically centers its plus icon and label instead of sitting them on the text
  baseline.

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
- **Merge & send** is now a secondary button in the Outbox header that opens the merged preview
  directly for every queued entry; there is no second subset-selection step. Edit the combined
  numbered text before anything is submitted; source labels and images stay visible per entry. The
  preview now also shows thumbnails of every queued image and labels them as attachments sent with
  the merged message, not inserted into the editable prompt text.
- Action icons are slightly tighter (24px buttons, no inter-button gap) while keeping the 24px hit area.
- Settings were rebased on the scope model: the page has **Annotations / Prompts / Global shared pool**
  and opens on Annotations. The old default-tab, workspace-visibility, current-workspace-first and
  workspace group-display controls are removed; stored copies are cleaned on load. Save and capture
  destinations now list the current workspace plus the global shared pool only.
- Non-image attachment capture: store the composer's files in the pool and re-attach them on insert
  and release.

### Changed

- The composer quick bar is more compact: 30px tall and 197px wide (was 38×270), with an icon-only
  brand cap whose tooltip keeps its name, smaller icons / badges / chevrons, and tighter padding. The
  brand name now prefixes the quick-action menu titles (**提示池 · 批注** / **提示池 · 提示词**), so the
  wordmark appears whenever a menu opens instead of occupying the composer at rest.
- The Outbox now stages prompts only: Clear is a trash icon and the header keeps the one-by-one /
  merge switch for prompts. Annotations no longer queue into the Outbox. Summary preparation now lives
  in the annotation tab: expanding the Prompt preview card (or clicking Summarize) adds checkboxes, immediate
  execution and to-do routing to the rows; locate stays, while insert / save / delete hide. Disagreeing
  annotations also carry an immediate-execution checkbox (**按照用户要求立即执行**), and the generated
  prompt marks them accordingly. The bottom
  card is a prompt-only composer: it previews the generated prompt, lets you edit or regenerate it,
  and sends it to the session queue or saves it as a prompt. If the host has no direct session queue,
  Send falls back to inserting the summarized prompt into the composer. The prompt Outbox is hidden while the annotation scope is active, and switching
  scopes closes the merge and clear prompts. The Prompt preview card now sits at the bottom of the
  annotation scope like the Outbox: it collapses to a strip and expands into the sheet, stays mounted
  while collapsed so a draft survives a fold, and the sheet header's chevron collapses it. Its top
  edge is a drag grip that resizes the card (ArrowUp / ArrowDown on the focused grip also work, and
  double-click resets to the default height); the height is saved with the pool settings. The card
  now shares the Outbox palette: queue background and header bands, neutral line borders, transparent
  rows, and the same 28px action buttons. The summary batch id is internal only: it is gone from the
  card header, the generated prompt heading and the queued toast, and no summary timestamp is shown;
  the local batch log keeps it for image retention and audit. Queueing the same prompt twice within one
  gesture (a host-delivered duplicate click or a fast double click) now adds only the first occurrence;
  a deliberate later click still adds another, and a successful queue action shows a short confirmation.
  Short summary quotes now carry an optional
  complete-sentence/question context line in the generated prompt. It is captured from the selection's
  own block rather than a fixed character window, is omitted when incomplete or redundant, is never
  shown in the annotation list, and the summary prompt contract tells the agent to use the preceding
  reply and ask when still ambiguous. Summarize moved from the page header to
  the right side of the Prompt preview card's status bar. The card title is now Prompt preview and the
  status-bar action is Summarize. Opening the card only shows it; summary mode (row checkboxes,
  immediate execution and to-do routing) starts only after Summarize is pressed. After that, the same
  spot shows Save as prompt and Send, the bottom action bar is removed, and a small Refresh link in
  the preview updates the prompt. The Prompt preview and send queue cards now share the same shell, header
  rhythm, grip and 28px action sizing. The preview card uses the annotation tab's amber accent (tinted
  border and background) so the two cards stay visually distinct; the Outbox merge sheet remains blue.
  The summary banner above the annotation list was removed; Select all
  and Clear now sit in the Prompt preview card's status bar alongside Save and Send. The idle Prompt
  preview card no longer shows the selected / immediate count chips; they appear only after Summarize,
  so a retained selection does not look like the result of a previous run. All delete confirmations now
  use the same centered modal: the annotation delete no longer uses the small anchored popover, but
  centers over the annotation page/panel with an explanatory message and the same Cancel/Delete actions
  as prompt deletion. The Outbox card gets the same
  drag-to-resize top grip, with its own saved height, while the collapsed strip is unchanged. The
  generated prompt heading is now 【汇总批注】 / [Summarized annotations]; the old 批注审阅 / [Annotation
  review] wording is gone. The legacy Outbox source label is 汇总 / Summary, and the hidden compose action
  is 汇总批注 / Summarize. The separate code-review starter prompt keeps its own wording.
- The scope colors are now two themes instead of three: the annotations tab, summary card and summary
  controls use the annotation amber; the workspace prompt tab, the global shared pool and the Outbox
  use the prompt blue. The global pool no longer has a separate teal theme. The global pool's group
  tabs remain one neutral segmented control — a recessed grey track with the selected tab raised back
  to the page surface — and the Settings tabs are neutral underlines; both stay hue-free in every
  state, while the content rows, icons and type chips keep their existing colors.
- The global **Capture inspiration** shortcut was removed. Inspiration remains available as a prompt
  type when creating or editing an item.
- The composer dock strip, its **Push** action and the two queue counts were removed, along with the
  pending badge on the composer trigger. Outbox keeps its per-session send path, release progress/stop
  and direct host-queue admission.
- **Save draft** now uses an archive-box mark and **Save as prompt** uses a document-plus mark, so the
  two save actions no longer share the bookmark glyph.
- The composer trigger is now a segmented bar: the **Prompt pool** brand cap plus **Annotations** and
  **Prompts** domain menus. The annotation menu offers summarized review and opening the annotations
  view; the prompt menu offers saving the current draft, creating a prompt and opening the prompts view.
  The summary window still generates one review prompt into the composer without sending.
- The composer quick bar uses compact pill segments, shorter labels, accent active states and a light
  container shadow; the group menu and summary window are anchored above it.
- The quick bar is now one continuous control with internal dividers. A brand cap with the prompt-pool
  mark and accent-tinted label makes the product identity stand out, while the save/summary actions stay
  neutral until opened. The brand mark and label are slightly larger than the two domain menus, and the
  annotation count lives only inside its menu.
- The panel header now has a dedicated title/slogan row and a second row for search, type filtering
  and the primary actions; Settings, pin and close stay in the title row.
- Settings is now an icon-only control. The annotation header no longer renders the old bulk store
  or annotation-summary actions; each annotation queues from its row instead.
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
- All three tab rows now share one label geometry and one interaction model: 26px-high labels
  (28px in the scope and settings rows), a 14px icon slot, a 5px icon gap and the same focus ring.
  The scope switcher is now a row of underlines with a rounded 3px rule that slides to the selected
  tab — amber for annotations, prompt blue for the workspace and global pool. The settings row uses
  the same sliding rule in a neutral ink tone. The global pool's segmented chip keeps its 7px radius.
  The selected segmented chip is lifted with a faint white wash and a blue-tinted hairline so it
  stays above the track on dark themes; the annotations tab mixes the amber into the primary ink so
  it stays legible on dark themes; the segmented track is a pale prompt-blue recess rather than a
  neutral grey block, and its labels lean from the secondary ink towards the accent, so the
  secondary row keeps its quiet hierarchy without reading as grey. The settings underlines gained a
  quiet hover.
- The global pool's group tabs stay on one row: the strip scrolls sideways with a fade on the side
  that still hides tabs, a vertical wheel moves it, and the selected chip is kept in view. The
  group close chip now uses the shell's hover bubble when the host exposes one, with its native
  title as the fallback.
- Tab rows are keyboard reachable: arrow keys move between tabs (Home / End jump to the ends) with a
  single roving tab stop, the group close chip is now a sibling button laid over the tab's right
  padding instead of an element nested inside another button, and the close chip keeps its native
  Enter / Space behavior.

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
