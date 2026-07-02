import { createFileRoute, Link } from '@tanstack/react-router';
import { HeadphonesIcon, PlayCircleIcon, PlusIcon, TvIcon } from 'lucide-react';
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

type ChannelRow = NonNullable<
    NonNullable<NonNullable<GqlCWorkspaceSoftwarePageQuery['currentSession']['user']>['admin']>['media']
>['channelsByTopic'][number];

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
    const channels = data.currentSession.user?.admin?.media.channelsByTopic ?? [];

    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-5xl mx-auto w-full py-12 leading-relaxed space-y-10">
            <header>
                <h1 className="text-2xl font-semibold tracking-tight">{title[locale]}</h1>
                <p className="mt-2 text-sm text-muted-foreground">{description[locale]}</p>
            </header>

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
