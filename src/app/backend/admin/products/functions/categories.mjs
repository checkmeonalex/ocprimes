export const fetchProductCategories = async ({ page = 1, perPage = 50, search = '' } = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  if (search) {
    params.set('search', search);
  }
  const response = await fetch(`/api/admin/categories?${params.toString()}`, {
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
