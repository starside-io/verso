<div align="center">

<img src="./verso.svg" alt="Verso logo" width="180" />

# Verso

*The other side of the same story.*

[![Early Access](https://img.shields.io/badge/status-early%20access-orange)](https://github.com/starside-io/verso)
[![npm](https://img.shields.io/npm/v/@starside-io/verso-cli?label=%40starside-io%2Fverso-cli)](https://www.npmjs.com/package/@starside-io/verso-cli)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![starside.io](https://img.shields.io/badge/by-starside.io-ff2d87)](https://starside.io)

> **Early access.** APIs and JSON schemas may shift before 1.0. Pin your CLI version in production.

</div>

---

## What It Is

Verso is a presentation system where content is defined in JSON, rendered in HTML, and built from the ground up for multiple audiences. One deck, multiple paths through it, one consistent design system underneath.

Three ways to author:
- **Edit JSON directly** in your editor of choice — slides are plain files in `slides/`.
- **`verso edit`** — visual editor with live preview, form-per-block, drag-to-reorder, theme picker, and a syntax-highlighted JSON panel.
- **Have an AI write it** — the schema is small enough that an LLM can produce valid Verso JSON straight from a prompt.

Either way, the output is the same: plain JSON files Verso can present, export as PDF, or share.

---

## Install

```bash
npm install -g @starside-io/verso-cli
# or: pnpm add -g @starside-io/verso-cli
# or: yarn global add @starside-io/verso-cli
```

Then verify:

```bash
verso --help
```

**Requirements**: Node 20+. PDF export bundles its own headless Chromium via Puppeteer (first run downloads ~170 MB).

### Quickstart

```bash
verso init my-deck -t minimal   # scaffold a project
cd my-deck
verso edit                       # visual editor with live preview
verso build                      # export PDF (default) or --format html
```

---

## CLI Commands

| Command | Description |
|---|---|
| `verso init [name] -t <template>` | Scaffold a new project. Templates: `minimal`, `branded`, `inline-theme`, `multi-path`, `layouts-gallery`, `extended`. Pass `--with-config` to include a `verso.config.ts` for custom layouts. |
| `verso dev` | Start the dev viewer against the current project. Options: `-d/--dir <path>`, `-p/--port <port>` (default 5173), `-H/--host <host>`, `--open`. |
| `verso edit` | Launch the visual editor (viewer + editor + browser). Options: `-d/--dir <path>`, `-p/--port <port>` (editor, default 5180), `--viewer-port <port>` (default 5173), `-H/--host <host>`, `--no-open`. |
| `verso new slide [id]` | Create slide(s) and append to `slide_order`. With no flags, stubs a single slide. `-f/--from <path-or-url>` accepts a Verso slide JSON (imports one slide, `id` defaults to the source's id) **or a Markdown outline** (`.md` / `.markdown` / `.mdx`, imports many slides, one per `# heading`). Other options: `-l/--layout <name>`, `-p/--paths <ids>` (applied to every imported slide). When importing markdown, the positional `[id]` becomes a prefix for generated ids. See [Markdown outline import](#markdown-outline-import). |
| `verso new layout <name>` | Scaffold a custom layout TS file and register it in `verso.config.ts`. |
| `verso theme add <target>` | Add a theme by built-in name or file path. |
| `verso theme list` | List built-in and project-local themes. |
| `verso build` | Export each path of the deck. Options: `-f/--format pdf\|html` (default `pdf`), `-p/--path <id>`, `-o/--out <path>` (default `dist/`), `-s/--size 16:9\|4:3\|letter\|a4`, `--no-inline-images` (html only, keep image src URLs as-is). PDF uses bundled headless Chromium. HTML emits a single self-contained `.html` file per path with CSS, slides, navigation, and (by default) all images base64-inlined: drag it anywhere, no server needed. PNG export of an individual slide is available from the editor's **⤓ Export ▾ → PNG** dropdown. |

---

### Markdown outline import

Drop an existing draft into Verso without writing JSON by hand:

```
verso new slide --from outline.md
verso new slide intro --from outline.md   # prefix every generated id with "intro-"
verso new slide --from outline.md -l hero -p sales,internal
```

Every top-level `# heading` becomes a new slide. The id is slugified from the heading; collisions with existing slides get a numeric suffix (`welcome`, `welcome-2`, ...). All generated slides are appended to `slide_order` in one pass.

Block mapping inside a slide:

| Markdown | Verso block |
| --- | --- |
| `## Subheading`, `### Subheading` | `heading` (level 2 / 3) |
| Paragraph | `text` |
| `- item`, `* item`, `1. item` | `bullets` (one block per contiguous list) |
| ` ```lang ` ... ` ``` ` (or `~~~`) | `code` (with `language` if specified) |
| `> quote` (multi-line, `--` for attribution) | `quote` |
| `---` on its own line | `divider` |

Inline markdown (bold/italic/links) is preserved verbatim in the resulting text. Default layout is `content`; override with `--layout`. `--paths` applies to every imported slide. Content above the first `# heading` is ignored with a warning.

---

## Built-in Features

**Layouts** (`@starside-io/verso-layouts`)
- Core: `content`, `two-col`, `three-col`, `image-left`, `image-right`, `hero`, `full-image`
- Openers / closers: `cover`, `section`, `closing`, `author`
- Structured: `agenda`, `compare`, `stats`, `big-number`, `quote`, `timeline`

The `agenda` layout auto-fills from the deck outline when the slide has no `bullets` / `heading` content of its own: it lists section markers if any exist, otherwise every path-filtered slide title. Item count drives a responsive column count (1 col ≤8 / 2 col ≤20 / 3 col >20). Set `omit_from_agenda: true` on a slide (cover, the agenda itself, closing) to keep it out of its own table of contents. A manual `bullets` block on the slide always wins, so you can pin a custom agenda when you want one.

**Variables (`{{key}}` interpolation)**

Any slide text can reference `{{key}}` placeholders that resolve at render time. Useful for templates: declare `{{author}}` once, reuse across every slide.

- **Built-in keys** (no declaration needed): `date` (today as `YYYY-MM-DD`), `time` (`HH:MM`), `deckTitle` (= `manifest.title`), `pathId` (= active path).
- **Custom keys**: declared in `manifest.variables` (a `Record<string, string>` field on `deck.json`) or via the editor's **⚙ Deck** dialog. Custom keys win on collision with built-ins so you can override for testing.
- **Where they resolve**: across all rendered slide HTML, after escaping. Plain text, headings, bullets, callouts, captions, and so on. Code blocks also get substituted, so escape literal `{{` in code samples by inserting a zero-width space or using a different sigil.
- Unknown keys are left as-is, so `{{not-defined}}` just renders verbatim.

**Content blocks**
- Text: `heading`, `text`, `bullets`, `quote`
- Media: `image`, `code`, `embed`
- Containers (recursive): `card`, `panel`
- Decoration: `callout`, `badge`, `accent-bar`, `divider`
- `custom` for project-defined components

The `embed` block renders an `<iframe>` (YouTube, CodeSandbox, Figma, etc). Props: `src`, optional `title`, `aspect` (`16:9` / `4:3` / `1:1` / `21:9` / `auto`), `allow` for feature-policy. PDF / print media hides the iframe and shows `fallback_src` (image URL) or `fallback_text` instead, since headless Chromium doesn't reliably rasterize cross-origin frames.

Decoration primitives (`card`, `panel`, `badge`, `accent-bar`, `divider`) take a semantic `tone` (`primary` / `secondary` / `accent` / `muted` / `surface`) and a `variant` (`soft` / `solid` / `outline`) so brand colors flow automatically.

**Themes** (`@starside-io/verso-themes`)
- Built-in: `verso-slate`, `verso-warm`, `verso-mono`, `verso-neon` (cyberpunk dark), `verso-mars` (Mars dark)
- Project-local themes (loaded from JSON in `themes/`) and inline themes in the manifest

**Path branching**
- `path_include` / `path_exclude` per slide and per content block
- `?path=<id>` URL param picks the active path; path picker appears when no path is set
- Path picker buttons follow the active **theme** (surface background, foreground text, primary hover), with the per-path color demoted to a 10px swatch on the left. This keeps the picker visually cohesive with the deck even when paths carry strong brand colors.

**Style overrides**
- Cascade: theme defaults → deck → slide → block. Each level scopes color roles (`primary`, `secondary`, `classic`, `accent`, `surface`, `muted`, `background`, `foreground`) and emits CSS variables.
- `accent` falls back to `secondary`; `surface` and `muted` are derived from `primary`/`secondary` via `color-mix()` if not set explicitly. Themes can also set `background` and `foreground` directly for self-contained dark modes.

**Per-slide alignment**
- `align: { horizontal: 'left' | 'center' | 'right', vertical: 'top' | 'middle' | 'bottom' }` applied by every built-in layout

**Viewer modes**
- Default present mode, `?mode=speaker` for two-panel speaker view, `?debug=1` (or `?mode=debug`) for the debug overlay
- Keyboard navigation: arrows / PageUp / PageDown / Space / Home / End

**Custom extensions**
- User layouts and components registered through `verso.config.ts`
- Project styles via `styles.css` or `verso.css` at the project root

---

## Visual Editor

`verso edit` launches a three-pane editor in the browser. It runs the dev viewer + an editor app side by side: the editor edits files on disk, the viewer renders them, and changes hot-reload in an iframe preview.

```
┌──────────────────────────────────────────────────┐
│ + Slide │ + Block ▾ │ Layout ▾ │ Align ▾ │ ↶ ↷  ▶ ⤓ │
├──────┬───────────────────────────┬───────────────┤
│ Slide│      Live preview         │ Inspector ▼   │
│ list │   (existing viewer)       │   Themes      │
│      │                           │               │
├──────┴───────────────────────────┴───────────────┤
│ Raw JSON panel (active slide, regex-highlighted) │
└──────────────────────────────────────────────────┘
```

**Launch**
```sh
verso edit                       # default ports: editor 5180, viewer 5173
verso edit -d ./my-deck          # against another project directory
verso edit -p 6000 --viewer-port 6001
verso edit --no-open             # skip auto-opening the browser
```
The CLI starts both servers in-process, prints the editor URL, opens the default browser, and shuts both down cleanly on Ctrl+C.

**Toolbar**

Every button uses the same `<24px icon> + <text label>` shape. Icons live in a single inline-SVG component ([`apps/editor/src/components/Icon.tsx`](apps/editor/src/components/Icon.tsx)) so there's no icon-font dependency; new buttons just pick a `name`.

- **+ Slide** — prompts for an id, creates a stub slide, appends to `slide_order`.
- **+ Block ▾** — categorized menu: Text (heading, text, bullets, quote) / Media (image, code) / Containers (card, panel) / Decoration (callout, badge, accent-bar, divider). Click → appends a sensible stub to the active slide.
- **Layout: \<name\> ▾** — all 17 built-in layouts grouped into Core / Openers·closers / Structured. Click → sets `slide.layout`.
- **Align ▾** — segmented controls for `align.horizontal` (left/center/right) and `align.vertical` (top/middle/bottom).
- **⚙ Deck** — opens the deck-properties dialog: edit the deck title and declare custom **variables** (e.g. `author`, `client`, `version`) that any slide can reference as `{{author}}`. Built-in keys (`date`, `time`, `deckTitle`, `pathId`) are always available without declaration; they resolve at render time.
- **Watermark** — opens the watermark dialog. Text + position (bottom-left / center / right) + opacity slider. The result is stamped semi-transparently on every slide (PDF, HTML, present, speaker). Leave the text blank or hit Remove to clear.
- **⌕ Find** — opens deck-wide find & replace (also `Cmd/Ctrl+Shift+F`). Searches every text-bearing field across slides (title, header, notes, annotation, and every block field including bullets items, code source, image alt/caption). Optional **case-sensitive** and **regex** flags. Matches are grouped by slide; click to jump, **Replace** rewrites one, **All** rewrites every match in the deck.
- **↶ Undo / ↷ Redo** — per-slide history (50-step cap), or use Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z (Ctrl+Y also works). Slide-level only; manifest/theme changes aren't tracked.
- **▶ Present** — opens the active path in present mode in a new tab, on the current slide. In present (and speaker) mode, **click-and-drag** anywhere paints a red laser-pointer trail that fades over ~900ms. Useful when screen-sharing; no toggle needed, just drag.
- **⤓ Export ▾** — split button: primary action runs PDF for the active path. Dropdown adds **HTML** (single self-contained file with images inlined or kept as URLs) and **PNG** (just the active slide, rendered at 1920x1080 via headless Chromium). Each result path is shown in the status pill.
- A status pill at the right edge shows saving/ok/error for every operation.

**Slide list (left)**
- Click to select, drag to reorder, right-click to delete.
- Active slide is highlighted; deleting it picks the next one.

**Live preview (center)**
- The existing viewer in an iframe. When the editor saves a file, the viewer's file watcher triggers full-reload, so the preview is always in sync.
- The editor passes `?slide=<id>` so the iframe lands on the active slide.

**Inspector / Transitions / Themes (right)**

*Inspector tab* (default)
- **Slide** section: edit `title` and `header` (kicker) directly.
- **Blocks** tree: shows every block in the slide, including blocks nested inside `card` and `panel`. Click a block to open its form.
- **Edit form**: per-block-type form with the right inputs (textarea for text/quote/code, item list for bullets, tone/variant selects for cards/panels/badges, level selector for headings, etc.).
- **Image upload**: image blocks have a drop zone under the `src` field. Drag a file in (or click to browse) and the editor uploads it to `<project>/assets/`, then writes the project-relative path (`assets/foo.png`) into `image.src`. Filenames are sanitized server-side and collisions get a numeric suffix (`foo.png` → `foo-2.png`). Allowed types: PNG, JPEG, GIF, SVG, WebP, AVIF, up to 25 MB. Remote URLs still work via the text input.
- Up/down/× actions to reorder or remove the selected block.

*Transitions tab*
- Sets `slide.transition` for the active slide only. There's no deck-wide default: each slide opts in (or stays on the snap-to default).
- 16 built-ins grouped by feel:
  - **Off** — `none` (default).
  - **Move** — `fade`, `slide-left`, `slide-right`, `slide-up`, `slide-down`.
  - **Scale** — `zoom` (in), `zoom-out`, `pop` (spring overshoot).
  - **3D** — `flip-x`, `flip-y`, `tilt` (perspective).
  - **Reveal** — `iris` (circular), `wipe-right`, `wipe-down` (clip-path).
  - **FX** — `blur`.
- The chosen transition plays when this slide becomes active in present or speaker mode. Each option has a hover-animated swatch in the panel so you can preview the motion before committing.
- Animations are skipped when the user has `prefers-reduced-motion: reduce` enabled.
- The field is a free-form string at the schema level, so projects can register custom names by adding their own `.verso-transition-<name>` keyframes in `styles.css` / `verso.css`.

*Themes tab*
- Lists every theme available: project-local themes from `themes/*.json` plus the bundled built-ins.
- Click a theme to apply it (writes `deck.json` with the new `theme` field).
- Project themes have **clickable color swatches** — each opens a native color picker. "Edit details" reveals every color role (primary, secondary, classic, accent, surface, muted, background, foreground) with both a color picker and a hex input.
- Built-in themes are read-only. Click "Duplicate to project" to create an editable copy in `themes/`.

**JSON panel (bottom)**
- Always visible. Shows the active slide's JSON with regex-based syntax highlighting (keys, strings, numbers, literals, punctuation).
- Edit freely; press Cmd+S (or click Save) to persist. Validates against the Zod schema before writing — invalid JSON or schema errors surface inline without losing your draft.
- The panel and the form editors stay in sync: editing in the form updates the JSON, and vice versa after Save.

**What it writes (and where)**
- Every action goes through `PUT`/`POST`/`DELETE` routes on the dev server's data plugin, which validates with Zod and writes the JSON file atomically (tmp + rename so a crash mid-write can't corrupt your deck).
- All edits are real edits to the files on disk — no hidden state, no separate database. Your editor is also your filesystem.

**Architecture**
- `apps/editor/` — Preact + signals UI, runs on its own Vite server. Proxies `/__verso/*` to the viewer.
- `apps/viewer/` — adds editing routes (`PUT /__verso/slide/:id`, etc.) to the same data plugin that powers `verso dev`.
- `tools/cli` — `verso edit` command spawns both via `startViewer()` (from `@starside-io/verso-viewer`) and `startEditor()` (from `@starside-io/verso-editor`).

---

## Architecture Overview

Two concerns, cleanly separated forever:

- **JSON** — content, structure, paths, and style intent
- **HTML/CSS** — the renderer, themes, layouts, and responsiveness

The AI authors JSON. The renderer is a dumb engine that consumes it. Neither layer knows too much about the other.

---

## Layer 1: The Slide Schema

Every slide is a JSON object:

```
id, title, content[], layout, tags[], notes,
path_include[], path_exclude[], style_overrides{}
```

**`path_include` / `path_exclude`** control visibility per audience. A slide tagged `path_include: ["ba"]` simply does not exist in a PM session.

Content blocks within a slide can also be path-gated, so a single slide can show different bullet points depending on who is in the room.

**`style_overrides`** lets any slide or block deviate from the theme without touching the theme itself.

---

## Layer 2: The Deck Manifest

The single source of truth for a presentation:

```json
{
  "title": "Requirements Gathering Workshop",
  "theme": "verso-slate",
  "paths": {
    "ba": { "label": "Business Analysts", "color": "#4A90D9" },
    "pm": { "label": "Project Managers", "color": "#7B68EE" },
    "full": { "label": "Full Deck", "color": "#333" }
  },
  "slide_order": [
    "intro-1", "intro-2", "shared-context",
    "ba-deep-dive", "pm-overview", "closing"
  ]
}
```

Paths are first-class citizens defined here, not scattered across slides. Slides just declare membership.

---

## Layer 3: The Theme System

Every Verso theme exposes exactly three semantic color roles:

| Role | Purpose |
|---|---|
| **primary** | Main brand color, headline accents, active elements |
| **secondary** | Supporting color, subheadings, borders, highlights |
| **classic** | Neutral base, backgrounds, body text, UI chrome |

A theme definition:

```json
{
  "name": "verso-slate",
  "colors": {
    "primary": "#1A3C6E",
    "secondary": "#4A90D9",
    "classic": "#F4F4F4"
  }
}
```

The renderer maps these to CSS variables (`--color-primary`, `--color-secondary`, `--color-classic`). Every layout template references only those variables, never hardcoded hex values. Swapping the entire visual identity of a deck is one string change in the manifest.

### Color Override Cascade

Overrides are scoped and additive at four levels:

```
Theme defaults → Deck overrides → Slide overrides → Block overrides
```

Nothing bleeds upward. A block override does not affect the slide. A slide override does not affect the deck. Example:

```json
{
  "id": "ba-deep-dive",
  "title": "Process Mapping Deep Dive",
  "layout": "two-col",
  "style_overrides": {
    "primary": "#D95B4A",
    "background": "#1C1C1C"
  },
  "content": [
    {
      "type": "bullets",
      "items": ["As-is mapping", "Gap analysis"],
      "style_overrides": {
        "secondary": "#FFD166"
      }
    }
  ]
}
```

This means an AI can express design intent ("this slide should feel urgent, warmer tone") as a simple JSON override without touching the theme or any other slide.

---

## Layer 4: Path Branching

Three node types in any deck flow:

| Type | Description |
|---|---|
| **linear** | Shows in every path, always |
| **branch** | Shows only for specified paths |
| **merge** | Rejoins all paths to a common slide |

A BA + PM deck resolves like this:

```
[intro] → [shared context] → [branch: BA] → [branch: PM] → [merge: closing]
```

At runtime the renderer reads `?path=ba` from the URL, flattens the relevant slides into a linear sequence, and presents exactly that. The other path does not exist for that session.

---

## Layer 5: The Renderer

A single lightweight HTML app that:

1. Loads the manifest and all slide JSON
2. Shows a path picker if no `?path=` param is present
3. Filters and orders slides for the active path
4. Resolves the color cascade and injects CSS variables at the correct scope
5. Renders each slide using the named layout template

**Themes** are CSS variable sets. **Layouts** are named templates (see the Built-in Features list above for the full set of 17). The slide just declares `"layout": "two-col"` (or any other name) and the renderer handles the rest.

All fully responsive. No build step. No dependencies required to present.

---

## Layer 6: Speaker Mode

Every slide carries a `notes` field. Appending `?mode=speaker` opens a two-panel view with the current slide, presenter notes, and a next-slide preview. Pure HTML, works offline, no plugins.

A click-and-drag anywhere on the slide (in either present or speaker mode) paints a red **laser-pointer** trail that fades over ~900ms. Useful when screen-sharing. No toggle: drag = on, release = trail fades out. Implemented as a full-viewport canvas mounted on `document.body`, so it survives slide navigation without re-allocation.

---

## Authoring Flow

```
1. Define paths and theme in the manifest
2. Write slides in JSON, tag with path_include
3. Add style_overrides where design intent needs to deviate
4. Open index.html?path=pm in a browser
5. Present live, or export per path to a self-contained HTML file
```

For AI-assisted authoring, every instruction maps directly to a JSON operation:

- "Add a slide after intro-2 for the PM path" → insert object with `path_include: ["pm"]`
- "Make this slide feel warmer" → add `style_overrides: { "primary": "#C0622F" }`
- "Use the secondary color as the background here" → `style_overrides: { "background": "var(--color-secondary)" }`

No binary format. No XML archaeology. No guessing.

---

## Phase 2 Roadmap

Shipped:
- ~~**Per-path export** to a self-contained shareable HTML file~~ → `verso build --format html` emits a single inlined `.html` per path; PDF via headless Chromium remains the default
- ~~**Slide portability** — slides are plain JSON files, importable into any Verso deck~~ → `verso new slide --from <path-or-url>`, including Markdown outlines (`.md`)
- ~~**Theme preview panel**~~ → built into `verso edit`'s Themes tab (swatches, color picker, duplicate built-ins to edit)
- ~~**Live reload during JSON authoring**~~ → file watcher + iframe HMR in `verso edit`
- ~~**Undo/redo** in the editor~~ → per-slide history, 50-step cap, Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z (Ctrl+Y also works)
- ~~**One-click PDF / HTML / PNG export & Present** buttons in the editor toolbar~~ → split `⤓ Export ▾` for PDF / HTML / per-slide PNG, `▶ Present ▾` for slides only / speaker view
- ~~**Deck-wide find & replace** with regex + per-block scoping~~ → `Cmd/Ctrl+Shift+F` or `⌕ Find` in the toolbar
- ~~**Reusable templates / variables**~~ → `{{date}}`, `{{deckTitle}}`, `{{pathId}}` plus custom keys in `manifest.variables`, edited via `⚙ Deck`
- ~~**Per-slide transitions**~~ → 16 built-ins (fade, slide-*, zoom, flip, iris, wipe, pop, tilt, blur, ...) in the Transitions tab
- ~~**Auto-built agenda**~~ → `agenda` layout falls back to the deck outline when the slide has no content of its own; `omit_from_agenda` opts a slide out
- ~~**Iframe `embed` block** (YouTube / CodeSandbox / Figma) with static PDF fallback~~
- ~~**Deck-wide watermark**~~ → `Watermark` toolbar button, position picker + opacity slider, stamped on every render path
- ~~**Laser-pointer overlay** in present/speaker mode~~ → click-and-drag = red trail that fades

Still on the list:
- **Diff view** showing what changes between paths side by side
- **Annotation layer** stored separately from content, so the base deck stays pristine
- **AI panel** in the editor for "rewrite this slide / generate alt text / tighten this list" using the active slide as context
- **One-click publish** wrapping the HTML export with an S3 / R2 / Netlify upload
- **Charts and Mermaid blocks** with server-rendered SVG so they survive PDF export

---

## Why Verso Over PowerPoint

| Problem with PPTX | How Verso solves it |
|---|---|
| Binary format | Plain JSON, readable and writable by anything |
| No semantic structure | Every element has a type, role, and scope |
| Branching requires duplicate decks | Paths are first-class in the manifest |
| Theme changes touch every slide | Theme is one field, CSS variables do the rest |
| Hardcoded colors everywhere | Three semantic roles, one scoped override pattern |
| Speaker notes buried in XML | Top-level field on every slide |
| AI has to guess layout intent | Layout is a named, explicit field |
