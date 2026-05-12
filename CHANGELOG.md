# Changelog

All notable changes to Verso are documented here.

This project uses [Changesets](https://github.com/changesets/changesets) for version management. Each package (`@starside-io/verso-cli`, `@starside-io/verso-runtime`, `@starside-io/verso-schema`, etc.) is versioned independently; entries below track the CLI version as the user-facing reference point.

---

## 0.1.0 — Early Access

Initial public release.

### What's included

- **17 built-in layouts**: content, two-col, three-col, image-left, image-right, hero, full-image, cover, section, closing, author, agenda (auto-built), compare, stats, big-number, quote, timeline
- **16 per-slide transitions** across 6 groups (fade, slide, zoom, flip, iris, wipe, pop, blur) with `prefers-reduced-motion` support
- **6 built-in themes**: verso-slate, verso-warm, verso-mono, verso-neon, verso-mars, verso-forest — plus project-local JSON themes and a full color cascade (theme → deck → slide → block)
- **Path branching**: tag any slide or block with `path_include` / `path_exclude` to produce audience-specific decks from a single source
- **Export**: PDF (headless Chromium), self-contained HTML (images base64-inlined by default), per-slide PNG
- **Visual editor** (`verso edit`): toolbar, slide list, inspector, block forms, transitions tab, themes tab, JSON panel, Cmd+K slide search, Paths timeline view with drag-drop
- **Speaker mode**: notes pane, next-slide preview, stopwatch, click-and-drag laser pointer
- **Find & replace**: deck-wide, with regex and case-sensitive flags
- **Variables**: `{{author}}`, `{{date}}`, `{{pathId}}`, and custom keys via deck properties
- **Embeds**: YouTube, Figma, CodeSandbox, any iframe — with static fallback for PDF export
- **Watermark**: text, three positions, opacity slider, rendered on every export path
- **Markdown import**: `verso new slide --from outline.md` converts headings to slides
- **Local image assets**: drag-drop upload in the editor, stored in `assets/`
- **Auto agenda**: the `agenda` layout builds its own table of contents from the deck outline
