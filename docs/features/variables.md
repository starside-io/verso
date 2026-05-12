# Variables

Any text in a slide can reference deck-level variables as `{{key}}`. They resolve at render time, so the same JSON works across decks just by editing the manifest.

## Built-in keys

Always available, no declaration needed:

| Key | Value |
|-----|-------|
| `{{date}}` | Today's date, formatted as `YYYY-MM-DD`. |
| `{{time}}` | Current time, formatted as `HH:MM`. |
| `{{deckTitle}}` | `manifest.title`. |
| `{{pathId}}` | The active path. |

## Custom keys

Declared in `manifest.variables` or via the editor's **⚙ Deck** dialog.

```json
{
  "title": "Q4 readout",
  "variables": {
    "author": "Mederic Burlet",
    "client": "Acme Corp",
    "version": "v1.2.0"
  },
  "slide_order": [...]
}
```

In a slide:

```json
{ "type": "text", "text": "Prepared by {{author}} for {{client}} ({{version}})" }
```

Renders as: `Prepared by Mederic Burlet for Acme Corp (v1.2.0)`.

Custom keys override built-ins on collision, so `{{date}}` can be set explicitly if you want a fixed date in archived decks.

## Editor

Open **⚙ Deck** in the toolbar. Add rows in the Variables section. Keys must start with a letter and contain only letters, digits, `_` or `-`. The built-in names (`date`, `time`, `deckTitle`, `pathId`) are reserved.

Removing a row and saving deletes that variable from the manifest. Saving with no rows clears `manifest.variables` entirely.

## What gets substituted

The interpolation pass runs over every slide's fully-rendered HTML, after layout + block components have produced their output. That means:

- Any text in any block: headings, bullets, code blocks, callouts, badges, image alts, captions.
- Slide-level fields: title, header, notes, annotation.
- HTML attribute values too (image `alt`, etc.).

It does **not** know what's "code" vs prose, so `{{key}}` inside a `code` block also gets replaced. If you need to ship literal `{{` in a code sample, use a different sigil or escape with a zero-width space.

## Unknown keys

`{{unknown-key}}` passes through verbatim. No error, no warning. Useful for "placeholder" semantics in deck templates.

## Implementation note

The runtime runs `/\{\{\s*([a-zA-Z_][\w-]*)\s*\}\}/g` over the HTML. Whitespace inside the braces is allowed: `{{ author }}` works the same as `{{author}}`. Keys are case-sensitive.

No new dependencies, no template engine. The whole feature is ~10 lines of substitution code.
