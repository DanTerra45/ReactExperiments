import { MoveHorizontal, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  getTransformStyles,
  TransformComponent,
  TransformWrapper,
} from 'react-zoom-pan-pinch';
import { cn } from '../lib/cn.js';

const SENSITIVITY_OPTIONS = [
  { value: 'fine', label: 'Fine' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'major', label: 'Major' },
];

export default function ImageComparison({
  original_url,
  converted_url,
  difference_url,
  width,
  height,
  converted_format,
  show_difference,
  difference_sensitivity,
  difference_view,
  difference_stats,
  comparison_position,
  is_difference_loading,
  difference_error,
  on_difference_change,
  on_difference_sensitivity_change,
  on_difference_view_change,
  on_comparison_position_change,
}) {
  const comparison_viewport_ref = useRef(null);
  const [transform_state, set_transform_state] = useState({
    scale: 1,
    positionX: 0,
    positionY: 0,
  });

  const zoom_scale = transform_state.scale;
  const changed_percentage = difference_stats?.total_pixels
    ? (difference_stats.changed_pixels / difference_stats.total_pixels) * 100
    : null;
  const changed_label =
    changed_percentage === null
      ? null
      : changed_percentage === 0
        ? '0% changed'
        : changed_percentage < 0.01
          ? '<0.01% changed'
          : `${changed_percentage.toFixed(changed_percentage < 1 ? 2 : 1)}% changed`;
  const image_transform = getTransformStyles(
    transform_state.positionX,
    transform_state.positionY,
    zoom_scale,
  );

  function update_split_from_pointer(event) {
    const bounds = comparison_viewport_ref.current?.getBoundingClientRect();
    if (!bounds?.width) {
      return;
    }

    const next_position = ((event.clientX - bounds.left) / bounds.width) * 100;
    on_comparison_position_change(Math.min(100, Math.max(0, next_position)));
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

  if (!original_url) {
    return (
      <section className="flex min-h-96 items-center justify-center rounded-xl border border-zinc-200 bg-white p-8 text-center">
        <div className="max-w-sm">
          <h2 className="text-balance text-xl font-semibold text-zinc-950">
            Start with an image
          </h2>
          <p className="mt-2 text-pretty text-sm leading-6 text-zinc-600">
            Load a file or use a random image. The converted result and size comparison will appear here.
          </p>
        </div>
      </section>
    );
  }

  if (!converted_url) {
    return (
      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div
          className="relative max-h-dvh min-h-80 w-full bg-zinc-100"
          style={{ aspectRatio: `${width} / ${height}` }}
        >
          <img
            src={original_url}
            alt="Original preview"
            className="absolute inset-0 size-full object-contain"
          />
        </div>
        <div className="border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600">
          Choose a format and convert to enable visual comparison.
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="comparison-heading" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="comparison-heading" className="text-balance text-xl font-semibold text-zinc-950">
            Visual comparison
          </h2>
          <p className="mt-1 text-pretty text-sm leading-6 text-zinc-600">
            Original on the left, {converted_format.toUpperCase()} on the right.
          </p>
        </div>

        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium text-zinc-900">
              {is_difference_loading ? 'Building difference map…' : 'Highlight differences'}
            </p>
            <p className="text-xs leading-5 text-zinc-500">
              Perceptual pixel diff; anti-aliased changes are filtered.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <fieldset className="flex items-center gap-2">
              <legend className="sr-only">Difference view</legend>
              <span className="text-xs text-zinc-500">View</span>
              {['off', 'overlay', 'mask'].map((view) => {
                const is_active = view === 'off' ? !show_difference : show_difference && difference_view === view;

                return (
                  <button
                    key={view}
                    type="button"
                    aria-pressed={is_active}
                    disabled={is_difference_loading}
                    className={cn(
                      'rounded-md border px-2 py-1 text-xs font-medium capitalize outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50',
                      is_active
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-950',
                    )}
                    onClick={() => {
                      if (view === 'off') {
                        on_difference_change(false);
                        return;
                      }

                      on_difference_view_change(view);
                      on_difference_change(true);
                    }}
                  >
                    {view}
                  </button>
                );
              })}
            </fieldset>

            {show_difference ? (
              <>
                <fieldset className="flex items-center gap-2">
                  <legend className="sr-only">Difference sensitivity</legend>
                  <span className="text-xs text-zinc-500">Sensitivity</span>
                  {SENSITIVITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={difference_sensitivity === option.value}
                      disabled={is_difference_loading}
                      className={cn(
                        'rounded-md border px-2 py-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50',
                        difference_sensitivity === option.value
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-950',
                      )}
                      onClick={() => on_difference_sensitivity_change(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </fieldset>

                {changed_label ? (
                  <output className="text-xs font-medium tabular-nums text-zinc-600 dark:text-zinc-400">
                    {changed_label}
                  </output>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {difference_error ? (
        <p className="text-pretty text-sm text-red-700" role="alert">
          {difference_error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div
          className="relative max-h-dvh min-h-80 w-full overflow-hidden bg-zinc-100"
          style={{ aspectRatio: `${width} / ${height}` }}
        >
          <TransformWrapper
            minScale={1}
            maxScale={8}
            centerOnInit
            centerZoomedOut
            smooth={false}
            wheel={{ disabled: true }}
            doubleClick={{ disabled: true }}
            panning={{
              excluded: ['comparison-split-control'],
              velocityDisabled: true,
            }}
            zoomAnimation={{ disabled: true }}
            velocityAnimation={{ disabled: true }}
            onInit={(ref) =>
              set_transform_state({
                scale: ref.state.scale,
                positionX: ref.state.positionX,
                positionY: ref.state.positionY,
              })
            }
            onTransform={(_, next_state) => set_transform_state(next_state)}
          >
            {({ zoomIn, zoomOut, resetTransform }) => {
              const is_zoomed = zoom_scale > 1.01;

              return (
                <div className="relative size-full">
                  <div ref={comparison_viewport_ref} className="relative size-full">
                    <TransformComponent
                      wrapperStyle={{ width: '100%', height: '100%' }}
                      contentStyle={{ width: '100%', height: '100%' }}
                    >
                      <div className="relative size-full">
                        <img
                          src={converted_url}
                          alt={`${converted_format.toUpperCase()} preview`}
                          className="absolute inset-0 size-full object-contain"
                        />
                      </div>
                    </TransformComponent>

                    <div
                      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
                      style={{ clipPath: `inset(0 ${100 - comparison_position}% 0 0)` }}
                    >
                      <div
                        className="absolute inset-0 origin-top-left"
                        style={{ transform: image_transform }}
                      >
                        <img
                          src={original_url}
                          alt="Original preview"
                          className="absolute inset-0 size-full object-contain"
                        />
                      </div>
                    </div>

                    {show_difference && difference_view === 'mask' ? (
                      <div
                        className="pointer-events-none absolute inset-0 z-20 bg-zinc-950"
                        style={{ clipPath: `inset(0 0 0 ${comparison_position}%)` }}
                        aria-hidden="true"
                      />
                    ) : null}

                    {show_difference && difference_url ? (
                      <div
                        className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
                        style={{ clipPath: `inset(0 0 0 ${comparison_position}%)` }}
                        aria-hidden="true"
                      >
                        <div
                          className="absolute inset-0 origin-top-left"
                          style={{ transform: image_transform }}
                        >
                          <img
                            src={difference_url}
                            alt=""
                            className="absolute inset-0 size-full object-contain"
                          />
                        </div>
                      </div>
                    ) : null}

                    <label htmlFor="comparison-position" className="sr-only">
                      Comparison split position
                    </label>
                    <input
                      id="comparison-position"
                      type="range"
                      min="0"
                      max="100"
                      value={comparison_position}
                      aria-label="Comparison split position"
                      className="peer sr-only"
                      onChange={(event) =>
                        on_comparison_position_change(Number(event.target.value))
                      }
                    />

                    <div
                      className="pointer-events-none absolute inset-y-0 z-30 w-0.5 bg-white shadow"
                      style={{
                        left: `${comparison_position}%`,
                        transform: 'translateX(-50%)',
                      }}
                      aria-hidden="true"
                    />
                    <div
                      className="comparison-split-control absolute inset-y-0 z-40 w-11 -translate-x-1/2 cursor-col-resize touch-none"
                      style={{ left: `${comparison_position}%` }}
                      onPointerDown={handle_split_pointer_down}
                      onPointerMove={handle_split_pointer_move}
                    />
                    <span
                      className="pointer-events-none absolute top-1/2 z-40 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600 peer-focus-visible:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:peer-focus-visible:ring-offset-zinc-950"
                      style={{ left: `${comparison_position}%` }}
                      aria-hidden="true"
                    >
                      <MoveHorizontal className="size-4" strokeWidth={1.8} />
                    </span>
                  </div>

                  <span className="pointer-events-none absolute left-3 top-3 z-20 rounded-md bg-white/90 px-2 py-1 text-xs font-semibold text-zinc-900 shadow-sm dark:bg-zinc-900/90 dark:text-zinc-100">
                    Original
                  </span>
                  <span className="pointer-events-none absolute right-3 top-3 z-20 rounded-md bg-white/90 px-2 py-1 text-xs font-semibold text-zinc-900 shadow-sm dark:bg-zinc-900/90 dark:text-zinc-100">
                    {show_difference && difference_view === 'mask'
                      ? `${converted_format.toUpperCase()} diff`
                      : converted_format.toUpperCase()}
                  </span>

                  <div className="absolute bottom-3 right-3 z-40 flex items-center overflow-hidden rounded-lg border border-zinc-200 bg-white/95 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/95">
                    <button
                      type="button"
                      aria-label="Zoom out"
                      title="Zoom out"
                      disabled={!is_zoomed}
                      className="flex size-9 items-center justify-center text-zinc-700 outline-none hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:text-zinc-300 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:disabled:text-zinc-600"
                      onClick={() => zoomOut(0.5)}
                    >
                      <ZoomOut className="size-4" />
                    </button>
                    <span className="min-w-12 border-x border-zinc-200 px-2 text-center text-xs font-medium tabular-nums text-zinc-600">
                      {zoom_scale.toFixed(1)}×
                    </span>
                    <button
                      type="button"
                      aria-label="Zoom in"
                      title="Zoom in"
                      disabled={zoom_scale >= 7.99}
                      className="flex size-9 items-center justify-center text-zinc-700 outline-none hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:text-zinc-300 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:disabled:text-zinc-600"
                      onClick={() => zoomIn(0.5)}
                    >
                      <ZoomIn className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Reset zoom"
                      title="Reset zoom"
                      disabled={!is_zoomed}
                      className="flex size-9 items-center justify-center border-l border-zinc-200 text-zinc-700 outline-none hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:text-zinc-300 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:disabled:text-zinc-600"
                      onClick={() => resetTransform()}
                    >
                      <RotateCcw className="size-4" />
                    </button>
                  </div>

                  {is_zoomed ? (
                    <p className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-md bg-black/70 px-2 py-1 text-xs text-white">
                      Drag image to pan · drag divider to compare
                    </p>
                  ) : null}
                </div>
              );
            }}
          </TransformWrapper>
        </div>
      </div>
    </section>
  );
}
