# Workspace software

`/workspace/software` is Cem's private software-development hub. It combines a static quick-link board for the core stack with the
cross-view "Favourite tech channels" section that reads media channels tagged `tech`.

See also:

- [features/workspace-media.md](./workspace-media.md) — source of truth for the channel rows surfaced here.
- [architecture/content-model.md](../architecture/content-model.md) — shared editable-content posture.

## User behavior

The page starts with "Technology quick links" / "Technologie-Quicklinks": a responsive card grid of languages, frameworks, libraries,
platforms, and tools used by the site. Each card shows:

- the technology logo loaded from Simple Icons' CDN,
- the technology name,
- a compact category label,
- a one-line reason it matters to this project,
- an external link to the official documentation.

Below it, "Favourite tech channels" continues to show channels from `/workspace/media` whose topics include `tech`.

## Options considered

| Approach                                | Why we picked / didn't                                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Static quick-link list in the route** | Chosen. The list is small, changes rarely, and should stay close to the workspace page until it needs editing UX.                                |
| **New DB-backed technology table**      | Deferred. It would require schema, GraphQL, generated types, mutations, and an editor for a list that currently behaves like curated navigation. |
| **Local logo assets**                   | Deferred. Vendoring logos adds asset-maintenance overhead; Simple Icons gives stable SVGs for the common technologies in the stack.              |

## Option chosen

Keep the technology quick links as a typed static list in `src/routes/{-$locale}/workspace/software.tsx`. Cards link to official docs and
load their logo by Simple Icons slug.

## Implementation details

- `TECHNOLOGY_QUICK_LINKS` defines the curated list, including bilingual category / description fields.
- `TechnologyQuickLinkGrid` renders the responsive card grid.
- `TechnologyQuickLinkCard` uses the shared `GlassCard` surface and an external SVG logo image.
- No GraphQL changes are required; the existing software page query still only loads `adminMediaChannelFindMany(topic: "tech")` for the
  channel section.
