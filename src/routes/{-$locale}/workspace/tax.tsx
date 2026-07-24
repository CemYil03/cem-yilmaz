import { createFileRoute, Link } from '@tanstack/react-router';
import {
    BriefcaseIcon,
    CalendarClockIcon,
    CheckCircle2Icon,
    ClipboardListIcon,
    FileTextIcon,
    LayoutDashboardIcon,
    PaperclipIcon,
    PencilIcon,
    PlusIcon,
    ReceiptTextIcon,
    Trash2Icon,
    WalletIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';
import { z } from 'zod';
import { formatCurrency, formatDate } from '../../../shared';
import { uploadFile } from '../../../web/chat/fileUpload';
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
import { DateField } from '../../../web/components/DateField';
import { GlassCard } from '../../../web/components/GlassCard';
import { WorkspaceUnauthorized } from '../../../web/components/WorkspaceUnauthorized';
import type {
    GqlCAdminTaxDocumentKind,
    GqlCAdminTaxDocumentStatus,
    GqlCAdminTaxExpenseCategory,
    GqlCAdminTaxFileKind,
    GqlCAdminTaxIncomeKind,
    GqlCWorkspaceTaxPageUpdatesSubscription,
    GqlCWorkspaceTaxPageUserFragment,
} from '../../../web/graphql/generated';
import {
    WorkspaceTaxDocumentsUpsertDocument,
    WorkspaceTaxExpensesDeleteDocument,
    WorkspaceTaxExpensesUpsertDocument,
    WorkspaceTaxFilesAttachDocument,
    WorkspaceTaxFilesDeleteDocument,
    WorkspaceTaxIncomeSourcesDeleteDocument,
    WorkspaceTaxIncomeSourcesUpsertDocument,
    WorkspaceTaxPageDocument,
    WorkspaceTaxPageUpdatesDocument,
    WorkspaceTaxYearsUpsertDocument,
} from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { cn } from '../../../web/utils/cn';
import type { Locale } from '../../../web/utils/locale';
import { localeFromParam } from '../../../web/utils/locale';

// Admin editor organising Cem's German tax return: a tax year holds income
// sources (one per Anlage), deductible expenses (with receipt files), and a
// document checklist. Same seed-and-subscribe posture as `/workspace/finances`:
// the loader seeds, `userUpdates` swaps state on every server push, mutations
// never re-fetch. This is an organisation tool, not a tax calculator — no
// advice. See `docs/features/workspace-tax.md`.

const title = { de: 'Steuern', en: 'Tax' };
const description = {
    de: 'Steuerjahre, Einnahmequellen, absetzbare Ausgaben mit Belegen und deine Dokument-Checkliste.',
    en: 'Tax years, income sources, deductible expenses with receipts, and your document checklist.',
};

// --- Enum labels (colocated per the media / inventory convention) -----------

const INCOME_KIND_ORDER: ReadonlyArray<GqlCAdminTaxIncomeKind> = [
    'employment',
    'selfEmployment',
    'business',
    'minijob',
    'capital',
    'other',
];
const INCOME_KIND_LABELS: Record<GqlCAdminTaxIncomeKind, { de: string; en: string }> = {
    employment: { de: 'Anstellung (Anlage N)', en: 'Employment (Anlage N)' },
    selfEmployment: { de: 'Selbstständig (Anlage S)', en: 'Self-employed (Anlage S)' },
    business: { de: 'Gewerbe (Anlage G)', en: 'Business (Anlage G)' },
    minijob: { de: 'Minijob', en: 'Minijob' },
    capital: { de: 'Kapitalerträge (Anlage KAP)', en: 'Capital (Anlage KAP)' },
    other: { de: 'Sonstiges', en: 'Other' },
};

const EXPENSE_CATEGORY_ORDER: ReadonlyArray<GqlCAdminTaxExpenseCategory> = [
    'businessExpense',
    'workRelated',
    'specialExpenses',
    'insurance',
    'extraordinary',
    'homeOffice',
    'other',
];
const EXPENSE_CATEGORY_LABELS: Record<GqlCAdminTaxExpenseCategory, { de: string; en: string }> = {
    businessExpense: { de: 'Betriebsausgaben', en: 'Business expenses' },
    workRelated: { de: 'Werbungskosten', en: 'Work-related' },
    specialExpenses: { de: 'Sonderausgaben', en: 'Special expenses' },
    insurance: { de: 'Vorsorgeaufwendungen', en: 'Insurance / provision' },
    extraordinary: { de: 'Außergewöhnliche Belastungen', en: 'Extraordinary burdens' },
    homeOffice: { de: 'Homeoffice', en: 'Home office' },
    other: { de: 'Sonstiges', en: 'Other' },
};

const DOCUMENT_KIND_LABELS: Record<GqlCAdminTaxDocumentKind, { de: string; en: string }> = {
    lohnsteuerbescheinigung: { de: 'Lohnsteuerbescheinigung', en: 'Wage tax statement' },
    euer: { de: 'Einnahmenüberschussrechnung', en: 'Income surplus statement (EÜR)' },
    minijobConfirmation: { de: 'Minijob-Nachweis', en: 'Minijob confirmation' },
    insuranceStatement: { de: 'Versicherungsnachweis', en: 'Insurance statement' },
    donationReceipt: { de: 'Spendenquittung', en: 'Donation receipt' },
    bankStatement: { de: 'Kontoauszug', en: 'Bank statement' },
    other: { de: 'Sonstiges', en: 'Other' },
};
const DOCUMENT_KIND_ORDER: ReadonlyArray<GqlCAdminTaxDocumentKind> = [
    'lohnsteuerbescheinigung',
    'euer',
    'minijobConfirmation',
    'insuranceStatement',
    'donationReceipt',
    'bankStatement',
    'other',
];

const DOCUMENT_STATUS_LABELS: Record<GqlCAdminTaxDocumentStatus, { de: string; en: string }> = {
    needed: { de: 'Benötigt', en: 'Needed' },
    received: { de: 'Erhalten', en: 'Received' },
    notApplicable: { de: 'Nicht relevant', en: 'N/A' },
};

const YEAR_STATUS_ORDER = ['open', 'collecting', 'filing', 'submitted', 'closed'] as const;
type YearStatus = (typeof YEAR_STATUS_ORDER)[number];
const YEAR_STATUS_LABELS: Record<YearStatus, { de: string; en: string }> = {
    open: { de: 'Offen', en: 'Open' },
    collecting: { de: 'Sammeln', en: 'Collecting' },
    filing: { de: 'In Abgabe', en: 'Filing' },
    submitted: { de: 'Abgegeben', en: 'Submitted' },
    closed: { de: 'Abgeschlossen', en: 'Closed' },
};

const TABS = ['overview', 'income', 'expenses', 'documents'] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, { de: string; en: string }> = {
    overview: { de: 'Übersicht', en: 'Overview' },
    income: { de: 'Einnahmen', en: 'Income' },
    expenses: { de: 'Ausgaben', en: 'Expenses' },
    documents: { de: 'Dokumente', en: 'Documents' },
};
const TAB_ICONS = {
    overview: LayoutDashboardIcon,
    income: WalletIcon,
    expenses: ReceiptTextIcon,
    documents: ClipboardListIcon,
} as const;

const taxSearchSchema = z.object({
    year: z.string().optional(),
    tab: z.enum(TABS).optional(),
    focus: z.string().optional(),
});

type TaxAdmin = NonNullable<GqlCWorkspaceTaxPageUserFragment['admin']>;
type TaxData = TaxAdmin['adminTaxFindOne'];
type YearRow = TaxData['adminTaxYearFindMany'][number];
type IncomeRow = YearRow['incomeSources'][number];
type ExpenseRow = YearRow['expenses'][number];
type DocumentRow = YearRow['documents'][number];

export const Route = createFileRoute('/{-$locale}/workspace/tax')({
    validateSearch: taxSearchSchema,
    loader: () => routeLoaderGraphqlClient(WorkspaceTaxPageDocument)(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: title[locale],
            description: description[locale],
            path: '/workspace/tax',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: TaxArea,
});

function TaxArea() {
    const locale = useLocale();
    const navigate = Route.useNavigate();
    const data = Route.useLoaderData();
    const search = Route.useSearch();
    const user = useWorkspaceTaxLiveUser(data.sessionFindOne.user);
    const admin = user?.admin;
    const tax = admin?.adminTaxFindOne;

    const [creatingYear, setCreatingYear] = useState(false);

    const years = tax?.adminTaxYearFindMany ?? [];
    // The selected year comes from the URL; default to the newest one.
    const activeYear = useMemo(() => {
        if (years.length === 0) return null;
        const requested = search.year != null ? Number.parseInt(search.year, 10) : null;
        if (requested != null && !Number.isNaN(requested)) return years.find((y) => y.year === requested) ?? years[0];
        return years[0];
    }, [years, search.year]);

    const tab: Tab = search.tab ?? 'overview';

    // Deep-link focus: assistant emits `/workspace/tax?tab=expenses&focus=<id>`.
    useEffect(() => {
        const focusId = search.focus;
        if (!focusId) return;
        const timeout = window.setTimeout(() => {
            const el = document.querySelector<HTMLElement>(`[data-row-id="${focusId}"]`);
            if (!el) {
                void navigate({ to: '/{-$locale}/workspace/tax', search: (prev) => ({ ...prev, focus: undefined }), replace: true });
                return;
            }
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.setAttribute('data-focused', 'true');
            window.setTimeout(() => {
                el.removeAttribute('data-focused');
                void navigate({ to: '/{-$locale}/workspace/tax', search: (prev) => ({ ...prev, focus: undefined }), replace: true });
            }, 1500);
        }, 100);
        return () => window.clearTimeout(timeout);
    }, [search.focus, tab, navigate]);

    if (!admin) return <WorkspaceUnauthorized locale={locale} />;
    if (!tax) return null;

    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-8xl mx-auto w-full py-12 leading-relaxed">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <p className="text-sm text-muted-foreground max-w-xl">{description[locale]}</p>
                <Button size="sm" onClick={() => setCreatingYear(true)}>
                    <PlusIcon className="size-4" />
                    {{ de: 'Neues Steuerjahr', en: 'New tax year' }[locale]}
                </Button>
            </div>

            {years.length === 0 || !activeYear ? (
                <EmptyState locale={locale} onNew={() => setCreatingYear(true)} />
            ) : (
                <>
                    <YearSwitcher years={years} activeYear={activeYear.year} locale={locale} />
                    <OverviewStrip year={activeYear} locale={locale} />

                    <nav
                        className="mt-8 flex gap-1 overflow-x-auto overflow-y-hidden no-scrollbar scroll-fade-x border-b border-border/60"
                        aria-label={{ de: 'Bereich', en: 'Section' }[locale]}
                    >
                        {TABS.map((t) => {
                            const isActive = tab === t;
                            const Icon = TAB_ICONS[t];
                            return (
                                <Link
                                    key={t}
                                    to="/{-$locale}/workspace/tax"
                                    from="/{-$locale}/workspace/tax"
                                    search={(prev) => ({ ...prev, tab: t === 'overview' ? undefined : t, focus: undefined })}
                                    replace
                                    className={cn(
                                        '-mb-px flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                                        isActive
                                            ? 'border-primary text-foreground'
                                            : 'border-transparent text-muted-foreground hover:text-foreground',
                                    )}
                                    aria-current={isActive ? 'page' : undefined}
                                >
                                    <Icon className="size-4" />
                                    {TAB_LABELS[t][locale]}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="mt-6">
                        {tab === 'overview' && <OverviewTab year={activeYear} locale={locale} />}
                        {tab === 'income' && <IncomeTab year={activeYear} locale={locale} />}
                        {tab === 'expenses' && <ExpensesTab year={activeYear} locale={locale} />}
                        {tab === 'documents' && <DocumentsTab year={activeYear} locale={locale} />}
                    </div>
                </>
            )}

            {creatingYear ? (
                <NewYearDialog existingYears={years.map((y) => y.year)} locale={locale} onClose={() => setCreatingYear(false)} />
            ) : null}
        </main>
    );
}

// --- Year switcher ----------------------------------------------------------

function YearSwitcher({ years, activeYear, locale }: { years: ReadonlyArray<YearRow>; activeYear: number; locale: Locale }) {
    return (
        <nav
            className="mt-8 flex gap-1 overflow-x-auto overflow-y-hidden no-scrollbar scroll-fade-x"
            aria-label={{ de: 'Steuerjahr', en: 'Tax year' }[locale]}
        >
            {years.map((y) => {
                const isActive = y.year === activeYear;
                return (
                    <Link
                        key={y.taxYearId}
                        to="/{-$locale}/workspace/tax"
                        from="/{-$locale}/workspace/tax"
                        search={(prev) => ({ ...prev, year: String(y.year), tab: undefined, focus: undefined })}
                        replace
                        className={cn(
                            'flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                            isActive
                                ? 'border-primary bg-primary/10 text-foreground'
                                : 'border-border/60 text-muted-foreground hover:text-foreground hover:border-border',
                        )}
                        aria-current={isActive ? 'page' : undefined}
                    >
                        {y.year}
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {YEAR_STATUS_LABELS[y.status][locale]}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}

// --- Overview strip ---------------------------------------------------------

function OverviewStrip({ year, locale }: { year: YearRow; locale: Locale }) {
    const deadline = year.filingDeadline ? new Date(year.filingDeadline) : null;
    const isSubmitted = year.status === 'submitted' || year.status === 'closed';
    const daysLeft = deadline ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
    const isOverdue = daysLeft != null && daysLeft < 0 && !isSubmitted;

    return (
        <section className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            <GlassCard className={cn('px-5 py-4', isOverdue && 'border-destructive/50')}>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    <CalendarClockIcon className="size-3.5" aria-hidden />
                    {{ de: 'Abgabefrist', en: 'Filing deadline' }[locale]}
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">
                    {deadline ? (
                        formatDate(deadline, { locale, dateStyle: 'short' })
                    ) : (
                        <span className="text-base font-normal text-muted-foreground">
                            {{ de: 'Nicht gesetzt', en: 'Not set' }[locale]}
                        </span>
                    )}
                </div>
                <div className={cn('mt-1 text-xs tabular-nums', isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                    {isSubmitted
                        ? { de: 'Abgegeben ✓', en: 'Submitted ✓' }[locale]
                        : daysLeft == null
                          ? { de: 'Setze eine Frist.', en: 'Set a deadline.' }[locale]
                          : isOverdue
                            ? { de: `${-daysLeft} Tage überfällig`, en: `${-daysLeft} days overdue` }[locale]
                            : { de: `noch ${daysLeft} Tage`, en: `${daysLeft} days left` }[locale]}
                </div>
            </GlassCard>
            <GlassCard className="px-5 py-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    <WalletIcon className="size-3.5" aria-hidden />
                    {{ de: 'Einnahmen', en: 'Income' }[locale]}
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">
                    {formatCurrency(year.totalIncomeCents, { locale, maximumFractionDigits: 0 })}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                    {{ de: `${year.incomeSources.length} Quellen`, en: `${year.incomeSources.length} sources` }[locale]}
                </div>
            </GlassCard>
            <GlassCard className="px-5 py-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    <ReceiptTextIcon className="size-3.5" aria-hidden />
                    {{ de: 'Absetzbar', en: 'Deductible' }[locale]}
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">
                    {formatCurrency(year.totalDeductibleCents, { locale, maximumFractionDigits: 0 })}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                    {{ de: `${year.expenses.length} Ausgaben`, en: `${year.expenses.length} expenses` }[locale]}
                </div>
            </GlassCard>
        </section>
    );
}

// --- Overview tab -----------------------------------------------------------

function OverviewTab({ year, locale }: { year: YearRow; locale: Locale }) {
    const [, upsertYear] = useMutation(WorkspaceTaxYearsUpsertDocument);
    const receivedCount = year.documents.filter((d) => d.status === 'received').length;
    const relevantCount = year.documents.filter((d) => d.status !== 'notApplicable').length;

    const setStatus = (status: YearStatus) => {
        void upsertYear({
            taxYears: [
                {
                    taxYearId: year.taxYearId,
                    year: year.year,
                    status,
                    filingDeadline: year.filingDeadline ?? null,
                    notes: year.notes ?? null,
                },
            ],
        });
    };

    return (
        <div className="space-y-6">
            <GlassCard className="px-5 py-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{{ de: 'Status', en: 'Status' }[locale]}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                    {YEAR_STATUS_ORDER.map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => setStatus(s)}
                            className={cn(
                                'rounded-full border px-3 py-1 text-sm transition-colors',
                                year.status === s
                                    ? 'border-primary bg-primary/10 text-foreground'
                                    : 'border-border/60 text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {YEAR_STATUS_LABELS[s][locale]}
                        </button>
                    ))}
                </div>
            </GlassCard>

            <GlassCard className="px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                        <ClipboardListIcon className="size-3.5" aria-hidden />
                        {{ de: 'Checkliste', en: 'Checklist' }[locale]}
                    </div>
                    <div className="text-xs tabular-nums text-muted-foreground">
                        {receivedCount}/{relevantCount} {{ de: 'erhalten', en: 'received' }[locale]}
                    </div>
                </div>
                <ul className="mt-3 space-y-1.5">
                    {year.documents.map((doc) => (
                        <li key={doc.documentId} className="flex items-center gap-2 text-sm">
                            {doc.status === 'received' ? (
                                <CheckCircle2Icon className="size-4 text-primary shrink-0" aria-hidden />
                            ) : doc.status === 'notApplicable' ? (
                                <span className="size-4 shrink-0 rounded-full border border-border/60" aria-hidden />
                            ) : (
                                <span className="size-4 shrink-0 rounded-full border-2 border-muted-foreground/40" aria-hidden />
                            )}
                            <span
                                className={cn(
                                    doc.status === 'received' && 'text-muted-foreground line-through',
                                    doc.status === 'notApplicable' && 'text-muted-foreground/60',
                                )}
                            >
                                {doc.title}
                            </span>
                        </li>
                    ))}
                </ul>
                <Link
                    to="/{-$locale}/workspace/tax"
                    from="/{-$locale}/workspace/tax"
                    search={(prev) => ({ ...prev, tab: 'documents', focus: undefined })}
                    className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
                >
                    {{ de: 'Checkliste öffnen →', en: 'Open checklist →' }[locale]}
                </Link>
            </GlassCard>
        </div>
    );
}

// --- Income tab -------------------------------------------------------------

function IncomeTab({ year, locale }: { year: YearRow; locale: Locale }) {
    const [editing, setEditing] = useState<IncomeRow | 'new' | null>(null);
    const [deleting, setDeleting] = useState<IncomeRow | null>(null);
    const [, del] = useMutation(WorkspaceTaxIncomeSourcesDeleteDocument);

    const groups = useMemo(() => {
        const byKind = new Map<GqlCAdminTaxIncomeKind, IncomeRow[]>();
        for (const row of year.incomeSources) {
            const list = byKind.get(row.kind) ?? [];
            list.push(row);
            byKind.set(row.kind, list);
        }
        return INCOME_KIND_ORDER.flatMap((key) => {
            const list = byKind.get(key);
            return list && list.length > 0 ? [{ key, rows: list }] : [];
        });
    }, [year.incomeSources]);

    return (
        <div>
            <div className="mb-4 flex justify-end">
                <Button size="sm" variant="outline" onClick={() => setEditing('new')}>
                    <PlusIcon className="size-4" />
                    {{ de: 'Einnahmequelle', en: 'Income source' }[locale]}
                </Button>
            </div>
            {year.incomeSources.length === 0 ? (
                <SectionEmpty
                    icon={WalletIcon}
                    text={{ de: 'Noch keine Einnahmequellen erfasst.', en: 'No income sources yet.' }[locale]}
                />
            ) : (
                <div className="space-y-8">
                    {groups.map((group) => (
                        <section key={group.key}>
                            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                                <BriefcaseIcon className="size-4" aria-hidden />
                                {INCOME_KIND_LABELS[group.key][locale]}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                {group.rows.map((row) => (
                                    <GlassCard
                                        key={row.incomeSourceId}
                                        data-row-id={row.incomeSourceId}
                                        className="group px-4 py-4 data-[focused=true]:ring-2 data-[focused=true]:ring-primary transition-shadow"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-base font-semibold">{row.label}</div>
                                                {row.notes ? (
                                                    <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{row.notes}</div>
                                                ) : null}
                                            </div>
                                            <RowActions locale={locale} onEdit={() => setEditing(row)} onDelete={() => setDeleting(row)} />
                                        </div>
                                        <div className="mt-3 text-right text-sm font-semibold tabular-nums">
                                            {row.grossAmountCents != null ? (
                                                formatCurrency(row.grossAmountCents, { locale, maximumFractionDigits: 0 })
                                            ) : (
                                                <span className="text-xs font-normal text-muted-foreground">
                                                    {{ de: 'Betrag offen', en: 'Amount TBD' }[locale]}
                                                </span>
                                            )}
                                        </div>
                                    </GlassCard>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}
            {editing !== null ? (
                <IncomeDialog
                    taxYearId={year.taxYearId}
                    initial={editing === 'new' ? null : editing}
                    locale={locale}
                    onClose={() => setEditing(null)}
                />
            ) : null}
            {deleting !== null ? (
                <ConfirmDelete
                    heading={{ de: 'Einnahmequelle löschen?', en: 'Delete income source?' }[locale]}
                    body={{ de: `„${deleting.label}“ wird entfernt.`, en: `"${deleting.label}" will be removed.` }[locale]}
                    locale={locale}
                    onConfirm={async () => {
                        await del({ incomeSourceIds: [deleting.incomeSourceId] });
                        setDeleting(null);
                    }}
                    onClose={() => setDeleting(null)}
                />
            ) : null}
        </div>
    );
}

// --- Expenses tab -----------------------------------------------------------

function ExpensesTab({ year, locale }: { year: YearRow; locale: Locale }) {
    const [editing, setEditing] = useState<ExpenseRow | 'new' | null>(null);
    const [deleting, setDeleting] = useState<ExpenseRow | null>(null);
    const [, del] = useMutation(WorkspaceTaxExpensesDeleteDocument);

    const groups = useMemo(() => {
        const byCat = new Map<GqlCAdminTaxExpenseCategory, ExpenseRow[]>();
        for (const row of year.expenses) {
            const list = byCat.get(row.categoryKey) ?? [];
            list.push(row);
            byCat.set(row.categoryKey, list);
        }
        return EXPENSE_CATEGORY_ORDER.flatMap((key) => {
            const list = byCat.get(key);
            if (!list || list.length === 0) return [];
            const total = list.filter((r) => r.deductible).reduce((sum, r) => sum + r.amountCents, 0);
            return [{ key, rows: list, total }];
        });
    }, [year.expenses]);

    return (
        <div>
            <div className="mb-4 flex justify-end">
                <Button size="sm" variant="outline" onClick={() => setEditing('new')}>
                    <PlusIcon className="size-4" />
                    {{ de: 'Ausgabe', en: 'Expense' }[locale]}
                </Button>
            </div>
            {year.expenses.length === 0 ? (
                <SectionEmpty icon={ReceiptTextIcon} text={{ de: 'Noch keine Ausgaben erfasst.', en: 'No expenses yet.' }[locale]} />
            ) : (
                <div className="space-y-8">
                    {groups.map((group) => (
                        <section key={group.key}>
                            <div className="mb-3 flex items-baseline justify-between gap-3">
                                <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                                    <ReceiptTextIcon className="size-4" aria-hidden />
                                    {EXPENSE_CATEGORY_LABELS[group.key][locale]}
                                </h2>
                                <div className="text-xs tabular-nums text-muted-foreground">
                                    {formatCurrency(group.total, { locale, maximumFractionDigits: 0 })}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {group.rows.map((row) => (
                                    <ExpenseCard
                                        key={row.expenseId}
                                        expense={row}
                                        locale={locale}
                                        onEdit={() => setEditing(row)}
                                        onDelete={() => setDeleting(row)}
                                    />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}
            {editing !== null ? (
                <ExpenseDialog
                    taxYearId={year.taxYearId}
                    incomeSources={year.incomeSources}
                    initial={editing === 'new' ? null : editing}
                    locale={locale}
                    onClose={() => setEditing(null)}
                />
            ) : null}
            {deleting !== null ? (
                <ConfirmDelete
                    heading={{ de: 'Ausgabe löschen?', en: 'Delete expense?' }[locale]}
                    body={{ de: `„${deleting.description}“ wird entfernt.`, en: `"${deleting.description}" will be removed.` }[locale]}
                    locale={locale}
                    onConfirm={async () => {
                        await del({ expenseIds: [deleting.expenseId] });
                        setDeleting(null);
                    }}
                    onClose={() => setDeleting(null)}
                />
            ) : null}
        </div>
    );
}

function ExpenseCard({
    expense,
    locale,
    onEdit,
    onDelete,
}: {
    expense: ExpenseRow;
    locale: Locale;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <GlassCard
            data-row-id={expense.expenseId}
            className={cn(
                'group px-4 py-4 data-[focused=true]:ring-2 data-[focused=true]:ring-primary transition-shadow',
                !expense.deductible && 'opacity-60',
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate text-base font-semibold">
                        <span className="truncate">{expense.description}</span>
                        {!expense.deductible ? (
                            <span className="shrink-0 rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {{ de: 'nicht absetzbar', en: 'not deductible' }[locale]}
                            </span>
                        ) : null}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                        {expense.incurredOn ? formatDate(new Date(expense.incurredOn), { locale, dateStyle: 'short' }) : null}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-right text-sm font-semibold tabular-nums">
                        {formatCurrency(expense.amountCents, { locale, maximumFractionDigits: 0 })}
                    </div>
                    <RowActions locale={locale} onEdit={onEdit} onDelete={onDelete} />
                </div>
            </div>
            {expense.files.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {expense.files.map((f) => (
                        <a
                            key={f.taxFileId}
                            href={f.fileUpload.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                            <PaperclipIcon className="size-3" aria-hidden />
                            <span className="max-w-[10rem] truncate">{f.label || f.fileUpload.filename}</span>
                        </a>
                    ))}
                </div>
            ) : null}
        </GlassCard>
    );
}

// --- Documents tab ----------------------------------------------------------

function DocumentsTab({ year, locale }: { year: YearRow; locale: Locale }) {
    const [editing, setEditing] = useState<DocumentRow | 'new' | null>(null);
    const [, upsert] = useMutation(WorkspaceTaxDocumentsUpsertDocument);

    const toggleStatus = (doc: DocumentRow) => {
        const next: GqlCAdminTaxDocumentStatus = doc.status === 'received' ? 'needed' : 'received';
        void upsert({
            taxDocuments: [
                {
                    documentId: doc.documentId,
                    taxYearId: year.taxYearId,
                    kind: doc.kind,
                    title: doc.title,
                    status: next,
                    notes: doc.notes ?? null,
                },
            ],
        });
    };

    return (
        <div>
            <div className="mb-4 flex justify-end">
                <Button size="sm" variant="outline" onClick={() => setEditing('new')}>
                    <PlusIcon className="size-4" />
                    {{ de: 'Dokument', en: 'Document' }[locale]}
                </Button>
            </div>
            <div className="space-y-2">
                {year.documents.map((doc) => (
                    <GlassCard
                        key={doc.documentId}
                        data-row-id={doc.documentId}
                        className="group flex items-center gap-3 px-4 py-3 data-[focused=true]:ring-2 data-[focused=true]:ring-primary transition-shadow"
                    >
                        <button
                            type="button"
                            onClick={() => toggleStatus(doc)}
                            aria-label={{ de: 'Status umschalten', en: 'Toggle status' }[locale]}
                            className="shrink-0"
                        >
                            {doc.status === 'received' ? (
                                <CheckCircle2Icon className="size-5 text-primary" aria-hidden />
                            ) : (
                                <span className="block size-5 rounded-full border-2 border-muted-foreground/40" aria-hidden />
                            )}
                        </button>
                        <div className="min-w-0 flex-1">
                            <div
                                className={cn('truncate text-sm font-medium', doc.status === 'notApplicable' && 'text-muted-foreground/60')}
                            >
                                {doc.title}
                            </div>
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                {DOCUMENT_KIND_LABELS[doc.kind][locale]} · {DOCUMENT_STATUS_LABELS[doc.status][locale]}
                            </div>
                        </div>
                        {doc.files.length > 0 ? (
                            <div className="flex flex-wrap justify-end gap-1.5">
                                {doc.files.map((f) => (
                                    <a
                                        key={f.taxFileId}
                                        href={f.fileUpload.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                                    >
                                        <PaperclipIcon className="size-3" aria-hidden />
                                        <span className="max-w-[8rem] truncate">{f.label || f.fileUpload.filename}</span>
                                    </a>
                                ))}
                            </div>
                        ) : null}
                        <DocumentFileButton taxYearId={year.taxYearId} documentId={doc.documentId} locale={locale} />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => setEditing(doc)}
                            aria-label={{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                        >
                            <PencilIcon className="size-3.5" />
                        </Button>
                    </GlassCard>
                ))}
            </div>
            {editing !== null ? (
                <DocumentDialog
                    taxYearId={year.taxYearId}
                    initial={editing === 'new' ? null : editing}
                    locale={locale}
                    onClose={() => setEditing(null)}
                />
            ) : null}
        </div>
    );
}

function DocumentFileButton({ taxYearId, documentId, locale }: { taxYearId: string; documentId: string; locale: Locale }) {
    const [, attach] = useMutation(WorkspaceTaxFilesAttachDocument);
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const onPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        setUploading(true);
        for (const file of Array.from(files)) {
            try {
                const upload = await uploadFile(file);
                await attach({
                    inputs: [{ taxYearId, documentId, fileUploadId: upload.fileUploadId, kind: 'scan', label: null, pinned: false }],
                });
            } catch (err) {
                console.error('tax: document file upload failed', err);
            }
        }
        setUploading(false);
        if (inputRef.current) inputRef.current.value = '';
    };

    return (
        <>
            <input ref={inputRef} type="file" className="hidden" onChange={onPick} />
            <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                aria-label={{ de: 'Scan anhängen', en: 'Attach scan' }[locale]}
            >
                <PaperclipIcon className="size-3.5" />
            </Button>
        </>
    );
}

// --- Shared bits ------------------------------------------------------------

function RowActions({ locale, onEdit, onDelete }: { locale: Locale; onEdit: () => void; onDelete: () => void }) {
    return (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="size-7" onClick={onEdit} aria-label={{ de: 'Bearbeiten', en: 'Edit' }[locale]}>
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
    );
}

function SectionEmpty({ icon: Icon, text }: { icon: typeof WalletIcon; text: string }) {
    return (
        <GlassCard className="px-6 py-10 text-center">
            <Icon className="mx-auto size-8 text-muted-foreground/60" aria-hidden />
            <p className="mt-3 text-sm text-muted-foreground">{text}</p>
        </GlassCard>
    );
}

function EmptyState({ locale, onNew }: { locale: Locale; onNew: () => void }) {
    return (
        <GlassCard className="mt-10 px-6 py-12 text-center">
            <FileTextIcon className="mx-auto size-8 text-muted-foreground/60" aria-hidden />
            <h2 className="mt-3 text-base font-semibold">{{ de: 'Noch kein Steuerjahr', en: 'No tax year yet' }[locale]}</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                {
                    {
                        de: 'Lege ein Steuerjahr an — die Dokument-Checkliste (Anlage N, S/EÜR, Minijob, Vorsorge) wird automatisch vorbefüllt.',
                        en: 'Create a tax year — the document checklist (Anlage N, S/EÜR, minijob, insurance) is pre-filled automatically.',
                    }[locale]
                }
            </p>
            <Button className="mt-4" onClick={onNew}>
                <PlusIcon className="size-4" />
                {{ de: 'Steuerjahr anlegen', en: 'Create a tax year' }[locale]}
            </Button>
        </GlassCard>
    );
}

function ConfirmDelete({
    heading,
    body,
    locale,
    onConfirm,
    onClose,
}: {
    heading: string;
    body: string;
    locale: Locale;
    onConfirm: () => Promise<void>;
    onClose: () => void;
}) {
    const [submitting, setSubmitting] = useState(false);
    return (
        <AlertDialog open onOpenChange={(open) => (open ? undefined : onClose())}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{heading}</AlertDialogTitle>
                    <AlertDialogDescription>{body}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={submitting}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={async () => {
                            setSubmitting(true);
                            try {
                                await onConfirm();
                            } finally {
                                setSubmitting(false);
                            }
                        }}
                        disabled={submitting}
                    >
                        {{ de: 'Löschen', en: 'Delete' }[locale]}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
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

// --- Dialogs ----------------------------------------------------------------

function NewYearDialog({ existingYears, locale, onClose }: { existingYears: number[]; locale: Locale; onClose: () => void }) {
    const [, upsert] = useMutation(WorkspaceTaxYearsUpsertDocument);
    const navigate = Route.useNavigate();
    const defaultYear = new Date().getFullYear() - 1;
    const [yearText, setYearText] = useState(String(defaultYear));
    const [deadline, setDeadline] = useState(`${defaultYear + 1}-07-31`);
    const [submitting, setSubmitting] = useState(false);

    const year = Number.parseInt(yearText, 10);
    const isDuplicate = existingYears.includes(year);
    const canSave = Number.isInteger(year) && year > 2000 && year < 2100 && !isDuplicate;

    const submit = async () => {
        if (!canSave) return;
        setSubmitting(true);
        try {
            const result = await upsert({ taxYears: [{ year, status: 'open', filingDeadline: deadline || null, notes: null }] });
            if (result.error) return;
            onClose();
            void navigate({ to: '/{-$locale}/workspace/tax', search: (prev) => ({ ...prev, year: String(year) }), replace: true });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{{ de: 'Neues Steuerjahr', en: 'New tax year' }[locale]}</DialogTitle>
                    <DialogDescription>
                        {
                            {
                                de: 'Die Standard-Checkliste (Anlage N, S/EÜR, Minijob, Vorsorge) wird automatisch angelegt.',
                                en: 'The default checklist (Anlage N, S/EÜR, minijob, insurance) is created automatically.',
                            }[locale]
                        }
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                    <Field label={{ de: 'Jahr', en: 'Year' }[locale]} required>
                        <Input inputMode="numeric" value={yearText} onChange={(e) => setYearText(e.target.value)} autoFocus />
                    </Field>
                    <Field label={{ de: 'Abgabefrist', en: 'Deadline' }[locale]}>
                        <DateField value={deadline} onChange={setDeadline} locale={locale} />
                    </Field>
                </div>
                {isDuplicate ? (
                    <p className="text-xs text-destructive">
                        {{ de: 'Dieses Jahr existiert bereits.', en: 'This year already exists.' }[locale]}
                    </p>
                ) : null}
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={submitting}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button onClick={submit} disabled={submitting || !canSave}>
                        {{ de: 'Anlegen', en: 'Create' }[locale]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function IncomeDialog({
    taxYearId,
    initial,
    locale,
    onClose,
}: {
    taxYearId: string;
    initial: IncomeRow | null;
    locale: Locale;
    onClose: () => void;
}) {
    const [, upsert] = useMutation(WorkspaceTaxIncomeSourcesUpsertDocument);
    const [submitting, setSubmitting] = useState(false);
    const [state, setState] = useState({
        kind: initial?.kind ?? ('employment' as GqlCAdminTaxIncomeKind),
        label: initial?.label ?? '',
        amountEuros: initial?.grossAmountCents != null ? centsToEuros(initial.grossAmountCents) : '',
        notes: initial?.notes ?? '',
    });

    const canSave = state.label.trim().length > 0;
    const submit = async () => {
        if (!canSave) return;
        setSubmitting(true);
        try {
            const result = await upsert({
                taxIncomeSources: [
                    {
                        incomeSourceId: initial?.incomeSourceId ?? null,
                        taxYearId,
                        kind: state.kind,
                        label: state.label.trim(),
                        grossAmountCents: eurosToCents(state.amountEuros),
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
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {initial
                            ? { de: 'Einnahmequelle bearbeiten', en: 'Edit income source' }[locale]
                            : { de: 'Neue Einnahmequelle', en: 'New income source' }[locale]}
                    </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={{ de: 'Art', en: 'Kind' }[locale]}>
                        <Select value={state.kind} onValueChange={(v) => setState((s) => ({ ...s, kind: v as GqlCAdminTaxIncomeKind }))}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {INCOME_KIND_ORDER.map((key) => (
                                    <SelectItem key={key} value={key}>
                                        {INCOME_KIND_LABELS[key][locale]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={{ de: 'Betrag brutto (EUR)', en: 'Gross amount (EUR)' }[locale]}>
                        <Input
                            inputMode="decimal"
                            placeholder="0.00"
                            value={state.amountEuros}
                            onChange={(e) => setState((s) => ({ ...s, amountEuros: e.target.value }))}
                        />
                    </Field>
                    <Field label={{ de: 'Bezeichnung', en: 'Label' }[locale]} required className="sm:col-span-2">
                        <Input
                            value={state.label}
                            onChange={(e) => setState((s) => ({ ...s, label: e.target.value }))}
                            autoFocus
                            placeholder="SAP – Festanstellung"
                        />
                    </Field>
                    <Field label={{ de: 'Notizen', en: 'Notes' }[locale]} className="sm:col-span-2">
                        <Textarea rows={2} value={state.notes} onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))} />
                    </Field>
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

function ExpenseDialog({
    taxYearId,
    incomeSources,
    initial,
    locale,
    onClose,
}: {
    taxYearId: string;
    incomeSources: ReadonlyArray<IncomeRow>;
    initial: ExpenseRow | null;
    locale: Locale;
    onClose: () => void;
}) {
    const [, upsert] = useMutation(WorkspaceTaxExpensesUpsertDocument);
    const [, attach] = useMutation(WorkspaceTaxFilesAttachDocument);
    const [, deleteFile] = useMutation(WorkspaceTaxFilesDeleteDocument);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const [pendingFileIds, setPendingFileIds] = useState<string[]>([]);

    const [state, setState] = useState({
        categoryKey: initial?.categoryKey ?? ('businessExpense' as GqlCAdminTaxExpenseCategory),
        description: initial?.description ?? '',
        amountEuros: initial?.amountCents != null ? centsToEuros(initial.amountCents) : '',
        incurredOn: initial?.incurredOn ?? '',
        incomeSourceId: initial?.incomeSourceId ?? null,
        deductible: initial?.deductible ?? true,
        notes: initial?.notes ?? '',
    });

    const amountCents = eurosToCents(state.amountEuros);
    const canSave = state.description.trim().length > 0 && amountCents != null && amountCents > 0;

    // On an existing expense, uploads attach straight away. On a new expense
    // (no id yet), stage the upload id and attach after the row is created.
    const onPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        setUploading(true);
        for (const file of Array.from(files)) {
            try {
                const upload = await uploadFile(file);
                if (initial) {
                    await attach({
                        inputs: [
                            {
                                taxYearId,
                                expenseId: initial.expenseId,
                                fileUploadId: upload.fileUploadId,
                                kind: 'receipt',
                                label: null,
                                pinned: false,
                            },
                        ],
                    });
                } else {
                    setPendingFileIds((prev) => [...prev, upload.fileUploadId]);
                }
            } catch (err) {
                console.error('tax: expense file upload failed', err);
            }
        }
        setUploading(false);
        if (inputRef.current) inputRef.current.value = '';
    };

    const submit = async () => {
        if (!canSave) return;
        setSubmitting(true);
        try {
            const result = await upsert({
                taxExpenses: [
                    {
                        expenseId: initial?.expenseId ?? null,
                        taxYearId,
                        incomeSourceId: state.incomeSourceId,
                        categoryKey: state.categoryKey,
                        description: state.description.trim(),
                        amountCents: amountCents,
                        incurredOn: state.incurredOn || null,
                        deductible: state.deductible,
                        notes: state.notes.trim() || null,
                    },
                ],
            });
            if (result.error) return;
            const newExpenseId = result.data?.admin.adminTaxExpensesUpsert.referenceIds?.[0];
            if (!initial && newExpenseId && pendingFileIds.length > 0) {
                await attach({
                    inputs: pendingFileIds.map((fileUploadId) => ({
                        taxYearId,
                        expenseId: newExpenseId,
                        fileUploadId,
                        kind: 'receipt' as GqlCAdminTaxFileKind,
                        label: null,
                        pinned: false,
                    })),
                });
            }
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
                        {initial
                            ? { de: 'Ausgabe bearbeiten', en: 'Edit expense' }[locale]
                            : { de: 'Neue Ausgabe', en: 'New expense' }[locale]}
                    </DialogTitle>
                    <DialogDescription>
                        {
                            {
                                de: 'Erfasse absetzbare Ausgaben und hänge den Beleg an.',
                                en: 'Record deductible expenses and attach the receipt.',
                            }[locale]
                        }
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={{ de: 'Beschreibung', en: 'Description' }[locale]} required className="sm:col-span-2">
                        <Input
                            value={state.description}
                            onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))}
                            autoFocus
                            placeholder="MacBook Pro"
                        />
                    </Field>
                    <Field label={{ de: 'Kategorie', en: 'Category' }[locale]}>
                        <Select
                            value={state.categoryKey}
                            onValueChange={(v) => setState((s) => ({ ...s, categoryKey: v as GqlCAdminTaxExpenseCategory }))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {EXPENSE_CATEGORY_ORDER.map((key) => (
                                    <SelectItem key={key} value={key}>
                                        {EXPENSE_CATEGORY_LABELS[key][locale]}
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
                    <Field label={{ de: 'Datum', en: 'Date' }[locale]}>
                        <DateField
                            value={state.incurredOn}
                            onChange={(next) => setState((s) => ({ ...s, incurredOn: next }))}
                            locale={locale}
                        />
                    </Field>
                    <Field label={{ de: 'Zugeordnete Einnahmequelle', en: 'Linked income source' }[locale]}>
                        <Select
                            value={state.incomeSourceId ?? 'none'}
                            onValueChange={(v) => setState((s) => ({ ...s, incomeSourceId: v === 'none' ? null : v }))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">{{ de: 'Keine', en: 'None' }[locale]}</SelectItem>
                                {incomeSources.map((src) => (
                                    <SelectItem key={src.incomeSourceId} value={src.incomeSourceId}>
                                        {src.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={{ de: 'Notizen', en: 'Notes' }[locale]} className="sm:col-span-2">
                        <Textarea rows={2} value={state.notes} onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))} />
                    </Field>
                    <label className="flex items-center gap-3 text-sm sm:col-span-2">
                        <Switch checked={state.deductible} onCheckedChange={(v) => setState((s) => ({ ...s, deductible: v }))} />
                        <span className="font-medium">{{ de: 'Absetzbar', en: 'Deductible' }[locale]}</span>
                    </label>
                    <div className="sm:col-span-2">
                        <input ref={inputRef} type="file" className="hidden" onChange={onPick} />
                        <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
                            <PaperclipIcon className="size-4" />
                            {uploading ? { de: 'Lädt…', en: 'Uploading…' }[locale] : { de: 'Beleg anhängen', en: 'Attach receipt' }[locale]}
                        </Button>
                        {(initial?.files.length ?? 0) + pendingFileIds.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {initial?.files.map((f) => (
                                    <span
                                        key={f.taxFileId}
                                        className="flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground"
                                    >
                                        <PaperclipIcon className="size-3" aria-hidden />
                                        <span className="max-w-[10rem] truncate">{f.label || f.fileUpload.filename}</span>
                                        <button
                                            type="button"
                                            onClick={() => void deleteFile({ taxFileIds: [f.taxFileId] })}
                                            aria-label={{ de: 'Entfernen', en: 'Remove' }[locale]}
                                            className="text-destructive/70 hover:text-destructive"
                                        >
                                            <Trash2Icon className="size-3" />
                                        </button>
                                    </span>
                                ))}
                                {pendingFileIds.map((id) => (
                                    <span
                                        key={id}
                                        className="flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground"
                                    >
                                        <PaperclipIcon className="size-3" aria-hidden />
                                        {{ de: 'Neuer Beleg', en: 'New receipt' }[locale]}
                                    </span>
                                ))}
                            </div>
                        ) : null}
                    </div>
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

function DocumentDialog({
    taxYearId,
    initial,
    locale,
    onClose,
}: {
    taxYearId: string;
    initial: DocumentRow | null;
    locale: Locale;
    onClose: () => void;
}) {
    const [, upsert] = useMutation(WorkspaceTaxDocumentsUpsertDocument);
    const [submitting, setSubmitting] = useState(false);
    const [state, setState] = useState({
        kind: initial?.kind ?? ('other' as GqlCAdminTaxDocumentKind),
        title: initial?.title ?? '',
        status: initial?.status ?? ('needed' as GqlCAdminTaxDocumentStatus),
        notes: initial?.notes ?? '',
    });

    const canSave = state.title.trim().length > 0;
    const submit = async () => {
        if (!canSave) return;
        setSubmitting(true);
        try {
            const result = await upsert({
                taxDocuments: [
                    {
                        documentId: initial?.documentId ?? null,
                        taxYearId,
                        kind: state.kind,
                        title: state.title.trim(),
                        status: state.status,
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
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {initial
                            ? { de: 'Dokument bearbeiten', en: 'Edit document' }[locale]
                            : { de: 'Neues Dokument', en: 'New document' }[locale]}
                    </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={{ de: 'Titel', en: 'Title' }[locale]} required className="sm:col-span-2">
                        <Input value={state.title} onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))} autoFocus />
                    </Field>
                    <Field label={{ de: 'Art', en: 'Kind' }[locale]}>
                        <Select value={state.kind} onValueChange={(v) => setState((s) => ({ ...s, kind: v as GqlCAdminTaxDocumentKind }))}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {DOCUMENT_KIND_ORDER.map((key) => (
                                    <SelectItem key={key} value={key}>
                                        {DOCUMENT_KIND_LABELS[key][locale]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={{ de: 'Status', en: 'Status' }[locale]}>
                        <Select
                            value={state.status}
                            onValueChange={(v) => setState((s) => ({ ...s, status: v as GqlCAdminTaxDocumentStatus }))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(['needed', 'received', 'notApplicable'] as const).map((key) => (
                                    <SelectItem key={key} value={key}>
                                        {DOCUMENT_STATUS_LABELS[key][locale]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={{ de: 'Notizen', en: 'Notes' }[locale]} className="sm:col-span-2">
                        <Textarea rows={2} value={state.notes} onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))} />
                    </Field>
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

// --- Helpers ----------------------------------------------------------------

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

// Seed-and-subscribe. Mirrors `useWorkspaceFinancesLiveUser` — imperative URQL
// because the declarative hook can deliver each event more than once under
// concurrent React.
function useWorkspaceTaxLiveUser(
    seed: GqlCWorkspaceTaxPageUserFragment | null | undefined,
): GqlCWorkspaceTaxPageUserFragment | null | undefined {
    const [user, setUser] = useState(seed);
    const client = useClient();
    useEffect(() => {
        const request = createRequest(WorkspaceTaxPageUpdatesDocument, {});
        const operation = client.executeSubscription<GqlCWorkspaceTaxPageUpdatesSubscription>(request);
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
