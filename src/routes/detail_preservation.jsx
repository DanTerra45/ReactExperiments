import { Crosshair, ImagePlus, MoveHorizontal, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  calculate_ssim,
  convert_image,
  create_difference_overlay,
  format_bytes,
  load_image_data,
} from '../lib/image_processing.js';
import { cn } from '../lib/cn.js';

const SAMPLE_WIDTH = 2048;
const SAMPLE_HEIGHT = 1536;
const DETAIL_ZOOM = 4;
const PRESETS = [
  { value: 'high', label: 'High quality', quality: 90 },
  { value: 'recommended', label: 'Recommended', quality: 75 },
  { value: 'smaller', label: 'Smaller file', quality: 45 },
];
const FORMATS = ['avif', 'webp'];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function create_object_url(blob, object_urls) {
  const url = URL.createObjectURL(blob);
  object_urls.current.add(url);
  return url;
}

function revoke_object_url(url, object_urls) {
  if (!url || !object_urls.current.has(url)) {
    return;
  }

  URL.revokeObjectURL(url);
  object_urls.current.delete(url);
}

function DetailCrop({ label, image_url, focus_point, width, height }) {
  const left = 50 - focus_point.x * DETAIL_ZOOM * 100;
  const top = 50 - focus_point.y * DETAIL_ZOOM * 100;

  return (
    <figure>
      <div
        className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        <img
          src={image_url}
          alt={`${label} detail crop`}
          className="pointer-events-none absolute max-w-none select-none"
          style={{
            width: `${DETAIL_ZOOM * 100}%`,
            height: `${DETAIL_ZOOM * 100}%`,
            left: `${left}%`,
            top: `${top}%`,
          }}
        />
      </div>
      <figcaption className="mt-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">{label}</span>
        <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">4× detail</span>
      </figcaption>
    </figure>
  );
}

export default function DetailPreservation() {
  const [source, set_source] = useState(null);
  const [converted, set_converted] = useState(null);
  const [difference, set_difference] = useState(null);
  const [format, set_format] = useState('avif');
  const [preset, set_preset] = useState('recommended');
  const [split_position, set_split_position] = useState(50);
  const [focus_point, set_focus_point] = useState({ x: 0.5, y: 0.5 });
  const [view_mode, set_view_mode] = useState('normal');
  const [is_loading_source, set_is_loading_source] = useState(true);
  const [is_converting, set_is_converting] = useState(false);
  const [error, set_error] = useState('');
  const comparison_ref = useRef(null);
  const object_urls = useRef(new Set());
  const active_preset = PRESETS.find((item) => item.value === preset) ?? PRESETS[1];
  const supports_webassembly = typeof WebAssembly === 'object';
  const active_format = supports_webassembly ? format : 'jpeg';

  useEffect(() => {
    return () => {
      object_urls.current.forEach((url) => URL.revokeObjectURL(url));
      object_urls.current.clear();
    };
  }, []);

  async function set_source_from_blob(blob, name) {
    const decoded = await load_image_data(blob);
    const file = new File([blob], name, { type: blob.type || 'image/jpeg' });
    const url = create_object_url(file, object_urls);

    set_source((previous_source) => {
      if (previous_source?.url) {
        revoke_object_url(previous_source.url, object_urls);
      }

      return {
        file,
        url,
        image_data: decoded.image_data,
        width: decoded.width,
        height: decoded.height,
      };
    });
    set_focus_point({ x: 0.5, y: 0.5 });
    set_split_position(50);
  }

  async function load_sample() {
    set_error('');
    set_is_loading_source(true);
    const seed = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);

    try {
      const response = await fetch(
        `https://picsum.photos/seed/detail-${seed}/${SAMPLE_WIDTH}/${SAMPLE_HEIGHT}.jpg`,
      );
      if (!response.ok) {
        throw new Error('The sample image could not be loaded.');
      }

      await set_source_from_blob(await response.blob(), `detail-sample-${seed}.jpg`);
    } catch (sample_error) {
      set_error(sample_error instanceof Error ? sample_error.message : 'The sample image could not be loaded.');
    } finally {
      set_is_loading_source(false);
    }
  }

  useEffect(() => {
    load_sample();
  }, []);

  useEffect(() => {
    let is_cancelled = false;
    let generated_url = '';

    if (!source) {
      return undefined;
    }

    set_is_converting(true);
    set_error('');

    async function build_converted_image() {
      try {
        const blob = await convert_image(source.image_data, active_format, active_preset.quality);
        const [ssim_score] = await Promise.all([
          calculate_ssim(source.image_data, blob),
        ]);

        if (is_cancelled) {
          return;
        }

        generated_url = create_object_url(blob, object_urls);
        set_converted((previous_converted) => {
          if (previous_converted?.url) {
            revoke_object_url(previous_converted.url, object_urls);
          }

          return {
            blob,
            url: generated_url,
            format: active_format,
            quality: active_preset.quality,
            ssim_score,
          };
        });
      } catch (conversion_error) {
        if (!is_cancelled) {
          set_error(
            conversion_error instanceof Error
              ? conversion_error.message
              : 'The optimized image could not be created.',
          );
        }
      } finally {
        if (!is_cancelled) {
          set_is_converting(false);
        }
      }
    }

    build_converted_image();

    return () => {
      is_cancelled = true;
    };
  }, [source, active_format, active_preset.quality]);

  useEffect(() => {
    let is_cancelled = false;
    let generated_url = '';

    if (view_mode !== 'difference' || !source || !converted) {
      set_difference(null);
      return undefined;
    }

    async function build_difference_map() {
      try {
        const result = await create_difference_overlay(
          source.image_data,
          converted.blob,
          'fine',
        );

        if (is_cancelled) {
          return;
        }

        generated_url = create_object_url(result.blob, object_urls);
        set_difference((previous_difference) => {
          if (previous_difference?.url) {
            revoke_object_url(previous_difference.url, object_urls);
          }

          return {
            ...result,
            url: generated_url,
          };
        });
      } catch {
        if (!is_cancelled) {
          set_difference(null);
        }
      }
    }

    build_difference_map();

    return () => {
      is_cancelled = true;
    };
  }, [view_mode, source, converted]);

  function update_split_from_pointer(event) {
    const bounds = comparison_ref.current?.getBoundingClientRect();
    if (!bounds?.width) {
      return;
    }

    const position = ((event.clientX - bounds.left) / bounds.width) * 100;
    set_split_position(clamp(position, 0, 100));
  }

  function handle_split_pointer_down(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    update_split_from_pointer(event);
  }

  function handle_split_pointer_move(event) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    update_split_from_pointer(event);
  }

  function handle_focus_click(event) {
    const bounds = comparison_ref.current?.getBoundingClientRect();
    if (!bounds?.width || !bounds.height) {
      return;
    }

    const edge_limit = 0.5 / DETAIL_ZOOM;
    set_focus_point({
      x: clamp((event.clientX - bounds.left) / bounds.width, edge_limit, 1 - edge_limit),
      y: clamp((event.clientY - bounds.top) / bounds.height, edge_limit, 1 - edge_limit),
    });
  }

  async function handle_file(file) {
    if (!file) {
      return;
    }

    set_error('');
    set_is_loading_source(true);

    try {
      await set_source_from_blob(file, file.name);
    } catch (file_error) {
      set_error(file_error instanceof Error ? file_error.message : 'This image could not be loaded.');
    } finally {
      set_is_loading_source(false);
    }
  }

  const size_change = source && converted
    ? ((converted.blob.size - source.file.size) / source.file.size) * 100
    : null;
  const changed_percentage = difference?.total_pixels
    ? (difference.changed_pixels / difference.total_pixels) * 100
    : null;

  return (
    <main className="min-h-dvh bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
          <a
            href="/"
            className="text-sm font-medium text-zinc-600 outline-none hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:text-zinc-400 dark:hover:text-white dark:focus-visible:ring-offset-zinc-950"
          >
            Image format lab
          </a>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={is_loading_source}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 outline-none hover:border-zinc-300 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-white dark:focus-visible:ring-offset-zinc-950"
              onClick={load_sample}
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              Another sample
            </button>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 outline-none hover:border-zinc-300 hover:text-zinc-950 focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-white dark:focus-within:ring-offset-zinc-950">
              <ImagePlus aria-hidden="true" className="size-4" />
              Use your image
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="sr-only"
                onChange={(event) => {
                  const [file] = event.target.files;
                  handle_file(file);
                  event.target.value = '';
                }}
              />
            </label>
          </div>
        </div>

        <header className="max-w-3xl py-10 sm:py-14">
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl dark:text-white">
            Smaller files, with the product detail still visible.
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-zinc-600 sm:text-lg dark:text-zinc-400">
            Compare the original and optimized image, inspect any area up close, and see the trade-off between transfer size and structural similarity.
          </p>
        </header>

        <section aria-labelledby="comparison-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="comparison-heading" className="text-xl font-semibold text-zinc-950 dark:text-zinc-100">
                See the difference
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Drag the divider. Click anywhere in the image to inspect that detail below.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {['normal', 'difference'].map((view) => (
                <button
                  key={view}
                  type="button"
                  aria-pressed={view_mode === view}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950',
                    view_mode === view
                      ? 'border-blue-600 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-white',
                  )}
                  onClick={() => set_view_mode(view)}
                >
                  {view === 'normal' ? 'Normal view' : 'Difference map'}
                </button>
              ))}
            </div>
          </div>

          <div
            ref={comparison_ref}
            className="relative min-h-80 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            style={{ aspectRatio: source ? `${source.width} / ${source.height}` : '4 / 3' }}
            onClick={handle_focus_click}
          >
            {source ? (
              <>
                <img
                  src={converted?.url || source.url}
                  alt="Optimized preview"
                  className="absolute inset-0 size-full object-cover"
                />

                {view_mode === 'difference' && difference?.url ? (
                  <div
                    className="pointer-events-none absolute inset-0 bg-zinc-950"
                    style={{ clipPath: `inset(0 0 0 ${split_position}%)` }}
                  >
                    <img src={difference.url} alt="" className="absolute inset-0 size-full object-cover" />
                  </div>
                ) : null}

                <div
                  className="pointer-events-none absolute inset-0 overflow-hidden"
                  style={{ clipPath: `inset(0 ${100 - split_position}% 0 0)` }}
                >
                  <img src={source.url} alt="Original preview" className="absolute inset-0 size-full object-cover" />
                </div>

                <span className="pointer-events-none absolute left-4 top-4 rounded-md bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-zinc-900 shadow-sm dark:bg-zinc-900/90 dark:text-zinc-100">
                  Original
                </span>
                <span className="pointer-events-none absolute right-4 top-4 rounded-md bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-zinc-900 shadow-sm dark:bg-zinc-900/90 dark:text-zinc-100">
                  {view_mode === 'difference' ? 'Difference map' : active_format.toUpperCase()}
                </span>

                <div
                  className="pointer-events-none absolute z-30 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/90 bg-black/20 shadow"
                  style={{ left: `${focus_point.x * 100}%`, top: `${focus_point.y * 100}%` }}
                  aria-hidden="true"
                >
                  <Crosshair className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 text-white" />
                </div>

                <div
                  className="pointer-events-none absolute inset-y-0 z-30 w-0.5 bg-white shadow"
                  style={{ left: `${split_position}%`, transform: 'translateX(-50%)' }}
                />
                <div
                  className="absolute inset-y-0 z-40 w-11 -translate-x-1/2 cursor-col-resize touch-none"
                  style={{ left: `${split_position}%` }}
                  onPointerDown={handle_split_pointer_down}
                  onPointerMove={handle_split_pointer_move}
                />
                <span
                  className="pointer-events-none absolute top-1/2 z-40 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                  style={{ left: `${split_position}%` }}
                >
                  <MoveHorizontal aria-hidden="true" className="size-4" strokeWidth={1.8} />
                </span>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500">
                {is_loading_source ? 'Loading sample…' : 'Choose an image to begin.'}
              </div>
            )}
          </div>

          {view_mode === 'difference' && difference ? (
            <p className="text-right text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
              {changed_percentage === null
                ? 'Preparing difference map…'
                : `${changed_percentage < 0.01 && changed_percentage > 0 ? '<0.01' : changed_percentage.toFixed(changed_percentage < 1 ? 2 : 1)}% of pixels flagged`}
            </p>
          ) : null}
        </section>

        <section aria-labelledby="detail-heading" className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-800">
          <div className="mb-5">
            <h2 id="detail-heading" className="text-xl font-semibold text-zinc-950 dark:text-zinc-100">
              Inspect detail
            </h2>
            <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Both crops show exactly the same point at the same magnification.
            </p>
          </div>

          {source && converted ? (
            <div className="grid gap-5 md:grid-cols-2">
              <DetailCrop
                label="Original"
                image_url={source.url}
                focus_point={focus_point}
                width={source.width}
                height={source.height}
              />
              <DetailCrop
                label={converted.format.toUpperCase()}
                image_url={converted.url}
                focus_point={focus_point}
                width={source.width}
                height={source.height}
              />
            </div>
          ) : (
            <div className="flex h-56 items-center justify-center rounded-xl bg-zinc-200 text-sm text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              Preparing detail view…
            </div>
          )}
        </section>

        <section aria-labelledby="balance-heading" className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-800">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <h2 id="balance-heading" className="text-xl font-semibold text-zinc-950 dark:text-zinc-100">
                Choose the balance
              </h2>
              <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                The recommended preset aims to keep fine detail while reducing transfer size.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {FORMATS.map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={!supports_webassembly}
                  aria-pressed={format === option}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 dark:focus-visible:ring-offset-zinc-950',
                    format === option
                      ? 'border-blue-600 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-white',
                  )}
                  onClick={() => set_format(option)}
                >
                  {option.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {PRESETS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={preset === option.value}
                className={cn(
                  'rounded-xl border px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950',
                  preset === option.value
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700',
                )}
                onClick={() => set_preset(option.value)}
              >
                <span className="block text-sm font-semibold text-zinc-950 dark:text-zinc-100">{option.label}</span>
                <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                  {option.value === 'high'
                    ? 'Prioritizes image fidelity.'
                    : option.value === 'recommended'
                      ? 'Balanced for product delivery.'
                      : 'Prioritizes a smaller transfer.'}
                </span>
              </button>
            ))}
          </div>

          <dl className="mt-5 grid grid-cols-2 overflow-hidden rounded-xl border border-zinc-200 bg-white sm:grid-cols-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-r border-zinc-200 p-4 sm:border-b-0 dark:border-zinc-800">
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">Original</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-zinc-950 dark:text-zinc-100">
                {source ? format_bytes(source.file.size) : '—'}
              </dd>
            </div>
            <div className="border-b border-zinc-200 p-4 sm:border-b-0 sm:border-r dark:border-zinc-800">
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">Optimized</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-zinc-950 dark:text-zinc-100">
                {converted ? format_bytes(converted.blob.size) : '—'}
              </dd>
            </div>
            <div className="border-r border-zinc-200 p-4 dark:border-zinc-800">
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">Size change</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-zinc-950 dark:text-zinc-100">
                {size_change === null ? '—' : `${size_change > 0 ? '+' : '−'}${Math.abs(size_change).toFixed(1)}%`}
              </dd>
            </div>
            <div className="p-4">
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">SSIM</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-zinc-950 dark:text-zinc-100">
                {converted?.ssim_score === null || converted?.ssim_score === undefined
                  ? '—'
                  : converted.ssim_score.toFixed(4)}
              </dd>
            </div>
          </dl>

          <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            SSIM approaches 1.0000 as structural similarity increases. It complements visual inspection rather than replacing it.
          </p>
        </section>

        <section className="mt-10 grid gap-8 border-t border-zinc-200 py-8 sm:grid-cols-2 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">What we inspect</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Fine texture, edge clarity, small visual features, and smooth tonal transitions remain visible during the comparison.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">Delivery fallback</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Serve AVIF first, WebP next, and JPEG as the broad fallback. The browser chooses the first format it can display.
            </p>
          </div>
        </section>

        {is_converting ? (
          <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
            Preparing comparison…
          </div>
        ) : null}

        {error ? (
          <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </main>
  );
}
