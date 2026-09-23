import { cn } from '../lib/cn.js';

const FORMATS = [
  { value: 'avif', label: 'AVIF', requires_wasm: true },
  { value: 'webp', label: 'WebP', requires_wasm: true },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
  { value: 'gif', label: 'GIF' },
];

export default function ConversionControls({
  format,
  quality,
  disabled,
  is_converting,
  supports_webassembly,
  error,
  on_format_change,
  on_quality_change,
  on_convert,
}) {
  return (
    <section aria-labelledby="conversion-heading" className="space-y-5 border-t border-zinc-200 pt-5 dark:border-zinc-800">
      <div>
        <h2 id="conversion-heading" className="text-balance text-lg font-semibold text-zinc-950 dark:text-zinc-100">
          Conversion
        </h2>
        <p className="mt-1 text-pretty text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Encode locally in the browser, then compare size and visible changes.
        </p>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">Output format</legend>
        <div className="grid grid-cols-3 gap-2">
          {FORMATS.map((option) => (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 dark:focus-within:ring-offset-zinc-950',
                format === option.value
                  ? 'border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700',
              )}
            >
              <input
                className="sr-only"
                type="radio"
                name="output-format"
                value={option.value}
                checked={format === option.value}
                disabled={disabled || (option.requires_wasm && !supports_webassembly)}
                onChange={() => on_format_change(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {format === 'png' || format === 'gif' ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {format === 'png' ? 'Lossless output' : '256-color palette'}
          </p>
          <p className="mt-0.5 text-pretty text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            {format === 'png'
              ? 'PNG preserves pixel values, so there is no lossy quality slider for this comparison.'
              : 'GIF reduces this still image to a maximum of 256 colors, so the regular quality scale does not apply.'}
          </p>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="quality" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Quality
            </label>
            <output htmlFor="quality" className="tabular-nums text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              {quality}
            </output>
          </div>
          <input
            id="quality"
            className="mt-2 w-full cursor-pointer accent-blue-600 disabled:cursor-not-allowed"
            type="range"
            min="0"
            max="100"
            step="1"
            value={quality}
            disabled={disabled}
            onChange={(event) => on_quality_change(Number(event.target.value))}
          />
          <p className="mt-1 text-pretty text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            Quality scales are encoder-specific, so the same number is not an equal-quality guarantee across formats.
          </p>
        </div>
      )}

      {!supports_webassembly ? (
        <p className="text-pretty text-xs leading-5 text-amber-700 dark:text-amber-400">
          WebAssembly is unavailable, so AVIF and WebP encoding are disabled. JPEG, PNG, and GIF still work.
        </p>
      ) : null}

      <div>
        <button
          type="button"
          disabled={disabled || is_converting}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white outline-none hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600 dark:focus-visible:ring-offset-zinc-950 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
          onClick={on_convert}
        >
          {is_converting ? 'Encoding…' : `Convert to ${format.toUpperCase()}`}
        </button>
        {error ? (
          <p className="mt-2 text-pretty text-sm leading-5 text-red-700 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
