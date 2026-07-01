import { useEffect } from 'react';

// Page-scoped keyboard shortcuts. Fires the handler for a given single-key
// press when nothing editable has focus — input, textarea, and
// `contenteditable` elements are ignored so shortcuts don't interfere with
// typing. Modifier keys (Ctrl, Meta, Alt) also opt out; the shortcuts are
// meant to feel like "raw keystrokes on a still page".
//
// Handlers can call `event.preventDefault()` themselves; the hook does not.

export type HotkeyMap = Record<string, (event: KeyboardEvent) => void>;

export function useHotkeys(bindings: HotkeyMap, enabled: boolean = true): void {
    useEffect(() => {
        if (!enabled) return undefined;
        const listener = (event: KeyboardEvent) => {
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            const target = event.target as HTMLElement | null;
            if (target) {
                const tag = target.tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
                if (target.isContentEditable) return;
            }
            const handler = bindings[event.key];
            if (handler) handler(event);
        };
        window.addEventListener('keydown', listener);
        return () => window.removeEventListener('keydown', listener);
    }, [bindings, enabled]);
}
