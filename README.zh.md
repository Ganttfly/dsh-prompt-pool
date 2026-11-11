# 提示池 · Prompt pool

[English](README.md) | 中文

DeepSeek Harness 里的提示词暂存池：草稿先存着不会被执行，排好顺序后一次性释放进输入框的发送队列。

它有两个入口：输入框旁的按钮，以及右侧栏里的整页。

## 界面

![提示池面板展开在对话上方，分组 Tab 带条数，底部是待发送队列](docs/images/panel.png)

输入框面板：分组 Tab 带条数，每行有插入 / 入队 / 编辑 / 复制 / 删除，底部是待发送队列。

![提示池在右侧栏里的整页视图](docs/images/sidebar.png)

右侧栏里的整页视图——DSH 0.2+ 是原生 Tab，带分组 Tab 与「每个工作区一个 Tab」。

![设置页：分组顺序与显示方式，以及插件信息卡片](docs/images/settings.png)

设置：每一族分组的显示方式与顺序，下面是插件信息。

## 功能

- **暂存而不是发送**——写一半的提示词先存进池子，不释放就不会执行。
- **按顺序释放**——队列里的条目按你排的顺序逐条送进输入框；每一条都等前一条被宿主接受后再发下一条。
  宿主提供会话队列接口时，条目直接进入队列，不经过输入框；没有该接口时退回输入框路径。释放期间两个视图
  都会显示进度和「停止」，队列在结束前锁定。
- **输入框面板**——搜索、分组 Tab、行内 插入 / 入队 / 编辑 / 复制 / 删除，底部是待发送队列卡片（折叠、清空、发送）。顶部边缘可以拖动改高度，左边缘可以拖动改宽度；点「钉住」后点面板外面也不会关。
- **侧栏页**——同一个池子，右侧栏里的整页视图。
- **分组**——内置 常用 / 便签 / 模板，另有自定义分组与「每个工作区一个 Tab」。每一族可以展开、折叠成一个 Tab，或隐藏。
- **设置**——分组的顺序与显示方式、显示哪些工作区，以及两个开关：插入或入队后是否把条目留在池子里。
- **破坏性操作有确认**——删除条目、清空队列、移出队列条目都会先问；删除和清空还能在提示条上撤销。
- **中英双语**——所有文案跟随宿主语言，包括侧栏 Tab 名。

## 安装

包发布到 npm 并被社区市场收录后，可以在 设置 → 插件 的市场里直接装，或用命令行：

```powershell
dsh plugin add dsh-prompt-pool --profile <profile>
```

用 tarball 也一样：

```powershell
dsh plugin add ./dsh-prompt-pool-<version>.tgz --profile <profile>
```

装完要在 **设置 → 插件** 里启用这个 bundle——它是个 bundle，只装包不会自动开启。

## 使用

1. 点输入框旁的 **提示池**，或打开侧栏页。
2. **存草稿** 会把输入框的内容（文字 + 图片附件）复制进池子，并弹出一个小窗口列出当前 Tab 栏里展示的
   分组（内置、自定义，以及所有当前展示的工作区）；提示条会说明存到了哪里。输入框里的字保留。
3. 用 ⊕ 把条目加入队列，在队列卡片里调整顺序，然后点 **发送**。
4. 队列里的条目会被逐条写进输入框并提交。

## 兼容性

- DSH **>= 0.2.0-rc.1**，实测 **0.2.2-rc.1**。
- 侧栏页优先使用宿主自带的右侧栏 Tab 注册表（DSH 0.2+）；没有时回退到
  [`dsh-better-sidebar`](https://github.com/omdsh-dev/DSH-better-sidebar)；两者都没有时，输入框面板与设置页仍然可用。

## 数据

- 条目与设置：`localStorage["dsh.prompt-pool.v1"]`
- 池子里的图片：IndexedDB `dsh-prompt-pool-images.v1`
- 存储结构升级前，旧数据会先复制一份到 `localStorage["dsh.prompt-pool.v1.backup"]`
- 写入失败（存储已满或被禁用）时，页面会明确提示"没有保存"
- 没有任何条目引用的图片会在启动时清理；在编辑器里移除并保存的图片会立即删除

卸载插件**不会**删除这两处数据，重新安装后池子还在；要彻底清掉需要手动删除。

## 已知限制

- **非图片附件不会被捕获**。输入框里的浏览器文件能读到，但池子只存图片；捕获时会提示有多少个附件没被保存。
- **引用芯片会退化成文本**。存下的条目如果引用了文件或会话，正文保留引用文本（模型仍能看到），但回插到输入框时是纯文本，不是可点的芯片——宿主没有开放重建芯片的接口。
- **存草稿不会清空输入框**。它是复制；要清空请用编辑器自己的清空操作。

## 开发

```powershell
npm run check                       # lint + 完整测试，CI 跑的就是这个
npm run lint                        # 语法、版本一致性、中英 key 对齐与死 key
npm test                            # 通过 tools/run-tests.js 跑完整测试
node tools/smoke.js                 # 模块加载、槽位注册、语言切换改名、版本一致性
node tools/render-smoke.js          # 每个槽位能渲染；面板与设置的结构断言
Get-ChildItem tools/verify/*.js | ForEach-Object { node $_.FullName }   # 行为检查
```

GitHub Actions 会在每次 push / pull request 时跑同一个 `npm test`。

面板的高度在真浏览器里量，不靠肉眼：需要把 playwright 放进 `NODE_PATH`，再准备一份 `react` /
`react-dom` 供页面加载（装到 `%TEMP%\pp-harness` 一次即可，或用 `PP_VENDOR` 指向已有的 `node_modules`）。

```powershell
pnpm --dir "$env:TEMP\pp-harness" add react@18 react-dom@18
$env:NODE_PATH = "$env:DSH_PROFILE_DIR\node_modules"
node tools/panel-geometry/run.js --viewport 1280x760 --composer 0.34 --drag --shot panel-height
node tools/panel-geometry/run.js --viewport 1280x900 --composer 0.9 --tray 6 --shot queue-card
```

`--composer` 把输入框放在窗口中部（新会话的样子）。模拟页面保留了顶部栏和会裁剪溢出的会话面板，所以
面板标题被裁掉、或被自己的盒子滚出视野时，这次运行会直接报错；`--tray N` 预置待发送队列，队列还短就
出现滚动条同样会报错。

包本体在 `plugin/`；`tools/` 只用于开发，`_shots/` 是本地的截图暂存目录，不进仓库。

## License

MIT
