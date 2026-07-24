import { tool } from 'ai';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { financeAssets } from '../db/schema';
import type { AdminFinancesAssetCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminFinancesAssetKindSchema } from '../graphql/generated';
import type { GqlSAdminFinancesAssetInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of wealth assets. Every row with an `assetId` is updated;
// every row without one is inserted under a freshly-minted UUID. The whole
// batch runs inside a single transaction so a failure anywhere rolls the
// batch back. `currentValueCents` is *not* editable through this mutation
// after create — it is owned by `adminFinancesAssetsReprice`. On create the
// cache is seeded from the input (required) so net-worth is non-zero from
// the first save. `shares` is required when `kind` is `security` and forced
// null for cash / bauspar. `referenceIds` echoes the id per input in input
// order.
export async function adminFinancesAssetsUpsert(
    userId: string,
    inputs: readonly GqlSAdminFinancesAssetInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const assetId = input.assetId ?? crypto.randomUUID();
        const isUpdate = Boolean(input.assetId);
        const isSecurity = input.kind === 'security';
        if (isSecurity && (input.shares == null || !(input.shares > 0))) {
            throw new Error('adminFinancesAssetsUpsert: security assets require shares > 0');
        }
        if (!isUpdate && (input.currentValueCents == null || input.currentValueCents < 0)) {
            throw new Error('adminFinancesAssetsUpsert: currentValueCents is required on create');
        }
        const payload: AdminFinancesAssetCreate = {
            assetId,
            kind: input.kind,
            name: input.name,
            location: input.location.trim(),
            shares: isSecurity ? input.shares! : null,
            symbol: isSecurity ? (input.symbol ?? null) : null,
            isin: isSecurity ? (input.isin ?? null) : null,
            currency: input.currency ?? 'EUR',
            notes: input.notes ?? null,
            active: input.active ?? true,
            updatedAt: now,
        };
        if (!isUpdate) payload.currentValueCents = input.currentValueCents!;
        return { assetId, isUpdate, payload };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.assetId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ assetId: financeAssets.assetId })
                    .from(financeAssets)
                    .where(inArray(financeAssets.assetId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.assetId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`adminFinancesAssetsUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction.update(financeAssets).set(row.payload).where(eq(financeAssets.assetId, row.assetId));
                } else {
                    await transaction.insert(financeAssets).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.assetId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

const toolFinanceAssetsUpsertInputSchema = z.object({
    financeAssets: z
        .array(
            z.object({
                assetId: z.uuid().nullish(),
                kind: GqlSAdminFinancesAssetKindSchema,
                name: z.string().min(1),
                location: z.string().min(1).describe('Where the asset currently lives — e.g. TradeRepublic, Chase, LBS.'),
                currentValueCents: z
                    .number()
                    .int()
                    .nonnegative()
                    .nullish()
                    .describe('Required on create (cents). Ignored on update — use financeAssetsReprice to change value.'),
                shares: z.number().positive().nullish().describe('Required when kind is security; omit for cash / bauspar.'),
                symbol: z.string().nullish(),
                isin: z.string().nullish(),
                currency: z.string().length(3).nullish(),
                notes: z.string().nullish(),
                active: z.boolean().nullish(),
            }),
        )
        .min(1),
});

interface FinanceAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolFinanceAssetsUpsert({ serverRuntime, session }: FinanceAgentToolContext) {
    return tool({
        description: [
            'Batch create-or-edit of wealth assets (what Cem owns). Asset-first: the row is the position;',
            '`location` is only where it currently sits (TradeRepublic, Scalable Capital, LBS, Chase, …) — not a',
            'parent entity. `kind`: `cash` (Tagesgeld / Giro balance), `security` (ETF or stock — needs `shares` +',
            'value), `bauspar` (Bausparvertrag balance). Money is in CENTS: 12.345,67 € → `currentValueCents: 1234567`.',
            '`currentValueCents` is required on CREATE and ignored on UPDATE — to change value later call',
            '`financeAssetsReprice`. To pause without deleting, upsert with `active: false`. Returns `referenceIds`',
            'in input order.',
        ].join(' '),
        inputSchema: toolFinanceAssetsUpsertInputSchema,
        execute: async (rawInput) => {
            const inputs = rawInput.financeAssets as GqlSAdminFinancesAssetInput[];
            return adminFinancesAssetsUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
        },
    });
}
