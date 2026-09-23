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

export async function create_degraded_preview(image_data) {
  const source_canvas = image_data_to_canvas(image_data);
  const reduced_canvas = document.createElement('canvas');
  const scale = 0.18;

  reduced_canvas.width = Math.max(1, Math.round(image_data.width * scale));
  reduced_canvas.height = Math.max(1, Math.round(image_data.height * scale));

  const reduced_context = reduced_canvas.getContext('2d');
  reduced_context.imageSmoothingEnabled = true;
  reduced_context.imageSmoothingQuality = 'low';
  reduced_context.drawImage(
    source_canvas,
    0,
    0,
    reduced_canvas.width,
    reduced_canvas.height,
  );

  const output_canvas = document.createElement('canvas');
  output_canvas.width = image_data.width;
  output_canvas.height = image_data.height;

  const output_context = output_canvas.getContext('2d');
  output_context.fillStyle = '#ffffff';
  output_context.fillRect(0, 0, output_canvas.width, output_canvas.height);
  output_context.imageSmoothingEnabled = true;
  output_context.imageSmoothingQuality = 'low';
  output_context.drawImage(
    reduced_canvas,
    0,
    0,
    output_canvas.width,
    output_canvas.height,
  );

  return canvas_to_blob(output_canvas, 'image/jpeg', 0.2);
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

function pixel_luminance(pixels, index) {
  const alpha = pixels[index + 3] / 255;
  const red = pixels[index] * alpha + 255 * (1 - alpha);
  const green = pixels[index + 1] * alpha + 255 * (1 - alpha);
  const blue = pixels[index + 2] * alpha + 255 * (1 - alpha);

  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

export async function calculate_ssim(original_image_data, converted_blob) {
  const converted = await load_image_data(converted_blob);

  if (
    converted.width !== original_image_data.width ||
    converted.height !== original_image_data.height
  ) {
    throw new Error('The converted image dimensions do not match the original.');
  }

  const block_size = 8;
  const c1 = (0.01 * 255) ** 2;
  const c2 = (0.03 * 255) ** 2;
  const original_pixels = original_image_data.data;
  const converted_pixels = converted.image_data.data;
  const width = original_image_data.width;
  const height = original_image_data.height;
  let weighted_ssim = 0;
  let total_weight = 0;

  for (let block_y = 0; block_y < height; block_y += block_size) {
    const block_height = Math.min(block_size, height - block_y);

    for (let block_x = 0; block_x < width; block_x += block_size) {
      const block_width = Math.min(block_size, width - block_x);
      const pixel_count = block_width * block_height;
      let original_sum = 0;
      let converted_sum = 0;
      let original_square_sum = 0;
      let converted_square_sum = 0;
      let product_sum = 0;

      for (let y = 0; y < block_height; y += 1) {
        for (let x = 0; x < block_width; x += 1) {
          const pixel_index = ((block_y + y) * width + block_x + x) * 4;
          const original_luminance = pixel_luminance(original_pixels, pixel_index);
          const converted_luminance = pixel_luminance(converted_pixels, pixel_index);

          original_sum += original_luminance;
          converted_sum += converted_luminance;
          original_square_sum += original_luminance * original_luminance;
          converted_square_sum += converted_luminance * converted_luminance;
          product_sum += original_luminance * converted_luminance;
        }
      }

      const original_mean = original_sum / pixel_count;
      const converted_mean = converted_sum / pixel_count;
      const denominator = Math.max(1, pixel_count - 1);
      const original_variance = Math.max(
        0,
        (original_square_sum - (original_sum * original_sum) / pixel_count) / denominator,
      );
      const converted_variance = Math.max(
        0,
        (converted_square_sum - (converted_sum * converted_sum) / pixel_count) / denominator,
      );
      const covariance =
        (product_sum - (original_sum * converted_sum) / pixel_count) / denominator;
      const numerator =
        (2 * original_mean * converted_mean + c1) * (2 * covariance + c2);
      const ssim_denominator =
        (original_mean ** 2 + converted_mean ** 2 + c1) *
        (original_variance + converted_variance + c2);
      const block_ssim = ssim_denominator === 0 ? 1 : numerator / ssim_denominator;

      weighted_ssim += block_ssim * pixel_count;
      total_weight += pixel_count;
    }
  }

  return total_weight ? weighted_ssim / total_weight : 1;
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
