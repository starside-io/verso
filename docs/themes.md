# Themes

A theme is a small JSON file (or an inline object in `deck.json`) declaring color roles. The runtime resolves every color reference through a four-level cascade and emits CSS variables that every layout reads.

## The cascade

```
theme defaults  →  deck.style_overrides  →  slide.style_overrides  →  block.style_overrides
```

Each level can override any subset of color roles. Later levels win.

## Color roles

| Role | What it's for |
|------|---------------|
| `primary` | Brand color. Headings, accent bars, primary buttons. |
| `secondary` | Supporting brand color. Subheadings, dim text, secondary buttons. |
| `classic` | Canvas / page background. The cream / paper color. |
| `accent` | Highlights, hover states. Defaults to `secondary` if not set. |
| `surface` | Card / panel backgrounds. Defaults to a mix of `primary` + neutral. |
| `muted` | Borders, soft dividers. Defaults to a mix of `secondary` + neutral. |
| `background` | Whole-deck background. Defaults to `classic`. Set explicitly for self-contained dark modes. |
| `foreground` | Body text. Defaults to a contrasting color computed from `background`. |

## Built-in themes

Listed by `verso theme list`. All six ship with `@starside-io/verso-themes`:

| Name | Vibe |
|------|------|
| `verso-slate` | Slate gray + steel blue. The default. |
| `verso-warm` | Warm beige + terracotta. |
| `verso-mono` | Monochrome charcoal on cream. |
| `verso-neon` | Cyberpunk dark: black background, neon accents. |
| `verso-mars` | Dark with deep red accents. |
| `verso-forest` | Cream + forest green + sage. |

## Authoring a theme

Two ways: a project-local JSON file, or inline in the manifest.

### Project-local JSON

```bash
verso theme add ./my-brand.json
```

`my-brand.json`:

```json
{
  "name": "my-brand",
  "colors": {
    "primary": "#1A3C6E",
    "secondary": "#4A90D9",
    "classic": "#F0EAD2",
    "accent": "#d1603d"
  }
}
```

The CLI copies the file into `themes/<name>.json` and sets `manifest.theme: "my-brand"`. Project-local themes win on name collision with built-ins, so you can also override `verso-slate.json` to retheme the default.

### Inline in the manifest

```json
{
  "title": "My Deck",
  "theme": {
    "name": "inline-brand",
    "colors": {
      "primary": "#000",
      "secondary": "#666",
      "classic": "#fff"
    }
  },
  "slide_order": [...]
}
```

Useful for one-off decks. The editor's Themes tab shows inline themes as read-only; switch to a project-local theme to edit through the UI.

## Per-deck / per-slide / per-block overrides

You can override any role at any level without copying the whole theme.

```json
// deck.json: override accent for the whole deck
{
  "theme": "verso-slate",
  "style_overrides": {
    "colors": { "accent": "#ff0066" }
  }
}
```

```json
// slides/cover.json: make this slide bg darker
{
  "id": "cover",
  "layout": "cover",
  "style_overrides": {
    "colors": { "background": "#0a0a0a", "foreground": "#ffffff" }
  }
}
```

```json
// inside a slide's content: a single card with a primary tone
{
  "type": "card",
  "tone": "primary",
  "style_overrides": {
    "colors": { "primary": "#ff8800" }
  },
  "content": [...]
}
```

## CSS variables emitted

For each level, the runtime emits CSS variables on the wrapping element:

| Role | CSS var |
|------|---------|
| `primary` | `--color-primary` |
| `secondary` | `--color-secondary` |
| `classic` | `--color-classic` |
| `accent` | `--color-accent` |
| `surface` | `--color-surface` |
| `muted` | `--color-muted` |
| `background` | `--color-background` |
| `foreground` | `--color-foreground` |

Layouts and components reference these via `var(--color-primary)` etc. Never hard-code a hex in a layout; you'd break theming.

## Editor: the Themes tab

`verso edit` ships a Themes tab in the right pane with:

- A list of every theme available (built-ins + project-local).
- Click to switch. The viewer reloads with the new theme.
- For project themes: clickable color swatches that open the native color picker. "Edit details" expands to show every role with both a picker and a hex input.
- For built-ins: read-only. "Duplicate to project" creates an editable copy in `themes/`.
