'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function register(formData: FormData) {
  const supabase = await createClient()

  const identifiant = (formData.get('identifiant') as string).trim()
  const fullName = (formData.get('fullName') as string).trim()
  const phone = (formData.get('phone') as string).trim()
  const email = (formData.get('email') as string)?.trim() || ''
  const password = formData.get('password') as string

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

  const { error } = await supabase.auth.signUp({
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

  const successMsg = email
    ? 'Compte créé avec succès ! Vérifiez votre email pour confirmer votre inscription.'
    : 'Compte créé avec succès ! Vous pouvez maintenant vous connecter.'

  redirect('/login?message=' + encodeURIComponent(successMsg))
}
