import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createHotspotUser } from '@/lib/mikrotik'
import { notifyUser } from '@/lib/web-push'
import { tryGrantWelcomeBonus } from '@/lib/welcome-bonus'

const profileMap: Record<number, string> = {
  12: '12h',
  168: '1semaine',
  720: '1mois',
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: paymentId } = await params
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

  // Get payment with associated tickets
  const { data: payment } = await supabase
    .from('payments')
    .select('*, ticket:tickets(*, pack:packs(*)), order:orders(*)')
    .eq('id', paymentId)
    .single()

  if (!payment) {
    return NextResponse.json({ error: 'Paiement introuvable' }, { status: 404 })
  }

  if (payment.status !== 'pending') {
    return NextResponse.json({ error: 'Ce paiement a déjà été traité' }, { status: 400 })
  }

  const now = new Date()

  if (payment.order_id) {
    // Order-based: activate all tickets in the order
    const { data: tickets } = await supabase
      .from('tickets')
      .select('*, pack:packs(*)')
      .eq('order_id', payment.order_id)

    if (!tickets?.length) {
      return NextResponse.json({ error: 'Aucun ticket trouvé dans la commande' }, { status: 400 })
    }

    for (const ticket of tickets) {
      const pack = Array.isArray(ticket.pack) ? ticket.pack[0] : ticket.pack
      const mikrotikProfile = profileMap[pack?.duration_hours ?? 0] ?? '12h'

      const result = await createHotspotUser(
        ticket.login_hotspot,
        ticket.password_hotspot,
        mikrotikProfile
      )

      if (!result.success) {
        return NextResponse.json(
          { error: `Erreur MikroTik pour ${ticket.login_hotspot}: ${result.error ?? 'inconnue'}` },
          { status: 500 }
        )
      }

      // Set to active but do NOT set activated_at / expires_at yet
      // Timer starts only when client connects to MikroTik
      await supabase
        .from('tickets')
        .update({ status: 'active' })
        .eq('id', ticket.id)
    }

    await supabase
      .from('orders')
      .update({ status: 'confirmed' })
      .eq('id', payment.order_id)
  } else {
    // Legacy single-ticket
    const ticket = Array.isArray(payment.ticket) ? payment.ticket[0] : payment.ticket
    const pack = ticket?.pack
    const packData = Array.isArray(pack) ? pack[0] : pack
    const mikrotikProfile = profileMap[packData?.duration_hours ?? 0] ?? '12h'

    const result = await createHotspotUser(
      ticket.login_hotspot,
      ticket.password_hotspot,
      mikrotikProfile
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? 'Erreur MikroTik' },
        { status: 500 }
      )
    }

    // Set to active but do NOT set activated_at / expires_at yet
    // Timer starts only when client connects to MikroTik
    await supabase
      .from('tickets')
      .update({ status: 'active' })
      .eq('id', ticket.id)
  }

  // Confirm payment
  await supabase
    .from('payments')
    .update({
      status: 'confirmed',
      confirmed_by: user.id,
      confirmed_at: now.toISOString(),
    })
    .eq('id', paymentId)

  // Bonus ticket cadeau au 1er achat confirmé (anti-abus par téléphone).
  const bonusGranted = await tryGrantWelcomeBonus(supabase, payment.user_id, paymentId)

  // Notify client that payment was confirmed
  await notifyUser(supabase, payment.user_id, {
    title: 'Paiement confirmé ✅',
    body: bonusGranted
      ? 'Votre paiement a été validé. Vos tickets sont actifs et un ticket WiFi 12h bonus vous a été offert ! 🎁'
      : 'Votre paiement a été validé. Vos tickets sont maintenant actifs !',
    tag: `payment-confirmed-${paymentId}`,
    url: '/client/tickets',
  }).catch(() => {})

  return NextResponse.json({ success: true, bonusGranted })
}
