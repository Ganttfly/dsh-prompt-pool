// Versioned seeding: each batch has a level, so a later batch reaches pools
// seeded by an earlier build without resurrecting items the user deleted.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'plugin', 'client.js');
let source = fs.readFileSync(file, 'utf8');

const fromBlock = `    function seedItem([id, title, body], kind, pinned, now) {
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

const toBlock = `    /** A build bumps this and adds one batch; older pools receive only the new batch. */
    const SEED_LEVEL = 2;

    function seedItem([id, title, body], kind, pinned, now) {
      return { id, kind, title, body, pinned, categoryId: '', createdAt: now, updatedAt: now };
    }

    function seedsAbove(level, now) {
      const batches = [
        { level: 1, items: SEED_PROMPTS.map((entry) => seedItem(entry, 'note', true, now)) },
        { level: 2, items: SEED_TEMPLATES.map((entry) => seedItem(entry, 'snippet', false, now)) },
      ];
      return batches.filter((batch) => batch.level > level).reduce((list, batch) => list.concat(batch.items), []);
    }

    function seededPool() {
      return {
        version: 1,
        categories: [],
        items: seedsAbove(0, Date.now()),
        tray: [],
        settings: normalizeSettings(undefined),
        seeded: SEED_LEVEL,
      };
    }

    function seedItems(existing, level) {
      const taken = new Set(existing.map((item) => item.id));
      return seedsAbove(level, Date.now()).filter((item) => !taken.has(item.id));
    }`;

if (source.split(fromBlock).length - 1 !== 1) throw new Error('seed builder block not found');
source = source.split(fromBlock).join(toBlock);

const fromMigrate = `        const pool = normalizePool(JSON.parse(raw));
        if (pool.seeded) return pool;
        const migrated = { ...pool, items: [...pool.items, ...seedItems(pool.items)], seeded: true };`;
const toMigrate = `        const pool = normalizePool(JSON.parse(raw));
        const level = Number(pool.seeded) || 0;
        if (level >= SEED_LEVEL) return pool;
        const migrated = { ...pool, items: [...pool.items, ...seedItems(pool.items, level)], seeded: SEED_LEVEL };`;
if (source.split(fromMigrate).length - 1 !== 1) throw new Error('migration block not found');
source = source.split(fromMigrate).join(toMigrate);

fs.writeFileSync(file, source);
console.log('seed levels added');
