const formatCount = (value) => {
  if (value === null || value === undefined || value === '') return '--';
  const num = Number(value);
  if (!Number.isFinite(num)) return '--';
  return num.toLocaleString();
};

const formatPrice = (value, currencySymbol = '$') => {
  if (value === null || value === undefined || value === '') return '--';
  const num = Number(value);
  if (!Number.isFinite(num)) return '--';
  return `${currencySymbol}${num.toLocaleString()}`;
};

const buildSparkPoints = (series, width = 120, height = 36) => {
  if (!Array.isArray(series) || !series.length) {
    const mid = height / 2;
    return `0,${mid} ${width},${mid}`;
  }
  const values = series.map((value) =>
    Number.isFinite(Number(value)) ? Number(value) : 0
  );
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  return values
    .map((value, index) => {
      const x = step * index;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
};

const normalizeArray = (value, fallback) =>
  Array.isArray(value) ? value : Array.isArray(fallback) ? fallback : [];

const normalizeProductListingData = (data, fallback) => {
  const safeData = data && typeof data === 'object' ? data : {};
  const safeFallback = fallback && typeof fallback === 'object' ? fallback : {};
  return {
    header: { ...(safeFallback.header || {}), ...(safeData.header || {}) },
    overviewCards: normalizeArray(
      safeData.overviewCards,
      safeFallback.overviewCards
    ),
    statusTabs: normalizeArray(safeData.statusTabs, safeFallback.statusTabs),
    filterOptions: normalizeArray(
      safeData.filterOptions,
      safeFallback.filterOptions
    ),
    sortOptions: normalizeArray(safeData.sortOptions, safeFallback.sortOptions),
    products: normalizeArray(safeData.products, safeFallback.products),
    pagination: {
      ...(safeFallback.pagination || {}),
      ...(safeData.pagination || {}),
    },
    notices: { ...(safeFallback.notices || {}), ...(safeData.notices || {}) },
    promotedProducts: normalizeArray(
      safeData.promotedProducts,
      safeFallback.promotedProducts
    ),
    recentSoldProducts: normalizeArray(
      safeData.recentSoldProducts,
      safeFallback.recentSoldProducts
    ),
    reviews: normalizeArray(safeData.reviews, safeFallback.reviews),
  };
};

export { buildSparkPoints, formatCount, formatPrice, normalizeProductListingData };
