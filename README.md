# Gedson AI Mentor

This repository can contain multiple independent projects. Each project keeps its own dependencies, configuration, tests, and build output in its folder; there is no root npm workspace or shared dependency installation.

## Projects

- [`website/`](website/README.md): standalone Next.js personal website, including its own `package.json`, lockfile, environment template, and tests.

## Website quick start

```sh
cd website
npm ci
cp .env.example .env.local
npm run dev
```

Run all website npm commands from `website/`. See the [website guide](website/README.md) for tests, production builds, email configuration, and deployment.

`junior.toml` at the root registers this repository with Junior; it is not website tooling.
