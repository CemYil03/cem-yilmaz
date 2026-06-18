import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from './schema.ts';
import { environmentVariables } from '../env/environmentVariablesCreate.ts';

export const db = drizzle(environmentVariables.databaseUrl, { schema });

export type Database = typeof db;

export type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
