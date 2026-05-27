import { fetchConnector } from '../../../../../utils/connector';

export const fetchProductTaxonomies = async ({ siteId, token }) => {
  if (!siteId) {
    throw new Error('Missing site ID.');
  }
  const response = await fetchConnector(`/sites/${siteId}/taxonomies`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.message || payload?.error || 'Unable to load taxonomies.';
    throw new Error(message);
  }
  return payload || {};
};
