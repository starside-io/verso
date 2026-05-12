# @starside-io/verso-cli

[![Early Access](https://img.shields.io/badge/status-early%20access-orange)](https://github.com/starside-io/verso)
[![npm](https://img.shields.io/npm/v/@starside-io/verso-cli)](https://www.npmjs.com/package/@starside-io/verso-cli)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](../../LICENSE)

The Verso command-line tool. Scaffold decks, run the visual editor, and export to PDF, HTML, or PNG.

## Install

```
npm install -g @starside-io/verso-cli
```

## Quickstart

```bash
verso init my-deck --template minimal
cd my-deck
verso edit                        # visual editor + live preview
verso build --format pdf          # export to PDF
verso build --format html         # single self-contained HTML file
```

## Commands

| Command | Description |
|---|---|
| `verso init [name]` | Scaffold a new project. Templates: `minimal`, `branded`, `layouts-gallery`, `multi-path`, `extended`. |
| `verso dev` | Start the slide viewer with live JSON reload. |
| `verso edit` | Launch the full visual editor (viewer + editor UI + browser). |
| `verso new slide [id]` | Add a slide. Use `-f/--from outline.md` to import from a Markdown outline. |
| `verso new layout <name>` | Scaffold a custom layout and register it in `verso.config.ts`. |
| `verso theme add <name>` | Add a built-in or local theme. |
| `verso build` | Export paths as PDF or self-contained HTML. `-f pdf\|html`, `-p <pathId>`, `-s 16:9\|4:3\|letter\|a4`. |

## Docs

Full documentation: [github.com/starside-io/verso](https://github.com/starside-io/verso)

Part of the [Verso](https://github.com/starside-io/verso) monorepo. Apache 2.0.
