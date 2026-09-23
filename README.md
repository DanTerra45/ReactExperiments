# React Formats

Small React demo for comparing image formats in the browser.

## What it does

- Loads a local image or fetches random remote photos for quick testing, including varied aspect ratios capped at 2048 px on the longest edge.
- Encodes the same pixels as AVIF or WebP with jSquash/WebAssembly, with JPEG, PNG, and GIF as comparison baselines.
- Shows original size, converted size, signed size change, dimensions, encode time, and block-based SSIM.
- Provides a draggable before/after split for visual inspection.
- Adds synchronized zoom and pan up to `8x` for inspecting compression artifacts closely.
- Optionally overlays a perceptual Pixelmatch difference mask with fine, balanced, or major sensitivity.
- Keeps user-selected files in the browser; there is no upload API or backend.

## Client presentation route

`/detail-preservation` is a simpler client-facing view focused on visual detail preservation. It includes a draggable original/optimized comparison, click-to-inspect synchronized `4x` detail crops, AVIF/WebP quality presets, a difference map, signed size change, and SSIM. Its random samples are curated around the catalog categories defined for the MVP (clothing, toys, kitchenware, home cleaning, home decor, beauty/personal care, jewelry, bags/accessories, and pets) instead of generic scenery. Its UI copy avoids implementation-specific language about how the difference visualization is produced.

## Run

```bash
pnpm install
pnpm dev
```

Production build:

```bash
pnpm build
pnpm preview
```

Deploy the built static assets to the Worker configured in `wrangler.jsonc`:

```bash
pnpm deploy
```

The deploy script builds first, then runs the pinned Wrangler CLI against `./dist`.

## Notes

The quality value is passed to AVIF, WebP, and JPEG encoders, but quality scales are codec-specific. A value of `75` should not be interpreted as perceptually identical across formats. PNG is lossless in this demo and therefore has no quality slider.

Difference mode uses Pixelmatch's perceptual YIQ color comparison and anti-alias filtering, then paints only detected changes in blue over the unmodified converted image. Fine sensitivity catches subtler changes while major sensitivity filters smaller differences. It remains a diagnostic map rather than a single perceptual quality score.

jSquash encodes the rendered pixel data but does not preserve EXIF metadata. For metadata-heavy originals, part of the measured size reduction can therefore come from metadata removal rather than codec efficiency alone.

Images are limited to 16 megapixels in this demo so AVIF encoding remains reasonable in a browser tab. The random-image button uses `picsum.photos`; uploading a local image does not require that service or a server.

The Vite dependency optimizer excludes the jSquash codecs because their WASM modules can have issues when pre-bundled.

## WhatsApp share experiment

The `/whatsapp-share` route keeps the client-facing demo intentionally small. **Generador** provides a compact WhatsApp-style text editor with formatting shortcuts, live preview, copy, and a real `wa.me` handoff. **Detalle** shows a product-detail card whose share button builds the message from the displayed data. The browser only prepares the text; WhatsApp still controls chat/group selection and sending.

## Video provider embed experiment

The `/video-embeds` route compares three approaches: the public social embed, an API/media route when the provider exposes one, and **Ours**, a clean first-party cover that does not load the social embed until the user presses Play. The experiment does not crop, cover, or inject CSS into cross-origin iframes.

Behavior re-checked on 2026-09-21:

- **YouTube iframe:** `controls=0` hides the player controls and `fs=0` hides the fullscreen button. The video title and channel/avatar cannot be disabled: `showinfo` was removed and `modestbranding` is deprecated/no-op. `rel=0` no longer removes related videos; it limits them to the same channel.
- **TikTok Player v1:** `controls`, `progress_bar`, `play_button`, `volume_control`, `fullscreen_button`, `timestamp`, `music_info`, `description`, and `closed_caption` are documented player parameters. There is no documented Player v1 switch for creator attribution.
- **TikTok Display API:** authenticated `video.list` / `video.query` responses include an `embed_link`; TikTok's examples contain `hide_author=1`. This is not documented as a general player option or as a guarantee that all creator identity disappears. The current renderer still shows creator identity in our test, so the demo does not count it as hideable.
- **Instagram public embed:** plain `/embed/` omits the post caption while `/embed/captioned/` adds it. Both retain Instagram account/profile chrome. The authenticated Instagram Media API exposes `media_url`, which can be played with a custom `<video>`, but Meta may omit `media_url` for video containing licensed/copyrighted audio and in some Reel download-restriction cases.
- **Facebook video plugin:** `show_text=false` removes the Facebook post text, not the video's internal title/page attribution. The Graph API Video object exposes `source` as a raw playable URL when the access token has permission to read the video, allowing a custom `<video>` instead of Facebook's embed.
- **X / Twitter:** the official embedded Post can include video. “Hide conversation” only hides the parent Post when embedding a reply; it does not hide the current Post's text, author, or X chrome. The X API can expand `attachments.media_keys` and request `media.fields=variants`; a returned MP4 variant can be tested with a custom `<video>`.
- **Ours:** available for every provider. Before interaction, only a first-party cover and Play button are rendered, so no social title/author/branding is visible and no social embed is loaded. It has two presentations: **Inline** replaces the cover with the provider embed after Play; **Modal** keeps the page cover untouched and opens the provider embed in a lightbox that is destroyed when closed. YouTube gets an automatic public thumbnail in the demo; the other providers accept an optional custom cover URL.

Useful references:

- YouTube player parameters: https://developers.google.com/youtube/player_parameters
- YouTube required player functionality: https://developers.google.com/youtube/terms/required-minimum-functionality
- TikTok Embed Player: https://developers.tiktok.com/doc/embed-player
- TikTok Display API: https://developers.tiktok.com/docs/en/display-api-get-started
- Instagram Media API object: https://developers.facebook.com/documentation/instagram-platform/reference/instagram-media
- Facebook Embedded Video Player: https://developers.facebook.com/docs/plugins/embedded-video-player/
- Facebook Graph API Video object: https://developers.facebook.com/docs/graph-api/reference/video/
- X embedded Posts: https://help.x.com/en/using-x/how-to-embed-a-post
- X API docs: https://docs.x.com/
