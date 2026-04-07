// MikroTik RouterOS API client (port 8728)

import { RouterOSClient } from 'routeros-client'

const MIKROTIK_HOST = process.env.MIKROTIK_API_HOST ?? '192.168.10.254'
const MIKROTIK_USER = process.env.MIKROTIK_API_USER ?? 'admin'
const MIKROTIK_PASS = process.env.MIKROTIK_API_PASSWORD ?? ''
const MIKROTIK_PORT = parseInt(process.env.MIKROTIK_API_PORT ?? '8728')

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function withClient<T>(fn: (api: any) => Promise<T>): Promise<T> {
  const client = new RouterOSClient({
    host: MIKROTIK_HOST,
    user: MIKROTIK_USER,
    password: MIKROTIK_PASS,
    port: MIKROTIK_PORT,
    timeout: 10,
  })
  try {
    const api = await client.connect()
    return await fn(api as never)
  } finally {
    try { client.close() } catch { /* ignore */ }
  }
}

async function getAllActiveSessions(): Promise<Map<string, HotspotSessionInfo>> {
  const now = Date.now()
  if (sessionsCache && now - sessionsCache.timestamp < CACHE_TTL_MS) {
    return sessionsCache.data
  }

  const map = new Map<string, HotspotSessionInfo>()

  try {
    await withClient(async (api) => {
      const menu = api.menu('/ip/hotspot/active')
      const sessions = await menu.getAll()

      for (const s of sessions) {
        const user = s.user as string | undefined
        if (!user) continue
        const uptime = (s.uptime as string) ?? ''
        map.set(user, {
          isOnline: true,
          uptime,
          uptimeSeconds: uptime ? parseMikrotikDuration(uptime) : 0,
          address: s.address as string | undefined,
          bytesIn: s.bytesIn ? parseInt(String(s.bytesIn)) : undefined,
          bytesOut: s.bytesOut ? parseInt(String(s.bytesOut)) : undefined,
        })
      }
    })
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
    await withClient(async (api) => {
      const menu = api.menu('/ip/hotspot/user')
      await menu.add({ name, password, profile })
    })
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
    await withClient(async (api) => {
      const menu = api.menu('/ip/hotspot/user')
      const users = await menu.where('name', name).getAll()
      if (!users.length) throw new Error('Utilisateur non trouvé')
      await menu.remove(users[0].id)
    })
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur de connexion au routeur MikroTik',
    }
  }
}
