'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatPrice, formatDuration } from '@/lib/utils'

interface AdminTicket {
  id: string
  login_hotspot: string
  password_hotspot: string
  status: string
  pack_name: string
  pack_price: number
  duration_hours: number
  activated_at: string | null
  expires_at: string | null
  created_at: string
  user_name: string
  user_identifiant: string
  user_phone: string
  payment_id?: string
  payment_method?: string
  payment_status?: string
  payment_reference?: string
  payment_screenshot_url?: string
  session_online: boolean
  remaining_seconds: number
  usage_status: string
}

interface Filters {
  search: string
  paymentStatus: string
  paymentMethod: string
  ticketStatus: string
  packDuration: string
  dateFrom: string
  dateTo: string
}

const usageStatusConfig: Record<string, { label: string; color: string; dot: string }> = {
  pending: { label: 'En attente', color: 'text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30', dot: 'bg-yellow-500' },
  not_started: { label: 'Non connecté', color: 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30', dot: 'bg-blue-500' },
  in_use: { label: 'Connecté', color: 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30', dot: 'bg-green-500 animate-pulse' },
  paused: { label: 'Hors ligne', color: 'text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30', dot: 'bg-orange-500' },
  expired: { label: 'Expiré', color: 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700', dot: 'bg-gray-500' },
}

const paymentMethodLabels: Record<string, string> = {
  cash: '💵 Espèces',
  mvola: '📱 Mvola',
  orange_money: '🟠 Orange Money',
  airtel_money: '🔴 Airtel Money',
}

const paymentStatusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  confirmed: { label: 'Confirmé', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  rejected: { label: 'Rejeté', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
}

function formatTimeLeft(seconds: number): string {
  if (seconds <= 0) return 'Expiré'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}j ${h}h`
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}

export default function AdminTicketsTable() {
  const [tickets, setTickets] = useState<AdminTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const [filters, setFilters] = useState<Filters>({
    search: '',
    paymentStatus: '',
    paymentMethod: '',
    ticketStatus: '',
    packDuration: '',
    dateFrom: '',
    dateTo: '',
  })
  const [appliedFilters, setAppliedFilters] = useState<Filters>(filters)

  const fetchTickets = useCallback(async (p: number, f: Filters) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(p))
      if (f.search) params.set('search', f.search)
      if (f.paymentStatus) params.set('paymentStatus', f.paymentStatus)
      if (f.paymentMethod) params.set('paymentMethod', f.paymentMethod)
      if (f.ticketStatus) params.set('ticketStatus', f.ticketStatus)
      if (f.packDuration) params.set('packDuration', f.packDuration)
      if (f.dateFrom) params.set('dateFrom', f.dateFrom)
      if (f.dateTo) params.set('dateTo', f.dateTo)

      const res = await fetch(`/api/admin/tickets?${params}`)
      if (!res.ok) return
      const data = await res.json()
      setTickets(data.tickets ?? [])
      setTotalPages(data.totalPages ?? 1)
      setTotal(data.total ?? 0)
      setLastUpdate(new Date())
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTickets(page, appliedFilters)
    const interval = setInterval(() => fetchTickets(page, appliedFilters), 30000)
    return () => clearInterval(interval)
  }, [page, appliedFilters, fetchTickets])

  // Debounced instant search
  useEffect(() => {
    const timeout = setTimeout(() => {
      setAppliedFilters((prev) => {
        if (prev.search === filters.search) return prev
        setPage(1)
        return { ...prev, search: filters.search }
      })
    }, 300)
    return () => clearTimeout(timeout)
  }, [filters.search])

  function applyFilters() {
    setPage(1)
    setAppliedFilters({ ...filters })
  }

  function resetFilters() {
    const empty: Filters = { search: '', paymentStatus: '', paymentMethod: '', ticketStatus: '', packDuration: '', dateFrom: '', dateTo: '' }
    setFilters(empty)
    setAppliedFilters(empty)
    setPage(1)
  }

  async function handlePaymentAction(paymentId: string, action: 'confirm' | 'reject') {
    if (actionLoading) return
    setActionLoading(paymentId + action)
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/${action}`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Erreur')
      } else {
        fetchTickets(page, appliedFilters)
      }
    } catch {
      alert('Erreur réseau')
    } finally {
      setActionLoading(null)
    }
  }

  const hasActiveFilters = Object.values(appliedFilters).some(Boolean)

  const selectClass = 'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none'
  const inputClass = selectClass

  return (
    <div>
      {/* Filters */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Filtres</h3>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="text-xs text-red-500 hover:text-red-600 font-medium cursor-pointer">
              Réinitialiser
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Recherche</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Nom, identifiant, tél, réf paiement..."
              className={inputClass + ' w-full'}
            />
          </div>

          {/* Payment status */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">État du paiement</label>
            <select
              value={filters.paymentStatus}
              onChange={(e) => setFilters((f) => ({ ...f, paymentStatus: e.target.value }))}
              className={selectClass + ' w-full'}
            >
              <option value="">Tous</option>
              <option value="pending">En attente</option>
              <option value="confirmed">Confirmé</option>
              <option value="rejected">Rejeté</option>
            </select>
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Type de paiement</label>
            <select
              value={filters.paymentMethod}
              onChange={(e) => setFilters((f) => ({ ...f, paymentMethod: e.target.value }))}
              className={selectClass + ' w-full'}
            >
              <option value="">Tous</option>
              <option value="cash">Espèces</option>
              <option value="mvola">Mvola</option>
              <option value="orange_money">Orange Money</option>
              <option value="airtel_money">Airtel Money</option>
            </select>
          </div>

          {/* Ticket status */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">État du ticket</label>
            <select
              value={filters.ticketStatus}
              onChange={(e) => setFilters((f) => ({ ...f, ticketStatus: e.target.value }))}
              className={selectClass + ' w-full'}
            >
              <option value="">Tous (actifs)</option>
              <option value="pending">En attente</option>
              <option value="active">Actif</option>
              <option value="not_started">Non connecté</option>
              <option value="in_use">Connecté</option>
              <option value="paused">Hors ligne</option>
              <option value="expired">Expiré</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>

          {/* Pack duration */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Durée du pack</label>
            <select
              value={filters.packDuration}
              onChange={(e) => setFilters((f) => ({ ...f, packDuration: e.target.value }))}
              className={selectClass + ' w-full'}
            >
              <option value="">Tous</option>
              <option value="12">12 heures</option>
              <option value="168">1 semaine</option>
              <option value="720">1 mois</option>
            </select>
          </div>

          {/* Date from */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date début</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              className={inputClass + ' w-full'}
            />
          </div>

          {/* Date to */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date fin</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              className={inputClass + ' w-full'}
            />
          </div>

          {/* Apply button */}
          <div className="flex items-end">
            <button
              onClick={applyFilters}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              Appliquer les filtres
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {total} ticket{total !== 1 ? 's' : ''} trouvé{total !== 1 ? 's' : ''}
          {hasActiveFilters && ' (filtré)'}
        </p>
        {lastUpdate && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Mis à jour à {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading && tickets.length === 0 ? (
          <div className="p-8">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 mb-4 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6" />
              </div>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Aucun ticket trouvé.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-indigo-600 dark:bg-indigo-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Pack</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Identifiants</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">État</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Paiement</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Temps restant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Expiration</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {tickets.map((ticket) => {
                  const statusCfg = usageStatusConfig[ticket.usage_status] ?? usageStatusConfig.pending
                  const pmtStatus = paymentStatusLabels[ticket.payment_status ?? '']
                  return (
                    <tr key={ticket.id} className="hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                      {/* Client */}
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{ticket.user_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{ticket.user_identifiant}</p>
                        {ticket.user_phone && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">{ticket.user_phone}</p>
                        )}
                      </td>
                      {/* Pack */}
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{ticket.pack_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDuration(ticket.duration_hours)} · {formatPrice(ticket.pack_price)}
                        </p>
                      </td>
                      {/* Credentials */}
                      <td className="px-4 py-3">
                        <p className="text-xs font-mono text-gray-800 dark:text-gray-200">{ticket.login_hotspot}</p>
                        <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{ticket.password_hotspot}</p>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.color}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>
                      </td>
                      {/* Payment */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-gray-600 dark:text-gray-300">
                            {paymentMethodLabels[ticket.payment_method ?? ''] ?? ticket.payment_method}
                          </span>
                          {pmtStatus && (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium w-fit ${pmtStatus.color}`}>
                              {pmtStatus.label}
                            </span>
                          )}
                          {ticket.payment_reference && (
                            <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
                              Réf: {ticket.payment_reference}
                            </span>
                          )}
                          {ticket.payment_screenshot_url && (
                            <a
                              href={ticket.payment_screenshot_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              📸 Capture
                            </a>
                          )}
                        </div>
                      </td>
                      {/* Time remaining */}
                      <td className="px-4 py-3">
                        {ticket.status === 'active' && ticket.activated_at ? (
                          <span className={`text-sm font-medium ${ticket.remaining_seconds <= 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-100'}`}>
                            {formatTimeLeft(ticket.remaining_seconds)}
                          </span>
                        ) : ticket.status === 'active' ? (
                          <span className="text-xs text-blue-600 dark:text-blue-400">En attente de connexion</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      {/* Expiration */}
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {ticket.expires_at ? (
                          <span className={ticket.remaining_seconds <= 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-700 dark:text-gray-300'}>
                            {new Date(ticket.expires_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                            <br />
                            {new Date(ticket.expires_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      {/* Date */}
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(ticket.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        <br />
                        {new Date(ticket.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        {ticket.payment_id && ticket.payment_status === 'pending' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handlePaymentAction(ticket.payment_id!, 'confirm')}
                              disabled={actionLoading !== null}
                              className="rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 cursor-pointer transition-colors"
                            >
                              {actionLoading === ticket.payment_id + 'confirm' ? '...' : '✓'}
                            </button>
                            <button
                              onClick={() => handlePaymentAction(ticket.payment_id!, 'reject')}
                              disabled={actionLoading !== null}
                              className="rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer transition-colors"
                            >
                              {actionLoading === ticket.payment_id + 'reject' ? '...' : '✕'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} sur {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              ← Précédent
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Suivant →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
