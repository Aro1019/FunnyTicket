import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { sendPushNotification, type PushPayload } from '@/lib/web-push'

// This endpoint should be called by a cron job (e.g. Supabase Edge Function, Vercel Cron, or external cron)
// Secured with a secret token
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // Allow if CRON_SECRET is set and matches, or if called from localhost in dev
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // Use service role to access all data
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()

  // Find active tickets expiring within the next alert windows
  // Runs every 5 minutes via cron-job.org — window of ±3min for precision
  const alertWindows = [
    { minutes: 60, type: '1h', label: '1 heure', window: 3 },
    { minutes: 30, type: '30m', label: '30 minutes', window: 3 },
    { minutes: 5, type: '5m', label: '5 minutes', window: 3 },
  ]

  let totalSent = 0

  for (const alert of alertWindows) {
    const windowStart = new Date(now.getTime() + (alert.minutes - alert.window) * 60000).toISOString()
    const windowEnd = new Date(now.getTime() + (alert.minutes + alert.window) * 60000).toISOString()

    // Get active tickets expiring within this window
    const { data: tickets } = await supabase
      .from('tickets')
      .select('id, user_id, pack:packs(name)')
      .eq('status', 'active')
      .gte('expires_at', windowStart)
      .lte('expires_at', windowEnd)

    if (!tickets?.length) continue

    // Filter out tickets that already received this alert type
    const ticketIds = tickets.map((t) => t.id)
    const { data: alreadySent } = await supabase
      .from('notification_log')
      .select('ticket_id')
      .in('ticket_id', ticketIds)
      .eq('alert_type', alert.type)

    const sentIds = new Set(alreadySent?.map((n) => n.ticket_id) || [])
    const ticketsToNotify = tickets.filter((t) => !sentIds.has(t.id))

    if (!ticketsToNotify.length) continue

    // Group by user
    const userTickets = new Map<string, typeof ticketsToNotify>()
    for (const ticket of ticketsToNotify) {
      const existing = userTickets.get(ticket.user_id) || []
      existing.push(ticket)
      userTickets.set(ticket.user_id, existing)
    }

    // Send notifications per user
    for (const [userId, userTicketList] of userTickets) {
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', userId)

      if (!subscriptions?.length) continue

      const pack = userTicketList[0].pack as { name: string }[] | null
      const packName = pack?.[0]?.name || 'WiFi'
      const count = userTicketList.length
      const body =
        count > 1
          ? `${count} tickets expirent dans ~${alert.label}`
          : `Votre ticket "${packName}" expire dans ~${alert.label}`

      const payload: PushPayload = {
        title: `⏰ Expiration ${alert.label}`,
        body,
        tag: `expiry-${alert.type}`,
        url: '/client/tickets',
      }

      const results = await Promise.allSettled(
        subscriptions.map((sub) => sendPushNotification(sub, payload))
      )

      // Clean up expired subscriptions
      for (let i = 0; i < results.length; i++) {
        if (results[i].status === 'rejected') {
          const reason = (results[i] as PromiseRejectedResult).reason
          if (reason?.statusCode === 410) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', subscriptions[i].endpoint)
          }
        }
      }

      const sent = results.filter((r) => r.status === 'fulfilled').length
      totalSent += sent

      // Log notifications to avoid duplicates
      const logEntries = userTicketList.map((t) => ({
        ticket_id: t.id,
        alert_type: alert.type,
      }))

      await supabase.from('notification_log').upsert(logEntries, {
        onConflict: 'ticket_id,alert_type',
      })
    }
  }

  return NextResponse.json({
    success: true,
    sent: totalSent,
    checked_at: now.toISOString(),
  })
}
