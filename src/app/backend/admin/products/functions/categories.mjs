export const fetchProductCategories = async ({ limit = 500, search = '' } = {}) => {
  const params = new URLSearchParams({
    limit: String(limit),
  });
  if (search) {
    params.set('search', search);
  }
  const response = await fetch(`/api/admin/categories/tree?${params.toString()}`, {
    credentials: 'include',
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.message || payload?.error || 'Unable to load categories.';
    throw new Error(message);
  }
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return { categories: items, frequently_used: [] };
};
