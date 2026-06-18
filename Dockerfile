FROM node:24.16.0-slim AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install -g "npm@$(node -p "require('./package.json').packageManager.split('@')[1]")"
RUN npm ci

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production

ARG BUILD_SHA=unknown
ENV BUILD_SHA=$BUILD_SHA

# Server-side rendering: Playwright + Chromium. These layers are placed
# before the application copy so they cache across application code
# changes — the Chromium download dominates image build time and rarely
# changes. See `docs/architecture/server-side-rendering.md`.
#
# `playwright` is the only runtime dependency that cannot be inlined into
# the nitro bundle (chromium-bidi loads via paths Vite cannot statically
# resolve), so the runtime stage installs production `node_modules` here
# and runs Playwright's installer twice: once for system libraries
# (`install-deps`, fonts/libnss/libatk/...), once for the matching
# Chromium build. The Debian-based `node:24-slim` base is required —
# Chromium's prebuilt binaries are linked against glibc and will not run
# on Alpine.
COPY package.json package-lock.json ./
RUN npm install -g "npm@$(node -p "require('./package.json').packageManager.split('@')[1]")"
# Strip the `prepare` script (husky) before installing — husky is a
# devDependency, so `--omit=dev` would cause `sh -c husky` to exit 127.
RUN npm pkg delete scripts.prepare && npm ci --omit=dev
RUN npx playwright install-deps chromium
RUN npx playwright install chromium

COPY --from=build --chown=node:node /app/.output ./.output

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
