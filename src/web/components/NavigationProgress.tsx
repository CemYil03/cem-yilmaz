import { useRouterState } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../utils/cn';

type Phase = 'idle' | 'loading' | 'completing';

const SHOW_DELAY_MS = 120;
const COMPLETE_FADE_MS = 200;

export function NavigationProgress() {
    const isLoading = useRouterState({
        select: (s) => s.isLoading || s.isTransitioning || s.matches.some((m) => m.isFetching !== false),
    });
    const [phase, setPhase] = useState<Phase>('idle');
    const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (isLoading) {
            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
                hideTimerRef.current = null;
            }
            if (phase === 'idle' && !showTimerRef.current) {
                showTimerRef.current = setTimeout(() => {
                    showTimerRef.current = null;
                    setPhase('loading');
                }, SHOW_DELAY_MS);
            }
            return;
        }

        if (showTimerRef.current) {
            clearTimeout(showTimerRef.current);
            showTimerRef.current = null;
        }

        if (phase === 'loading') {
            setPhase('completing');
            hideTimerRef.current = setTimeout(() => {
                hideTimerRef.current = null;
                setPhase('idle');
            }, COMPLETE_FADE_MS);
        }
    }, [isLoading, phase]);

    useEffect(() => {
        return () => {
            if (showTimerRef.current) clearTimeout(showTimerRef.current);
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        };
    }, []);

    if (phase === 'idle') return null;

    return (
        <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-100 h-0.5 overflow-hidden">
            <div
                className={cn(
                    'bg-primary h-full origin-left',
                    phase === 'loading' && 'animate-[nav-progress-grow_8s_ease-out_forwards]',
                    phase === 'completing' && 'scale-x-100 opacity-0 transition-[transform,opacity] duration-200',
                )}
            />
        </div>
    );
}
