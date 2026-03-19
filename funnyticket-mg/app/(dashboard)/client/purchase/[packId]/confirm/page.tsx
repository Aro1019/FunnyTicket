import { createClient } from '@/lib/supabase/server'
import { formatPrice, formatDuration } from '@/lib/utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ConfirmForm } from './ConfirmForm'

const METHOD_LABELS: Record<string, string> = {
  mvola: 'Mvola',
  orange_money: 'Orange Money',
  airtel_money: 'Airtel Money',
  cash: 'Espèces',
}

export default async function ConfirmPurchasePage({
  params,
  searchParams,
}: {
  params: Promise<{ packId: string }>
  searchParams: Promise<{ method?: string; methodId?: string }>
}) {
  const { packId } = await params
  const query = await searchParams
  const method = query.method
  const methodId = query.methodId

  if (!method) redirect('/client')

  const supabase = await createClient()

  const { data: pack } = await supabase
    .from('packs')
    .select('*')
    .eq('id', packId)
    .eq('is_active', true)
    .single()

  if (!pack) redirect('/client')

  // Get vendor payment method details if not cash
  let vendorMethod = null
  if (method !== 'cash' && methodId) {
    const { data } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('id', methodId)
      .single()
    vendorMethod = data
  }

  const isCash = method === 'cash'

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link href="/client" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Packs</Link>
        <span>›</span>
        <Link href={`/client/purchase/${packId}`} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{pack.name}</Link>
        <span>›</span>
        <span className="text-indigo-600 dark:text-indigo-400">Confirmation</span>
      </div>

      {/* Pack + method summary */}
      <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-5 mb-8 animate-fade-in-down">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{pack.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatDuration(pack.duration_hours)} · {METHOD_LABELS[method] ?? method}
            </p>
          </div>
          <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatPrice(pack.price)}</span>
        </div>
      </div>

      {/* Vendor payment info for mobile money */}
      {!isCash && vendorMethod && (
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 mb-6 animate-fade-in-up">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Effectuez le paiement</h3>
          <div className="rounded-lg bg-gray-50 dark:bg-gray-700 p-4 space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Envoyez <strong className="text-indigo-600 dark:text-indigo-400">{formatPrice(pack.price)}</strong> au :
            </p>
            <p className="text-lg font-mono font-bold text-gray-900 dark:text-gray-100">{vendorMethod.phone_number}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Titulaire : <strong>{vendorMethod.account_name}</strong>
            </p>
          </div>
          <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
            Une fois le transfert effectué, remplissez le formulaire ci-dessous.
          </p>
        </div>
      )}

      {/* Cash info */}
      {isCash && (
        <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-5 mb-6 animate-fade-in-up">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">💵 Paiement en espèces</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Rendez-vous chez le vendeur pour effectuer le paiement de <strong>{formatPrice(pack.price)}</strong>.
            Votre ticket sera activé une fois que le vendeur aura confirmé la réception du paiement.
          </p>
        </div>
      )}

      {/* Confirmation form */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 animate-scale-in">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">
          {isCash ? 'Confirmer votre demande' : 'Confirmer votre paiement'}
        </h3>
        <ConfirmForm
          packId={packId}
          method={method}
          methodId={methodId ?? ''}
          isCash={isCash}
          price={pack.price}
        />
      </div>
    </div>
  )
}
