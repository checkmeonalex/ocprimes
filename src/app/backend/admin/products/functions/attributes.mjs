export const fetchProductAttributes = async () => {
  const response = await fetch('/api/admin/attributes?per_page=50&include_options=true', {
    credentials: 'include',
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.message || payload?.error || 'Unable to load attributes.';
    throw new Error(message);
  }
  return payload || {};
};
