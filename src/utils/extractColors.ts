/**
 * Extracts the dominant color from an image URL using canvas sampling.
 * Returns an HSL color string for easy manipulation.
 */
export async function extractDominantColor(imageUrl: string): Promise<{ r: number; g: number; b: number; hsl: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 32; // Sample at low res for speed
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, size, size);

      const data = ctx.getImageData(0, 0, size, size).data;
      let rSum = 0, gSum = 0, bSum = 0, count = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        // Skip near-black and near-white pixels
        if (a < 128) continue;
        const brightness = (r + g + b) / 3;
        if (brightness < 30 || brightness > 225) continue;
        // Weight by saturation to find colorful pixels
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const saturation = max === 0 ? 0 : (max - min) / max;
        const weight = 1 + saturation * 3;
        rSum += r * weight;
        gSum += g * weight;
        bSum += b * weight;
        count += weight;
      }

      if (count === 0) {
        resolve({ r: 168, g: 85, b: 247, hsl: 'hsl(270, 80%, 65%)' }); // Fallback purple
        return;
      }

      const r = Math.round(rSum / count);
      const g = Math.round(gSum / count);
      const b = Math.round(bSum / count);

      // Convert to HSL
      const rn = r / 255, gn = g / 255, bn = b / 255;
      const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
      const l = (max + min) / 2;
      let h = 0, s = 0;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
        else if (max === gn) h = ((bn - rn) / d + 2) / 6;
        else h = ((rn - gn) / d + 4) / 6;
      }

      const hsl = `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
      resolve({ r, g, b, hsl });
    };

    img.onerror = () => {
      resolve({ r: 168, g: 85, b: 247, hsl: 'hsl(270, 80%, 65%)' });
    };

    img.src = imageUrl;
  });
}
