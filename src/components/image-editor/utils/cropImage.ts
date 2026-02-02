/**
 * Image cropping and processing utilities
 */

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FlipSettings {
  horizontal: boolean;
  vertical: boolean;
}

export interface FilterSettings {
  brightness: number;
  contrast: number;
  saturation: number;
}

/**
 * Creates an image element from a URL
 */
export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.crossOrigin = 'anonymous';
    image.src = url;
  });

/**
 * Gets the radians angle from degrees
 */
function getRadianAngle(degreeValue: number): number {
  return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the new bounding area of a rotated rectangle
 */
function rotateSize(width: number, height: number, rotation: number): { width: number; height: number } {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

/**
 * Crops and processes an image with all transformations
 */
export async function cropAndResizeImage(
  imageSrc: string,
  pixelCrop: CropArea,
  rotation: number = 0,
  flip: FlipSettings = { horizontal: false, vertical: false },
  filters: FilterSettings = { brightness: 100, contrast: 100, saturation: 100 },
  outputWidth: number,
  outputHeight: number,
  format: 'jpeg' | 'png' | 'webp' = 'jpeg',
  quality: number = 0.92
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  // Calculate the size of the rotated image
  const rotRad = getRadianAngle(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  );

  // Create a canvas for the rotated image
  const rotatedCanvas = document.createElement('canvas');
  rotatedCanvas.width = bBoxWidth;
  rotatedCanvas.height = bBoxHeight;
  const rotatedCtx = rotatedCanvas.getContext('2d');

  if (!rotatedCtx) {
    throw new Error('No 2d context');
  }

  // Translate to center, rotate, and translate back
  rotatedCtx.translate(bBoxWidth / 2, bBoxHeight / 2);
  rotatedCtx.rotate(rotRad);
  rotatedCtx.translate(-image.width / 2, -image.height / 2);

  // Apply flip transformations
  if (flip.horizontal || flip.vertical) {
    rotatedCtx.scale(
      flip.horizontal ? -1 : 1,
      flip.vertical ? -1 : 1
    );
    if (flip.horizontal) {
      rotatedCtx.translate(-image.width, 0);
    }
    if (flip.vertical) {
      rotatedCtx.translate(0, -image.height);
    }
  }

  // Draw the image
  rotatedCtx.drawImage(image, 0, 0);

  // Set the final canvas size to the output dimensions
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  // Apply filters
  ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)`;

  // Draw the cropped area to the final canvas, scaled to output dimensions
  ctx.drawImage(
    rotatedCanvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob);
      },
      `image/${format}`,
      quality
    );
  });
}

/**
 * Generates a preview image without full quality processing
 */
export async function generatePreviewImage(
  imageSrc: string,
  pixelCrop: CropArea,
  rotation: number = 0,
  flip: FlipSettings = { horizontal: false, vertical: false },
  filters: FilterSettings = { brightness: 100, contrast: 100, saturation: 100 },
  previewSize: number = 200
): Promise<Blob> {
  // Use a smaller size for faster preview generation
  return cropAndResizeImage(
    imageSrc,
    pixelCrop,
    rotation,
    flip,
    filters,
    previewSize,
    previewSize,
    'jpeg',
    0.7
  );
}
