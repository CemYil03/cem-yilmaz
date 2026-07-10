import { tool } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { adminTaxYearFindMany } from '../queries/adminTaxYearFindMany';

// Full tax read tool. The system-prompt snapshot already lists every year with
// its income sources, expenses, and checklist inline; use this only when the
// sub-agent needs the fully typed shape (e.g. to echo an expense's notes or a
// file list verbatim), which the snapshot trims.

const taxYearsListInputSchema = z.object({});

interface TaxAgentReadContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolTaxYearsList({ serverRuntime, session }: TaxAgentReadContext) {
    return tool({
        description: [
            'List every tax year with fully hydrated income sources, expenses (incl. attached files), documents, and',
            'computed totals. Use only when the snapshot in the system prompt is not enough.',
        ].join(' '),
        inputSchema: taxYearsListInputSchema,
        execute: async () => {
            return adminTaxYearFindMany(session, serverRuntime);
        },
    });
}
