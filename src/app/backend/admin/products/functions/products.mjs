export const buildProductPayload = (form) => {
  const payload = {
    name: form.name.trim(),
    sku: form.sku.trim() || undefined,
    description: form.description,
    short_description: form.short_description,
  };
  if (form.status) {
    payload.status = form.status;
  }
  if (form.product_type) {
    payload.product_type = form.product_type;
  }
  const basePrice = form.regular_price || form.price;
  if (basePrice !== undefined && basePrice !== '') {
    payload.price = Number(basePrice);
  }
  if (form.sale_price !== undefined && form.sale_price !== '') {
    payload.discount_price = Number(form.sale_price);
  }
  if (Array.isArray(form.category_ids) && form.category_ids.length) {
    payload.category_ids = form.category_ids;
  } else if (Array.isArray(form.categories) && form.categories.length) {
    payload.category_ids = form.categories;
  }
  if (Array.isArray(form.tag_ids) && form.tag_ids.length) {
    payload.tag_ids = form.tag_ids;
  }
  if (Array.isArray(form.brand_ids) && form.brand_ids.length) {
    payload.brand_ids = form.brand_ids;
  }
  if (form.image_id) {
    payload.main_image_id = form.image_id;
  }
  if (Array.isArray(form.image_ids) && form.image_ids.length) {
    payload.image_ids = form.image_ids;
  }
  if (Array.isArray(form.attributes) && form.attributes.length) {
    payload.attributes = form.attributes;
  }
  if (Array.isArray(form.variations) && form.variations.length) {
    payload.variations = form.variations;
  }
  const qtyRaw = form.stock_quantity !== undefined ? form.stock_quantity : '';
  const qty = Number(qtyRaw);
  payload.stock_quantity = Number.isFinite(qty) ? qty : 0;
  return payload;
};

export const createProduct = async ({ form }) => {
  const response = await fetch('/api/admin/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(buildProductPayload(form)),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const message = result?.message || result?.error || 'Unable to save product.';
    throw new Error(message);
  }
  return result?.item || result?.product || result;
};

export const updateProduct = async ({ id, updates }) => {
  const response = await fetch(`/api/admin/products/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(updates),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const message = result?.message || result?.error || 'Unable to update product.';
    throw new Error(message);
  }
  return result?.item || result?.product || result;
};

export const deleteProduct = async ({ id }) => {
  const response = await fetch(`/api/admin/products/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const message = result?.message || result?.error || 'Unable to delete product.';
    throw new Error(message);
  }
  return result;
};

export const fetchProducts = async ({ page = 1, perPage = 8, search = '', status = '' } = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  if (search) {
    params.set('search', search);
  }
  if (status && status !== 'all') {
    params.set('status', status);
  }
  const response = await fetch(`/api/admin/products?${params.toString()}`, {
    credentials: 'include',
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.message || payload?.error || 'Unable to load products.';
    throw new Error(message);
  }
  return payload;
};
