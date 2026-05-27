---
"@starside-io/verso-schema": minor
"@starside-io/verso-runtime": minor
"@starside-io/verso-layouts": minor
"@starside-io/verso-build": minor
"@starside-io/verso-viewer": minor
"@starside-io/verso-editor": minor
---

Three substantial additions plus polish on cards and bullets.

**Layout-aware schema validation.** `Slide.parse` now enforces minimum block counts per layout: `two-col` needs a multiple of 2, `three-col` needs a multiple of 3, `image-left`/`image-right` need at least one image block, `compare` needs at least 2 top-level heading groups. Errors include the slide id and a readable explanation pointing at the failing layout.

**Slide overflow detection in CLI and editor.** Every `buildPdf` / `buildHtml` / `buildPng` now measures `.verso-slide.scrollHeight` against the page height and prints a yellow `⚠ Slide "X" overflows by Npx` warning per affected slide. Results carry a new optional `overflows?: SlideOverflow[]` field. The live editor preview reports the same overflow info to the editor app, which shows a per-slide badge in the SlideList, a status pill in the Toolbar, and an "N slide(s) overflow" suffix on export success messages.

**Independent title vs content alignment.** `Slide.align` now accepts `{ title?, content? }` in addition to the existing flat `{ horizontal?, vertical? }`. Layouts that have both a title zone and a content zone (`content`, `two-col`, `three-col`, `image-left`, `image-right`, `hero`, `agenda`, `compare`, `stats`, `big-number`, `timeline`, `author`) emit separate `.verso-title-zone` and `.verso-content-zone` wrappers when the nested form is used. Flat align stays back-compatible. Editor Align dropdown shows two grouped sections (Title / Content) and normalizes to flat when both zones match.

**Cards get optional header + icon.** `CardBlock` now optionally carries `header`, `icon`, `iconWeight`, `iconTone`. The Card component renders an icon + header strip above content[] when either is set. Editor card form exposes a Header text input + a Browse icon picker button + an Icon tone selector.

**Per-item bullet icons in the editor.** Each bullet item row in the Inspector now has a square icon picker button next to the text input. Selecting an icon converts the item to the object form `{ text, icon, iconWeight }`; clearing collapses back to a plain string.

Also: cards in `two-col` / `three-col` layouts now stretch to match row heights via `:has(>.verso-card)`, so sibling cards line up visually instead of sizing to their individual content.
