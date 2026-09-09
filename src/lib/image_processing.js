import pixelmatch from 'pixelmatch';

const MAX_IMAGE_PIXELS = 16_000_000;

async function create_bitmap(blob) {
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch {
    return createImageBitmap(blob);
  }
}

function canvas_to_blob(canvas, type = 'image/png', quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error('Could not create the comparison image.'));
    }, type, quality);
  });
}

function image_data_to_canvas(image_data) {
  const canvas = document.createElement('canvas');
  canvas.width = image_data.width;
  canvas.height = image_data.height;
  canvas.getContext('2d').putImageData(image_data, 0, 0);
  return canvas;
}

export async function load_image_data(blob) {
  const bitmap = await create_bitmap(blob);
  const pixel_count = bitmap.width * bitmap.height;

  if (pixel_count > MAX_IMAGE_PIXELS) {
    bitmap.close();
    throw new Error(
      `This demo accepts images up to ${Math.round(MAX_IMAGE_PIXELS / 1_000_000)} MP to keep browser encoding responsive.`,
    );
  }

  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  return {
    image_data: context.getImageData(0, 0, canvas.width, canvas.height),
    width: canvas.width,
    height: canvas.height,
  };
}

export async function convert_image(image_data, format, quality) {
  if (format === 'avif') {
    const { encode } = await import('@jsquash/avif');
    const buffer = await encode(image_data, {
      quality,
      speed: 6,
    });

    return new Blob([buffer], { type: 'image/avif' });
  }

  if (format === 'webp') {
    const { encode } = await import('@jsquash/webp');
    const buffer = await encode(image_data, {
      quality,
      method: 4,
    });

    return new Blob([buffer], { type: 'image/webp' });
  }

  if (format === 'png') {
    return canvas_to_blob(image_data_to_canvas(image_data), 'image/png');
  }

  if (format === 'gif') {
    const { GIFEncoder, quantize, applyPalette } = await import('gifenc');
    const source_canvas = image_data_to_canvas(image_data);
    const output_canvas = document.createElement('canvas');
    output_canvas.width = image_data.width;
    output_canvas.height = image_data.height;

    const context = output_canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, output_canvas.width, output_canvas.height);
    context.drawImage(source_canvas, 0, 0);

    const gif_image_data = context.getImageData(
      0,
      0,
      output_canvas.width,
      output_canvas.height,
    );
    const palette = quantize(gif_image_data.data, 256);
    const indexed_pixels = applyPalette(gif_image_data.data, palette);
    const gif = GIFEncoder();

    gif.writeFrame(indexed_pixels, output_canvas.width, output_canvas.height, { palette });
    gif.finish();

    return new Blob([gif.bytes()], { type: 'image/gif' });
  }

  if (format === 'jpeg') {
    const source_canvas = image_data_to_canvas(image_data);
    const output_canvas = document.createElement('canvas');
    output_canvas.width = image_data.width;
    output_canvas.height = image_data.height;

    const context = output_canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, output_canvas.width, output_canvas.height);
    context.drawImage(source_canvas, 0, 0);

    return canvas_to_blob(output_canvas, 'image/jpeg', quality / 100);
  }

  throw new Error(`Unsupported output format: ${format}`);
}

const DIFFERENCE_THRESHOLDS = {
  fine: 0.05,
  balanced: 0.1,
  major: 0.2,
};

export async function create_difference_overlay(
  original_image_data,
  converted_blob,
  sensitivity = 'balanced',
) {
  const converted = await load_image_data(converted_blob);

  if (
    converted.width !== original_image_data.width ||
    converted.height !== original_image_data.height
  ) {
    throw new Error('The converted image dimensions do not match the original.');
  }

  const overlay = new ImageData(
    original_image_data.width,
    original_image_data.height,
  );
  const threshold = DIFFERENCE_THRESHOLDS[sensitivity] ?? DIFFERENCE_THRESHOLDS.balanced;

  const changed_pixels = pixelmatch(
    original_image_data.data,
    converted.image_data.data,
    overlay.data,
    original_image_data.width,
    original_image_data.height,
    {
      threshold,
      includeAA: false,
      diffMask: true,
      diffColor: [59, 130, 246],
    },
  );

  const canvas = document.createElement('canvas');
  canvas.width = original_image_data.width;
  canvas.height = original_image_data.height;
  canvas.getContext('2d').putImageData(overlay, 0, 0);

  return {
    blob: await canvas_to_blob(canvas),
    changed_pixels,
    total_pixels: original_image_data.width * original_image_data.height,
  };
}

export function format_bytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit_index = 0;

  while (value >= 1024 && unit_index < units.length - 1) {
    value /= 1024;
    unit_index += 1;
  }

  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[unit_index]}`;
}

export function format_output_filename(filename, format) {
  const base_name = filename.replace(/\.[^/.]+$/, '');
  return `${base_name}.${format}`;
}
