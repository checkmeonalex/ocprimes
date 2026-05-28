import { getCachedTopCategories } from '@/lib/catalog/top-categories-server';
import { fetchAllVendors } from '@/lib/catalog/brands';
import { fetchProductListingPayload } from '@/lib/catalog/product-listing';
import VendorBrowseSectionClient from './VendorBrowseSectionClient';

const INITIAL_PER_VENDOR = 20;

export default async function VendorBrowseSection() {
  const [allCategories, vendors] = await Promise.all([
    getCachedTopCategories(),
    fetchAllVendors(),
  ]);

  const rootCategories = (Array.isArray(allCategories) ? allCategories : [])
    .slice(0, 12)
    .map((c) => ({ name: c.name, slug: c.slug }));

  // If root categories are fewer than 5, use child categories instead
  let categories = rootCategories;
  if (rootCategories.length < 5) {
    const childCats = [];
    for (const root of Array.isArray(allCategories) ? allCategories : []) {
      const items = root.subcategories?.[0]?.items ?? [];
      for (const child of items) {
        if (child.name && child.slug) {
          childCats.push({ name: child.name, slug: child.slug });
        }
      }
    }
    if (childCats.length > 0) {
      categories = childCats.slice(0, 12);
    }
  }

  // Fetch initial products for each vendor (5 each), plus total count
  const vendorRows = (
    await Promise.all(
      vendors.map(async (vendor) => {
        try {
          const result = await fetchProductListingPayload({
            vendor: vendor.slug,
            page: 1,
            perPage: INITIAL_PER_VENDOR,
            fields: 'card',
          });
          const items = Array.isArray(result.items) ? result.items : [];
          if (!items.length) return null;
          return {
            vendor,
            products: items,
            totalCount: Math.max(items.length, Number(result.totalCount) || items.length),
          };
        } catch {
          return null;
        }
      })
    )
  ).filter(Boolean);

  return (
    <VendorBrowseSectionClient
      categories={categories}
      vendorRows={vendorRows}
    />
  );
}
