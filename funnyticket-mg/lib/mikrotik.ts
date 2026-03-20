// MikroTik RouterOS REST API client (RouterOS 7+)

const MIKROTIK_URL = process.env.MIKROTIK_API_URL
const MIKROTIK_USER = process.env.MIKROTIK_API_USER
const MIKROTIK_PASS = process.env.MIKROTIK_API_PASSWORD

function getAuthHeader(): string {
  return 'Basic ' + Buffer.from(`${MIKROTIK_USER}:${MIKROTIK_PASS}`).toString('base64')
}

export interface HotspotSessionInfo {
  isOnline: boolean
  uptime?: string
  uptimeSeconds?: number
  address?: string
  bytesIn?: number
  bytesOut?: number
}

// ── In-memory cache for all active sessions (1 request per 30s max) ──

interface ActiveSessionsCache {
  data: Map<string, HotspotSessionInfo>
  timestamp: number
}

let sessionsCache: ActiveSessionsCache | null = null
const CACHE_TTL_MS = 30_000 // 30 seconds

/**
 * Fetch ALL active hotspot sessions from MikroTik in a single request,
 * cached for 30 seconds. Returns a Map keyed by username.
 */
async function getAllActiveSessions(): Promise<Map<string, HotspotSessionInfo>> {
  const now = Date.now()
  if (sessionsCache && now - sessionsCache.timestamp < CACHE_TTL_MS) {
    return sessionsCache.data
  }

  const map = new Map<string, HotspotSessionInfo>()

  try {
    const response = await fetch(`${MIKROTIK_URL}/rest/ip/hotspot/active`, {
      headers: { Authorization: getAuthHeader() },
      cache: 'no-store',
    })

    if (!response.ok) {
      sessionsCache = { data: map, timestamp: now }
      return map
    }

    const sessions = await response.json()
    if (!Array.isArray(sessions)) {
      sessionsCache = { data: map, timestamp: now }
      return map
    }

    for (const s of sessions) {
      const user = s.user as string | undefined
      if (!user) continue
      const uptime = s.uptime ?? ''
      map.set(user, {
        isOnline: true,
        uptime,
        uptimeSeconds: uptime ? parseMikrotikDuration(uptime) : 0,
        address: s.address,
        bytesIn: s['bytes-in'] ? parseInt(s['bytes-in']) : undefined,
        bytesOut: s['bytes-out'] ? parseInt(s['bytes-out']) : undefined,
      })
    }
  } catch {
    // On error, return empty map — will retry next poll
  }

  sessionsCache = { data: map, timestamp: now }
  return map
}

function parseMikrotikDuration(duration: string): number {
  let seconds = 0
  const weeks = duration.match(/(\d+)w/)
  const days = duration.match(/(\d+)d/)
  const hours = duration.match(/(\d+)h/)
  const minutes = duration.match(/(\d+)m/)
  const secs = duration.match(/(\d+)s/)

  if (weeks) seconds += parseInt(weeks[1]) * 7 * 86400
  if (days) seconds += parseInt(days[1]) * 86400
  if (hours) seconds += parseInt(hours[1]) * 3600
  if (minutes) seconds += parseInt(minutes[1]) * 60
  if (secs) seconds += parseInt(secs[1])

  return seconds
}

/**
 * Get session info for a specific hotspot user (uses the global cache)
 */
export async function getHotspotActiveSession(
  login: string
): Promise<HotspotSessionInfo> {
  const allSessions = await getAllActiveSessions()
  return allSessions.get(login) ?? { isOnline: false }
}

export async function createHotspotUser(
  name: string,
  password: string,
  profile: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${MIKROTIK_URL}/rest/ip/hotspot/user`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify({ name, password, profile }),
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur de connexion au routeur MikroTik',
    }
  }
}

export async function removeHotspotUser(
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // First find the user by name
    const findResponse = await fetch(
      `${MIKROTIK_URL}/rest/ip/hotspot/user?name=${encodeURIComponent(name)}`,
      {
        headers: { Authorization: getAuthHeader() },
      }
    )

    if (!findResponse.ok) {
      return { success: false, error: 'Utilisateur non trouvé' }
    }

    const users = await findResponse.json()
    if (!users.length) {
      return { success: false, error: 'Utilisateur non trouvé' }
    }

    const userId = users[0]['.id']

    const deleteResponse = await fetch(
      `${MIKROTIK_URL}/rest/ip/hotspot/user/${userId}`,
      {
        method: 'DELETE',
        headers: { Authorization: getAuthHeader() },
      }
    )

    if (!deleteResponse.ok) {
      return { success: false, error: 'Erreur lors de la suppression' }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur de connexion au routeur MikroTik',
    }
  }
}
