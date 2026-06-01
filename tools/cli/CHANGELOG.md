# @starside-io/verso-cli

## 0.2.2

### Patch Changes

- Updated dependencies [[`79b36af`](https://github.com/starside-io/verso/commit/79b36af21aee8693706addefd6cfc428791bab46)]:
  - @starside-io/verso-layouts@0.4.0
  - @starside-io/verso-schema@0.4.0
  - @starside-io/verso-editor@0.4.0
  - @starside-io/verso-viewer@0.3.3
  - @starside-io/verso-build@0.2.3
  - @starside-io/verso-core@0.1.3
  - @starside-io/verso-runtime@0.3.1
  - @starside-io/verso-themes@0.1.3

## 0.2.1

### Patch Changes

- Updated dependencies [[`8737bc2`](https://github.com/starside-io/verso/commit/8737bc2c746f50c3664da3d897f02f604243db41)]:
  - @starside-io/verso-layouts@0.3.2
  - @starside-io/verso-viewer@0.3.2
  - @starside-io/verso-build@0.2.2

## 0.2.0

### Minor Changes

- [`30789ad`](https://github.com/starside-io/verso/commit/30789ad9d98bd7e37aaa4316ef96aa576a87bc1a) Thanks [@crimson-med](https://github.com/crimson-med)! - Three fixes from real-world use of the latest release.

  **Editor: icon picker works in any node_modules layout.** The picker and inspector preview tiles used `import.meta.glob('/node_modules/@phosphor-icons/core/...')` which only resolves to the project root's own node_modules. In published editor installs npm/pnpm hoists @phosphor-icons above the editor's node tree, so the glob matched zero files and every cell showed a blank placeholder. Replaced with a runtime fetch using a Vite `define`-injected URL constant resolved at config-load time via `createRequire`. Works in workspace dev AND in any published install regardless of hoisting.

  **Layouts: card-stretch only when every column is all-card.** The earlier card-height-matching rule stretched every card in two-col / three-col layouts, which caused a card paired with non-card content (bullets, text) to expand into empty space inside its border. Tightened with a `:has()/:not(:has())` guard so the stretch only kicks in when every column contains exactly card blocks. Mixed-content rows leave cards at natural height; all-card rows still visually align.

  **CLI: skip the local cli dep when global verso is on PATH.** `verso init` now detects a global `verso` install. When present, the generated `package.json` omits the `@starside-io/verso-cli` dependency and the "next steps" hint skips the `npm install` line. No more re-downloading the entire CLI tree for every new deck. AI-skill environments without a global install still get the dep + install hint.

### Patch Changes

- Updated dependencies [[`30789ad`](https://github.com/starside-io/verso/commit/30789ad9d98bd7e37aaa4316ef96aa576a87bc1a)]:
  - @starside-io/verso-editor@0.3.1
  - @starside-io/verso-layouts@0.3.1
  - @starside-io/verso-viewer@0.3.1
  - @starside-io/verso-build@0.2.1

## 0.1.3

### Patch Changes

- Updated dependencies [[`6aa9558`](https://github.com/starside-io/verso/commit/6aa9558af79579ece9d2f31d8450428d794085d8)]:
  - @starside-io/verso-schema@0.3.0
  - @starside-io/verso-runtime@0.3.0
  - @starside-io/verso-layouts@0.3.0
  - @starside-io/verso-build@0.2.0
  - @starside-io/verso-viewer@0.3.0
  - @starside-io/verso-editor@0.3.0
  - @starside-io/verso-core@0.1.2
  - @starside-io/verso-themes@0.1.2

## 0.1.2

### Patch Changes

- Updated dependencies [[`aed9d10`](https://github.com/starside-io/verso/commit/aed9d10938670a5375aba78559b986e50a9ce0b2)]:
  - @starside-io/verso-schema@0.2.0
  - @starside-io/verso-runtime@0.2.0
  - @starside-io/verso-layouts@0.2.0
  - @starside-io/verso-viewer@0.2.0
  - @starside-io/verso-editor@0.2.0
  - @starside-io/verso-build@0.1.1
  - @starside-io/verso-core@0.1.1
  - @starside-io/verso-themes@0.1.1
