import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getHotspotActiveSession, type HotspotSessionInfo } from '@/lib/mikrotik'

export interface TicketStatusResponse {
  id: string
  login_hotspot: string
  password_hotspot: string
  status: string
  pack_name: string
  duration_hours: number
  activated_at: string | null
  expires_at: string | null
  created_at: string
  /** MikroTik live session info */
  session: HotspotSessionInfo
  /** Computed progress (0-100) */
  progress: number
  /** Seconds elapsed since activation */
  elapsedSeconds: number
  /** Seconds remaining until expiration */
  remainingSeconds: number
  /** Total duration in seconds */
  totalSeconds: number
  /** Computed usage status */
  usageStatus: 'pending' | 'not_started' | 'in_use' | 'paused' | 'expired'
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // Check if user is admin -> fetch all active tickets, otherwise just the user's
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  let query = supabase
    .from('tickets')
    .select('*, pack:packs(name, duration_hours), user:profiles(full_name, identifiant)')
    .in('status', ['active', 'pending'])
    .order('created_at', { ascending: false })

  if (!isAdmin) {
    query = query.eq('user_id', user.id)
  }

  const { data: tickets, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const now = Date.now()

  // Query MikroTik for each active ticket (uses cached batch call - 1 request/30s)
  const results: TicketStatusResponse[] = await Promise.all(
    (tickets ?? []).map(async (ticket) => {
      const pack = Array.isArray(ticket.pack) ? ticket.pack[0] : ticket.pack
      const durationHours = pack?.duration_hours ?? 0
      const totalSeconds = durationHours * 3600

      let session: HotspotSessionInfo = { isOnline: false }
      let progress = 0
      let elapsedSeconds = 0
      let remainingSeconds = totalSeconds
      let usageStatus: TicketStatusResponse['usageStatus'] = 'pending'

      if (ticket.status === 'active' && ticket.activated_at) {
        // Query MikroTik
        session = await getHotspotActiveSession(ticket.login_hotspot)

        const activatedAt = new Date(ticket.activated_at).getTime()
        const expiresAt = ticket.expires_at
          ? new Date(ticket.expires_at).getTime()
          : activatedAt + totalSeconds * 1000

        elapsedSeconds = Math.max(0, Math.floor((now - activatedAt) / 1000))
        remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000))

        if (totalSeconds > 0) {
          progress = Math.min(100, Math.round((elapsedSeconds / totalSeconds) * 100))
        }

        if (remainingSeconds <= 0) {
          usageStatus = 'expired'
          progress = 100
        } else if (session.isOnline) {
          usageStatus = 'in_use'
        } else {
          usageStatus = 'not_started'
        }
      }

      return {
        id: ticket.id,
        login_hotspot: ticket.login_hotspot,
        password_hotspot: ticket.password_hotspot,
        status: ticket.status,
        pack_name: pack?.name ?? '',
        duration_hours: durationHours,
        activated_at: ticket.activated_at,
        expires_at: ticket.expires_at,
        created_at: ticket.created_at,
        session,
        progress,
        elapsedSeconds,
        remainingSeconds,
        totalSeconds,
        usageStatus,
        ...(isAdmin
          ? {
              user_name: (Array.isArray(ticket.user) ? ticket.user[0] : ticket.user)?.full_name,
              user_identifiant: (Array.isArray(ticket.user) ? ticket.user[0] : ticket.user)?.identifiant,
            }
          : {}),
      }
    })
  )

  return NextResponse.json({ tickets: results })
}
