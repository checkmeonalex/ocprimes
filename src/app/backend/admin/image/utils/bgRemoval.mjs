const API_BASE_URL = process.env.REACT_APP_API_BASE_URL ?? 'http://127.0.0.1:8000';

export const removeBackgroundFromBlob = async ({ blob, filename = 'image.png' }) => {
  if (!blob) {
    throw new Error('Missing image data.');
  }

  const file = blob instanceof File ? blob : new File([blob], filename, {
    type: blob.type || 'image/png',
  });

  const body = new FormData();
  body.append('file', file);

  const response = await fetch(`${API_BASE_URL}/remove-bg`, {
    method: 'POST',
    body,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail ?? 'Background removal failed. Please try again.');
  }

  return response.blob();
};
