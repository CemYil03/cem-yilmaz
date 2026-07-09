import { tool } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { adminMedicalCategoryOverviewFindMany } from '../queries/adminMedicalCategoryOverviewFindMany';

interface MedicalAgentReadContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

const medicalOverviewInputSchema = z.object({});

export function toolMedicalOverview({ serverRuntime, session }: MedicalAgentReadContext) {
    return tool({
        description: [
            'Read the per-category overview (default cadence, last visit, next due, overdue flag, upcoming visits,',
            'recent records). Use when Cem asks "am I overdue for anything?", "when did I last see my GP?",',
            '"what\'s coming up medically?" — the same shape the /workspace/medical overview tab renders.',
        ].join(' '),
        inputSchema: medicalOverviewInputSchema,
        execute: async () => adminMedicalCategoryOverviewFindMany(session, serverRuntime),
    });
}
