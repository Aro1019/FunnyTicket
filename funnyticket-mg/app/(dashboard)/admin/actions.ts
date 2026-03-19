'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createHotspotUser } from '@/lib/mikrotik'

export async function confirmPayment(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/client')

  const paymentId = formData.get('paymentId') as string

  // Get payment with ticket and pack info
  const { data: payment } = await supabase
    .from('payments')
    .select('*, ticket:tickets(*, pack:packs(*))')
    .eq('id', paymentId)
    .single()

  if (!payment) {
    redirect('/admin/payments?error=payment_not_found')
  }

  const ticket = Array.isArray(payment.ticket)
    ? payment.ticket[0]
    : payment.ticket
  const pack = ticket?.pack
  const packData = Array.isArray(pack) ? pack[0] : pack

  // Map pack duration to MikroTik profile name
  const profileMap: Record<number, string> = {
    12: '12h',
    168: '1semaine',
    720: '1mois',
  }
  const mikrotikProfile = profileMap[packData?.duration_hours ?? 0] ?? '12h'

  // Create hotspot user on MikroTik
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

  // Calculate expiration
  const now = new Date()
  const expiresAt = new Date(
    now.getTime() + (packData?.duration_hours ?? 12) * 60 * 60 * 1000
  )

  // Update ticket status to active
  await supabase
    .from('tickets')
    .update({
      status: 'active',
      activated_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .eq('id', ticket.id)

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

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/client')

  const paymentId = formData.get('paymentId') as string

  // Get payment to find ticket
  const { data: payment } = await supabase
    .from('payments')
    .select('ticket_id')
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

  // Cancel ticket
  await supabase
    .from('tickets')
    .update({ status: 'cancelled' })
    .eq('id', payment.ticket_id)

  revalidatePath('/admin')
  revalidatePath('/admin/payments')
  redirect('/admin/payments?success=payment_rejected')
}
