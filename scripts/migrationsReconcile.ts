import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

type JournalEntry = { idx: number; when: number; tag: string };
type Journal = { entries: JournalEntry[] };

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
}

const apply = process.argv.includes('--apply');
const removePhantoms = process.argv.includes('--remove-phantoms');

const journal: Journal = JSON.parse(readFileSync('drizzle/meta/_journal.json', 'utf8'));

const local = journal.entries.map((entry) => {
    const sql = readFileSync(`drizzle/${entry.tag}.sql`, 'utf8');
    return {
        tag: entry.tag,
        when: entry.when,
        hash: createHash('sha256').update(sql).digest('hex'),
    };
});
const localHashes = new Set(local.map((m) => m.hash));

const client = new Client({ connectionString: databaseUrl });
await client.connect();

try {
    const { rows } = await client.query<{ id: number; hash: string; created_at: string }>(
        'SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id',
    );
    const appliedHashes = new Set(rows.map((row) => row.hash));

    const missing = local.filter((m) => !appliedHashes.has(m.hash));
    const phantoms = rows.filter((row) => !localHashes.has(row.hash));

    console.log(`Local migrations: ${local.length}`);
    console.log(`Applied rows: ${rows.length}`);
    console.log(`Missing (need to insert): ${missing.length}`);
    for (const m of missing) console.log(`  + ${m.tag} ${m.hash}`);
    console.log(`Phantoms (in DB but not in journal): ${phantoms.length}`);
    for (const p of phantoms) console.log(`  ? id=${p.id} hash=${p.hash} at=${p.created_at}`);

    if (!apply) {
        console.log('\nDry run. Re-run with --apply to insert missing rows.');
        if (phantoms.length > 0) console.log('Add --remove-phantoms to also delete phantom rows.');
    } else {
        try {
            for (const m of missing) {
                await client.query('INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)', [m.hash, m.when]);
                console.log(`inserted ${m.tag}`);
            }
            if (removePhantoms) {
                for (const p of phantoms) {
                    await client.query('DELETE FROM drizzle.__drizzle_migrations WHERE id = $1', [p.id]);
                    console.log(`deleted phantom id=${p.id}`);
                }
            }
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        }

        console.log('Done.');
    }
} finally {
    await client.end();
}
