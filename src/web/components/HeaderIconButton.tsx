import * as React from 'react';
import { cn } from '../utils/cn';
import { Tooltip, TooltipContent, TooltipTrigger } from './base/tooltip';

// Round icon pill used across the header's right-side cluster (theme toggle,
// language toggle, chat button). Kept as a shared component so the three stay
// visually identical; the pill shape and `foreground/10` hover tokens match no
// base `Button` variant, so this is a call-site primitive rather than a Button.
export function HeaderIconButton({
    onClick,
    label,
    isPressed,
    className,
    children,
}: {
    onClick: () => void;
    /** Accessible name; also rendered in the tooltip. */
    label: string;
    /** Optional pressed/active state, surfaced via `aria-pressed` and a tint. */
    isPressed?: boolean;
    /** Extra classes for per-use tweaks (text styling, one-shot animations). */
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    onClick={onClick}
                    aria-label={label}
                    aria-pressed={isPressed}
                    className={cn(
                        'grid size-10 place-items-center rounded-full border border-foreground/10 text-foreground/80 transition hover:bg-foreground/5 active:bg-foreground/10 dark:border-white/10 dark:hover:bg-white/8 dark:active:bg-white/14 cursor-pointer',
                        isPressed && 'bg-foreground/5 dark:bg-white/8',
                        className,
                    )}
                >
                    {children}
                </button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}
