'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || !confirmPassword) {
    redirect('/reset-password?error=' + encodeURIComponent('Veuillez remplir tous les champs.'))
  }

  if (password !== confirmPassword) {
    redirect('/reset-password?error=' + encodeURIComponent('Les mots de passe ne correspondent pas.'))
  }

  if (password.length < 8) {
    redirect('/reset-password?error=' + encodeURIComponent('Le mot de passe doit contenir au moins 8 caractères.'))
  }

  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasDigit = /[0-9]/.test(password)
  const hasSpecial = /[^A-Za-z0-9]/.test(password)

  if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
    redirect(
      '/reset-password?error=' +
        encodeURIComponent(
          'Le mot de passe doit contenir une majuscule, une minuscule, un chiffre et un caractère spécial.'
        )
    )
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    redirect('/reset-password?error=' + encodeURIComponent(error.message))
  }

  redirect('/login?message=' + encodeURIComponent('Mot de passe modifié avec succès. Connectez-vous.'))
}
