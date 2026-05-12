# Embed block

The `embed` block renders an `<iframe>` (YouTube, CodeSandbox, Figma, etc) with a static fallback for PDF export.

## Minimum usage

```json
{
  "type": "embed",
  "src": "https://www.youtube.com/embed/dQw4w9WgXcQ"
}
```

Renders as a 16:9 iframe with the YouTube embed.

## All props

| Prop | Default | Notes |
|------|---------|-------|
| `src` | required | The iframe URL. Use the provider's embed URL (e.g. `youtube.com/embed/...` not `youtube.com/watch?v=...`). |
| `title` | `"Embedded content"` | Accessibility label and PDF fallback heading. |
| `aspect` | `"16:9"` | One of `16:9` / `4:3` / `1:1` / `21:9` / `auto`. `auto` lets the iframe set its own height (rarely what you want). |
| `allow` | conservative defaults | Iframe `allow` attribute. Defaults cover fullscreen + autoplay + clipboard. |
| `fallback_src` | undefined | Image URL shown in PDF. |
| `fallback_text` | undefined | Plain-text card shown in PDF when no `fallback_src`. |

## PDF export fallback

Headless Chromium doesn't reliably rasterize cross-origin iframes when generating a PDF. The export pipeline uses `@media print` to:

1. Hide the `<iframe>`.
2. Show `fallback_src` as an `<img>` if set.
3. Otherwise show a card with the title + URL.

To get a usable PDF representation of a video, set `fallback_src` to a thumbnail. For YouTube this is `https://img.youtube.com/vi/<videoId>/maxresdefault.jpg`.

```json
{
  "type": "embed",
  "src": "https://www.youtube.com/embed/dQw4w9WgXcQ",
  "title": "Demo: live editing",
  "aspect": "16:9",
  "fallback_src": "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  "fallback_text": "Watch the demo at https://example.com/demo"
}
```

## Security

The iframe has `referrerpolicy="strict-origin-when-cross-origin"` and a curated `allow` list. If you embed something that needs additional permissions (microphone, camera), set `allow` explicitly:

```json
{
  "type": "embed",
  "src": "https://demo.example.com/audio-tool",
  "allow": "microphone; autoplay"
}
```

## Common embed URLs

| Service | Embed URL pattern |
|---------|-------------------|
| YouTube | `https://www.youtube.com/embed/<videoId>` |
| Vimeo | `https://player.vimeo.com/video/<videoId>` |
| CodeSandbox | `https://codesandbox.io/embed/<sandboxId>` |
| StackBlitz | `https://stackblitz.com/edit/<projectId>?embed=1` |
| Figma | `https://www.figma.com/embed?embed_host=share&url=<encoded-file-url>` |
| Loom | `https://www.loom.com/embed/<videoId>` |

## Editor

The **+ Block** dropdown has an **Embed** entry under **Media**. The Inspector form gives you URL, Title, Aspect, Fallback image, Fallback text inputs.
