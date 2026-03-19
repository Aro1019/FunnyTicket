import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/utils'
import Link from 'next/link'
import SalesChart from '@/components/SalesChart'

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Stats
  const { count: totalTickets } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })

  const { count: activeTickets } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  const { count: pendingPayments } = await supabase
    .from('payments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  const { data: confirmedPayments } = await supabase
    .from('payments')
    .select('amount')
    .eq('status', 'confirmed')

  const totalRevenue =
    confirmedPayments?.reduce((sum, p) => sum + p.amount, 0) ?? 0

  // Recent pending payments
  const { data: recentPending } = await supabase
    .from('payments')
    .select('*, ticket:tickets(*, pack:packs(*)), user:profiles(*)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Tableau de bord</h1>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700 animate-card-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total tickets</p>
          <p className="mt-1 text-3xl font-bold text-gray-800 dark:text-gray-100">
            {totalTickets ?? 0}
          </p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700 animate-card-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">Tickets actifs</p>
          <p className="mt-1 text-3xl font-bold text-green-600 dark:text-green-400">
            {activeTickets ?? 0}
          </p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700 animate-card-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">Paiements en attente</p>
          <p className="mt-1 text-3xl font-bold text-yellow-600 dark:text-yellow-400">
            {pendingPayments ?? 0}
          </p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700 animate-card-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Chiffre d&apos;affaires</p>
          <p className="mt-1 text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            {formatPrice(totalRevenue)}
          </p>
        </div>
      </div>

      {/* Sales Chart */}
      <SalesChart />

      {/* Recent Pending Payments */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Paiements en attente
          </h2>
          <Link
            href="/admin/payments"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            Voir tout →
          </Link>
        </div>

        {!recentPending?.length ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Aucun paiement en attente.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recentPending.map((payment) => {
              const user = Array.isArray(payment.user)
                ? payment.user[0]
                : payment.user
              const ticket = Array.isArray(payment.ticket)
                ? payment.ticket[0]
                : payment.ticket
              const pack = ticket?.pack
              const packData = Array.isArray(pack) ? pack[0] : pack

              return (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 px-6"
                >
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-100">
                      {user?.full_name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {packData?.name} · {formatPrice(payment.amount)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {payment.payment_method.replace('_', ' ')} · Réf:{' '}
                      {payment.reference}
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-yellow-100 dark:bg-yellow-900/30 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:text-yellow-300">
                    En attente
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
