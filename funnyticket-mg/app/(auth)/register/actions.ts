'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { normalizePhone } from '@/lib/utils'

export async function register(formData: FormData) {
  const supabase = await createClient()

  const identifiant = (formData.get('identifiant') as string).trim().toLowerCase()
  const fullName = (formData.get('fullName') as string).trim()
  const phone = (formData.get('phone') as string).trim()
  const email = ((formData.get('email') as string) ?? '').trim().toLowerCase()
  const password = formData.get('password') as string
  const phoneNormalized = normalizePhone(phone)

  // Build a redirect URL that preserves user input (except password) so the
  // form does not reset on validation errors.
  const redirectWithError = (message: string): never => {
    const params = new URLSearchParams({
      error: message,
      identifiant,
      fullName,
      phone,
      email,
    })
    redirect('/register?' + params.toString())
  }

  // Validate identifiant format
  if (!/^[a-zA-Z0-9_-]{3,}$/.test(identifiant)) {
    redirectWithError(
      "L'identifiant doit contenir au moins 3 caractères (lettres, chiffres, _ ou -)."
    )
  }

  // Email is required
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirectWithError('Adresse email invalide.')
  }

  // Password strength validation (server-side)
  if (password.length < 8) {
    redirectWithError('Le mot de passe doit faire au moins 8 caractères.')
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    redirectWithError('Le mot de passe doit contenir des majuscules et des minuscules.')
  }
  if (!/\d/.test(password)) {
    redirectWithError('Le mot de passe doit contenir au moins un chiffre.')
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    redirectWithError('Le mot de passe doit contenir au moins un caractère spécial.')
  }

  // Check identifiant uniqueness
  const { data: existingIdentifiant } = await supabase
    .from('profiles')
    .select('id')
    .eq('identifiant', identifiant)
    .maybeSingle()

  if (existingIdentifiant) {
    redirectWithError('Cet identifiant est déjà utilisé.')
  }

  // Check phone uniqueness (normalized)
  if (phoneNormalized.length < 10) {
    redirectWithError('Numéro de téléphone invalide.')
  }

  const { data: allPhones } = await supabase
    .from('profiles')
    .select('phone')

  const phoneAlreadyUsed = allPhones?.some(
    (p) => normalizePhone(p.phone) === phoneNormalized
  )

  if (phoneAlreadyUsed) {
    redirectWithError('Ce numéro de téléphone est déjà associé à un compte.')
  }

  // Check email uniqueness
  const { data: existingEmail } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingEmail) {
    redirectWithError('Cet email est déjà utilisé.')
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        identifiant,
        full_name: fullName,
        phone,
        email,
        role: 'user',
      },
    },
  })

  if (error) {
    // Log complet côté serveur uniquement (jamais exposé à l'utilisateur)
    console.error('[register] supabase.auth.signUp error:', {
      message: error.message,
      status: error.status,
      name: error.name,
      identifiant,
      email,
    })

    // Mapping vers des messages compréhensibles, sans révéler de détails internes
    const raw = (error.message || '').toLowerCase()
    let friendly = 'Impossible de créer votre compte pour le moment. Veuillez réessayer dans quelques instants.'

    if (raw.includes('already registered') || raw.includes('already been registered') || raw.includes('user already')) {
      friendly = 'Cet email est déjà associé à un compte. Essayez de vous connecter ou de réinitialiser votre mot de passe.'
    } else if (raw.includes('invalid email')) {
      friendly = 'Adresse email invalide.'
    } else if (raw.includes('password')) {
      friendly = 'Mot de passe refusé. Choisissez un mot de passe plus robuste.'
    } else if (raw.includes('rate') || raw.includes('too many')) {
      friendly = 'Trop de tentatives. Patientez quelques minutes avant de réessayer.'
    } else if (raw.includes('database') || raw.includes('saving new user') || error.status === 500) {
      friendly =
        "Une erreur technique nous empêche de créer votre compte. Vérifiez vos informations (notamment l'email et le téléphone) et réessayez. Si le problème persiste, contactez le support."
    }

    redirectWithError(friendly)
  }

  const successMsg =
    'Compte créé ! Vérifiez votre email. Dès votre premier achat, un ticket WiFi 12h gratuit vous sera offert en bonus ! 🎁'

  redirect('/login?message=' + encodeURIComponent(successMsg))
}
