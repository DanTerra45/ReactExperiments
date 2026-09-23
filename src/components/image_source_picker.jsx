import { MonitorUp, Ratio, Shuffle } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/cn.js';

export default function ImageSourcePicker({
  source_name,
  is_loading,
  error,
  on_file,
  on_random_image,
  on_random_aspect_image,
  on_random_hd_image,
}) {
  const [is_dragging, set_is_dragging] = useState(false);

  function handle_drop(event) {
    event.preventDefault();
    set_is_dragging(false);

    const [file] = event.dataTransfer.files;
    if (file) {
      on_file(file);
    }
  }

  return (
    <section aria-labelledby="source-heading" className="space-y-4">
      <div>
        <h2 id="source-heading" className="text-balance text-lg font-semibold text-zinc-950 dark:text-zinc-100">
          Choose an image
        </h2>
        <p className="mt-1 text-pretty text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Load your images. Files stay in this browser.
        </p>
      </div>

      <label
        htmlFor="image-upload"
        className={cn(
          'flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-5 py-6 text-center outline-none',
          'focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 dark:focus-within:ring-offset-zinc-950',
          is_dragging
            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40'
            : 'border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600',
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          set_is_dragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => set_is_dragging(false)}
        onDrop={handle_drop}
      >
        <span className="font-medium text-zinc-900 dark:text-zinc-100">
          {source_name || 'Drop an image here'}
        </span>
        <span className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {source_name ? 'Choose a different file' : 'or click to browse'}
        </span>
        <input
          id="image-upload"
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          disabled={is_loading}
          onChange={(event) => {
            const [file] = event.target.files;
            if (file) {
              on_file(file);
            }
            event.target.value = '';
          }}
        />
      </label>

      <div className="grid gap-2">
        <button
          type="button"
          disabled={is_loading}
          className="flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 outline-none hover:border-zinc-300 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-white dark:focus-visible:ring-offset-zinc-950"
          onClick={on_random_image}
        >
          <Shuffle aria-hidden="true" className="size-4" strokeWidth={1.8} />
          Random
        </button>
        <button
          type="button"
          disabled={is_loading}
          className="flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 outline-none hover:border-zinc-300 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-white dark:focus-visible:ring-offset-zinc-950"
          onClick={on_random_aspect_image}
        >
          <Ratio aria-hidden="true" className="size-4" strokeWidth={1.8} />
          Random ratio
        </button>
        <button
          type="button"
          disabled={is_loading}
          className="flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 outline-none hover:border-zinc-300 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-white dark:focus-visible:ring-offset-zinc-950"
          onClick={on_random_hd_image}
        >
          <MonitorUp aria-hidden="true" className="size-4" strokeWidth={1.8} />
          Random 4K
        </button>
      </div>
      <p className="text-pretty text-xs leading-5 text-zinc-500 dark:text-zinc-400">
        Standard samples use up to 2048 px. Random 4K uses 3840 × 2160 for closer artifact inspection.
      </p>

      {error ? (
        <p className="text-pretty text-sm leading-5 text-red-700 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
