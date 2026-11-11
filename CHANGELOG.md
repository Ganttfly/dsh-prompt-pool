# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project uses
[semantic versioning](https://semver.org/).

## [Unreleased]

### Added

- Non-image attachment capture: store the composer's files in the pool and re-attach them on insert
  and release.

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

[Unreleased]: https://github.com/Ganttfly/dsh-prompt-pool/compare/v1.1.1...HEAD
[1.1.1]: https://github.com/Ganttfly/dsh-prompt-pool/releases/tag/v1.1.1
[1.1.0]: https://github.com/Ganttfly/dsh-prompt-pool/releases/tag/v1.1.0
[1.0.3]: https://github.com/Ganttfly/dsh-prompt-pool/releases/tag/v1.0.3
[1.0.2]: https://github.com/Ganttfly/dsh-prompt-pool/releases/tag/v1.0.2
[1.0.1]: https://github.com/Ganttfly/dsh-prompt-pool/releases/tag/v1.0.1
[1.0.0]: https://github.com/Ganttfly/dsh-prompt-pool/releases/tag/v1.0.0
