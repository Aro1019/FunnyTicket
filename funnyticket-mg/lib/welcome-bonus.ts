import type { SupabaseClient } from '@supabase/supabase-js'
import { generateHotspotCredentials, normalizePhone } from './utils'
import { createHotspotUser } from './mikrotik'

/**
 * Délivre un ticket WiFi 12h gratuit lors du 1er paiement confirmé d'un
 * utilisateur, à condition qu'aucun ticket cadeau n'ait déjà été émis pour
 * son numéro de téléphone normalisé (anti-abus multi-comptes).
 *
 * - Ne fait rien si l'utilisateur a déjà au moins un paiement confirmé
 *   antérieur (en excluant `excludePaymentId` si fourni).
 * - Ne fait rien si une entrée existe déjà dans `welcome_tickets` pour ce
 *   téléphone (préserve les données déjà délivrées par l'ancien flux).
 * - N'échoue jamais : tous les chemins d'erreur sont silencieux pour ne pas
 *   bloquer la confirmation du paiement appelante.
 *
 * @returns `true` si un ticket bonus a été émis, `false` sinon.
 */
export async function tryGrantWelcomeBonus(
  supabase: SupabaseClient,
  userId: string,
  excludePaymentId: string | null = null
): Promise<boolean> {
  try {
    // Vérifier qu'il n'y a pas d'autre paiement déjà confirmé pour cet utilisateur
    let query = supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'confirmed')

    if (excludePaymentId) {
      query = query.neq('id', excludePaymentId)
    }

    const { count: previousConfirmedCount } = await query

    if ((previousConfirmedCount ?? 0) > 0) {
      return false
    }

    // 1er achat confirmé : récupérer le profil pour avoir le téléphone
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', userId)
      .single()

    if (!buyerProfile?.phone) return false

    const phoneNormalized = normalizePhone(buyerProfile.phone)

    // Vérifier qu'aucun ticket cadeau n'a déjà été délivré pour ce téléphone
    const { data: existingWelcome } = await supabase
      .from('welcome_tickets')
      .select('id')
      .eq('phone_normalized', phoneNormalized)
      .maybeSingle()

    if (existingWelcome) return false

    // Trouver le pack 12h actif
    const { data: welcomePack } = await supabase
      .from('packs')
      .select('id')
      .eq('duration_hours', 12)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (!welcomePack) return false

    const { login, password: hotspotPwd } = generateHotspotCredentials()
    const mikrotikResult = await createHotspotUser(login, hotspotPwd, '12h')
    const ticketStatus = mikrotikResult.success ? 'active' : 'pending'

    const { data: welcomeTicket } = await supabase
      .from('tickets')
      .insert({
        user_id: userId,
        pack_id: welcomePack.id,
        login_hotspot: login,
        password_hotspot: hotspotPwd,
        status: ticketStatus,
      })
      .select()
      .single()

    if (!welcomeTicket) return false

    await supabase.from('welcome_tickets').insert({
      user_id: userId,
      phone_normalized: phoneNormalized,
      ticket_id: welcomeTicket.id,
    })

    return true
  } catch {
    return false
  }
}
