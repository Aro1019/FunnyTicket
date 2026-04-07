import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateHotspotCredentials } from '@/lib/utils'
import { createHotspotUser } from '@/lib/mikrotik'

const profileMap: Record<number, string> = {
  12: '12h',
  168: '1semaine',
  720: '1mois',
}

interface CartItemPayload {
  packId: string
  packName: string
  price: number
  durationHours: number
  quantity: number
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const formData = await request.formData()
  const cartItemsRaw = formData.get('cartItems') as string
  const method = formData.get('method') as string
  const methodId = formData.get('methodId') as string
  const reference = formData.get('reference') as string | null
  const screenshot = formData.get('screenshot') as File | null

  if (!cartItemsRaw || !method) {
    return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
  }

  let cartItems: CartItemPayload[]
  try {
    cartItems = JSON.parse(cartItemsRaw)
  } catch {
    return NextResponse.json({ error: 'Panier invalide' }, { status: 400 })
  }

  if (!cartItems.length) {
    return NextResponse.json({ error: 'Panier vide' }, { status: 400 })
  }

  // Server-side cart limit validation
  const totalTickets = cartItems.reduce((sum, i) => sum + i.quantity, 0)
  const prices = cartItems.map((i) => i.price)
  const allCheap = prices.every((p) => p <= 1000)
  const allExpensive = prices.every((p) => p > 1000)
  const maxAllowed = allCheap ? 4 : allExpensive ? 2 : 3
  if (totalTickets > maxAllowed) {
    return NextResponse.json(
      { error: `Limite dépassée : ${maxAllowed} tickets max pour cette combinaison` },
      { status: 400 }
    )
  }

  const isCash = method === 'cash'

  // Validate proof for non-cash: both reference AND screenshot required
  if (!isCash) {
    if (!reference?.trim()) {
      return NextResponse.json({ error: 'Référence de transaction requise' }, { status: 400 })
    }
    if (!screenshot || screenshot.size === 0) {
      return NextResponse.json({ error: 'Capture d\'écran requise' }, { status: 400 })
    }

    // Check for duplicate reference
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('reference', reference.trim())
      .limit(1)
      .maybeSingle()

    if (existingPayment) {
      return NextResponse.json(
        { error: 'Cette référence de transaction a déjà été utilisée.' },
        { status: 400 }
      )
    }
  }

  // Verify all packs exist and compute real total
  const packIds = [...new Set(cartItems.map((i) => i.packId))]
  const { data: packs } = await supabase
    .from('packs')
    .select('*')
    .in('id', packIds)
    .eq('is_active', true)

  if (!packs || packs.length !== packIds.length) {
    return NextResponse.json({ error: 'Pack invalide ou inactif' }, { status: 400 })
  }

  const packMap = new Map(packs.map((p) => [p.id, p]))
  let totalAmount = 0
  for (const item of cartItems) {
    const pack = packMap.get(item.packId)
    if (!pack) {
      return NextResponse.json({ error: `Pack ${item.packId} introuvable` }, { status: 400 })
    }
    totalAmount += pack.price * item.quantity
  }

  // Upload screenshot if provided
  let screenshotUrl: string | null = null
  if (screenshot && screenshot.size > 0) {
    const ext = screenshot.name.split('.').pop() || 'jpg'
    const path = `${user.id}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('payment-screenshots')
      .upload(path, screenshot, {
        contentType: screenshot.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: 'Erreur upload capture' }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from('payment-screenshots')
      .getPublicUrl(path)

    screenshotUrl = urlData.publicUrl
  }

  // Create order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      total_amount: totalAmount,
      status: 'pending',
    })
    .select()
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Erreur création commande' }, { status: 500 })
  }

  // Create tickets for each cart item
  const ticketInserts = []
  for (const item of cartItems) {
    for (let i = 0; i < item.quantity; i++) {
      const { login, password } = generateHotspotCredentials()
      ticketInserts.push({
        user_id: user.id,
        pack_id: item.packId,
        order_id: order.id,
        login_hotspot: login,
        password_hotspot: password,
        status: 'pending',
      })
    }
  }

  const { error: ticketsError } = await supabase
    .from('tickets')
    .insert(ticketInserts)

  if (ticketsError) {
    return NextResponse.json({ error: 'Erreur création tickets' }, { status: 500 })
  }

  // Create payment record
  const { data: payment, error: paymentError } = await supabase.from('payments').insert({
    order_id: order.id,
    user_id: user.id,
    amount: totalAmount,
    payment_method: method,
    payment_method_id: methodId || null,
    reference: reference?.trim() || null,
    screenshot_url: screenshotUrl,
    status: isCash ? 'pending' : 'confirmed',
  }).select().single()

  if (paymentError || !payment) {
    return NextResponse.json({ error: 'Erreur création paiement' }, { status: 500 })
  }

  // Auto-confirm mobile money: create MikroTik users and activate tickets
  if (!isCash) {
    const { data: createdTickets } = await supabase
      .from('tickets')
      .select('*, pack:packs(*)')
      .eq('order_id', order.id)

    for (const ticket of createdTickets ?? []) {
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
      .eq('id', order.id)
  }

  return NextResponse.json({ success: true, orderId: order.id })
}
