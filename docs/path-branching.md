# Path branching

The Verso pitch: **one deck, multiple audiences**. You author every slide once and tag which audiences see what. At present-time, the viewer renders just the slides (and blocks within slides) that survive the path filter.

## Declaring paths

In `deck.json`:

```json
{
  "title": "Q4 readout",
  "paths": {
    "sales":       { "label": "Sales team", "color": "#5eead4" },
    "engineering": { "label": "Engineering", "color": "#a78bfa" },
    "exec":        { "label": "Executive summary", "color": "#fb923c" }
  },
  "slide_order": [...]
}
```

Each path has a `label` (display name in the picker), an optional `color` (used in the editor's Paths view and the path picker swatch).

A deck with no `paths` is single-audience: everything renders for everyone.

## Slide-level filtering

Per slide:

```json
{
  "id": "deep-dive",
  "title": "Architecture deep dive",
  "layout": "two-col",
  "path_include": ["engineering"],
  "content": [...]
}
```

Rules:

- `path_include`: a whitelist. Slide renders only in these paths. Default: all paths.
- `path_exclude`: a blacklist. Slide is dropped from these paths. Wins over `path_include`.
- A slide is included if `pathId` ∉ `path_exclude` AND (`path_include` is empty OR `pathId` ∈ `path_include`).

## Block-level filtering

Same fields work on any block, including nested ones inside `card` / `panel`:

```json
{
  "type": "bullets",
  "items": ["Common point", "Sales-only point", "Engineering-only point"],
  "path_include": ["sales", "engineering"]
}
```

Want different items per path? Either split into two `bullets` blocks (each with its own `path_include`) or use [variables](./features/variables.md) for the simple case.

## URL parameters

| Param | Effect |
|-------|--------|
| `?path=<id>` | Render the named path. |
| (none) + multiple paths in manifest | Show the path picker. |
| (none) + single path in manifest | Render that path directly. |

The path picker buttons follow the active **theme** (surface background, foreground text), with the per-path color demoted to a 10px dot on the left.

## In the editor: the Paths view

Click **Paths** in the toolbar to switch from the slide editor to a timeline view.

What you see:

- **Legend at the top**: one pill per path. Click to filter slides by that path; click again to clear. A `+ Path` button to add a new path. A `Path colors` / `Theme colors` toggle that swaps how the SVG lines and node dots are colored. Path color is the default; theme colors uses the deck's primary/secondary/accent palette in order.
- **Timeline**: each slide is a card. Cards are stacked into lanes by their path membership: slides included in every path sit on the spine, slides included in only some paths sit on branched lanes.
- **Path lines**: one continuous line per path, threading through every slide it includes.
- **Path checkboxes inside each card**: toggle a slide's `path_include` membership without leaving the view.

Drag cards horizontally to reorder slides. Double-click a card to jump back into the slide editor on that slide.

## Programmatic access

Inside a custom layout or component, `ctx.pathId` is the active path. You can branch render logic on it, though most projects rely on schema-level filtering rather than code-level checks.

```ts
defineLayout({
  name: 'audience-aware',
  render: (slide, ctx) => {
    if (ctx.pathId === 'exec') {
      // Executive summary: drop the long-form blocks
      return html`<div class="exec">...</div>`
    }
    return html`<div>...</div>`
  },
})
```

## Tips

- **Use sections**. Add `section` markers in `slide_order` (via the Paths view) to group slides. The agenda layout's auto-build prefers sections over individual slide titles when both exist.
- **Keep slide ids stable**. The editor tracks history per slide id; renaming a slide loses its undo stack.
- **Don't over-branch**. If two paths share 80% of the deck, branching at the block level is cleaner than maintaining two near-identical slides.
