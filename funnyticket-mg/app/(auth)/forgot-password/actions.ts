'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

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

  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'localhost:3000'
  const protocol = headersList.get('x-forwarded-proto') || 'http'
  const origin = `${protocol}://${host}`

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  })

  if (error) {
    redirect('/forgot-password?error=' + encodeURIComponent('Erreur lors de l\'envoi. Réessayez.'))
  }

  redirect(
    '/forgot-password?success=' +
      encodeURIComponent('Un lien de réinitialisation a été envoyé à votre adresse email.')
  )
}
