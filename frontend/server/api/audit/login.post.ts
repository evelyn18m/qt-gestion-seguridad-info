export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const backendUrl = process.env.BACKEND_URL || 'http://backend:3001'

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Forward authorization header
  const authHeader = getHeader(event, 'authorization')
  if (authHeader) {
    headers['authorization'] = authHeader
  }

  // Forward user-agent
  const userAgent = getHeader(event, 'user-agent')
  if (userAgent) {
    headers['user-agent'] = userAgent
  }

  // Forward client IP
  const forwardedFor = getHeader(event, 'x-forwarded-for')
  if (forwardedFor) {
    headers['x-forwarded-for'] = forwardedFor
  }

  try {
    const response = await $fetch(`${backendUrl}/audit/login`, {
      method: 'POST',
      headers,
      body,
    })
    return response
  } catch (e: any) {
    // Fire-and-forget: do not expose errors to the frontend
    console.error('[audit-proxy] login event failed:', e?.message ?? e)
    return { ok: true }
  }
})
