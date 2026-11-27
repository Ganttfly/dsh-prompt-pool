# Prompt pool · 提示池

[![npm version](https://img.shields.io/npm/v/dsh-prompt-pool.svg)](https://www.npmjs.com/package/dsh-prompt-pool) [![dshfind](https://dshfind.com/api/badge/Ganttfly/dsh-prompt-pool)](https://dshfind.com/en/plugins/Ganttfly/dsh-prompt-pool?ref=badge)

A prompt staging pool for DeepSeek Harness: park a draft until it is ready, queue the next prompts in
order, and annotate a long reply without losing the sentence you mean. Nothing runs until you release it.

Agent work breaks between messages: a half-written prompt, a sequence to run, a passage to comment on.
The pool keeps the draft, the next action and the exact wording next to the conversation.

![Annotating a reply, then reviewing the checked notes in the pool's Annotations page](https://raw.githubusercontent.com/Ganttfly/dsh-prompt-pool/main/docs/images/annotations-review.png)

![The Prompts destination: the current workspace's prompts and the send queue](https://raw.githubusercontent.com/Ganttfly/dsh-prompt-pool/main/docs/images/prompts-send-queue.png)

- Three destinations in the right sidebar page — **Annotations** (this session), **Prompts** (this
  workspace only) and **Shared** (across workspaces) — with a scope hint on the destination row and the
  page opening on annotations
- Segmented trigger beside the composer: the brand cap opens the page, the **Annotations** and **Prompts**
  menus lead to it too, and a host without a sidebar gets the composer panel instead
- Annotate while you read, two ways: right-click **Select to annotate** for the exact words, or
  **Continuous** to click block after block with the pick never ending; both open the editor bubble in
  place, keep images with the note, and default the next note to the kind you just used
- Notes live on the **Annotations** page: locate the passage, insert one into the composer, edit its kind
  and text in place, or file it as a prompt; a new note is revealed with a **Just added** marker
- **Summarize in one click** folds the checked notes into one numbered prompt in the **Prompt preview**
  card — immediate execution and to-do routing per row, an editable prompt with a per-kind response
  contract, then **Cancel** / **Save as prompt** / **Send**
- Filing a note as a prompt opens the pool's own editor with the 【Original】 / 【Annotation】 body, a blank
  title, the type that answers the note's kind and its images; the standalone save sheet stays the
  fallback for hosts without a sidebar
- Prompts carry one optional type (decision / question / opinion / idea / supplement / to-do /
  inspiration) shown as a badge before the title
- Send queue for prompts only: **+** adds, rows move, edit, duplicate or remove, the header switches
  between **one by one** and **merge**, a release shows progress and Stop, and an empty queue stays as a
  one-line strip instead of vanishing
- Shared pool keeps the built-in and custom groups; a family can be expanded, folded into one tab with its
  groups as chips, or hidden, and mixed lists name each row's group
- Starter prompts follow the host language; Settings can reset them in the current interface language,
  keeping edited built-ins as ordinary items
- Settings is one page with **Annotations** (three retention switches, each with Undo) and **Prompts**
  (post-use retention, built-in reset, group order and display) sections
- Right-click on selected conversation text to copy it or save it into a group (the last destination leads
  the menu), and confirmations with undo for deletes and clears

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
