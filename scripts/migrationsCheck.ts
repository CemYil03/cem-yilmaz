import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

type JournalEntry = { idx: number; tag: string };
type Journal = { entries: JournalEntry[] };

const databaseUrl = process.env.DATABASE_URL;
const dbLabel = process.env.DB_LABEL ?? 'database';

if (!databaseUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
}

const journal: Journal = JSON.parse(readFileSync('drizzle/meta/_journal.json', 'utf8'));

const localMigrations = journal.entries.map((entry) => {
    const sql = readFileSync(`drizzle/${entry.tag}.sql`, 'utf8');
    return {
        tag: entry.tag,
        hash: createHash('sha256').update(sql).digest('hex'),
    };
});

const client = new Client({ connectionString: databaseUrl });
await client.connect();

try {
    const { rows } = await client.query<{ hash: string }>('SELECT hash FROM drizzle.__drizzle_migrations');
    const appliedHashes = new Set(rows.map((row) => row.hash));

    const missing = localMigrations.filter((m) => !appliedHashes.has(m.hash));

    if (missing.length > 0) {
        console.error(`[${dbLabel}] ${missing.length} migration(s) not applied: ${missing.map((m) => m.tag).join(', ')}`);
        process.exit(1);
    }

    console.log(`[${dbLabel}] all ${localMigrations.length} migration(s) applied`);
} finally {
    await client.end();
}
