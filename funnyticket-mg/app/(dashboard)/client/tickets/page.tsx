import { createClient } from '@/lib/supabase/server'
import { formatPrice, formatDuration } from '@/lib/utils'
import Link from 'next/link'
import TicketStatusTracker from '@/components/TicketStatusTracker'

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

  const hasActiveOrPending = tickets?.some(
    (t) => t.status === 'active' || t.status === 'pending'
  )

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
        <div className="space-y-8">
          {/* Real-time ticket tracker */}
          {hasActiveOrPending && <TicketStatusTracker />}

          {/* History: expired and cancelled tickets */}
          {tickets.some((t) => t.status === 'expired' || t.status === 'cancelled') && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                Historique
              </h2>
              <div className="space-y-4">
                {tickets
                  .filter((t) => t.status === 'expired' || t.status === 'cancelled')
                  .map((ticket) => {
                    const pack = Array.isArray(ticket.pack) ? ticket.pack[0] : ticket.pack
                    const statusConfig = ticket.status === 'expired'
                      ? { label: 'Expiré', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' }
                      : { label: 'Annulé', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' }

                    return (
                      <div
                        key={ticket.id}
                        className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700 opacity-75"
                      >
                        <div className="flex items-center gap-3">
                          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                            {pack?.name}
                          </h3>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {formatPrice(pack?.price ?? 0)} · {formatDuration(pack?.duration_hours ?? 0)}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Acheté le {new Date(ticket.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
