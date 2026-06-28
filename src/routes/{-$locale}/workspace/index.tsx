import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import {
    ArrowUpRightIcon,
    CodeXmlIcon,
    DumbbellIcon,
    FileTextIcon,
    FilmIcon,
    FolderKanbanIcon,
    MessageSquareTextIcon,
    ReceiptTextIcon,
    StethoscopeIcon,
    WalletIcon,
} from 'lucide-react';
import { ChatComposer } from '../../../web/chat/ChatComposer';
import { useChatLiveUpdates } from '../../../web/chat/useChatLiveUpdates';
import { CardContent, CardDescription, CardTitle } from '../../../web/components/base/card';
import { GlassCard } from '../../../web/components/GlassCard';
import { Header } from '../../../web/components/Header';
import { workspaceQuotePick } from '../../../web/content/workspaceQuotes';
import { WorkspaceChatMessageCreateDocument } from '../../../web/graphql/generated';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { cn } from '../../../web/utils/cn';
import type { Locale } from '../../../web/utils/locale';
import { localeFromParam } from '../../../web/utils/locale';

// TODO(phase-2): wrap this route (and every nested workspace route) in the
// GitHub-OAuth gate before pointing DNS at production. Until then `noindex`
// keeps the surface out of search engines and the public sitemap, and the
// landing page does not link here — it is reachable only by typing the URL.

const COPY = {
    hero: {
        // Title still feeds `seoMeta` and the browser tab — keep "Workspace"
        // there so the page identity is unambiguous in tabs and shared links.
        title: { de: 'Workspace', en: 'Workspace' },
        // SEO description only — the on-page hero shows a rotating motivational
        // quote from `workspaceQuotes.ts`, not a welcome-back greeting.
        intro: {
            de: 'Frag deinen Assistenten oder spring direkt in einen Themenbereich.',
            en: 'Ask your assistant, or jump straight into a focus area.',
        },
        composerPlaceholder: { de: 'Frag deinen Assistenten…', en: 'Ask your assistant…' },
    },
    areas: {
        cv: {
            title: { de: 'Lebenslauf', en: 'CV' },
            description: {
                de: 'Bearbeite die Inhalte für /cv und /about.',
                en: 'Edit the content shown on /cv and /about.',
            },
        },
        software: {
            title: { de: 'Software & Architektur', en: 'Software & architecture' },
            description: {
                de: 'Code, Architektur-Notizen, Werkzeuge.',
                en: 'Code, architecture notes, tools.',
            },
        },
        projects: {
            title: { de: 'Projekte', en: 'Projects' },
            description: {
                de: 'Persönliche Projekte und nächste Schritte.',
                en: 'Personal projects and next steps.',
            },
        },
        finances: {
            title: { de: 'Finanzen', en: 'Finances' },
            description: {
                de: 'Ziele, Überblick, Trading.',
                en: 'Goals, overview, trading.',
            },
        },
        tax: {
            title: { de: 'Steuern', en: 'Tax' },
            description: {
                de: 'Belege, Fristen, Notizen.',
                en: 'Receipts, deadlines, notes.',
            },
        },
        fitness: {
            title: { de: 'Fitness', en: 'Fitness' },
            description: {
                de: 'Trainingspläne, Fortschritt.',
                en: 'Training plans, progress.',
            },
        },
        medical: {
            title: { de: 'Medizinisches', en: 'Medical' },
            description: {
                de: 'Termine, Befunde, Notizen.',
                en: 'Appointments, results, notes.',
            },
        },
        media: {
            title: { de: 'Filme & Serien', en: 'Movies & TV' },
            description: {
                de: 'Watchlist und Gesehenes.',
                en: 'Watchlist and watched.',
            },
        },
        visitorChats: {
            title: { de: 'Besucher-Chats', en: 'Visitor chats' },
            description: {
                de: 'Was Besucher meinen KI-Assistenten gefragt haben.',
                en: 'What visitors have asked my AI assistant.',
            },
        },
    },
};

// `admin.chatMessageCreate` returns the chat row wrapped in the admin
// namespace; pull `{ chatId }` out for `ChatComposer` to navigate on.
const extractMessageCreateResult = (data: unknown): { chatId: string } | null => {
    const wrapper = data as { admin?: { chatMessageCreate?: { chatId: string } | null } | null } | null | undefined;
    return wrapper?.admin?.chatMessageCreate ?? null;
};

// `size` drives the bento span on `lg`+. `md` always renders 2-col, `sm` 1-col,
// so the spans only matter on wide viewports — where vertical-height-uniform
// 8-card grids waste space and hide the user's information hierarchy. Primary
// areas (the ones Cem actually opens daily) take a wider tile; the visitor-chat
// observational surface takes the full last row.
type FocusAreaSize = 'primary' | 'standard' | 'wide';

const FOCUS_AREAS: ReadonlyArray<{
    key: keyof typeof COPY.areas;
    to:
        | '/{-$locale}/workspace/cv'
        | '/{-$locale}/workspace/software'
        | '/{-$locale}/workspace/projects'
        | '/{-$locale}/workspace/finances'
        | '/{-$locale}/workspace/tax'
        | '/{-$locale}/workspace/fitness'
        | '/{-$locale}/workspace/medical'
        | '/{-$locale}/workspace/media'
        | '/{-$locale}/workspace/visitor-chats';
    icon: typeof CodeXmlIcon;
    size: FocusAreaSize;
}> = [
    { key: 'cv', to: '/{-$locale}/workspace/cv', icon: FileTextIcon, size: 'primary' },
    { key: 'software', to: '/{-$locale}/workspace/software', icon: CodeXmlIcon, size: 'primary' },
    { key: 'projects', to: '/{-$locale}/workspace/projects', icon: FolderKanbanIcon, size: 'standard' },
    { key: 'finances', to: '/{-$locale}/workspace/finances', icon: WalletIcon, size: 'standard' },
    { key: 'tax', to: '/{-$locale}/workspace/tax', icon: ReceiptTextIcon, size: 'standard' },
    { key: 'fitness', to: '/{-$locale}/workspace/fitness', icon: DumbbellIcon, size: 'standard' },
    { key: 'medical', to: '/{-$locale}/workspace/medical', icon: StethoscopeIcon, size: 'standard' },
    { key: 'media', to: '/{-$locale}/workspace/media', icon: FilmIcon, size: 'standard' },
    { key: 'visitorChats', to: '/{-$locale}/workspace/visitor-chats', icon: MessageSquareTextIcon, size: 'wide' },
];

// `lg:col-span-*` on a 6-col grid: primaries take a half-row (3/6), standards
// fit three to a row (2/6), the wide tile takes the full row (6/6). On `md`
// the grid collapses to 2-col and the spans drop out. On `sm` it stacks.
const SIZE_TO_SPAN: Record<FocusAreaSize, string> = {
    primary: 'lg:col-span-3',
    standard: 'lg:col-span-2',
    wide: 'lg:col-span-6',
};

export const Route = createFileRoute('/{-$locale}/workspace/')({
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: COPY.hero.title[locale],
            description: COPY.hero.intro[locale],
            path: '/workspace',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: WorkspaceHub,
});

function WorkspaceHub() {
    const locale = useLocale();
    // No `chatId` yet — the hub is always the empty state for the assistant.
    // The composer creates a chat on first send, then we navigate to
    // `/workspace/assistant?chatId=<id>` where the loaded view takes over.
    // Mounting `useChatLiveUpdates(undefined)` here means the subscription
    // listener is already in place (and the user message + first assistant
    // chunks are already buffered) by the time the navigation lands.
    const live = useChatLiveUpdates(undefined);
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col">
            {live.listener}
            {/* `brandLabel="Workspace"` swaps the public "Cem Yilmaz" wordmark
             * for an inert "Workspace" label — the logo stays clickable (back
             * to landing) but the label itself doesn't pretend to be a link
             * to nowhere. On a single-user private surface the wordmark is
             * decoration; the page already knows whose workspace it is. */}
            <Header brandLabel={COPY.hero.title[locale]} />
            <main className="flex-1 px-6 md:px-10 lg:px-16 max-w-6xl mx-auto w-full pb-16">
                <AssistantHero
                    locale={locale}
                    composer={
                        <ChatComposer
                            isLocked={live.isGenerating}
                            beginTurn={live.beginTurn}
                            endTurn={live.endTurn}
                            onMessageSent={(chatId) => navigate({ to: '/{-$locale}/workspace/assistant', search: { chatId } })}
                            sendMutation={WorkspaceChatMessageCreateDocument}
                            extractResult={extractMessageCreateResult}
                            placeholder={COPY.hero.composerPlaceholder[locale]}
                            autoFocus
                        />
                    }
                />
                <FocusAreaGrid locale={locale} />
            </main>
        </div>
    );
}

function AssistantHero({ locale, composer }: { locale: Locale; composer: React.ReactNode }) {
    // Rotates daily (UTC), not per render — see `workspaceQuotes.ts`. The
    // same quote on every navigation back to the hub on the same day is
    // intentional: the headline is decoration, not content the user is
    // here to read again.
    //
    // The visible heading is a blockquote rather than an `<h1>` — wrapping
    // a quote in h1 reads oddly to screen readers and pins our document
    // outline to whatever motivational line landed today. The sr-only h1
    // keeps the page semantically identifiable as "Workspace" without
    // putting that string into the visual hierarchy.
    //
    // The composer sits *in-flow* below the quote (not pinned to the viewport
    // bottom as it used to). On a single-screen-tall layout the composer is
    // already visible without scrolling, and the previous sticky placement
    // overlapped the last row of focus cards behind a progressive blur — the
    // overlap read as "the input is parked on top of my last tile", which is
    // worse than the few rows of scroll the in-flow version costs.
    const quote = workspaceQuotePick();
    return (
        <section className="pt-8 md:pt-10 pb-10 md:pb-12 mx-auto max-w-3xl">
            <h1 className="sr-only">{COPY.hero.title[locale]}</h1>
            <blockquote className="text-base md:text-lg leading-relaxed text-muted-foreground italic">
                <p>“{quote[locale]}”</p>
                {quote.attribution ? (
                    <footer className="mt-2 text-sm not-italic text-muted-foreground/80">— {quote.attribution}</footer>
                ) : null}
            </blockquote>
            <div className="mt-6 md:mt-8">{composer}</div>
        </section>
    );
}

function FocusAreaGrid({ locale }: { locale: Locale }) {
    return (
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            {FOCUS_AREAS.map(({ key, to, icon: Icon, size }) => {
                const area = COPY.areas[key];
                return (
                    <Link key={key} to={to} className={cn('group', SIZE_TO_SPAN[size])}>
                        <GlassCard className="h-full transition-colors hover:bg-white/55 dark:hover:bg-white/8">
                            <CardContent className="flex h-full flex-col gap-1.5 py-5">
                                {/* Icon + title on one row, arrow tucked into
                                 * the top-right corner. The whole card is the
                                 * link, so the arrow is purely an affordance
                                 * cue — it brightens and translates on hover
                                 * instead of carrying its own "Öffnen" label,
                                 * which was redundant with the card itself
                                 * being clickable. */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-2 text-primary">
                                        <Icon className="size-5 shrink-0" />
                                        <CardTitle className="text-base md:text-lg leading-tight">{area.title[locale]}</CardTitle>
                                    </div>
                                    <ArrowUpRightIcon
                                        className="size-4 shrink-0 text-muted-foreground/60 transition-[color,transform] duration-200 ease-out group-hover:text-foreground group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0"
                                        aria-hidden
                                    />
                                </div>
                                <CardDescription className="text-sm leading-snug">{area.description[locale]}</CardDescription>
                            </CardContent>
                        </GlassCard>
                    </Link>
                );
            })}
        </section>
    );
}
