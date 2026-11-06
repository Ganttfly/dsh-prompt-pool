// One-time seed injection: a pool that predates the seed flag receives the five
// built-in prompts once, then the flag prevents any re-injection.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'plugin', 'client.js');
let source = fs.readFileSync(file, 'utf8');

const edits = [
  // Pool state remembers whether seeding has run.
  [
    'return { version: 1, categories, items, tray, settings: normalizeSettings(data && data.settings) };',
    'return { version: 1, categories, items, tray, settings: normalizeSettings(data && data.settings), seeded: Boolean(data && data.seeded === true) };',
  ],
  // Empty/corrupt states never reseed.
  [
    "return { version: 1, categories: [], items: [], tray: [], settings: normalizeSettings(undefined) };",
    "return { version: 1, categories: [], items: [], tray: [], settings: normalizeSettings(undefined), seeded: true };",
  ],
  // The fresh-install pool is already seeded.
  [
    '        tray: [],\n        settings: normalizeSettings(undefined),\n      };',
    '        tray: [],\n        settings: normalizeSettings(undefined),\n        seeded: true,\n      };',
  ],
  // Seed items, minus any identity the pool already holds.
  [
    '    function loadPool() {',
    `    function seedItems(existing) {
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
    }

    function loadPool() {`,
  ],
  // Legacy pools get the seeds once.
  [
    '        return normalizePool(JSON.parse(raw));',
    `        const pool = normalizePool(JSON.parse(raw));
        if (pool.seeded) return pool;
        const migrated = { ...pool, items: [...pool.items, ...seedItems(pool.items)], seeded: true };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        } catch (_error) {
          /* storage unavailable: keep the in-memory copy only */
        }
        return migrated;`,
  ],
];

for (const [from, to] of edits) {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`expected 1 match for "${from.slice(0, 60)}", got ${count}`);
  source = source.split(from).join(to);
}

fs.writeFileSync(file, source);
console.log('one-time seed migration added');
