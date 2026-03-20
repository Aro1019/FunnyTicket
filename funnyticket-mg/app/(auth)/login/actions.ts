'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

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
    // Use service role to bypass RLS (user is not authenticated yet)
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: profile } = await serviceClient
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
    const role = profile?.role
    redirect(role === 'superadmin' ? '/superadmin' : role === 'admin' ? '/admin' : '/client')
  }

  revalidatePath('/', 'layout')
  redirect('/client')
}
