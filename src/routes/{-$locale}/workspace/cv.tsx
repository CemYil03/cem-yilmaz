import { createFileRoute, Link } from '@tanstack/react-router';
import { FileTextIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQuery } from 'urql';
import { Button } from '../../../web/components/base/button';
import { Input } from '../../../web/components/base/input';
import { Textarea } from '../../../web/components/base/textarea';
import { GlassCard } from '../../../web/components/GlassCard';
import type { GqlCWorkspaceCvPageQuery } from '../../../web/graphql/generated';
import {
    WorkspaceCvEducationDeleteDocument,
    WorkspaceCvEducationUpsertDocument,
    WorkspaceCvExperienceDeleteDocument,
    WorkspaceCvExperienceUpsertDocument,
    WorkspaceCvHobbyDeleteDocument,
    WorkspaceCvHobbyUpsertDocument,
    WorkspaceCvPageDocument,
    WorkspaceCvSkillDeleteDocument,
    WorkspaceCvSkillUpsertDocument,
} from '../../../web/graphql/generated';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import type { Locale } from '../../../web/utils/locale';
import { localeFromParam } from '../../../web/utils/locale';

// Admin editor for the CV tables. Phase 1: surface lives at `/workspace/cv`
// without authentication on the page itself; mutations go through
// `Mutation.admin` whose `guardAdminMutation` is permissive today and gets
// real OAuth in Phase 2. The page is `noindex` and unlinked from public
// surfaces — visitors land here only by typing the URL.
//
// One section per CV entity. Each section is a list of cards plus a "new
// entry" form. Reordering is not in this iteration — the underlying
// `*Reorder` mutation is wired but the UI surfaces the `position` integer
// directly so the editor can re-shuffle by typing numbers. A drag-handle
// pass lands in a follow-up.

const COPY = {
    title: { de: 'Lebenslauf bearbeiten', en: 'Edit CV' },
    description: {
        de: 'Quelle für /cv und /about. Änderungen sind sofort öffentlich sichtbar.',
        en: 'Source of truth for /cv and /about. Changes go public immediately.',
    },
    back: { de: '← Workspace', en: '← Workspace' },
    sections: {
        experience: { de: 'Berufserfahrung', en: 'Experience' },
        education: { de: 'Ausbildung', en: 'Education' },
        skills: { de: 'Skills', en: 'Skills' },
        hobbies: { de: 'Hobbys', en: 'Hobbies' },
    },
    actions: {
        addExperience: { de: 'Stelle hinzufügen', en: 'Add experience' },
        addEducation: { de: 'Ausbildung hinzufügen', en: 'Add education' },
        addSkill: { de: 'Skill hinzufügen', en: 'Add skill' },
        addHobby: { de: 'Hobby hinzufügen', en: 'Add hobby' },
        save: { de: 'Speichern', en: 'Save' },
        cancel: { de: 'Abbrechen', en: 'Cancel' },
        edit: { de: 'Bearbeiten', en: 'Edit' },
        delete: { de: 'Löschen', en: 'Delete' },
    },
    fields: {
        roleDe: { de: 'Rolle (DE)', en: 'Role (DE)' },
        roleEn: { de: 'Rolle (EN)', en: 'Role (EN)' },
        companyDe: { de: 'Unternehmen (DE)', en: 'Company (DE)' },
        companyEn: { de: 'Unternehmen (EN)', en: 'Company (EN)' },
        startDate: { de: 'Beginn', en: 'Start' },
        endDate: { de: 'Ende (leer = heute)', en: 'End (blank = ongoing)' },
        descriptionDe: { de: 'Beschreibung (DE)', en: 'Description (DE)' },
        descriptionEn: { de: 'Beschreibung (EN)', en: 'Description (EN)' },
        technologies: { de: 'Technologien (kommagetrennt)', en: 'Technologies (comma-separated)' },
        managerName: { de: 'Manager (optional)', en: 'Manager (optional)' },
        position: { de: 'Position (Sortierung)', en: 'Position (sort order)' },
        degreeDe: { de: 'Abschluss (DE)', en: 'Degree (DE)' },
        degreeEn: { de: 'Abschluss (EN)', en: 'Degree (EN)' },
        institutionDe: { de: 'Institution (DE)', en: 'Institution (DE)' },
        institutionEn: { de: 'Institution (EN)', en: 'Institution (EN)' },
        subjectDe: { de: 'Fach (DE)', en: 'Subject (DE)' },
        subjectEn: { de: 'Fach (EN)', en: 'Subject (EN)' },
        startDateOptional: { de: 'Beginn (optional)', en: 'Start (optional)' },
        endDateRequired: { de: 'Ende', en: 'End' },
        notesDe: { de: 'Notizen (DE)', en: 'Notes (DE)' },
        notesEn: { de: 'Notizen (EN)', en: 'Notes (EN)' },
        category: { de: 'Kategorie', en: 'Category' },
        label: { de: 'Bezeichnung', en: 'Label' },
        textDe: { de: 'Text (DE)', en: 'Text (DE)' },
        textEn: { de: 'Text (EN)', en: 'Text (EN)' },
        since: { de: 'Seit Jahr (optional)', en: 'Since year (optional)' },
    },
    auth: {
        de: 'Hinweis: Schreibzugriff ist in Phase 1 offen. Der Wechsel auf GitHub OAuth folgt in Phase 2.',
        en: 'Note: write access is open in Phase 1. GitHub OAuth follows in Phase 2.',
    },
};

export const Route = createFileRoute('/{-$locale}/workspace/cv')({
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: COPY.title[locale],
            description: COPY.description[locale],
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
    const [{ data, fetching, error }, refetch] = useQuery({ query: WorkspaceCvPageDocument });

    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-4xl mx-auto w-full py-12 leading-relaxed">
            <Link to="/{-$locale}/workspace" className="text-sm text-muted-foreground hover:text-foreground">
                {COPY.back[locale]}
            </Link>
            <div className="mt-6 flex items-center gap-3 text-primary">
                <FileTextIcon className="size-6" />
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{COPY.title[locale]}</h1>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{COPY.description[locale]}</p>
            <p className="mt-2 text-xs text-muted-foreground">{COPY.auth[locale]}</p>

            {fetching && !data ? <p className="mt-8 text-sm text-muted-foreground">…</p> : null}
            {error ? <p className="mt-8 text-sm text-destructive">{error.message}</p> : null}

            {data ? (
                <>
                    <ExperienceSection
                        rows={data.cv.experience}
                        locale={locale}
                        onChanged={() => refetch({ requestPolicy: 'network-only' })}
                    />
                    <EducationSection
                        rows={data.cv.education}
                        locale={locale}
                        onChanged={() => refetch({ requestPolicy: 'network-only' })}
                    />
                    <SkillSection rows={data.cv.skills} locale={locale} onChanged={() => refetch({ requestPolicy: 'network-only' })} />
                    <HobbySection rows={data.cv.hobbies} locale={locale} onChanged={() => refetch({ requestPolicy: 'network-only' })} />
                </>
            ) : null}
        </main>
    );
}

// --- Experience -------------------------------------------------------------

type ExperienceRow = GqlCWorkspaceCvPageQuery['cv']['experience'][number];

function ExperienceSection({ rows, locale, onChanged }: { rows: ReadonlyArray<ExperienceRow>; locale: Locale; onChanged: () => void }) {
    const [editing, setEditing] = useState<ExperienceRow | 'new' | null>(null);
    const [, deleteMutation] = useMutation(WorkspaceCvExperienceDeleteDocument);
    const nextPosition = rows.length;

    return (
        <section className="mt-12">
            <SectionHeader
                title={COPY.sections.experience[locale]}
                addLabel={COPY.actions.addExperience[locale]}
                onAdd={() => setEditing('new')}
                disabled={editing !== null}
            />
            {editing === 'new' ? (
                <ExperienceForm row={null} position={nextPosition} locale={locale} onClose={() => setEditing(null)} onSaved={onChanged} />
            ) : null}
            <ul className="mt-4 flex flex-col gap-3">
                {rows.map((row) =>
                    editing && editing !== 'new' && editing.cvExperienceId === row.cvExperienceId ? (
                        <li key={row.cvExperienceId}>
                            <ExperienceForm
                                row={row}
                                position={row.position}
                                locale={locale}
                                onClose={() => setEditing(null)}
                                onSaved={onChanged}
                            />
                        </li>
                    ) : (
                        <li key={row.cvExperienceId}>
                            <RowCard
                                title={`${row.roleDe} — ${row.companyDe}`}
                                subtitle={`${row.startDate} → ${row.endDate ?? 'heute'} · pos ${row.position}`}
                                onEdit={() => setEditing(row)}
                                onDelete={async () => {
                                    await deleteMutation({ cvExperienceId: row.cvExperienceId });
                                    onChanged();
                                }}
                                editLabel={COPY.actions.edit[locale]}
                                deleteLabel={COPY.actions.delete[locale]}
                            />
                        </li>
                    ),
                )}
            </ul>
        </section>
    );
}

function ExperienceForm({
    row,
    position,
    locale,
    onClose,
    onSaved,
}: {
    row: ExperienceRow | null;
    position: number;
    locale: Locale;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [, upsert] = useMutation(WorkspaceCvExperienceUpsertDocument);
    const [form, setForm] = useState({
        roleDe: row?.roleDe ?? '',
        roleEn: row?.roleEn ?? '',
        companyDe: row?.companyDe ?? '',
        companyEn: row?.companyEn ?? '',
        startDate: row?.startDate ?? '',
        endDate: row?.endDate ?? '',
        descriptionDe: row?.descriptionDe ?? '',
        descriptionEn: row?.descriptionEn ?? '',
        technologies: row?.technologies.join(', ') ?? '',
        managerName: row?.managerName ?? '',
        position: String(row?.position ?? position),
    });
    const [busy, setBusy] = useState(false);

    return (
        <FormCard
            onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                await upsert({
                    cvExperienceId: row?.cvExperienceId ?? null,
                    roleDe: form.roleDe,
                    roleEn: form.roleEn,
                    companyDe: form.companyDe,
                    companyEn: form.companyEn,
                    startDate: form.startDate,
                    endDate: form.endDate || null,
                    descriptionDe: form.descriptionDe,
                    descriptionEn: form.descriptionEn,
                    technologies: form.technologies
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean),
                    managerName: form.managerName || null,
                    position: parseInt(form.position, 10),
                });
                setBusy(false);
                onClose();
                onSaved();
            }}
            onCancel={onClose}
            busy={busy}
            locale={locale}
        >
            <FormGrid>
                <Field label={COPY.fields.roleDe[locale]}>
                    <Input value={form.roleDe} onChange={(e) => setForm({ ...form, roleDe: e.target.value })} required />
                </Field>
                <Field label={COPY.fields.roleEn[locale]}>
                    <Input value={form.roleEn} onChange={(e) => setForm({ ...form, roleEn: e.target.value })} required />
                </Field>
                <Field label={COPY.fields.companyDe[locale]}>
                    <Input value={form.companyDe} onChange={(e) => setForm({ ...form, companyDe: e.target.value })} required />
                </Field>
                <Field label={COPY.fields.companyEn[locale]}>
                    <Input value={form.companyEn} onChange={(e) => setForm({ ...form, companyEn: e.target.value })} required />
                </Field>
                <Field label={COPY.fields.startDate[locale]}>
                    <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
                </Field>
                <Field label={COPY.fields.endDate[locale]}>
                    <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </Field>
                <Field label={COPY.fields.descriptionDe[locale]} fullWidth>
                    <Textarea value={form.descriptionDe} onChange={(e) => setForm({ ...form, descriptionDe: e.target.value })} required />
                </Field>
                <Field label={COPY.fields.descriptionEn[locale]} fullWidth>
                    <Textarea value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} required />
                </Field>
                <Field label={COPY.fields.technologies[locale]} fullWidth>
                    <Input value={form.technologies} onChange={(e) => setForm({ ...form, technologies: e.target.value })} />
                </Field>
                <Field label={COPY.fields.managerName[locale]}>
                    <Input value={form.managerName} onChange={(e) => setForm({ ...form, managerName: e.target.value })} />
                </Field>
                <Field label={COPY.fields.position[locale]}>
                    <Input type="number" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} required />
                </Field>
            </FormGrid>
        </FormCard>
    );
}

// --- Education --------------------------------------------------------------

type EducationRow = GqlCWorkspaceCvPageQuery['cv']['education'][number];

function EducationSection({ rows, locale, onChanged }: { rows: ReadonlyArray<EducationRow>; locale: Locale; onChanged: () => void }) {
    const [editing, setEditing] = useState<EducationRow | 'new' | null>(null);
    const [, deleteMutation] = useMutation(WorkspaceCvEducationDeleteDocument);
    const nextPosition = rows.length;
    return (
        <section className="mt-12">
            <SectionHeader
                title={COPY.sections.education[locale]}
                addLabel={COPY.actions.addEducation[locale]}
                onAdd={() => setEditing('new')}
                disabled={editing !== null}
            />
            {editing === 'new' ? (
                <EducationForm row={null} position={nextPosition} locale={locale} onClose={() => setEditing(null)} onSaved={onChanged} />
            ) : null}
            <ul className="mt-4 flex flex-col gap-3">
                {rows.map((row) =>
                    editing && editing !== 'new' && editing.cvEducationId === row.cvEducationId ? (
                        <li key={row.cvEducationId}>
                            <EducationForm
                                row={row}
                                position={row.position}
                                locale={locale}
                                onClose={() => setEditing(null)}
                                onSaved={onChanged}
                            />
                        </li>
                    ) : (
                        <li key={row.cvEducationId}>
                            <RowCard
                                title={`${row.degreeDe} · ${row.institutionDe}`}
                                subtitle={`${row.startDate ?? '?'} → ${row.endDate} · pos ${row.position}`}
                                onEdit={() => setEditing(row)}
                                onDelete={async () => {
                                    await deleteMutation({ cvEducationId: row.cvEducationId });
                                    onChanged();
                                }}
                                editLabel={COPY.actions.edit[locale]}
                                deleteLabel={COPY.actions.delete[locale]}
                            />
                        </li>
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
    onSaved,
}: {
    row: EducationRow | null;
    position: number;
    locale: Locale;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [, upsert] = useMutation(WorkspaceCvEducationUpsertDocument);
    const [form, setForm] = useState({
        degreeDe: row?.degreeDe ?? '',
        degreeEn: row?.degreeEn ?? '',
        institutionDe: row?.institutionDe ?? '',
        institutionEn: row?.institutionEn ?? '',
        subjectDe: row?.subjectDe ?? '',
        subjectEn: row?.subjectEn ?? '',
        startDate: row?.startDate ?? '',
        endDate: row?.endDate ?? '',
        notesDe: row?.notesDe ?? '',
        notesEn: row?.notesEn ?? '',
        position: String(row?.position ?? position),
    });
    const [busy, setBusy] = useState(false);
    return (
        <FormCard
            onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                await upsert({
                    cvEducationId: row?.cvEducationId ?? null,
                    degreeDe: form.degreeDe,
                    degreeEn: form.degreeEn,
                    institutionDe: form.institutionDe,
                    institutionEn: form.institutionEn,
                    subjectDe: form.subjectDe,
                    subjectEn: form.subjectEn,
                    startDate: form.startDate || null,
                    endDate: form.endDate,
                    notesDe: form.notesDe,
                    notesEn: form.notesEn,
                    position: parseInt(form.position, 10),
                });
                setBusy(false);
                onClose();
                onSaved();
            }}
            onCancel={onClose}
            busy={busy}
            locale={locale}
        >
            <FormGrid>
                <Field label={COPY.fields.degreeDe[locale]}>
                    <Input value={form.degreeDe} onChange={(e) => setForm({ ...form, degreeDe: e.target.value })} required />
                </Field>
                <Field label={COPY.fields.degreeEn[locale]}>
                    <Input value={form.degreeEn} onChange={(e) => setForm({ ...form, degreeEn: e.target.value })} required />
                </Field>
                <Field label={COPY.fields.institutionDe[locale]}>
                    <Input value={form.institutionDe} onChange={(e) => setForm({ ...form, institutionDe: e.target.value })} required />
                </Field>
                <Field label={COPY.fields.institutionEn[locale]}>
                    <Input value={form.institutionEn} onChange={(e) => setForm({ ...form, institutionEn: e.target.value })} required />
                </Field>
                <Field label={COPY.fields.subjectDe[locale]}>
                    <Input value={form.subjectDe} onChange={(e) => setForm({ ...form, subjectDe: e.target.value })} />
                </Field>
                <Field label={COPY.fields.subjectEn[locale]}>
                    <Input value={form.subjectEn} onChange={(e) => setForm({ ...form, subjectEn: e.target.value })} />
                </Field>
                <Field label={COPY.fields.startDateOptional[locale]}>
                    <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </Field>
                <Field label={COPY.fields.endDateRequired[locale]}>
                    <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
                </Field>
                <Field label={COPY.fields.notesDe[locale]} fullWidth>
                    <Textarea value={form.notesDe} onChange={(e) => setForm({ ...form, notesDe: e.target.value })} />
                </Field>
                <Field label={COPY.fields.notesEn[locale]} fullWidth>
                    <Textarea value={form.notesEn} onChange={(e) => setForm({ ...form, notesEn: e.target.value })} />
                </Field>
                <Field label={COPY.fields.position[locale]}>
                    <Input type="number" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} required />
                </Field>
            </FormGrid>
        </FormCard>
    );
}

// --- Skills -----------------------------------------------------------------

type SkillRow = GqlCWorkspaceCvPageQuery['cv']['skills'][number];

const SKILL_CATEGORIES = ['capabilities', 'frameworks', 'services', 'tools', 'languages'] as const;

function SkillSection({ rows, locale, onChanged }: { rows: ReadonlyArray<SkillRow>; locale: Locale; onChanged: () => void }) {
    const [editing, setEditing] = useState<SkillRow | 'new' | null>(null);
    const [, deleteMutation] = useMutation(WorkspaceCvSkillDeleteDocument);
    const nextPosition = rows.length;
    return (
        <section className="mt-12">
            <SectionHeader
                title={COPY.sections.skills[locale]}
                addLabel={COPY.actions.addSkill[locale]}
                onAdd={() => setEditing('new')}
                disabled={editing !== null}
            />
            {editing === 'new' ? (
                <SkillForm row={null} position={nextPosition} locale={locale} onClose={() => setEditing(null)} onSaved={onChanged} />
            ) : null}
            <ul className="mt-4 flex flex-col gap-1.5">
                {rows.map((row) =>
                    editing && editing !== 'new' && editing.cvSkillId === row.cvSkillId ? (
                        <li key={row.cvSkillId}>
                            <SkillForm
                                row={row}
                                position={row.position}
                                locale={locale}
                                onClose={() => setEditing(null)}
                                onSaved={onChanged}
                            />
                        </li>
                    ) : (
                        <li
                            key={row.cvSkillId}
                            className="flex items-center justify-between rounded-md border border-border/40 bg-background/40 px-3 py-1.5 text-sm"
                        >
                            <span>
                                <span className="text-xs text-muted-foreground">{row.category}</span> · {row.label} ·{' '}
                                <span className="text-xs text-muted-foreground">pos {row.position}</span>
                            </span>
                            <span className="flex gap-1">
                                <Button size="icon-xs" variant="ghost" onClick={() => setEditing(row)}>
                                    <PencilIcon />
                                </Button>
                                <Button
                                    size="icon-xs"
                                    variant="ghost"
                                    onClick={async () => {
                                        await deleteMutation({ cvSkillId: row.cvSkillId });
                                        onChanged();
                                    }}
                                >
                                    <Trash2Icon />
                                </Button>
                            </span>
                        </li>
                    ),
                )}
            </ul>
        </section>
    );
}

function SkillForm({
    row,
    position,
    locale,
    onClose,
    onSaved,
}: {
    row: SkillRow | null;
    position: number;
    locale: Locale;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [, upsert] = useMutation(WorkspaceCvSkillUpsertDocument);
    const [form, setForm] = useState({
        category: row?.category ?? 'frameworks',
        label: row?.label ?? '',
        position: String(row?.position ?? position),
    });
    const [busy, setBusy] = useState(false);
    return (
        <FormCard
            onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                await upsert({
                    cvSkillId: row?.cvSkillId ?? null,
                    category: form.category,
                    label: form.label,
                    position: parseInt(form.position, 10),
                });
                setBusy(false);
                onClose();
                onSaved();
            }}
            onCancel={onClose}
            busy={busy}
            locale={locale}
        >
            <FormGrid>
                <Field label={COPY.fields.category[locale]}>
                    <select
                        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value as SkillRow['category'] })}
                    >
                        {SKILL_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label={COPY.fields.label[locale]}>
                    <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
                </Field>
                <Field label={COPY.fields.position[locale]}>
                    <Input type="number" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} required />
                </Field>
            </FormGrid>
        </FormCard>
    );
}

// --- Hobbies ----------------------------------------------------------------

type HobbyRow = GqlCWorkspaceCvPageQuery['cv']['hobbies'][number];

function HobbySection({ rows, locale, onChanged }: { rows: ReadonlyArray<HobbyRow>; locale: Locale; onChanged: () => void }) {
    const [editing, setEditing] = useState<HobbyRow | 'new' | null>(null);
    const [, deleteMutation] = useMutation(WorkspaceCvHobbyDeleteDocument);
    const nextPosition = rows.length;
    return (
        <section className="mt-12 mb-16">
            <SectionHeader
                title={COPY.sections.hobbies[locale]}
                addLabel={COPY.actions.addHobby[locale]}
                onAdd={() => setEditing('new')}
                disabled={editing !== null}
            />
            {editing === 'new' ? (
                <HobbyForm row={null} position={nextPosition} locale={locale} onClose={() => setEditing(null)} onSaved={onChanged} />
            ) : null}
            <ul className="mt-4 flex flex-col gap-3">
                {rows.map((row) =>
                    editing && editing !== 'new' && editing.cvHobbyId === row.cvHobbyId ? (
                        <li key={row.cvHobbyId}>
                            <HobbyForm
                                row={row}
                                position={row.position}
                                locale={locale}
                                onClose={() => setEditing(null)}
                                onSaved={onChanged}
                            />
                        </li>
                    ) : (
                        <li key={row.cvHobbyId}>
                            <RowCard
                                title={row.textDe}
                                subtitle={`${row.since ?? '–'} · pos ${row.position}`}
                                onEdit={() => setEditing(row)}
                                onDelete={async () => {
                                    await deleteMutation({ cvHobbyId: row.cvHobbyId });
                                    onChanged();
                                }}
                                editLabel={COPY.actions.edit[locale]}
                                deleteLabel={COPY.actions.delete[locale]}
                            />
                        </li>
                    ),
                )}
            </ul>
        </section>
    );
}

function HobbyForm({
    row,
    position,
    locale,
    onClose,
    onSaved,
}: {
    row: HobbyRow | null;
    position: number;
    locale: Locale;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [, upsert] = useMutation(WorkspaceCvHobbyUpsertDocument);
    const [form, setForm] = useState({
        textDe: row?.textDe ?? '',
        textEn: row?.textEn ?? '',
        since: row?.since ? String(row.since) : '',
        position: String(row?.position ?? position),
    });
    const [busy, setBusy] = useState(false);
    return (
        <FormCard
            onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                await upsert({
                    cvHobbyId: row?.cvHobbyId ?? null,
                    textDe: form.textDe,
                    textEn: form.textEn,
                    since: form.since ? parseInt(form.since, 10) : null,
                    position: parseInt(form.position, 10),
                });
                setBusy(false);
                onClose();
                onSaved();
            }}
            onCancel={onClose}
            busy={busy}
            locale={locale}
        >
            <FormGrid>
                <Field label={COPY.fields.textDe[locale]} fullWidth>
                    <Textarea value={form.textDe} onChange={(e) => setForm({ ...form, textDe: e.target.value })} required />
                </Field>
                <Field label={COPY.fields.textEn[locale]} fullWidth>
                    <Textarea value={form.textEn} onChange={(e) => setForm({ ...form, textEn: e.target.value })} required />
                </Field>
                <Field label={COPY.fields.since[locale]}>
                    <Input type="number" value={form.since} onChange={(e) => setForm({ ...form, since: e.target.value })} />
                </Field>
                <Field label={COPY.fields.position[locale]}>
                    <Input type="number" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} required />
                </Field>
            </FormGrid>
        </FormCard>
    );
}

// --- Shared bits ------------------------------------------------------------

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
                        {COPY.actions.cancel[locale]}
                    </Button>
                    <Button type="submit" disabled={busy}>
                        {COPY.actions.save[locale]}
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
