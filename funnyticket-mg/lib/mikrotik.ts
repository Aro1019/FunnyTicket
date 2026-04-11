// MikroTik Bridge API client
// Calls the bridge API running on the VPS (same network as MikroTik)

const BRIDGE_URL = process.env.MIKROTIK_BRIDGE_URL ?? 'http://localhost:4000'
const BRIDGE_API_KEY = process.env.MIKROTIK_BRIDGE_API_KEY ?? ''

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

async function bridgeFetch(path: string, options?: RequestInit): Promise<Response> {
  return fetch(`${BRIDGE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': BRIDGE_API_KEY,
      ...options?.headers,
    },
  })
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

async function getAllActiveSessions(): Promise<Map<string, HotspotSessionInfo>> {
  const now = Date.now()
  if (sessionsCache && now - sessionsCache.timestamp < CACHE_TTL_MS) {
    return sessionsCache.data
  }

  const map = new Map<string, HotspotSessionInfo>()

  try {
    const res = await bridgeFetch('/hotspot/sessions')
    if (res.ok) {
      const data = await res.json()
      for (const [user, session] of Object.entries(data.sessions ?? {})) {
        const s = session as { isOnline: boolean; uptime?: string; address?: string; bytesIn?: number; bytesOut?: number }
        const uptime = s.uptime ?? ''
        map.set(user, {
          isOnline: true,
          uptime,
          uptimeSeconds: uptime ? parseMikrotikDuration(uptime) : 0,
          address: s.address,
          bytesIn: s.bytesIn,
          bytesOut: s.bytesOut,
        })
      }
    }
  } catch {
    // On error, return empty map — will retry next poll
  }

  sessionsCache = { data: map, timestamp: now }
  return map
}

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
    const res = await bridgeFetch('/hotspot/users', {
      method: 'POST',
      body: JSON.stringify({ name, password, profile }),
    })
    const data = await res.json()
    if (!res.ok) {
      return { success: false, error: data.error ?? 'Erreur bridge MikroTik' }
    }
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur de connexion au bridge MikroTik',
    }
  }
}

export async function removeHotspotUser(
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await bridgeFetch(`/hotspot/users/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    })
    const data = await res.json()
    if (!res.ok) {
      return { success: false, error: data.error ?? 'Erreur bridge MikroTik' }
    }
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur de connexion au bridge MikroTik',
    }
  }
}
