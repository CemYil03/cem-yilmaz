import { tool } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { adminNutritionSupplementFindMany } from '../queries/adminNutritionSupplementFindMany';

// Supplement read tool. The system-prompt snapshot already lists every
// supplement with its id inline; use this only to read a supplement's full
// per-serving nutrient breakdown before editing it.

interface NutritionAgentReadContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

const supplementsListInputSchema = z.object({});

export function toolSupplementsList({ serverRuntime, session }: NutritionAgentReadContext) {
    return tool({
        description: [
            'List tracked supplements with their full per-serving composition (serving size, servings per container,',
            'and every nutrient with amount / unit / %DV). Use when the system-prompt snapshot lacks the detail you',
            'need — for example to read a supplement’s exact nutrient rows before editing them.',
        ].join(' '),
        inputSchema: supplementsListInputSchema,
        execute: async () => {
            return adminNutritionSupplementFindMany(session, serverRuntime);
        },
    });
}
