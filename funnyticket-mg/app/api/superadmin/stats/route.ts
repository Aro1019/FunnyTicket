import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
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

  // Parallel queries for platform stats
  const [
    { count: totalUsers },
    { count: totalAdmins },
    { count: totalTickets },
    { count: activeTickets },
    { count: pendingPayments },
    { data: confirmedPayments },
    { count: totalOrders },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
    supabase.from('tickets').select('*', { count: 'exact', head: true }),
    supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('payments').select('amount').eq('status', 'confirmed'),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
  ])

  const totalRevenue = confirmedPayments?.reduce((sum, p) => sum + p.amount, 0) ?? 0

  // Registrations per day (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentProfiles } = await supabase
    .from('profiles')
    .select('created_at')
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: true })

  const registrationsByDay: Record<string, number> = {}
  for (const p of recentProfiles || []) {
    const day = new Date(p.created_at).toISOString().slice(0, 10)
    registrationsByDay[day] = (registrationsByDay[day] || 0) + 1
  }

  // Fill 30 days
  const registrationChart: { label: string; count: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    const label = `${d.getDate()}/${d.getMonth() + 1}`
    registrationChart.push({ label, count: registrationsByDay[key] || 0 })
  }

  // Revenue per day (last 30 days)
  const { data: recentPayments } = await supabase
    .from('payments')
    .select('amount, created_at')
    .eq('status', 'confirmed')
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: true })

  const revenueByDay: Record<string, number> = {}
  for (const p of recentPayments || []) {
    const day = new Date(p.created_at).toISOString().slice(0, 10)
    revenueByDay[day] = (revenueByDay[day] || 0) + p.amount
  }

  const revenueChart: { label: string; revenue: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    const label = `${d.getDate()}/${d.getMonth() + 1}`
    revenueChart.push({ label, revenue: revenueByDay[key] || 0 })
  }

  return NextResponse.json({
    totalUsers: totalUsers ?? 0,
    totalAdmins: totalAdmins ?? 0,
    totalTickets: totalTickets ?? 0,
    activeTickets: activeTickets ?? 0,
    pendingPayments: pendingPayments ?? 0,
    totalRevenue,
    totalOrders: totalOrders ?? 0,
    registrationChart,
    revenueChart,
  })
}
