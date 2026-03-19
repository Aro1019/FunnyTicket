'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { generateHotspotCredentials } from '@/lib/utils'

export async function confirmPurchase(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const packId = formData.get('packId') as string
  const method = formData.get('method') as string
  const methodId = formData.get('methodId') as string
  const proofMode = formData.get('proofMode') as string
  const reference = formData.get('reference') as string | null
  const screenshot = formData.get('screenshot') as File | null

  if (!packId || !method) {
    redirect('/client?error=missing_fields')
  }

  const isCash = method === 'cash'

  // Validate proof for non-cash payments
  if (!isCash) {
    if (proofMode === 'reference' && !reference?.trim()) {
      redirect(`/client/purchase/${packId}/confirm?method=${method}&methodId=${methodId}&error=reference_required`)
    }
    if (proofMode === 'screenshot' && (!screenshot || screenshot.size === 0)) {
      redirect(`/client/purchase/${packId}/confirm?method=${method}&methodId=${methodId}&error=screenshot_required`)
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
    status: 'pending',
  })

  if (paymentError) {
    redirect('/client?error=payment_creation_failed')
  }

  revalidatePath('/client/tickets')
  redirect('/client/tickets?success=ticket_purchased')
}
