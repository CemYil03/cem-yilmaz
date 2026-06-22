import { createFileRoute } from '@tanstack/react-router';
import { Header } from '../../web/components/Header';
import { personalInfo } from '../../web/content/personalInfo';
import { useLocale } from '../../web/hooks/useLocale';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';

// Provider information per § 5 TMG (German Telemedia Act). All values are
// sourced from `personalInfo` so the legal page stays in sync with the rest of
// the site. The street + city below match Cem's actual residence — change them
// in `personalInfo` (and add the street if a future move requires it), not
// here.

const IMPRESSUM_STREET = 'Speyerer Straße 60';

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
                ? { title: 'Impressum', responsible: 'Angaben gemäß § 5 TMG', contact: 'Kontakt' }
                : { title: 'Imprint', responsible: 'Provider information per § 5 TMG', contact: 'Contact' };

        const country = locale === 'de' ? 'Deutschland' : 'Germany';
        const cityLine = `${personalInfo.residence.postalCode} ${personalInfo.residence.city}`;
        const primaryEmail = personalInfo.contact.emails[0] ?? '';

        return (
            <div className="min-h-screen flex flex-col overflow-x-clip">
                <Header />
                <main className="flex-1 px-6 md:px-10 lg:px-16 max-w-3xl mx-auto w-full py-12">
                    <h1 className="mt-6 text-3xl font-bold tracking-tight">{headings.title}</h1>

                    <section className="mt-8">
                        <h2 className="text-lg font-semibold">{headings.responsible}</h2>
                        <address className="mt-2 not-italic leading-relaxed">
                            {personalInfo.fullName}
                            <br />
                            {IMPRESSUM_STREET}
                            <br />
                            {cityLine}
                            <br />
                            {country}
                        </address>
                    </section>

                    <section className="mt-6">
                        <h2 className="text-lg font-semibold">{headings.contact}</h2>
                        <p className="mt-2 leading-relaxed">
                            {locale === 'de' ? 'E-Mail' : 'Email'}: <a href={`mailto:${primaryEmail}`}>{primaryEmail}</a>
                            <br />
                            {locale === 'de' ? 'Telefon' : 'Phone'}:{' '}
                            <a href={`tel:${personalInfo.contact.phone.replace(/\s+/g, '')}`}>{personalInfo.contact.phone}</a>
                        </p>
                    </section>
                </main>
            </div>
        );
    },
});
