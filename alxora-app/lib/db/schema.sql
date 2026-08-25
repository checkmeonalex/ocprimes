-- Local on-device SQLite schema (expo-sqlite). Mirrors just enough of the
-- server's shape to browse/edit offline; the source of truth is always the
-- Supabase-backed REST API — this is a cache + outbox, not a second
-- database with its own identity.
--
-- products: a local cache of the vendor's own product rows, refreshed on
-- every successful sync pull. Editing while offline updates this row
-- in place (optimistic) and enqueues the same change in sync_queue.
create table if not exists products (
  id text primary key,
  server_updated_at text,
  local_updated_at text not null,
  is_dirty integer not null default 0,
  data text not null -- full product JSON, same shape as /api/admin/products
);

-- sync_queue: an ordered outbox of pending mutations made while offline (or
-- made online but not yet confirmed). Replayed in id order (FIFO) once
-- connectivity returns, so create-then-update-then-delete on the same
-- local id plays back correctly. entity_id is the LOCAL id at enqueue time;
-- for a create, that's a client-generated UUID that becomes the real id
-- once the server accepts it (see local_id_map).
create table if not exists sync_queue (
  id integer primary key autoincrement,
  entity_type text not null, -- 'product', etc.
  entity_id text not null,
  operation text not null, -- 'create' | 'update' | 'delete'
  payload text, -- JSON body for create/update; null for delete
  created_at text not null,
  attempt_count integer not null default 0,
  last_error text
);

-- local_id_map: when a product is created offline, it's given a temporary
-- client-generated UUID so the UI has something to reference immediately.
-- Once the create syncs, the server returns the real id — this table lets
-- any other queued ops referencing the temp id (e.g. a later offline edit
-- to the same not-yet-synced product) resolve to the real id at replay
-- time.
create table if not exists local_id_map (
  local_id text primary key,
  server_id text
);

create index if not exists sync_queue_created_at_idx on sync_queue(created_at);
create index if not exists products_is_dirty_idx on products(is_dirty);
