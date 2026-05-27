const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export const FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'In stock', value: 'in_stock' },
  { label: 'Out of stock', value: 'out_of_stock' },
  { label: 'Low stock', value: 'low_stock' },
];

export const SORT_OPTIONS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Name (A-Z)', value: 'name_asc' },
  { label: 'Name (Z-A)', value: 'name_desc' },
  { label: 'Price (Low → High)', value: 'price_asc' },
  { label: 'Price (High → Low)', value: 'price_desc' },
  { label: 'Stock (Low → High)', value: 'stock_asc' },
  { label: 'Stock (High → Low)', value: 'stock_desc' },
];

export const applyProductFilters = (items, filterValue, lowStockThreshold = 5) => {
  if (!Array.isArray(items)) return [];
  if (!filterValue || filterValue === 'all') return items;
  return items.filter((product) => {
    const stockStatus = product?.stock_status || '';
    const stockQty = toNumber(product?.stock_quantity);
    if (filterValue === 'in_stock') {
      return stockStatus === 'instock' || stockQty > 0;
    }
    if (filterValue === 'out_of_stock') {
      return stockStatus === 'outofstock' || stockQty === 0;
    }
    if (filterValue === 'low_stock') {
      return stockQty > 0 && stockQty <= lowStockThreshold;
    }
    return true;
  });
};

export const applyProductSort = (items, sortValue) => {
  if (!Array.isArray(items)) return [];
  const next = [...items];
  switch (sortValue) {
    case 'name_asc':
      return next.sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
    case 'name_desc':
      return next.sort((a, b) => (b?.name || '').localeCompare(a?.name || ''));
    case 'price_asc':
      return next.sort((a, b) => toNumber(a?.price) - toNumber(b?.price));
    case 'price_desc':
      return next.sort((a, b) => toNumber(b?.price) - toNumber(a?.price));
    case 'stock_asc':
      return next.sort((a, b) => toNumber(a?.stock_quantity) - toNumber(b?.stock_quantity));
    case 'stock_desc':
      return next.sort((a, b) => toNumber(b?.stock_quantity) - toNumber(a?.stock_quantity));
    case 'newest':
    default:
      return next;
  }
};
