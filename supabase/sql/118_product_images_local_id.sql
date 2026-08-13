-- Stores the Alxora Workplace app's own short image id (e.g. IMG-8F42K91,
-- see imageStore.js's generateImageId) alongside the site's own uuid
-- primary key. The uuid stays the real primary key everywhere (PATCH/
-- DELETE by id, etc.) — this column exists purely so "Copy IDs" traces
-- the same id end-to-end, from local pick/scrape through to the live
-- store, instead of local and site showing two unrelated ids.
alter table public.product_images
  add column if not exists local_image_id text;

create index if not exists product_images_local_image_id_idx
  on public.product_images(local_image_id);
