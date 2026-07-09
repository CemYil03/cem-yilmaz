import { tool } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { adminMediaShowFindMany } from '../queries/adminMediaShowFindMany';

const showsListInputSchema = z.object({
    status: z
        .enum(['watchlist', 'watching', 'watched', 'dropped'])
        .optional()
        .describe('Narrow to a single status bucket. Omit to list every bucket.'),
});

interface MediaAgentReadContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolShowsList({ serverRuntime, session }: MediaAgentReadContext) {
    return tool({
        description: [
            'List TV series with full metadata (poster, overview, rating, notes, completed flag, next-season',
            'dates). Use only when the system-prompt snapshot is not enough — typically when Cem asks about the',
            'overview, notes, or next-season timing of a specific series.',
        ].join(' '),
        inputSchema: showsListInputSchema,
        execute: async (input) => {
            const rows = await adminMediaShowFindMany(session, serverRuntime);
            return input.status ? rows.filter((r) => r.status === input.status) : rows;
        },
    });
}
