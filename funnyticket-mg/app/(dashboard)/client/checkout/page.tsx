import { createClient } from '@/lib/supabase/server'
import { CheckoutForm } from './CheckoutForm'

export default async function CheckoutPage() {
  const supabase = await createClient()

  // Get all active vendor payment methods
  const { data: methods } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  return <CheckoutForm methods={methods ?? []} />
}
