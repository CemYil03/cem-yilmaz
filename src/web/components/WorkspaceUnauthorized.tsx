import { Link } from '@tanstack/react-router';
import { LockIcon } from 'lucide-react';
import type { Locale } from '../utils/locale';
import { Button } from './base/button';
import { GlassCard } from './GlassCard';

// Rendered by every `/workspace/*` page when its loader returned a query whose
// `currentSession.user.admin` resolved to `null` — i.e. the visitor is not
// signed in, or signed in but not flagged `isAdmin = true`. The workspace
// routes used to crash with a raw GraphQL error here because `Query.admin` was
// non-nullable and `guardAdmin` threw on non-admins. With the read namespace
// moved under `User.admin` (nullable), the field resolves cleanly and pages
// can render a recognizable "not authorized" surface instead. See
// `docs/architecture/authorization-workspace.md`.

export function WorkspaceUnauthorized({ locale }: { locale: Locale }) {
    return (
        <main className="flex-1 px-6 md:px-10 lg:px-16 max-w-3xl mx-auto w-full pb-20">
            <GlassCard className="mt-16 px-8 py-10 text-center">
                <div className="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <LockIcon className="size-5" />
                </div>
                <h1 className="text-xl font-semibold tracking-tight">
                    {{ de: 'Kein Zugriff auf den Workspace', en: 'No access to the workspace' }[locale]}
                </h1>
                <p className="mt-3 text-sm text-foreground/70 leading-relaxed">
                    {
                        {
                            de: 'Dieser Bereich ist nur für Admin-Benutzer. Wenn du das hier siehst und eigentlich Zugriff haben solltest, prüfe, ob deine Sitzung als Admin markiert ist (`Users.isAdmin`).',
                            en: 'This area is only for admin users. If you’re seeing this and expected access, check whether your session’s user is flagged `isAdmin`.',
                        }[locale]
                    }
                </p>
                <Button asChild className="mt-6">
                    <Link to="/{-$locale}">{{ de: 'Zur Startseite', en: 'Back to home' }[locale]}</Link>
                </Button>
            </GlassCard>
        </main>
    );
}
