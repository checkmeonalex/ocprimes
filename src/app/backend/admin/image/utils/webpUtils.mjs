const LOSSLESS_WEBP_QUALITY = 0.95;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const createWebpId = () =>
  (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `webp-${crypto.randomUUID()}`
    : `webp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`);

const readFileAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.error) {
        reject(reader.error);
      } else {
        resolve(typeof reader.result === 'string' ? reader.result : '');
      }
    };
    reader.onerror = () => reject(reader.error || new Error('Unable to read the file.'));
    reader.readAsDataURL(file);
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (event) =>
      reject(event?.error || new Error('Unsupported image format. Please try another file.'));
    img.src = src;
  });

const dataURLToBlob = (dataUrl) => {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0]?.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/webp';
  const binary = atob(parts[1] ?? '');
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
};

const canvasToBlob = (canvas, type = 'image/webp', quality = LOSSLESS_WEBP_QUALITY) =>
  new Promise((resolve, reject) => {
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Unable to create a WebP file from the canvas.'));
          }
        },
        type,
        quality,
      );
      return;
    }

    try {
      const dataUrl = canvas.toDataURL(type, quality);
      resolve(dataURLToBlob(dataUrl));
    } catch (error) {
      reject(error);
    }
  });

export const canvasToWebpBlob = (canvas, quality = LOSSLESS_WEBP_QUALITY) =>
  canvasToBlob(canvas, 'image/webp', quality);

export const convertFileToWebpBlob = async (file, quality = LOSSLESS_WEBP_QUALITY) => {
  const dataUrl = await readFileAsDataURL(file);
  const image = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is not available.');
  }
  context.drawImage(image, 0, 0);
  const blob = await canvasToBlob(canvas, 'image/webp', quality);
  return { blob, originalPreview: dataUrl };
};

export const buildWebpFilename = (id = createWebpId()) => {
  const fragment = id.replace(/^webp-/, '');
  return `ocprimes-webp-${fragment}.webp`;
};

export const prepareWebpUpload = async (file, maxBytes = MAX_UPLOAD_BYTES) => {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('Only image files can be uploaded.');
  }
  const { blob } = await convertFileToWebpBlob(file);
  if (blob.size > maxBytes) {
    throw new Error('Converted image exceeds 5MB. Please use a smaller file.');
  }
  const filename = buildWebpFilename();
  const webpFile = new File([blob], filename, { type: 'image/webp' });
  return { webpFile, filename, blob };
};
