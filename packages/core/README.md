# @starside-io/verso-core

[![Early Access](https://img.shields.io/badge/status-early%20access-orange)](https://github.com/starside-io/verso)
[![npm](https://img.shields.io/npm/v/@starside-io/verso-core)](https://www.npmjs.com/package/@starside-io/verso-core)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](../../LICENSE)

Pure, side-effect-free helpers for Verso: path branching, color cascade, and content flattening.

## What's in here

- `resolvePath(slides, pathId)` — filters a slide list to a single audience path
- `flattenContent(blocks, pathId)` — recursively filters nested blocks by `path_include`/`path_exclude`
- `resolveThemeRef / resolveDeckColors / resolveSlideColors / resolveBlockColors` — color cascade from theme → deck → slide → block
- `colorsToCssVars(colors)` — turns a resolved color set into a CSS custom-property map
- `resolvePath` — safe file-path resolution inside a project root

## Install

```
npm install @starside-io/verso-core
```

## Usage

```ts
import { flattenContent, resolveDeckColors } from '@starside-io/verso-core'

const visibleBlocks = flattenContent(slide.content, 'sales')
const colors = resolveDeckColors(theme, manifest.style_overrides)
```

## Docs

[github.com/starside-io/verso](https://github.com/starside-io/verso)

Part of the [Verso](https://github.com/starside-io/verso) monorepo. Apache 2.0.
