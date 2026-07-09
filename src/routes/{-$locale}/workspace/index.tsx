import { createFileRoute, Link, useLocation } from '@tanstack/react-router';
import {
    ArrowUpRightIcon,
    CodeXmlIcon,
    CompassIcon,
    DumbbellIcon,
    FileTextIcon,
    FilmIcon,
    FolderKanbanIcon,
    ListTodoIcon,
    MessageSquareTextIcon,
    PackageIcon,
    PlaneIcon,
    ReceiptTextIcon,
    ScrollTextIcon,
    StethoscopeIcon,
    WalletIcon,
} from 'lucide-react';
import { useWorkspaceAssistantChat } from '../../../web/chat/WorkspaceAssistantChatProvider';
import { WorkspaceChatComposer } from '../../../web/chat/WorkspaceChatComposer';
import { CardContent, CardDescription, CardTitle } from '../../../web/components/base/card';
import { useSidebar } from '../../../web/components/base/sidebar';
import { GlassCard } from '../../../web/components/GlassCard';
import { workspaceQuotePick } from '../../../web/content/workspaceQuotes';
import { WorkspaceHubDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
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

const title = { de: 'Workspace', en: 'Workspace' };

// `admin.chatMessageCreate` returns the chat row wrapped in the admin
// namespace; the provider in `WorkspaceAssistantChatProvider` extracts
// `{ chatId }` so the hub composer only forwards the user's text.

// The grid is split into two subgroups. The top "personal" grid is the daily
// surface — focus areas Cem actually opens to work on himself. The bottom
// "public site" group is content-management for cem-yilmaz.de — touched rarely
// (when the CV changes, when a visitor chat is worth a look), so it sits below
// the personal areas as a small labelled cluster instead of mixed in with the
// daily tiles. Every tile inside a subgroup is the same size — the previous
// bento with primary/standard/wide tiles encoded a priority the user didn't
// want to read into the layout.

type FocusAreaRoute =
    | '/{-$locale}/workspace/cv'
    | '/{-$locale}/workspace/software'
    | '/{-$locale}/workspace/projects'
    | '/{-$locale}/workspace/todos'
    | '/{-$locale}/workspace/finances'
    | '/{-$locale}/workspace/inventory'
    | '/{-$locale}/workspace/tax'
    | '/{-$locale}/workspace/fitness'
    | '/{-$locale}/workspace/medical'
    | '/{-$locale}/workspace/media'
    | '/{-$locale}/workspace/travel'
    | '/{-$locale}/workspace/compass'
    | '/{-$locale}/workspace/logs'
    | '/{-$locale}/workspace/visitor-chats';

type FocusArea = {
    to: FocusAreaRoute;
    icon: typeof CodeXmlIcon;
    title: { de: string; en: string };
    description: { de: string; en: string };
    // Badge value driven by the hub query (e.g. inbox count). Resolved at
    // render time so a card definition is still a static literal.
    badgeKey?: 'projectsInbox' | 'todosOpen';
};

// Screen-reader labels for the tile badges. The number sits in the pill;
// this narrates what it is counting so a11y trees don't just hear "3".
const BADGE_ARIA: Record<NonNullable<FocusArea['badgeKey']>, (count: number, locale: Locale) => string> = {
    projectsInbox: (count, locale) => ({ de: `${count} neue Anfragen`, en: `${count} new requests` })[locale],
    todosOpen: (count, locale) => ({ de: `${count} offene Todos`, en: `${count} open todos` })[locale],
};

const PERSONAL_FOCUS_AREAS: ReadonlyArray<FocusArea> = [
    {
        to: '/{-$locale}/workspace/compass',
        icon: CompassIcon,
        title: { de: 'Kompass', en: 'Compass' },
        description: { de: 'Was dein Assistent über dich weiß.', en: 'What your assistant knows about you.' },
    },
    {
        to: '/{-$locale}/workspace/projects',
        icon: FolderKanbanIcon,
        title: { de: 'Projekte', en: 'Projects' },
        description: { de: 'Persönliche Projekte und nächste Schritte.', en: 'Personal projects and next steps.' },
        badgeKey: 'projectsInbox',
    },
    {
        to: '/{-$locale}/workspace/todos',
        icon: ListTodoIcon,
        title: { de: 'Todos', en: 'Todos' },
        description: { de: 'Schnelle Aufgaben ohne Projektbezug.', en: 'Quick tasks with no project attached.' },
        badgeKey: 'todosOpen',
    },
    {
        to: '/{-$locale}/workspace/tax',
        icon: ReceiptTextIcon,
        title: { de: 'Steuern', en: 'Tax' },
        description: { de: 'Belege, Fristen, Notizen.', en: 'Receipts, deadlines, notes.' },
    },
    {
        to: '/{-$locale}/workspace/software',
        icon: CodeXmlIcon,
        title: { de: 'Software', en: 'Software' },
        description: { de: 'Code, Architektur-Notizen, Werkzeuge.', en: 'Code, architecture notes, tools.' },
    },
    {
        to: '/{-$locale}/workspace/finances',
        icon: WalletIcon,
        title: { de: 'Finanzen', en: 'Finances' },
        description: { de: 'Ziele, Überblick, Trading.', en: 'Goals, overview, trading.' },
    },
    {
        to: '/{-$locale}/workspace/inventory',
        icon: PackageIcon,
        title: { de: 'Inventar', en: 'Inventory' },
        description: { de: 'Besitztümer und aktueller Wert.', en: 'Belongings and current value.' },
    },
    {
        to: '/{-$locale}/workspace/fitness',
        icon: DumbbellIcon,
        title: { de: 'Fitness', en: 'Fitness' },
        description: { de: 'Trainingspläne, Fortschritt.', en: 'Training plans, progress.' },
    },
    {
        to: '/{-$locale}/workspace/medical',
        icon: StethoscopeIcon,
        title: { de: 'Medizinisches', en: 'Medical' },
        description: { de: 'Termine, Befunde, Notizen.', en: 'Appointments, results, notes.' },
    },
    {
        to: '/{-$locale}/workspace/media',
        icon: FilmIcon,
        title: { de: 'Filme & Serien', en: 'Movies & TV' },
        description: { de: 'Watchlist und Gesehenes.', en: 'Watchlist and watched.' },
    },
    {
        to: '/{-$locale}/workspace/travel',
        icon: PlaneIcon,
        title: { de: 'Reisen', en: 'Travel' },
        description: { de: 'Trips, Packlisten, Vorbereitung.', en: 'Trips, packing lists, prep.' },
    },
];

const PUBLIC_SITE_FOCUS_AREAS: ReadonlyArray<FocusArea> = [
    {
        to: '/{-$locale}/workspace/cv',
        icon: FileTextIcon,
        title: { de: 'Lebenslauf', en: 'CV' },
        description: { de: 'Bearbeite die Inhalte für /cv und /about.', en: 'Edit the content shown on /cv and /about.' },
    },
    {
        to: '/{-$locale}/workspace/visitor-chats',
        icon: MessageSquareTextIcon,
        title: { de: 'Besucher-Chats', en: 'Visitor chats' },
        description: { de: 'Was Besucher meinen KI-Assistenten gefragt haben.', en: 'What visitors have asked my AI assistant.' },
    },
    {
        to: '/{-$locale}/workspace/logs',
        icon: ScrollTextIcon,
        title: { de: 'Logs', en: 'Logs' },
        description: { de: 'Server-Logs durchsuchen.', en: 'Inspect server logs.' },
    },
];

export const Route = createFileRoute('/{-$locale}/workspace/')({
    loader: () => routeLoaderGraphqlClient(WorkspaceHubDocument)(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: title[locale],
            description: {
                de: 'Frag deinen Assistenten oder spring direkt in einen Themenbereich.',
                en: 'Ask your assistant, or jump straight into a focus area.',
            }[locale],
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
    // The assistant chat lives in the workspace-layout provider (one level
    // up). The hub composer is the shared `<WorkspaceChatComposer />` — same
    // composer the sidebar and `/workspace/assistant/<chatId>` deep-link use,
    // so the model dropdown / attachments / approval-mode selector are
    // identical across surfaces. On send success the provider adopts the freshly-allocated
    // chatId (`setChatIdFromHub`) and the sidebar is forced open (via
    // shadcn's `useSidebar`) so the streaming response surfaces in context.
    // The provider keeps the conversation alive across focus-area
    // navigation, so jumping into a focus area and coming back keeps the
    // transcript intact.
    const { setChatIdFromHub, live } = useWorkspaceAssistantChat();
    const { setOpen, setOpenMobile, isMobile } = useSidebar();
    const { pathname } = useLocation();
    const data = Route.useLoaderData();
    const badges: Record<NonNullable<FocusArea['badgeKey']>, number> = {
        projectsInbox: data.sessionFindOne.user?.admin?.adminProjectRequestInboxCount ?? 0,
        todosOpen: data.sessionFindOne.user?.admin?.adminStandaloneTaskOpenCount ?? 0,
    };

    return (
        <>
            {/* The workspace `<Header />` (logo + breadcrumbs + assistant
             * button) is mounted once at the layout (`workspace.tsx`), so the
             * hub renders only its own body content. */}
            <main className="flex-1 px-6 md:px-10 lg:px-16 max-w-6xl mx-auto w-full pb-16">
                <AssistantHero
                    locale={locale}
                    composer={
                        <WorkspaceChatComposer
                            locale={locale}
                            isLocked={live.isGenerating}
                            beginTurn={live.beginTurn}
                            endTurn={live.endTurn}
                            onMessageSent={(chatId) => {
                                setChatIdFromHub(chatId);
                                // Force the sidebar visible so the streaming
                                // reply is in view. On `<md` shadcn renders the
                                // sidebar as a Sheet, so we need the mobile
                                // setter; on `md+` it's the cookie-backed open
                                // state.
                                if (isMobile) setOpenMobile(true);
                                else setOpen(true);
                            }}
                            currentPagePath={pathname}
                            autoFocus
                        />
                    }
                />
                <FocusAreaGrid locale={locale} badges={badges} />
            </main>
        </>
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
            <h1 className="sr-only">{title[locale]}</h1>
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

function FocusAreaGrid({ locale, badges }: { locale: Locale; badges: Record<NonNullable<FocusArea['badgeKey']>, number> }) {
    return (
        <div className="flex flex-col gap-10 md:gap-12">
            {/* Personal focus areas — daily-use surfaces. Uniform tiling: 1
             * column on `sm`, 2 on `md`, 3 on `xl`, 4 on `2xl`. Jumping
             * straight to 4 columns at `lg` made each tile so narrow that
             * single German words ("Medizinisches", "Kompass") had to break
             * mid-word; the extra step at `xl` keeps tiles wide enough to
             * hold a one-word title next to the icon at typical laptop
             * widths, and the 4-column form only unlocks once the viewport
             * can actually accommodate it. */}
            <section aria-label={{ de: 'Persönliche Bereiche', en: 'Personal areas' }[locale]}>
                <FocusCardGrid locale={locale} areas={PERSONAL_FOCUS_AREAS} columnsClass="xl:grid-cols-3 2xl:grid-cols-4" badges={badges} />
            </section>
            {/* Public-site management — content that feeds cem-yilmaz.de.
             * Visited rarely (CV updates, scanning visitor chats), so it sits
             * below the personal grid as its own labelled cluster. A small
             * muted h2 + one-line subtitle marks the boundary without a hard
             * divider; the heading is visible (the grouping is the point) but
             * stays quiet so it doesn't compete with the personal tiles
             * above. */}
            <section aria-labelledby="workspace-public-site-heading">
                <div className="mb-3 flex flex-col gap-0.5">
                    <h2 id="workspace-public-site-heading" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {{ de: 'Öffentliche Website', en: 'Public site' }[locale]}
                    </h2>
                    <p className="text-sm text-muted-foreground/80">
                        {
                            { de: 'Inhalte, die auf der öffentlichen Seite erscheinen.', en: 'Content that appears on the public site.' }[
                                locale
                            ]
                        }
                    </p>
                </div>
                <FocusCardGrid locale={locale} areas={PUBLIC_SITE_FOCUS_AREAS} columnsClass="lg:grid-cols-2" badges={badges} />
            </section>
        </div>
    );
}

function FocusCardGrid({
    locale,
    areas,
    columnsClass,
    badges,
}: {
    locale: Locale;
    areas: ReadonlyArray<FocusArea>;
    columnsClass: string;
    badges: Record<NonNullable<FocusArea['badgeKey']>, number>;
}) {
    // `grid-auto-rows-fr` gives every row the same height, so a tile with a
    // long description doesn't push its row taller than the others — every
    // card in the section shares one uniform height. `h-full` on the `<Link>`
    // lets the `GlassCard`'s own `h-full` actually reach the grid cell.
    return (
        <div className={cn('grid gap-4 md:grid-cols-2 auto-rows-fr', columnsClass)}>
            {areas.map((area) => {
                const { to, icon: Icon } = area;
                const badge = area.badgeKey ? badges[area.badgeKey] : 0;
                const badgeAria = area.badgeKey ? BADGE_ARIA[area.badgeKey](badge, locale) : '';
                return (
                    <Link key={to} to={to} className="group h-full">
                        <GlassCard className="h-full transition-colors hover:bg-white/55 dark:hover:bg-white/8">
                            <CardContent className="flex h-full flex-col gap-1.5 py-5">
                                {/* Icon + title on one row, arrow tucked into
                                 * the top-right corner. The whole card is the
                                 * link, so the arrow is purely an affordance
                                 * cue — it brightens and translates on hover
                                 * instead of carrying its own "Öffnen" label,
                                 * which was redundant with the card itself
                                 * being clickable.
                                 *
                                 * `min-w-0` on the flex row and its text
                                 * child lets the title actually shrink; the
                                 * default `min-width: auto` on a flex item is
                                 * the content-width, which is why long German
                                 * words ("Medizinisches") were forcing a
                                 * mid-word character break. With `min-w-0` +
                                 * `hyphens-auto` + a `lang` attribute the
                                 * browser hyphenates on syllable boundaries
                                 * only when it truly can't fit, and Latin
                                 * one-word titles ("Todos", "Compass") stay
                                 * un-hyphenated because they still fit. */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-2 text-primary">
                                        <Icon className="size-5 shrink-0" />
                                        <CardTitle
                                            lang={locale}
                                            className="min-w-0 text-base md:text-lg leading-tight hyphens-auto break-words"
                                        >
                                            {area.title[locale]}
                                        </CardTitle>
                                        {badge > 0 ? (
                                            <span
                                                className="ml-1 shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary"
                                                aria-label={badgeAria}
                                            >
                                                {badge}
                                            </span>
                                        ) : null}
                                    </div>
                                    <ArrowUpRightIcon
                                        className="size-4 shrink-0 text-muted-foreground/60 transition-[color,transform] duration-200 ease-out group-hover:text-foreground group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0"
                                        aria-hidden
                                    />
                                </div>
                                <CardDescription className="text-sm leading-snug hyphens-auto" lang={locale}>
                                    {area.description[locale]}
                                </CardDescription>
                            </CardContent>
                        </GlassCard>
                    </Link>
                );
            })}
        </div>
    );
}
