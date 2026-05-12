# `verso init`

Scaffolds a new Verso project in a fresh directory.

## Synopsis

```
verso init [name] [options]
```

## Options

| Flag | Description |
|------|-------------|
| `-t, --template <name>` | Template to scaffold. Default: `minimal`. |
| `--with-config` | Include a starter `verso.config.ts` for registering custom layouts / components / themes. |

## Templates

| Name | What you get |
|------|--------------|
| `minimal` | Two slides, default theme, no custom paths. Smallest possible starting point. |
| `branded` | A deck themed with a custom brand color palette, cover + closing slides. |
| `inline-theme` | Theme defined inline in `deck.json` rather than in `themes/`. |
| `multi-path` | Two `paths` defined (`sales`, `engineering`) with branched content. |
| `layouts-gallery` | One slide per built-in layout, a tour of what's possible. |
| `extended` | Everything: paths, themes, custom layout in `verso.config.ts`, every block type. |

## Examples

```bash
# Smallest deck
verso init my-deck

# Branded template with a config file
verso init q4-readout -t branded --with-config

# Multi-audience pitch
verso init sales-pitch -t multi-path
```

## Output

Creates the directory `<name>/` (defaults to `verso-deck`) with the chosen template's files and prints next-step instructions.
