'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface UserRow {
  id: string
  identifiant: string
  full_name: string
  phone: string
  email: string | null
  role: string
  created_at: string
  ticket_count: number
  total_spent: number
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat('fr-MG').format(amount) + ' Ar'
}

export function UserTable({ roleFilter }: { roleFilter: 'all' | 'user' | 'admin' }) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      role: roleFilter,
      search,
      page: String(page),
    })
    const res = await fetch(`/api/superadmin/users?${params}`)
    const data = await res.json()
    setUsers(data.users || [])
    setTotalPages(data.totalPages || 1)
    setTotal(data.total || 0)
    setLoading(false)
  }, [roleFilter, search, page])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Reset page when search changes
  useEffect(() => {
    setPage(1)
  }, [search])

  const roleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900/30 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300">
            Vendeur
          </span>
        )
      case 'superadmin':
        return (
          <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:text-red-300">
            Super Admin
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
            Client
          </span>
        )
    }
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-4 flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Rechercher par nom, identifiant, téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2 pl-10 pr-4 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {total} résultat{total > 1 ? 's' : ''}
        </p>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="h-6 w-6 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Utilisateur</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Rôle</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Contact</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Tickets</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Dépensé</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Inscrit le</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 dark:text-gray-100">{u.full_name || '—'}</p>
                      <p className="text-xs text-gray-400">@{u.identifiant}</p>
                    </td>
                    <td className="px-4 py-3">{roleBadge(u.role)}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-800 dark:text-gray-100">{u.phone || '—'}</p>
                      <p className="text-xs text-gray-400">{u.email || ''}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-gray-100">
                      {u.ticket_count}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-gray-100">
                      {formatPrice(u.total_spent)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {new Date(u.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/superadmin/users/${u.id}`}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium transition-colors"
                      >
                        Détails →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            ← Précédent
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  )
}
