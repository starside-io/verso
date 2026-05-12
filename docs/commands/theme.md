# `verso theme`

Manage themes for the current project. Two sub-commands.

## `verso theme add <target>`

Adds a theme by built-in name **or** by file path.

### Synopsis

```
verso theme add <target> [options]
```

### Options

| Flag | Description |
|------|-------------|
| `-d, --dir <path>` | Project directory. Default: current working directory. |

### Examples

```bash
# Switch the deck to a built-in theme
verso theme add verso-warm

# Add a custom theme by copying a JSON file into themes/
verso theme add ./brand.json
```

The first form just sets `manifest.theme` to the built-in name.

The second form copies the file into `<project>/themes/<theme-name>.json` (the filename is taken from the JSON's `name` field, sanitized) and sets `manifest.theme` to that name. Project-local themes win on name collision with built-ins.

## `verso theme list`

Lists every theme available to the current project.

### Synopsis

```
verso theme list [options]
```

### Output

Two columns:

```
Built-in:
  verso-slate    (default)
  verso-warm
  verso-mono
  verso-neon
  verso-mars
  verso-forest

Project:
  brand          (active)
  brand-dark
```

The `(active)` marker shows whichever theme is set in `deck.json`'s `theme` field.

## Theme file shape

```json
{
  "name": "brand",
  "colors": {
    "primary": "#1A3C6E",
    "secondary": "#4A90D9",
    "classic": "#F0EAD2",
    "accent": "#d1603d",
    "surface": "#E0DBC3",
    "muted": "#7CA982",
    "background": "#FFFFFF",
    "foreground": "#1C1C1C"
  }
}
```

`primary`, `secondary`, and `classic` are required. The rest are optional with sensible fallbacks:

- `accent` → `secondary`
- `surface` → mix of `primary` + neutral
- `muted` → mix of `secondary` + neutral
- `background` / `foreground` → undefined unless set explicitly (themes that want a dark mode set them)

See [themes.md](../themes.md) for the full cascade rules.
