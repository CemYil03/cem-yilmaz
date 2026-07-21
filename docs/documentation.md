# Documentation

Guide for the `docs/` directory — what to find where and what to put where.

## Structure

```text
docs/
├── documentation.md              # This file — docs directory guide
├── conventions.md                # How to work in this repo
├── infrastructure.md             # Deployment and CI
├── architecture/                 # Architectural decision records
│   ├── agent-delegation.md       # Orchestrator + in-process domain sub-agents
│   ├── api-layer.md              # Type-safe client-server API (GraphQL, SSR data loading)
│   ├── authentication.md         # Session-based auth design
│   ├── authorization.md          # Guard-based access control
│   ├── authorization-workspace.md # Users.isAdmin + guardAdmin / Admin GraphQL namespace
│   ├── chat.md                   # Chat foundation — polymorphic message model
│   ├── chat-persistence.md       # Chat persistence — DB schema and AI SDK replay
│   ├── content-model.md          # Editable DB content + bilingual columns
│   ├── dependency-injection.md   # Dependency injection container
│   ├── discovery-geo.md          # GEO — llms.txt, JSON-LD, AI bot allowlist
│   ├── discovery-seo.md          # SEO standards — seoMeta() helper, dynamic sitemap.xml, robots.txt
│   ├── environment.md            # Validated EnvironmentVariables (no direct process.env)
│   ├── file-storage.md           # Generic file-upload store (Postgres bytea); consumers join by fileUploadId
│   ├── i18n.md                   # DE / EN locale strategy
│   ├── jobs.md                   # pg-boss background jobs
│   ├── server-architecture.md    # Server-side domain logic structure (CQRS)
│   ├── server-side-rendering.md  # Playwright-based UI capture for image/PDF exports
│   └── state-synchronization.md  # Client-server state sync via subscriptions
├── styles/                       # Visual / interaction design rules
│   ├── chat.md                   # Desired chat experience (scroll, composer, transcript)
│   ├── fonts.md
│   ├── motion.md
│   └── theme.md
├── features/                     # Implemented feature documentation
│   ├── chat-visitor.md           # Public visitor agent ("Ask me anything")
│   ├── chat-workspace.md         # Workspace personal-assistant agent
│   └── …
└── assets/                       # Diagrams, images, and other media
```

## What Goes Where

### `architecture/`

One file per architectural decision. Each document should cover:

- **Context** — what problem the decision addresses
- **Decision** — what was chosen and why
- **Alternatives considered** — what was rejected and why
- **Consequences** — trade-offs accepted

Add a new file when introducing a fundamentally new pattern, technology, or structural choice. These documents should remain stable over
time — they describe _why_ the system is shaped the way it is, not _how_ to use it day-to-day.

When you add a new architecture doc, also add a row to the Architecture table in [`AGENTS.md`](../AGENTS.md).

### `styles/`

Presentation and interaction rules that hold across surfaces — typography, motion, theme tokens, and the desired chat experience. Not ADRs:
these describe the bar every UI surface should meet.

### `features/`

One file per user-facing feature, added once the feature is implemented. Each document should cover:

- **User behavior** — what the user sees and does
- **Options considered** — approaches evaluated with pros/cons
- **Option chosen** — the selected approach and rationale
- **Implementation** — key files and data flow for the concrete implementation

Features are different from architecture: architecture describes structural decisions that affect many features; features describe specific
end-to-end functionality built on top of that architecture.

The visitor agent and workspace personal assistant are **two features** that share the chat foundation
([architecture/chat.md](./architecture/chat.md)) and the chat experience bar ([styles/chat.md](./styles/chat.md)) — see
[chat-visitor.md](./features/chat-visitor.md) and [chat-workspace.md](./features/chat-workspace.md).

### `conventions.md`

Living document for working agreements: naming, file organization, tooling workflows, things not to touch. Update it whenever a new
convention is established.

### `infrastructure.md`

Deployment pipeline, CI configuration, environment setup. Update it when the deployment or CI process changes.

### `assets/`

Supporting media referenced from other docs (diagrams, screenshots). Name files to match the doc they support (e.g., `state-sync-flow.png`
for `architecture/state-synchronization.md`).
