import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/utils'
import { confirmPayment, rejectPayment } from '../actions'
import { SubmitButton } from '@/components/SubmitButton'

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: payments } = await supabase
    .from('payments')
    .select('*, ticket:tickets(*, pack:packs(*)), user:profiles(*), order:orders(*)')
    .order('created_at', { ascending: false })

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
    confirmed: { label: 'Confirmé', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
    rejected: { label: 'Rejeté', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
        Gestion des paiements
      </h1>

      {params?.success && (
        <div className="mb-4 rounded-lg bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-700 dark:text-green-300 animate-fade-in-down">
          {params.success === 'payment_confirmed'
            ? 'Paiement confirmé et ticket activé avec succès !'
            : 'Paiement rejeté.'}
        </div>
      )}

      {params?.error && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300 animate-fade-in-down">
          Erreur : {decodeURIComponent(params.error)}
        </div>
      )}

      <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {!payments?.length ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Aucun paiement.</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {payments.map((payment) => {
              const status =
                statusLabels[payment.status] || statusLabels.pending
              const user = Array.isArray(payment.user)
                ? payment.user[0]
                : payment.user
              const ticket = Array.isArray(payment.ticket)
                ? payment.ticket[0]
                : payment.ticket
              const pack = ticket?.pack
              const packData = Array.isArray(pack) ? pack[0] : pack
              const isOrder = !!payment.order_id

              return (
                <div key={payment.id} className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="font-semibold text-gray-800 dark:text-gray-100">
                          {user?.full_name}
                        </p>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}
                        >
                          {status.label}
                        </span>
                        {isOrder && (
                          <span className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                            📦 Commande
                          </span>
                        )}
                        {payment.payment_method === 'cash' && (
                          <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-300">
                            💵 Cash
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {isOrder
                          ? `${formatPrice(payment.amount)} (commande multi-tickets)`
                          : `${packData?.name} · ${formatPrice(payment.amount)}`}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {payment.payment_method === 'cash'
                          ? 'Paiement en espèces'
                          : payment.payment_method.replace('_', ' ')}
                        {payment.reference && (
                          <>
                            {' · Réf: '}
                            <span className="font-mono font-medium">
                              {payment.reference}
                            </span>
                          </>
                        )}
                      </p>
                      {payment.screenshot_url && (
                        <a
                          href={payment.screenshot_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1 text-xs text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                        >
                          📸 Voir la capture d&apos;écran
                        </a>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {new Date(payment.created_at).toLocaleDateString(
                          'fr-FR'
                        )}{' '}
                        à{' '}
                        {new Date(payment.created_at).toLocaleTimeString(
                          'fr-FR',
                          { hour: '2-digit', minute: '2-digit' }
                        )}
                      </p>
                      {user?.phone && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Tél: {user.phone}
                        </p>
                      )}
                    </div>

                    {payment.status === 'pending' && (
                      <div className="flex gap-2">
                        <form action={confirmPayment}>
                          <input
                            type="hidden"
                            name="paymentId"
                            value={payment.id}
                          />
                          <SubmitButton variant="success" pendingText="Validation...">
                            ✓ Confirmer
                          </SubmitButton>
                        </form>
                        <form action={rejectPayment}>
                          <input
                            type="hidden"
                            name="paymentId"
                            value={payment.id}
                          />
                          <SubmitButton variant="danger" pendingText="Rejet...">
                            ✕ Rejeter
                          </SubmitButton>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
