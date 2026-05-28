---
"@starside-io/verso-layouts": patch
---

Wrap long lines in `.verso-code` so they don't push the slide past its bounds. A single long code line used to keep `<pre>`'s default `white-space: pre`, which pushed the parent card wider than the slide's 1920px and silently clipped the right side of every PDF / HTML export. Added `white-space: pre-wrap`, `overflow-wrap: anywhere`, and `min-width: 0`. `overflow-x: auto` stays as a fallback for unbreakable strings.
