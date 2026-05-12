# `verso new`

Generates slides and layouts. Two sub-commands.

## `verso new slide [id]`

Create a slide stub, import a single Verso slide JSON, or import many slides from a Markdown outline.

### Synopsis

```
verso new slide [id] [options]
```

### Options

| Flag | Description |
|------|-------------|
| `-d, --dir <path>` | Project directory. Default: current working directory. |
| `-l, --layout <name>` | Layout for the new slide. Default: `title-only` for stubs, preserved when importing. |
| `-p, --paths <ids>` | Comma-separated `path_include` list applied to every created slide. |
| `-f, --from <path-or-url>` | Import from a Verso slide JSON, or a Markdown outline (`.md` / `.markdown` / `.mdx`). |

### Stub mode (no `--from`)

```bash
verso new slide intro             # creates slides/intro.json with layout: title-only
verso new slide hero -l hero      # creates slides/hero.json with layout: hero
verso new slide pricing -p sales  # path_include: ["sales"]
```

The CLI appends the new id to `deck.json`'s `slide_order`.

### JSON import (`--from foo.json` or a URL)

```bash
verso new slide --from ../other-deck/slides/cover.json
verso new slide cover2 --from https://example.com/cover.json
```

`id` defaults to whatever was in the source's `id` field; pass an explicit id to override.

### Markdown outline import

Drop a Markdown file and Verso parses it into many slides. Each top-level `# heading` becomes a new slide.

```markdown
# Welcome

A short intro paragraph.

## What changed
- Faster builds
- New themes

# Roadmap

```js
console.log('demo code')
```
```

```bash
verso new slide --from outline.md
verso new slide intro --from outline.md         # prefix every generated id with "intro-"
verso new slide --from outline.md -l hero -p sales,internal
```

Rules:

- Each `#` becomes a new slide; the heading text becomes the slide's `title`.
- `##` and deeper become `heading` blocks inside the current slide.
- Bulleted lists become `bullets` blocks.
- Fenced code blocks (` ``` ... ``` `) become `code` blocks. The language tag is preserved.
- Plain paragraphs become `text` blocks.
- Inline Markdown (bold / italic / links) is kept verbatim in the resulting text; layouts may render it as plain text or markup depending on the block component.
- Slide ids are slugified from the heading. Collisions get a numeric suffix (`welcome`, `welcome-2`, ...).
- Content above the first `# heading` is ignored with a warning.

## `verso new layout <name>`

Scaffolds a custom layout TS file and registers it in `verso.config.ts`.

### Synopsis

```
verso new layout <name> [options]
```

### Options

| Flag | Description |
|------|-------------|
| `-d, --dir <path>` | Project directory. Default: current working directory. |

### Example

```bash
verso new layout split-thirds
```

Creates `layouts/split-thirds.ts` with a starter render function and adds it to `verso.config.ts`'s `layouts` array. After that, any slide can set `"layout": "split-thirds"`.

See [layouts.md](../layouts.md) for what a layout's `render(slide, ctx)` actually receives and returns.
