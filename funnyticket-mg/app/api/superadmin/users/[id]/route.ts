import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { removeHotspotUser } from '@/lib/mikrotik'

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

/**
 * Hard delete d'un client : supprime toutes les données reliées en BDD,
 * supprime les utilisateurs hotspot MikroTik correspondants, puis supprime
 * le compte auth.users (cascade sur profiles + push_subscriptions).
 *
 * Restrictions : superadmin uniquement, cible obligatoirement un client (role='user'),
 * impossible de se supprimer soi-même ou de supprimer un admin/superadmin.
 */
export async function DELETE(
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

  if (id === user.id) {
    return NextResponse.json(
      { error: 'Impossible de supprimer votre propre compte' },
      { status: 400 }
    )
  }

  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('id, role, identifiant')
    .eq('id', id)
    .single()

  if (!targetProfile) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  }

  if (targetProfile.role !== 'user') {
    return NextResponse.json(
      { error: 'Seuls les clients peuvent être supprimés via cette action.' },
      { status: 403 }
    )
  }

  // Use service client to bypass RLS for cascading cleanup
  const service = createServiceClient()

  // 1) Récupère les logins hotspot pour nettoyage MikroTik (best-effort)
  const { data: userTickets } = await service
    .from('tickets')
    .select('id, login_hotspot')
    .eq('user_id', id)

  const mikrotikErrors: string[] = []
  if (userTickets && userTickets.length > 0) {
    await Promise.all(
      userTickets.map(async (t) => {
        if (!t.login_hotspot) return
        const res = await removeHotspotUser(t.login_hotspot)
        if (!res.success && res.error) {
          mikrotikErrors.push(`${t.login_hotspot}: ${res.error}`)
        }
      })
    )
  }

  // 2) Suppression en cascade côté BDD (ordre important à cause des FK)
  //    notification_log → cascade depuis tickets
  //    push_subscriptions → cascade depuis auth.users
  const dbSteps = [
    { label: 'gifts', table: 'gifts' as const },
    { label: 'welcome_tickets', table: 'welcome_tickets' as const },
    { label: 'payments', table: 'payments' as const },
    { label: 'tickets', table: 'tickets' as const },
    { label: 'orders', table: 'orders' as const },
  ]

  for (const step of dbSteps) {
    const { error } = await service.from(step.table).delete().eq('user_id', id)
    if (error) {
      console.error(`[delete-user] échec suppression ${step.label}:`, error)
      return NextResponse.json(
        {
          error: `Erreur lors de la suppression (${step.label}). Aucune donnée n'a été supprimée définitivement.`,
        },
        { status: 500 }
      )
    }
  }

  // 3) Suppression du compte auth.users → cascade sur profiles + push_subscriptions
  const { error: authError } = await service.auth.admin.deleteUser(id)
  if (authError) {
    console.error('[delete-user] échec suppression auth user:', authError)
    return NextResponse.json(
      {
        error:
          "Données reliées supprimées, mais impossible de supprimer le compte d'authentification. Contactez un administrateur.",
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    identifiant: targetProfile.identifiant,
    mikrotikErrors: mikrotikErrors.length > 0 ? mikrotikErrors : undefined,
  })
}
