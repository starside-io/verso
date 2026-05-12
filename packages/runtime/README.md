# @starside-io/verso-runtime

[![Early Access](https://img.shields.io/badge/status-early%20access-orange)](https://github.com/starside-io/verso)
[![npm](https://img.shields.io/npm/v/@starside-io/verso-runtime)](https://www.npmjs.com/package/@starside-io/verso-runtime)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](../../LICENSE)

Verso rendering engine and public extension API. Use this package to register custom layouts and components.

## What's in here

- `renderDeck(manifest, slides, registry, pathId)` — SSR-able HTML string for a full deck
- `mount(target, options)` — browser-side mount with keyboard nav, speaker mode, and transitions
- `LayoutRegistry / ComponentRegistry / ThemeRegistry` — registries for custom extensions
- Types: `LayoutContext`, `RenderContext`, `LayoutDef`, `ComponentDef`

## Install

```
npm install @starside-io/verso-runtime
```

## Custom layout example

```ts
import { LayoutRegistry } from '@starside-io/verso-runtime'
import { html } from '@starside-io/verso-runtime'

LayoutRegistry.register({
  name: 'my-layout',
  render(ctx) {
    return html`<div class="my-layout">${ctx.renderBlocks(ctx.content)}</div>`
  },
})
```

Register custom layouts in `verso.config.ts` at the project root and scaffold one with `verso new layout <name>`.

## Docs

[github.com/starside-io/verso/blob/main/docs/custom-layouts.md](https://github.com/starside-io/verso/blob/main/docs/custom-layouts.md)

Part of the [Verso](https://github.com/starside-io/verso) monorepo. Apache 2.0.
