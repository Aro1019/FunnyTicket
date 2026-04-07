'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { generateHotspotCredentials } from '@/lib/utils'
import { createHotspotUser } from '@/lib/mikrotik'

const profileMap: Record<number, string> = {
  12: '12h',
  168: '1semaine',
  720: '1mois',
}

export async function confirmPurchase(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const packId = formData.get('packId') as string
  const method = formData.get('method') as string
  const methodId = formData.get('methodId') as string
  const reference = formData.get('reference') as string | null
  const screenshot = formData.get('screenshot') as File | null

  if (!packId || !method) {
    redirect('/client?error=missing_fields')
  }

  const isCash = method === 'cash'

  // Validate proof for non-cash payments: both reference AND screenshot required
  if (!isCash) {
    if (!reference?.trim()) {
      redirect(`/client/purchase/${packId}/confirm?method=${method}&methodId=${methodId}&error=reference_required`)
    }
    if (!screenshot || screenshot.size === 0) {
      redirect(`/client/purchase/${packId}/confirm?method=${method}&methodId=${methodId}&error=screenshot_required`)
    }

    // Check for duplicate reference
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('reference', reference.trim())
      .limit(1)
      .maybeSingle()

    if (existingPayment) {
      redirect(`/client/purchase/${packId}/confirm?method=${method}&methodId=${methodId}&error=` +
        encodeURIComponent('Cette référence de transaction a déjà été utilisée.'))
    }
  }

  // Get pack details
  const { data: pack } = await supabase
    .from('packs')
    .select('*')
    .eq('id', packId)
    .single()

  if (!pack) {
    redirect('/client?error=pack_not_found')
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
      redirect(
        `/client/purchase/${packId}/confirm?method=${method}&methodId=${methodId}&error=` +
          encodeURIComponent('Erreur lors de l\'upload de la capture.')
      )
    }

    const { data: urlData } = supabase.storage
      .from('payment-screenshots')
      .getPublicUrl(path)

    screenshotUrl = urlData.publicUrl
  }

  // Generate hotspot credentials
  const { login, password } = generateHotspotCredentials()

  // Create ticket
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .insert({
      user_id: user.id,
      pack_id: packId,
      login_hotspot: login,
      password_hotspot: password,
      status: 'pending',
    })
    .select()
    .single()

  if (ticketError || !ticket) {
    redirect('/client?error=ticket_creation_failed')
  }

  // Create payment record
  const { error: paymentError } = await supabase.from('payments').insert({
    ticket_id: ticket.id,
    user_id: user.id,
    amount: pack.price,
    payment_method: method,
    payment_method_id: methodId || null,
    reference: reference?.trim() || null,
    screenshot_url: screenshotUrl,
    status: isCash ? 'pending' : 'confirmed',
  })

  if (paymentError) {
    redirect('/client?error=payment_creation_failed')
  }

  // Auto-confirm mobile money: create MikroTik user and activate ticket
  if (!isCash) {
    const mikrotikProfile = profileMap[pack.duration_hours ?? 0] ?? '12h'

    const result = await createHotspotUser(
      ticket.login_hotspot,
      ticket.password_hotspot,
      mikrotikProfile
    )

    if (!result.success) {
      redirect('/client?error=' + encodeURIComponent(result.error ?? 'Erreur MikroTik'))
    }

    // Set to active but do NOT set activated_at / expires_at yet
    // Timer starts only when client connects to MikroTik
    await supabase
      .from('tickets')
      .update({ status: 'active' })
      .eq('id', ticket.id)
  }

  revalidatePath('/client/tickets')
  redirect('/client/tickets?success=ticket_purchased')
}
