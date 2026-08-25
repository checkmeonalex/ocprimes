import { getDb } from './index'
import { randomUUID } from 'expo-crypto'

export type LocalProduct = {
  id: string
  server_updated_at: string | null
  local_updated_at: string
  is_dirty: boolean
  data: Record<string, unknown>
}

const rowToProduct = (row: any): LocalProduct => ({
  id: row.id,
  server_updated_at: row.server_updated_at,
  local_updated_at: row.local_updated_at,
  is_dirty: Boolean(row.is_dirty),
  data: JSON.parse(row.data),
})

export async function listLocalProducts(): Promise<LocalProduct[]> {
  const db = await getDb()
  const rows = await db.getAllAsync('select * from products order by local_updated_at desc')
  return rows.map(rowToProduct)
}

export async function getLocalProduct(id: string): Promise<LocalProduct | null> {
  const db = await getDb()
  const row = await db.getFirstAsync('select * from products where id = ?', [id])
  return row ? rowToProduct(row) : null
}

// Overwrites the local cache with a fresh page of server data. Never
// touches rows that are still dirty (unsynced local edits) — those stay
// authoritative locally until their queued mutation confirms, so a pull
// mid-sync can't clobber an in-flight offline edit.
export async function upsertServerProducts(items: Array<Record<string, unknown>>): Promise<void> {
  const db = await getDb()
  const now = new Date().toISOString()
  await db.withTransactionAsync(async () => {
    for (const item of items) {
      const id = String(item.id)
      const existing = await db.getFirstAsync<{ is_dirty: number }>(
        'select is_dirty from products where id = ?',
        [id],
      )
      if (existing?.is_dirty) continue
      await db.runAsync(
        `insert into products (id, server_updated_at, local_updated_at, is_dirty, data)
         values (?, ?, ?, 0, ?)
         on conflict(id) do update set server_updated_at = excluded.server_updated_at,
           local_updated_at = excluded.local_updated_at, is_dirty = 0, data = excluded.data`,
        [id, String(item.updated_at || now), now, JSON.stringify(item)],
      )
    }
  })
}

// Creates a product locally with a temporary client-generated id, marks it
// dirty, and enqueues the create. Returns the temp id so the UI can
// navigate straight to it — it resolves to the real server id once synced
// (see local_id_map / resolveEntityId in sync.ts).
export async function createLocalProduct(payload: Record<string, unknown>): Promise<string> {
  const db = await getDb()
  const tempId = `local_${randomUUID()}`
  const now = new Date().toISOString()
  const fullData = { ...payload, id: tempId }

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `insert into products (id, server_updated_at, local_updated_at, is_dirty, data)
       values (?, null, ?, 1, ?)`,
      [tempId, now, JSON.stringify(fullData)],
    )
    await db.runAsync(
      `insert into sync_queue (entity_type, entity_id, operation, payload, created_at)
       values ('product', ?, 'create', ?, ?)`,
      [tempId, JSON.stringify(payload), now],
    )
  })

  return tempId
}

export async function updateLocalProduct(id: string, patch: Record<string, unknown>): Promise<void> {
  const db = await getDb()
  const now = new Date().toISOString()
  const existing = await getLocalProduct(id)
  if (!existing) throw new Error(`Product ${id} not found locally.`)

  const nextData = { ...existing.data, ...patch }

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `update products set data = ?, local_updated_at = ?, is_dirty = 1 where id = ?`,
      [JSON.stringify(nextData), now, id],
    )
    await db.runAsync(
      `insert into sync_queue (entity_type, entity_id, operation, payload, created_at)
       values ('product', ?, 'update', ?, ?)`,
      [id, JSON.stringify(patch), now],
    )
  })
}

export async function deleteLocalProduct(id: string): Promise<void> {
  const db = await getDb()
  const now = new Date().toISOString()

  await db.withTransactionAsync(async () => {
    await db.runAsync('delete from products where id = ?', [id])
    await db.runAsync(
      `insert into sync_queue (entity_type, entity_id, operation, payload, created_at)
       values ('product', ?, 'delete', null, ?)`,
      [id, now],
    )
  })
}

export async function countPendingSync(): Promise<number> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ count: number }>('select count(*) as count from sync_queue')
  return row?.count ?? 0
}
