# Security Policy

## Supported Versions

Verso is pre-1.0. The `main` branch is the only line of support. Once we cut a `1.x` release, this section will list the supported version range.

| Version | Supported |
|---------|-----------|
| `main`  | yes       |
| `< 1.0` | no, please upgrade |

## Reporting a Vulnerability

If you believe you've found a security issue in Verso, please report it privately. **Do not open a public GitHub Issue.**

Email: `contact@starside.io`

Please include:

- A description of the issue and its impact
- Steps to reproduce (a minimal `deck.json` + `slides/*.json` repro is ideal)
- The Verso version (`verso --version`) and Node version
- Whether the issue is already public anywhere

We will acknowledge receipt within 3 business days and aim to ship a patch within 14 days for high-severity issues. We will credit reporters in the release notes unless you ask us not to.

## Scope

In scope:

- The `@starside-io/verso-*` npm packages and the `verso` CLI
- The dev viewer and visual editor (`apps/viewer`, `apps/editor`)
- The build pipeline (`@starside-io/verso-build`, headless Chromium)

Out of scope:

- Vulnerabilities in puppeteer, zod, preact, or other third-party dependencies. Please report those upstream. We will pick up the fix once a patched version is on npm.
- Misuse of the editor's local file-write endpoints when exposed beyond `localhost`. The dev server is designed for local use only; do not expose port 5173 / 5180 to the public internet.
