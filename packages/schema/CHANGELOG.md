# @starside-io/verso-schema

## 0.2.0

### Minor Changes

- [`aed9d10`](https://github.com/starside-io/verso/commit/aed9d10938670a5375aba78559b986e50a9ce0b2) Thanks [@crimson-med](https://github.com/crimson-med)! - Phosphor icons end-to-end. Adds two composable patterns: a first-class `IconBlock` that drops into any layout or container, and a `BulletItem` extension so each bullets item can carry a per-item leading icon (back compat: plain string items still work).

  - **Schema**: new `IconBlock` (`type: "icon"`, `name`, `weight?`, `size?`, `tone?`, `label?`) added to the `ContentBlock` union. `BulletItem` is now `string | { text, icon?, iconWeight?, iconTone? }`.
  - **Runtime**: lazy SVG resolver/loader registry pinned on `globalThis` (survives multi-chunk bundling). Sync renderer emits inline SVG when cached, else a sized placeholder + fires an async load. New event `verso:icon-loaded` lets hydrators swap placeholders.
  - **Viewer**: lazy loader backed by `import.meta.glob` of `@phosphor-icons/core/assets/**/*.svg` so each icon is its own chunk, downloaded on demand. Hydrator preserves extra classes (e.g. `verso-bullet-icon`) when swapping placeholders.
  - **Layouts CSS**: `.verso-icon` tone styling, `.verso-bullet-with-icon` layout for per-item bullet icons.
  - **Editor**: new "Icon" entry in the `+ Block` menu (Decoration category). The inspector form shows a preview tile + Browse button that opens a searchable icon picker (1,500+ icons, search by name + tag, weight selector, paginated grid).

  Bug fix included: the laser pointer no longer fires when the viewer is embedded in the editor iframe. Adds `MountOptions.disableLaser`; the viewer reads `?edit=1` and passes it.
