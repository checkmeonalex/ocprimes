import { fetchConnector } from '../../../../../utils/connector';

export const fetchSizeGuides = async ({ siteId, token }) => {
  if (!siteId) {
    throw new Error('Missing site ID.');
  }
  const response = await fetchConnector(`/sites/${siteId}/size-guides`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.message || payload?.error || 'Unable to load size guides.';
    throw new Error(message);
  }
  return payload || {};
};

export const createSizeGuide = async ({ siteId, token, id, title, content, general_info, category_ids }) => {
  if (!siteId) {
    throw new Error('Missing site ID.');
  }
  const response = await fetchConnector(`/sites/${siteId}/size-guides`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: id || undefined,
      title,
      content,
      general_info,
      category_ids,
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.message || payload?.error || 'Unable to save size guide.';
    throw new Error(message);
  }
  return payload || {};
};

export const deleteSizeGuide = async ({ siteId, token, id }) => {
  if (!siteId) {
    throw new Error('Missing site ID.');
  }
  if (!id) {
    throw new Error('Missing size guide ID.');
  }
  const response = await fetchConnector(`/sites/${siteId}/size-guides/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.message || payload?.error || 'Unable to delete size guide.';
    throw new Error(message);
  }
  return payload || {};
};
