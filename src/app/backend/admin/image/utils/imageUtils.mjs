export const toSafeName = (value) => {
  const trimmed = value.trim().toLowerCase();
  const cleaned = trimmed.replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned || 'image-edit';
};

export const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read image.'));
    reader.readAsDataURL(blob);
  });
