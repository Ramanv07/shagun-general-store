/**
 * Client-side image resize utility.
 * Reduces image dimensions to a maximum of 1600px and compresses to ~0.8 quality
 * before uploading to server, adhering to Vercel/serverless 4 MB payload boundaries.
 */
export async function resizeImage(file: File, maxDim = 1600, quality = 0.8): Promise<File> {
  // If not an image or already very small (< 300KB), return as is
  if (!file.type.startsWith('image/') || file.size < 300 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        } else if (file.size < 2 * 1024 * 1024) {
          // No resize needed and under 2MB
          return resolve(file);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);

        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            const resizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, mimeType === 'image/jpeg' ? '.jpg' : '.png'), {
              type: mimeType,
              lastModified: Date.now()
            });
            resolve(resizedFile);
          },
          mimeType,
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

