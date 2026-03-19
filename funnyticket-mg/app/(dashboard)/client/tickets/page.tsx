import { createClient } from '@/lib/supabase/server'
import { formatPrice, formatDuration } from '@/lib/utils'
import Link from 'next/link'

export default async function MyTicketsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: tickets } = await supabase
    .from('tickets')
    .select('*, pack:packs(*), payment:payments(*)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
    active: { label: 'Actif', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
    expired: { label: 'Expiré', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
    cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Mes tickets</h1>

      {!tickets?.length ? (
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-8 text-center shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Aucun ticket pour le moment.</p>
          <Link
            href="/client"
            className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Acheter un ticket
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => {
            const status = statusLabels[ticket.status] || statusLabels.pending
            const pack = Array.isArray(ticket.pack) ? ticket.pack[0] : ticket.pack
            const payments = Array.isArray(ticket.payment) ? ticket.payment : []
            const payment = payments[0]

            return (
              <div
                key={ticket.id}
                className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                        {pack?.name}
                      </h3>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {formatPrice(pack?.price ?? 0)} ·{' '}
                      {formatDuration(pack?.duration_hours ?? 0)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Acheté le{' '}
                      {new Date(ticket.created_at).toLocaleDateString('fr-FR')}
                    </p>
                    {payment && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {payment.payment_method === 'cash'
                          ? '💵 Paiement en espèces'
                          : payment.payment_method.replace('_', ' ')}
                        {payment.reference && ` · Réf: ${payment.reference}`}
                      </p>
                    )}
                  </div>

                  {ticket.status === 'active' && (
                    <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/30 p-4 text-center min-w-[200px]">
                      <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-2">
                        Identifiants WiFi
                      </p>
                      <div className="space-y-1">
                        <p className="text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Login:</span>{' '}
                          <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                            {ticket.login_hotspot}
                          </span>
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Mot de passe:</span>{' '}
                          <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                            {ticket.password_hotspot}
                          </span>
                        </p>
                      </div>
                      {ticket.expires_at && (
                        <p className="mt-2 text-xs text-indigo-500 dark:text-indigo-400">
                          Expire le{' '}
                          {new Date(ticket.expires_at).toLocaleDateString('fr-FR')}{' '}
                          à{' '}
                          {new Date(ticket.expires_at).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>
                  )}

                  {ticket.status === 'pending' && (
                    <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/20 p-4 text-center min-w-[200px]">
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                        En attente de validation
                      </p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                        Votre paiement est en cours de vérification
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
