---
"@starside-io/verso-editor": patch
"@starside-io/verso-layouts": patch
"@starside-io/verso-cli": minor
---

Three fixes from real-world use of the latest release.

**Editor: icon picker works in any node_modules layout.** The picker and inspector preview tiles used `import.meta.glob('/node_modules/@phosphor-icons/core/...')` which only resolves to the project root's own node_modules. In published editor installs npm/pnpm hoists @phosphor-icons above the editor's node tree, so the glob matched zero files and every cell showed a blank placeholder. Replaced with a runtime fetch using a Vite `define`-injected URL constant resolved at config-load time via `createRequire`. Works in workspace dev AND in any published install regardless of hoisting.

**Layouts: card-stretch only when every column is all-card.** The earlier card-height-matching rule stretched every card in two-col / three-col layouts, which caused a card paired with non-card content (bullets, text) to expand into empty space inside its border. Tightened with a `:has()/:not(:has())` guard so the stretch only kicks in when every column contains exactly card blocks. Mixed-content rows leave cards at natural height; all-card rows still visually align.

**CLI: skip the local cli dep when global verso is on PATH.** `verso init` now detects a global `verso` install. When present, the generated `package.json` omits the `@starside-io/verso-cli` dependency and the "next steps" hint skips the `npm install` line. No more re-downloading the entire CLI tree for every new deck. AI-skill environments without a global install still get the dep + install hint.
