// Adds the five template seeds and makes both seed sets flow through one builder.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'plugin', 'client.js');
let source = fs.readFileSync(file, 'utf8');

const fromBlock = `    function seededPool() {
      const now = Date.now();
      return {
        version: 1,
        categories: [],
        items: SEED_PROMPTS.map(([id, title, body]) => ({
          id,
          kind: 'note',
          title,
          body,
          pinned: true,
          categoryId: '',
          createdAt: now,
          updatedAt: now,
        })),
        tray: [],
        settings: normalizeSettings(undefined),
        seeded: true,
      };
    }

    function seedItems(existing) {
      const taken = new Set(existing.map((item) => item.id));
      const now = Date.now();
      return SEED_PROMPTS.filter(([id]) => !taken.has(id)).map(([id, title, body]) => ({
        id,
        kind: 'note',
        title,
        body,
        pinned: true,
        categoryId: '',
        createdAt: now,
        updatedAt: now,
      }));
    }`;

const toBlock = `    /** Templates: each one has a hole to fill and a shape the answer must take. */
    const SEED_TEMPLATES = [
      [
        'seed:review',
        '代码审查',
        '审阅 {{贴 diff 或文件}}：先用一句话给结论（能否合入、卡在哪）；再按「阻塞 / 建议 / 可选」分级列问题，每条给行号、触发条件、修法。不要重述代码在做什么。',
      ],
      [
        'seed:options',
        '方案对比',
        '针对 {{决策点}} 给 2–3 个候选方案，用表格对比：改动范围、风险、回滚难度、后续维护成本；最后给推荐项和一句理由。',
      ],
      [
        'seed:acceptance',
        '验收清单',
        '为 {{功能名}} 输出可勾选清单，按「正常路径 / 边界 / 失败恢复」分组；每条写成一个可观察的结果，能被执行或验证。',
      ],
      [
        'seed:changelog',
        '变更说明',
        '按 Keep a Changelog 写 {{版本号}} 的变更说明：动词开头、一条一个变更、修复与新增不混在同一条；破坏性变更单独列一节。',
      ],
      [
        'seed:explain',
        '解释这段代码',
        '解释 {{代码或模块}}：先用一句话说它解决什么问题，再说依赖的关键不变量、最容易踩的坑、以及改动时不能破坏的东西。',
      ],
    ];

    function seedItem([id, title, body], kind, pinned, now) {
      return { id, kind, title, body, pinned, categoryId: '', createdAt: now, updatedAt: now };
    }

    function allSeedItems(now) {
      return [
        ...SEED_PROMPTS.map((entry) => seedItem(entry, 'note', true, now)),
        ...SEED_TEMPLATES.map((entry) => seedItem(entry, 'snippet', false, now)),
      ];
    }

    function seededPool() {
      return {
        version: 1,
        categories: [],
        items: allSeedItems(Date.now()),
        tray: [],
        settings: normalizeSettings(undefined),
        seeded: true,
      };
    }

    function seedItems(existing) {
      const taken = new Set(existing.map((item) => item.id));
      const missing = [...SEED_PROMPTS, ...SEED_TEMPLATES].filter(([id]) => !taken.has(id));
      const missingIds = new Set(missing.map(([id]) => id));
      return allSeedItems(Date.now()).filter((item) => missingIds.has(item.id));
    }`;

if (source.split(fromBlock).length - 1 !== 1) throw new Error('seed block not found verbatim');
source = source.split(fromBlock).join(toBlock);

fs.writeFileSync(file, source);
console.log('template seeds added');
