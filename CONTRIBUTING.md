# Contributing to Verso

Thank you for taking the time to contribute. Verso is an open-source project maintained by [starside.io](https://starside.io). All contributions, bug fixes, new features, documentation improvements, and test coverage, are welcome.

---

## Table of Contents

- Code of conduct
- Getting started
- Development setup
- Running the tests
- Code style
- Opening a pull request
- Reporting a bug
- Requesting a feature
- License

---

## Code of Conduct

Be kind. Criticism is welcome; personal attacks are not. We follow the [Contributor Covenant](./CODE_OF_CONDUCT.md).

---

## Getting Started

1. **Fork** the repository on GitHub.

2. **Clone** your fork locally:
   ```
   git clone https://github.com/<your-handle>/verso.git
   cd verso
   ```

3. **Create a branch** for your change:
   ```
   git checkout -b fix/my-bug-description
   # or
   git checkout -b feat/my-feature-name
   ```

---

## Development Setup

### System Requirements

- **Node.js 20 or later** (the workspace `engines` field is `>=20.0.0`)
- **pnpm 9 or later** (`corepack enable` is the easiest way to get it)
- A POSIX shell. macOS and Linux are first-class; Windows works via WSL.

The build pipeline downloads its own Chromium via `puppeteer` on first install (~170 MB). Plan accordingly on metered connections.

### Install dependencies

```
pnpm install
```

This installs every workspace package and links them together. No global state required.

### Build all packages

```
pnpm -r build
```

Each package emits its own `dist/`. The CLI symlinks at `tools/cli/dist/bin.js`.

### Run the editor against an example deck

```
pnpm --filter @starside-io/verso-editor dev
```

Or, from a project directory, install the CLI in this workspace and use it directly:

```
pnpm -r build
node tools/cli/dist/bin.js edit --dir examples/layouts-gallery
```

### Verify the install

```
node tools/cli/dist/bin.js --version
```

---

## Running the Tests

Tests use [Vitest](https://vitest.dev). Each package has its own suite.

```
# Whole workspace
pnpm -r test

# A single package
pnpm --filter @starside-io/verso-runtime test

# A single file, watch mode
pnpm --filter @starside-io/verso-runtime test -- render.test.ts --watch
```

Tests live next to source as `*.test.ts`. If you add a new feature, please add tests.

---

## Code Style

Verso uses [Biome](https://biomejs.dev) for linting and formatting and TypeScript's compiler for type checking.

```
# Lint
pnpm biome check

# Auto-fix
pnpm biome check --write

# Type check
pnpm -r typecheck
```

Run them locally before pushing and fix any issues before opening a PR.

### Style Conventions

- **TypeScript strict mode**. No `any` without a one-line `// reason: ...` comment.
- **No em-dashes or en-dashes** in source, comments, or docs. Use commas, periods, parens, or colons. (They're a giveaway for AI-generated text and read poorly.)
- **Comments explain "why"**, not "what". The code already says what.
- **One concern per package**. Don't reach across package boundaries except through the public exports.
- **JSON is canonical**. Every editor change writes to disk; signals propagate from there. Don't add hidden state.

---

## Opening a Pull Request

1. Make sure `pnpm -r test`, `pnpm -r typecheck`, and `pnpm biome check` all pass locally.
2. Add a **changeset** describing your change (`pnpm changeset`). The prompt will ask which packages are affected and at what semver bump.
3. Push your branch and open a PR against `main`.
4. Fill in the PR template. Link any related issue with `Closes #<n>`.
5. A maintainer will review within a few days. Please respond to review comments promptly.

### Commit Message Format

```
<type>: <short summary in present tense>

<optional body>
```

Types: `fix`, `feat`, `docs`, `refactor`, `test`, `chore`.

Examples:
- `fix: prevent toolbar overflow from clipping dropdown menus`
- `feat: add per-slide transitions with 16 built-ins`
- `docs: document the agenda layout's auto-build behavior`

---

## Reporting a Bug

Open a GitHub Issue and fill in the bug report template. Please include:

- Verso version (`verso --version`)
- Node version (`node --version`) and pnpm version (`pnpm --version`)
- OS and architecture
- The exact command you ran
- Expected vs. actual behaviour
- A minimal `deck.json` + `slides/*.json` reproduction if possible

---

## Requesting a Feature

Open a GitHub Issue and fill in the feature request template. Describe:

- The use case you have in mind
- What the JSON shape or CLI interface might look like
- Any relevant prior art or related tools

---

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.
