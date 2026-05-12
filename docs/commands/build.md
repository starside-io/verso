# `verso build`

Renders the deck to a shareable file. Two formats: **PDF** (default, print-ready) and **HTML** (single self-contained file). PNG export of one slide is available from the editor's Export menu.

## Synopsis

```
verso build [options]
```

## Options

| Flag | Description |
|------|-------------|
| `-d, --dir <path>` | Project directory. Default: current working directory. |
| `-f, --format <fmt>` | `pdf` or `html`. Default: `pdf`. |
| `-p, --path <id>` | Build only one path. Default: every path in the manifest. |
| `-o, --out <path>` | Output directory. Default: `<project>/dist/`. |
| `-s, --size <preset>` | Page size: `16:9` / `4:3` / `letter` / `a4`. Default: `16:9` (1920×1080). |
| `--no-inline-images` | HTML only. Keep image `src` URLs as-is instead of inlining as base64. |

## PDF

Uses bundled headless Chromium (puppeteer). One file per path. Page size matches the `--size` preset at 96 DPI (so `16:9` becomes 1920×1080 px). Print CSS forces one slide per page, no page breaks within a slide.

```bash
verso build                         # every path, 16:9 PDF, dist/<path>.pdf
verso build -p sales                # only the "sales" path
verso build --size a4 -o /tmp/out   # A4 portrait, custom out dir
```

### What gets stripped in PDF

- `@media print` rules in CSS apply. Most layouts have no print-specific rules, so the output matches what you see in present mode.
- `<iframe>` from `embed` blocks is hidden. The block's `fallback_src` (image) or `fallback_text` (block of plain text) is shown instead. See [embed.md](../features/embed.md).
- Per-slide transitions don't apply (transitions are runtime-only).

## HTML

Emits a single `.html` file per path with the layout CSS, every slide's HTML, a small navigation script, and (by default) every image inlined as a base64 data URL.

```bash
verso build --format html
verso build -f html --no-inline-images   # smaller file, but images need internet to load
```

### What you get in each HTML file

- Scale-to-fit stage: the deck renders at native (e.g. 1920×1080) and is scaled to fit the viewport.
- Letterbox background uses the resolved deck colors so an aspect mismatch shows the slide's own color, not a black bar.
- Keyboard nav (arrows, space, Home, End) and hash routing (`#1`, `#2`, ...).
- All images base64-encoded into the file unless `--no-inline-images` is set. Remote URLs are fetched at build time and inlined too.

### Use cases

- Drop a `.html` file in Slack, email, or a public S3 bucket. Recipients double-click; no Verso install needed.
- Bundle a deck inside an Electron / Tauri app for offline kiosks.

## PNG (editor only)

The CLI doesn't export PNGs directly. From `verso edit`:

1. Select the slide you want.
2. Click **⤓ Export ▾** in the toolbar.
3. Pick **PNG**.

Output: `<project>/dist/<pathId>-<slideId>.png` at the path's native size.

## Tips

- The puppeteer download (~170 MB) happens once on first `pnpm install`. Cache it in CI by caching `~/.cache/puppeteer`.
- On low-memory CI runners, `headless: true` + a single-process Chromium can OOM. The build pipeline already uses `--no-sandbox` and waits for `networkidle0`; if you hit OOM, bump runner memory.
- For HTML export with many large images, file sizes grow fast. The default trades file size for portability; flip `--no-inline-images` if you'll always have network.
