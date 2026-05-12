# Per-slide transitions

Each slide can declare a `transition` string. When that slide becomes active in present or speaker mode, the runtime stamps a CSS class onto the slide wrapper and a keyframe animation plays.

## Setting one

In a slide JSON:

```json
{ "id": "intro", "layout": "cover", "transition": "fade", "content": [...] }
```

Or in the editor's right pane, **Transitions** tab. Cards show a hover-animated swatch preview before you commit.

## Built-ins

16 transitions across 6 groups:

| Group | Names |
|-------|-------|
| Off | `none` (default; snap) |
| Move | `fade`, `slide-left`, `slide-right`, `slide-up`, `slide-down` |
| Scale | `zoom`, `zoom-out`, `pop` (spring overshoot) |
| 3D | `flip-x`, `flip-y`, `tilt` (perspective ease) |
| Reveal | `iris` (circular clip-path), `wipe-right`, `wipe-down` |
| FX | `blur` (heavy blur sharpening to 0) |

Timing: 260-440ms. Easings vary per feel (spring for `pop`, cubic-bezier for 3D, ease-out for the rest).

## Reduced motion

`@media (prefers-reduced-motion: reduce)` zeros out the animation. Users with the system setting on get instant slide changes regardless of what's declared.

## Where they don't apply

- PDF / HTML build: transitions are runtime-only. The exported HTML still includes the keyframes (so present mode in an exported HTML works), but PDF rasterization captures one static frame per slide.
- Edit mode: animations skipped to keep the preview responsive.

## Adding your own

The `transition` field is a free-form string. Drop new keyframes into your project's stylesheet:

```css
@keyframes my-glitch-in {
  0%   { transform: translate(-3px, 1px); opacity: 0; }
  50%  { transform: translate(3px, -1px); }
  100% { transform: translate(0, 0); opacity: 1; }
}
.verso-slide-wrapper.verso-transition-glitch {
  animation: my-glitch-in 320ms steps(8, end) both;
}
```

Set `"transition": "glitch"` on a slide and the renderer stamps `verso-transition-glitch` on the wrapper. The editor's Transitions tab still shows the 16 built-ins, but custom names persist correctly and the runtime honors them.
