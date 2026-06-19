import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRightIcon, BriefcaseIcon, CodeXmlIcon, MailIcon, MessageSquareIcon } from 'lucide-react';
import { CardContent, CardDescription, CardTitle } from '../../web/components/base/card';
import { GlassCard } from '../../web/components/GlassCard';
import { Header } from '../../web/components/Header';
import { HomePageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../web/hooks/useLocale';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';
import type { Locale } from '../../web/utils/locale';

const COPY = {
    tagline: { de: 'Entwickler · Bastler · Lebens-CTO', en: 'Developer · Builder · Life-CTO' },
    intro: {
        de: 'Hi, ich bin Cem. Diese Seite ist mein Portfolio und gleichzeitig meine private Plattform — Projekte, Notizen, KI-Assistent. Stöbere gerne herum.',
        en: 'Hi, I’m Cem. This site is my portfolio and at the same time my private platform — projects, notes, an AI assistant. Have a look around.',
    },
    sections: {
        projects: {
            title: { de: 'Projekte', en: 'Projects' },
            description: {
                de: 'Eine Auswahl von Dingen, die ich gebaut habe.',
                en: 'A selection of things I have built.',
            },
            cta: { de: 'Bald verfügbar', en: 'Coming soon' },
        },
        blog: {
            title: { de: 'Blog', en: 'Blog' },
            description: {
                de: 'Gelegentliche Notizen über Code, Tools und Produkte.',
                en: 'Occasional notes on code, tools, and products.',
            },
            cta: { de: 'Bald verfügbar', en: 'Coming soon' },
        },
        tools: {
            title: { de: 'Web-Tools', en: 'Web tools' },
            description: {
                de: 'Coole Web-Tools, die ich entdeckt habe und teilen möchte.',
                en: 'Cool web tools I have discovered and want to share.',
            },
            cta: { de: 'Bald verfügbar', en: 'Coming soon' },
        },
        chat: {
            title: { de: 'Frag mich was', en: 'Ask me anything' },
            description: {
                de: 'Ein KI-Assistent, der Fragen über mich und meine Arbeit beantwortet.',
                en: 'An AI assistant that answers questions about me and my work.',
            },
            cta: { de: 'Chat starten', en: 'Start chat' },
        },
    },
    footer: {
        contactHeading: { de: 'Kontakt', en: 'Get in touch' },
        legal: {
            impressum: { de: 'Impressum', en: 'Impressum' },
            datenschutz: { de: 'Datenschutz', en: 'Privacy' },
        },
    },
};

const SOCIAL_LINKS: ReadonlyArray<{
    href: string;
    label: { de: string; en: string };
    icon: typeof CodeXmlIcon;
}> = [
    // TODO: replace with real handles before launch.
    { href: 'https://github.com/cem-yilmaz', label: { de: 'GitHub', en: 'GitHub' }, icon: CodeXmlIcon },
    { href: 'https://www.linkedin.com/', label: { de: 'LinkedIn', en: 'LinkedIn' }, icon: BriefcaseIcon },
    { href: 'mailto:hello@cem-yilmaz.de', label: { de: 'E-Mail', en: 'Email' }, icon: MailIcon },
];

export const Route = createFileRoute('/{-$locale}/')({
    loader: () => routeLoaderGraphqlClient(HomePageDocument)(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: { de: 'Cem Yilmaz — Portfolio & Plattform', en: 'Cem Yilmaz — Portfolio & Platform' }[locale],
            description: COPY.intro[locale],
            path: '/',
            locale,
            webPageUrl: webPageUrlGet(),
        });
    },
    component: HomePage,
});

function HomePage() {
    const locale = useLocale();

    return (
        <div className="min-h-screen flex flex-col overflow-x-clip">
            <Header />
            <main className="flex-1 px-6 md:px-10 lg:px-16 max-w-6xl mx-auto w-full">
                <Hero locale={locale} />
                <SectionGrid locale={locale} />
            </main>
            <Footer locale={locale} />
        </div>
    );
}

function Hero({ locale }: { locale: Locale }) {
    return (
        <section className="py-12 md:py-20">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">Cem Yilmaz</h1>
            <p className="mt-4 text-lg md:text-xl text-muted-foreground">{COPY.tagline[locale]}</p>
            <p className="mt-6 max-w-2xl text-base md:text-lg leading-relaxed">{COPY.intro[locale]}</p>
        </section>
    );
}

function SectionGrid({ locale }: { locale: Locale }) {
    return (
        <section className="grid gap-4 md:grid-cols-2 pb-16">
            <ComingSoonCard
                title={COPY.sections.projects.title[locale]}
                description={COPY.sections.projects.description[locale]}
                cta={COPY.sections.projects.cta[locale]}
            />
            <ComingSoonCard
                title={COPY.sections.blog.title[locale]}
                description={COPY.sections.blog.description[locale]}
                cta={COPY.sections.blog.cta[locale]}
            />
            <ComingSoonCard
                title={COPY.sections.tools.title[locale]}
                description={COPY.sections.tools.description[locale]}
                cta={COPY.sections.tools.cta[locale]}
            />
            <ChatCard locale={locale} />
        </section>
    );
}

function ComingSoonCard({ title, description, cta }: { title: string; description: string; cta: string }) {
    return (
        <GlassCard className="py-6 opacity-70">
            <CardContent className="flex flex-col gap-2">
                <CardTitle className="text-xl">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
                <span className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">{cta}</span>
            </CardContent>
        </GlassCard>
    );
}

function ChatCard({ locale }: { locale: Locale }) {
    return (
        <Link to="/{-$locale}/chat" search={{ chatId: undefined }} className="group">
            <GlassCard className="h-full py-6 transition-colors hover:bg-white/55 dark:hover:bg-white/8">
                <CardContent className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-primary">
                        <MessageSquareIcon className="size-5" />
                        <CardTitle className="text-xl">{COPY.sections.chat.title[locale]}</CardTitle>
                    </div>
                    <CardDescription>{COPY.sections.chat.description[locale]}</CardDescription>
                    <span className="mt-3 inline-flex items-center gap-2 text-sm font-medium group-hover:gap-3 transition-all">
                        {COPY.sections.chat.cta[locale]}
                        <ArrowRightIcon className="size-4" />
                    </span>
                </CardContent>
            </GlassCard>
        </Link>
    );
}

function Footer({ locale }: { locale: Locale }) {
    return (
        <footer className="border-t mt-12">
            <div className="px-6 md:px-10 lg:px-16 max-w-6xl mx-auto w-full py-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-sm font-medium text-muted-foreground">{COPY.footer.contactHeading[locale]}</h2>
                    <ul className="mt-3 flex gap-4">
                        {SOCIAL_LINKS.map(({ href, label, icon: Icon }) => (
                            <li key={href}>
                                <a
                                    href={href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 text-sm hover:text-primary"
                                >
                                    <Icon className="size-4" />
                                    {label[locale]}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
                <nav className="flex gap-4 text-sm text-muted-foreground">
                    <Link to="/{-$locale}/impressum" className="hover:text-foreground">
                        {COPY.footer.legal.impressum[locale]}
                    </Link>
                    <Link to="/{-$locale}/datenschutz" className="hover:text-foreground">
                        {COPY.footer.legal.datenschutz[locale]}
                    </Link>
                </nav>
            </div>
        </footer>
    );
}
