import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getHotspotActiveSession, type HotspotSessionInfo } from '@/lib/mikrotik'

const PAGE_SIZE = 20

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const sp = request.nextUrl.searchParams
  const page = Math.max(1, parseInt(sp.get('page') ?? '1'))
  const search = sp.get('search')?.trim() || null
  const paymentStatus = sp.get('paymentStatus') || null
  const paymentMethod = sp.get('paymentMethod') || null
  const ticketStatus = sp.get('ticketStatus') || null
  const packDuration = sp.get('packDuration') ? parseInt(sp.get('packDuration')!) : null
  const dateFrom = sp.get('dateFrom') || null
  const dateTo = sp.get('dateTo') || null

  // Build query for tickets with joins
  let query = supabase
    .from('tickets')
    .select(
      '*, pack:packs(name, duration_hours, price), user:profiles(full_name, identifiant, phone)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })

  // Filter by pack duration
  if (packDuration) {
    // Get pack IDs matching this duration
    const { data: matchingPacks } = await supabase
      .from('packs')
      .select('id')
      .eq('duration_hours', packDuration)
    if (matchingPacks?.length) {
      query = query.in('pack_id', matchingPacks.map((p) => p.id))
    } else {
      return NextResponse.json({ tickets: [], total: 0, page, pageSize: PAGE_SIZE, totalPages: 0 })
    }
  }

  // Filter by ticket status (mapped from UI status to DB status)
  if (ticketStatus === 'pending') {
    query = query.eq('status', 'pending')
  } else if (ticketStatus === 'active') {
    query = query.eq('status', 'active')
  } else if (ticketStatus === 'expired') {
    query = query.eq('status', 'expired')
  } else if (ticketStatus === 'cancelled') {
    query = query.eq('status', 'cancelled')
  } else {
    // Default: exclude cancelled
    query = query.in('status', ['pending', 'active', 'expired'])
  }

  // Filter by date range
  if (dateFrom) {
    query = query.gte('created_at', dateFrom)
  }
  if (dateTo) {
    // Add time to include the entire end day
    query = query.lte('created_at', dateTo + 'T23:59:59.999Z')
  }

  // Filter by search (name/identifiant/phone/payment reference)
  if (search) {
    const { data: matchingUsers } = await supabase
      .from('profiles')
      .select('id')
      .or(`full_name.ilike.%${search}%,identifiant.ilike.%${search}%,phone.ilike.%${search}%`)

    // Also search by payment reference
    const { data: matchingPayments } = await supabase
      .from('payments')
      .select('ticket_id, order_id')
      .ilike('reference', `%${search}%`)

    const userIds = (matchingUsers ?? []).map((u) => u.id)
    const ticketIdsFromRef = (matchingPayments ?? []).filter((p) => p.ticket_id).map((p) => p.ticket_id!)
    const orderIdsFromRef = (matchingPayments ?? []).filter((p) => p.order_id).map((p) => p.order_id!)

    // Build OR conditions for the tickets query
    const orConditions: string[] = []
    if (userIds.length > 0) orConditions.push(`user_id.in.(${userIds.join(',')})`)
    if (ticketIdsFromRef.length > 0) orConditions.push(`id.in.(${ticketIdsFromRef.join(',')})`)
    if (orderIdsFromRef.length > 0) orConditions.push(`order_id.in.(${orderIdsFromRef.join(',')})`)
    // Also search by login_hotspot
    orConditions.push(`login_hotspot.ilike.%${search}%`)

    if (orConditions.length > 0) {
      query = query.or(orConditions.join(','))
    } else {
      return NextResponse.json({ tickets: [], total: 0, page, pageSize: PAGE_SIZE, totalPages: 0 })
    }
  }

  // Pagination
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  query = query.range(from, to)

  const { data: tickets, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get payment info for all tickets
  const ticketIds = (tickets ?? []).map((t) => t.id)
  const orderIds = [...new Set((tickets ?? []).map((t) => t.order_id).filter(Boolean))]
  const paymentConditions: string[] = []
  if (ticketIds.length > 0) paymentConditions.push(`ticket_id.in.(${ticketIds.join(',')})`)
  if (orderIds.length > 0) paymentConditions.push(`order_id.in.(${orderIds.join(',')})`)

  let paymentMap = new Map<string, { id: string; payment_method: string; status: string; reference: string | null; screenshot_url: string | null }>()

  if (paymentConditions.length > 0) {
    const { data: payments } = await supabase
      .from('payments')
      .select('id, ticket_id, order_id, payment_method, status, reference, screenshot_url')
      .or(paymentConditions.join(','))

    for (const p of payments ?? []) {
      const entry = { id: p.id, payment_method: p.payment_method, status: p.status, reference: p.reference, screenshot_url: p.screenshot_url }
      if (p.ticket_id) paymentMap.set(p.ticket_id, entry)
      if (p.order_id) {
        for (const t of tickets ?? []) {
          if (t.order_id === p.order_id) paymentMap.set(t.id, entry)
        }
      }
    }
  }

  // Apply payment filters (post-query since payments are in a separate table)
  let filteredTickets = tickets ?? []

  if (paymentStatus) {
    filteredTickets = filteredTickets.filter((t) => {
      const pmt = paymentMap.get(t.id)
      return pmt?.status === paymentStatus
    })
  }

  if (paymentMethod) {
    filteredTickets = filteredTickets.filter((t) => {
      const pmt = paymentMap.get(t.id)
      return pmt?.payment_method === paymentMethod
    })
  }

  // MikroTik session info for active tickets
  const now = Date.now()
  const results = await Promise.all(
    filteredTickets.map(async (ticket) => {
      const pack = Array.isArray(ticket.pack) ? ticket.pack[0] : ticket.pack
      const usr = Array.isArray(ticket.user) ? ticket.user[0] : ticket.user
      const payment = paymentMap.get(ticket.id)
      const durationHours = pack?.duration_hours ?? 0
      const totalSeconds = durationHours * 3600

      let session: HotspotSessionInfo = { isOnline: false }
      let remainingSeconds = totalSeconds
      let usageStatus: string = 'pending'

      if (ticket.status === 'active') {
        session = await getHotspotActiveSession(ticket.login_hotspot)

        // First connection: start timer
        if (session.isOnline && !ticket.activated_at) {
          const activatedAt = new Date()
          const expiresAt = new Date(activatedAt.getTime() + totalSeconds * 1000)
          await supabase
            .from('tickets')
            .update({ activated_at: activatedAt.toISOString(), expires_at: expiresAt.toISOString() })
            .eq('id', ticket.id)
          ticket.activated_at = activatedAt.toISOString()
          ticket.expires_at = expiresAt.toISOString()
        }

        if (ticket.activated_at) {
          const expiresAt = ticket.expires_at
            ? new Date(ticket.expires_at).getTime()
            : new Date(ticket.activated_at).getTime() + totalSeconds * 1000
          remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000))

          if (remainingSeconds <= 0) {
            usageStatus = 'expired'
          } else if (session.isOnline) {
            usageStatus = 'in_use'
          } else {
            usageStatus = 'paused'
          }
        } else {
          usageStatus = 'not_started'
        }
      } else if (ticket.status === 'expired') {
        usageStatus = 'expired'
      }

      // Apply connection status filter
      if (ticketStatus === 'not_started' && usageStatus !== 'not_started') return null
      if (ticketStatus === 'in_use' && usageStatus !== 'in_use') return null
      if (ticketStatus === 'paused' && usageStatus !== 'paused') return null

      return {
        id: ticket.id,
        login_hotspot: ticket.login_hotspot,
        password_hotspot: ticket.password_hotspot,
        status: ticket.status,
        pack_name: pack?.name ?? '',
        pack_price: pack?.price ?? 0,
        duration_hours: durationHours,
        activated_at: ticket.activated_at,
        expires_at: ticket.expires_at,
        created_at: ticket.created_at,
        user_name: usr?.full_name ?? '',
        user_identifiant: usr?.identifiant ?? '',
        user_phone: usr?.phone ?? '',
        payment_id: payment?.id,
        payment_method: payment?.payment_method,
        payment_status: payment?.status,
        payment_reference: payment?.reference,
        payment_screenshot_url: payment?.screenshot_url,
        session_online: session.isOnline,
        remaining_seconds: remainingSeconds,
        usage_status: usageStatus,
      }
    })
  )

  const finalTickets = results.filter(Boolean)
  const total = count ?? 0

  return NextResponse.json({
    tickets: finalTickets,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
  })
}
