# Prompt pool · 提示池

English | [中文](README.zh.md)

A staging pool for prompts inside DeepSeek Harness. Park a half-written prompt without sending it,
arrange a playlist of prompt items, and release the whole batch into the composer's send queue in order.

It sits in two places: a trigger beside the composer, and a page in the right sidebar.

## Features

- **Staging instead of sending** — save a draft into the pool; nothing runs until you release it.
- **Ordered release** — queue items in the order you want, then send them one by one; each submission
  waits for the composer to be accepted before the next starts.
- **Composer panel** — search, group tabs, per-row insert / queue / edit / duplicate / delete, and the
  send-queue card with collapse, clear and send. Drag its top edge to change the height.
- **Sidebar page** — the same pool as a full-height page in the right sidebar.
- **Groups** — frequent / notes / templates built in, plus your own categories and one tab per workspace.
  Each family can be expanded, folded into a single tab, or hidden.
- **Settings** — group order and display, visible workspaces, and two switches that decide whether an
  item stays in the pool after it is inserted or queued.
- **Guarded destructive actions** — deleting an item, clearing the queue and removing a queued entry all
  ask first; deletes and clears can be undone from the toast.
- **Chinese and English** — every label follows the harness language, including the sidebar tab name.

## Install

Once the package is on npm and indexed by the community market, install it from the plugin market in
Settings, or from the CLI:

```powershell
dsh plugin add dsh-prompt-pool --profile <profile>
```

A tarball works the same way:

```powershell
dsh plugin add ./dsh-prompt-pool-0.1.96.tgz --profile <profile>
```

Then enable the bundle in **Settings → Plugins**. The plugin is a bundle; installing the package alone
does not turn it on.

## Usage

1. Click **提示池 / Prompt pool** beside the composer (or open the sidebar page).
2. **存草稿** copies the composer content — text and image attachments — into the pool. The composer
   keeps its text.
3. Add rows to the queue with the ⊕ control, reorder them in the queue card, then press **发送**.
4. Each queued item is written into the composer and submitted in turn.

## Compatibility

- DSH **>= 0.2.0-rc.1**; verified on **0.2.2-rc.1**.
- The sidebar page uses the native right-sidebar tab registry when the host provides it (DSH 0.2+).
  On hosts without it the plugin falls back to [`dsh-better-sidebar`](https://github.com/omdsh-dev/DSH-better-sidebar).
  With neither, the composer panel and the settings page still work.

## Data

- Items and settings: `localStorage["dsh.prompt-pool.v1"]`.
- Pool images: IndexedDB `dsh-prompt-pool-images.v1`.

Uninstalling the plugin does not delete either store, so reinstalling later brings the pool back.
Clearing them removes the pool for good.

## Known limitations

- **Non-image attachments are not captured.** The composer's browser files are reachable, but the pool
  only stores images; a capture reports how many attachments were left behind.
- **Reference chips come back as text.** A saved item that referenced a file or a session keeps the
  reference text (so the model still sees it), but inserting it back writes plain text rather than a
  clickable chip — the host exposes no API to rebuild one.
- **A capture does not clear the composer.** It copies; use the editor's own clear to remove the text.

## Development

```powershell
node tools/smoke.js                 # module loads, slots register, locale retitle, version pin
node tools/render-smoke.js          # every slot renders; panel and settings structure checks
node tools/oneshot/verify-*.js      # behavioural checks (destructive actions, retention, capture)
```

The package lives in `plugin/`; `tools/` and `_shots/` are development-only.

## License

MIT
