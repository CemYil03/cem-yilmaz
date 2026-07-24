import { tool } from 'ai';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { financeAssetValuations, financeAssets } from '../db/schema';
import type { AdminFinancesAssetValuationCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminFinancesAssetRepriceInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch repricing. For each input, insert one `AdminFinancesAssetValuation`
// journal row and update the cached `financeAssets.currentValueCents`. The
// whole batch runs in a single transaction. Optional `shares` snapshots the
// quantity at valuation time (useful for securities); when omitted the
// asset's current `shares` is copied. Kept separate from upsert so a naive
// edit cannot overwrite the cache without a matching journal entry.
export async function adminFinancesAssetsReprice(
    userId: string,
    inputs: readonly GqlSAdminFinancesAssetRepriceInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction (shares resolved after existence check).
    const rows = inputs.map((input) => ({
        assetId: input.assetId,
        valueCents: input.valueCents,
        sharesOverride: input.shares ?? null,
        valuedAt: input.valuedAt ?? now,
        note: input.note ?? null,
    }));

    // Phase 2 — transactional execution.
    try {
        const assetIds = Array.from(new Set(rows.map((row) => row.assetId)));
        await serverRuntime.db.transaction(async (transaction) => {
            const existing = await transaction
                .select({ assetId: financeAssets.assetId, shares: financeAssets.shares })
                .from(financeAssets)
                .where(inArray(financeAssets.assetId, assetIds));
            if (existing.length !== assetIds.length) {
                const found = new Set(existing.map((row) => row.assetId));
                const missing = assetIds.filter((id) => !found.has(id));
                throw new Error(`adminFinancesAssetsReprice: rows not found: ${missing.join(', ')}`);
            }
            const sharesById = new Map(existing.map((row) => [row.assetId, row.shares]));
            for (const row of rows) {
                const shares = row.sharesOverride ?? sharesById.get(row.assetId) ?? null;
                const valuation: AdminFinancesAssetValuationCreate = {
                    valuationId: crypto.randomUUID(),
                    assetId: row.assetId,
                    valueCents: row.valueCents,
                    shares,
                    valuedAt: row.valuedAt,
                    note: row.note,
                };
                await transaction.insert(financeAssetValuations).values(valuation);
                await transaction
                    .update(financeAssets)
                    .set({
                        currentValueCents: row.valueCents,
                        ...(row.sharesOverride != null ? { shares: row.sharesOverride } : {}),
                        updatedAt: now,
                    })
                    .where(eq(financeAssets.assetId, row.assetId));
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.assetId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

const toolFinanceAssetsRepriceInputSchema = z.object({
    inputs: z
        .array(
            z.object({
                assetId: z.uuid(),
                valueCents: z.number().int().nonnegative().describe('New current value in cents.'),
                shares: z.number().positive().nullish().describe('Optional new share count for securities.'),
                valuedAt: z.string().datetime().nullish().describe('ISO datetime; defaults to now.'),
                note: z.string().nullish(),
            }),
        )
        .min(1),
});

interface FinanceAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolFinanceAssetsReprice({ serverRuntime, session }: FinanceAgentToolContext) {
    return tool({
        description: [
            'Reprice one or more wealth assets — updates the cached current value and appends a valuation journal',
            'row. Use this (not upsert) whenever Cem reports a new balance or market value: "Tagesgeld is now',
            '12.500 €", "VWCE is worth 1.200 €". Money in CENTS. Optional `shares` when the quantity also changed.',
            'Returns `referenceIds` (asset ids) in input order.',
        ].join(' '),
        inputSchema: toolFinanceAssetsRepriceInputSchema,
        execute: async (rawInput) => {
            const inputs = rawInput.inputs.map((row) => ({
                assetId: row.assetId,
                valueCents: row.valueCents,
                shares: row.shares ?? null,
                valuedAt: row.valuedAt ? new Date(row.valuedAt) : null,
                note: row.note ?? null,
            })) as GqlSAdminFinancesAssetRepriceInput[];
            return adminFinancesAssetsReprice(requireAdminUserId(session), inputs, session, serverRuntime);
        },
    });
}
