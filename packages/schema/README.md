# @starside-io/verso-schema

[![Early Access](https://img.shields.io/badge/status-early%20access-orange)](https://github.com/starside-io/verso)
[![npm](https://img.shields.io/npm/v/@starside-io/verso-schema)](https://www.npmjs.com/package/@starside-io/verso-schema)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](../../LICENSE)

Zod schemas and TypeScript types for Verso decks, slides, and content blocks.

## What's in here

- `Manifest` — deck-level schema (`deck.json`)
- `Slide` — per-slide schema with `layout`, `content`, `path_include/exclude`, `transition`, `style_overrides`
- `ContentBlock` — recursive union of all block types (`heading`, `text`, `bullets`, `image`, `quote`, `code`, `callout`, `card`, `panel`, `embed`, and more)
- `Theme`, `StyleOverrides`, `Align` — supporting types
- `/json-schema` export — machine-readable JSON Schema for editor integrations

## Install

```
npm install @starside-io/verso-schema
```

## Usage

```ts
import { Slide, Manifest } from '@starside-io/verso-schema'

const result = Slide.safeParse(rawJson)
```

## Docs

Full schema reference: [github.com/starside-io/verso/blob/main/docs/schema.md](https://github.com/starside-io/verso/blob/main/docs/schema.md)

Part of the [Verso](https://github.com/starside-io/verso) monorepo. Apache 2.0.
