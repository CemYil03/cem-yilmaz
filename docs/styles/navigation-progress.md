# Navigation Progress

A thin animated bar at the top of the viewport indicates that a client-side navigation is in flight — covering the time the route loader is
fetching data before the next route renders.

## User Behavior

- Triggered whenever TanStack Router transitions between routes (link click, programmatic navigation, back/forward).
- A 2-pixel bar in the primary color slides in from the left, decelerating toward ~90% of the viewport width.
- Display is delayed by 120 ms — fast cached navigations finish before anything appears, avoiding visual noise.
- On completion the bar snaps to 100% and fades out over 200 ms.
- Decorative only: marked `aria-hidden`, no announcement to assistive tech.

## Options Considered

| Option                    | Pros                                         | Cons                                           |
| ------------------------- | -------------------------------------------- | ---------------------------------------------- |
| Top progress bar (chosen) | Non-intrusive, current page stays visible    | Only signals globally, not per-region          |
| Dim + spinner overlay     | Very obvious                                 | Blocks the current view, jarring on fast hops  |
| Per-route pending UI      | Targeted, can show skeletons matching layout | Requires per-route work, more code to maintain |
| `nprogress` package       | Familiar look, off-the-shelf                 | Extra dependency, jQuery-era imperative API    |

## Option Chosen

Top progress bar, implemented in-house. No extra dependency, integrates with the Tailwind theme (uses `--color-primary`), and the state is
read directly from `useRouterState` so it tracks both loader fetches and React transitions.

## Implementation

- `src/web/components/NavigationProgress.tsx` — component. Reads `isLoading || isTransitioning` from `useRouterState` and drives a 3-phase
  state machine (`idle` → `loading` → `completing`). Applies `animate-[nav-progress-grow_8s_ease-out_forwards]` while loading and a fade-out
  transition while completing.
- `src/styles.css` — defines the `nav-progress-grow` keyframes (scaleX 0 → 0.9).
- `src/routes/__root.tsx` — mounts `<NavigationProgress />` in the document body so it spans every route.

### Why a delay before showing

A `setTimeout` of 120 ms guards against flashes on instant transitions (cached loaders, no async work). If the navigation finishes inside
that window, the bar never mounts.

### Why a slow asymptotic animation

Loader latency is unknown. A linear bar to 100% would either finish too early (and mislead) or stall. Easing toward 90% with a long duration
mimics NProgress: motion communicates progress without claiming a specific completion time, then a quick snap-to-100 + fade signals "done".
