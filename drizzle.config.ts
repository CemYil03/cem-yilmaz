import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import type { Config } from 'drizzle-kit';

config({ path: ['.env.local', '.env'] });

const drizzleConfig: Config = defineConfig({
    out: './drizzle',
    schema: './src/server/db/schema.ts',
    dialect: 'postgresql',
    dbCredentials: {
        // eslint-disable-next-line no-restricted-syntax
        url: process.env.DATABASE_URL ?? '',
    },
});

export default drizzleConfig;
