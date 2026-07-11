// Friendly display for tool-call rows in the transcript. The raw tool id
// (`delegateToProjects`, `promptUserForInput`, `toolProjectsUpsert`) is an
// internal name; showing it in the conversation reads as technical noise.
// This maps each id to a human, bilingual label + icon. The raw id stays
// available in the args inspector (`ToolArgumentsButton`), so nothing is lost.
//
// Two tiers:
// - TOOL_DISPLAY — the top-level tools a human actually sees as their own
//   transcript row: the personal assistant's `delegateTo*` orchestrator tools
//   and the visitor agent's transactional tools. Small and hand-curated so the
//   copy reads well.
// - mechanical fallback — the ~90 domain sub-agent tools (`toolProjectsUpsert`
//   → "Projects upsert") that only ever appear in the indented child list under
//   a delegate. A derived label is good enough there and never drifts.

import {
    AppleIcon,
    ClipboardListIcon,
    DumbbellIcon,
    FilmIcon,
    FolderKanbanIcon,
    GlobeIcon,
    HammerIcon,
    KeyRoundIcon,
    MailIcon,
    MessageSquareIcon,
    PackageIcon,
    PlaneIcon,
    ReceiptIcon,
    StethoscopeIcon,
    WalletIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Locale } from '../utils/locale';

export interface ToolDisplay {
    Icon: LucideIcon;
    label: { de: string; en: string };
}

const TOOL_DISPLAY: Record<string, ToolDisplay> = {
    // Personal-assistant delegate tools (top-level orchestrator hand-offs).
    delegateToProjects: { Icon: FolderKanbanIcon, label: { de: 'Projekte', en: 'Projects' } },
    delegateToWebSearch: { Icon: GlobeIcon, label: { de: 'Websuche', en: 'Web search' } },
    delegateToMedia: { Icon: FilmIcon, label: { de: 'Medien', en: 'Media' } },
    delegateToMedical: { Icon: StethoscopeIcon, label: { de: 'Medizinisches', en: 'Medical' } },
    delegateToTravel: { Icon: PlaneIcon, label: { de: 'Reisen', en: 'Travel' } },
    delegateToNutrition: { Icon: AppleIcon, label: { de: 'Ernährung', en: 'Nutrition' } },
    delegateToFitness: { Icon: DumbbellIcon, label: { de: 'Fitness', en: 'Fitness' } },
    delegateToFinances: { Icon: WalletIcon, label: { de: 'Finanzen', en: 'Finances' } },
    delegateToInventory: { Icon: PackageIcon, label: { de: 'Inventar', en: 'Inventory' } },
    delegateToTax: { Icon: ReceiptIcon, label: { de: 'Steuern', en: 'Tax' } },
    // Visitor agent tools.
    promptUserForInput: { Icon: MessageSquareIcon, label: { de: 'Eingabe angefordert', en: 'Requested your input' } },
    sendEmailToCem: { Icon: MailIcon, label: { de: 'E-Mail an Cem', en: 'Email to Cem' } },
    submitProjectRequest: { Icon: ClipboardListIcon, label: { de: 'Projektanfrage', en: 'Project request' } },
    verifyProjectRequestOtp: { Icon: KeyRoundIcon, label: { de: 'Code prüfen', en: 'Verify code' } },
};

// Turn `toolProjectsUpsert` / `projectsUpsert` into "Projects upsert": drop a
// leading `tool`, split camelCase / PascalCase into words, and sentence-case
// the result. Same string in both locales — these are internal domain verbs
// that don't have curated translations, and they only surface in the indented
// child list.
function humanizeToolName(toolName: string): string {
    const withoutPrefix = toolName.replace(/^tool/, '');
    const words = withoutPrefix
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .trim()
        .toLowerCase();
    if (!words) return toolName;
    return words.charAt(0).toUpperCase() + words.slice(1);
}

export function toolDisplay(toolName: string): ToolDisplay {
    const known = TOOL_DISPLAY[toolName];
    if (known) return known;
    const humanized = humanizeToolName(toolName);
    return { Icon: HammerIcon, label: { de: humanized, en: humanized } };
}

/** Convenience for call sites that already hold a locale. */
export function toolDisplayLabel(toolName: string, locale: Locale): string {
    return toolDisplay(toolName).label[locale];
}
