export const fetchCategoryRequests = async ({
  page = 1,
  perPage = 50,
  status = '',
  search = '',
} = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  if (status) params.set('status', status);
  if (search) params.set('search', search);

  const response = await fetch(`/api/admin/categories/requests?${params.toString()}`, {
    credentials: 'include',
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.message || payload?.error || 'Unable to load category requests.';
    throw new Error(message);
  }
  return {
    items: Array.isArray(payload?.items) ? payload.items : [],
    permissions: payload?.permissions || { can_create_request: false, can_review_request: false },
  };
};

export const createCategoryRequest = async ({ name, parent_id, product_id } = {}) => {
  const response = await fetch('/api/admin/categories/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      name,
      parent_id: parent_id || null,
      product_id: product_id || undefined,
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.message || payload?.error || 'Unable to submit category request.';
    throw new Error(message);
  }
  return payload || {};
};

