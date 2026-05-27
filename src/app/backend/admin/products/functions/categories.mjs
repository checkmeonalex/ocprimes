const flattenCategoryTree = (nodes, parentId = null) => {
  const source = Array.isArray(nodes) ? nodes : [];
  const flattened = [];

  source.forEach((node) => {
    if (!node) return;

    const normalizedNode = {
      ...node,
      parent_id: node.parent_id ?? parentId ?? null,
    };

    flattened.push(normalizedNode);

    if (Array.isArray(node.children) && node.children.length) {
      flattened.push(...flattenCategoryTree(node.children, normalizedNode.id));
    }
  });

  return flattened;
};

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
  return { categories: flattenCategoryTree(items), frequently_used: [] };
};
