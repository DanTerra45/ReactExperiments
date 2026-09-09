import { format_bytes } from '../lib/image_processing.js';

export default function FormatStats({ source, converted, download_name }) {
  if (!source) {
    return null;
  }

  const size_change_percentage = converted
    ? ((converted.blob.size - source.file.size) / source.file.size) * 100
    : null;

  const size_change_label =
    size_change_percentage === null
      ? '—'
      : Math.abs(size_change_percentage) < 0.05
        ? '0.0%'
        : `${size_change_percentage > 0 ? '+' : '−'}${Math.abs(size_change_percentage).toFixed(1)}%`;

  return (
    <section aria-labelledby="stats-heading" className="border-t border-zinc-200 pt-5 dark:border-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="stats-heading" className="text-balance text-lg font-semibold text-zinc-950 dark:text-zinc-100">
            Result
          </h2>
          <p className="mt-1 text-pretty text-sm text-zinc-600 dark:text-zinc-400">
            Actual files in the current session.
          </p>
        </div>

        {converted ? (
          <a
            href={converted.url}
            download={download_name}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 outline-none hover:border-zinc-400 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:text-white dark:focus-visible:ring-offset-zinc-950"
          >
            Download {converted.format.toUpperCase()}
          </a>
        ) : null}
      </div>

      <dl className="mt-4 grid grid-cols-2 overflow-hidden rounded-xl border border-zinc-200 bg-white md:grid-cols-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-r border-zinc-200 p-4 md:border-b-0 dark:border-zinc-800">
          <dt className="text-xs text-zinc-500">Original size</dt>
          <dd className="mt-1 tabular-nums text-lg font-semibold text-zinc-950">
            {format_bytes(source.file.size)}
          </dd>
        </div>
        <div className="border-b border-zinc-200 p-4 md:border-b-0 md:border-r dark:border-zinc-800">
          <dt className="text-xs text-zinc-500">Converted size</dt>
          <dd className="mt-1 tabular-nums text-lg font-semibold text-zinc-950">
            {converted ? format_bytes(converted.blob.size) : '—'}
          </dd>
        </div>
        <div className="border-r border-zinc-200 p-4 dark:border-zinc-800">
          <dt className="text-xs text-zinc-500">Size change</dt>
          <dd className="mt-1 tabular-nums text-lg font-semibold text-zinc-950">
            {size_change_label}
          </dd>
        </div>
        <div className="p-4">
          <dt className="text-xs text-zinc-500">Encode time</dt>
          <dd className="mt-1 tabular-nums text-lg font-semibold text-zinc-950">
            {converted ? `${Math.round(converted.duration_ms)} ms` : '—'}
          </dd>
        </div>
      </dl>

      <p className="mt-2 tabular-nums text-xs text-zinc-500 dark:text-zinc-400">
        {source.width} × {source.height} px · {source.file.type || 'unknown input type'}
      </p>
    </section>
  );
}
