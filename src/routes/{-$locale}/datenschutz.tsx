import { createFileRoute, Link } from '@tanstack/react-router';
import { Header } from '../../web/components/Header';
import { useLocale } from '../../web/hooks/useLocale';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';

// GDPR notice covering what the site actually does today: a cookie-based
// session, the visitor AI chat that calls Google Gemini (with optional file
// attachments), outbound email and OTP delivery via Resend for the chat's
// contact tools, the project-request channel that backs those tools, and
// standard server logs. Extend this page whenever the data-processing
// surface grows — for example when analytics, a contact form, or a
// third-party embed lands.

export const Route = createFileRoute('/{-$locale}/datenschutz')({
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: { de: 'Datenschutz', en: 'Privacy' }[locale],
            description: {
                de: 'Hinweise zur Verarbeitung personenbezogener Daten auf cem-yilmaz.de.',
                en: 'How personal data is handled on cem-yilmaz.de.',
            }[locale],
            path: '/datenschutz',
            locale,
            webPageUrl: webPageUrlGet(),
        });
    },
    component: DatenschutzPage,
});

function DatenschutzPage() {
    const locale = useLocale();
    return (
        <div className="min-h-screen flex flex-col overflow-x-clip">
            <Header />
            <main className="flex-1 px-6 md:px-10 lg:px-16 max-w-3xl mx-auto w-full py-12 leading-relaxed">
                {locale === 'de' ? <PageDe /> : <PageEn />}
            </main>
        </div>
    );
}

function PageDe() {
    return (
        <>
            <h1 className="mt-6 text-3xl font-bold tracking-tight">Datenschutz</h1>

            <h2 className="mt-8 text-lg font-semibold">Verantwortlicher</h2>
            <p className="mt-2">
                Verantwortlich für die Datenverarbeitung auf cem-yilmaz.de ist Cem Yilmaz. Die vollständigen Kontaktdaten finden sich im{' '}
                <Link to="/{-$locale}/impressum" className="underline">
                    Impressum
                </Link>
                .
            </p>

            <h2 className="mt-6 text-lg font-semibold">Hosting</h2>
            <p className="mt-2">
                Die Seite wird bei der IONOS SE, Elgendorfer Str. 57, 56410 Montabaur, Deutschland gehostet. Mit IONOS besteht ein
                Auftragsverarbeitungsvertrag nach Art. 28 DSGVO. Sämtliche Daten (Datenbank, Datei-Anhänge, Server-Logs) werden auf Servern
                in Deutschland verarbeitet.
            </p>

            <h2 className="mt-6 text-lg font-semibold">Sitzungs-Cookie</h2>
            <p className="mt-2">
                Beim ersten Aufruf wird ein technisch notwendiges Cookie gesetzt, das eine zufällige Sitzungs-ID enthält. Es wird benötigt,
                damit der KI-Chat zwischen einzelnen Anfragen den Gesprächskontext halten kann. Es enthält keine personenbezogenen Daten und
                wird nicht für Tracking oder Werbung verwendet. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse am
                Betrieb der Seite). Das Cookie hat eine Gültigkeit von 12 Monaten ab dem letzten Aufruf und wird vom Browser danach
                gelöscht. Die zugehörige Sitzungs-Zeile in der Datenbank dieser Seite wird derzeit nicht automatisch entfernt; sie wird auf
                Anfrage gelöscht (siehe &bdquo;Ihre Rechte&ldquo;) und im Übrigen entfernt, sobald ihr Verarbeitungszweck endgültig
                entfallen ist.
            </p>

            <h2 className="mt-6 text-lg font-semibold">KI-Chat (&bdquo;Frag mich was&ldquo;)</h2>
            <p className="mt-2">
                Wer den Chat auf dieser Seite nutzt, sendet seine Eingaben an die Google Ireland Limited (Gordon House, Barrow Street,
                Dublin 4, Irland) als Anbieter der Generative Language API, damit das Modell eine Antwort erzeugen kann. Google verarbeitet
                Daten auch in den USA; die Übermittlung erfolgt auf Grundlage der EU-Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO).
                Der Zugriff erfolgt über die kostenpflichtige Generative Language API (Paid Tier): Google erklärt in den
                API-Nutzungsbedingungen, dass Eingaben (einschließlich Systemanweisungen, gecachter Inhalte und beigefügter Dateien) und
                Antworten in diesem Tarif <em>nicht</em> zum Training der Google-Modelle verwendet werden, sondern lediglich für einen
                begrenzten Zeitraum zur Sicherheit und Missbrauchsprävention vorgehalten werden. Eingaben und Antworten werden zusätzlich in
                der Datenbank dieser Seite gespeichert, um den Gesprächsverlauf darzustellen. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.
                Eine automatische Löschung älterer Chats ist derzeit nicht eingerichtet; Chats werden auf Anfrage gelöscht (siehe
                &bdquo;Ihre Rechte&ldquo;) und im Übrigen entfernt, sobald ihr Verarbeitungszweck endgültig entfallen ist. Bitte keine
                personenbezogenen oder vertraulichen Daten in den Chat eingeben.
            </p>

            <h2 className="mt-6 text-lg font-semibold">Datei-Anhänge im Chat</h2>
            <p className="mt-2">
                Optional können dem Chat Dateien angehängt werden (z. B. Bilder oder PDFs). Die Dateien werden in der Datenbank dieser Seite
                gespeichert und für die Antwortgenerierung an die Google Generative Language API übermittelt. Die Speicherdauer entspricht
                derjenigen des Chats; mit Löschung der Sitzung werden auch die zugehörigen Anhänge entfernt. Rechtsgrundlage: Art. 6 Abs. 1
                lit. f DSGVO.
            </p>

            <h2 className="mt-6 text-lg font-semibold">Kontaktaufnahme per E-Mail (&bdquo;sendEmailToCem&ldquo;)</h2>
            <p className="mt-2">
                Wenn der KI-Chat auf Bitten des Besuchers eine Nachricht an Cem versendet, werden die im Chat erhobenen Angaben (Name bzw.
                Antwort-E-Mail-Adresse, Betreff, Nachrichtentext) per E-Mail an den Betreiber übermittelt. Versand-Dienstleister ist die
                Resend, Inc., 2261 Market Street #4667, San Francisco, CA 94114, USA. Resend verarbeitet die Inhalte in den USA; die
                Übermittlung erfolgt auf Grundlage der EU-Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO). Mit Resend besteht ein
                Auftragsverarbeitungsvertrag nach Art. 28 DSGVO, der gemäß den Vertragsbedingungen von Resend automatisch mit
                Vertragsschluss in Kraft tritt. Resend setzt seinerseits Unterauftragsverarbeiter mit Sitz in den USA ein (u. a. Amazon Web
                Services, Cloudflare, Google, Vercel, Supabase); die jeweils aktuelle Liste ist unter{' '}
                <a href="https://resend.com/legal/subprocessors" target="_blank" rel="noopener noreferrer" className="underline">
                    resend.com/legal/subprocessors
                </a>{' '}
                einsehbar. Wie lange Resend Versand-Metadaten (Empfänger, Zeitpunkt, Zustellstatus) für Zustellanalyse vorhält, ist in der
                Datenschutzerklärung von Resend nicht ausdrücklich angegeben; nähere Auskünfte erteilt Resend auf Anfrage. Rechtsgrundlage
                für die Übermittlung an Cem: Art. 6 Abs. 1 lit. f DSGVO (Beantwortung von Kontaktanfragen). Die übermittelten Inhalte
                bleiben zusätzlich Teil des Chat-Verlaufs in der Datenbank dieser Seite und teilen dessen Verarbeitung.
            </p>

            <h2 className="mt-6 text-lg font-semibold">Projektanfragen über den Chat</h2>
            <p className="mt-2">
                Beschreibt ein Besucher im Chat ein Projekt-, Freelance- oder Geschäftsanliegen, kann der Assistent eine strukturierte
                Projektanfrage anlegen. Verarbeitet werden dabei: Name, E-Mail-Adresse, optional Unternehmen, Projekttyp, Beschreibung,
                optional Budget und Zeitrahmen sowie eine Verknüpfung zum zugehörigen Chat. Diese Angaben werden in der Datenbank dieser
                Seite in der Tabelle <code>ProjectRequests</code> gespeichert und nach erfolgreicher Verifikation per E-Mail über Resend an
                Cem übermittelt. Zweck: Beantwortung und Bearbeitung der konkreten Anfrage. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO
                (Anbahnung eines Vertrags auf Anfrage der betroffenen Person) sowie ergänzend Art. 6 Abs. 1 lit. f DSGVO. Eine automatische
                Löschung ist derzeit nicht eingerichtet; Projektanfragen werden auf Anfrage gelöscht (siehe &bdquo;Ihre Rechte&ldquo;) und
                im Übrigen entfernt, sobald ihr Verarbeitungszweck endgültig entfallen ist. Eine längere Speicherung erfolgt nur, soweit
                gesetzliche Aufbewahrungspflichten (z. B. § 257 HGB, § 147 AO) dies erfordern.
            </p>

            <h2 className="mt-6 text-lg font-semibold">E-Mail-Verifikation (Einmal-Code)</h2>
            <p className="mt-2">
                Vor Übermittlung einer Projektanfrage an Cem wird die angegebene E-Mail-Adresse durch einen einmaligen 6-stelligen Code
                bestätigt, der per E-Mail über Resend an den Besucher gesendet wird. In der Datenbank wird lediglich ein Hash des Codes
                (SHA-256 mit zufälligem Salt pro Anfrage), die Anzahl fehlgeschlagener Versuche sowie ein Ablaufzeitpunkt (10 Minuten)
                gespeichert; der Code im Klartext wird nicht gespeichert. Zweck: Schutz vor Missbrauch, Tippfehlern und
                Identitätsvortäuschung. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Integrität der
                Kontaktanfragen). Nach erfolgreicher Verifikation bzw. Ablauf wird der Code-Hash nicht mehr ausgewertet; er teilt die
                Speicherung der zugehörigen Projektanfrage.
            </p>

            <h2 className="mt-6 text-lg font-semibold">Server-Logs</h2>
            <p className="mt-2">
                Beim Aufruf der Seite werden die üblichen technischen Daten verarbeitet (IP-Adresse, User-Agent, Zeitpunkt, abgerufene
                Ressource), um den Betrieb sicherzustellen und Fehler zu diagnostizieren. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO. Die
                Logs werden im Rahmen der Standard-Konfiguration der eingesetzten Container-Plattform (Docker/Coolify) vorgehalten und
                regelmäßig durch deren Rotation überschrieben; eine starre Löschfrist ist nicht gesetzt. Anwendungs-Logs in der Datenbank
                dieser Seite werden auf Anfrage gelöscht und im Übrigen entfernt, sobald ihr Verarbeitungszweck endgültig entfallen ist.
            </p>

            <h2 className="mt-6 text-lg font-semibold">Ihre Rechte</h2>
            <p className="mt-2">
                Sie haben jederzeit das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der
                Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) sowie ein Widerspruchsrecht gegen Verarbeitungen auf Grundlage
                berechtigter Interessen (Art. 21 DSGVO). Anfragen richten Sie bitte an die im Impressum genannten Kontaktdaten.
            </p>
            <p className="mt-2">
                Daneben besteht ein Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde. Zuständig ist der Landesbeauftragte für den
                Datenschutz und die Informationsfreiheit Rheinland-Pfalz, Hintere Bleiche 34, 55116 Mainz.
            </p>
        </>
    );
}

function PageEn() {
    return (
        <>
            <h1 className="mt-6 text-3xl font-bold tracking-tight">Privacy</h1>

            <h2 className="mt-8 text-lg font-semibold">Controller</h2>
            <p className="mt-2">
                The controller for data processing on cem-yilmaz.de is Cem Yilmaz. Full contact details are in the{' '}
                <Link to="/{-$locale}/impressum" className="underline">
                    Imprint
                </Link>
                .
            </p>

            <h2 className="mt-6 text-lg font-semibold">Hosting</h2>
            <p className="mt-2">
                The site is hosted by IONOS SE, Elgendorfer Str. 57, 56410 Montabaur, Germany. A data-processing agreement under Art. 28
                GDPR is in place with IONOS. All data (database, file attachments, server logs) is processed on servers located in Germany.
            </p>

            <h2 className="mt-6 text-lg font-semibold">Session cookie</h2>
            <p className="mt-2">
                On first visit, a technically necessary cookie is set containing a random session id. The chat needs it to keep the
                conversation context across requests. It contains no personal data and is not used for tracking or advertising. Legal basis:
                Art. 6(1)(f) GDPR (legitimate interest in operating the site). The cookie itself is valid for 12 months after the last visit
                and is deleted by the browser thereafter. The corresponding session row in this site&rsquo;s database is currently not
                removed automatically; it is deleted on request (see &ldquo;Your rights&rdquo;) and otherwise once its processing purpose
                has finally ceased.
            </p>

            <h2 className="mt-6 text-lg font-semibold">AI chat (&ldquo;Ask me anything&rdquo;)</h2>
            <p className="mt-2">
                Using the chat on this site sends your input to Google Ireland Limited (Gordon House, Barrow Street, Dublin 4, Ireland) as
                the provider of the Generative Language API so the model can produce a response. Google also processes data in the United
                States; the transfer relies on the EU Standard Contractual Clauses (Art. 46(2)(c) GDPR). Access is via the paid tier of the
                Generative Language API: per Google&rsquo;s API terms, prompts (including system instructions, cached content and attached
                files) and responses are <em>not</em> used to improve Google&rsquo;s products on this tier and are retained only for a
                limited period to detect abuse and meet legal obligations. Inputs and replies are also stored in this site&rsquo;s database
                to display the conversation. Legal basis: Art. 6(1)(f) GDPR. There is currently no automated deletion of older chats; chats
                are deleted on request (see &ldquo;Your rights&rdquo;) and otherwise once their processing purpose has finally ceased.
                Please do not enter personal or confidential data into the chat.
            </p>

            <h2 className="mt-6 text-lg font-semibold">Chat file attachments</h2>
            <p className="mt-2">
                You may optionally attach files (e.g. images or PDFs) to the chat. Attachments are stored in this site&rsquo;s database and
                forwarded to the Google Generative Language API to generate the response. Retention follows the chat itself; deleting the
                session also removes the associated attachments. Legal basis: Art. 6(1)(f) GDPR.
            </p>

            <h2 className="mt-6 text-lg font-semibold">Outbound email (&ldquo;sendEmailToCem&rdquo;)</h2>
            <p className="mt-2">
                When the AI chat sends a message to Cem on the visitor&rsquo;s behalf, the fields collected during the chat (name or
                reply-to address, subject, message body) are delivered as an email. The sending service is Resend, Inc., 2261 Market Street
                #4667, San Francisco, CA 94114, USA. Resend processes the content in the United States; the transfer relies on the EU
                Standard Contractual Clauses (Art. 46(2)(c) GDPR). A processing agreement under Art. 28 GDPR is in place with Resend; per
                Resend&rsquo;s terms it is automatically concluded together with the main contract. Resend itself uses sub-processors based
                in the USA (including Amazon Web Services, Cloudflare, Google, Vercel and Supabase); the current list is published at{' '}
                <a href="https://resend.com/legal/subprocessors" target="_blank" rel="noopener noreferrer" className="underline">
                    resend.com/legal/subprocessors
                </a>
                . How long Resend retains delivery metadata (recipient, timestamp, delivery status) for deliverability analysis is not
                expressly stated in Resend&rsquo;s privacy policy; Resend will provide details on request. Legal basis for the transfer to
                Cem: Art. 6(1)(f) GDPR (handling contact requests). The message content also remains part of the chat transcript in this
                site&rsquo;s database and shares its processing.
            </p>

            <h2 className="mt-6 text-lg font-semibold">Project requests via the chat</h2>
            <p className="mt-2">
                If a visitor describes a project, freelance or business enquiry in the chat, the assistant can open a structured project
                request. The data processed here is: name, email address, optionally company, project type, description, optionally budget
                and timeline, plus a reference to the originating chat. These fields are stored in this site&rsquo;s database in the{' '}
                <code>ProjectRequests</code> table and — once the email is verified — forwarded to Cem by email via Resend. Purpose:
                replying to and handling the specific enquiry. Legal basis: Art. 6(1)(b) GDPR (pre-contractual steps at the data
                subject&rsquo;s request), supplemented by Art. 6(1)(f) GDPR. There is currently no automated deletion; project requests are
                deleted on request (see &ldquo;Your rights&rdquo;) and otherwise once their processing purpose has finally ceased. Longer
                retention only where statutory record-keeping duties (e.g. § 257 HGB, § 147 AO) require it.
            </p>

            <h2 className="mt-6 text-lg font-semibold">Email verification (one-time code)</h2>
            <p className="mt-2">
                Before a project request is forwarded to Cem, the email address provided is confirmed via a one-time 6-digit code sent to
                the visitor by email through Resend. Only a hash of the code (SHA-256 with a random per-request salt), the number of failed
                attempts and an expiry timestamp (10 minutes) are stored; the plaintext code is never stored. Purpose: protection against
                abuse, typos and impersonation. Legal basis: Art. 6(1)(f) GDPR (legitimate interest in the integrity of contact requests).
                After successful verification or expiry the code hash is no longer evaluated; it shares the storage of the associated
                project request.
            </p>

            <h2 className="mt-6 text-lg font-semibold">Server logs</h2>
            <p className="mt-2">
                When you visit the site, standard technical data is processed (IP address, user agent, timestamp, requested resource) to
                operate the site and diagnose errors. Legal basis: Art. 6(1)(f) GDPR. Logs are retained under the standard configuration of
                the container platform in use (Docker/Coolify) and are periodically overwritten by its rotation; no fixed retention period
                is configured. Application logs held in this site&rsquo;s database are deleted on request and otherwise once their
                processing purpose has finally ceased.
            </p>

            <h2 className="mt-6 text-lg font-semibold">Your rights</h2>
            <p className="mt-2">
                You have the right to access (Art. 15), rectification (Art. 16), erasure (Art. 17), restriction of processing (Art. 18) and
                data portability (Art. 20), as well as the right to object to processing based on legitimate interests (Art. 21 GDPR). To
                exercise any of these, use the contact details in the Imprint.
            </p>
            <p className="mt-2">
                You also have the right to lodge a complaint with a data-protection supervisory authority. The competent authority is the
                Landesbeauftragte für den Datenschutz und die Informationsfreiheit Rheinland-Pfalz, Hintere Bleiche 34, 55116 Mainz,
                Germany.
            </p>
        </>
    );
}
