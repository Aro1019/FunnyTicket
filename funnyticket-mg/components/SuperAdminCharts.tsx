'use client'

import { useState, useEffect } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface Stats {
  totalUsers: number
  totalAdmins: number
  totalTickets: number
  activeTickets: number
  pendingPayments: number
  totalRevenue: number
  totalOrders: number
  registrationChart: { label: string; count: number }[]
  revenueChart: { label: string; revenue: number }[]
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat('fr-MG').format(amount) + ' Ar'
}

export function SuperAdminCharts() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/superadmin/stats')
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

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

  if (!stats) return null

  const cards = [
    { label: 'Utilisateurs', value: stats.totalUsers, color: 'text-blue-600 dark:text-blue-400', icon: '👥' },
    { label: 'Vendeurs', value: stats.totalAdmins, color: 'text-purple-600 dark:text-purple-400', icon: '🏪' },
    { label: 'Tickets créés', value: stats.totalTickets, color: 'text-gray-800 dark:text-gray-100', icon: '🎫' },
    { label: 'Tickets actifs', value: stats.activeTickets, color: 'text-green-600 dark:text-green-400', icon: '✅' },
    { label: 'Paiements en attente', value: stats.pendingPayments, color: 'text-yellow-600 dark:text-yellow-400', icon: '⏳' },
    { label: 'Commandes', value: stats.totalOrders, color: 'text-teal-600 dark:text-teal-400', icon: '📦' },
  ]

  return (
    <>
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{card.icon}</span>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue card */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 p-6 shadow-sm mb-8 text-white">
        <p className="text-sm opacity-80">Chiffre d&apos;affaires total</p>
        <p className="text-3xl font-bold mt-1">{formatPrice(stats.totalRevenue)}</p>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Registration chart */}
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Inscriptions (30 derniers jours)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.registrationChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value) => [`${value} inscription${Number(value) > 1 ? 's' : ''}`, '']}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue chart */}
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Revenus (30 derniers jours)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={stats.revenueChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value) => [formatPrice(Number(value)), 'Revenu']}
              />
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  )
}
