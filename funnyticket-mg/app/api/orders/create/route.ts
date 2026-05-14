import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateHotspotCredentials } from '@/lib/utils'
import { createHotspotUser } from '@/lib/mikrotik'
import { notifyAdmins, notifyUser } from '@/lib/web-push'

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

  // Notify admins of new order
  if (isCash) {
    await notifyAdmins(supabase, {
      title: 'Nouveau paiement cash 💰',
      body: `Nouveau paiement cash de ${totalAmount.toLocaleString()} Ar à valider`,
      tag: `new-order-${order.id}`,
      url: '/admin/payments',
    }).catch(() => {})
  }

  // Auto-confirm mobile money: create MikroTik users and activate tickets
  if (!isCash) {
    const serviceClient = createServiceClient()

    const { data: createdTickets } = await serviceClient
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
      await serviceClient
        .from('tickets')
        .update({ status: 'active' })
        .eq('id', ticket.id)
    }

    await serviceClient
      .from('orders')
      .update({ status: 'confirmed' })
      .eq('id', order.id)

    // Notify admins of auto-confirmed mobile money payment
    await notifyAdmins(supabase, {
      title: 'Paiement mobile money 📱',
      body: `Paiement de ${totalAmount.toLocaleString()} Ar auto-confirmé (${method})`,
      tag: `auto-confirm-${order.id}`,
      url: '/admin/payments',
    }).catch(() => {})
  }

  // ============================================
  // Gift system: 6 tickets of 1000 Ar in a week = 1 free ticket
  // ============================================
  const cheapTicketsInOrder = cartItems.filter((i) => i.price <= 1000).reduce((sum, i) => sum + i.quantity, 0)

  if (cheapTicketsInOrder > 0) {
    // Get the start of the current week (Monday)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    monday.setHours(0, 0, 0, 0)
    const weekStart = monday.toISOString().split('T')[0]

    // Count confirmed 1000 Ar tickets this week (including this order)
    const svc = createServiceClient()
    const { count: weeklyCount } = await svc
      .from('tickets')
      .select('id, pack:packs!inner(price)', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .lte('pack.price', 1000)
      .in('status', ['active', 'pending'])
      .gte('created_at', monday.toISOString())

    // Check gifts already given this week
    const { count: giftsGiven } = await svc
      .from('gifts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('week_start', weekStart)

    const totalThisWeek = weeklyCount ?? 0
    const alreadyGifted = giftsGiven ?? 0
    const giftsEarned = Math.floor(totalThisWeek / 6)
    const newGifts = giftsEarned - alreadyGifted

    if (newGifts > 0) {
      // Find the 1000 Ar pack
      const { data: cheapPack } = await svc
        .from('packs')
        .select('id, duration_hours')
        .lte('price', 1000)
        .eq('is_active', true)
        .order('price', { ascending: false })
        .limit(1)
        .single()

      if (cheapPack) {
        for (let g = 0; g < newGifts; g++) {
          const { login, password } = generateHotspotCredentials()
          const mikrotikProfile = profileMap[cheapPack.duration_hours ?? 0] ?? '12h'

          // Create MikroTik user for the gift ticket
          const giftResult = await createHotspotUser(login, password, mikrotikProfile)

          const giftStatus = giftResult.success ? 'active' : 'pending'

          const { data: giftTicket } = await svc
            .from('tickets')
            .insert({
              user_id: user.id,
              pack_id: cheapPack.id,
              login_hotspot: login,
              password_hotspot: password,
              status: giftStatus,
            })
            .select()
            .single()

          if (giftTicket) {
            await svc.from('gifts').insert({
              user_id: user.id,
              ticket_id: giftTicket.id,
              week_start: weekStart,
              qualifying_count: 6,
            })

            // Notify client of gift
            await notifyUser(svc, user.id, {
              title: 'Ticket cadeau offert ! 🎁',
              body: 'Bravo ! Vous avez cumulé 6 tickets cette semaine. Un ticket gratuit vous a été offert !',
              tag: `gift-${giftTicket.id}`,
              url: '/client/tickets',
            }).catch(() => {})
          }
        }
      }
    }
  }

  return NextResponse.json({ success: true, orderId: order.id })
}
