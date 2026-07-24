import { and, asc, desc, gte, lte } from 'drizzle-orm';
import { foodLogEntries, mealPlanEntries, recipes, supplements } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

// Compact markdown snapshot embedded in the nutrition sub-agent's system
// prompt so it can answer common asks — "give me a snack idea", "what's
// planned tomorrow?" — without a list call. Each row keeps its id inline so
// the agent can address it in mutation tools directly.
//
// Cookbook is capped so a large library does not dominate the prompt:
// favourites first, then recently made, then others — max COOKBOOK_CAP total.
// Meal plan is the near horizon only (today → +21 days). Diary stays last 15.
const COOKBOOK_CAP = 40;
const MEAL_PLAN_HORIZON_DAYS = 21;

export async function nutritionSnapshotForAgent(serverRuntime: ServerRuntime): Promise<string> {
    const today = new Date().toISOString().slice(0, 10);
    const horizonEnd = new Date();
    horizonEnd.setUTCDate(horizonEnd.getUTCDate() + MEAL_PLAN_HORIZON_DAYS);
    const horizonEndStr = horizonEnd.toISOString().slice(0, 10);

    const [recipeRows, planRows, logRows, supplementRows] = await Promise.all([
        serverRuntime.db.select().from(recipes).orderBy(desc(recipes.isFavorite), asc(recipes.mealType), asc(recipes.title)),
        serverRuntime.db
            .select()
            .from(mealPlanEntries)
            .where(and(gte(mealPlanEntries.date, today), lte(mealPlanEntries.date, horizonEndStr)))
            .orderBy(asc(mealPlanEntries.date), asc(mealPlanEntries.mealType)),
        serverRuntime.db.select().from(foodLogEntries).orderBy(desc(foodLogEntries.consumedAt)).limit(15),
        serverRuntime.db.select().from(supplements).orderBy(asc(supplements.name)),
    ]);

    // Prefer favourites, then recently made, then the rest — still capped.
    const favourites = recipeRows.filter((r) => r.isFavorite);
    const recentlyMade = recipeRows
        .filter((r) => !r.isFavorite && r.lastMadeAt != null)
        .sort((a, b) => (b.lastMadeAt?.getTime() ?? 0) - (a.lastMadeAt?.getTime() ?? 0));
    const others = recipeRows.filter((r) => !r.isFavorite && r.lastMadeAt == null);
    const cappedRecipes: typeof recipeRows = [];
    const seen = new Set<string>();
    for (const r of [...favourites, ...recentlyMade, ...others]) {
        if (seen.has(r.recipeId)) continue;
        seen.add(r.recipeId);
        cappedRecipes.push(r);
        if (cappedRecipes.length >= COOKBOOK_CAP) break;
    }
    const recipeTruncated = recipeRows.length > cappedRecipes.length;

    const lines: string[] = [];

    lines.push('## Cookbook');
    if (cappedRecipes.length === 0) {
        lines.push('(no recipes yet)');
    } else {
        for (const r of cappedRecipes) {
            const bits: string[] = [];
            if (r.isFavorite) bits.push('★fav');
            if (r.rating != null) bits.push(`${r.rating}/10`);
            if (r.prepTimeMinutes != null) bits.push(`${r.prepTimeMinutes}min`);
            if (r.tags.length > 0) bits.push(r.tags.join(','));
            if (r.lastMadeAt) bits.push(`last made ${r.lastMadeAt.toISOString().slice(0, 10)}`);
            const meta = bits.length > 0 ? ` — ${bits.join(' · ')}` : '';
            lines.push(`- [${r.mealType}] ${r.title}${meta} (id: ${r.recipeId})`);
        }
        if (recipeTruncated) {
            lines.push(`(…${recipeRows.length - cappedRecipes.length} more recipes omitted — call recipesList if needed)`);
        }
    }

    lines.push('', `## Meal plan (today → +${MEAL_PLAN_HORIZON_DAYS}d)`);
    if (planRows.length === 0) {
        lines.push('(nothing planned)');
    } else {
        for (const p of planRows) {
            const what = p.customText ?? '(recipe)';
            lines.push(`- ${p.date} [${p.mealType}] ${what} (id: ${p.entryId}${p.recipeId ? `, recipe: ${p.recipeId}` : ''})`);
        }
    }

    lines.push('', '## Recent diary (last 15)');
    if (logRows.length === 0) {
        lines.push('(nothing logged)');
    } else {
        for (const l of logRows) {
            lines.push(
                `- ${l.consumedAt.toISOString().slice(0, 16).replace('T', ' ')} [${l.mealType}/${l.kind}] ${l.description} (id: ${l.logId})`,
            );
        }
    }

    lines.push('', '## Supplements');
    if (supplementRows.length === 0) {
        lines.push('(none tracked)');
    } else {
        for (const s of supplementRows) {
            const bits: string[] = [];
            if (s.brand) bits.push(s.brand);
            if (s.servingSize) bits.push(s.servingSize);
            const meta = bits.length > 0 ? ` — ${bits.join(' · ')}` : '';
            lines.push(`- ${s.name}${meta} (id: ${s.supplementId})`);
        }
    }

    return lines.join('\n');
}
