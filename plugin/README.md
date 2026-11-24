# Prompt pool · 提示池

[![npm version](https://img.shields.io/npm/v/dsh-prompt-pool.svg)](https://www.npmjs.com/package/dsh-prompt-pool) [![dshfind](https://dshfind.com/api/badge/Ganttfly/dsh-prompt-pool)](https://dshfind.com/en/plugins/Ganttfly/dsh-prompt-pool?ref=badge)

A prompt staging pool for DeepSeek Harness: park a draft until it is ready, queue the next prompts in
order, and annotate a long reply without losing the sentence you mean. Nothing runs until you release it.

Agent work breaks between messages: a half-written prompt, a sequence to run, a passage to comment on.
The pool keeps the draft, the next action and the exact wording next to the conversation.

![Annotating a passage inline and reviewing the notes in the pool](https://raw.githubusercontent.com/Ganttfly/dsh-prompt-pool/main/docs/images/annotations-overview.png)

![Prompt pool panel in Prompts mode: current workspace items and the send queue](https://raw.githubusercontent.com/Ganttfly/dsh-prompt-pool/main/docs/images/panel.png)

- Segmented composer trigger beside the send controls: the brand segment opens the panel, and separate
  **Annotations** / **Prompts** menus lead to the review card and the full page
- Starter prompts follow the host language; Settings can reset them in the current interface language, keeping edits as ordinary items
- Panel scoped to **Annotations** (current session) and **Prompts** (current workspace), with search, type
  filtering, **Insert / + / ⋯** row actions and a shared send queue that only appears in Prompts mode
- Right-click on selected conversation text to copy it or save it into a group (the last destination leads the menu)
- Annotate while you read: choose a kind from the right-click submenu, keep notes on the exact passage with image
  attachments, and collect them in the current-session page (new notes default to Agree); **Review annotations**
  turns the checked notes into one numbered instruction in the amber review card, not the prompt queue
- Full-height page in the right sidebar (native tab on DSH 0.2+, `dsh-better-sidebar` fallback) with
  **Annotations** and **Prompts** (**Current workspace** / **Global shared pool**); the page opens on Annotations
- Single prompt type per item (decision / question / opinion / idea / supplement / to-do / inspiration), seeded
  from the annotation kind and editable in the save step
- A save step for title, body, images, type and destination, with a reminder that the conversation context is not kept
- Global shared pool keeps the built-in, custom and display-mode group tabs; workspace prompts use type filters
- Settings is a separate destination with **Annotations** (retention) and **Prompts** (group order/display,
  built-in reset, post-insert/queue retention, plugin info) sections
- A release shows progress and can be stopped; the unsent queue stays
- Merging opens a preview of every queued prompt, in order, and sends them as one message
- Confirmations for destructive actions, with undo on deletes and clears

Requires DSH >= 0.2.0-rc.1 (verified on 0.2.2-rc.1). This is a **bundle**: install the package, then
enable it in Settings → Plugins.

```powershell
dsh plugin add dsh-prompt-pool --profile <profile>
```

Full documentation: <https://github.com/Ganttfly/dsh-prompt-pool#readme> ·
[中文说明](https://github.com/Ganttfly/dsh-prompt-pool/blob/main/README.zh.md)

## Known limitations

- Non-image attachments are not captured (the toast reports how many were left behind).
- Reference chips (`@file`, `@session`) are stored and re-inserted as text, not clickable chips.
- A capture copies; it does not clear the composer.

MIT
