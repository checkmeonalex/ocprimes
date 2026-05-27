import { fetchConnector } from '@/utils/connector.mjs';

export const fetchFeaturedProducts = async ({ siteId, token }) => {
  const response = await fetchConnector(`/sites/${siteId}/featured-products`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const message = result?.error || 'Unable to load featured products.';
    throw new Error(message);
  }
  const items = Array.isArray(result?.items) ? result.items : [];
  return {
    items,
    limit: Number.isFinite(Number(result?.limit)) ? Number(result.limit) : 5,
  };
};

export const updateFeaturedProduct = async ({ siteId, token, productId, featured }) => {
  const response = await fetchConnector(`/sites/${siteId}/featured-products`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ product_id: productId, featured }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const message = result?.error || 'Unable to update featured products.';
    throw new Error(message);
  }
  const items = Array.isArray(result?.items) ? result.items : [];
  return {
    items,
    limit: Number.isFinite(Number(result?.limit)) ? Number(result.limit) : 5,
  };
};
