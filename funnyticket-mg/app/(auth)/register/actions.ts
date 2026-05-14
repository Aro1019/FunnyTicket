'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { normalizePhone, generateHotspotCredentials } from '@/lib/utils'
import { createHotspotUser } from '@/lib/mikrotik'

export async function register(formData: FormData) {
  const supabase = await createClient()

  const identifiant = (formData.get('identifiant') as string).trim()
  const fullName = (formData.get('fullName') as string).trim()
  const phone = (formData.get('phone') as string).trim()
  const email = (formData.get('email') as string)?.trim() || ''
  const password = formData.get('password') as string
  const phoneNormalized = normalizePhone(phone)

  // Validate identifiant format
  if (!/^[a-zA-Z0-9_-]{3,}$/.test(identifiant)) {
    redirect(
      '/register?error=' +
        encodeURIComponent(
          "L'identifiant doit contenir au moins 3 caractères (lettres, chiffres, _ ou -)."
        )
    )
  }

  // Password strength validation (server-side)
  if (password.length < 8) {
    redirect('/register?error=' + encodeURIComponent('Le mot de passe doit faire au moins 8 caractères.'))
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    redirect('/register?error=' + encodeURIComponent('Le mot de passe doit contenir des majuscules et des minuscules.'))
  }
  if (!/\d/.test(password)) {
    redirect('/register?error=' + encodeURIComponent('Le mot de passe doit contenir au moins un chiffre.'))
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    redirect('/register?error=' + encodeURIComponent('Le mot de passe doit contenir au moins un caractère spécial.'))
  }

  // Check identifiant uniqueness
  const { data: existingIdentifiant } = await supabase
    .from('profiles')
    .select('id')
    .eq('identifiant', identifiant)
    .maybeSingle()

  if (existingIdentifiant) {
    redirect('/register?error=' + encodeURIComponent('Cet identifiant est déjà utilisé.'))
  }

  // Check phone uniqueness (normalized)
  if (phoneNormalized.length < 10) {
    redirect('/register?error=' + encodeURIComponent('Numéro de téléphone invalide.'))
  }

  const { data: allPhones } = await supabase
    .from('profiles')
    .select('phone')

  const phoneAlreadyUsed = allPhones?.some(
    (p) => normalizePhone(p.phone) === phoneNormalized
  )

  if (phoneAlreadyUsed) {
    redirect('/register?error=' + encodeURIComponent('Ce numéro de téléphone est déjà associé à un compte.'))
  }

  // Check if this phone already received a welcome ticket
  const { data: existingWelcome } = await supabase
    .from('welcome_tickets')
    .select('id')
    .eq('phone_normalized', phoneNormalized)
    .maybeSingle()

  // Check email uniqueness (if provided)
  if (email) {
    const { data: existingEmail } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingEmail) {
      redirect('/register?error=' + encodeURIComponent('Cet email est déjà utilisé.'))
    }
  }

  // Use identifiant-based email if no real email provided
  // Supabase Auth requires an email — we generate a placeholder
  const authEmail = email || `${identifiant}@funnyticket.local`

  const { data: signUpData, error } = await supabase.auth.signUp({
    email: authEmail,
    password,
    options: {
      data: {
        identifiant,
        full_name: fullName,
        phone,
        email: email || null,
        role: 'user',
      },
    },
  })

  if (error) {
    redirect('/register?error=' + encodeURIComponent(error.message))
  }

  // Create welcome ticket (free 12h) if phone never received one
  if (signUpData?.user && !existingWelcome) {
    try {
      const userId = signUpData.user.id

      // Find the 12h pack (1000 Ar)
      const { data: welcomePack } = await supabase
        .from('packs')
        .select('id, duration_hours')
        .eq('duration_hours', 12)
        .eq('is_active', true)
        .limit(1)
        .single()

      if (welcomePack) {
        const { login, password: hotspotPwd } = generateHotspotCredentials()

        // Create MikroTik hotspot user
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

        if (welcomeTicket) {
          await supabase.from('welcome_tickets').insert({
            user_id: userId,
            phone_normalized: phoneNormalized,
            ticket_id: welcomeTicket.id,
          })
        }
      }
    } catch {
      // Welcome ticket creation failed silently — don't block registration
    }
  }

  const successMsg = email
    ? 'Compte créé ! Vérifiez votre email. Un ticket WiFi 12h gratuit vous a été offert ! 🎁'
    : 'Compte créé ! Un ticket WiFi 12h gratuit vous a été offert ! 🎁 Connectez-vous.'

  redirect('/login?message=' + encodeURIComponent(successMsg))
}
