# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project uses
[semantic versioning](https://semver.org/).

## [Unreleased]

### Added

- Non-image attachment capture: store the composer's files in the pool and re-attach them on insert
  and release.

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

[Unreleased]: https://github.com/Ganttfly/dsh-prompt-pool/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Ganttfly/dsh-prompt-pool/releases/tag/v1.0.0
