# `verso dev`

Starts the dev viewer against the current project. Watches `deck.json`, `slides/*.json`, and `themes/*.json`; reloads the browser on every change.

## Synopsis

```
verso dev [options]
```

## Options

| Flag | Description |
|------|-------------|
| `-d, --dir <path>` | Project directory. Default: current working directory. |
| `-p, --port <port>` | Port to bind. Default: `5173`. |
| `-H, --host <host>` | Host to bind. Default: `localhost`. |
| `--open` | Open the default browser on start. |

## URL parameters

The viewer reads these query params:

| Param | Effect |
|-------|--------|
| `?path=<id>` | Render the named path. If omitted and the deck has more than one path, a path picker is shown. |
| `?slide=<id>` | Land on the given slide id (otherwise: the first slide). |
| `?mode=present` | Present mode (default). |
| `?mode=speaker` | Two-panel speaker view with notes, next-slide preview, and a stopwatch. |
| `?mode=debug` (or `?debug=1`) | Overlay showing slide id, layout, path filters, and notes. |

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `→` `Space` `PageDown` | Next slide |
| `←` `PageUp` | Previous slide |
| `Home` | First slide |
| `End` | Last slide |
| Click-and-drag (present / speaker) | Paint a red laser-pointer trail that fades over ~900ms |

## Examples

```bash
# Default port 5173, current directory
verso dev

# Run against a different folder, custom port, open browser
verso dev --dir ../decks/q4-readout -p 8080 --open
```
