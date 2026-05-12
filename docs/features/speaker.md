# Speaker mode and laser pointer

`?mode=speaker` opens a two-panel speaker view. `?mode=present` is the audience-facing single-slide view. Both share the laser-pointer overlay.

## Speaker view

Append `?mode=speaker` to the viewer URL, or pick **Speaker view** from the editor's **Present ▾** dropdown.

Layout:

- **Main panel**: the current slide, full-size.
- **Side panel** (top-right): two sections.
  - **Notes**: `slide.notes`. Edit them in the Inspector's Speaker notes field.
  - **Next**: title of the next slide in the active path.
- **Stopwatch** (bottom-left): starts when speaker view first mounts. Click to reset. Format: `MM:SS` (or `H:MM:SS` past an hour).

Keyboard nav matches present mode (arrows, space, Home, End).

## Laser pointer overlay

Active in both present and speaker modes. Click-and-drag anywhere on the slide; a red trail follows the cursor and fades over ~900ms.

No toggle:

- Mouse down + drag = draw.
- Mouse up = stop drawing. Existing trail finishes fading.

The overlay is a full-viewport `<canvas>` mounted on `document.body`, so it survives slide navigation without re-allocation. Performance is bounded by an animation loop that self-terminates when no trail points remain.

Disabled in edit mode (would interfere with click-to-select).

## Why this works for screen sharing

Speakers presenting over Zoom / Meet / Slack huddles typically miss two affordances from in-person presentations:

1. **Pointing at things**. Hard to do verbally. Solved by the laser trail.
2. **Notes the audience can't see**. Solved by speaker mode running on a different monitor (or tab) while the audience sees plain present mode on the shared one.

For a single-monitor setup: use `?mode=present` on the shared screen, `?mode=speaker` on your phone via the local network.

## Tips

- The stopwatch persists across slide navigation but resets if you reload the page. Don't reload mid-talk.
- Notes can use Markdown-ish syntax but are rendered as plain text in the side panel for predictability. If you want rich formatting in notes, render a custom component.
- The laser trail is red (`rgba(239, 68, 68, alpha)`) and not currently themeable; if your audience needs a different color, fork `mount()` in `@starside-io/verso-runtime`.
