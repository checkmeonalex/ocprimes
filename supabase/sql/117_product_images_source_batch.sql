-- Tracks which Alxora Workplace app local batch (see imageStore.js's
-- import_batches concept) a product image was pushed from, so the site's
-- media library can group pushed images by their originating batch the
-- same way the app's Local Library already does — "this batch, N images,
-- copy IDs" becomes visible on the live side too, not just locally.
alter table public.product_images
  add column if not exists source_batch_id text;

create index if not exists product_images_source_batch_id_idx
  on public.product_images(source_batch_id);
