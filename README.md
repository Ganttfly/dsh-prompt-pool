# Prompt pool · 提示池

[![npm version](https://img.shields.io/npm/v/dsh-prompt-pool.svg)](https://www.npmjs.com/package/dsh-prompt-pool) [![dshfind](https://dshfind.com/api/badge/Ganttfly/dsh-prompt-pool)](https://dshfind.com/en/plugins/Ganttfly/dsh-prompt-pool?ref=badge)

English | [中文](README.zh.md)

A prompt staging pool for DeepSeek Harness. Keep a half-written prompt out of the agent's way until it is
ready, line up the prompts you want to run next, and annotate a long reply without losing the sentence you
mean.

It sits in two places: a trigger beside the composer, and a page in the right sidebar.

## Screenshots

![Annotate passages inline and review them on the pool's Annotations page](docs/images/annotations-overview.png)

**Annotate while you read, two ways.** Right-click a selection and choose **Select to annotate** for a
note pinned to those exact words, or choose **Continuous** and click any assistant block: an amber
outline marks the paragraph, list item, heading, quote, code block or table cell before the note lands,
and the pick stays active so the next block takes one click too. The original wording stays attached,
so the context is easy to follow and no key point slips away. The note's editor opens in a bubble
beside the block; the right sidebar keeps whatever state it had.
Clicking a block that already carries a note opens that note's bubble instead of adding another. The
**Annotations** page collects the notes for that session — locate a passage, insert one note, or save it as a prompt.
Click a note's body to edit its kind and text while the quote stays read-only; each kind keeps its own
vivid color on the badge, the inline chip and the quoted underline. Select notes and choose **Summarize**
at the bottom to merge them into one quoted draft. Annotations stay with their own session
and never leak into another conversation.

![Prompt pool panel in Prompts mode: current workspace items and the send queue](docs/images/panel.png)

The composer panel has two modes: **Annotations** for the current session and **Prompts** for the
current workspace. Prompt rows offer **Insert**, **+** (add to the send queue), duplicate and delete; clicking
the title opens the editor. Each prompt can carry an optional intent badge — Decision, Question, Opinion,
Idea, Supplement, To-do or Inspiration — which leads the title with its own hue. The shared send queue starts
as a collapsed strip and expands when opened. Switching modes never changes the row styling. The
panel opens with a brand row — the pool mark, its name, pin and close — and the row beside search carries
help, **Save draft** and **Settings** directly. The composer trigger is a split bar: the brand cap
opens the right sidebar page, leaving its destination alone; the **Annotations** menu reviews the session's
annotations and opens the annotations view; the **Prompts** menu saves the current draft, creates a prompt
and opens the prompts view. Neither menu offers a separate way into the panel. On hosts without a right
sidebar the cap and both menus open the panel instead.

![The prompt pool as a full page in the right sidebar](docs/images/sidebar.png)

The sidebar is the full workbench with three destinations. **Annotations** lists the session's notes;
**Prompts** holds the current workspace's prompts; **Shared** holds the cross-workspace pool. The page
header stacks the destinations above the search field and the header actions (help, **Save draft**,
**Settings**); a one-line hint at the right edge of the destination row names the current scope. **Shared**
puts its built-in and custom group tabs between the two. Select notes and choose
**Summarize** in the bottom bar to open the review card; workspace prompts go straight to the list. Saving a note as a prompt opens a confirmation step where the
title, body, images and target group are edited in one card, with the image thumbnails sitting inside the
body field like the composer's own attachments and a reminder that the conversation context is not carried
over.

![Prompt pool settings: post-use retention, built-in reset, group display, and the plugin info card](docs/images/settings.png)

Settings is a destination with two sections. **Annotations** controls whether notes stay after generating
a draft or saving as a prompt. **Prompts** holds the shared-pool group order and display, the built-in prompt
reset, the post-use retention switches and the plugin info card.

## Why a prompt pool?

Working with an agent is rarely one prompt. The friction sits between messages:

| Where it hurts | What the pool does |
|---|---|
| You are still shaping the prompt, but the send button is one keystroke away. | Park the draft in a group; nothing runs until you release it. |
| The next prompts are already in your head, and retyping them breaks the sequence. | Queue them in order and release one by one, with progress and Stop. |
| A long answer needs a precise reply on one sentence, not a vague “looks good”. | Annotate the passage inline; the note stays on the exact words and can be reviewed alone or merged into one quoted instruction. |
| The constraint lives in an earlier message or another workspace. | Right-click capture saves to the current workspace or the shared pool, so project-specific prompts stay with the project. |

The goal is not another notes app. It is to keep the context, the exact wording and the next action next to
the conversation, so the agent gets a precise instruction and you do not lose the thread.

## Features

- **Staging instead of sending** — save a draft into the pool; nothing runs until you release it.
- **Ordered release** — queue items in the order you want, then send them one by one; each submission
  waits for the composer to be accepted before the next starts. On hosts that expose the conversation
  queue, items go straight into the queue without touching the composer; otherwise the composer path
  is used. While a release runs, both views show progress and a Stop control; the queue is locked
  until it finishes. The **Send queue** holds prompts only: it appears on the page's **Prompts** and
  **Shared** destinations and in the panel's **Prompts** mode; **Annotations** hides it. Its header
  switches between **one by one** and **merge**, and merge previews every queued
  prompt and its image attachments before handing one numbered message to the session queue; the images
  are shown as thumbnails outside the editable text and travel as attachments. There is no second subset
  selection. Annotations are reviewed and sent from the Annotations page instead.
- **Annotate while you read** — select a passage in an assistant reply and right-click **Select to annotate**:
  pick a kind from its submenu (note / question / agree / disagree / idea / additional info / to-do), type up to 500
  full-width or 1,000 half-width characters (or leave it empty for a glyph-only badge), and the badge lands
  right after the passage with a matching underline. Each kind has its own vivid color, shared by the
  badge, the inline chip and the underline. Picking a kind preselects it in the bubble; without a pick
  new notes start as **Agree**. The block picker starts on the kind last used there (initially
  **Note**), and the kind chosen in a bubble becomes the default for the next pick. Add images from the bubble or the page
  editor, or paste them into either body, and the thumbnails stay with the annotation. The badge follows
  the conversation's text size, so it grows with the reading font instead of staying small.
  The note stays on the exact wording, so you can keep reading and come back to the context instead of
  losing the point in a separate scratchpad; click the badge to edit. **Annotations** page always
  exists: **Locate** scrolls to the passage, **Insert** writes one note into the composer, and
  the **Save as prompt** icon opens that note in the pool's own editor: the sidebar switches to
  **Prompts** with the body written, so only the group and any last edits are left. A host with no
  sidebar (the composer panel) still gets the standalone confirmation step for title, body, images
  and target group.
  The page's bottom bar shows the selected count and **Summarize**; it opens the review card, which sits
  at the bottom like the send queue, collapses to a strip, and can be resized by dragging its top edge
  (double-click to reset). Rows gain checkboxes, immediate execution and to-do routing; Locate stays,
  while Insert / Save as prompt / Delete hide. The card is the prompt composer: preview and edit the
  prompt, use the Refresh link, then Save as prompt or Send from the status bar. Select all / Clear sit
  in the same status bar, so the list has no banner above it. Short quotes get an optional
  complete-sentence/question line in the prompt only (never in the annotation list), and it is omitted
  when incomplete or redundant. The review card uses the annotation amber; the prompt destinations and
  the send queue share the prompt blue. Annotations never enter the send queue,
  and single annotations have no direct-send control.
  Saved notes keep a green marker; notes are stored per session, survive reloads, and are not shown in
  another session.
- **Point at a block** — the **Annotations** page header carries a **Continuous** button, and the
  composer's **Annotations** menu starts with **Continuous**. The pointer turns into a picker only
  over an eligible block: hovering a paragraph, list item, heading, quote, code block or table cell
  in an assistant reply draws an amber outline and a `Paragraph · 42 chars` label. Click to add an
  annotation and open its editor in a bubble beside the block: the pick keeps running, the right
  sidebar keeps its current state, and the annotation list is not pulled into edit mode. The bubble
  carries the seven kind chips and the text box; saving commits it even when the body is empty (the
  badge then shows only its kind mark), and closing it without text, images or a save discards the
  pick instead of leaving an empty badge. Clicking a block that already has a
  block-level note opens that note's bubble instead of stacking a duplicate. The bottom bar only
  reports `N added` and offers **Done**; Esc or a click outside the conversation leaves the mode.
  Only assistant replies are accepted; your own messages and image-only or empty blocks are
  refused, and ineligible blocks keep the normal pointer and show no outline or label. The picker
  only covers the conversation body, so the composer, turn rail and the rest of the app stay
  clickable. The block's text becomes the quote, so **Locate** still works. Right-click selection
  remains the exact-phrase path.
- **Edit in the list** — on the **Annotations** page, click a note's body to edit its kind and text in
  place. The quoted passage is read-only; review mode keeps its checkbox and routing flow.
- **Find the newest note** — a newly added annotation scrolls into view and is tinted amber with a
  **Just added** label for a few seconds. The list stays in transcript order, so the marker, not the
  position, points at the new note.
- **Composer panel** — a brand row with the pool mark and name, search, the current workspace's prompt
  list, per-row **Insert**, **+**, duplicate and delete, and the shared send queue with collapse, clear and send.
  Clicking a row's title opens the editor; the type badge leads the title. Both editors share one card —
  title, kind chips, body, meta row and action row — so an annotation and a prompt keep the same rhythm.
  The add-image action is a plus at the bottom-left inside the body field, matching the composer.
  Both editors measure the body in display cells, capped at 500 full-width or 1,000 half-width
  characters, and show a live count; prompt text also accepts `@` to reference a file. Switching to
  another item with unsaved edits first asks whether to keep editing, discard, or save and switch.
  Help, **Save draft** and **Settings** sit beside search. Its two modes are **Annotations**
  (current session) and **Prompts** (current workspace); the panel never shows the shared pool.
  A new prompt is not counted until it is saved. Drag its top edge
  to change the height, or its left edge to change the width; pin it to keep it open over the conversation.
- **Sidebar page** — the full workbench over the same data, with three destinations: **Annotations**,
  **Prompts** for the current workspace, and **Shared** for the cross-workspace pool; it opens on
  annotations. Workspace prompts go straight to the list; **Shared** keeps the group tabs for the built-in
  and custom groups on a context row below the destinations. Prompt rows show their optional type badge, and
  the send queue starts as a collapsed strip.
- **Save step** — saving a note as a prompt no longer writes immediately. It opens a confirmation with the
  title, body, images and destination group, plus a reminder that the conversation context is not carried
  over. The source session, node and quote are not stored on the prompt.
- **Right-click to save** — select text in a reply or in one of your own messages, then right-click: the
  menu offers **Copy** and **Add to the prompt pool**, whose submenu lists the groups currently on show;
  picking one stores the selection as a new item there. The group used last time leads the submenu;
  Shift+F10 opens the same menu, and a right-click without a selection keeps the browser menu.
- **Groups** — the shared pool keeps frequent / notes / templates built in, plus your own categories;
  each workspace has its own prompt pool instead of a global workspace group. Each family can be expanded,
  folded into a single tab, or hidden; the **All** tab can be hidden too.
- **Localized starter prompts** — a new pool is seeded in the host language, and Settings → Prompts
  can reset the built-in set in the current interface language. Edited built-ins can be kept as
  ordinary items; custom items and the queue are left alone.
- **Settings** — a destination with two sections. **Annotations** holds annotation retention;
  **Prompts** holds the two post-use retention switches, the built-in prompt reset, and the shared pool's
  group order/display (including whether the **All** tab shows). Settings opens on Annotations.
  Workspaces no longer have their own settings page; save and capture destinations are the current
  workspace plus the shared pool.
- **Guarded destructive actions** — deleting an item, clearing the queue and removing a queued entry all
  ask first; deletes and clears can be undone from the toast.
- **Chinese and English** — every label follows the harness language, including the sidebar tab name.

## Install

The package is on npm as [`dsh-prompt-pool`](https://www.npmjs.com/package/dsh-prompt-pool). Once the
community market has indexed it, install it from the plugin market in Settings, or from the CLI:

```powershell
dsh plugin add dsh-prompt-pool --profile <profile>
```

A tarball works the same way:

```powershell
dsh plugin add ./dsh-prompt-pool-<version>.tgz --profile <profile>
```

Then enable the bundle in **Settings → Plugins**. The plugin is a bundle; installing the package alone
does not turn it on.

## Usage

1. Click **提示池 / Prompt pool** beside the composer (or open the sidebar page).
2. Click **Save draft** in the page or panel header (the icon beside help). It copies the composer
   content — text and image attachments — into the pool. A small popup offers the current workspace and the
   shared-pool groups, and the toast names the destination. The composer keeps its text.
3. Select text in a conversation and right-click: the menu offers **Copy** and **Add to the prompt
   pool**; open the submenu and pick the current workspace or a shared-pool group.
4. To comment on specific passages instead, right-click **Annotate**: pick a kind, type up to 500
   full-width or 1,000 half-width characters, and the badge appears right after the passage. The **Annotate**
   button in the page header (or **+ Annotate** in the composer menu) starts the block picker instead: move
   over an assistant paragraph and click once; its editor opens in a bubble beside the block and the pick
   keeps running, so clicking the next paragraph adds the next note. Esc leaves before you pick. The pool's
   **Annotations** page
   collects the notes; **Locate** scrolls to a passage, **Insert** writes one note into the composer, and the
   **Save as prompt** icon hands that note to the pool's editor (the sidebar switches to **Prompts**
   with the body already written, so only the group and any edits are left). Click a note's body to edit its kind and text in place;
   the quote is read-only. Select notes and choose **Summarize** in the bottom bar to open the review card;
   check and route the notes in the rows, then use Save as prompt or Send in the status bar — Save as prompt
   opens the reviewed text in the pool's editor, so the batch is filed like any other prompt. Annotations do
   not enter the send queue.
5. Add prompts to the send queue with **+**; click the collapsed queue strip to open it, reorder the
   prompts, then send them one by one or switch to **Merge** for a preview.
6. Sequential sends are written into the composer and submitted in turn; merged sends become one
   message after confirmation.

## Compatibility

- DSH **>= 0.2.0-rc.1**; verified on **0.2.2-rc.1**.
- The right-click menu needs the conversation text-interaction service, present on 0.2.2-rc.1. A host
  without it keeps the native menu; the panel, the page and capture are unaffected.
- The sidebar page uses the native right-sidebar tab registry when the host provides it (DSH 0.2+).
  On hosts without it the plugin falls back to [`dsh-better-sidebar`](https://github.com/omdsh-dev/DSH-better-sidebar).
  With neither, the composer panel and the settings page still work.

## Data

- Items and settings: `localStorage["dsh.prompt-pool.v1"]`.
- Annotations: `localStorage["dsh.prompt-pool.notes.v1"]`.
- Pool images: IndexedDB `dsh-prompt-pool-images.v1`.
- Before a schema upgrade, the previous payload is copied once to
  `localStorage["dsh.prompt-pool.v1.backup"]`.
- If a write fails (storage full or blocked), both views say the change was not saved.
- Image bytes that nothing references are deleted on startup; an image removed and saved is deleted
  immediately.

Uninstalling the plugin does not delete these stores, so reinstalling later brings the pool back.
Clearing them removes the pool for good.

## Known limitations

- **Non-image attachments are not captured.** The composer's browser files are reachable, but the pool
  only stores images; a capture reports how many attachments were left behind.
- **Reference chips come back as text.** A saved item that referenced a file or a session keeps the
  reference text (so the model still sees it), but inserting it back writes plain text rather than a
  clickable chip — the host exposes no API to rebuild one.
- **The right-click menu covers conversation text only.** Replies, your own messages and expanded
  reasoning are selectable sources; tool cards, the sidebar and the composer keep their own menus.
- **Right-clicking a selection replaces the browser's own menu.** The menu carries Copy itself, but the
  browser's Search / Translate / Inspect rows are not available from it.
- **Annotation cards follow the rendered text.** A note on a folded or unmounted reply keeps its row in
  the pool's Annotations tab, but has no card, pin or highlight until that text is rendered again; the
  composed reply still uses it.
- **A card can cover the lines below its passage.** It hangs right after the end of the passage, so a
  note on a short line may overlap the following lines to its right; the Annotations tab always keeps
  the full list.
- **A capture does not clear the composer.** It copies; use the editor's own clear to remove the text.

## Development

```powershell
npm run check                       # lint + the whole suite, as CI runs it
npm run lint                        # syntax, version pin, locale parity and dead keys
npm test                            # the whole suite through tools/run-tests.js
node tools/smoke.js                 # module loads, slots register, locale retitle, version pin
node tools/render-smoke.js          # every slot renders; panel and settings structure checks
Get-ChildItem tools/verify/*.js | ForEach-Object { node $_.FullName }   # behavioural checks
```

GitHub Actions runs the same `npm test` on every push and pull request.

The panel's box model is measured in a real browser instead of by eye. It needs playwright on
`NODE_PATH` and a `react`/`react-dom` copy to serve — install those once into `%TEMP%\pp-harness`, or
point `PP_VENDOR` at a `node_modules` that has them:

```powershell
pnpm --dir "$env:TEMP\pp-harness" add react@18 react-dom@18
$env:NODE_PATH = "$env:DSH_PROFILE_DIR\node_modules"
node tools/panel-geometry/run.js --viewport 1280x760 --composer 0.34 --drag --shot panel-height
node tools/panel-geometry/run.js --viewport 1280x900 --composer 0.9 --tray 6 --shot queue-card
```

`--composer` puts the composer partway up the window (a new session). The mock keeps a top bar above a
clipping conversation pane, so the run fails when the panel's header ends up clipped or scrolled out of
its own box. `--tray N` seeds the send queue, and the run then fails when a short queue already scrolls.

The package lives in `plugin/`; `tools/` is development-only, and `_shots/` is a local screenshot
scratch folder that stays out of the repository.

## License

MIT
