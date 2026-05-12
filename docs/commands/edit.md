# `verso edit`

Launches the visual editor: an HTTP server that proxies the viewer dev server into an iframe, with toolbars, an inspector, and a JSON view.

## Synopsis

```
verso edit [options]
```

## Options

| Flag | Description |
|------|-------------|
| `-d, --dir <path>` | Project directory. Default: current working directory. |
| `-p, --port <port>` | Editor port. Default: `5180`. |
| `--viewer-port <port>` | Viewer port. Default: `5173`. |
| `-H, --host <host>` | Host to bind. Default: `localhost`. |
| `--no-open` | Don't open the browser automatically. |

## What the editor gives you

A single-window UI with three panes plus a top toolbar and a bottom JSON view.

### Toolbar

Every button uses a 16px icon + label. From left to right:

- **+ Slide**: creates a stub slide and appends to `slide_order`.
- **+ Block ▾**: dropdown of every block type, grouped by category. Click → appends a stub to the active slide.
- **Layout ▾**: pick the layout for the active slide. See [layouts.md](../layouts.md).
- **Align ▾**: per-slide horizontal + vertical alignment.
- **⚙ Deck**: edit `manifest.title` and declare custom [variables](../features/variables.md).
- **Watermark**: deck-wide [watermark](../features/watermark.md). Text + position + opacity.
- **Find** (also `Cmd/Ctrl+Shift+F`): deck-wide find & replace with optional regex and case-sensitive flags.
- **Undo / Redo**: per-slide history with a 50-step cap. `Cmd/Ctrl+Z` and `Cmd/Ctrl+Shift+Z` also work.
- **Present ▾**: opens present mode in a new tab. Dropdown: slides-only or speaker view.
- **Export ▾**: PDF (active path), HTML (single self-contained file), or PNG (just the active slide).
- **Paths**: switches the main view to a path-overview timeline. See [path-branching.md](../path-branching.md).
- **Theme toggle**: dark / light editor chrome.

### Left rail: slide list

Click to select, drag to reorder, right-click to delete. Section markers (added via the Paths view) show as headers. `Cmd+K` opens a quick-jump palette.

### Center: live preview

The viewer in an iframe. When the editor saves a slide, the viewer's file watcher triggers a full reload. The iframe lands on whichever slide is currently selected in the editor.

### Right pane: Inspector / Transitions / Themes

- **Inspector**: slide title + header inputs, a tree of blocks (including nested `card` / `panel` content), a per-block edit form, image upload drop zone, speaker notes, and the annotation field.
- **Transitions**: pick a per-slide transition. See [transitions.md](../features/transitions.md).
- **Themes**: every theme available (built-in + project-local). Click to apply. Project themes have editable color swatches; built-ins offer "Duplicate to project" to make an editable copy.

### Bottom: JSON view

Always visible. Shows the active slide's raw JSON with syntax highlighting. `Cmd+S` saves; the editor warns on invalid JSON.

## How it works under the hood

`verso edit` spawns two Vite dev servers:

- The **viewer** on `--viewer-port`. Serves slides + watches the filesystem.
- The **editor** on `-p/--port`. Proxies `/__verso/*` (data routes) and `/` (slide preview) to the viewer.

Both are killed when you `Ctrl+C` the CLI.

## Tips

- The editor's right pane uses `backdrop-filter: blur`, which creates a containing block for fixed-positioned descendants. If you build a modal in editor code, mount it at the App root, not inside the toolbar.
- The JSON view is always authoritative. If you don't like an inspector form, you can edit the JSON directly and hit Save.
