import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateHotspotCredentials } from '@/lib/utils'

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
  const proofMode = formData.get('proofMode') as string | null
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

  // Validate proof for non-cash
  if (!isCash) {
    if (proofMode === 'reference' && !reference?.trim()) {
      return NextResponse.json({ error: 'Référence requise' }, { status: 400 })
    }
    if (proofMode === 'screenshot' && (!screenshot || screenshot.size === 0)) {
      return NextResponse.json({ error: 'Capture requise' }, { status: 400 })
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
  if (proofMode === 'screenshot' && screenshot && screenshot.size > 0) {
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
  const { error: paymentError } = await supabase.from('payments').insert({
    order_id: order.id,
    user_id: user.id,
    amount: totalAmount,
    payment_method: method,
    payment_method_id: methodId || null,
    reference: reference?.trim() || null,
    screenshot_url: screenshotUrl,
    status: 'pending',
  })

  if (paymentError) {
    return NextResponse.json({ error: 'Erreur création paiement' }, { status: 500 })
  }

  return NextResponse.json({ success: true, orderId: order.id })
}
