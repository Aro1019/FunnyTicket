import { createClient } from '@/lib/supabase/server'
import { addPaymentMethod, removePaymentMethod, togglePaymentMethod } from './actions'
import { SubmitButton } from '@/components/SubmitButton'

const METHOD_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  mvola: { label: 'Mvola', color: 'bg-yellow-100 text-yellow-800', icon: '📱' },
  orange_money: { label: 'Orange Money', color: 'bg-orange-100 text-orange-800', icon: '🟠' },
  airtel_money: { label: 'Airtel Money', color: 'bg-red-100 text-red-800', icon: '🔴' },
}

export default async function AdminPaymentMethodsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: methods } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('admin_id', user!.id)
    .order('created_at', { ascending: true })

  const existingTypes = methods?.map((m) => m.method_type) ?? []
  const availableTypes = ['mvola', 'orange_money', 'airtel_money'].filter(
    (t) => !existingTypes.includes(t)
  )

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Modes de paiement</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Configurez les modes de paiement que vos clients peuvent utiliser.
        Les informations seront visibles par les clients lors de l&apos;achat.
      </p>

      {params?.success && (
        <div className="mb-4 rounded-lg bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-700 dark:text-green-300 animate-fade-in-down">
          {params.success === 'added' && 'Mode de paiement ajouté avec succès !'}
          {params.success === 'removed' && 'Mode de paiement supprimé.'}
          {params.success === 'toggled' && 'Statut mis à jour.'}
        </div>
      )}

      {params?.error && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300 animate-fade-in-down">
          {decodeURIComponent(params.error)}
        </div>
      )}

      {/* Configured methods */}
      <div className="space-y-4 mb-10">
        {!methods?.length ? (
          <div className="rounded-2xl bg-white dark:bg-gray-800 p-8 text-center shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">Aucun mode de paiement configuré.</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Ajoutez au moins un mode de paiement pour que vos clients puissent acheter des tickets.
            </p>
          </div>
        ) : (
          methods.map((method) => {
            const meta = METHOD_LABELS[method.method_type] || METHOD_LABELS.mvola
            return (
              <div
                key={method.id}
                className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700 animate-fade-in-up"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{meta.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">{meta.label}</h3>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            method.is_active
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {method.is_active ? 'Actif' : 'Désactivé'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        <span className="font-medium">{method.phone_number}</span>
                        {' · '}
                        {method.account_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <form action={togglePaymentMethod}>
                      <input type="hidden" name="methodId" value={method.id} />
                      <SubmitButton
                        variant="outline"
                        pendingText="..."
                        className="px-3 py-1.5 text-xs"
                      >
                        {method.is_active ? 'Désactiver' : 'Activer'}
                      </SubmitButton>
                    </form>
                    <form action={removePaymentMethod}>
                      <input type="hidden" name="methodId" value={method.id} />
                      <SubmitButton
                        variant="danger"
                        pendingText="..."
                        className="px-3 py-1.5 text-xs"
                      >
                        Supprimer
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add new method */}
      {availableTypes.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Ajouter un mode de paiement
          </h2>
          <form action={addPaymentMethod} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Type
                </label>
                <select
                  name="methodType"
                  required
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 focus:outline-none"
                >
                  {availableTypes.map((type) => (
                    <option key={type} value={type}>
                      {METHOD_LABELS[type]?.label ?? type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Numéro de téléphone
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  required
                  placeholder="034 00 000 00"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nom du titulaire
                </label>
                <input
                  type="text"
                  name="accountName"
                  required
                  placeholder="NOM Prénom"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
            </div>
            <SubmitButton pendingText="Ajout en cours...">
              Ajouter
            </SubmitButton>
          </form>
        </div>
      )}

      {/* Cash info */}
      <div className="mt-6 rounded-2xl bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-100 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          💰 <strong>Paiement en espèces</strong> : cette option est toujours disponible pour vos clients.
          Lorsqu&apos;un client choisit de payer en cash, le ticket ne sera activé que lorsque vous confirmerez le paiement.
        </p>
      </div>
    </div>
  )
}
