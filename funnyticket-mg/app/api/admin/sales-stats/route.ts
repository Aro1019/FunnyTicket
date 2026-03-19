import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const MONTHS_FR = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc',
]

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

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const searchParams = request.nextUrl.searchParams
  const period = searchParams.get('period') || 'mois'
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
  const month = parseInt(
    searchParams.get('month') || String(new Date().getMonth() + 1)
  )

  let startDate: string
  let endDate: string

  if (period === 'jour' || period === 'semaine') {
    const lastDay = new Date(year, month, 0).getDate()
    startDate = `${year}-${String(month).padStart(2, '0')}-01T00:00:00`
    endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59`
  } else if (period === 'mois') {
    startDate = `${year}-01-01T00:00:00`
    endDate = `${year}-12-31T23:59:59`
  } else {
    startDate = '2020-01-01T00:00:00'
    endDate = '2099-12-31T23:59:59'
  }

  const { data: payments } = await supabase
    .from('payments')
    .select('amount, created_at')
    .eq('status', 'confirmed')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: true })

  type DataPoint = { label: string; revenue: number; count: number }
  let result: DataPoint[] = []

  if (period === 'jour') {
    const lastDay = new Date(year, month, 0).getDate()
    const map = new Map<number, { revenue: number; count: number }>()
    for (let d = 1; d <= lastDay; d++) map.set(d, { revenue: 0, count: 0 })

    for (const p of payments || []) {
      const day = new Date(p.created_at).getDate()
      const existing = map.get(day)!
      existing.revenue += p.amount
      existing.count += 1
    }

    result = Array.from(map.entries()).map(([day, data]) => ({
      label: String(day),
      ...data,
    }))
  } else if (period === 'semaine') {
    const lastDay = new Date(year, month, 0).getDate()
    const maxWeeks = Math.ceil(lastDay / 7)
    const map = new Map<number, { revenue: number; count: number }>()
    for (let w = 1; w <= maxWeeks; w++) map.set(w, { revenue: 0, count: 0 })

    for (const p of payments || []) {
      const day = new Date(p.created_at).getDate()
      const week = Math.min(Math.ceil(day / 7), maxWeeks)
      const existing = map.get(week)!
      existing.revenue += p.amount
      existing.count += 1
    }

    result = Array.from(map.entries()).map(([week, data]) => ({
      label: `Sem ${week}`,
      ...data,
    }))
  } else if (period === 'mois') {
    const map = new Map<number, { revenue: number; count: number }>()
    for (let m = 0; m < 12; m++) map.set(m, { revenue: 0, count: 0 })

    for (const p of payments || []) {
      const m = new Date(p.created_at).getMonth()
      const existing = map.get(m)!
      existing.revenue += p.amount
      existing.count += 1
    }

    result = Array.from(map.entries()).map(([m, data]) => ({
      label: MONTHS_FR[m],
      ...data,
    }))
  } else {
    // année
    const yearMap = new Map<number, { revenue: number; count: number }>()

    for (const p of payments || []) {
      const y = new Date(p.created_at).getFullYear()
      if (!yearMap.has(y)) yearMap.set(y, { revenue: 0, count: 0 })
      const existing = yearMap.get(y)!
      existing.revenue += p.amount
      existing.count += 1
    }

    if (yearMap.size === 0) {
      yearMap.set(new Date().getFullYear(), { revenue: 0, count: 0 })
    }

    result = Array.from(yearMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([y, data]) => ({
        label: String(y),
        ...data,
      }))
  }

  return NextResponse.json({ data: result })
}
