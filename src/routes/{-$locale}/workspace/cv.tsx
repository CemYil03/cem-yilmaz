import { createFileRoute } from '@tanstack/react-router';
import { format, parseISO } from 'date-fns';
import { GripVerticalIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';
import { Button } from '../../../web/components/base/button';
import { DatePicker } from '../../../web/components/base/date-picker';
import { Input } from '../../../web/components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../web/components/base/select';
import { Textarea } from '../../../web/components/base/textarea';
import { GlassCard } from '../../../web/components/GlassCard';
import type { GqlCWorkspaceCvPageUpdatesSubscription, GqlCWorkspaceCvPageUserFragment } from '../../../web/graphql/generated';
import {
    WorkspaceCvEducationReorderDocument,
    WorkspaceCvEducationsDeleteDocument,
    WorkspaceCvEducationsUpsertDocument,
    WorkspaceCvExperiencesDeleteDocument,
    WorkspaceCvExperiencesUpsertDocument,
    WorkspaceCvHobbiesDeleteDocument,
    WorkspaceCvHobbiesUpsertDocument,
    WorkspaceCvHobbyReorderDocument,
    WorkspaceCvPageDocument,
    WorkspaceCvPageUpdatesDocument,
    WorkspaceCvSkillReorderDocument,
    WorkspaceCvSkillsDeleteDocument,
    WorkspaceCvSkillsUpsertDocument,
} from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { cn } from '../../../web/utils/cn';
import { DATE_FNS_LOCALE } from '../../../web/utils/dateFnsLocale';
import type { Locale } from '../../../web/utils/locale';
import { localeFromParam } from '../../../web/utils/locale';

// Admin editor for the CV tables. The surface lives at `/workspace/cv`
// without authentication on the page itself; mutations go through
// `Mutation.admin`, gated by `guardAdminMutation` (checks `isAdmin` on the
// requesting session's `Users` row — see
// `docs/architecture/workspace-access.md`). The page is `noindex` and
// unlinked from public surfaces — visitors land here only by typing the
// URL.
//
// One section per CV entity. Each section is a list of cards plus a "new
// entry" form. The experience list is intrinsically chronological — the
// server returns it ordered by `endDate` (ongoing roles first) and
// `startDate`, so there is no drag handle. Education, skills, and hobbies
// keep manual ordering: grabbing the grip handle on a row and dragging it
// vertically commits a new `position` via the matching `cv*Reorder`
// mutation. New rows on those three are appended (position = current
// length); their final slot is set by dragging them into place afterwards.
// Skills are grouped by category on screen and drag is scoped within a
// single category (cross-category moves require editing the row's
// category field; visitor-side rendering ignores position across
// categories anyway).

const pageTitle = { de: 'Lebenslauf bearbeiten', en: 'Edit CV' };
const description = {
    de: 'Quelle für /cv und /about. Änderungen sind sofort öffentlich sichtbar.',
    en: 'Source of truth for /cv and /about. Changes go public immediately.',
};
const rowEditLabel = { de: 'Bearbeiten', en: 'Edit' };
const rowDeleteLabel = { de: 'Löschen', en: 'Delete' };
const dragHandleLabel = { de: 'Ziehen zum Sortieren', en: 'Drag to reorder' };

export const Route = createFileRoute('/{-$locale}/workspace/cv')({
    loader: () => routeLoaderGraphqlClient(WorkspaceCvPageDocument)(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: pageTitle[locale],
            description: description[locale],
            path: '/workspace/cv',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: WorkspaceCvEditor,
});

function WorkspaceCvEditor() {
    const locale = useLocale();
    const data = Route.useLoaderData();

    // Server-authoritative state: seed once from the route loader, then let
    // the `userUpdates` subscription replace it on every server push. Every
    // CV mutation already calls `serverRuntime.publish.userUpdates` server-side,
    // so we never need to re-fetch from the client.
    // See `docs/architecture/state-synchronization.md` — Seed-and-Subscribe.
    const user = useWorkspaceCvPageLiveUser(data.sessionFindOne.user);
    const cv = user?.admin?.adminCvFindOne;

    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-8xl mx-auto w-full py-12 leading-relaxed">
            <p className="text-sm text-muted-foreground">{description[locale]}</p>
            <p className="mt-2 text-xs text-muted-foreground">
                {
                    {
                        de: 'Hinweis: Schreibzugriff ist in Phase 1 offen. Der Wechsel auf GitHub OAuth folgt in Phase 2.',
                        en: 'Note: write access is open in Phase 1. GitHub OAuth follows in Phase 2.',
                    }[locale]
                }
            </p>

            <ExperienceSection rows={cv?.publicCvExperienceFindMany ?? []} locale={locale} />
            <EducationSection rows={cv?.publicCvEducationFindMany ?? []} locale={locale} />
            <SkillSection rows={cv?.publicCvSkillFindMany ?? []} locale={locale} />
            <HobbySection rows={cv?.publicCvHobbyFindMany ?? []} locale={locale} />
        </main>
    );
}

// --- Experience -------------------------------------------------------------

type WorkspaceCvAdmin = NonNullable<GqlCWorkspaceCvPageUserFragment['admin']>;
type CvData = NonNullable<WorkspaceCvAdmin['adminCvFindOne']>;
type ExperienceRow = CvData['publicCvExperienceFindMany'][number];

function ExperienceSection({ rows, locale }: { rows: ReadonlyArray<ExperienceRow>; locale: Locale }) {
    const [editing, setEditing] = useState<ExperienceRow | 'new' | null>(null);
    const [, deleteMutation] = useMutation(WorkspaceCvExperiencesDeleteDocument);

    // The server already returns experience in chronological order, but a
    // local sort guards against optimistic-write reorderings between
    // subscription pushes. Matches the server projection in
    // `cvExperienceList.ts`: ongoing first, then `endDate` desc, then
    // `startDate` desc.
    const sortedRows = useMemo(() => {
        return [...rows].sort((a, b) => {
            if (a.endDate === null && b.endDate !== null) return -1;
            if (b.endDate === null && a.endDate !== null) return 1;
            if (a.endDate !== b.endDate) return (b.endDate ?? '').localeCompare(a.endDate ?? '');
            return b.startDate.localeCompare(a.startDate);
        });
    }, [rows]);

    return (
        <section className="mt-12">
            <SectionHeader
                title={{ de: 'Berufserfahrung', en: 'Experience' }[locale]}
                addLabel={{ de: 'Stelle hinzufügen', en: 'Add experience' }[locale]}
                onAdd={() => setEditing('new')}
                disabled={editing !== null}
            />
            {editing === 'new' ? <ExperienceForm row={null} locale={locale} onClose={() => setEditing(null)} /> : null}
            <ul className="mt-4 flex flex-col gap-3">
                {sortedRows.map((row) =>
                    editing && editing !== 'new' && editing.cvExperienceId === row.cvExperienceId ? (
                        <li key={row.cvExperienceId}>
                            <ExperienceForm row={row} locale={locale} onClose={() => setEditing(null)} />
                        </li>
                    ) : (
                        <li key={row.cvExperienceId}>
                            <RowCard
                                title={`${row.roleDe} — ${row.company}`}
                                subtitle={`${row.startDate} → ${row.endDate ?? 'heute'}`}
                                onEdit={() => setEditing(row)}
                                onDelete={async () => {
                                    await deleteMutation({ cvExperienceIds: [row.cvExperienceId] });
                                }}
                                editLabel={rowEditLabel[locale]}
                                deleteLabel={rowDeleteLabel[locale]}
                            />
                        </li>
                    ),
                )}
            </ul>
        </section>
    );
}

function ExperienceForm({ row, locale, onClose }: { row: ExperienceRow | null; locale: Locale; onClose: () => void }) {
    const [, upsert] = useMutation(WorkspaceCvExperiencesUpsertDocument);
    const [form, setForm] = useState({
        roleDe: row?.roleDe ?? '',
        roleEn: row?.roleEn ?? '',
        company: row?.company ?? '',
        startDate: row?.startDate ?? '',
        endDate: row?.endDate ?? '',
        descriptionDe: row?.descriptionDe ?? '',
        descriptionEn: row?.descriptionEn ?? '',
        technologies: row?.technologies.join(', ') ?? '',
        managerName: row?.managerName ?? '',
    });
    const [busy, setBusy] = useState(false);

    return (
        <FormCard
            onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                await upsert({
                    cvExperiences: [
                        {
                            cvExperienceId: row?.cvExperienceId ?? null,
                            roleDe: form.roleDe,
                            roleEn: form.roleEn,
                            company: form.company,
                            startDate: form.startDate,
                            endDate: form.endDate || null,
                            descriptionDe: form.descriptionDe,
                            descriptionEn: form.descriptionEn,
                            technologies: form.technologies
                                .split(',')
                                .map((t) => t.trim())
                                .filter(Boolean),
                            managerName: form.managerName || null,
                        },
                    ],
                });
                setBusy(false);
                onClose();
            }}
            onCancel={onClose}
            busy={busy}
            locale={locale}
        >
            <FormGrid>
                <Field label={{ de: 'Rolle (DE)', en: 'Role (DE)' }[locale]}>
                    <Input value={form.roleDe} onChange={(e) => setForm({ ...form, roleDe: e.target.value })} required />
                </Field>
                <Field label={{ de: 'Rolle (EN)', en: 'Role (EN)' }[locale]}>
                    <Input value={form.roleEn} onChange={(e) => setForm({ ...form, roleEn: e.target.value })} required />
                </Field>
                <Field label={{ de: 'Unternehmen', en: 'Company' }[locale]}>
                    <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required />
                </Field>
                <Field label={{ de: 'Beginn', en: 'Start' }[locale]}>
                    <DateField value={form.startDate} onChange={(next) => setForm({ ...form, startDate: next })} required locale={locale} />
                </Field>
                <Field label={{ de: 'Ende (leer = heute)', en: 'End (blank = ongoing)' }[locale]}>
                    <DateField value={form.endDate} onChange={(next) => setForm({ ...form, endDate: next })} locale={locale} />
                </Field>
                <Field label={{ de: 'Beschreibung (DE)', en: 'Description (DE)' }[locale]} fullWidth>
                    <Textarea value={form.descriptionDe} onChange={(e) => setForm({ ...form, descriptionDe: e.target.value })} required />
                </Field>
                <Field label={{ de: 'Beschreibung (EN)', en: 'Description (EN)' }[locale]} fullWidth>
                    <Textarea value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} required />
                </Field>
                <Field label={{ de: 'Technologien (kommagetrennt)', en: 'Technologies (comma-separated)' }[locale]} fullWidth>
                    <Input value={form.technologies} onChange={(e) => setForm({ ...form, technologies: e.target.value })} />
                </Field>
                <Field label={{ de: 'Manager (optional)', en: 'Manager (optional)' }[locale]}>
                    <Input value={form.managerName} onChange={(e) => setForm({ ...form, managerName: e.target.value })} />
                </Field>
            </FormGrid>
        </FormCard>
    );
}

// --- Education --------------------------------------------------------------

type EducationRow = CvData['publicCvEducationFindMany'][number];

function EducationSection({ rows, locale }: { rows: ReadonlyArray<EducationRow>; locale: Locale }) {
    const [editing, setEditing] = useState<EducationRow | 'new' | null>(null);
    const [, deleteMutation] = useMutation(WorkspaceCvEducationsDeleteDocument);
    const [, reorderMutation] = useMutation(WorkspaceCvEducationReorderDocument);
    const ordered = useReorderableList(
        rows,
        (r) => r.cvEducationId,
        async (ids) => {
            await reorderMutation({ orderedIds: ids });
        },
    );

    return (
        <section className="mt-12">
            <SectionHeader
                title={{ de: 'Ausbildung', en: 'Education' }[locale]}
                addLabel={{ de: 'Ausbildung hinzufügen', en: 'Add education' }[locale]}
                onAdd={() => setEditing('new')}
                disabled={editing !== null}
            />
            {editing === 'new' ? (
                <EducationForm row={null} position={rows.length} locale={locale} onClose={() => setEditing(null)} />
            ) : null}
            <ul className="mt-4 flex flex-col gap-3">
                {ordered.items.map((row, index) =>
                    editing && editing !== 'new' && editing.cvEducationId === row.cvEducationId ? (
                        <li key={row.cvEducationId}>
                            <EducationForm row={row} position={row.position} locale={locale} onClose={() => setEditing(null)} />
                        </li>
                    ) : (
                        <DraggableItem key={row.cvEducationId} id={row.cvEducationId} index={index} state={ordered} locale={locale}>
                            <RowCard
                                title={`${row.degreeDe} · ${row.institution}`}
                                subtitle={`${row.startDate ?? '?'} → ${row.endDate}`}
                                onEdit={() => setEditing(row)}
                                onDelete={async () => {
                                    await deleteMutation({ cvEducationIds: [row.cvEducationId] });
                                }}
                                editLabel={rowEditLabel[locale]}
                                deleteLabel={rowDeleteLabel[locale]}
                            />
                        </DraggableItem>
                    ),
                )}
            </ul>
        </section>
    );
}

function EducationForm({
    row,
    position,
    locale,
    onClose,
}: {
    row: EducationRow | null;
    position: number;
    locale: Locale;
    onClose: () => void;
}) {
    const [, upsert] = useMutation(WorkspaceCvEducationsUpsertDocument);
    const [form, setForm] = useState({
        degreeDe: row?.degreeDe ?? '',
        degreeEn: row?.degreeEn ?? '',
        institution: row?.institution ?? '',
        subjectDe: row?.subjectDe ?? '',
        subjectEn: row?.subjectEn ?? '',
        startDate: row?.startDate ?? '',
        endDate: row?.endDate ?? '',
        notesDe: row?.notesDe ?? '',
        notesEn: row?.notesEn ?? '',
    });
    const [busy, setBusy] = useState(false);
    return (
        <FormCard
            onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                await upsert({
                    cvEducations: [
                        {
                            cvEducationId: row?.cvEducationId ?? null,
                            degreeDe: form.degreeDe,
                            degreeEn: form.degreeEn,
                            institution: form.institution,
                            subjectDe: form.subjectDe,
                            subjectEn: form.subjectEn,
                            startDate: form.startDate || null,
                            endDate: form.endDate,
                            notesDe: form.notesDe,
                            notesEn: form.notesEn,
                            position: row?.position ?? position,
                        },
                    ],
                });
                setBusy(false);
                onClose();
            }}
            onCancel={onClose}
            busy={busy}
            locale={locale}
        >
            <FormGrid>
                <Field label={{ de: 'Abschluss (DE)', en: 'Degree (DE)' }[locale]}>
                    <Input value={form.degreeDe} onChange={(e) => setForm({ ...form, degreeDe: e.target.value })} required />
                </Field>
                <Field label={{ de: 'Abschluss (EN)', en: 'Degree (EN)' }[locale]}>
                    <Input value={form.degreeEn} onChange={(e) => setForm({ ...form, degreeEn: e.target.value })} required />
                </Field>
                <Field label={{ de: 'Institution', en: 'Institution' }[locale]}>
                    <Input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} required />
                </Field>
                <Field label={{ de: 'Fach (DE)', en: 'Subject (DE)' }[locale]}>
                    <Input value={form.subjectDe} onChange={(e) => setForm({ ...form, subjectDe: e.target.value })} />
                </Field>
                <Field label={{ de: 'Fach (EN)', en: 'Subject (EN)' }[locale]}>
                    <Input value={form.subjectEn} onChange={(e) => setForm({ ...form, subjectEn: e.target.value })} />
                </Field>
                <Field label={{ de: 'Beginn (optional)', en: 'Start (optional)' }[locale]}>
                    <DateField value={form.startDate} onChange={(next) => setForm({ ...form, startDate: next })} locale={locale} />
                </Field>
                <Field label={{ de: 'Ende', en: 'End' }[locale]}>
                    <DateField value={form.endDate} onChange={(next) => setForm({ ...form, endDate: next })} required locale={locale} />
                </Field>
                <Field label={{ de: 'Notizen (DE)', en: 'Notes (DE)' }[locale]} fullWidth>
                    <Textarea value={form.notesDe} onChange={(e) => setForm({ ...form, notesDe: e.target.value })} />
                </Field>
                <Field label={{ de: 'Notizen (EN)', en: 'Notes (EN)' }[locale]} fullWidth>
                    <Textarea value={form.notesEn} onChange={(e) => setForm({ ...form, notesEn: e.target.value })} />
                </Field>
            </FormGrid>
        </FormCard>
    );
}

// --- Skills -----------------------------------------------------------------

type SkillRow = CvData['publicCvSkillFindMany'][number];
type SkillCategory = SkillRow['category'];

const SKILL_CATEGORIES: ReadonlyArray<SkillCategory> = ['capabilities', 'frameworks', 'services', 'tools', 'languages'];
const SKILL_CATEGORY_LABELS: Record<SkillCategory, { de: string; en: string }> = {
    capabilities: { de: 'Fähigkeiten', en: 'Capabilities' },
    frameworks: { de: 'Bibliotheken & Frameworks', en: 'Libraries & Frameworks' },
    services: { de: 'Services & APIs', en: 'Services & APIs' },
    tools: { de: 'Werkzeuge', en: 'Tools' },
    languages: { de: 'Programmiersprachen', en: 'Programming Languages' },
};

function SkillSection({ rows, locale }: { rows: ReadonlyArray<SkillRow>; locale: Locale }) {
    const [editing, setEditing] = useState<SkillRow | 'new' | null>(null);
    const [, deleteMutation] = useMutation(WorkspaceCvSkillsDeleteDocument);
    const [, reorderMutation] = useMutation(WorkspaceCvSkillReorderDocument);

    // The reorder mutation rewrites every row's position from a single id list,
    // so when a user reorders inside one category we still need to send the
    // full list — concatenate every category in CATEGORY_ORDER with its own
    // current order, splicing in the new order for the touched category.
    const grouped = useMemo(() => {
        const buckets: Record<SkillCategory, SkillRow[]> = {
            capabilities: [],
            frameworks: [],
            services: [],
            tools: [],
            languages: [],
        };
        for (const row of rows) buckets[row.category].push(row);
        return buckets;
    }, [rows]);

    return (
        <section className="mt-12">
            <SectionHeader
                title={{ de: 'Skills', en: 'Skills' }[locale]}
                addLabel={{ de: 'Skill hinzufügen', en: 'Add skill' }[locale]}
                onAdd={() => setEditing('new')}
                disabled={editing !== null}
            />
            {editing === 'new' ? <SkillForm row={null} position={rows.length} locale={locale} onClose={() => setEditing(null)} /> : null}
            <div className="mt-4 flex flex-col gap-6">
                {SKILL_CATEGORIES.filter((c) => grouped[c].length > 0).map((category) => (
                    <SkillCategoryGroup
                        key={category}
                        category={category}
                        rows={grouped[category]}
                        locale={locale}
                        editing={editing}
                        onEdit={(row) => setEditing(row)}
                        onCancel={() => setEditing(null)}
                        onDelete={async (cvSkillId) => {
                            await deleteMutation({ cvSkillIds: [cvSkillId] });
                        }}
                        onReorder={async (newOrderForCategory) => {
                            const orderedIds: string[] = [];
                            for (const c of SKILL_CATEGORIES) {
                                if (c === category) {
                                    orderedIds.push(...newOrderForCategory);
                                } else {
                                    orderedIds.push(...grouped[c].map((s) => s.cvSkillId));
                                }
                            }
                            await reorderMutation({ orderedIds });
                        }}
                    />
                ))}
            </div>
        </section>
    );
}

function SkillCategoryGroup({
    category,
    rows,
    locale,
    editing,
    onEdit,
    onCancel,
    onDelete,
    onReorder,
}: {
    category: SkillCategory;
    rows: ReadonlyArray<SkillRow>;
    locale: Locale;
    editing: SkillRow | 'new' | null;
    onEdit: (row: SkillRow) => void;
    onCancel: () => void;
    onDelete: (cvSkillId: string) => Promise<void>;
    onReorder: (orderedIds: string[]) => Promise<void>;
}) {
    const ordered = useReorderableList(rows, (r) => r.cvSkillId, onReorder);

    return (
        <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {SKILL_CATEGORY_LABELS[category][locale]}
            </h3>
            <ul className="mt-2 flex flex-col gap-1.5">
                {ordered.items.map((row, index) =>
                    editing && editing !== 'new' && editing.cvSkillId === row.cvSkillId ? (
                        <li key={row.cvSkillId}>
                            <SkillForm row={row} position={row.position} locale={locale} onClose={onCancel} />
                        </li>
                    ) : (
                        <DraggableItem key={row.cvSkillId} id={row.cvSkillId} index={index} state={ordered} locale={locale} compact>
                            <div className="flex flex-1 items-center justify-between rounded-md border border-border/40 bg-background/40 px-3 py-1.5 text-sm">
                                <span>{row.label}</span>
                                <span className="flex gap-1">
                                    <Button size="icon-xs" variant="ghost" onClick={() => onEdit(row)}>
                                        <PencilIcon />
                                    </Button>
                                    <Button size="icon-xs" variant="ghost" onClick={() => onDelete(row.cvSkillId)}>
                                        <Trash2Icon />
                                    </Button>
                                </span>
                            </div>
                        </DraggableItem>
                    ),
                )}
            </ul>
        </div>
    );
}

function SkillForm({ row, position, locale, onClose }: { row: SkillRow | null; position: number; locale: Locale; onClose: () => void }) {
    const [, upsert] = useMutation(WorkspaceCvSkillsUpsertDocument);
    const [form, setForm] = useState({
        category: row?.category ?? ('frameworks' as SkillCategory),
        label: row?.label ?? '',
    });
    const [busy, setBusy] = useState(false);
    return (
        <FormCard
            onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                await upsert({
                    cvSkills: [
                        {
                            cvSkillId: row?.cvSkillId ?? null,
                            category: form.category,
                            label: form.label,
                            position: row?.position ?? position,
                        },
                    ],
                });
                setBusy(false);
                onClose();
            }}
            onCancel={onClose}
            busy={busy}
            locale={locale}
        >
            <FormGrid>
                <Field label={{ de: 'Kategorie', en: 'Category' }[locale]}>
                    <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value as SkillCategory })}>
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {SKILL_CATEGORIES.map((c) => (
                                <SelectItem key={c} value={c}>
                                    {SKILL_CATEGORY_LABELS[c][locale]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
                <Field label={{ de: 'Bezeichnung', en: 'Label' }[locale]}>
                    <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
                </Field>
            </FormGrid>
        </FormCard>
    );
}

// --- Hobbies ----------------------------------------------------------------

type HobbyRow = CvData['publicCvHobbyFindMany'][number];

function HobbySection({ rows, locale }: { rows: ReadonlyArray<HobbyRow>; locale: Locale }) {
    const [editing, setEditing] = useState<HobbyRow | 'new' | null>(null);
    const [, deleteMutation] = useMutation(WorkspaceCvHobbiesDeleteDocument);
    const [, reorderMutation] = useMutation(WorkspaceCvHobbyReorderDocument);
    const ordered = useReorderableList(
        rows,
        (r) => r.cvHobbyId,
        async (ids) => {
            await reorderMutation({ orderedIds: ids });
        },
    );

    return (
        <section className="mt-12 mb-16">
            <SectionHeader
                title={{ de: 'Hobbys', en: 'Hobbies' }[locale]}
                addLabel={{ de: 'Hobby hinzufügen', en: 'Add hobby' }[locale]}
                onAdd={() => setEditing('new')}
                disabled={editing !== null}
            />
            {editing === 'new' ? <HobbyForm row={null} position={rows.length} locale={locale} onClose={() => setEditing(null)} /> : null}
            <ul className="mt-4 flex flex-col gap-3">
                {ordered.items.map((row, index) =>
                    editing && editing !== 'new' && editing.cvHobbyId === row.cvHobbyId ? (
                        <li key={row.cvHobbyId}>
                            <HobbyForm row={row} position={row.position} locale={locale} onClose={() => setEditing(null)} />
                        </li>
                    ) : (
                        <DraggableItem key={row.cvHobbyId} id={row.cvHobbyId} index={index} state={ordered} locale={locale}>
                            <RowCard
                                title={row.textDe}
                                subtitle={row.since ? String(row.since) : '–'}
                                onEdit={() => setEditing(row)}
                                onDelete={async () => {
                                    await deleteMutation({ cvHobbyIds: [row.cvHobbyId] });
                                }}
                                editLabel={rowEditLabel[locale]}
                                deleteLabel={rowDeleteLabel[locale]}
                            />
                        </DraggableItem>
                    ),
                )}
            </ul>
        </section>
    );
}

function HobbyForm({ row, position, locale, onClose }: { row: HobbyRow | null; position: number; locale: Locale; onClose: () => void }) {
    const [, upsert] = useMutation(WorkspaceCvHobbiesUpsertDocument);
    const [form, setForm] = useState({
        textDe: row?.textDe ?? '',
        textEn: row?.textEn ?? '',
        since: row?.since ? String(row.since) : '',
    });
    const [busy, setBusy] = useState(false);
    return (
        <FormCard
            onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                await upsert({
                    cvHobbies: [
                        {
                            cvHobbyId: row?.cvHobbyId ?? null,
                            textDe: form.textDe,
                            textEn: form.textEn,
                            since: form.since ? parseInt(form.since, 10) : null,
                            position: row?.position ?? position,
                        },
                    ],
                });
                setBusy(false);
                onClose();
            }}
            onCancel={onClose}
            busy={busy}
            locale={locale}
        >
            <FormGrid>
                <Field label={{ de: 'Text (DE)', en: 'Text (DE)' }[locale]} fullWidth>
                    <Textarea value={form.textDe} onChange={(e) => setForm({ ...form, textDe: e.target.value })} required />
                </Field>
                <Field label={{ de: 'Text (EN)', en: 'Text (EN)' }[locale]} fullWidth>
                    <Textarea value={form.textEn} onChange={(e) => setForm({ ...form, textEn: e.target.value })} required />
                </Field>
                <Field label={{ de: 'Seit Jahr (optional)', en: 'Since year (optional)' }[locale]}>
                    <Input type="number" value={form.since} onChange={(e) => setForm({ ...form, since: e.target.value })} />
                </Field>
            </FormGrid>
        </FormCard>
    );
}

// --- Shared bits ------------------------------------------------------------

// Drag-and-drop state for a single ordered list. The hook holds an
// optimistic copy of the upstream `rows` so the on-screen order updates
// the moment the user drops, before the round-trip mutation +
// `network-only` refetch returns. The optimistic copy resets whenever the
// upstream list's id sequence changes.
interface ReorderableState<T> {
    items: ReadonlyArray<T>;
    draggingId: string | null;
    overId: string | null;
    setDraggingId: (id: string | null) => void;
    setOverId: (id: string | null) => void;
    commitDrop: () => void;
    getId: (row: T) => string;
}

function useReorderableList<T>(
    rows: ReadonlyArray<T>,
    getId: (row: T) => string,
    onCommit: (orderedIds: string[]) => Promise<void>,
): ReorderableState<T> {
    const [items, setItems] = useState<ReadonlyArray<T>>(rows);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [overId, setOverId] = useState<string | null>(null);

    // Resync the optimistic copy whenever the upstream id sequence changes.
    // Same ids in the same order → no-op; otherwise adopt the new ordering.
    // Comparing the joined id string is cheap and avoids a deep walk for the
    // common case where the parent re-renders with an equivalent array.
    const upstreamKey = rows.map(getId).join('|');
    const lastKeyRef = useRef(upstreamKey);
    useEffect(() => {
        if (lastKeyRef.current !== upstreamKey) {
            lastKeyRef.current = upstreamKey;
            setItems(rows);
        }
    }, [upstreamKey, rows]);

    const commitDrop = () => {
        if (!draggingId || !overId || draggingId === overId) {
            setDraggingId(null);
            setOverId(null);
            return;
        }
        const next = [...items];
        const from = next.findIndex((r) => getId(r) === draggingId);
        const to = next.findIndex((r) => getId(r) === overId);
        if (from < 0 || to < 0) {
            setDraggingId(null);
            setOverId(null);
            return;
        }
        const [moved] = next.splice(from, 1) as [T];
        next.splice(to, 0, moved);
        setItems(next);
        setDraggingId(null);
        setOverId(null);
        void onCommit(next.map(getId));
    };

    return { items, draggingId, overId, setDraggingId, setOverId, commitDrop, getId };
}

function DraggableItem<T>({
    id,
    index,
    state,
    locale,
    children,
    compact,
}: {
    id: string;
    index: number;
    state: ReorderableState<T>;
    locale: Locale;
    children: React.ReactNode;
    compact?: boolean;
}) {
    const isDragging = state.draggingId === id;
    const isOver = state.overId === id && state.draggingId !== id;

    return (
        <li
            draggable
            onDragStart={(event) => {
                state.setDraggingId(id);
                event.dataTransfer.effectAllowed = 'move';
                // Firefox refuses to start a drag without payload data.
                event.dataTransfer.setData('text/plain', id);
            }}
            onDragEnter={() => {
                if (state.draggingId && state.draggingId !== id) state.setOverId(id);
            }}
            onDragOver={(event) => {
                if (!state.draggingId) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(event) => {
                if (!state.draggingId) return;
                event.preventDefault();
                state.commitDrop();
            }}
            onDragEnd={() => {
                state.setDraggingId(null);
                state.setOverId(null);
            }}
            className={cn(
                'flex items-stretch gap-2 transition-opacity',
                isDragging && 'opacity-50',
                isOver && 'rounded-md ring-2 ring-primary/60 ring-offset-2 ring-offset-background',
            )}
            aria-grabbed={isDragging}
            data-index={index}
        >
            <button
                type="button"
                tabIndex={-1}
                aria-label={dragHandleLabel[locale]}
                title={dragHandleLabel[locale]}
                className={cn(
                    'flex shrink-0 cursor-grab items-center justify-center rounded-md border border-transparent text-muted-foreground hover:border-border/60 hover:text-foreground active:cursor-grabbing',
                    compact ? 'w-6' : 'w-7',
                )}
            >
                <GripVerticalIcon className="size-4" />
            </button>
            <div className="min-w-0 flex-1">{children}</div>
        </li>
    );
}

function SectionHeader({ title, addLabel, onAdd, disabled }: { title: string; addLabel: string; onAdd: () => void; disabled: boolean }) {
    return (
        <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            <Button size="sm" variant="outline" onClick={onAdd} disabled={disabled}>
                <PlusIcon />
                {addLabel}
            </Button>
        </div>
    );
}

function RowCard({
    title,
    subtitle,
    onEdit,
    onDelete,
    editLabel,
    deleteLabel,
}: {
    title: string;
    subtitle: string;
    onEdit: () => void;
    onDelete: () => Promise<void>;
    editLabel: string;
    deleteLabel: string;
}) {
    return (
        <GlassCard className="px-5 py-3">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{title}</div>
                    <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
                </div>
                <div className="flex shrink-0 gap-1">
                    <Button size="icon-sm" variant="ghost" onClick={onEdit} aria-label={editLabel}>
                        <PencilIcon />
                    </Button>
                    <Button size="icon-sm" variant="ghost" onClick={onDelete} aria-label={deleteLabel}>
                        <Trash2Icon />
                    </Button>
                </div>
            </div>
        </GlassCard>
    );
}

function FormCard({
    children,
    onSubmit,
    onCancel,
    busy,
    locale,
}: {
    children: React.ReactNode;
    onSubmit: (event: React.FormEvent) => void;
    onCancel: () => void;
    busy: boolean;
    locale: Locale;
}) {
    return (
        <form onSubmit={onSubmit} className="mt-4">
            <GlassCard className="px-5 py-5">
                {children}
                <div className="mt-4 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button type="submit" disabled={busy}>
                        {{ de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </div>
            </GlassCard>
        </form>
    );
}

function FormGrid({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</div>;
}

function Field({ label, children, fullWidth }: { label: string; children: React.ReactNode; fullWidth?: boolean }) {
    return (
        <label className={fullWidth ? 'flex flex-col gap-1 md:col-span-2' : 'flex flex-col gap-1'}>
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            {children}
        </label>
    );
}

// Bridges the ISO `YYYY-MM-DD` storage shape the GraphQL `Date` scalar
// expects over to the `Date`-based `DatePicker`. The mirrored input keeps
// native HTML5 `required` validation working — the picker itself is a
// popover trigger button, not a form control, so the browser can't see its
// value.
function DateField({
    value,
    onChange,
    required,
    locale,
}: {
    value: string;
    onChange: (next: string) => void;
    required?: boolean;
    locale: Locale;
}) {
    return (
        <div className="relative">
            <DatePicker
                value={value ? parseISO(value) : undefined}
                onValueChange={(next) => onChange(next ? format(next, 'yyyy-MM-dd') : '')}
                className="w-full"
                captionLayout="dropdown"
                locale={DATE_FNS_LOCALE[locale]}
            />
            {required ? (
                <input
                    tabIndex={-1}
                    aria-hidden
                    required
                    value={value}
                    onChange={() => {}}
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0"
                />
            ) : null}
        </div>
    );
}

// Seed-and-Subscribe: the route loader provides the initial `user`, then the
// `userUpdates` subscription replaces it with the same fragment shape on every
// server push. Imperative URQL — not `useSubscription` — for the same reason
// `useChatLiveUpdates.tsx` does: URQL's declarative hook can deliver each event
// more than once under concurrent React. See `docs/architecture/state-synchronization.md`.
function useWorkspaceCvPageLiveUser(
    seed: GqlCWorkspaceCvPageUserFragment | null | undefined,
): GqlCWorkspaceCvPageUserFragment | null | undefined {
    const [user, setUser] = useState(seed);

    const client = useClient();
    useEffect(() => {
        const request = createRequest(WorkspaceCvPageUpdatesDocument, {});
        const operation = client.executeSubscription<GqlCWorkspaceCvPageUpdatesSubscription>(request);
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
