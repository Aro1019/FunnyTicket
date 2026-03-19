import { createClient } from '@/lib/supabase/server'
import { formatPrice, formatDuration } from '@/lib/utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const METHOD_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  mvola: { label: 'Mvola', icon: '📱', color: 'border-yellow-300 bg-yellow-50' },
  orange_money: { label: 'Orange Money', icon: '🟠', color: 'border-orange-300 bg-orange-50' },
  airtel_money: { label: 'Airtel Money', icon: '🔴', color: 'border-red-300 bg-red-50' },
}

export default async function PurchasePage({
  params,
}: {
  params: Promise<{ packId: string }>
}) {
  const { packId } = await params
  const supabase = await createClient()

  const { data: pack } = await supabase
    .from('packs')
    .select('*')
    .eq('id', packId)
    .eq('is_active', true)
    .single()

  if (!pack) redirect('/client')

  // Get all active vendor payment methods
  const { data: methods } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link href="/client" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Packs</Link>
        <span>›</span>
        <span className="text-gray-800 dark:text-gray-100 font-medium">{pack.name}</span>
        <span>›</span>
        <span className="text-indigo-600 dark:text-indigo-400">Paiement</span>
      </div>

      {/* Pack summary */}
      <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-5 mb-8 animate-fade-in-down">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{pack.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{pack.description} · {formatDuration(pack.duration_hours)}</p>
          </div>
          <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatPrice(pack.price)}</span>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Choisissez votre mode de paiement</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Sélectionnez le mode de paiement qui vous convient, effectuez le transfert, puis confirmez.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Mobile money methods */}
        {methods?.map((method, index) => {
          const meta = METHOD_LABELS[method.method_type] || METHOD_LABELS.mvola
          return (
            <Link
              key={method.id}
              href={`/client/purchase/${packId}/confirm?method=${method.method_type}&methodId=${method.id}`}
              className={`rounded-2xl border-2 p-6 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 animate-card-${index + 1} ${meta.color}`}
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{meta.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100">{meta.label}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    <span className="font-mono font-medium">{method.phone_number}</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Titulaire : {method.account_name}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Envoyez <strong>{formatPrice(pack.price)}</strong> au numéro ci-dessus puis confirmez →
              </p>
            </Link>
          )
        })}

        {/* Cash option — always available */}
        <Link
          href={`/client/purchase/${packId}/confirm?method=cash`}
          className={`rounded-2xl border-2 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 p-6 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 animate-card-${(methods?.length ?? 0) + 1}`}
        >
          <div className="flex items-center gap-4">
            <span className="text-3xl">💵</span>
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">Paiement en espèces</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Payez directement chez le vendeur
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Le ticket sera activé après confirmation du vendeur →
          </p>
        </Link>
      </div>

      {(!methods || methods.length === 0) && (
        <div className="mt-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-3 text-sm text-yellow-700 dark:text-yellow-300">
          Aucun mode de paiement mobile configuré par le vendeur. Vous pouvez payer en espèces.
        </div>
      )}
    </div>
  )
}
