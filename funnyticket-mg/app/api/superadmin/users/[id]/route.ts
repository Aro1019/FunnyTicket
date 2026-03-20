import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (myProfile?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await params

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  }

  // Get tickets with packs
  const { data: tickets } = await supabase
    .from('tickets')
    .select('*, pack:packs(name, price, duration_hours)')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  // Get payments
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  // Stats
  const { count: totalTickets } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', id)

  const { data: confirmedPayments } = await supabase
    .from('payments')
    .select('amount')
    .eq('user_id', id)
    .eq('status', 'confirmed')

  const totalSpent = confirmedPayments?.reduce((sum, p) => sum + p.amount, 0) ?? 0

  // If admin/vendor, get their confirmed sales (payments they confirmed)
  let vendorStats = null
  if (profile.role === 'admin') {
    const { data: sales } = await supabase
      .from('payments')
      .select('amount')
      .eq('confirmed_by', id)
      .eq('status', 'confirmed')

    const { count: salesCount } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('confirmed_by', id)
      .eq('status', 'confirmed')

    vendorStats = {
      totalSales: salesCount ?? 0,
      totalRevenue: sales?.reduce((sum, p) => sum + p.amount, 0) ?? 0,
    }
  }

  return NextResponse.json({
    profile,
    tickets: tickets || [],
    payments: payments || [],
    stats: {
      totalTickets: totalTickets ?? 0,
      totalSpent,
    },
    vendorStats,
  })
}
