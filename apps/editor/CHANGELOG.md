# @starside-io/verso-editor

## 0.4.0

### Minor Changes

- [`79b36af`](https://github.com/starside-io/verso/commit/79b36af21aee8693706addefd6cfc428791bab46) Thanks [@crimson-med](https://github.com/crimson-med)! - 19 new PowerPoint-style layouts to break the every-slide-looks-the-same trap.

  **Asymmetric splits (4)**: `one-third-left`, `one-third-right`, `two-thirds-left`, `two-thirds-right`. PowerPoint's most common asymmetric pattern.

  **Grids (4)**: `quad` (2x2), `swot` (labeled 2x2), `icon-grid` (auto-flowing), `kpi-band` (KPI row + supporting body).

  **Image-driven (3)**: `picture-fill` (image as background with title overlay), `picture-with-caption` (image + large caption side by side), `bento` (magazine-style hero cell + smaller cells).

  **Title + special (5)**: `title-band`, `title-only`, `callout-banner`, `chapter`, `q-and-a`.

  **Flow + structured (3)**: `process` (horizontal chevrons), `split-vertical` (top + bottom halves), `roadmap` (quarterly columns).

  Schema validation added for each (`quad` requires exactly 4 blocks, `swot` exactly 4, `picture-fill` an image, `q-and-a` at least 2, etc.) so empty cells and missing required blocks get rejected at parse time. Editor Layout dropdown reorganized into 5 new categories: Asymmetric splits, Grids, Image-driven, Flow, Special.

### Patch Changes

- Updated dependencies [[`79b36af`](https://github.com/starside-io/verso/commit/79b36af21aee8693706addefd6cfc428791bab46)]:
  - @starside-io/verso-schema@0.4.0
  - @starside-io/verso-themes@0.1.3

## 0.3.1

### Patch Changes

- [`30789ad`](https://github.com/starside-io/verso/commit/30789ad9d98bd7e37aaa4316ef96aa576a87bc1a) Thanks [@crimson-med](https://github.com/crimson-med)! - Three fixes from real-world use of the latest release.

  **Editor: icon picker works in any node_modules layout.** The picker and inspector preview tiles used `import.meta.glob('/node_modules/@phosphor-icons/core/...')` which only resolves to the project root's own node_modules. In published editor installs npm/pnpm hoists @phosphor-icons above the editor's node tree, so the glob matched zero files and every cell showed a blank placeholder. Replaced with a runtime fetch using a Vite `define`-injected URL constant resolved at config-load time via `createRequire`. Works in workspace dev AND in any published install regardless of hoisting.

  **Layouts: card-stretch only when every column is all-card.** The earlier card-height-matching rule stretched every card in two-col / three-col layouts, which caused a card paired with non-card content (bullets, text) to expand into empty space inside its border. Tightened with a `:has()/:not(:has())` guard so the stretch only kicks in when every column contains exactly card blocks. Mixed-content rows leave cards at natural height; all-card rows still visually align.

  **CLI: skip the local cli dep when global verso is on PATH.** `verso init` now detects a global `verso` install. When present, the generated `package.json` omits the `@starside-io/verso-cli` dependency and the "next steps" hint skips the `npm install` line. No more re-downloading the entire CLI tree for every new deck. AI-skill environments without a global install still get the dep + install hint.

## 0.3.0

### Minor Changes

- [`6aa9558`](https://github.com/starside-io/verso/commit/6aa9558af79579ece9d2f31d8450428d794085d8) Thanks [@crimson-med](https://github.com/crimson-med)! - Three substantial additions plus polish on cards and bullets.

  **Layout-aware schema validation.** `Slide.parse` now enforces minimum block counts per layout: `two-col` needs a multiple of 2, `three-col` needs a multiple of 3, `image-left`/`image-right` need at least one image block, `compare` needs at least 2 top-level heading groups. Errors include the slide id and a readable explanation pointing at the failing layout.

  **Slide overflow detection in CLI and editor.** Every `buildPdf` / `buildHtml` / `buildPng` now measures `.verso-slide.scrollHeight` against the page height and prints a yellow `⚠ Slide "X" overflows by Npx` warning per affected slide. Results carry a new optional `overflows?: SlideOverflow[]` field. The live editor preview reports the same overflow info to the editor app, which shows a per-slide badge in the SlideList, a status pill in the Toolbar, and an "N slide(s) overflow" suffix on export success messages.

  **Independent title vs content alignment.** `Slide.align` now accepts `{ title?, content? }` in addition to the existing flat `{ horizontal?, vertical? }`. Layouts that have both a title zone and a content zone (`content`, `two-col`, `three-col`, `image-left`, `image-right`, `hero`, `agenda`, `compare`, `stats`, `big-number`, `timeline`, `author`) emit separate `.verso-title-zone` and `.verso-content-zone` wrappers when the nested form is used. Flat align stays back-compatible. Editor Align dropdown shows two grouped sections (Title / Content) and normalizes to flat when both zones match.

  **Cards get optional header + icon.** `CardBlock` now optionally carries `header`, `icon`, `iconWeight`, `iconTone`. The Card component renders an icon + header strip above content[] when either is set. Editor card form exposes a Header text input + a Browse icon picker button + an Icon tone selector.

  **Per-item bullet icons in the editor.** Each bullet item row in the Inspector now has a square icon picker button next to the text input. Selecting an icon converts the item to the object form `{ text, icon, iconWeight }`; clearing collapses back to a plain string.

  Also: cards in `two-col` / `three-col` layouts now stretch to match row heights via `:has(>.verso-card)`, so sibling cards line up visually instead of sizing to their individual content.

### Patch Changes

- Updated dependencies [[`6aa9558`](https://github.com/starside-io/verso/commit/6aa9558af79579ece9d2f31d8450428d794085d8)]:
  - @starside-io/verso-schema@0.3.0
  - @starside-io/verso-themes@0.1.2

## 0.2.0

### Minor Changes

- [`aed9d10`](https://github.com/starside-io/verso/commit/aed9d10938670a5375aba78559b986e50a9ce0b2) Thanks [@crimson-med](https://github.com/crimson-med)! - Phosphor icons end-to-end. Adds two composable patterns: a first-class `IconBlock` that drops into any layout or container, and a `BulletItem` extension so each bullets item can carry a per-item leading icon (back compat: plain string items still work).

  - **Schema**: new `IconBlock` (`type: "icon"`, `name`, `weight?`, `size?`, `tone?`, `label?`) added to the `ContentBlock` union. `BulletItem` is now `string | { text, icon?, iconWeight?, iconTone? }`.
  - **Runtime**: lazy SVG resolver/loader registry pinned on `globalThis` (survives multi-chunk bundling). Sync renderer emits inline SVG when cached, else a sized placeholder + fires an async load. New event `verso:icon-loaded` lets hydrators swap placeholders.
  - **Viewer**: lazy loader backed by `import.meta.glob` of `@phosphor-icons/core/assets/**/*.svg` so each icon is its own chunk, downloaded on demand. Hydrator preserves extra classes (e.g. `verso-bullet-icon`) when swapping placeholders.
  - **Layouts CSS**: `.verso-icon` tone styling, `.verso-bullet-with-icon` layout for per-item bullet icons.
  - **Editor**: new "Icon" entry in the `+ Block` menu (Decoration category). The inspector form shows a preview tile + Browse button that opens a searchable icon picker (1,500+ icons, search by name + tag, weight selector, paginated grid).

  Bug fix included: the laser pointer no longer fires when the viewer is embedded in the editor iframe. Adds `MountOptions.disableLaser`; the viewer reads `?edit=1` and passes it.

### Patch Changes

- Updated dependencies [[`aed9d10`](https://github.com/starside-io/verso/commit/aed9d10938670a5375aba78559b986e50a9ce0b2)]:
  - @starside-io/verso-schema@0.2.0
  - @starside-io/verso-themes@0.1.1
