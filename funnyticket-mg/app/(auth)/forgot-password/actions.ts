'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function forgotPassword(formData: FormData) {
  const supabase = await createClient()
  const identifier = (formData.get('identifier') as string).trim()

  if (!identifier) {
    redirect('/forgot-password?error=' + encodeURIComponent('Veuillez saisir votre identifiant ou email.'))
  }

  let email: string

  if (identifier.includes('@')) {
    email = identifier
  } else {
    // Resolve identifiant to email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, identifiant')
      .eq('identifiant', identifier)
      .maybeSingle()

    if (!profile || !profile.email || profile.email.endsWith('@funnyticket.local')) {
      redirect(
        '/forgot-password?error=' +
          encodeURIComponent(
            'Aucune adresse email associée à ce compte. Contactez l\'administrateur.'
          )
      )
    }

    email = profile.email
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email)

  if (error) {
    redirect('/forgot-password?error=' + encodeURIComponent('Erreur lors de l\'envoi. Réessayez.'))
  }

  redirect(
    '/verify-code?email=' + encodeURIComponent(email) +
    '&success=' + encodeURIComponent('Un code de vérification a été envoyé à votre adresse email.')
  )
}
