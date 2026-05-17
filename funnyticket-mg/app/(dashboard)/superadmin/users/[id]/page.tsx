'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Profile {
  id: string
  identifiant: string
  full_name: string
  phone: string
  email: string | null
  role: string
  created_at: string
}

interface TicketRow {
  id: string
  login_hotspot: string
  password_hotspot: string
  status: string
  created_at: string
  activated_at: string | null
  expires_at: string | null
  pack: { name: string; price: number; duration_hours: number } | null
}

interface PaymentRow {
  id: string
  amount: number
  payment_method: string
  status: string
  created_at: string
}

interface UserDetail {
  profile: Profile
  tickets: TicketRow[]
  payments: PaymentRow[]
  stats: { totalTickets: number; totalSpent: number }
  vendorStats: { totalSales: number; totalRevenue: number } | null
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat('fr-MG').format(amount) + ' Ar'
}

const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', label: 'Actif' },
  pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', label: 'En attente' },
  expired: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300', label: 'Expiré' },
  cancelled: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'Annulé' },
  confirmed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', label: 'Confirmé' },
  rejected: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'Rejeté' },
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [roleLoading, setRoleLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [tab, setTab] = useState<'tickets' | 'payments'>('tickets')

  useEffect(() => {
    fetch(`/api/superadmin/users/${id}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [id])

  async function handleRoleChange(newRole: 'user' | 'admin') {
    if (!data) return
    const confirmMsg =
      newRole === 'admin'
        ? `Promouvoir "${data.profile.full_name}" en vendeur ?`
        : `Rétrograder "${data.profile.full_name}" en client ?`

    if (!confirm(confirmMsg)) return

    setRoleLoading(true)
    const res = await fetch(`/api/superadmin/users/${id}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })

    if (res.ok) {
      setData((prev) =>
        prev ? { ...prev, profile: { ...prev.profile, role: newRole } } : prev
      )
    }
    setRoleLoading(false)
  }

  async function handleDelete() {
    if (!data) return
    const expected = data.profile.identifiant
    const typed = window.prompt(
      `⚠️ SUPPRESSION DÉFINITIVE\n\n` +
        `Cette action va supprimer :\n` +
        `• Le compte de "${data.profile.full_name}" (@${expected})\n` +
        `• Tous ses tickets (${data.stats.totalTickets}) et utilisateurs hotspot MikroTik\n` +
        `• Tous ses paiements, commandes, cadeaux et notifications\n\n` +
        `Cette action est IRRÉVERSIBLE.\n\n` +
        `Pour confirmer, tapez l'identifiant exact du client :\n${expected}`
    )

    if (typed === null) return
    if (typed.trim() !== expected) {
      alert('Identifiant incorrect. Suppression annulée.')
      return
    }

    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/superadmin/users/${id}`, { method: 'DELETE' })
      const result = await res.json()
      if (!res.ok) {
        alert(result.error || 'Erreur lors de la suppression')
        setDeleteLoading(false)
        return
      }
      let msg = `Compte @${result.identifiant} supprimé définitivement.`
      if (result.mikrotikErrors?.length) {
        msg +=
          `\n\nAvertissement : ${result.mikrotikErrors.length} utilisateur(s) hotspot n'ont pas pu être supprimés sur MikroTik ` +
          `(probablement déjà absents). Vérifiez manuellement si besoin.`
      }
      alert(msg)
      router.push('/superadmin/users')
    } catch (err) {
      alert('Erreur réseau : ' + (err instanceof Error ? err.message : 'inconnue'))
      setDeleteLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="h-8 w-8 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Utilisateur introuvable</p>
        <button onClick={() => router.back()} className="mt-4 text-indigo-600 hover:text-indigo-800 text-sm cursor-pointer">
          ← Retour
        </button>
      </div>
    )
  }

  const { profile, tickets, payments, stats, vendorStats } = data

  return (
    <div>
      {/* Back link */}
      <Link
        href="/superadmin/users"
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-4 inline-block"
      >
        ← Retour à la liste
      </Link>

      {/* Profile header */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-xl">
                {profile.role === 'admin' ? '🏪' : '👤'}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  {profile.full_name || 'Sans nom'}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">@{profile.identifiant}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300">
              <span>📞 {profile.phone || '—'}</span>
              {profile.email && <span>✉️ {profile.email}</span>}
              <span>📅 Inscrit le {new Date(profile.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>

          {/* Role management */}
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                profile.role === 'admin'
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              }`}
            >
              {profile.role === 'admin' ? 'Vendeur' : 'Client'}
            </span>
            {profile.role === 'user' ? (
              <button
                onClick={() => handleRoleChange('admin')}
                disabled={roleLoading}
                className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-60 transition-colors cursor-pointer"
              >
                {roleLoading ? '...' : 'Promouvoir vendeur'}
              </button>
            ) : (
              <button
                onClick={() => handleRoleChange('user')}
                disabled={roleLoading}
                className="rounded-lg bg-gray-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-600 disabled:opacity-60 transition-colors cursor-pointer"
              >
                {roleLoading ? '...' : 'Rétrograder client'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Tickets</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.totalTickets}</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total dépensé</p>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatPrice(stats.totalSpent)}</p>
        </div>
        {vendorStats && (
          <>
            <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Ventes confirmées</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{vendorStats.totalSales}</p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">CA généré</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {formatPrice(vendorStats.totalRevenue)}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('tickets')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
            tab === 'tickets'
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          Tickets ({tickets.length})
        </button>
        <button
          onClick={() => setTab('payments')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
            tab === 'payments'
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          Paiements ({payments.length})
        </button>
      </div>

      {/* Tickets table */}
      {tab === 'tickets' && (
        <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {tickets.length === 0 ? (
            <p className="text-center py-8 text-gray-500 dark:text-gray-400">Aucun ticket</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Pack</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Login</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Statut</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Créé le</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Expire le</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {tickets.map((t) => {
                    const badge = statusBadge[t.status] || statusBadge.pending
                    return (
                      <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                          {(t.pack as { name: string } | null)?.name || '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                          {t.login_hotspot}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                          {new Date(t.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                          {t.expires_at ? new Date(t.expires_at).toLocaleDateString('fr-FR') : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Payments table */}
      {tab === 'payments' && (
        <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {payments.length === 0 ? (
            <p className="text-center py-8 text-gray-500 dark:text-gray-400">Aucun paiement</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Montant</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Méthode</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Statut</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {payments.map((p) => {
                    const badge = statusBadge[p.status] || statusBadge.pending
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                          {formatPrice(p.amount)}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 capitalize">
                          {p.payment_method.replace('_', ' ')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                          {new Date(p.created_at).toLocaleDateString('fr-FR')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Danger zone — clients uniquement */}
      {profile.role === 'user' && (
        <div className="mt-8 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-5">
          <h2 className="text-sm font-semibold text-red-800 dark:text-red-300 flex items-center gap-2">
            <span aria-hidden>⚠️</span> Zone dangereuse
          </h2>
          <p className="text-xs text-red-700 dark:text-red-400 mt-1 leading-relaxed">
            La suppression définitive efface le compte du client, tous ses tickets, paiements,
            commandes, cadeaux, notifications et utilisateurs hotspot MikroTik associés. Cette
            action est <strong>irréversible</strong>.
          </p>
          <button
            onClick={handleDelete}
            disabled={deleteLoading}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors cursor-pointer"
          >
            {deleteLoading ? 'Suppression en cours…' : '🗑️ Supprimer définitivement ce client'}
          </button>
        </div>
      )}
    </div>
  )
}
