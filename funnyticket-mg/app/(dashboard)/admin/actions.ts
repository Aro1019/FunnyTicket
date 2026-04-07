'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createHotspotUser } from '@/lib/mikrotik'

const profileMap: Record<number, string> = {
  12: '12h',
  168: '1semaine',
  720: '1mois',
}

export async function confirmPayment(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/client')

  const paymentId = formData.get('paymentId') as string

  // Get payment
  const { data: payment } = await supabase
    .from('payments')
    .select('*, ticket:tickets(*, pack:packs(*)), order:orders(*)')
    .eq('id', paymentId)
    .single()

  if (!payment) {
    redirect('/admin/payments?error=payment_not_found')
  }

  const now = new Date()

  // Determine if this is an order-based or legacy single-ticket payment
  if (payment.order_id) {
    // ── Order-based: activate all tickets in the order ──
    const { data: tickets } = await supabase
      .from('tickets')
      .select('*, pack:packs(*)')
      .eq('order_id', payment.order_id)

    if (!tickets?.length) {
      redirect('/admin/payments?error=no_tickets_in_order')
    }

    // Create MikroTik users for all tickets
    for (const ticket of tickets) {
      const pack = Array.isArray(ticket.pack) ? ticket.pack[0] : ticket.pack
      const mikrotikProfile = profileMap[pack?.duration_hours ?? 0] ?? '12h'

      const result = await createHotspotUser(
        ticket.login_hotspot,
        ticket.password_hotspot,
        mikrotikProfile
      )

      if (!result.success) {
        redirect(
          '/admin/payments?error=' +
            encodeURIComponent(
              `Erreur MikroTik pour ${ticket.login_hotspot}: ${result.error ?? 'inconnue'}`
            )
        )
      }

      // Set to active but do NOT set activated_at / expires_at yet
      // Timer starts only when client connects to MikroTik
      await supabase
        .from('tickets')
        .update({ status: 'active' })
        .eq('id', ticket.id)
    }

    // Update order status
    await supabase
      .from('orders')
      .update({ status: 'confirmed' })
      .eq('id', payment.order_id)
  } else {
    // ── Legacy single-ticket payment ──
    const ticket = Array.isArray(payment.ticket)
      ? payment.ticket[0]
      : payment.ticket
    const pack = ticket?.pack
    const packData = Array.isArray(pack) ? pack[0] : pack
    const mikrotikProfile = profileMap[packData?.duration_hours ?? 0] ?? '12h'

    const mikrotikResult = await createHotspotUser(
      ticket.login_hotspot,
      ticket.password_hotspot,
      mikrotikProfile
    )

    if (!mikrotikResult.success) {
      redirect(
        '/admin/payments?error=' +
          encodeURIComponent(mikrotikResult.error ?? 'Erreur MikroTik')
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

  revalidatePath('/admin')
  revalidatePath('/admin/payments')
  redirect('/admin/payments?success=payment_confirmed')
}

export async function rejectPayment(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/client')

  const paymentId = formData.get('paymentId') as string

  const { data: payment } = await supabase
    .from('payments')
    .select('ticket_id, order_id')
    .eq('id', paymentId)
    .single()

  if (!payment) {
    redirect('/admin/payments?error=payment_not_found')
  }

  // Reject payment
  await supabase
    .from('payments')
    .update({
      status: 'rejected',
      confirmed_by: user.id,
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', paymentId)

  if (payment.order_id) {
    // Cancel all tickets in the order
    await supabase
      .from('tickets')
      .update({ status: 'cancelled' })
      .eq('order_id', payment.order_id)

    await supabase
      .from('orders')
      .update({ status: 'rejected' })
      .eq('id', payment.order_id)
  } else if (payment.ticket_id) {
    // Legacy single ticket
    await supabase
      .from('tickets')
      .update({ status: 'cancelled' })
      .eq('id', payment.ticket_id)
  }

  revalidatePath('/admin')
  revalidatePath('/admin/payments')
  redirect('/admin/payments?success=payment_rejected')
}
