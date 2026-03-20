import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  if (profile?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const searchParams = request.nextUrl.searchParams
  const role = searchParams.get('role') || 'all' // 'all', 'user', 'admin'
  const search = searchParams.get('search') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20
  const offset = (page - 1) * limit

  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .neq('role', 'superadmin')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (role !== 'all') {
    query = query.eq('role', role)
  }

  if (search.trim()) {
    query = query.or(
      `full_name.ilike.%${search}%,identifiant.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`
    )
  }

  const { data: users, count } = await query

  // For each user, get their ticket and payment counts
  const enrichedUsers = await Promise.all(
    (users || []).map(async (u) => {
      const [{ count: ticketCount }, { data: payments }] = await Promise.all([
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('user_id', u.id),
        supabase.from('payments').select('amount').eq('user_id', u.id).eq('status', 'confirmed'),
      ])

      return {
        ...u,
        ticket_count: ticketCount ?? 0,
        total_spent: payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0,
      }
    })
  )

  return NextResponse.json({
    users: enrichedUsers,
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit),
  })
}
