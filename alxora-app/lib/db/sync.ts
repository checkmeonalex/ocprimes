import { getDb } from './index'
import { apiRequest } from '../api'
import { upsertServerProducts } from './products'

type QueueRow = {
  id: number
  entity_type: string
  entity_id: string
  operation: 'create' | 'update' | 'delete'
  payload: string | null
  created_at: string
  attempt_count: number
}

// Resolves a queue entry's entity_id through local_id_map: if it's a
// client-generated temp id ("local_...") that has already been mapped to a
// real server id (because an earlier queued create for it already synced),
// use the real id. Otherwise use the id as-is — either it's already a real
// server id, or it's the create operation itself that will produce the
// mapping.
async function resolveEntityId(db: Awaited<ReturnType<typeof getDb>>, localId: string): Promise<string> {
  if (!localId.startsWith('local_')) return localId
  const row = await db.getFirstAsync<{ server_id: string | null }>(
    'select server_id from local_id_map where local_id = ?',
    [localId],
  )
  return row?.server_id || localId
}

async function processQueueItem(db: Awaited<ReturnType<typeof getDb>>, item: QueueRow): Promise<void> {
  if (item.entity_type !== 'product') return

  if (item.operation === 'create') {
    const payload = item.payload ? JSON.parse(item.payload) : {}
    const result = await apiRequest<{ item: { id: string } }>('/api/admin/products', {
      method: 'POST',
      body: payload,
    })
    const realId = result?.item?.id
    if (!realId) throw new Error('Create did not return a product id.')

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `insert into local_id_map (local_id, server_id) values (?, ?)
         on conflict(local_id) do update set server_id = excluded.server_id`,
        [item.entity_id, realId],
      )
      // Replace the temp-id row with the real one so the UI's list/detail
      // views pick up the real id without a manual refresh.
      const nowIso = new Date().toISOString()
      await db.runAsync('delete from products where id = ?', [item.entity_id])
      await db.runAsync(
        `insert into products (id, server_updated_at, local_updated_at, is_dirty, data)
         values (?, ?, ?, 0, ?)
         on conflict(id) do update set server_updated_at = excluded.server_updated_at,
           local_updated_at = excluded.local_updated_at, is_dirty = 0, data = excluded.data`,
        [realId, nowIso, nowIso, JSON.stringify(result.item)],
      )
    })
    return
  }

  const realId = await resolveEntityId(db, item.entity_id)

  if (item.operation === 'update') {
    const payload = item.payload ? JSON.parse(item.payload) : {}
    const result = await apiRequest<{ item: Record<string, unknown> }>(`/api/admin/products/${realId}`, {
      method: 'PATCH',
      body: payload,
    })
    if (result?.item) {
      await db.runAsync(
        `update products set data = ?, server_updated_at = ?, is_dirty = 0 where id = ?`,
        [JSON.stringify(result.item), new Date().toISOString(), realId],
      )
    }
    return
  }

  if (item.operation === 'delete') {
    await apiRequest(`/api/admin/products/${realId}`, { method: 'DELETE' })
  }
}

export type SyncResult = {
  succeeded: number
  failed: number
}

// Replays the outbox in FIFO order (create before update before delete on
// the same entity, since they were enqueued in that order). Stops
// advancing past the first failure for a given entity so later ops on that
// same entity don't run out of order against a stale server state, but
// keeps processing the rest of the queue for unrelated entities.
export async function runSync(): Promise<SyncResult> {
  const db = await getDb()
  const rows = (await db.getAllAsync('select * from sync_queue order by id asc')) as QueueRow[]

  let succeeded = 0
  let failed = 0
  const failedEntities = new Set<string>()

  for (const row of rows) {
    if (failedEntities.has(row.entity_id)) continue

    try {
      await processQueueItem(db, row)
      await db.runAsync('delete from sync_queue where id = ?', [row.id])
      succeeded += 1
    } catch (error) {
      failed += 1
      failedEntities.add(row.entity_id)
      await db.runAsync(
        'update sync_queue set attempt_count = attempt_count + 1, last_error = ? where id = ?',
        [error instanceof Error ? error.message : String(error), row.id],
      )
    }
  }

  return { succeeded, failed }
}

// Pulls the vendor's current product list from the server and refreshes
// the local cache (skipping any row that still has unsynced local edits —
// see upsertServerProducts). Call this after a successful runSync(), or on
// app foreground/reconnect, to keep the offline cache fresh.
export async function pullProducts(): Promise<void> {
  const result = await apiRequest<{ items: Array<Record<string, unknown>> }>('/api/admin/products?per_page=100')
  await upsertServerProducts(result?.items || [])
}
