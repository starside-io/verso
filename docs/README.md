# Verso Documentation

Verso is a JSON-driven presentation system. Slides are plain JSON files, themes are JSON, and the canonical output is HTML rendered by a small runtime. This folder explains every moving part.

## Quickstart

```bash
npm install -g @starside-io/verso-cli
verso init my-deck
cd my-deck
verso edit          # opens the visual editor in your browser
```

If you'd rather skip the editor and write JSON by hand:

```bash
verso dev           # serves the deck at http://localhost:5173
```

## CLI reference

| Command | What it does |
|---------|--------------|
| [`verso init [name]`](./commands/init.md) | Scaffold a new project from a template. |
| [`verso dev`](./commands/dev.md) | Live-reload viewer for the current project. |
| [`verso edit`](./commands/edit.md) | Launch the visual editor (viewer + editor + browser). |
| [`verso new slide [id]`](./commands/new.md#new-slide) | Create a slide, or import many from a Markdown outline. |
| [`verso new layout <name>`](./commands/new.md#new-layout) | Scaffold a custom layout file. |
| [`verso theme add <target>`](./commands/theme.md) | Add a theme by built-in name or file path. |
| [`verso theme list`](./commands/theme.md) | List built-in and project-local themes. |
| [`verso build`](./commands/build.md) | Export each path as PDF or self-contained HTML; PNG available from the editor. |

## Authoring reference

- **[Blocks](./blocks.md)**: every content block type, its props, and examples.
- **[Layouts](./layouts.md)**: every built-in layout, what it expects in `slide.content`, and how to write your own.
- **[Themes](./themes.md)**: the color cascade, built-in themes, and authoring custom ones.
- **[Path branching](./path-branching.md)**: `path_include` / `path_exclude` per slide and per block, the runtime path picker, and the editor's Paths view.

## Feature deep-dives

- **[Transitions](./features/transitions.md)**: 16 built-ins plus how to register your own.
- **[Variables](./features/variables.md)**: `{{date}}`, `{{author}}`, and friends.
- **[Watermark](./features/watermark.md)**: deck-wide watermark stamped on every render.
- **[Embed block](./features/embed.md)**: iframes with a PDF-safe static fallback.
- **[Speaker mode and laser pointer](./features/speaker.md)**: presenter notes, timer, and the draw-to-highlight overlay.

## Project layout

A Verso project is just a folder with this shape:

```
my-deck/
  deck.json             # manifest: title, theme, paths, slide_order, variables, watermark
  slides/
    00-cover.json
    01-intro.json
    ...
  themes/               # optional: project-local themes (override built-ins by name)
    my-brand.json
  assets/               # optional: images uploaded via the editor land here
  verso.config.ts       # optional: register custom layouts / components / themes
```

The manifest is the only required file. `slides/` is a flat folder; the manifest's `slide_order` tells the runtime in what order to render them.
