type CategoryInterestDashboardInput = {
  currentStart: Date
  currentEnd: Date
  previousStart: Date
  previousEnd: Date
}

const toSafeText = (value: unknown) => String(value || '').trim()
const toSafeNumber = (value: unknown) => {
  const next = Number(value)
  return Number.isFinite(next) ? next : 0
}

const normalizeTopCategories = (value: unknown) => {
  if (!Array.isArray(value)) return []
  return value.map((entry) => ({
    categoryId: toSafeText(entry?.category_id),
    categoryName: toSafeText(entry?.category_name) || 'Category',
    categorySlug: toSafeText(entry?.category_slug) || null,
    totalInterested: toSafeNumber(entry?.total_interested),
    newInterested: toSafeNumber(entry?.new_interested),
  }))
}

export async function loadCategoryInterestDashboardStats(
  adminDb: any,
  input: CategoryInterestDashboardInput,
) {
  const { data, error } = await adminDb.rpc('get_category_interest_dashboard_stats', {
    p_current_start: input.currentStart.toISOString(),
    p_current_end: input.currentEnd.toISOString(),
    p_previous_start: input.previousStart.toISOString(),
    p_previous_end: input.previousEnd.toISOString(),
  })

  if (error) {
    console.error('category interest dashboard stats failed:', error.message)
    return null
  }

  const payload =
    Array.isArray(data) && data.length > 0
      ? data[0]
      : data && typeof data === 'object'
        ? data
        : null

  if (!payload) {
    return {
      totalInterested: 0,
      newInterested: 0,
      previousInterested: 0,
      categoriesTracked: 0,
      topCategories: [],
    }
  }

  return {
    totalInterested: toSafeNumber(payload.total_interested),
    newInterested: toSafeNumber(payload.new_interested),
    previousInterested: toSafeNumber(payload.previous_interested),
    categoriesTracked: toSafeNumber(payload.categories_tracked),
    topCategories: normalizeTopCategories(payload.top_categories),
  }
}
