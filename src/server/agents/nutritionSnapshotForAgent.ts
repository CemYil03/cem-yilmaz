import { asc, desc } from 'drizzle-orm';
import { foodLogEntries, mealPlanEntries, recipes, supplements } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

// Compact markdown snapshot embedded in the nutrition sub-agent's system
// prompt so it can answer common asks — "give me a snack idea", "what's
// planned tomorrow?" — without a list call. Each row keeps its id inline so
// the agent can address it in mutation tools directly.
//
// Recipes are grouped by meal type with favourites and last-made date called
// out (the two signals behind a good "something I like but haven't made
// lately" suggestion). Plan and diary are trimmed to the near horizon.
export async function nutritionSnapshotForAgent(serverRuntime: ServerRuntime): Promise<string> {
    const recipeRows = await serverRuntime.db
        .select()
        .from(recipes)
        .orderBy(desc(recipes.isFavorite), asc(recipes.mealType), asc(recipes.title));
    const planRows = await serverRuntime.db
        .select()
        .from(mealPlanEntries)
        .orderBy(asc(mealPlanEntries.date), asc(mealPlanEntries.mealType));
    const logRows = await serverRuntime.db.select().from(foodLogEntries).orderBy(desc(foodLogEntries.consumedAt)).limit(15);
    const supplementRows = await serverRuntime.db.select().from(supplements).orderBy(asc(supplements.name));

    const lines: string[] = [];

    lines.push('## Cookbook');
    if (recipeRows.length === 0) {
        lines.push('(no recipes yet)');
    } else {
        for (const r of recipeRows) {
            const bits: string[] = [];
            if (r.isFavorite) bits.push('★fav');
            if (r.rating != null) bits.push(`${r.rating}/10`);
            if (r.prepTimeMinutes != null) bits.push(`${r.prepTimeMinutes}min`);
            if (r.tags.length > 0) bits.push(r.tags.join(','));
            if (r.lastMadeAt) bits.push(`last made ${r.lastMadeAt.toISOString().slice(0, 10)}`);
            const meta = bits.length > 0 ? ` — ${bits.join(' · ')}` : '';
            lines.push(`- [${r.mealType}] ${r.title}${meta} (id: ${r.recipeId})`);
        }
    }

    lines.push('', '## Meal plan (upcoming slots)');
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
