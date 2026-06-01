---
"@starside-io/verso-layouts": minor
"@starside-io/verso-schema": minor
"@starside-io/verso-editor": minor
---

19 new PowerPoint-style layouts to break the every-slide-looks-the-same trap.

**Asymmetric splits (4)**: `one-third-left`, `one-third-right`, `two-thirds-left`, `two-thirds-right`. PowerPoint's most common asymmetric pattern.

**Grids (4)**: `quad` (2x2), `swot` (labeled 2x2), `icon-grid` (auto-flowing), `kpi-band` (KPI row + supporting body).

**Image-driven (3)**: `picture-fill` (image as background with title overlay), `picture-with-caption` (image + large caption side by side), `bento` (magazine-style hero cell + smaller cells).

**Title + special (5)**: `title-band`, `title-only`, `callout-banner`, `chapter`, `q-and-a`.

**Flow + structured (3)**: `process` (horizontal chevrons), `split-vertical` (top + bottom halves), `roadmap` (quarterly columns).

Schema validation added for each (`quad` requires exactly 4 blocks, `swot` exactly 4, `picture-fill` an image, `q-and-a` at least 2, etc.) so empty cells and missing required blocks get rejected at parse time. Editor Layout dropdown reorganized into 5 new categories: Asymmetric splits, Grids, Image-driven, Flow, Special.
