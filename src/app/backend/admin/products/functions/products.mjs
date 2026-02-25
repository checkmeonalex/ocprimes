const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CONDITION_VALUES = new Set([
  'brand_new',
  'like_new',
  'open_box',
  'refurbished',
  'handmade',
  'okx',
]);

const PACKAGING_VALUES = new Set([
  'in_wrap_nylon',
  'in_a_box',
  'premium_gift_packaging',
  'cardboard_wrap',
]);

const RETURN_POLICY_VALUES = new Set(['not_returnable', 'support_return']);

const normalizeEnumValue = (value, allowedValues) => {
  if (typeof value !== 'string') return '';
  const normalized = value.trim();
  if (!normalized) return '';
  return allowedValues.has(normalized) ? normalized : '';
};

const normalizeUuid = (value) => {
  if (typeof value !== 'string') return '';
  const normalized = value.trim();
  if (!normalized) return '';
  return UUID_PATTERN.test(normalized) ? normalized : '';
};

const normalizeUuidArray = (value) => {
  if (!Array.isArray(value)) return null;
  const seen = new Set();
  const next = [];
  value.forEach((item) => {
    const normalized = normalizeUuid(String(item ?? ''));
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    next.push(normalized);
  });
  return next;
};

const normalizeVariations = (value) => {
  if (!Array.isArray(value) || !value.length) return null;
  return value.map((variation) => {
    const safeVariation = { ...variation };
    if (safeVariation && 'image_id' in safeVariation) {
      const imageId = normalizeUuid(String(safeVariation.image_id ?? ''));
      safeVariation.image_id = imageId || undefined;
    }
    return safeVariation;
  });
};

export const buildProductPayload = (form, options = {}) => {
  const mode = options?.mode === 'update' ? 'update' : 'create';
  const payload = {
    name: form.name.trim(),
    description: form.description,
    short_description: form.short_description,
  };
  const sku = typeof form.sku === 'string' ? form.sku.trim() : '';
  if (sku) {
    payload.sku = sku;
  } else if (mode === 'create') {
    payload.sku = undefined;
  }
  const conditionCheck = normalizeEnumValue(form.condition_check, CONDITION_VALUES);
  if (conditionCheck) {
    payload.condition_check = conditionCheck;
  }
  const packagingStyle = normalizeEnumValue(form.packaging_style, PACKAGING_VALUES);
  if (packagingStyle) {
    payload.packaging_style = packagingStyle;
  }
  const returnPolicy = normalizeEnumValue(form.return_policy, RETURN_POLICY_VALUES);
  if (returnPolicy) {
    payload.return_policy = returnPolicy;
  }
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
  const categoryIds =
    normalizeUuidArray(form.category_ids) ?? normalizeUuidArray(form.categories);
  if (Array.isArray(categoryIds) && (categoryIds.length || mode === 'create')) {
    payload.category_ids = categoryIds;
  }
  const pendingCategoryRequestIds = normalizeUuidArray(form.pending_category_request_ids);
  if (Array.isArray(pendingCategoryRequestIds) && pendingCategoryRequestIds.length) {
    payload.pending_category_request_ids = pendingCategoryRequestIds;
  }
  const tagIds = normalizeUuidArray(form.tag_ids);
  if (Array.isArray(tagIds) && tagIds.length) {
    payload.tag_ids = tagIds;
  }
  const brandIds = normalizeUuidArray(form.brand_ids);
  if (Array.isArray(brandIds) && brandIds.length) {
    payload.brand_ids = brandIds;
  }
  const mainImageId = normalizeUuid(String(form.image_id ?? ''));
  if (mainImageId) {
    payload.main_image_id = mainImageId;
  } else if (mode === 'create') {
    payload.main_image_id = undefined;
  }
  const imageIds = normalizeUuidArray(form.image_ids);
  if (Array.isArray(imageIds) && imageIds.length) {
    payload.image_ids = imageIds;
  }
  if (Array.isArray(form.attributes) && form.attributes.length) {
    payload.attributes = form.attributes;
  }
  const variations = normalizeVariations(form.variations);
  if (Array.isArray(variations) && variations.length) {
    payload.variations = variations;
  }
  const qtyRaw = form.stock_quantity !== undefined ? form.stock_quantity : '';
  const qty = Number(qtyRaw);
  payload.stock_quantity = Number.isFinite(qty) ? qty : 0;
  return payload;
};

const resolveApiErrorMessage = (result, fallback) => {
  const base = result?.message || result?.error || fallback;
  const firstIssue = Array.isArray(result?.validation?.issues) ? result.validation.issues[0] : null;
  if (!firstIssue?.message) return base;
  const path = firstIssue.path ? `${firstIssue.path}: ` : '';
  return `${base} ${path}${firstIssue.message}`;
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
    const message = resolveApiErrorMessage(result, 'Unable to save product.');
    throw new Error(message);
  }
  const item = result?.item || result?.product || result;
  if (item && result?.publish_meta && typeof item === 'object') {
    return { ...item, __publishMeta: result.publish_meta };
  }
  return item;
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
    const message = resolveApiErrorMessage(result, 'Unable to update product.');
    throw new Error(message);
  }
  const item = result?.item || result?.product || result;
  if (item && result?.publish_meta && typeof item === 'object') {
    return { ...item, __publishMeta: result.publish_meta };
  }
  return item;
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
