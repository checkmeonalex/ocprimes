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

  const categories = (Array.isArray(allCategories) ? allCategories : [])
    .filter((c) => !c.parent_id)
    .slice(0, 12)
    .map((c) => ({ name: c.name, slug: c.slug }));

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
