import { MessageCircleIcon } from 'lucide-react';
import { useVisitorChat } from '../chat/VisitorChatProvider';
import { useLocale } from '../hooks/useLocale';
import { Tooltip, TooltipContent, TooltipTrigger } from './base/tooltip';

// Header entry point into the visitor chat dialog. Opens the dialog in its
// empty state (previous-chats list + composer); the landing-page hero composer
// uses a different entry point (`openWithMessage`) that fires a seeded
// question on open. Sized to match `LanguageSelector` / `ThemeSelector` so the
// right-side cluster stays visually balanced.

const LABEL = {
    de: 'Chats',
    en: 'Chats',
};

export function HeaderChatButton() {
    const locale = useLocale();
    const { openEmpty } = useVisitorChat();
    const label = LABEL[locale];

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    onClick={openEmpty}
                    aria-label={label}
                    className="grid size-10 place-items-center rounded-full border border-foreground/10 text-foreground/80 transition hover:bg-foreground/5 active:bg-foreground/10 dark:border-white/10 dark:hover:bg-white/8 dark:active:bg-white/14 cursor-pointer"
                >
                    <MessageCircleIcon className="size-4" aria-hidden />
                </button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}
