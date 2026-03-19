'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const identifier = (formData.get('identifier') as string).trim()
  const password = formData.get('password') as string

  if (!identifier || !password) {
    redirect('/login?error=' + encodeURIComponent('Veuillez remplir tous les champs.'))
  }

  // Determine if identifier is an email or a username
  let email: string

  if (identifier.includes('@')) {
    // User typed an email — try login directly
    email = identifier
  } else {
    // User typed an identifiant — resolve to auth email
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, identifiant')
      .eq('identifiant', identifier)
      .maybeSingle()

    if (!profile) {
      redirect('/login?error=' + encodeURIComponent('Identifiant ou mot de passe incorrect.'))
    }

    // If the user registered with a real email, use it; otherwise use the generated one
    email = profile.email || `${identifier}@funnyticket.local`
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect('/login?error=' + encodeURIComponent('Identifiant ou mot de passe incorrect.'))
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    revalidatePath('/', 'layout')
    redirect(profile?.role === 'admin' ? '/admin' : '/client')
  }

  revalidatePath('/', 'layout')
  redirect('/client')
}
