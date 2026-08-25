import * as SQLite from 'expo-sqlite'

const SCHEMA = `
create table if not exists products (
  id text primary key,
  server_updated_at text,
  local_updated_at text not null,
  is_dirty integer not null default 0,
  data text not null
);

create table if not exists sync_queue (
  id integer primary key autoincrement,
  entity_type text not null,
  entity_id text not null,
  operation text not null,
  payload text,
  created_at text not null,
  attempt_count integer not null default 0,
  last_error text
);

create table if not exists local_id_map (
  local_id text primary key,
  server_id text
);

create index if not exists sync_queue_created_at_idx on sync_queue(created_at);
create index if not exists products_is_dirty_idx on products(is_dirty);
`

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('alxora.db')
      await db.execAsync(SCHEMA)
      return db
    })()
  }
  return dbPromise
}
