# 发布准备清单（dsh-prompt-pool / 提示池）

这份文档记录把插件从「本机开发」推到「可以被别人安装」需要做的事，以及每件事为什么需要。
执行顺序即章节顺序，前一章没完成时不要进入下一章。

---

## 0. 现状盘点（2026-11-13，1.4.0）

> §1–§8 是 2026-11-10 的执行清单，现已全部完成，保留作为记录；下表是当前状态。

| 项目 | 现状 | 结论 |
|---|---|---|
| npm 包名 | `dsh-prompt-pool` 已发布 1.0.0 / 1.0.1 / 1.0.2 / 1.0.3 / 1.1.0 / 1.1.1 / 1.2.0 / 1.3.0 | 名字已占用 |
| 版本 | `plugin/package.json` = 1.4.0（未发布），界面 `PLUGIN_VERSION` 同步 | smoke 已强制一致 |
| 打包产物 | `npm pack --dry-run` = 9 个文件、约 86.3 kB（解压约 367.9 kB） | 内容正确 |
| `private` | `false` | 已发布 |
| license / author / repository / keywords / engines | 已补齐 | 已发布 |
| git remote | `github.com/Ganttfly/dsh-prompt-pool`（`main`） | 正确 |
| GitHub 账号 | `Ganttfly` | 仓库与包已互指 |
| 插件信息卡里的仓库地址 | 已指向真实仓库 | 正确 |
| 宿主实测版本 | DSH 0.2.2-rc.1 | README 已写 |
| 仓库历史 | `_ref/`、`asar-files.tsv`、`_shots/` 已从历史清除 | 包体约 1.9 MiB |

1.4.0 的主要变化：在助手正文里选中一句话即可添加行内批注（六种类型、最多 10 字、彩色标记与下划线）；
提示池新增「批注」页签，支持定位、插入、存成提示词、生成草稿和删除；批注按会话保存，设置里可以调整
生成草稿/存成提示词后是否保留。

1.3.0 的主要变化：内置提示词/模板种子跟随宿主语言；设置 → 提示词新增「重置内置提示词」，按当前界面
语言重写，可把编辑过的内置项保留为普通条目；自定义条目和队列不受影响。

1.2.0 的主要变化：会话里选中文字后右键，一级菜单是「复制」和「添加到提示池」，分组在二级菜单里；选中内容
可直接存进指定分组，上次用的分组排在最前。

1.1.1 是文档版：刷新 README 截图、补 npm 版本徽章与安装说明，插件代码与 1.1.0 相同。

1.1.0 的主要变化：释放优先直投宿主队列（不再逐条改输入框）；面板可钉住、可拖宽度；存草稿先选
当前展示的分组，空输入直接拒绝；展开分组后的 Tab 也显示计数。

---

## 1. 仓库与身份

**要做什么**

1. 在 GitHub 建一个只属于这个插件的仓库（建议 `Ganttfly/dsh-prompt-pool`）。
2. 把现有历史推上去，并把 `origin` 改成新仓库。
3. 确认 `plugin/package.json` 的 `repository` 与它一致。

**为什么**

- 插件市场（dshfind）的收录规则是：**只收录已发布到 npm、且包与 GitHub 仓库互相指向的包**。`repository` 写错，要么不进目录，要么把用户导到别的项目。
- 现在的 `origin` 指向 `dsh-to-chinese`，这会让以后每一次 `git push` 都落到错误的仓库。

**怎么做**

```powershell
git remote set-url origin https://github.com/Ganttfly/dsh-prompt-pool.git
git push -u origin main
```

**验收**：`git remote -v` 只剩新仓库；GitHub 页面能看到完整提交历史。

---

## 2. package.json 字段

**要做什么**（`plugin/package.json`）

```json
{
  "name": "dsh-prompt-pool",
  "version": "1.0.0",
  "private": false,
  "license": "MIT",
  "author": "GanttShen",
  "repository": { "type": "git", "url": "git+https://github.com/Ganttfly/dsh-prompt-pool.git" },
  "homepage": "https://github.com/Ganttfly/dsh-prompt-pool#readme",
  "bugs": { "url": "https://github.com/Ganttfly/dsh-prompt-pool/issues" },
  "keywords": ["deepseek-harness", "dsh", "cordis", "plugin", "prompt", "queue", "composer"],
  "engines": { "node": ">=22", "dsh": ">=0.2.0-rc.1" }
}
```

**为什么每个字段都要**

| 字段 | 作用 | 缺失的后果 |
|---|---|---|
| `private: false` | 允许发布 | npm 直接拒绝 |
| `license` | 声明代码可用范围 | 公司/法律上默认「保留所有权利」，别人不敢用 |
| `author` | 插件列表与市场展示作者 | 来源不可追溯 |
| `repository` | npm ↔ GitHub 互指，市场收录的硬条件 | 不被 dshfind 收录 |
| `homepage` / `bugs` | npm 页面上的主页与反馈入口 | 用户找不到提 issue 的地方 |
| `keywords` | npm 搜索权重 | 站内搜索命中率下降 |
| `engines.node` | 声明 Node 版本 | 低版本环境装上也跑不了 |
| `engines.dsh` | 声明宿主版本下限，插件管理器据此判断兼容 | 旧版 DSH 装上后可能白屏/报错 |

**保留不动**：`type: module`、`icon`、`exports`、`files`、`dsh.bundle.patch`、`dsh.client`（`platform: web`、`inject`）。

可选：`dsh.manifestVersion: 1`（`dsh-better-sidebar` 用了，属于显式声明，可加可不加）。

**验收**：`npm pkg get name version license repository engines` 输出符合预期。

---

## 3. 展示资源

**要做什么**

1. `plugin/locale/zh.json` 的 `meta.title` = 「提示池」、`meta.description` 写清能力（已完成）。
2. `plugin/locale/en.json` 的 `meta.title` = "Prompt pool"，句式大小写（已完成）。
3. `plugin/icon.svg` 确认是自有素材或可再分发素材，且不超过 256 KiB。
4. `package.json` 的 `files` 必须包含 `locale/*.json` 与 `icon.svg`（已完成）。

**为什么**

- 插件列表与设置页的标题/描述/图标全部读这两个 locale 和这张图；缺了会回退到包名与默认图，看起来像半成品。
- 图标带第三方授权又没署名，发布后会成为授权问题。

**验收**：干净 profile 里插件列表显示「提示池 / Prompt pool」+ 图标 + 描述，中英各看一次。

---

## 4. 文档

**要做什么**：仓库根目录补 `README.md`（英文）、`README.zh.md`（中文）、`CHANGELOG.md`、`LICENSE`。

README 至少包含：

1. 一句话定位 + 一张界面截图；
2. 安装方式（应用内市场 / `dsh plugin add`）；
3. 功能清单：输入框入口、面板、侧栏页、设置三个 Tab、存草稿、队列、确认框、保留开关；
4. 依赖说明：侧栏页优先用 DSH 0.2 自带的右侧栏；老版本回退到 `dsh-better-sidebar`；两者都没有时只有输入框面板与设置页；
5. 数据存放位置（localStorage `dsh.prompt-pool.v1` + IndexedDB `dsh-prompt-pool-images.v1`）与「卸载插件不会删数据」；
6. 兼容性：在 DSH 0.2.2-rc.1 上验证；
7. 已知限制：非图片附件不会被捕获；回插的引用芯片会退化成文本。

`CHANGELOG.md` 按 Keep a Changelog 写，从 0.1.0 起按主题归并（不用把每个小版本都列一遍）。

`LICENSE` 用 MIT（与已发布插件的主流选择一致；若要闭源就**不要发公共 npm 包**）。

**为什么**：市场里的插件基本都靠 README 决定装不装；没有已知限制说明，第一次遇到「引用变文本」的用户会当成 bug。

---

## 5. 打包校验

**要做什么**

```powershell
cd plugin
npm pack --dry-run
```

确认输出里只有：`client.js`、`index.js`、`cordis.patch.yml`、`icon.svg`、`locale/en.json`、`locale/zh.json`、`package.json`（README/LICENSE 会被 npm 自动带上）。

**为什么**：`files` 白名单漏写会让装上的包缺文件（例如没有 locale 就没有标题）；多写会把开发脚本、截图打进 tarball。

**验收**：文件数与大小可解释；`npm publish --dry-run` 不再报 `private` 错误。

---

## 6. 干净 profile 安装测试（发布前唯一真正的验收）

**要做什么**

```powershell
dsh plugin add dsh-prompt-pool --profile scratch   # 发布前可用 npm pack 的 tgz 代替包名
```

启动该 profile，在「设置 → 插件」里启用 bundle，然后逐项过：

- [ ] 输入框右侧出现「提示池」按钮；有队列时变蓝并带数字
- [ ] 点开面板：搜索、分组 Tab、行操作、队列卡片、折叠/展开、拖动改高度
- [ ] 右侧栏（DSH 0.2 原生）「＋」里出现「提示池」；关掉 better-sidebar 仍然可用
- [ ] 设置三个 Tab（分组 / 工作区 / 提示词）都能改并立即生效
- [ ] 存草稿：文本 + 图片附件一起进池子，提示语正确
- [ ] 插入 / 加入队列：按「提示词」开关决定是否保留原条目
- [ ] 删除、清空队列、移出队列三处都有确认；删除与清空可撤销
- [ ] 释放队列：按顺序逐条进入输入框并提交
- [ ] 切中英文：Tab 名、面板、关于卡片全部跟着变
- [ ] 卸载 bundle：无报错，数据留存符合 README 描述

**为什么**：本机 profile 是 junction 链到源码目录的，`files` 白名单、打包后的相对路径、干净环境下的图标/locale 都测不到；「本机能跑」不代表「装上能跑」。

---

## 7. 发布

**要做什么**

```powershell
cd plugin
npm whoami                 # 确认登录的是正确账号
npm publish --access public
git tag v1.0.0
git push origin v1.0.0
```

然后在 GitHub 上建 Release，正文抄 CHANGELOG 对应段落。

**为什么**

- `--access public`：无 scope 包默认就是 public，显式写出来避免误配。
- tag 与 npm 版本必须一一对应，用户和收录系统都靠它对账。
- 开了 2FA 的账号需要 `--otp`；建议在 npm 后台建一个 Automation token 用于后续 CI。

**验收**：`npm view dsh-prompt-pool version` 等于刚发布的版本；`npm install` 在干净目录能装上。

---

## 8. 收录（dshfind / 应用内市场）

**要做什么**

1. 发布后等待 dshfind 每日抓取（索引原文：只收 npm 已发布、且与 GitHub 仓库互相对应的包）。
2. 到 `https://dshfind.com` 搜索包名，确认条目出现、分类为 `ui`、描述与图标正确。
3. 应用内市场读的是同一份索引，收录后即可搜到。

**仓库布局**：dshfind 从仓库根 `package.json` 开始探测；根清单要用 `workspaces` 指向
`plugin/`，否则它看不到子包里的 `dsh.bundle`，会把条目判成不可安装、`is_plugin` 留空。
安装命令由它每日的 `probe:install` 生成，不读 npm 页面的展示。

**为什么**：应用内市场是绝大多数用户的实际安装路径；没有收录等于只有知道包名的人能装。

**验收**：dshfind 条目存在；应用内市场搜索「提示池 / prompt pool」能装。

---

## 9. 发布后维护

1. **版本纪律**：每次修复 bump patch；`plugin/client.js` 的 `PLUGIN_VERSION` 与 `plugin/package.json` 必须一致（`tools/smoke.js` 已强制）。
2. **兼容性**：DSH 升级后重跑 `node tools/smoke.js`、`render-smoke.js` 与 `tools/verify/*.js`（逐个 `node`），再更新 README 的兼容性一行与 `engines.dsh`。
3. **反馈入口**：GitHub issue 模板（bug / feature），README 里指过去。
4. **数据兼容**：改存储结构时 bump `POOL_VERSION`，并想清楚旧数据是迁移还是重置（现在小于当前版本会重置为种子，要避免用户丢数据）。

---

## 一页清单

- [ ] 新建 GitHub 仓库并改 `origin`
- [ ] `repository / homepage / bugs / license / author / keywords / engines` 补齐
- [ ] 去掉 `private: true`
- [ ] README ×2、CHANGELOG、LICENSE
- [ ] `npm pack --dry-run` 文件清单正确
- [ ] 干净 profile 全功能验收（第 6 节清单）
- [ ] `npm publish` + tag + GitHub Release
- [ ] dshfind 收录确认
- [ ] README 写清已知限制与数据位置
