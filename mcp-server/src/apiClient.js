const BASE_URL = (process.env.OCPRIMES_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
const TOKEN = process.env.MCP_ADMIN_API_TOKEN

if (!TOKEN) {
  throw new Error('MCP_ADMIN_API_TOKEN is not set. The MCP server cannot authenticate to the admin API.')
}

export async function adminApiRequest(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  let payload
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = { raw: text }
  }

  if (!response.ok) {
    const message = payload?.error || `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return payload
}

export async function adminApiUpload(path, formData) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
    body: formData,
  })

  const text = await response.text()
  let payload
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = { raw: text }
  }

  if (!response.ok) {
    const message = payload?.error || `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return payload
}
