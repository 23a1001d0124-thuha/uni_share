/**
 * Utility to compress and scale down image data URLs.
 * High-megapixel mobile phone camera photos can be extremely large (5MB - 12MB+).
 * This function scales the image down to reasonable dimensions (max 1000px)
 * and recompresses it as a JPEG (0.8 quality), yielding a compact base64 under 300KB
 * which works flawlessly with Express payload limits and Gemini API requests.
 */
export function compressAndResizeImage(
  dataUrl: string,
  maxWidth = 600,
  maxHeight = 600,
  quality = 0.5
): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith("data:image")) {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Only resize if it exceeds max bounds
      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // Output compressed JPEG
        const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedBase64);
      } else {
        resolve(dataUrl);
      }
    };

    img.onerror = (err) => {
      console.warn("Could not load image for local canvas compression, reverting to raw:", err);
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
}
