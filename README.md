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

`/detail-preservation` is a simpler client-facing view focused on visual detail preservation. It includes a draggable original/optimized comparison, click-to-inspect synchronized `4x` detail crops, AVIF/WebP quality presets, a difference map, signed size change, and SSIM. Its UI copy avoids implementation-specific language about how the difference visualization is produced.

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
