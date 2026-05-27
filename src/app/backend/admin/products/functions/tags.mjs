export const fetchProductTags = async ({ page = 1, perPage = 50, search = '' } = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  if (search) {
    params.set('search', search);
  }
  const response = await fetch(`/api/admin/tags?${params.toString()}`, {
    credentials: 'include',
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.message || payload?.error || 'Unable to load tags.';
    throw new Error(message);
  }
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return {
    tags: items,
    page: Number(payload?.page || page) || 1,
    pages: Number(payload?.pages || 1) || 1,
    totalCount: Number(payload?.total_count || 0) || 0,
  };
};

export const createProductTag = async ({ name }) => {
  const response = await fetch('/api/admin/tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.message || payload?.error || 'Unable to create tag.';
    throw new Error(message);
  }
  return payload?.item || null;
};
