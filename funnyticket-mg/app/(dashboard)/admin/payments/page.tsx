'use client'

import { useEffect, useState, useCallback } from 'react'

interface CashPayment {
  id: string
  amount: number
  confirmed_at: string
  cash_received: boolean
  cash_received_at: string | null
  user_name: string
  user_identifiant: string
  user_phone: string
  pack_name: string
  is_order: boolean
}

interface Stats {
  pending: number
  received: number
  total: number
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-MG').format(price) + ' Ar'
}

export default function CashTrackingPage() {
  const [payments, setPayments] = useState<CashPayment[]>([])
  const [stats, setStats] = useState<Stats>({ pending: 0, received: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'received' | 'all'>('pending')
  const [search, setSearch] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      params.set('filter', filter)
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/cash-tracking?${params}`)
      if (!res.ok) return
      const data = await res.json()
      setPayments(data.payments ?? [])
      setStats(data.stats ?? { pending: 0, received: 0, total: 0 })
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [filter, search])

  useEffect(() => {
    setLoading(true)
    fetchData()
  }, [fetchData])

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('filter', filter)
    if (debouncedSearch) params.set('search', debouncedSearch)
    fetch(`/api/admin/cash-tracking?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setPayments(data.payments ?? [])
        setStats(data.stats ?? { pending: 0, received: 0, total: 0 })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filter, debouncedSearch])

  async function toggleReceived(paymentId: string, currentValue: boolean) {
    setToggling(paymentId)
    try {
      const res = await fetch('/api/admin/cash-tracking', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, received: !currentValue }),
      })
      if (res.ok) {
        setPayments((prev) =>
          prev.map((p) =>
            p.id === paymentId
              ? { ...p, cash_received: !currentValue, cash_received_at: !currentValue ? new Date().toISOString() : null }
              : p
          )
        )
        // Update stats
        setStats((prev) => ({
          ...prev,
          pending: !currentValue ? prev.pending - 1 : prev.pending + 1,
          received: !currentValue ? prev.received + 1 : prev.received - 1,
        }))
      }
    } catch {
      alert('Erreur réseau')
    } finally {
      setToggling(null)
    }
  }

  const tabClass = (active: boolean) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
      active
        ? 'bg-indigo-600 text-white'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
        Validation paiement
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">Non encaissé</p>
        </div>
        <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.received}</p>
          <p className="text-xs text-green-700 dark:text-green-300 mt-1">Encaissé</p>
        </div>
        <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-4 text-center">
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.total}</p>
          <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">Total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-2">
          <button onClick={() => setFilter('pending')} className={tabClass(filter === 'pending')}>
            Non encaissé ({stats.pending})
          </button>
          <button onClick={() => setFilter('received')} className={tabClass(filter === 'received')}>
            Encaissé ({stats.received})
          </button>
          <button onClick={() => setFilter('all')} className={tabClass(filter === 'all')}>
            Tous
          </button>
        </div>
        <div className="flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, identifiant, tél..."
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/5" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6" />
              </div>
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {filter === 'pending'
              ? 'Tous les paiements en espèces ont été encaissés.'
              : filter === 'received'
                ? 'Aucun paiement encaissé.'
                : 'Aucun paiement en espèces.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-indigo-600 dark:bg-indigo-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Encaissé</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Pack</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Montant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Validé le</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Encaissé le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                    {/* Checkbox */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleReceived(payment.id, payment.cash_received)}
                        disabled={toggling === payment.id}
                        className="cursor-pointer disabled:cursor-wait"
                      >
                        <div
                          className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                            payment.cash_received
                              ? 'border-green-500 bg-green-500'
                              : 'border-gray-300 dark:border-gray-500 hover:border-indigo-400'
                          }`}
                        >
                          {payment.cash_received && (
                            <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    </td>
                    {/* Client */}
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{payment.user_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{payment.user_identifiant}</p>
                      {payment.user_phone && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">{payment.user_phone}</p>
                      )}
                    </td>
                    {/* Pack */}
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900 dark:text-gray-100">{payment.pack_name}</p>
                      {payment.is_order && (
                        <span className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:text-indigo-300">
                          📦 Commande
                        </span>
                      )}
                    </td>
                    {/* Amount */}
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatPrice(payment.amount)}</p>
                    </td>
                    {/* Confirmed at */}
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {payment.confirmed_at
                        ? new Date(payment.confirmed_at).toLocaleString('fr-FR', {
                            day: '2-digit', month: '2-digit', year: '2-digit',
                            hour: '2-digit', minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    {/* Cash received at */}
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {payment.cash_received && payment.cash_received_at ? (
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          {new Date(payment.cash_received_at).toLocaleString('fr-FR', {
                            day: '2-digit', month: '2-digit', year: '2-digit',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      ) : (
                        <span className="text-yellow-600 dark:text-yellow-400">En attente</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
