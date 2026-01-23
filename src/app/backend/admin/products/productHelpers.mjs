const decodeHtmlEntities = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  const input = String(value);
  if (typeof window !== 'undefined' && window.document) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = input;
    return textarea.value;
  }
  const namedEntities = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    euro: String.fromCodePoint(8364),
    pound: String.fromCodePoint(163),
    yen: String.fromCodePoint(165),
  };
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);/gi, (_, name) => namedEntities[name] || `&${name};`);
};

export const formatPrice = (price, currencySymbol = '') => {
  if (price === null || price === undefined || price === '') {
    return '--';
  }
  const number = Number(price);
  if (!Number.isFinite(number)) {
    const fallbackSymbol = decodeHtmlEntities(currencySymbol);
    return `${fallbackSymbol}${price}`;
  }
  const formatted = number.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const symbol = decodeHtmlEntities(currencySymbol) || '$';
  return `${symbol}${formatted}`;
};

export const getPrimaryImage = (product) => {
  if (!product) {
    return '';
  }
  if (product.image && typeof product.image === 'string') {
    return product.image;
  }
  if (product.image_url) {
    return product.image_url;
  }
  if (product.featured_image) {
    return product.featured_image;
  }
  if (product.image && typeof product.image === 'object') {
    return product.image.src || product.image.url || '';
  }
  const images = Array.isArray(product.images)
    ? product.images
    : product.images && typeof product.images === 'object'
      ? Object.values(product.images)
      : [];
  if (!images.length) {
    return '';
  }
  const first = images[0];
  return first?.src || first?.url || '';
};

export const getCategoryLabel = (product) => {
  if (!product || !Array.isArray(product.categories) || !product.categories.length) {
    return 'Uncategorized';
  }
  return product.categories[0]?.name || 'Uncategorized';
};

export const getStockMeta = (product, lowStockThreshold = 3) => {
  const stockStatus = product?.stock_status || '';
  const quantityRaw = product?.stock_quantity;
  const quantity = Number(quantityRaw);
  const hasQuantity = Number.isFinite(quantity);

  if (stockStatus === 'outofstock') {
    return {
      label: 'Out of stock',
      tone: 'bg-rose-50 text-rose-600',
      inventoryLabel: hasQuantity ? `${quantity}` : '--',
    };
  }

  if (hasQuantity && quantity <= lowStockThreshold) {
    return {
      label: 'Low stock',
      tone: 'bg-amber-50 text-amber-700',
      inventoryLabel: `${quantity}`,
    };
  }

  return {
    label: 'In stock',
    tone: 'bg-emerald-50 text-emerald-700',
    inventoryLabel: hasQuantity ? `${quantity}` : '--',
  };
};

export const getProductStatusBadge = (status) => {
  switch (status) {
    case 'publish':
      return { label: 'Active', tone: 'bg-emerald-50 text-emerald-700' };
    case 'draft':
      return { label: 'Draft', tone: 'bg-slate-100 text-slate-500' };
    case 'archived':
      return { label: 'Archived', tone: 'bg-rose-50 text-rose-500' };
    case 'private':
      return { label: 'Private', tone: 'bg-slate-100 text-slate-500' };
    default:
      return { label: 'Active', tone: 'bg-emerald-50 text-emerald-700' };
  }
};
