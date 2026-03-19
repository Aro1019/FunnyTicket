'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function addPaymentMethod(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') redirect('/client')

  const methodType = formData.get('methodType') as string
  const phoneNumber = (formData.get('phoneNumber') as string).trim()
  const accountName = (formData.get('accountName') as string).trim()

  if (!methodType || !phoneNumber || !accountName) {
    redirect('/admin/payment-methods?error=' + encodeURIComponent('Veuillez remplir tous les champs.'))
  }

  const { error } = await supabase.from('payment_methods').insert({
    admin_id: user.id,
    method_type: methodType,
    phone_number: phoneNumber,
    account_name: accountName,
  })

  if (error) {
    redirect(
      '/admin/payment-methods?error=' +
        encodeURIComponent(error.message.includes('unique') ? 'Ce mode de paiement est déjà configuré.' : error.message)
    )
  }

  revalidatePath('/admin/payment-methods')
  redirect('/admin/payment-methods?success=added')
}

export async function removePaymentMethod(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') redirect('/client')

  const methodId = formData.get('methodId') as string

  await supabase.from('payment_methods').delete().eq('id', methodId).eq('admin_id', user.id)

  revalidatePath('/admin/payment-methods')
  redirect('/admin/payment-methods?success=removed')
}

export async function togglePaymentMethod(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') redirect('/client')

  const methodId = formData.get('methodId') as string

  const { data: method } = await supabase
    .from('payment_methods')
    .select('is_active')
    .eq('id', methodId)
    .eq('admin_id', user.id)
    .single()

  if (method) {
    await supabase
      .from('payment_methods')
      .update({ is_active: !method.is_active })
      .eq('id', methodId)
      .eq('admin_id', user.id)
  }

  revalidatePath('/admin/payment-methods')
  redirect('/admin/payment-methods?success=toggled')
}
