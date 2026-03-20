'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const fullName = (formData.get('full_name') as string).trim()
  const phone = (formData.get('phone') as string).trim()

  if (!fullName) {
    redirect('/settings?error=' + encodeURIComponent('Le nom complet est requis.'))
  }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName, phone })
    .eq('id', user.id)

  if (error) {
    redirect('/settings?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/settings')
  revalidatePath('/', 'layout')
  redirect('/settings?success=' + encodeURIComponent('Profil mis à jour avec succès.'))
}

export async function changePassword(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const currentPassword = formData.get('currentPassword') as string
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!currentPassword || !newPassword || !confirmPassword) {
    redirect('/settings?error=' + encodeURIComponent('Veuillez remplir tous les champs.'))
  }

  if (newPassword !== confirmPassword) {
    redirect('/settings?error=' + encodeURIComponent('Les nouveaux mots de passe ne correspondent pas.'))
  }

  if (newPassword.length < 8) {
    redirect('/settings?error=' + encodeURIComponent('Le mot de passe doit contenir au moins 8 caractères.'))
  }

  const hasUpper = /[A-Z]/.test(newPassword)
  const hasLower = /[a-z]/.test(newPassword)
  const hasDigit = /[0-9]/.test(newPassword)
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword)

  if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
    redirect(
      '/settings?error=' +
        encodeURIComponent(
          'Le mot de passe doit contenir une majuscule, une minuscule, un chiffre et un caractère spécial.'
        )
    )
  }

  // Verify current password by re-signing in
  const email = user.email
  if (!email) {
    redirect('/settings?error=' + encodeURIComponent('Impossible de vérifier le mot de passe actuel.'))
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  })

  if (signInError) {
    redirect('/settings?error=' + encodeURIComponent('Mot de passe actuel incorrect.'))
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })

  if (error) {
    redirect('/settings?error=' + encodeURIComponent(error.message))
  }

  redirect('/settings?success=' + encodeURIComponent('Mot de passe modifié avec succès.'))
}
