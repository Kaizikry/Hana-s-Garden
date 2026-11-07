const MAX_WIDTH = 800;
const MAX_HEIGHT = 1000;
const JPEG_QUALITY = 0.82;

export function fitWithin(width: number, height: number, maxW = MAX_WIDTH, maxH = MAX_HEIGHT) {
  const scale = Math.min(1, maxW / width, maxH / height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Resizes a picked photo in the browser so uploads stay under Apps Script's payload limits. */
export async function compressImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Foto ini tidak dapat dibuka. Cuba fail JPG atau PNG."));
      el.src = url;
    });

    const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    // JPEG has no transparency, so transparent PNGs would otherwise turn black.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(url);
  }
}
