# AGENTS.md

appmetrics-dash-hapi: a Hapi.js adaptation of appmetrics-dash. It serves a dashboard for Node.js application metrics. Main code is `index.js`; `example/app.js` shows the integration.

## Stack

- Node.js 18 (`.node-version`), Hapi.js, pnpm 10 (`packageManager`, `pnpm-lock.yaml`).
- Lint and format: ESLint (`.eslintrc.json`), Prettier (`.prettierrc`).
- Tests: Mocha (unit, integration, security under `test/`), nyc for coverage.

## Commands

```bash
pnpm install
pnpm run lint            # eslint index.js test/
pnpm run format:check    # prettier --check
pnpm test                # lint (pretest) + mocha
pnpm run test:coverage   # nyc + mocha, enforces 80% thresholds
```

## Structure

- `index.js`: plugin entry point (the only file covered by nyc).
- `example/`: usage example. Excluded from coverage.
- `test/unit/`, `test/integration/`, `test/security.test.js`: tests.
- `docs/readme/`: screenshots used by the README.

## Rules

1. **Single responsibility.** Each module does one thing. Prefer small, reusable modules with clear inputs and outputs, and document their purpose.
2. **KISS and YAGNI.** The simplest code that works. Do not add features that are not needed yet. Refactor when clarity is lost.
3. **DRY.** Remove duplicated logic. Remove code that a change makes dead.
4. **Size.** Each file has at most 180 lines of code. Split by responsibility when it grows.
5. **Tests.** Unit and integration tests for new behavior. `AGENTS.md` asks for 85% coverage; `package.json` enforces 80% (see Gotchas).
6. **Errors and logs.** Handle errors gracefully with informative messages. Log agent and metric behavior needed for diagnosis.
7. **Security.** Every operation must be safe by default. Treat input as untrusted.
8. **Dependencies.** Declare every external dependency explicitly, pin it through the lockfile, and track updates.
9. **Versioning.** Semantic Versioning.
10. **Review.** Changes are reviewed by at least one other developer before merge.
11. **AI-generated code** is validated like any other code: lint, tests, and review.

## Gotchas

- **Coverage mismatch:** rule 5 asks for 85%, but `nyc` in `package.json` enforces 80% on branches, lines, functions, and statements. Confirm the target before changing thresholds.
- `pretest` runs lint first, so `pnpm test` fails on lint errors.
- `yarn audit` is used by the `audit` script; the project is pnpm-managed. Check which one you need before running it.

<!-- base-actions-main-policy -->
## GitHub Actions — padrão obrigatório (@main)

- Referencie as actions internas sempre pelo branch, nunca por SHA:
  - `uses: juninmd/base-actions/<action>@main`
  - `uses: juninmd/base-actions/.github/workflows/<arquivo>.yml@main`
- Não fixe `@<sha>` em `juninmd/base-actions`: a atualização é centralizada no
  `main` e passa a valer no próximo run.
- PRs cujos checks não iniciam por billing/spending limit são mesclados pelo bot central
  `juninmd/base-actions/.github/workflows/auto-merge-billing-blocked.yml`.
  Para impedir o merge automático de um PR, aplique a label `do-not-merge`.
