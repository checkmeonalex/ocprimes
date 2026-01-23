import { prepareWebpUpload } from '../../image/utils/webpUtils.mjs';

const DEFAULT_MEDIA_PAGE_SIZE = 20;

export const fetchMediaPage = async ({
  page = 1,
  perPage = DEFAULT_MEDIA_PAGE_SIZE,
  filter = 'all',
  staleDays = 180,
} = {}) => {
  const params = new URLSearchParams({
    per_page: perPage.toString(),
    page: page.toString(),
    filter,
    stale_days: staleDays.toString(),
  });
  const response = await fetch(`/api/admin/media?${params.toString()}`);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload?.error ||
      payload?.message ||
      (response.status === 403 ? 'Admin access required to load images.' : 'Unable to load images.');
    throw new Error(message);
  }
  return payload;
};

export const uploadMediaFile = async ({ file, productId } = {}) => {
  const { webpFile, filename } = await prepareWebpUpload(file);
  const formData = new FormData();
  formData.append('file', webpFile);
  if (productId) {
    formData.append('product_id', productId);
  }
  const response = await fetch('/api/admin/media/upload', {
    method: 'POST',
    body: formData,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      (response.status === 403 ? 'Admin access required to upload images.' : 'Unable to upload image.');
    throw new Error(message);
  }
  return {
    id: payload?.id || payload?.key || `${Date.now()}`,
    url: payload?.url || '',
    title: filename,
    unattached: payload?.unattached ?? true,
  };
};
