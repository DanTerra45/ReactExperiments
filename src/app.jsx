import { Moon, Sun } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ConversionControls from './components/conversion_controls.jsx';
import FormatReference from './components/format_reference.jsx';
import FormatStats from './components/format_stats.jsx';
import ImageComparison from './components/image_comparison.jsx';
import ImageSourcePicker from './components/image_source_picker.jsx';
import {
  convert_image,
  create_difference_overlay,
  format_output_filename,
  load_image_data,
} from './lib/image_processing.js';

const SETTINGS_KEY = 'react_formats_settings';
const DEFAULT_SETTINGS = {
  format: 'avif',
  quality: 75,
  show_difference: false,
  difference_sensitivity: 'balanced',
  difference_view: 'mask',
  comparison_position: 50,
  theme: 'light',
};
const HAS_WEBASSEMBLY_API = typeof WebAssembly === 'object';
const OUTPUT_FORMATS = new Set(['avif', 'webp', 'jpeg', 'png', 'gif']);
const DIFFERENCE_SENSITIVITIES = new Set(['fine', 'balanced', 'major']);
const THEMES = new Set(['light', 'dark']);
const DIFFERENCE_VIEWS = new Set(['overlay', 'mask']);
const RANDOM_ASPECTS = [
  { label: '1x1', width: 2048, height: 2048 },
  { label: '4x5', width: 1638, height: 2048 },
  { label: '3x2', width: 2048, height: 1365 },
  { label: '4x3', width: 2048, height: 1536 },
  { label: '16x9', width: 2048, height: 1152 },
  { label: '9x16', width: 1152, height: 2048 },
];

function load_settings() {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY));

    const stored_format = OUTPUT_FORMATS.has(stored?.format)
      ? stored.format
      : DEFAULT_SETTINGS.format;
    const safe_format =
      !HAS_WEBASSEMBLY_API && (stored_format === 'avif' || stored_format === 'webp')
        ? 'jpeg'
        : stored_format;

    return {
      format: safe_format,
      quality:
        Number.isFinite(stored?.quality) && stored.quality >= 0 && stored.quality <= 100
          ? stored.quality
          : DEFAULT_SETTINGS.quality,
      show_difference:
        typeof stored?.show_difference === 'boolean'
          ? stored.show_difference
          : DEFAULT_SETTINGS.show_difference,
      difference_sensitivity: DIFFERENCE_SENSITIVITIES.has(stored?.difference_sensitivity)
        ? stored.difference_sensitivity
        : stored?.difference_strength === 32
          ? 'fine'
          : stored?.difference_strength === 8
            ? 'major'
            : DEFAULT_SETTINGS.difference_sensitivity,
      difference_view: DIFFERENCE_VIEWS.has(stored?.difference_view)
        ? stored.difference_view
        : DEFAULT_SETTINGS.difference_view,
      comparison_position:
        Number.isFinite(stored?.comparison_position) &&
        stored.comparison_position >= 0 &&
        stored.comparison_position <= 100
          ? stored.comparison_position
          : DEFAULT_SETTINGS.comparison_position,
      theme: THEMES.has(stored?.theme)
        ? stored.theme
        : window.matchMedia?.('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : DEFAULT_SETTINGS.theme,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function App() {
  const saved_settings = useRef(load_settings()).current;
  const [source, set_source] = useState(null);
  const [converted, set_converted] = useState(null);
  const [supports_webassembly, set_supports_webassembly] = useState(HAS_WEBASSEMBLY_API);
  const [format, set_format] = useState(saved_settings.format);
  const [quality, set_quality] = useState(saved_settings.quality);
  const [source_error, set_source_error] = useState('');
  const [conversion_error, set_conversion_error] = useState('');
  const [difference_error, set_difference_error] = useState('');
  const [is_loading, set_is_loading] = useState(false);
  const [is_converting, set_is_converting] = useState(false);
  const [show_difference, set_show_difference] = useState(saved_settings.show_difference);
  const [difference_sensitivity, set_difference_sensitivity] = useState(
    saved_settings.difference_sensitivity,
  );
  const [difference_view, set_difference_view] = useState(saved_settings.difference_view);
  const [difference_stats, set_difference_stats] = useState(null);
  const [comparison_position, set_comparison_position] = useState(
    saved_settings.comparison_position,
  );
  const [theme, set_theme] = useState(saved_settings.theme);
  const [difference_url, set_difference_url] = useState('');
  const [is_difference_loading, set_is_difference_loading] = useState(false);
  const object_urls = useRef(new Set());

  useEffect(() => {
    let is_cancelled = false;

    async function check_webassembly() {
      if (!HAS_WEBASSEMBLY_API || typeof WebAssembly.compile !== 'function') {
        set_supports_webassembly(false);
        set_format((current_format) =>
          current_format === 'avif' || current_format === 'webp' ? 'jpeg' : current_format,
        );
        return;
      }

      try {
        await WebAssembly.compile(
          new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]),
        );
      } catch {
        if (!is_cancelled) {
          set_supports_webassembly(false);
          set_format((current_format) =>
            current_format === 'avif' || current_format === 'webp' ? 'jpeg' : current_format,
          );
        }
      }
    }

    check_webassembly();

    return () => {
      is_cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({
          format,
          quality,
          show_difference,
          difference_sensitivity,
          difference_view,
          comparison_position,
          theme,
        }),
      );
    } catch {
      // The demo still works when browser storage is unavailable.
    }
  }, [
    format,
    quality,
    show_difference,
    difference_sensitivity,
    difference_view,
    comparison_position,
    theme,
  ]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    let is_cancelled = false;
    let generated_url = '';

    if (!show_difference || !source || !converted) {
      set_difference_url('');
      set_difference_stats(null);
      set_is_difference_loading(false);
      return undefined;
    }

    set_difference_url('');
    set_difference_stats(null);
    set_difference_error('');
    set_is_difference_loading(true);

    async function generate_difference() {
      try {
        const difference_result = await create_difference_overlay(
          source.image_data,
          converted.blob,
          difference_sensitivity,
        );

        if (is_cancelled) {
          return;
        }

        generated_url = create_object_url(difference_result.blob);
        set_difference_url(generated_url);
        set_difference_stats(difference_result);
      } catch (overlay_error) {
        if (!is_cancelled) {
          set_difference_error(
            overlay_error instanceof Error
              ? overlay_error.message
              : 'Could not build the difference map.',
          );
        }
      } finally {
        if (!is_cancelled) {
          set_is_difference_loading(false);
        }
      }
    }

    generate_difference();

    return () => {
      is_cancelled = true;
      if (generated_url) {
        revoke_object_url(generated_url);
      }
    };
  }, [source, converted, show_difference, difference_sensitivity]);

  useEffect(() => {
    return () => {
      object_urls.current.forEach((url) => URL.revokeObjectURL(url));
      object_urls.current.clear();
    };
  }, []);

  function create_object_url(blob) {
    const url = URL.createObjectURL(blob);
    object_urls.current.add(url);
    return url;
  }

  function revoke_object_url(url) {
    if (!url || !object_urls.current.has(url)) {
      return;
    }

    URL.revokeObjectURL(url);
    object_urls.current.delete(url);
  }

  function clear_conversion() {
    if (converted?.url) {
      revoke_object_url(converted.url);
    }
    if (difference_url) {
      revoke_object_url(difference_url);
    }

    set_converted(null);
    set_difference_url('');
    set_difference_stats(null);
    set_difference_error('');
  }

  async function handle_file(file) {
    set_source_error('');
    set_conversion_error('');
    set_difference_error('');

    if (!file.type.startsWith('image/')) {
      set_source_error('Choose a JPEG, PNG, WebP, AVIF, or GIF image.');
      return;
    }

    set_is_loading(true);

    try {
      const decoded = await load_image_data(file);
      const url = create_object_url(file);

      if (source?.url) {
        revoke_object_url(source.url);
      }
      clear_conversion();

      set_source({
        file,
        url,
        image_data: decoded.image_data,
        width: decoded.width,
        height: decoded.height,
      });
    } catch (load_error) {
      set_source_error(
        load_error instanceof Error ? load_error.message : 'Could not read this image.',
      );
    } finally {
      set_is_loading(false);
    }
  }

  async function fetch_random_image(width, height, label = 'random') {
    set_source_error('');
    set_is_loading(true);

    const seed = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);

    try {
      const response = await fetch(
        `https://picsum.photos/seed/${seed}/${width}/${height}.jpg`,
      );
      if (!response.ok) {
        throw new Error('The random image could not be loaded.');
      }

      const blob = await response.blob();
      const file = new File([blob], `${label}-${seed}.jpg`, {
        type: blob.type || 'image/jpeg',
      });
      await handle_file(file);
    } catch (random_image_error) {
      set_source_error(
        random_image_error instanceof Error
          ? random_image_error.message
          : 'The random image could not be loaded.',
      );
    } finally {
      set_is_loading(false);
    }
  }

  async function handle_random_image() {
    await fetch_random_image(2048, 1280);
  }

  async function handle_random_aspect_image() {
    const random_index = crypto.getRandomValues(new Uint32Array(1))[0] % RANDOM_ASPECTS.length;
    const aspect = RANDOM_ASPECTS[random_index];
    await fetch_random_image(aspect.width, aspect.height, `random-${aspect.label}`);
  }

  async function handle_random_hd_image() {
    await fetch_random_image(3840, 2160, 'random-4k');
  }

  async function handle_convert() {
    if (!source) {
      return;
    }

    set_conversion_error('');
    set_difference_error('');
    set_is_converting(true);
    clear_conversion();

    try {
      const started_at = performance.now();
      const blob = await convert_image(source.image_data, format, quality);
      const duration_ms = performance.now() - started_at;
      const url = create_object_url(blob);

      set_converted({
        blob,
        url,
        format,
        quality,
        duration_ms,
      });
    } catch (conversion_error) {
      set_conversion_error(
        conversion_error instanceof Error
          ? conversion_error.message
          : `Could not encode this image as ${format.toUpperCase()}.`,
      );
    } finally {
      set_is_converting(false);
    }
  }

  function handle_difference_change(checked) {
    set_difference_error('');
    set_show_difference(checked);
  }

  function handle_difference_sensitivity_change(sensitivity) {
    set_difference_sensitivity(sensitivity);
  }

  const download_name = source
    ? format_output_filename(source.file.name, converted?.format || format)
    : '';

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto grid max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-12 lg:gap-10">
        <h1 className="sr-only">Image format lab</h1>
        <aside className="space-y-6 lg:col-span-4 lg:border-r lg:border-zinc-200 lg:pr-8 dark:lg:border-zinc-800 xl:col-span-3">
          <div className="flex justify-end">
            <button
              type="button"
              aria-label={theme === 'dark' ? 'Use light mode' : 'Use dark mode'}
              title={theme === 'dark' ? 'Use light mode' : 'Use dark mode'}
              className="flex size-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 outline-none hover:border-zinc-300 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-white dark:focus-visible:ring-offset-zinc-950"
              onClick={() => set_theme((current_theme) => (current_theme === 'dark' ? 'light' : 'dark'))}
            >
              {theme === 'dark' ? (
                <Sun aria-hidden="true" className="size-4" strokeWidth={1.8} />
              ) : (
                <Moon aria-hidden="true" className="size-4" strokeWidth={1.8} />
              )}
            </button>
          </div>
          <ImageSourcePicker
            source_name={is_loading ? 'Loading image…' : source?.file.name}
            is_loading={is_loading}
            error={source_error}
            on_file={handle_file}
            on_random_image={handle_random_image}
            on_random_aspect_image={handle_random_aspect_image}
            on_random_hd_image={handle_random_hd_image}
          />

          <ConversionControls
            format={format}
            quality={quality}
            disabled={!source || is_loading}
            is_converting={is_converting}
            supports_webassembly={supports_webassembly}
            error={conversion_error}
            on_format_change={set_format}
            on_quality_change={set_quality}
            on_convert={handle_convert}
          />
        </aside>

        <div className="min-w-0 space-y-6 lg:col-span-8 xl:col-span-9">
          <ImageComparison
            original_url={source?.url}
            converted_url={converted?.url}
            difference_url={difference_url}
            width={source?.width}
            height={source?.height}
            converted_format={converted?.format || format}
            show_difference={show_difference}
            difference_sensitivity={difference_sensitivity}
            difference_view={difference_view}
            difference_stats={difference_stats}
            comparison_position={comparison_position}
            is_difference_loading={is_difference_loading}
            difference_error={difference_error}
            on_difference_change={handle_difference_change}
            on_difference_sensitivity_change={handle_difference_sensitivity_change}
            on_difference_view_change={set_difference_view}
            on_comparison_position_change={set_comparison_position}
          />

          <FormatStats
            source={source}
            converted={converted}
            download_name={download_name}
          />

          <FormatReference />
        </div>
      </main>
    </div>
  );
}
