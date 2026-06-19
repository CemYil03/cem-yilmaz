import { createFileRoute, Link } from '@tanstack/react-router';
import { useLocale } from '../../web/hooks/useLocale';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';

const PLACEHOLDER = {
    name: 'Cem Yilmaz',
    addressLines: ['Speyerer Straße 60', '67373 Dudenhofen', 'Deutschland'],
    email: 'yilmaz.cem.2603@gmail.com',
    phone: '+49 15256207005',
};

export const Route = createFileRoute('/{-$locale}/impressum')({
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: { de: 'Impressum', en: 'Imprint' }[locale],
            description: {
                de: 'Verantwortlich gemäß § 5 TMG.',
                en: 'Provider information per § 5 TMG (German Telemedia Act).',
            }[locale],
            path: '/impressum',
            locale,
            webPageUrl: webPageUrlGet(),
        });
    },
    component() {
        const locale = useLocale();
        const headings =
            locale === 'de'
                ? { back: '← Zur Startseite', title: 'Impressum', responsible: 'Angaben gemäß § 5 TMG', contact: 'Kontakt' }
                : { back: '← Back to home', title: 'Imprint', responsible: 'Provider information per § 5 TMG', contact: 'Contact' };

        return (
            <main className="px-6 md:px-10 lg:px-16 max-w-3xl mx-auto w-full py-12">
                <Link to="/{-$locale}" className="text-sm text-muted-foreground hover:text-foreground">
                    {headings.back}
                </Link>
                <h1 className="mt-6 text-3xl font-bold tracking-tight">{headings.title}</h1>

                <section className="mt-8">
                    <h2 className="text-lg font-semibold">{headings.responsible}</h2>
                    <address className="mt-2 not-italic leading-relaxed">
                        {PLACEHOLDER.name}
                        <br />
                        {PLACEHOLDER.addressLines.map((line) => (
                            <span key={line}>
                                {line}
                                <br />
                            </span>
                        ))}
                    </address>
                </section>

                <section className="mt-6">
                    <h2 className="text-lg font-semibold">{headings.contact}</h2>
                    <p className="mt-2 leading-relaxed">
                        {locale === 'de' ? 'E-Mail' : 'Email'}: <a href={`mailto:${PLACEHOLDER.email}`}>{PLACEHOLDER.email}</a>
                        <br />
                        {locale === 'de' ? 'Telefon' : 'Phone'}: {PLACEHOLDER.phone}
                    </p>
                </section>

                <section className="mt-8 text-sm text-muted-foreground">
                    {locale === 'de'
                        ? 'Hinweis: Diese Seite enthält Platzhalter und muss vor dem Live-Gang mit den tatsächlichen Kontaktdaten gefüllt werden.'
                        : 'Note: this page contains placeholders and must be filled with the real contact data before launch.'}
                </section>
            </main>
        );
    },
});
