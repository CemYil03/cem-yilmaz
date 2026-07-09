import { createFileRoute, Link } from '@tanstack/react-router';
import { ExternalLinkIcon, HeadphonesIcon, PlayCircleIcon, PlusIcon, TvIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../../web/components/base/avatar';
import { GlassCard } from '../../../web/components/GlassCard';
import type { GqlCWorkspaceSoftwarePageQuery } from '../../../web/graphql/generated';
import { WorkspaceSoftwarePageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import type { Locale } from '../../../web/utils/locale';
import { localeFromParam } from '../../../web/utils/locale';

// Software workspace area. Placeholder for future architecture notes / code
// snippets / library tracker, but already earns its keep with one live
// cross-view: "Favourite tech YouTubers" reads
// `Admin.media.channelsByTopic("tech")` so the channels Cem catalogues in
// `/workspace/media` surface here without duplicating data. The topic string
// is the referent — no FK, no join table — matching the
// `docs/architecture/content-model.md` posture on cross-section reads.

const title = { de: 'Softwareentwicklung & Architektur', en: 'Software development & architecture' };
const description = { de: 'Code, Architektur-Notizen, Werkzeuge.', en: 'Code, architecture notes, tools.' };

type TechnologyQuickLink = {
    name: string;
    category: { de: string; en: string };
    description: { de: string; en: string };
    url: string;
    logoSlug: string;
    logoAlt: string;
};

const TECHNOLOGY_QUICK_LINKS = [
    {
        name: 'TypeScript',
        category: { de: 'Sprache', en: 'Language' },
        description: { de: 'Typisierte App- und Serverlogik.', en: 'Typed app and server logic.' },
        url: 'https://www.typescriptlang.org/docs/',
        logoSlug: 'typescript',
        logoAlt: 'TypeScript logo',
    },
    {
        name: 'React',
        category: { de: 'UI', en: 'UI' },
        description: { de: 'Komponentenmodell für die Oberfläche.', en: 'Component model for the interface.' },
        url: 'https://react.dev/',
        logoSlug: 'react',
        logoAlt: 'React logo',
    },
    {
        name: 'TanStack Router',
        category: { de: 'Routing', en: 'Routing' },
        description: { de: 'Typsichere Routen und Loader.', en: 'Type-safe routes and loaders.' },
        url: 'https://tanstack.com/router/latest',
        logoSlug: 'tanstack',
        logoAlt: 'TanStack logo',
    },
    {
        name: 'Vite',
        category: { de: 'Build', en: 'Build' },
        description: { de: 'Dev-Server und Produktions-Builds.', en: 'Dev server and production builds.' },
        url: 'https://vite.dev/',
        logoSlug: 'vite',
        logoAlt: 'Vite logo',
    },
    {
        name: 'Tailwind CSS',
        category: { de: 'Styling', en: 'Styling' },
        description: { de: 'Layout, Tokens und UI-Zustände.', en: 'Layout, tokens, and UI states.' },
        url: 'https://tailwindcss.com/docs',
        logoSlug: 'tailwindcss',
        logoAlt: 'Tailwind CSS logo',
    },
    {
        name: 'Node.js',
        category: { de: 'Runtime', en: 'Runtime' },
        description: { de: 'Server-Runtime für die App.', en: 'Server runtime for the app.' },
        url: 'https://nodejs.org/en/learn',
        logoSlug: 'nodedotjs',
        logoAlt: 'Node.js logo',
    },
    {
        name: 'GraphQL',
        category: { de: 'API', en: 'API' },
        description: { de: 'SDL-first API-Schicht.', en: 'SDL-first API layer.' },
        url: 'https://graphql.org/learn/',
        logoSlug: 'graphql',
        logoAlt: 'GraphQL logo',
    },
    {
        name: 'Apollo Server',
        category: { de: 'API', en: 'API' },
        description: { de: 'GraphQL-Ausführung auf dem Server.', en: 'GraphQL execution on the server.' },
        url: 'https://www.apollographql.com/docs/apollo-server',
        logoSlug: 'apollographql',
        logoAlt: 'Apollo GraphQL logo',
    },
    {
        name: 'PostgreSQL',
        category: { de: 'Datenbank', en: 'Database' },
        description: { de: 'Persistenz, Pub/Sub und Jobs.', en: 'Persistence, pub/sub, and jobs.' },
        url: 'https://www.postgresql.org/docs/',
        logoSlug: 'postgresql',
        logoAlt: 'PostgreSQL logo',
    },
    {
        name: 'Drizzle ORM',
        category: { de: 'Datenbank', en: 'Database' },
        description: { de: 'Typsichere SQL-Queries und Schema.', en: 'Type-safe SQL queries and schema.' },
        url: 'https://orm.drizzle.team/docs/overview',
        logoSlug: 'drizzle',
        logoAlt: 'Drizzle ORM logo',
    },
    {
        name: 'Vercel AI SDK',
        category: { de: 'KI', en: 'AI' },
        description: { de: 'Streaming, Tools und Agenten.', en: 'Streaming, tools, and agents.' },
        url: 'https://ai-sdk.dev/docs',
        logoSlug: 'vercel',
        logoAlt: 'Vercel logo',
    },
    {
        name: 'Playwright',
        category: { de: 'Testing', en: 'Testing' },
        description: { de: 'Browser-Automation und UI-Captures.', en: 'Browser automation and UI captures.' },
        url: 'https://playwright.dev/docs/intro',
        logoSlug: 'playwright',
        logoAlt: 'Playwright logo',
    },
] as const satisfies ReadonlyArray<TechnologyQuickLink>;

type ChannelRow = NonNullable<
    NonNullable<NonNullable<GqlCWorkspaceSoftwarePageQuery['sessionFindOne']['user']>['admin']>['adminMediaFindOne']
>['adminMediaChannelFindMany'][number];

export const Route = createFileRoute('/{-$locale}/workspace/software')({
    loader: () => routeLoaderGraphqlClient(WorkspaceSoftwarePageDocument)(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: title[locale],
            description: description[locale],
            path: '/workspace/software',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: SoftwareArea,
});

function SoftwareArea() {
    const locale = useLocale();
    const data = Route.useLoaderData();
    const channels = data.sessionFindOne.user?.admin?.adminMediaFindOne.adminMediaChannelFindMany ?? [];

    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-5xl mx-auto w-full py-12 leading-relaxed space-y-10">
            <header>
                <h1 className="text-2xl font-semibold tracking-tight">{title[locale]}</h1>
                <p className="mt-2 text-sm text-muted-foreground">{description[locale]}</p>
            </header>

            <section aria-labelledby="technology-links-heading" className="space-y-4">
                <div className="max-w-2xl space-y-2">
                    <h2 id="technology-links-heading" className="text-lg font-medium">
                        {{ de: 'Technologie-Quicklinks', en: 'Technology quick links' }[locale]}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Direkte Einstiege in die Dokumentation der Sprachen, Frameworks, Libraries und Plattformen, die diese Site tragen.',
                                en: 'Direct jumps into the docs for the languages, frameworks, libraries, and platforms that power this site.',
                            }[locale]
                        }
                    </p>
                </div>
                <TechnologyQuickLinkGrid locale={locale} />
            </section>

            <section aria-labelledby="tech-youtubers-heading" className="space-y-4">
                <div className="flex items-baseline justify-between gap-4">
                    <h2 id="tech-youtubers-heading" className="text-lg font-medium">
                        {{ de: 'Lieblings-Tech-Kanäle', en: 'Favourite tech channels' }[locale]}
                    </h2>
                    <Link
                        to="/{-$locale}/workspace/media"
                        params={{ locale: locale === 'de' ? undefined : locale }}
                        search={{ tab: 'channels' } as never}
                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
                    >
                        {{ de: 'In Medien bearbeiten →', en: 'Edit in Media →' }[locale]}
                    </Link>
                </div>
                {channels.length === 0 ? <EmptyChannels locale={locale} /> : <ChannelGrid channels={channels} />}
            </section>

            <section className="pt-2">
                <p className="text-sm text-muted-foreground">
                    {
                        {
                            de: 'Weitere Inhalte kommen hier hin: Architektur-Notizen, gespeicherte Snippets, Library-Beobachtungen. Kanäle werden in Medien gepflegt und über das Topic “tech” hier eingeblendet.',
                            en: 'More coming here: architecture notes, saved snippets, library watchlist. Channels are managed in Media and surfaced here via the "tech" topic.',
                        }[locale]
                    }
                </p>
            </section>
        </main>
    );
}

function TechnologyQuickLinkGrid({ locale }: { locale: Locale }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TECHNOLOGY_QUICK_LINKS.map((technology) => (
                <TechnologyQuickLinkCard key={technology.name} technology={technology} locale={locale} />
            ))}
        </div>
    );
}

function TechnologyQuickLinkCard({ technology, locale }: { technology: TechnologyQuickLink; locale: Locale }) {
    return (
        <a
            href={technology.url}
            target="_blank"
            rel="noreferrer"
            className="group focus-visible:ring-2 focus-visible:ring-ring rounded-xl outline-none"
            aria-label={`${technology.name}: ${technology.description[locale]}`}
        >
            <GlassCard className="flex h-full items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40 active:bg-muted/60">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-white shadow-sm dark:bg-white/90">
                    <img
                        src={`https://cdn.simpleicons.org/${technology.logoSlug}`}
                        alt={technology.logoAlt}
                        className="size-7 object-contain"
                        loading="lazy"
                    />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{technology.name}</span>
                            <span className="mt-0.5 block text-xs font-medium text-primary">{technology.category[locale]}</span>
                        </span>
                        <ExternalLinkIcon
                            className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                            aria-hidden="true"
                        />
                    </span>
                    <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">{technology.description[locale]}</span>
                </span>
            </GlassCard>
        </a>
    );
}

function ChannelGrid({ channels }: { channels: ReadonlyArray<ChannelRow> }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {channels.map((channel) => (
                <ChannelCard key={channel.channelId} channel={channel} />
            ))}
        </div>
    );
}

function ChannelCard({ channel }: { channel: ChannelRow }) {
    return (
        <a
            href={channel.url}
            target="_blank"
            rel="noreferrer"
            className="focus-visible:ring-2 focus-visible:ring-ring rounded-xl outline-none"
            aria-label={channel.name}
        >
            <GlassCard className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
                <Avatar className="size-10 shrink-0">
                    {channel.avatarUrl ? <AvatarImage src={channel.avatarUrl} alt="" /> : null}
                    <AvatarFallback>{initialsFrom(channel.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-sm font-medium truncate">
                        <PlatformIcon platform={channel.platform} />
                        <span className="truncate">{channel.name}</span>
                    </div>
                    {channel.handle ? <div className="text-xs text-muted-foreground truncate">{channel.handle}</div> : null}
                </div>
            </GlassCard>
        </a>
    );
}

function PlatformIcon({ platform }: { platform: ChannelRow['platform'] }) {
    const iconClasses = 'size-3.5 text-muted-foreground shrink-0';
    switch (platform) {
        case 'youtube':
            return <PlayCircleIcon className={iconClasses} aria-hidden="true" />;
        case 'twitch':
            return <TvIcon className={iconClasses} aria-hidden="true" />;
        case 'podcast':
            return <HeadphonesIcon className={iconClasses} aria-hidden="true" />;
        default:
            return null;
    }
}

function EmptyChannels({ locale }: { locale: Locale }) {
    return (
        <GlassCard className="px-5 py-6 flex items-start gap-3 text-sm text-muted-foreground">
            <PlusIcon className="size-4 mt-0.5 shrink-0" aria-hidden="true" />
            <p>
                {
                    {
                        de: 'Noch keine Tech-Kanäle. Trage einen Kanal in Medien ein und markiere ihn mit dem Topic “tech” — er erscheint dann hier.',
                        en: 'No tech channels yet. Add a channel in Media and tag it with the "tech" topic — it will appear here.',
                    }[locale]
                }
            </p>
        </GlassCard>
    );
}

function initialsFrom(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
