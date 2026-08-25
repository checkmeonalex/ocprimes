-- Lets an admin mark one image within an upload batch (product_images.
-- source_batch_id, see 117_product_images_source_batch.sql) as the "main"
-- image for that batch. Purely a labeling flag for the admin Library UI —
-- when copying a batch's ids, the main image's line gets " (main)"
-- appended so the recipient knows which image to treat as primary.
alter table public.product_images
  add column if not exists is_batch_main boolean not null default false;

-- Only one main image per batch: partial unique index so a batch can have
-- zero or one row with is_batch_main = true, but never two.
create unique index if not exists product_images_batch_main_uidx
  on public.product_images(source_batch_id)
  where is_batch_main and source_batch_id is not null;
