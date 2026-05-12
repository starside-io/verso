# Watermark

A small, semi-transparent label stamped on every slide. Lives at the deck level, applies everywhere (PDF, HTML, present, speaker).

## Setting one

Via the editor's **Watermark** toolbar button. Three fields:

- **Text**: any string. Common choices: `DRAFT`, `CONFIDENTIAL`, `© Acme 2026`, `BURN AFTER READING`.
- **Position**: bottom-left / bottom-center / bottom-right.
- **Opacity**: slider from 5% to 80%. Default: 18%.

Leave the text blank (or hit **Remove**) to clear.

## In `deck.json`

```json
{
  "title": "Q4 readout",
  "watermark": {
    "text": "DRAFT",
    "position": "bottom-center",
    "opacity": 0.18
  },
  "slide_order": [...]
}
```

All three fields are required when `watermark` is set. Omit the field entirely to clear.

## Rendering

The renderer injects:

```html
<div class="verso-watermark" data-position="bottom-center" style="--wm-opacity:0.18">DRAFT</div>
```

inside every `<section class="verso-slide">`. CSS positions it absolutely. The opacity is overridable via the `--wm-opacity` custom property so projects can tweak it without forking the runtime.

## Color

The watermark uses `var(--color-foreground)`, so it stays readable across themes (dark text on light themes, light text on dark themes) without configuration.

## What it doesn't do

- No per-slide override. The watermark is deck-wide by design; if you need per-slide labels, use a regular text block or a badge.
- No image watermarks. Text only. If you need a logo watermark, register a custom component and add it to a layout.
- No "show only in some paths". The watermark renders on every slide regardless of the active path. Path filtering at this level would add complexity for a marginal use case.
