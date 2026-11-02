# Gedson AI Mentor

## Repository structure

```text
website/             Next.js website (source, configuration, environment template, tests)
  app/               Pages, blog routes, styles, and contact API
  components/        Shared UI
  lib/               Blog content
  tests/             Website unit, integration, and browser tests
  README.md          Website setup, content, email delivery, and deployment guide
tests/               Repository-layout acceptance checks
package.json         npm workspace and root convenience commands
package-lock.json    Shared dependency lockfile
junior.toml          Junior project registration
```

`Profile.pdf` and `chatgpt-1`, when present locally, are original reference material, not website runtime assets. They are not moved or added to version control by this reorganization.

## Quick start

Requires Node.js 20.9+ (Node.js 24 recommended), npm, and Python 3 for repository-layout checks.

```sh
npm ci
cp website/.env.example website/.env.local
npm run dev
```

Open http://localhost:3000. Root commands `dev`, `build`, `start`, and `typecheck` forward to the website workspace. `npm test` runs the website suite. `npm run test:structure` checks the layout, command routing, and website suite; `npm run check` also builds and typechecks.

You can also work directly inside `website/` using `npm run dev`, `npm test`, `npm run build`, and `npm start`. Install dependencies with `npm ci` at the repository root; the workspace intentionally shares a single root lockfile.

```sh
npx playwright install chromium  # needed once for website browser tests
npm run check
```

JUnit reports are written to `test-results/structure.xml` and `website/test-results/website.xml`.

## Website configuration and deployment

See [the website guide](website/README.md) for content editing, contact email credentials, and deployment precautions. Keep environment files in `website/`, not the repository root.

For workspace-aware hosting, install from the repository root with `npm ci`, build with `npm run build`, and start with `npm start`. If the host uses `website/` as its application/root directory, include the parent workspace and lockfile during installation (for example, run `cd .. && npm ci` as the install command). Do not deploy just the `website/` directory with `npm ci`: the dependency lockfile lives at the repository root. The contact API needs a Node.js runtime, not a static-only host.
