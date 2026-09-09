const FORMATS = [
  {
    format: 'JPEG',
    compression: 'Lossy',
    alpha: 'No',
    animation: 'No',
  },
  {
    format: 'PNG',
    compression: 'Lossless',
    alpha: 'Yes',
    animation: 'No',
  },
  {
    format: 'WebP',
    compression: 'Lossy / lossless',
    alpha: 'Yes',
    animation: 'Yes',
  },
  {
    format: 'AVIF',
    compression: 'Lossy / lossless',
    alpha: 'Yes',
    animation: 'Yes',
  },
  {
    format: 'GIF',
    compression: 'Lossless, palette-limited',
    alpha: '1-bit',
    animation: 'Yes',
  },
];

export default function FormatReference() {
  return (
    <section
      aria-labelledby="format-reference-heading"
      className="space-y-4 border-t border-zinc-200 pt-6 dark:border-zinc-800"
    >
      <h2
        id="format-reference-heading"
        className="text-balance text-lg font-semibold text-zinc-950 dark:text-zinc-100"
      >
        Format reference
      </h2>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Format</th>
              <th scope="col" className="px-4 py-3 font-medium">Compression</th>
              <th scope="col" className="px-4 py-3 font-medium">Alpha</th>
              <th scope="col" className="px-4 py-3 font-medium">Animation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {FORMATS.map((item) => (
              <tr key={item.format}>
                <th
                  scope="row"
                  className="whitespace-nowrap px-4 py-3 font-semibold text-zinc-950 dark:text-zinc-100"
                >
                  {item.format}
                </th>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {item.compression}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{item.alpha}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{item.animation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="max-w-3xl text-pretty text-xs leading-5 text-zinc-500 dark:text-zinc-400">
        These are format capabilities, not an equal-quality file-size ranking. Content and encoder settings can change the result substantially.
      </p>
    </section>
  );
}
