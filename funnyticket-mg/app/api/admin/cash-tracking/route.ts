import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: List confirmed cash payments with cash_received status
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
  const filter = sp.get('filter') || 'pending' // 'pending' | 'received' | 'all'
  const search = sp.get('search')?.trim() || null

  let query = supabase
    .from('payments')
    .select('*, user:profiles!payments_user_id_fkey(full_name, identifiant, phone), ticket:tickets(*, pack:packs(name, duration_hours, price)), order:orders(*)')
    .eq('status', 'confirmed')
    .eq('payment_method', 'cash')
    .order('confirmed_at', { ascending: false })

  if (filter === 'pending') {
    query = query.or('cash_received.is.null,cash_received.eq.false')
  } else if (filter === 'received') {
    query = query.eq('cash_received', true)
  }

  const { data: payments, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Filter by search if provided
  let filtered = payments ?? []
  if (search) {
    const s = search.toLowerCase()
    filtered = filtered.filter((p) => {
      const usr = Array.isArray(p.user) ? p.user[0] : p.user
      return (
        usr?.full_name?.toLowerCase().includes(s) ||
        usr?.identifiant?.toLowerCase().includes(s) ||
        usr?.phone?.includes(s)
      )
    })
  }

  // Map to response
  const results = filtered.map((p) => {
    const usr = Array.isArray(p.user) ? p.user[0] : p.user
    const ticket = Array.isArray(p.ticket) ? p.ticket[0] : p.ticket
    const pack = ticket?.pack
    const packData = Array.isArray(pack) ? pack[0] : pack

    return {
      id: p.id,
      amount: p.amount,
      confirmed_at: p.confirmed_at,
      cash_received: p.cash_received ?? false,
      cash_received_at: p.cash_received_at,
      user_name: usr?.full_name ?? '',
      user_identifiant: usr?.identifiant ?? '',
      user_phone: usr?.phone ?? '',
      pack_name: packData?.name ?? (p.order_id ? 'Commande multi-tickets' : ''),
      is_order: !!p.order_id,
    }
  })

  // Count stats
  const allCash = payments ?? []
  const pendingCount = allCash.filter((p) => !p.cash_received).length
  const receivedCount = allCash.filter((p) => p.cash_received).length

  return NextResponse.json({
    payments: results,
    stats: { pending: pendingCount, received: receivedCount, total: allCash.length },
  })
}

// PATCH: Toggle cash_received status
export async function PATCH(request: NextRequest) {
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

  const body = await request.json()
  const { paymentId, received } = body as { paymentId: string; received: boolean }

  if (!paymentId || typeof received !== 'boolean') {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const { error } = await supabase
    .from('payments')
    .update({
      cash_received: received,
      cash_received_at: received ? new Date().toISOString() : null,
    })
    .eq('id', paymentId)
    .eq('payment_method', 'cash')
    .eq('status', 'confirmed')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
