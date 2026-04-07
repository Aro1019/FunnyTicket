import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  const { data: payment } = await supabase
    .from('payments')
    .select('ticket_id, order_id, status')
    .eq('id', paymentId)
    .single()

  if (!payment) {
    return NextResponse.json({ error: 'Paiement introuvable' }, { status: 404 })
  }

  if (payment.status !== 'pending') {
    return NextResponse.json({ error: 'Ce paiement a déjà été traité' }, { status: 400 })
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
    await supabase
      .from('tickets')
      .update({ status: 'cancelled' })
      .eq('order_id', payment.order_id)

    await supabase
      .from('orders')
      .update({ status: 'rejected' })
      .eq('id', payment.order_id)
  } else if (payment.ticket_id) {
    await supabase
      .from('tickets')
      .update({ status: 'cancelled' })
      .eq('id', payment.ticket_id)
  }

  return NextResponse.json({ success: true })
}
