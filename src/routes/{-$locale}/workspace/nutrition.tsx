import { createFileRoute, Link } from '@tanstack/react-router';
import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    CoffeeIcon,
    HeartIcon,
    Loader2Icon,
    PencilIcon,
    PlusIcon,
    SearchIcon,
    StarIcon,
    Trash2Icon,
    UtensilsCrossedIcon,
    XIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';
import { z } from 'zod';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../../../web/components/base/alert-dialog';
import { Button } from '../../../web/components/base/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../web/components/base/dialog';
import { Input } from '../../../web/components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../web/components/base/select';
import { Switch } from '../../../web/components/base/switch';
import { Textarea } from '../../../web/components/base/textarea';
import { ChipInput } from '../../../web/components/ChipInput';
import { DateField } from '../../../web/components/DateField';
import { GlassCard } from '../../../web/components/GlassCard';
import { WorkspaceUnauthorized } from '../../../web/components/WorkspaceUnauthorized';
import type {
    GqlCAdminNutritionFoodLogKind,
    GqlCAdminNutritionMealType,
    GqlCWorkspaceNutritionPageUpdatesSubscription,
    GqlCWorkspaceNutritionPageUserFragment,
} from '../../../web/graphql/generated';
import {
    WorkspaceFoodLogEntriesDeleteDocument,
    WorkspaceFoodLogEntriesUpsertDocument,
    WorkspaceMealPlanEntriesDeleteDocument,
    WorkspaceMealPlanEntriesUpsertDocument,
    WorkspaceNutritionPageDocument,
    WorkspaceNutritionPageUpdatesDocument,
    WorkspaceRecipesDeleteDocument,
    WorkspaceRecipesUpsertDocument,
    WorkspaceSupplementNutrientsReplaceDocument,
    WorkspaceSupplementResearchDocument,
    WorkspaceSupplementsDeleteDocument,
    WorkspaceSupplementsUpsertDocument,
} from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { cn } from '../../../web/utils/cn';
import { DATE_FNS_LOCALE } from '../../../web/utils/dateFnsLocale';
import type { Locale } from '../../../web/utils/locale';
import { localeFromParam } from '../../../web/utils/locale';

// Admin editor for Cem's nutrition: a cookbook, a soft weekly meal plan, and a
// food/drink diary with an end-of-week overview. Admin-only, `noindex`. The
// nutrition sub-agent writes the same rows via the same GraphQL mutations, so
// a snack suggested in chat or a meal logged by voice surfaces here
// immediately. See `docs/features/workspace-nutrition.md`.

const title = { de: 'Ernährung', en: 'Nutrition' };
const description = {
    de: 'Kochbuch, lockere Wochenplanung und Ernährungstagebuch.',
    en: 'Cookbook, soft weekly planning, and a food diary.',
};

const MEAL_TYPES: ReadonlyArray<GqlCAdminNutritionMealType> = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
const MEAL_TYPE_LABELS: Record<GqlCAdminNutritionMealType, { de: string; en: string }> = {
    breakfast: { de: 'Frühstück', en: 'Breakfast' },
    lunch: { de: 'Mittag', en: 'Lunch' },
    dinner: { de: 'Abend', en: 'Dinner' },
    snack: { de: 'Snack', en: 'Snack' },
    other: { de: 'Sonstiges', en: 'Other' },
};

// Meal types shown as plan columns and diary buckets — `other` is available in
// the recipe editor but omitted from the week grid to keep it to four columns.
const PLAN_MEAL_TYPES: ReadonlyArray<GqlCAdminNutritionMealType> = ['breakfast', 'lunch', 'dinner', 'snack'];

const FOOD_LOG_KIND_LABELS: Record<GqlCAdminNutritionFoodLogKind, { de: string; en: string }> = {
    food: { de: 'Essen', en: 'Food' },
    drink: { de: 'Getränk', en: 'Drink' },
};

// Suggestion chips for the recipe tag input. Free-form values also work — the
// column is a plain `text[]`, so these are hints, not a constraint.
const SUGGESTED_TAGS = ['high-protein', 'quick', 'vegetarian', 'vegan', 'meal-prep', 'low-carb', 'comfort', 'healthy'] as const;

type NutritionTab = 'cookbook' | 'plan' | 'diary' | 'supplements';
const TAB_ORDER: ReadonlyArray<NutritionTab> = ['cookbook', 'plan', 'diary', 'supplements'];
const TAB_LABELS: Record<NutritionTab, { de: string; en: string }> = {
    cookbook: { de: 'Kochbuch', en: 'Cookbook' },
    plan: { de: 'Wochenplan', en: 'Meal plan' },
    diary: { de: 'Tagebuch', en: 'Diary' },
    supplements: { de: 'Nahrungsergänzung', en: 'Supplements' },
};

const nutritionSearchSchema = z.object({
    tab: z.enum(TAB_ORDER).optional(),
    focus: z.string().optional(),
    // ISO date (Monday) of the visible week for plan / diary; absent = current.
    week: z.string().optional(),
});

type NutritionAdmin = NonNullable<GqlCWorkspaceNutritionPageUserFragment['admin']>;
type NutritionData = NutritionAdmin['adminNutritionFindOne'];
type RecipeRow = NutritionData['adminNutritionRecipeFindMany'][number];
type MealPlanRow = NutritionData['adminNutritionMealPlanFindMany'][number];
type FoodLogRow = NutritionData['adminNutritionFoodLogFindMany'][number];
type SupplementRow = NutritionData['adminNutritionSupplementFindMany'][number];

export const Route = createFileRoute('/{-$locale}/workspace/nutrition')({
    validateSearch: nutritionSearchSchema,
    loader: () => routeLoaderGraphqlClient(WorkspaceNutritionPageDocument)(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: title[locale],
            description: description[locale],
            path: '/workspace/nutrition',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: NutritionArea,
});

function NutritionArea() {
    const locale = useLocale();
    const data = Route.useLoaderData();
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const user = useWorkspaceNutritionLiveUser(data.sessionFindOne.user);
    const admin = user?.admin;
    const nutrition = admin?.adminNutritionFindOne;
    const tab: NutritionTab = search.tab ?? 'cookbook';

    // Deep-link focus — same shape as `medical.tsx`.
    useEffect(() => {
        const focusId = search.focus;
        if (!focusId) return;
        let cancelled = false;
        const frame = requestAnimationFrame(() => {
            if (cancelled) return;
            const el = document.querySelector<HTMLElement>(`[data-row-id="${focusId}"]`);
            if (!el) {
                void navigate({ search: (prev) => ({ ...prev, focus: undefined }), replace: true });
                return;
            }
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.setAttribute('data-focused', 'true');
            window.setTimeout(() => {
                el.removeAttribute('data-focused');
                void navigate({ search: (prev) => ({ ...prev, focus: undefined }), replace: true });
            }, 1500);
        });
        return () => {
            cancelled = true;
            cancelAnimationFrame(frame);
        };
    }, [search.focus, tab, navigate]);

    if (!admin) return <WorkspaceUnauthorized locale={locale} />;
    if (!nutrition) return null;

    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-8xl mx-auto w-full py-12 leading-relaxed">
            <p className="text-sm text-muted-foreground">{description[locale]}</p>

            <nav
                className="mt-8 flex gap-1 overflow-x-auto border-b border-border/60 no-scrollbar scroll-fade-x"
                aria-label={{ de: 'Bereiche', en: 'Sections' }[locale]}
            >
                {TAB_ORDER.map((t) => {
                    const isActive = tab === t;
                    return (
                        <Link
                            key={t}
                            to="/{-$locale}/workspace/nutrition"
                            from="/{-$locale}/workspace/nutrition"
                            search={(prev) => ({ ...prev, tab: t === 'cookbook' ? undefined : t, focus: undefined })}
                            replace
                            className={cn(
                                'inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                                isActive
                                    ? 'border-primary text-foreground'
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                            )}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            {TAB_LABELS[t][locale]}
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-8">
                {tab === 'cookbook' && <CookbookTab recipes={nutrition.adminNutritionRecipeFindMany} locale={locale} />}
                {tab === 'plan' && (
                    <PlanTab
                        entries={nutrition.adminNutritionMealPlanFindMany}
                        recipes={nutrition.adminNutritionRecipeFindMany}
                        weekParam={search.week}
                        locale={locale}
                    />
                )}
                {tab === 'diary' && <DiaryTab entries={nutrition.adminNutritionFoodLogFindMany} weekParam={search.week} locale={locale} />}
                {tab === 'supplements' && <SupplementsTab supplements={nutrition.adminNutritionSupplementFindMany} locale={locale} />}
            </div>
        </main>
    );
}

// --- Cookbook tab -----------------------------------------------------------

function CookbookTab({ recipes, locale }: { recipes: ReadonlyArray<RecipeRow>; locale: Locale }) {
    const [editing, setEditing] = useState<RecipeRow | 'new' | null>(null);
    const [deleting, setDeleting] = useState<RecipeRow | null>(null);

    const groups = useMemo(() => {
        const byMeal = new Map<GqlCAdminNutritionMealType, RecipeRow[]>();
        for (const row of recipes) {
            const list = byMeal.get(row.mealType) ?? [];
            list.push(row);
            byMeal.set(row.mealType, list);
        }
        return MEAL_TYPES.flatMap((key) => {
            const list = byMeal.get(key);
            if (!list || list.length === 0) return [];
            return [{ key, recipes: list }];
        });
    }, [recipes]);

    return (
        <div>
            <div className="flex justify-end">
                <Button size="sm" onClick={() => setEditing('new')}>
                    <PlusIcon className="size-4" />
                    {{ de: 'Neues Rezept', en: 'New recipe' }[locale]}
                </Button>
            </div>

            {recipes.length === 0 ? (
                <GlassCard className="mt-6 px-6 py-10 text-center">
                    <UtensilsCrossedIcon className="mx-auto size-8 text-muted-foreground/60" aria-hidden />
                    <h2 className="mt-3 text-base font-semibold">{{ de: 'Noch keine Rezepte', en: 'No recipes yet' }[locale]}</h2>
                    <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                        {
                            {
                                de: 'Lege dein erstes Lieblingsgericht an — oder frag deinen Assistenten nach einer Snack-Idee. Er kennt, was du magst.',
                                en: 'Add your first favourite dish — or ask the assistant for a snack idea. It knows what you like.',
                            }[locale]
                        }
                    </p>
                    <Button className="mt-4" onClick={() => setEditing('new')}>
                        <PlusIcon className="size-4" />
                        {{ de: 'Erstes Rezept', en: 'First recipe' }[locale]}
                    </Button>
                </GlassCard>
            ) : (
                <div className="mt-6 space-y-8">
                    {groups.map((group) => (
                        <section key={group.key} aria-labelledby={`recipe-meal-${group.key}`}>
                            <h2
                                id={`recipe-meal-${group.key}`}
                                className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider"
                            >
                                {MEAL_TYPE_LABELS[group.key][locale]}
                                <span className="ml-2 text-xs normal-case tracking-normal">{group.recipes.length}</span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                {group.recipes.map((recipe) => (
                                    <RecipeCard
                                        key={recipe.recipeId}
                                        recipe={recipe}
                                        locale={locale}
                                        onEdit={() => setEditing(recipe)}
                                        onDelete={() => setDeleting(recipe)}
                                    />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            {editing !== null ? (
                <EditRecipeDialog initial={editing === 'new' ? null : editing} locale={locale} onClose={() => setEditing(null)} />
            ) : null}
            {deleting !== null ? <DeleteRecipeAlert recipe={deleting} locale={locale} onClose={() => setDeleting(null)} /> : null}
        </div>
    );
}

function RecipeCard({ recipe, locale, onEdit, onDelete }: { recipe: RecipeRow; locale: Locale; onEdit: () => void; onDelete: () => void }) {
    return (
        <GlassCard
            className="group px-4 py-4 data-[focused=true]:ring-2 data-[focused=true]:ring-primary transition-shadow"
            data-row-id={recipe.recipeId}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-base font-semibold">
                        {recipe.isFavorite ? <StarIcon className="size-3.5 shrink-0 fill-amber-400 text-amber-400" aria-hidden /> : null}
                        <span className="truncate">{recipe.title}</span>
                    </div>
                    {recipe.tags.length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                            {recipe.tags.map((tag) => (
                                <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    ) : null}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={onEdit}
                        aria-label={{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                    >
                        <PencilIcon className="size-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive/70 hover:text-destructive"
                        onClick={onDelete}
                        aria-label={{ de: 'Löschen', en: 'Delete' }[locale]}
                    >
                        <Trash2Icon className="size-3.5" />
                    </Button>
                </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {recipe.rating ? <span className="tabular-nums">★ {recipe.rating}/10</span> : null}
                {recipe.prepTimeMinutes ? <span className="tabular-nums">{recipe.prepTimeMinutes} min</span> : null}
                {recipe.servings ? <span>{{ de: `${recipe.servings} Port.`, en: `${recipe.servings} servings` }[locale]}</span> : null}
                {recipe.lastMadeAt ? (
                    <span>{{ de: 'zuletzt ', en: 'last made ' }[locale] + formatDate(recipe.lastMadeAt, locale)}</span>
                ) : null}
            </div>
            {recipe.ingredients.length > 0 ? (
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{recipe.ingredients.join(', ')}</p>
            ) : null}
        </GlassCard>
    );
}

type RecipeFormState = {
    recipeId: string | null;
    title: string;
    mealType: GqlCAdminNutritionMealType;
    ingredients: string[];
    steps: string;
    tags: string[];
    isFavorite: boolean;
    rating: string;
    prepTimeMinutes: string;
    servings: string;
    sourceUrl: string;
    notes: string;
};

function EditRecipeDialog({ initial, locale, onClose }: { initial: RecipeRow | null; locale: Locale; onClose: () => void }) {
    const isNew = initial === null;
    const [state, setState] = useState<RecipeFormState>(() => ({
        recipeId: initial?.recipeId ?? null,
        title: initial?.title ?? '',
        mealType: initial?.mealType ?? 'dinner',
        ingredients: initial ? [...initial.ingredients] : [],
        steps: initial?.steps ?? '',
        tags: initial ? [...initial.tags] : [],
        isFavorite: initial?.isFavorite ?? false,
        rating: initial?.rating != null ? String(initial.rating) : '',
        prepTimeMinutes: initial?.prepTimeMinutes != null ? String(initial.prepTimeMinutes) : '',
        servings: initial?.servings != null ? String(initial.servings) : '',
        sourceUrl: initial?.sourceUrl ?? '',
        notes: initial?.notes ?? '',
    }));
    const [, upsert] = useMutation(WorkspaceRecipesUpsertDocument);
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        setSubmitting(true);
        try {
            const result = await upsert({
                recipes: [
                    {
                        recipeId: state.recipeId,
                        title: state.title.trim(),
                        mealType: state.mealType,
                        ingredients: state.ingredients,
                        steps: state.steps.trim() || null,
                        tags: state.tags,
                        isFavorite: state.isFavorite,
                        rating: parseIntOrNull(state.rating),
                        prepTimeMinutes: parseIntOrNull(state.prepTimeMinutes),
                        servings: parseIntOrNull(state.servings),
                        sourceUrl: state.sourceUrl.trim() || null,
                        notes: state.notes.trim() || null,
                    },
                ],
            });
            if (result.error) return;
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isNew ? { de: 'Neues Rezept', en: 'New recipe' }[locale] : { de: 'Rezept bearbeiten', en: 'Edit recipe' }[locale]}
                    </DialogTitle>
                    <DialogDescription>
                        {
                            {
                                de: 'Lieblingsgericht mit Zutaten, Schritten und Tags.',
                                en: 'A favourite dish with ingredients, steps, and tags.',
                            }[locale]
                        }
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={{ de: 'Titel', en: 'Title' }[locale]} required>
                        <Input value={state.title} onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))} autoFocus />
                    </Field>
                    <Field label={{ de: 'Mahlzeit', en: 'Meal' }[locale]}>
                        <Select
                            value={state.mealType}
                            onValueChange={(v) => setState((s) => ({ ...s, mealType: v as GqlCAdminNutritionMealType }))}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {MEAL_TYPES.map((key) => (
                                    <SelectItem key={key} value={key}>
                                        {MEAL_TYPE_LABELS[key][locale]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={{ de: 'Zutaten', en: 'Ingredients' }[locale]} className="sm:col-span-2">
                        <ChipInput
                            value={state.ingredients}
                            onChange={(next) => setState((s) => ({ ...s, ingredients: next }))}
                            placeholder={{ de: 'Zutat hinzufügen…', en: 'Add an ingredient…' }[locale]}
                        />
                    </Field>
                    <Field label={{ de: 'Zubereitung', en: 'Steps' }[locale]} className="sm:col-span-2">
                        <Textarea rows={4} value={state.steps} onChange={(e) => setState((s) => ({ ...s, steps: e.target.value }))} />
                    </Field>
                    <Field label={{ de: 'Tags', en: 'Tags' }[locale]} className="sm:col-span-2">
                        <ChipInput
                            value={state.tags}
                            onChange={(next) => setState((s) => ({ ...s, tags: next }))}
                            placeholder={{ de: 'Tag hinzufügen…', en: 'Add a tag…' }[locale]}
                            suggestions={SUGGESTED_TAGS}
                        />
                    </Field>
                    <Field label={{ de: 'Bewertung (1–10)', en: 'Rating (1–10)' }[locale]}>
                        <Input
                            type="number"
                            min={1}
                            max={10}
                            value={state.rating}
                            onChange={(e) => setState((s) => ({ ...s, rating: e.target.value }))}
                        />
                    </Field>
                    <Field label={{ de: 'Zubereitungszeit (min)', en: 'Prep time (min)' }[locale]}>
                        <Input
                            type="number"
                            min={0}
                            value={state.prepTimeMinutes}
                            onChange={(e) => setState((s) => ({ ...s, prepTimeMinutes: e.target.value }))}
                        />
                    </Field>
                    <Field label={{ de: 'Portionen', en: 'Servings' }[locale]}>
                        <Input
                            type="number"
                            min={0}
                            value={state.servings}
                            onChange={(e) => setState((s) => ({ ...s, servings: e.target.value }))}
                        />
                    </Field>
                    <Field label={{ de: 'Quelle (URL)', en: 'Source (URL)' }[locale]}>
                        <Input value={state.sourceUrl} onChange={(e) => setState((s) => ({ ...s, sourceUrl: e.target.value }))} />
                    </Field>
                    <label className="flex items-center gap-2 text-sm sm:col-span-2">
                        <Switch checked={state.isFavorite} onCheckedChange={(v) => setState((s) => ({ ...s, isFavorite: v }))} />
                        <HeartIcon className="size-4 text-muted-foreground" aria-hidden />
                        {{ de: 'Favorit', en: 'Favourite' }[locale]}
                    </label>
                    <Field label={{ de: 'Notizen', en: 'Notes' }[locale]} className="sm:col-span-2">
                        <Textarea rows={2} value={state.notes} onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))} />
                    </Field>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={submitting}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button onClick={submit} disabled={submitting || state.title.trim().length === 0}>
                        {{ de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DeleteRecipeAlert({ recipe, locale, onClose }: { recipe: RecipeRow; locale: Locale; onClose: () => void }) {
    const [, del] = useMutation(WorkspaceRecipesDeleteDocument);
    const [submitting, setSubmitting] = useState(false);
    const doDelete = async () => {
        setSubmitting(true);
        try {
            await del({ recipeIds: [recipe.recipeId] });
            onClose();
        } finally {
            setSubmitting(false);
        }
    };
    return (
        <AlertDialog open onOpenChange={(open) => (open ? undefined : onClose())}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ de: 'Rezept löschen?', en: 'Delete this recipe?' }[locale]}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {
                            {
                                de: `„${recipe.title}“ wird entfernt. Geplante Mahlzeiten und Tagebucheinträge bleiben als freier Text erhalten.`,
                                en: `"${recipe.title}" will be removed. Any planned meals or diary entries survive as free text.`,
                            }[locale]
                        }
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={submitting}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                    <AlertDialogAction onClick={doDelete} disabled={submitting}>
                        {{ de: 'Löschen', en: 'Delete' }[locale]}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// --- Plan tab ---------------------------------------------------------------

function PlanTab({
    entries,
    recipes,
    weekParam,
    locale,
}: {
    entries: ReadonlyArray<MealPlanRow>;
    recipes: ReadonlyArray<RecipeRow>;
    weekParam: string | undefined;
    locale: Locale;
}) {
    const weekStart = weekStartFromParam(weekParam);
    const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
    const [editing, setEditing] = useState<{ date: string; mealType: GqlCAdminNutritionMealType; entry: MealPlanRow | null } | null>(null);

    // Index entries by `date|mealType` for O(1) cell lookup.
    const byCell = useMemo(() => {
        const map = new Map<string, MealPlanRow>();
        for (const entry of entries) map.set(`${entry.date}|${entry.mealType}`, entry);
        return map;
    }, [entries]);

    return (
        <div>
            <WeekNav weekStart={weekStart} locale={locale} />
            <div className="mt-4 overflow-x-auto">
                <div className="min-w-[52rem]">
                    <div className="grid grid-cols-[7rem_repeat(4,1fr)] gap-2">
                        <div />
                        {PLAN_MEAL_TYPES.map((meal) => (
                            <div key={meal} className="px-2 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                {MEAL_TYPE_LABELS[meal][locale]}
                            </div>
                        ))}
                        {days.map((day) => {
                            const iso = dateToIso(day);
                            return (
                                <div key={iso} className="contents">
                                    <div className="flex flex-col justify-center px-2 py-3 text-sm">
                                        <span className="font-medium">{format(day, 'EEE', { locale: DATE_FNS_LOCALE[locale] })}</span>
                                        <span className="text-xs text-muted-foreground tabular-nums">
                                            {format(day, 'd MMM', { locale: DATE_FNS_LOCALE[locale] })}
                                        </span>
                                    </div>
                                    {PLAN_MEAL_TYPES.map((meal) => {
                                        const entry = byCell.get(`${iso}|${meal}`) ?? null;
                                        return (
                                            <PlanCell
                                                key={meal}
                                                entry={entry}
                                                locale={locale}
                                                onClick={() => setEditing({ date: iso, mealType: meal, entry })}
                                            />
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {editing !== null ? (
                <EditPlanCellDialog
                    date={editing.date}
                    mealType={editing.mealType}
                    entry={editing.entry}
                    recipes={recipes}
                    locale={locale}
                    onClose={() => setEditing(null)}
                />
            ) : null}
        </div>
    );
}

function PlanCell({ entry, locale, onClick }: { entry: MealPlanRow | null; locale: Locale; onClick: () => void }) {
    const label = entry ? (entry.recipe?.title ?? entry.customText ?? '') : '';
    return (
        <button
            type="button"
            onClick={onClick}
            data-row-id={entry?.entryId}
            className={cn(
                'min-h-16 rounded-md border border-dashed border-border/60 px-2 py-2 text-left text-sm transition-colors',
                'data-[focused=true]:ring-2 data-[focused=true]:ring-primary',
                entry
                    ? 'border-solid bg-primary/5 hover:bg-primary/10'
                    : 'text-muted-foreground/50 hover:border-border hover:text-muted-foreground',
            )}
        >
            {entry ? (
                <span className="line-clamp-3">{label}</span>
            ) : (
                <PlusIcon className="size-4" aria-label={{ de: 'Planen', en: 'Plan' }[locale]} />
            )}
        </button>
    );
}

function EditPlanCellDialog({
    date,
    mealType,
    entry,
    recipes,
    locale,
    onClose,
}: {
    date: string;
    mealType: GqlCAdminNutritionMealType;
    entry: MealPlanRow | null;
    recipes: ReadonlyArray<RecipeRow>;
    locale: Locale;
    onClose: () => void;
}) {
    const [recipeId, setRecipeId] = useState<string>(entry?.recipe?.recipeId ?? 'none');
    const [customText, setCustomText] = useState(entry?.customText ?? '');
    const [, upsert] = useMutation(WorkspaceMealPlanEntriesUpsertDocument);
    const [, del] = useMutation(WorkspaceMealPlanEntriesDeleteDocument);
    const [submitting, setSubmitting] = useState(false);

    // Only recipes for this meal, plus any of a different meal already chosen.
    const options = recipes.filter((r) => r.mealType === mealType || r.recipeId === recipeId);

    const submit = async () => {
        setSubmitting(true);
        try {
            const result = await upsert({
                mealPlanEntries: [
                    {
                        entryId: entry?.entryId ?? null,
                        date,
                        mealType,
                        recipeId: recipeId === 'none' ? null : recipeId,
                        customText: customText.trim() || null,
                        notes: null,
                    },
                ],
            });
            if (result.error) return;
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    const doDelete = async () => {
        if (!entry) return;
        setSubmitting(true);
        try {
            await del({ entryIds: [entry.entryId] });
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    const canSave = recipeId !== 'none' || customText.trim().length > 0;

    return (
        <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {MEAL_TYPE_LABELS[mealType][locale]} · {formatDate(date, locale)}
                    </DialogTitle>
                    <DialogDescription>
                        {{ de: 'Wähle ein Rezept oder tippe eine freie Idee.', en: 'Pick a recipe or type a free-form idea.' }[locale]}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <Field label={{ de: 'Rezept', en: 'AdminNutritionRecipe' }[locale]}>
                        <Select value={recipeId} onValueChange={setRecipeId}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">{{ de: '– freie Idee –', en: '– free idea –' }[locale]}</SelectItem>
                                {options.map((r) => (
                                    <SelectItem key={r.recipeId} value={r.recipeId}>
                                        {r.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={{ de: 'Freie Idee', en: 'Free-form idea' }[locale]}>
                        <Input
                            value={customText}
                            onChange={(e) => setCustomText(e.target.value)}
                            placeholder={{ de: 'z. B. Reste vom Vortag', en: 'e.g. leftovers' }[locale]}
                        />
                    </Field>
                </div>
                <DialogFooter className="sm:justify-between">
                    {entry ? (
                        <Button variant="ghost" className="text-destructive" onClick={doDelete} disabled={submitting}>
                            {{ de: 'Entfernen', en: 'Remove' }[locale]}
                        </Button>
                    ) : (
                        <span />
                    )}
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose} disabled={submitting}>
                            {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                        </Button>
                        <Button onClick={submit} disabled={submitting || !canSave}>
                            {{ de: 'Speichern', en: 'Save' }[locale]}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- Diary tab --------------------------------------------------------------

function DiaryTab({ entries, weekParam, locale }: { entries: ReadonlyArray<FoodLogRow>; weekParam: string | undefined; locale: Locale }) {
    const weekStart = weekStartFromParam(weekParam);
    const weekEnd = addDays(weekStart, 7);
    const [editing, setEditing] = useState<FoodLogRow | 'new' | null>(null);
    const [deleting, setDeleting] = useState<FoodLogRow | null>(null);

    const weekEntries = useMemo(
        () =>
            entries.filter((e) => {
                const at = parseISO(e.consumedAt);
                return at >= weekStart && at < weekEnd;
            }),
        [entries, weekStart, weekEnd],
    );

    const foodCount = weekEntries.filter((e) => e.kind === 'food').length;
    const drinkCount = weekEntries.filter((e) => e.kind === 'drink').length;

    // Group by calendar day, newest first.
    const byDay = useMemo(() => {
        const map = new Map<string, FoodLogRow[]>();
        for (const entry of weekEntries) {
            const key = entry.consumedAt.slice(0, 10);
            const list = map.get(key) ?? [];
            list.push(entry);
            map.set(key, list);
        }
        return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
    }, [weekEntries]);

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <WeekNav weekStart={weekStart} locale={locale} />
                <Button size="sm" onClick={() => setEditing('new')}>
                    <PlusIcon className="size-4" />
                    {{ de: 'Eintrag', en: 'Log entry' }[locale]}
                </Button>
            </div>

            <GlassCard className="mt-4 px-4 py-3 flex items-center gap-6 text-sm">
                <span className="font-medium">{{ de: 'Diese Woche', en: 'This week' }[locale]}</span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                    <UtensilsCrossedIcon className="size-4" aria-hidden />
                    {{ de: `${foodCount} Essen`, en: `${foodCount} food` }[locale]}
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                    <CoffeeIcon className="size-4" aria-hidden />
                    {{ de: `${drinkCount} Getränke`, en: `${drinkCount} drinks` }[locale]}
                </span>
            </GlassCard>

            {weekEntries.length === 0 ? (
                <GlassCard className="mt-4 px-6 py-10 text-center text-sm text-muted-foreground">
                    {{ de: 'Noch nichts für diese Woche protokolliert.', en: 'Nothing logged for this week yet.' }[locale]}
                </GlassCard>
            ) : (
                <div className="mt-4 space-y-6">
                    {byDay.map(([day, dayEntries]) => (
                        <section key={day} aria-label={formatDate(day, locale)}>
                            <h3 className="mb-2 text-sm font-medium text-muted-foreground">{formatDate(day, locale)}</h3>
                            <div className="space-y-2">
                                {dayEntries.map((entry) => (
                                    <DiaryRow
                                        key={entry.logId}
                                        entry={entry}
                                        locale={locale}
                                        onEdit={() => setEditing(entry)}
                                        onDelete={() => setDeleting(entry)}
                                    />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            {editing !== null ? (
                <EditDiaryDialog initial={editing === 'new' ? null : editing} locale={locale} onClose={() => setEditing(null)} />
            ) : null}
            {deleting !== null ? <DeleteDiaryAlert entry={deleting} locale={locale} onClose={() => setDeleting(null)} /> : null}
        </div>
    );
}

function DiaryRow({ entry, locale, onEdit, onDelete }: { entry: FoodLogRow; locale: Locale; onEdit: () => void; onDelete: () => void }) {
    return (
        <GlassCard
            className="group px-4 py-3 flex items-center gap-3 data-[focused=true]:ring-2 data-[focused=true]:ring-primary transition-shadow"
            data-row-id={entry.logId}
        >
            {entry.kind === 'drink' ? (
                <CoffeeIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            ) : (
                <UtensilsCrossedIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
                <div className="text-sm truncate">{entry.description}</div>
                <div className="text-xs text-muted-foreground">
                    {format(parseISO(entry.consumedAt), 'HH:mm', { locale: DATE_FNS_LOCALE[locale] })} ·{' '}
                    {MEAL_TYPE_LABELS[entry.mealType][locale]}
                </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={onEdit}
                    aria-label={{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                >
                    <PencilIcon className="size-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive/70 hover:text-destructive"
                    onClick={onDelete}
                    aria-label={{ de: 'Löschen', en: 'Delete' }[locale]}
                >
                    <Trash2Icon className="size-3.5" />
                </Button>
            </div>
        </GlassCard>
    );
}

type DiaryFormState = {
    logId: string | null;
    description: string;
    kind: GqlCAdminNutritionFoodLogKind;
    mealType: GqlCAdminNutritionMealType;
    date: string;
    time: string;
};

function EditDiaryDialog({ initial, locale, onClose }: { initial: FoodLogRow | null; locale: Locale; onClose: () => void }) {
    const isNew = initial === null;
    const now = initial ? parseISO(initial.consumedAt) : new Date();
    const [state, setState] = useState<DiaryFormState>(() => ({
        logId: initial?.logId ?? null,
        description: initial?.description ?? '',
        kind: initial?.kind ?? 'food',
        mealType: initial?.mealType ?? guessMealType(now),
        date: dateToIso(now),
        time: format(now, 'HH:mm'),
    }));
    const [, upsert] = useMutation(WorkspaceFoodLogEntriesUpsertDocument);
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        setSubmitting(true);
        try {
            const consumedAt = new Date(`${state.date}T${state.time || '12:00'}:00`);
            const result = await upsert({
                foodLogEntries: [
                    {
                        logId: state.logId,
                        consumedAt: consumedAt.toISOString(),
                        mealType: state.mealType,
                        kind: state.kind,
                        description: state.description.trim(),
                        recipeId: null,
                        notes: null,
                    },
                ],
            });
            if (result.error) return;
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {isNew
                            ? { de: 'Eintrag hinzufügen', en: 'Add entry' }[locale]
                            : { de: 'Eintrag bearbeiten', en: 'Edit entry' }[locale]}
                    </DialogTitle>
                    <DialogDescription>
                        {{ de: 'Was hast du gegessen oder getrunken?', en: 'What did you eat or drink?' }[locale]}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={{ de: 'Beschreibung', en: 'Description' }[locale]} required className="sm:col-span-2">
                        <Input
                            value={state.description}
                            onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))}
                            autoFocus
                        />
                    </Field>
                    <Field label={{ de: 'Art', en: 'Kind' }[locale]}>
                        <Select
                            value={state.kind}
                            onValueChange={(v) => setState((s) => ({ ...s, kind: v as GqlCAdminNutritionFoodLogKind }))}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(Object.keys(FOOD_LOG_KIND_LABELS) as GqlCAdminNutritionFoodLogKind[]).map((key) => (
                                    <SelectItem key={key} value={key}>
                                        {FOOD_LOG_KIND_LABELS[key][locale]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={{ de: 'Mahlzeit', en: 'Meal' }[locale]}>
                        <Select
                            value={state.mealType}
                            onValueChange={(v) => setState((s) => ({ ...s, mealType: v as GqlCAdminNutritionMealType }))}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {MEAL_TYPES.map((key) => (
                                    <SelectItem key={key} value={key}>
                                        {MEAL_TYPE_LABELS[key][locale]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={{ de: 'Datum', en: 'Date' }[locale]}>
                        <DateField value={state.date} onChange={(next) => setState((s) => ({ ...s, date: next }))} locale={locale} />
                    </Field>
                    <Field label={{ de: 'Uhrzeit', en: 'Time' }[locale]}>
                        <Input type="time" value={state.time} onChange={(e) => setState((s) => ({ ...s, time: e.target.value }))} />
                    </Field>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={submitting}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button onClick={submit} disabled={submitting || state.description.trim().length === 0}>
                        {{ de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DeleteDiaryAlert({ entry, locale, onClose }: { entry: FoodLogRow; locale: Locale; onClose: () => void }) {
    const [, del] = useMutation(WorkspaceFoodLogEntriesDeleteDocument);
    const [submitting, setSubmitting] = useState(false);
    const doDelete = async () => {
        setSubmitting(true);
        try {
            await del({ logIds: [entry.logId] });
            onClose();
        } finally {
            setSubmitting(false);
        }
    };
    return (
        <AlertDialog open onOpenChange={(open) => (open ? undefined : onClose())}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ de: 'Eintrag löschen?', en: 'Delete this entry?' }[locale]}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {{ de: `„${entry.description}“ wird entfernt.`, en: `"${entry.description}" will be removed.` }[locale]}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={submitting}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                    <AlertDialogAction onClick={doDelete} disabled={submitting}>
                        {{ de: 'Löschen', en: 'Delete' }[locale]}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// --- Supplements tab --------------------------------------------------------

function SupplementsTab({ supplements, locale }: { supplements: ReadonlyArray<SupplementRow>; locale: Locale }) {
    const [editing, setEditing] = useState<SupplementRow | 'new' | null>(null);
    const [deleting, setDeleting] = useState<SupplementRow | null>(null);

    return (
        <div>
            <div className="flex justify-end">
                <Button size="sm" onClick={() => setEditing('new')}>
                    <PlusIcon className="size-4" />
                    {{ de: 'Neues Präparat', en: 'New supplement' }[locale]}
                </Button>
            </div>

            {supplements.length === 0 ? (
                <GlassCard className="mt-6 px-6 py-10 text-center">
                    <PlusIcon className="mx-auto size-8 text-muted-foreground/60" aria-hidden />
                    <h2 className="mt-3 text-base font-semibold">{{ de: 'Noch keine Präparate', en: 'No supplements yet' }[locale]}</h2>
                    <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                        {
                            {
                                de: 'Trage ein Präparat ein — der Assistent recherchiert die genaue Zusammensetzung pro Portion, du prüfst und speicherst.',
                                en: 'Add a supplement — the assistant researches its exact per-serving composition, you review and save.',
                            }[locale]
                        }
                    </p>
                    <Button className="mt-4" onClick={() => setEditing('new')}>
                        <PlusIcon className="size-4" />
                        {{ de: 'Erstes Präparat', en: 'First supplement' }[locale]}
                    </Button>
                </GlassCard>
            ) : (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {supplements.map((supplement) => (
                        <SupplementCard
                            key={supplement.supplementId}
                            supplement={supplement}
                            locale={locale}
                            onEdit={() => setEditing(supplement)}
                            onDelete={() => setDeleting(supplement)}
                        />
                    ))}
                </div>
            )}

            {editing !== null ? (
                <EditSupplementDialog initial={editing === 'new' ? null : editing} locale={locale} onClose={() => setEditing(null)} />
            ) : null}
            {deleting !== null ? <DeleteSupplementAlert supplement={deleting} locale={locale} onClose={() => setDeleting(null)} /> : null}
        </div>
    );
}

function SupplementCard({
    supplement,
    locale,
    onEdit,
    onDelete,
}: {
    supplement: SupplementRow;
    locale: Locale;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <GlassCard
            className="group px-4 py-4 data-[focused=true]:ring-2 data-[focused=true]:ring-primary transition-shadow"
            data-row-id={supplement.supplementId}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-semibold">{supplement.name}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {supplement.brand ? <span className="truncate">{supplement.brand}</span> : null}
                        {supplement.servingSize ? <span>{supplement.servingSize}</span> : null}
                        {supplement.servingsPerContainer ? (
                            <span className="tabular-nums">
                                {
                                    {
                                        de: `${supplement.servingsPerContainer} Portionen`,
                                        en: `${supplement.servingsPerContainer} servings`,
                                    }[locale]
                                }
                            </span>
                        ) : null}
                    </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={onEdit}
                        aria-label={{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                    >
                        <PencilIcon className="size-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive/70 hover:text-destructive"
                        onClick={onDelete}
                        aria-label={{ de: 'Löschen', en: 'Delete' }[locale]}
                    >
                        <Trash2Icon className="size-3.5" />
                    </Button>
                </div>
            </div>

            {supplement.nutrients.length > 0 ? (
                <table className="mt-3 w-full text-xs">
                    <tbody>
                        {supplement.nutrients.map((nutrient) => (
                            <tr key={nutrient.nutrientId} className="border-t border-border/40">
                                <td className="py-1 pr-2">{nutrient.name}</td>
                                <td className="py-1 pr-2 text-right tabular-nums whitespace-nowrap">
                                    {[nutrient.amount, nutrient.unit].filter(Boolean).join(' ')}
                                </td>
                                <td className="py-1 text-right tabular-nums text-muted-foreground">
                                    {nutrient.percentDailyValue != null ? `${nutrient.percentDailyValue}%` : ''}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p className="mt-3 text-xs text-muted-foreground/70">
                    {{ de: 'Keine Zusammensetzung hinterlegt.', en: 'No composition recorded.' }[locale]}
                </p>
            )}

            {supplement.notes ? <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{supplement.notes}</p> : null}
        </GlassCard>
    );
}

// Editable nutrient row in the dialog's repeater.
type NutrientDraft = { name: string; amount: string; unit: string; percentDailyValue: string };

type SupplementFormState = {
    supplementId: string | null;
    name: string;
    brand: string;
    servingSize: string;
    servingsPerContainer: string;
    sourceUrl: string;
    notes: string;
    researchedAt: string | null;
    nutrients: NutrientDraft[];
};

function EditSupplementDialog({ initial, locale, onClose }: { initial: SupplementRow | null; locale: Locale; onClose: () => void }) {
    const isNew = initial === null;
    const [state, setState] = useState<SupplementFormState>(() => ({
        supplementId: initial?.supplementId ?? null,
        name: initial?.name ?? '',
        brand: initial?.brand ?? '',
        servingSize: initial?.servingSize ?? '',
        servingsPerContainer: initial?.servingsPerContainer != null ? String(initial.servingsPerContainer) : '',
        sourceUrl: initial?.sourceUrl ?? '',
        notes: initial?.notes ?? '',
        researchedAt: initial?.researchedAt ?? null,
        nutrients: initial
            ? initial.nutrients.map((n) => ({
                  name: n.name,
                  amount: n.amount ?? '',
                  unit: n.unit ?? '',
                  percentDailyValue: n.percentDailyValue != null ? String(n.percentDailyValue) : '',
              }))
            : [],
    }));
    const [, upsert] = useMutation(WorkspaceSupplementsUpsertDocument);
    const [, replaceNutrients] = useMutation(WorkspaceSupplementNutrientsReplaceDocument);
    const [, research] = useMutation(WorkspaceSupplementResearchDocument);
    const [submitting, setSubmitting] = useState(false);
    const [researching, setResearching] = useState(false);
    const [researchNote, setResearchNote] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);

    const runResearch = async () => {
        if (!state.name.trim()) return;
        setResearching(true);
        setResearchNote(null);
        try {
            const result = await research({ input: { name: state.name.trim(), brand: state.brand.trim() || null } });
            const data = result.data?.admin.adminNutritionSupplementResearch;
            if (result.error || !data) {
                setResearchNote({ tone: 'warn', text: { de: 'Recherche fehlgeschlagen.', en: 'Research failed.' }[locale] });
                return;
            }
            if (!data.found) {
                setResearchNote({ tone: 'warn', text: data.summary });
                return;
            }
            setState((s) => ({
                ...s,
                brand: s.brand.trim() || data.brand || s.brand,
                servingSize: data.servingSize ?? s.servingSize,
                servingsPerContainer: data.servingsPerContainer != null ? String(data.servingsPerContainer) : s.servingsPerContainer,
                sourceUrl: data.sourceUrl ?? s.sourceUrl,
                notes: data.notes ?? s.notes,
                researchedAt: new Date().toISOString(),
                nutrients: data.nutrients.map((n) => ({
                    name: n.name,
                    amount: n.amount ?? '',
                    unit: n.unit ?? '',
                    percentDailyValue: n.percentDailyValue != null ? String(n.percentDailyValue) : '',
                })),
            }));
            setResearchNote({ tone: 'ok', text: data.summary });
        } finally {
            setResearching(false);
        }
    };

    const setNutrient = (index: number, patch: Partial<NutrientDraft>) =>
        setState((s) => ({ ...s, nutrients: s.nutrients.map((n, i) => (i === index ? { ...n, ...patch } : n)) }));
    const addNutrient = () =>
        setState((s) => ({ ...s, nutrients: [...s.nutrients, { name: '', amount: '', unit: '', percentDailyValue: '' }] }));
    const removeNutrient = (index: number) => setState((s) => ({ ...s, nutrients: s.nutrients.filter((_, i) => i !== index) }));

    const submit = async () => {
        setSubmitting(true);
        try {
            const upsertResult = await upsert({
                supplements: [
                    {
                        supplementId: state.supplementId,
                        name: state.name.trim(),
                        brand: state.brand.trim() || null,
                        servingSize: state.servingSize.trim() || null,
                        servingsPerContainer: parseIntOrNull(state.servingsPerContainer),
                        sourceUrl: state.sourceUrl.trim() || null,
                        notes: state.notes.trim() || null,
                        researchedAt: state.researchedAt,
                    },
                ],
            });
            if (upsertResult.error) return;
            const supplementId = upsertResult.data?.admin.adminNutritionSupplementsUpsert.referenceIds?.[0] ?? state.supplementId;
            if (!supplementId) return;
            const nutrients = state.nutrients
                .filter((n) => n.name.trim().length > 0)
                .map((n, index) => ({
                    name: n.name.trim(),
                    amount: n.amount.trim() || null,
                    unit: n.unit.trim() || null,
                    percentDailyValue: parseIntOrNull(n.percentDailyValue),
                    sortOrder: index,
                }));
            const replaceResult = await replaceNutrients({ supplementId, nutrients });
            if (replaceResult.error) return;
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isNew
                            ? { de: 'Neues Präparat', en: 'New supplement' }[locale]
                            : { de: 'Präparat bearbeiten', en: 'Edit supplement' }[locale]}
                    </DialogTitle>
                    <DialogDescription>
                        {
                            {
                                de: 'Name eingeben, Zusammensetzung recherchieren lassen, prüfen und speichern.',
                                en: 'Enter a name, have the composition researched, review, and save.',
                            }[locale]
                        }
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={{ de: 'Name', en: 'Name' }[locale]} required>
                        <Input value={state.name} onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))} autoFocus />
                    </Field>
                    <Field label={{ de: 'Marke', en: 'Brand' }[locale]}>
                        <Input value={state.brand} onChange={(e) => setState((s) => ({ ...s, brand: e.target.value }))} />
                    </Field>
                </div>

                <div className="mt-2 flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={runResearch} disabled={researching || state.name.trim().length === 0}>
                        {researching ? <Loader2Icon className="size-4 animate-spin" /> : <SearchIcon className="size-4" />}
                        {{ de: 'Zusammensetzung recherchieren', en: 'Research composition' }[locale]}
                    </Button>
                    {researchNote ? (
                        <span
                            className={cn(
                                'text-xs',
                                researchNote.tone === 'warn' ? 'text-amber-600 dark:text-amber-500' : 'text-muted-foreground',
                            )}
                        >
                            {researchNote.text}
                        </span>
                    ) : null}
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={{ de: 'Portionsgröße', en: 'Serving size' }[locale]}>
                        <Input
                            value={state.servingSize}
                            onChange={(e) => setState((s) => ({ ...s, servingSize: e.target.value }))}
                            placeholder={{ de: 'z. B. 2 Kapseln', en: 'e.g. 2 capsules' }[locale]}
                        />
                    </Field>
                    <Field label={{ de: 'Portionen pro Packung', en: 'Servings per container' }[locale]}>
                        <Input
                            type="number"
                            min={0}
                            value={state.servingsPerContainer}
                            onChange={(e) => setState((s) => ({ ...s, servingsPerContainer: e.target.value }))}
                        />
                    </Field>
                    <Field label={{ de: 'Quelle (URL)', en: 'Source (URL)' }[locale]} className="sm:col-span-2">
                        <Input value={state.sourceUrl} onChange={(e) => setState((s) => ({ ...s, sourceUrl: e.target.value }))} />
                    </Field>
                </div>

                <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {{ de: 'Zusammensetzung pro Portion', en: 'Composition per serving' }[locale]}
                        </span>
                        <Button variant="ghost" size="sm" onClick={addNutrient}>
                            <PlusIcon className="size-3.5" />
                            {{ de: 'Zeile', en: 'Row' }[locale]}
                        </Button>
                    </div>
                    {state.nutrients.length === 0 ? (
                        <p className="text-xs text-muted-foreground/70">
                            {
                                {
                                    de: 'Noch keine Nährstoffe — recherchieren oder manuell hinzufügen.',
                                    en: 'No nutrients yet — research or add manually.',
                                }[locale]
                            }
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {state.nutrients.map((nutrient, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <Input
                                        className="flex-1"
                                        value={nutrient.name}
                                        onChange={(e) => setNutrient(index, { name: e.target.value })}
                                        placeholder={{ de: 'Nährstoff', en: 'Nutrient' }[locale]}
                                    />
                                    <Input
                                        className="w-20"
                                        value={nutrient.amount}
                                        onChange={(e) => setNutrient(index, { amount: e.target.value })}
                                        placeholder={{ de: 'Menge', en: 'Amount' }[locale]}
                                    />
                                    <Input
                                        className="w-16"
                                        value={nutrient.unit}
                                        onChange={(e) => setNutrient(index, { unit: e.target.value })}
                                        placeholder={{ de: 'Einheit', en: 'Unit' }[locale]}
                                    />
                                    <Input
                                        className="w-16"
                                        type="number"
                                        value={nutrient.percentDailyValue}
                                        onChange={(e) => setNutrient(index, { percentDailyValue: e.target.value })}
                                        placeholder="%DV"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 shrink-0 text-destructive/70 hover:text-destructive"
                                        onClick={() => removeNutrient(index)}
                                        aria-label={{ de: 'Zeile entfernen', en: 'Remove row' }[locale]}
                                    >
                                        <XIcon className="size-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <Field label={{ de: 'Notizen', en: 'Notes' }[locale]} className="mt-4">
                    <Textarea rows={2} value={state.notes} onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))} />
                </Field>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={submitting}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button onClick={submit} disabled={submitting || state.name.trim().length === 0}>
                        {{ de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DeleteSupplementAlert({ supplement, locale, onClose }: { supplement: SupplementRow; locale: Locale; onClose: () => void }) {
    const [, del] = useMutation(WorkspaceSupplementsDeleteDocument);
    const [submitting, setSubmitting] = useState(false);
    const doDelete = async () => {
        setSubmitting(true);
        try {
            await del({ supplementIds: [supplement.supplementId] });
            onClose();
        } finally {
            setSubmitting(false);
        }
    };
    return (
        <AlertDialog open onOpenChange={(open) => (open ? undefined : onClose())}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ de: 'Präparat löschen?', en: 'Delete this supplement?' }[locale]}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {
                            {
                                de: `„${supplement.name}“ und seine Zusammensetzung werden entfernt.`,
                                en: `"${supplement.name}" and its composition will be removed.`,
                            }[locale]
                        }
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={submitting}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                    <AlertDialogAction onClick={doDelete} disabled={submitting}>
                        {{ de: 'Löschen', en: 'Delete' }[locale]}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// --- Shared bits ------------------------------------------------------------

function WeekNav({ weekStart, locale }: { weekStart: Date; locale: Locale }) {
    const weekEnd = addDays(weekStart, 6);
    const label = `${format(weekStart, 'd MMM', { locale: DATE_FNS_LOCALE[locale] })} – ${format(weekEnd, 'd MMM', {
        locale: DATE_FNS_LOCALE[locale],
    })}`;
    return (
        <div className="flex items-center gap-2">
            <Link
                to="/{-$locale}/workspace/nutrition"
                from="/{-$locale}/workspace/nutrition"
                search={(prev) => ({ ...prev, week: dateToIso(addDays(weekStart, -7)) })}
                replace
                aria-label={{ de: 'Vorherige Woche', en: 'Previous week' }[locale]}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
                <ChevronLeftIcon className="size-4" />
            </Link>
            <span className="min-w-40 text-center text-sm font-medium tabular-nums">{label}</span>
            <Link
                to="/{-$locale}/workspace/nutrition"
                from="/{-$locale}/workspace/nutrition"
                search={(prev) => ({ ...prev, week: dateToIso(addDays(weekStart, 7)) })}
                replace
                aria-label={{ de: 'Nächste Woche', en: 'Next week' }[locale]}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
                <ChevronRightIcon className="size-4" />
            </Link>
        </div>
    );
}

function Field({
    label,
    required,
    children,
    className,
}: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <label className={cn('flex flex-col gap-1.5 text-sm', className)}>
            <span className="text-xs font-medium text-muted-foreground">
                {label}
                {required ? <span className="text-destructive"> *</span> : null}
            </span>
            {children}
        </label>
    );
}

// --- Helpers ----------------------------------------------------------------

function parseIntOrNull(raw: string): number | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const n = Number.parseInt(trimmed, 10);
    return Number.isFinite(n) ? n : null;
}

function dateToIso(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Monday-anchored week start. `?week=` carries a specific week's Monday; absent
// means the current week.
function weekStartFromParam(weekParam: string | undefined): Date {
    const base = weekParam ? parseISO(weekParam) : new Date();
    return startOfWeek(base, { weekStartsOn: 1 });
}

function guessMealType(at: Date): GqlCAdminNutritionMealType {
    const h = at.getHours();
    if (h < 11) return 'breakfast';
    if (h < 15) return 'lunch';
    if (h < 18) return 'snack';
    return 'dinner';
}

function formatDate(iso: string | null | undefined, locale: Locale): string {
    if (!iso) return '—';
    try {
        return format(parseISO(iso), 'PP', { locale: DATE_FNS_LOCALE[locale] });
    } catch {
        return iso;
    }
}

// --- Live user hook ---------------------------------------------------------

function useWorkspaceNutritionLiveUser(
    seed: GqlCWorkspaceNutritionPageUserFragment | null | undefined,
): GqlCWorkspaceNutritionPageUserFragment | null | undefined {
    const [user, setUser] = useState(seed);
    const client = useClient();
    useEffect(() => {
        const request = createRequest(WorkspaceNutritionPageUpdatesDocument, {});
        const operation = client.executeSubscription<GqlCWorkspaceNutritionPageUpdatesSubscription>(request);
        const { unsubscribe } = pipe(
            operation,
            subscribe((result) => {
                if (result.data) setUser(result.data.userUpdates);
            }),
        );
        return unsubscribe;
    }, [client]);
    return user;
}
