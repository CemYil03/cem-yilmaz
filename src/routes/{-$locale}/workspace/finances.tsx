import { createFileRoute, Link } from '@tanstack/react-router';
import { parseISO } from 'date-fns';
import type { LucideIcon } from 'lucide-react';
import {
    Building2Icon,
    CalendarClockIcon,
    CalendarRangeIcon,
    CarIcon,
    CircleDollarSignIcon,
    CodeIcon,
    HandHeartIcon,
    HeartHandshakeIcon,
    HomeIcon,
    LayersIcon,
    PencilIcon,
    PiggyBankIcon,
    PlaneIcon,
    PlusIcon,
    RepeatIcon,
    SmartphoneIcon,
    SparklesIcon,
    Trash2Icon,
    UsersIcon,
    WalletIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';
import { z } from 'zod';
import { formatCurrency, formatDateRange, formatIsoDate } from '../../../shared';
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
import { DatePicker } from '../../../web/components/base/date-picker';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../web/components/base/dialog';
import { Input } from '../../../web/components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../web/components/base/select';
import { Switch } from '../../../web/components/base/switch';
import { Textarea } from '../../../web/components/base/textarea';
import type { FinancesSankeyInputLink, FinancesSankeyInputNode } from '../../../web/components/FinancesSankey';
import { FinancesSankey } from '../../../web/components/FinancesSankey';
import { GlassCard } from '../../../web/components/GlassCard';
import { WorkspaceUnauthorized } from '../../../web/components/WorkspaceUnauthorized';
import type {
    GqlCAdminFinancesCadence,
    GqlCAdminFinancesRecurringCostCategory,
    GqlCWorkspaceFinancesPageUpdatesSubscription,
    GqlCWorkspaceFinancesPageUserFragment,
} from '../../../web/graphql/generated';
import {
    WorkspaceFinanceIncomeStreamDeleteDocument,
    WorkspaceFinanceIncomeStreamUpsertDocument,
    WorkspaceFinanceRecurringCostDeleteDocument,
    WorkspaceFinanceRecurringCostUpsertDocument,
    WorkspaceFinancesPageDocument,
    WorkspaceFinancesPageUpdatesDocument,
} from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { cn } from '../../../web/utils/cn';
import { DATE_FNS_LOCALE } from '../../../web/utils/dateFnsLocale';
import type { Locale } from '../../../web/utils/locale';
import { localeFromParam } from '../../../web/utils/locale';

// Admin editor for Cem's income streams and recurring costs. Same
// seed-and-subscribe posture as `/workspace/inventory`: the loader seeds,
// `userUpdates` swaps state on every server push, mutations never re-fetch.
// See `docs/features/workspace-finances.md`.

const title = { de: 'Finanzen', en: 'Finances' };
const description = {
    de: 'Einkommen, laufende Kosten und ein Sankey deiner Ausgaben.',
    en: 'Income, recurring costs, and a Sankey of where the money goes.',
};

const CATEGORY_ORDER: ReadonlyArray<GqlCAdminFinancesRecurringCostCategory> = [
    'housing',
    'connectivity',
    'transport',
    'insurance',
    'subscriptionsEntertainment',
    'subscriptionsWork',
    'memberships',
    'donations',
    'household',
    'savingsGeneral',
    'savingsVacation',
    'other',
];
const CATEGORY_LABELS: Record<GqlCAdminFinancesRecurringCostCategory, { de: string; en: string }> = {
    housing: { de: 'Wohnen', en: 'Housing' },
    connectivity: { de: 'Kommunikation', en: 'Connectivity' },
    transport: { de: 'Verkehr', en: 'Transport' },
    insurance: { de: 'Versicherungen', en: 'Insurance' },
    subscriptionsEntertainment: { de: 'Abos (Unterhaltung)', en: 'Subscriptions (Entertainment)' },
    subscriptionsWork: { de: 'Abos (Arbeit)', en: 'Subscriptions (Work)' },
    memberships: { de: 'Vereinsbeiträge', en: 'Memberships' },
    donations: { de: 'Spenden', en: 'Donations' },
    household: { de: 'Haushalt', en: 'Household' },
    savingsGeneral: { de: 'Sparen (Allgemein)', en: 'Savings (General)' },
    savingsVacation: { de: 'Sparen (Urlaub)', en: 'Savings (Vacation)' },
    other: { de: 'Sonstiges', en: 'Other' },
};
const CATEGORY_ICONS: Record<GqlCAdminFinancesRecurringCostCategory, LucideIcon> = {
    housing: HomeIcon,
    connectivity: SmartphoneIcon,
    transport: CarIcon,
    insurance: Building2Icon,
    subscriptionsEntertainment: SparklesIcon,
    subscriptionsWork: CodeIcon,
    memberships: UsersIcon,
    donations: HandHeartIcon,
    household: HeartHandshakeIcon,
    savingsGeneral: PiggyBankIcon,
    savingsVacation: PlaneIcon,
    other: LayersIcon,
};

const CADENCE_LABELS: Record<GqlCAdminFinancesCadence, { de: string; en: string }> = {
    monthly: { de: 'monatlich', en: 'monthly' },
    yearly: { de: 'jährlich', en: 'yearly' },
};

type PeriodFilter = 'monthly' | 'yearly';
const PERIOD_FILTERS: ReadonlyArray<PeriodFilter> = ['monthly', 'yearly'];
const PERIOD_LABELS: Record<PeriodFilter, { de: string; en: string }> = {
    monthly: { de: 'Monatlich', en: 'Monthly' },
    yearly: { de: 'Jährlich', en: 'Yearly' },
};
const PERIOD_ICONS: Record<PeriodFilter, LucideIcon> = {
    monthly: CalendarClockIcon,
    yearly: CalendarRangeIcon,
};

const financesSearchSchema = z.object({
    period: z.enum(PERIOD_FILTERS).optional(),
});

type WorkspaceFinancesAdmin = NonNullable<GqlCWorkspaceFinancesPageUserFragment['admin']>;
type FinancesData = WorkspaceFinancesAdmin['adminFinancesFindOne'];
type CostRow = FinancesData['adminFinancesRecurringCostFindMany'][number];
type IncomeRow = FinancesData['adminFinancesIncomeStreamFindMany'][number];

export const Route = createFileRoute('/{-$locale}/workspace/finances')({
    validateSearch: financesSearchSchema,
    loader: () => routeLoaderGraphqlClient(WorkspaceFinancesPageDocument)(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: title[locale],
            description: description[locale],
            path: '/workspace/finances',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: FinancesArea,
});

function FinancesArea() {
    const locale = useLocale();
    const data = Route.useLoaderData();
    const search = Route.useSearch();
    const user = useWorkspaceFinancesLiveUser(data.sessionFindOne.user);
    const admin = user?.admin;
    const finances = admin?.adminFinancesFindOne;

    const period: PeriodFilter = search.period ?? 'monthly';
    const [editingCost, setEditingCost] = useState<CostRow | 'new' | null>(null);
    const [deletingCost, setDeletingCost] = useState<CostRow | null>(null);
    const [editingIncome, setEditingIncome] = useState<IncomeRow | 'new' | null>(null);
    const [deletingIncome, setDeletingIncome] = useState<IncomeRow | null>(null);

    if (!admin) return <WorkspaceUnauthorized locale={locale} />;
    if (!finances) return null;

    const activeCosts = finances.adminFinancesRecurringCostFindMany.filter((row) => row.active);
    const incomeCents =
        period === 'yearly' ? finances.adminFinancesYearlyIncomeCentsFindOne : finances.adminFinancesMonthlyIncomeCentsFindOne;
    const expensesCents =
        period === 'yearly' ? finances.adminFinancesYearlyExpensesCentsFindOne : finances.adminFinancesMonthlyExpensesCentsFindOne;

    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-8xl mx-auto w-full py-12 leading-relaxed">
            <p className="text-sm text-muted-foreground">{description[locale]}</p>

            <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-b border-border/60">
                <PeriodChips period={period} locale={locale} />
                <Button size="sm" onClick={() => setEditingCost('new')} className="mb-1">
                    <PlusIcon className="size-4" />
                    {{ de: 'Neue Position', en: 'New cost' }[locale]}
                </Button>
            </div>

            <PeriodSummary incomeCents={incomeCents} expensesCents={expensesCents} locale={locale} />

            <section className="mt-6">
                <GlassCard className="p-4 md:p-6">
                    <SankeyView costs={activeCosts} period={period} incomeCents={incomeCents} locale={locale} />
                </GlassCard>
            </section>

            <IncomeStreamsSection
                streams={finances.adminFinancesIncomeStreamFindMany}
                period={period}
                locale={locale}
                onNew={() => setEditingIncome('new')}
                onEdit={setEditingIncome}
                onDelete={setDeletingIncome}
            />

            <div className="mt-10">
                {finances.adminFinancesRecurringCostFindMany.length === 0 ? (
                    <EmptyState locale={locale} onNew={() => setEditingCost('new')} />
                ) : (
                    <GroupedList
                        costs={finances.adminFinancesRecurringCostFindMany}
                        period={period}
                        locale={locale}
                        onEdit={setEditingCost}
                        onDelete={setDeletingCost}
                    />
                )}
            </div>

            {editingCost !== null ? (
                <EditCostDialog initial={editingCost === 'new' ? null : editingCost} locale={locale} onClose={() => setEditingCost(null)} />
            ) : null}
            {deletingCost !== null ? <DeleteCostAlert cost={deletingCost} locale={locale} onClose={() => setDeletingCost(null)} /> : null}
            {editingIncome !== null ? (
                <EditIncomeDialog
                    initial={editingIncome === 'new' ? null : editingIncome}
                    locale={locale}
                    onClose={() => setEditingIncome(null)}
                />
            ) : null}
            {deletingIncome !== null ? (
                <DeleteIncomeAlert stream={deletingIncome} locale={locale} onClose={() => setDeletingIncome(null)} />
            ) : null}
        </main>
    );
}

// --- Period summary (income + payments) ------------------------------------

function PeriodSummary({ incomeCents, expensesCents, locale }: { incomeCents: number; expensesCents: number; locale: Locale }) {
    const leftoverCents = incomeCents - expensesCents;
    const hasIncome = incomeCents > 0;
    return (
        <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            <GlassCard className="px-5 py-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{{ de: 'Einkommen', en: 'Income' }[locale]}</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">
                    {hasIncome ? (
                        formatCurrency(incomeCents, { locale, maximumFractionDigits: 0 })
                    ) : (
                        <span className="text-muted-foreground text-base font-normal">
                            {{ de: 'Keine aktiven Ströme', en: 'No active streams' }[locale]}
                        </span>
                    )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                    {!hasIncome
                        ? { de: 'Lege unten einen Einkommensstrom an.', en: 'Add an income stream below.' }[locale]
                        : leftoverCents >= 0
                          ? {
                                de: `${formatCurrency(leftoverCents, { locale, maximumFractionDigits: 0 })} übrig`,
                                en: `${formatCurrency(leftoverCents, { locale, maximumFractionDigits: 0 })} leftover`,
                            }[locale]
                          : {
                                de: `${formatCurrency(-leftoverCents, { locale, maximumFractionDigits: 0 })} über dem Einkommen`,
                                en: `${formatCurrency(-leftoverCents, { locale, maximumFractionDigits: 0 })} over income`,
                            }[locale]}
                </div>
            </GlassCard>
            <GlassCard className="px-5 py-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{{ de: 'Zahlungen', en: 'Payments' }[locale]}</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">
                    {formatCurrency(expensesCents, { locale, maximumFractionDigits: 0 })}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                    {{ de: 'Summe aller aktiven Positionen', en: 'Sum of every active cost' }[locale]}
                </div>
            </GlassCard>
        </section>
    );
}

// --- Period switcher --------------------------------------------------------

// Canonical top-of-page sub-view switcher — underlined section tabs.
// See `docs/conventions.md` — "Top-of-page sub-view switcher".
function PeriodChips({ period, locale }: { period: PeriodFilter; locale: Locale }) {
    return (
        <nav
            className="flex gap-1 overflow-x-auto overflow-y-hidden no-scrollbar scroll-fade-x"
            aria-label={{ de: 'Zeitraum', en: 'Period' }[locale]}
        >
            {PERIOD_FILTERS.map((key) => {
                const isActive = period === key;
                const Icon = PERIOD_ICONS[key];
                return (
                    <Link
                        key={key}
                        to="/{-$locale}/workspace/finances"
                        from="/{-$locale}/workspace/finances"
                        // `monthly` is the default — drop it from the URL.
                        search={(prev) => ({ ...prev, period: key === 'monthly' ? undefined : key })}
                        replace
                        className={cn(
                            '-mb-px flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                            isActive ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                        )}
                        aria-current={isActive ? 'page' : undefined}
                    >
                        <Icon className="size-4" />
                        {PERIOD_LABELS[key][locale]}
                    </Link>
                );
            })}
        </nav>
    );
}

// --- Sankey view -----------------------------------------------------------

function SankeyView({
    costs,
    period,
    incomeCents,
    locale,
}: {
    costs: ReadonlyArray<CostRow>;
    period: PeriodFilter;
    incomeCents: number;
    locale: Locale;
}) {
    const { nodes, links, totalCents } = useMemo(
        () => buildSankey(costs, period, incomeCents, locale),
        [costs, period, incomeCents, locale],
    );

    if (costs.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                {
                    {
                        de: 'Noch keine aktiven Positionen — die Übersicht erscheint, sobald du etwas anlegst.',
                        en: 'No active costs yet — the chart appears as soon as you add one.',
                    }[locale]
                }
            </p>
        );
    }

    const ariaLabel = {
        de: `Sankey-Diagramm der Ausgaben (${PERIOD_LABELS[period].de.toLowerCase()}): ${formatCurrency(totalCents, { locale, maximumFractionDigits: 0 })} verteilt auf ${costs.length} Positionen.`,
        en: `Sankey diagram of expenses (${PERIOD_LABELS[period].en.toLowerCase()}): ${formatCurrency(totalCents, { locale, maximumFractionDigits: 0 })} across ${costs.length} costs.`,
    }[locale];

    return <FinancesSankey nodes={nodes} links={links} locale={locale} ariaLabel={ariaLabel} />;
}

// --- Income streams --------------------------------------------------------

function IncomeStreamsSection({
    streams,
    period,
    locale,
    onNew,
    onEdit,
    onDelete,
}: {
    streams: ReadonlyArray<IncomeRow>;
    period: PeriodFilter;
    locale: Locale;
    onNew: () => void;
    onEdit: (stream: IncomeRow) => void;
    onDelete: (stream: IncomeRow) => void;
}) {
    const activeTotal = streams.filter((s) => s.active).reduce((sum, s) => sum + projectedCents(s, period), 0);

    return (
        <section className="mt-10" aria-labelledby="finances-income-streams">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
                <h2
                    id="finances-income-streams"
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider"
                >
                    <WalletIcon className="size-4" aria-hidden />
                    {{ de: 'Einkommensströme', en: 'Income streams' }[locale]}
                    <span className="text-xs normal-case tracking-normal">
                        {{ de: `${streams.length} Ströme`, en: `${streams.length} streams` }[locale]}
                    </span>
                </h2>
                <div className="flex items-center gap-3">
                    {streams.length > 0 ? (
                        <div className="text-xs tabular-nums text-muted-foreground">
                            {formatCurrency(activeTotal, { locale, maximumFractionDigits: 0 })} ·{' '}
                            {PERIOD_LABELS[period][locale].toLowerCase()}
                        </div>
                    ) : null}
                    <Button size="sm" variant="outline" onClick={onNew}>
                        <PlusIcon className="size-4" />
                        {{ de: 'Einkommen', en: 'Income' }[locale]}
                    </Button>
                </div>
            </div>
            {streams.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    {
                        {
                            de: 'Noch keine Einkommensströme — Gehalt, Freelance oder anderes.',
                            en: 'No income streams yet — salary, freelance, or other.',
                        }[locale]
                    }
                </p>
            ) : (
                <ul className="divide-y divide-border/60 border-y border-border/60">
                    {streams.map((stream) => (
                        <IncomeRowItem
                            key={stream.incomeStreamId}
                            stream={stream}
                            period={period}
                            locale={locale}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </ul>
            )}
        </section>
    );
}

function IncomeRowItem({
    stream,
    period,
    locale,
    onEdit,
    onDelete,
}: {
    stream: IncomeRow;
    period: PeriodFilter;
    locale: Locale;
    onEdit: (stream: IncomeRow) => void;
    onDelete: (stream: IncomeRow) => void;
}) {
    const projected = projectedCents(stream, period);
    return (
        <li className={cn('group flex items-center gap-4 py-3', !stream.active && 'opacity-60')}>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{stream.name}</span>
                    {!stream.active ? (
                        <span className="shrink-0 rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {{ de: 'Pausiert', en: 'Paused' }[locale]}
                        </span>
                    ) : null}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                        <RepeatIcon className="size-3" aria-hidden />
                        {formatCurrency(stream.amountCents, { locale, maximumFractionDigits: 0 })} ·{' '}
                        {CADENCE_LABELS[stream.cadence][locale]}
                    </span>
                    {stream.startsOn || stream.endsOn ? (
                        <span>{formatDateRange(stream.startsOn, stream.endsOn, { locale, openEnded: true })}</span>
                    ) : null}
                    {stream.notes ? <span className="truncate max-w-xs">{stream.notes}</span> : null}
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
                <div className="text-right">
                    <div className="text-base font-semibold tabular-nums">
                        {formatCurrency(projected, { locale, maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-[10px] text-muted-foreground tabular-nums">{PERIOD_LABELS[period][locale].toLowerCase()}</div>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => onEdit(stream)}
                        aria-label={{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                    >
                        <PencilIcon className="size-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive/70 hover:text-destructive"
                        onClick={() => onDelete(stream)}
                        aria-label={{ de: 'Löschen', en: 'Delete' }[locale]}
                    >
                        <Trash2Icon className="size-3.5" />
                    </Button>
                </div>
            </div>
        </li>
    );
}

// --- Grouped expense list ---------------------------------------------------

function GroupedList({
    costs,
    period,
    locale,
    onEdit,
    onDelete,
}: {
    costs: ReadonlyArray<CostRow>;
    period: PeriodFilter;
    locale: Locale;
    onEdit: (cost: CostRow) => void;
    onDelete: (cost: CostRow) => void;
}) {
    const groups = useMemo(() => {
        const byCategory = new Map<GqlCAdminFinancesRecurringCostCategory, CostRow[]>();
        for (const row of costs) {
            const list = byCategory.get(row.categoryKey) ?? [];
            list.push(row);
            byCategory.set(row.categoryKey, list);
        }
        return CATEGORY_ORDER.flatMap((key) => {
            const list = byCategory.get(key);
            if (!list || list.length === 0) return [];
            const sorted = [...list].sort((a, b) => projectedCents(b, period) - projectedCents(a, period));
            const total = sorted.filter((r) => r.active).reduce((sum, r) => sum + projectedCents(r, period), 0);
            return [{ key, costs: sorted, total }];
        });
    }, [costs, period]);

    return (
        <div className="space-y-8">
            {groups.map((group) => {
                const Icon = CATEGORY_ICONS[group.key];
                return (
                    <section key={group.key} aria-labelledby={`finances-cat-${group.key}`}>
                        <div className="mb-2 flex items-baseline justify-between gap-3">
                            <h2
                                id={`finances-cat-${group.key}`}
                                className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider"
                            >
                                <Icon className="size-4" aria-hidden />
                                {CATEGORY_LABELS[group.key][locale]}
                                <span className="text-xs normal-case tracking-normal">
                                    {{ de: `${group.costs.length} Positionen`, en: `${group.costs.length} costs` }[locale]}
                                </span>
                            </h2>
                            <div className="text-xs tabular-nums text-muted-foreground">
                                {formatCurrency(group.total, { locale, maximumFractionDigits: 0 })} ·{' '}
                                {PERIOD_LABELS[period][locale].toLowerCase()}
                            </div>
                        </div>
                        <ul className="divide-y divide-border/60 border-y border-border/60">
                            {group.costs.map((cost) => (
                                <CostRowItem
                                    key={cost.costId}
                                    cost={cost}
                                    period={period}
                                    locale={locale}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                />
                            ))}
                        </ul>
                    </section>
                );
            })}
        </div>
    );
}

function CostRowItem({
    cost,
    period,
    locale,
    onEdit,
    onDelete,
}: {
    cost: CostRow;
    period: PeriodFilter;
    locale: Locale;
    onEdit: (cost: CostRow) => void;
    onDelete: (cost: CostRow) => void;
}) {
    const projected = projectedCents(cost, period);
    return (
        <li className={cn('group flex items-center gap-4 py-3', !cost.active && 'opacity-60')}>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{cost.name}</span>
                    {!cost.active ? (
                        <span className="shrink-0 rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {{ de: 'Pausiert', en: 'Paused' }[locale]}
                        </span>
                    ) : null}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                        <RepeatIcon className="size-3" aria-hidden />
                        {formatCurrency(cost.amountCents, { locale, maximumFractionDigits: 0 })} · {CADENCE_LABELS[cost.cadence][locale]}
                    </span>
                    {cost.startsOn || cost.endsOn ? (
                        <span>{formatDateRange(cost.startsOn, cost.endsOn, { locale, openEnded: true })}</span>
                    ) : null}
                    {cost.notes ? <span className="truncate max-w-xs">{cost.notes}</span> : null}
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
                <div className="text-right">
                    <div className="text-base font-semibold tabular-nums">
                        {formatCurrency(projected, { locale, maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-[10px] text-muted-foreground tabular-nums">{PERIOD_LABELS[period][locale].toLowerCase()}</div>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => onEdit(cost)}
                        aria-label={{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                    >
                        <PencilIcon className="size-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive/70 hover:text-destructive"
                        onClick={() => onDelete(cost)}
                        aria-label={{ de: 'Löschen', en: 'Delete' }[locale]}
                    >
                        <Trash2Icon className="size-3.5" />
                    </Button>
                </div>
            </div>
        </li>
    );
}

// --- Edit dialogs -----------------------------------------------------------

type CostFormState = {
    costId: string | null;
    name: string;
    categoryKey: GqlCAdminFinancesRecurringCostCategory;
    amountEuros: string;
    cadence: GqlCAdminFinancesCadence;
    notes: string;
    active: boolean;
    startsOn: Date | undefined;
    endsOn: Date | undefined;
};

function EditCostDialog({ initial, locale, onClose }: { initial: CostRow | null; locale: Locale; onClose: () => void }) {
    const isNew = initial === null;
    const [state, setState] = useState<CostFormState>(() => ({
        costId: initial?.costId ?? null,
        name: initial?.name ?? '',
        categoryKey: initial?.categoryKey ?? 'other',
        amountEuros: initial?.amountCents != null ? centsToEuros(initial.amountCents) : '',
        cadence: initial?.cadence ?? 'monthly',
        notes: initial?.notes ?? '',
        active: initial?.active ?? true,
        startsOn: initial?.startsOn ? parseISO(initial.startsOn) : undefined,
        endsOn: initial?.endsOn ? parseISO(initial.endsOn) : undefined,
    }));
    const [, upsert] = useMutation(WorkspaceFinanceRecurringCostUpsertDocument);
    const [submitting, setSubmitting] = useState(false);

    const amountCents = eurosToCents(state.amountEuros);
    const canSave = state.name.trim().length > 0 && amountCents != null && amountCents > 0;

    const submit = async () => {
        if (!canSave) return;
        setSubmitting(true);
        try {
            const result = await upsert({
                financeRecurringCosts: [
                    {
                        costId: state.costId,
                        name: state.name.trim(),
                        categoryKey: state.categoryKey,
                        amountCents: amountCents,
                        cadence: state.cadence,
                        notes: state.notes.trim() || null,
                        active: state.active,
                        startsOn: state.startsOn ? formatIsoDate(state.startsOn) : null,
                        endsOn: state.endsOn ? formatIsoDate(state.endsOn) : null,
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
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {isNew ? { de: 'Neue Position', en: 'New cost' }[locale] : { de: 'Position bearbeiten', en: 'Edit cost' }[locale]}
                    </DialogTitle>
                    <DialogDescription>
                        {
                            {
                                de: 'Betrag pro Turnus. „Monatlich“ ist der Betrag jeden Monat, „Jährlich“ ist der Betrag einmal pro Jahr.',
                                en: 'Amount per cadence. "Monthly" means the amount every month; "Yearly" means the amount once per year.',
                            }[locale]
                        }
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={{ de: 'Name', en: 'Name' }[locale]} required>
                        <Input value={state.name} onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))} autoFocus />
                    </Field>
                    <Field label={{ de: 'Kategorie', en: 'Category' }[locale]}>
                        <Select
                            value={state.categoryKey}
                            onValueChange={(v) => setState((s) => ({ ...s, categoryKey: v as GqlCAdminFinancesRecurringCostCategory }))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORY_ORDER.map((key) => (
                                    <SelectItem key={key} value={key}>
                                        {CATEGORY_LABELS[key][locale]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={{ de: 'Betrag (EUR)', en: 'Amount (EUR)' }[locale]} required>
                        <Input
                            inputMode="decimal"
                            placeholder="0.00"
                            value={state.amountEuros}
                            onChange={(e) => setState((s) => ({ ...s, amountEuros: e.target.value }))}
                        />
                    </Field>
                    <Field label={{ de: 'Turnus', en: 'Cadence' }[locale]}>
                        <Select
                            value={state.cadence}
                            onValueChange={(v) => setState((s) => ({ ...s, cadence: v as GqlCAdminFinancesCadence }))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="monthly">{CADENCE_LABELS.monthly[locale]}</SelectItem>
                                <SelectItem value="yearly">{CADENCE_LABELS.yearly[locale]}</SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={{ de: 'Beginn', en: 'Starts on' }[locale]}>
                        <DatePicker
                            value={state.startsOn}
                            onValueChange={(d) => setState((s) => ({ ...s, startsOn: d }))}
                            locale={DATE_FNS_LOCALE[locale]}
                            captionLayout="dropdown"
                            placeholder={{ de: 'Optional', en: 'Optional' }[locale]}
                            className="w-full"
                        />
                    </Field>
                    <Field label={{ de: 'Ende', en: 'Ends on' }[locale]}>
                        <DatePicker
                            value={state.endsOn}
                            onValueChange={(d) => setState((s) => ({ ...s, endsOn: d }))}
                            locale={DATE_FNS_LOCALE[locale]}
                            captionLayout="dropdown"
                            placeholder={{ de: 'Optional', en: 'Optional' }[locale]}
                            className="w-full"
                        />
                    </Field>
                    <Field label={{ de: 'Notizen', en: 'Notes' }[locale]} className="sm:col-span-2">
                        <Textarea rows={3} value={state.notes} onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))} />
                    </Field>
                    <label className="flex items-center gap-3 text-sm sm:col-span-2">
                        <Switch checked={state.active} onCheckedChange={(v) => setState((s) => ({ ...s, active: v }))} />
                        <span>
                            <span className="font-medium">{{ de: 'Aktiv', en: 'Active' }[locale]}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                                {{ de: 'Zählt in Übersicht und Sankey', en: 'Counts toward the totals and the Sankey' }[locale]}
                            </span>
                        </span>
                    </label>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={submitting}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button onClick={submit} disabled={submitting || !canSave}>
                        {{ de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

type IncomeFormState = {
    incomeStreamId: string | null;
    name: string;
    amountEuros: string;
    cadence: GqlCAdminFinancesCadence;
    notes: string;
    active: boolean;
    startsOn: Date | undefined;
    endsOn: Date | undefined;
};

function EditIncomeDialog({ initial, locale, onClose }: { initial: IncomeRow | null; locale: Locale; onClose: () => void }) {
    const isNew = initial === null;
    const [state, setState] = useState<IncomeFormState>(() => ({
        incomeStreamId: initial?.incomeStreamId ?? null,
        name: initial?.name ?? '',
        amountEuros: initial?.amountCents != null ? centsToEuros(initial.amountCents) : '',
        cadence: initial?.cadence ?? 'monthly',
        notes: initial?.notes ?? '',
        active: initial?.active ?? true,
        startsOn: initial?.startsOn ? parseISO(initial.startsOn) : undefined,
        endsOn: initial?.endsOn ? parseISO(initial.endsOn) : undefined,
    }));
    const [, upsert] = useMutation(WorkspaceFinanceIncomeStreamUpsertDocument);
    const [submitting, setSubmitting] = useState(false);

    const amountCents = eurosToCents(state.amountEuros);
    const canSave = state.name.trim().length > 0 && amountCents != null && amountCents > 0;

    const submit = async () => {
        if (!canSave) return;
        setSubmitting(true);
        try {
            const result = await upsert({
                financeIncomeStreams: [
                    {
                        incomeStreamId: state.incomeStreamId,
                        name: state.name.trim(),
                        amountCents: amountCents,
                        cadence: state.cadence,
                        notes: state.notes.trim() || null,
                        active: state.active,
                        startsOn: state.startsOn ? formatIsoDate(state.startsOn) : null,
                        endsOn: state.endsOn ? formatIsoDate(state.endsOn) : null,
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
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {isNew
                            ? { de: 'Neuer Einkommensstrom', en: 'New income stream' }[locale]
                            : { de: 'Einkommensstrom bearbeiten', en: 'Edit income stream' }[locale]}
                    </DialogTitle>
                    <DialogDescription>
                        {
                            {
                                de: 'Betrag pro Turnus — Gehalt, Freelance, Mieteinnahmen und ähnliches.',
                                en: 'Amount per cadence — salary, freelance, rental income, and the like.',
                            }[locale]
                        }
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={{ de: 'Name', en: 'Name' }[locale]} required>
                        <Input value={state.name} onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))} autoFocus />
                    </Field>
                    <Field label={{ de: 'Betrag (EUR)', en: 'Amount (EUR)' }[locale]} required>
                        <Input
                            inputMode="decimal"
                            placeholder="0.00"
                            value={state.amountEuros}
                            onChange={(e) => setState((s) => ({ ...s, amountEuros: e.target.value }))}
                        />
                    </Field>
                    <Field label={{ de: 'Turnus', en: 'Cadence' }[locale]}>
                        <Select
                            value={state.cadence}
                            onValueChange={(v) => setState((s) => ({ ...s, cadence: v as GqlCAdminFinancesCadence }))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="monthly">{CADENCE_LABELS.monthly[locale]}</SelectItem>
                                <SelectItem value="yearly">{CADENCE_LABELS.yearly[locale]}</SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={{ de: 'Beginn', en: 'Starts on' }[locale]}>
                        <DatePicker
                            value={state.startsOn}
                            onValueChange={(d) => setState((s) => ({ ...s, startsOn: d }))}
                            locale={DATE_FNS_LOCALE[locale]}
                            captionLayout="dropdown"
                            placeholder={{ de: 'Optional', en: 'Optional' }[locale]}
                            className="w-full"
                        />
                    </Field>
                    <Field label={{ de: 'Ende', en: 'Ends on' }[locale]}>
                        <DatePicker
                            value={state.endsOn}
                            onValueChange={(d) => setState((s) => ({ ...s, endsOn: d }))}
                            locale={DATE_FNS_LOCALE[locale]}
                            captionLayout="dropdown"
                            placeholder={{ de: 'Optional', en: 'Optional' }[locale]}
                            className="w-full"
                        />
                    </Field>
                    <Field label={{ de: 'Notizen', en: 'Notes' }[locale]} className="sm:col-span-2">
                        <Textarea rows={3} value={state.notes} onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))} />
                    </Field>
                    <label className="flex items-center gap-3 text-sm sm:col-span-2">
                        <Switch checked={state.active} onCheckedChange={(v) => setState((s) => ({ ...s, active: v }))} />
                        <span>
                            <span className="font-medium">{{ de: 'Aktiv', en: 'Active' }[locale]}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                                {{ de: 'Zählt in Übersicht und Sankey', en: 'Counts toward the totals and the Sankey' }[locale]}
                            </span>
                        </span>
                    </label>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={submitting}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button onClick={submit} disabled={submitting || !canSave}>
                        {{ de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
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

// --- Delete confirmations ---------------------------------------------------

function DeleteCostAlert({ cost, locale, onClose }: { cost: CostRow; locale: Locale; onClose: () => void }) {
    const [, del] = useMutation(WorkspaceFinanceRecurringCostDeleteDocument);
    const [submitting, setSubmitting] = useState(false);
    const doDelete = async () => {
        setSubmitting(true);
        try {
            await del({ costIds: [cost.costId] });
            onClose();
        } finally {
            setSubmitting(false);
        }
    };
    return (
        <AlertDialog open onOpenChange={(open) => (open ? undefined : onClose())}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ de: 'Position löschen?', en: 'Delete this cost?' }[locale]}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {
                            {
                                de: `„${cost.name}“ wird endgültig entfernt. Alternativ kannst du sie über „Aktiv“ pausieren, damit sie in der Historie bleibt.`,
                                en: `"${cost.name}" will be removed permanently. As an alternative, uncheck "Active" to keep it in the history.`,
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

function DeleteIncomeAlert({ stream, locale, onClose }: { stream: IncomeRow; locale: Locale; onClose: () => void }) {
    const [, del] = useMutation(WorkspaceFinanceIncomeStreamDeleteDocument);
    const [submitting, setSubmitting] = useState(false);
    const doDelete = async () => {
        setSubmitting(true);
        try {
            await del({ incomeStreamIds: [stream.incomeStreamId] });
            onClose();
        } finally {
            setSubmitting(false);
        }
    };
    return (
        <AlertDialog open onOpenChange={(open) => (open ? undefined : onClose())}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ de: 'Einkommensstrom löschen?', en: 'Delete this income stream?' }[locale]}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {
                            {
                                de: `„${stream.name}“ wird endgültig entfernt. Alternativ kannst du ihn über „Aktiv“ pausieren, damit er in der Liste bleibt.`,
                                en: `"${stream.name}" will be removed permanently. As an alternative, uncheck "Active" to keep it in the list.`,
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

// --- Empty state ------------------------------------------------------------

function EmptyState({ locale, onNew }: { locale: Locale; onNew: () => void }) {
    return (
        <GlassCard className="px-6 py-10 text-center">
            <CircleDollarSignIcon className="mx-auto size-8 text-muted-foreground/60" aria-hidden />
            <h2 className="mt-3 text-base font-semibold">{{ de: 'Noch keine Positionen', en: 'Nothing tracked yet' }[locale]}</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                {
                    {
                        de: 'Erfasse Miete, Nebenkosten, Versicherungen, Abos und ähnliches — mit Betrag und Turnus. Der Rest kommt automatisch.',
                        en: 'Track rent, utilities, insurance, subscriptions, and the like — with an amount and a cadence. The rest is automatic.',
                    }[locale]
                }
            </p>
            <Button className="mt-4" onClick={onNew}>
                <PlusIcon className="size-4" />
                {{ de: 'Erste Position anlegen', en: 'Add the first cost' }[locale]}
            </Button>
        </GlassCard>
    );
}

// --- Helpers ----------------------------------------------------------------

type AmountCadenceRow = { amountCents: number; cadence: GqlCAdminFinancesCadence };

// Project a row's cents amount into the requested period.
// `amountCents` on the row is per its own `cadence`.
function projectedCents(row: AmountCadenceRow, period: PeriodFilter): number {
    if (row.cadence === period) return row.amountCents;
    if (period === 'monthly') return Math.round(row.amountCents / 12);
    return row.amountCents * 12;
}

function buildSankey(
    costs: ReadonlyArray<CostRow>,
    period: PeriodFilter,
    incomeCents: number,
    locale: Locale,
): { nodes: FinancesSankeyInputNode[]; links: FinancesSankeyInputLink[]; totalCents: number } {
    const nodes: FinancesSankeyInputNode[] = [];
    const links: FinancesSankeyInputLink[] = [];

    if (costs.length === 0) return { nodes, links, totalCents: 0 };

    const totalCents = costs.reduce((sum, row) => sum + projectedCents(row, period), 0);
    const hasIncome = incomeCents > 0;

    const incomeId = 'income';
    nodes.push({
        id: incomeId,
        kind: 'income',
        label: hasIncome ? { de: 'Einkommen', en: 'Income' }[locale] : { de: 'Ausgaben', en: 'Expenses' }[locale],
        sublabel: formatCurrency(hasIncome ? incomeCents : totalCents, { locale, maximumFractionDigits: 0 }),
    });

    const byCategory = new Map<GqlCAdminFinancesRecurringCostCategory, { total: number; rows: CostRow[] }>();
    for (const row of costs) {
        const entry = byCategory.get(row.categoryKey) ?? { total: 0, rows: [] };
        entry.total += projectedCents(row, period);
        entry.rows.push(row);
        byCategory.set(row.categoryKey, entry);
    }

    const categoriesSorted = [...byCategory.entries()].filter(([, entry]) => entry.total > 0).sort((a, b) => b[1].total - a[1].total);

    for (const [key, entry] of categoriesSorted) {
        const categoryId = `category:${key}`;
        nodes.push({
            id: categoryId,
            kind: 'category',
            label: CATEGORY_LABELS[key][locale],
            sublabel: formatCurrency(entry.total, { locale, maximumFractionDigits: 0 }),
        });
        links.push({ source: incomeId, target: categoryId, valueCents: entry.total });

        const rowsSorted = [...entry.rows].sort((a, b) => projectedCents(b, period) - projectedCents(a, period));
        for (const row of rowsSorted) {
            const itemId = `item:${row.costId}`;
            const amount = projectedCents(row, period);
            nodes.push({
                id: itemId,
                kind: 'item',
                label: row.name,
                sublabel: formatCurrency(amount, { locale, maximumFractionDigits: 0 }),
            });
            links.push({ source: categoryId, target: itemId, valueCents: amount });
        }
    }

    return { nodes, links, totalCents };
}

function centsToEuros(cents: number): string {
    return (cents / 100).toFixed(2);
}

function eurosToCents(input: string): number | null {
    const trimmed = input.trim().replace(',', '.');
    if (trimmed === '') return null;
    const parsed = Number.parseFloat(trimmed);
    if (Number.isNaN(parsed)) return null;
    return Math.round(parsed * 100);
}

// --- Live user hook ---------------------------------------------------------

// Seed-and-subscribe. Mirrors `useWorkspaceInventoryLiveUser` — imperative
// URQL because the declarative hook can deliver each event more than once
// under concurrent React.
function useWorkspaceFinancesLiveUser(
    seed: GqlCWorkspaceFinancesPageUserFragment | null | undefined,
): GqlCWorkspaceFinancesPageUserFragment | null | undefined {
    const [user, setUser] = useState(seed);

    const client = useClient();
    useEffect(() => {
        const request = createRequest(WorkspaceFinancesPageUpdatesDocument, {});
        const operation = client.executeSubscription<GqlCWorkspaceFinancesPageUpdatesSubscription>(request);
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
