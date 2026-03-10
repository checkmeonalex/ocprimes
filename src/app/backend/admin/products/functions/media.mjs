import { prepareWebpUpload } from '../../image/utils/webpUtils.mjs';

const DEFAULT_MEDIA_PAGE_SIZE = 20;

const parseJsonResponse = (raw) => {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const uploadFormData = async ({
  endpoint,
  formData,
  onProgress,
  onStageChange,
  forbiddenMessage,
  fallbackMessage,
} = {}) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint, true);

    if (typeof onStageChange === 'function') onStageChange('uploading');

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || typeof onProgress !== 'function') return;
      const fraction = event.total > 0 ? event.loaded / event.total : 0;
      onProgress(Math.max(0, Math.min(1, fraction)));
    };

    xhr.upload.onload = () => {
      if (typeof onStageChange === 'function') onStageChange('processing');
    };

    xhr.onerror = () => {
      reject(new Error(fallbackMessage));
    };

    xhr.onload = () => {
      const payload = parseJsonResponse(xhr.responseText);
      if (xhr.status < 200 || xhr.status >= 300) {
        const message =
          payload?.message ||
          payload?.error ||
          (xhr.status === 403 ? forbiddenMessage : fallbackMessage);
        reject(new Error(message));
        return;
      }
      if (typeof onProgress === 'function') onProgress(1);
      if (typeof onStageChange === 'function') onStageChange('complete');
      resolve(payload);
    };

    xhr.send(formData);
  });

export const fetchMediaPage = async ({
  page = 1,
  perPage = DEFAULT_MEDIA_PAGE_SIZE,
  filter = 'all',
  staleDays = 180,
  endpoint = '/api/admin/media',
} = {}) => {
  const params = new URLSearchParams({
    per_page: perPage.toString(),
    page: page.toString(),
    filter,
    stale_days: staleDays.toString(),
  });
  const response = await fetch(`${endpoint}?${params.toString()}`);
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

export const uploadMediaFile = async ({
  file,
  productId,
  endpoint = '/api/admin/media/upload',
  onProgress,
  onStageChange,
} = {}) => {
  const { webpFile, filename } = await prepareWebpUpload(file);
  const formData = new FormData();
  formData.append('file', webpFile);
  if (productId) {
    formData.append('product_id', productId);
  }
  const payload = await uploadFormData({
    endpoint,
    formData,
    onProgress,
    onStageChange,
    forbiddenMessage: 'Admin access required to upload images.',
    fallbackMessage: 'Unable to upload image.',
  });
  return {
    id: payload?.id || payload?.key || `${Date.now()}`,
    url: payload?.url || '',
    title: filename,
    unattached: payload?.unattached ?? true,
  };
};

export const uploadProductVideoFile = async ({
  file,
  productId,
  endpoint = '/api/admin/media/video/upload',
  onProgress,
  onStageChange,
} = {}) => {
  const formData = new FormData();
  formData.append('file', file);
  if (productId) {
    formData.append('product_id', productId);
  }
  const payload = await uploadFormData({
    endpoint,
    formData,
    onProgress,
    onStageChange,
    forbiddenMessage: 'Admin access required to upload videos.',
    fallbackMessage: 'Unable to upload video.',
  });
  return {
    id: payload?.id || '',
    key: payload?.key || '',
    url: payload?.url || '',
    title: file?.name || 'Video',
    media_type: 'video',
    productId: payload?.product_id || null,
  };
};
