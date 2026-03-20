import Link from 'next/link'
import { SuperAdminCharts } from '@/components/SuperAdminCharts'

export default function SuperAdminDashboard() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Vue d&apos;ensemble</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Tableau de bord de la plateforme FunnyTicket
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/superadmin/users"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Voir les utilisateurs
          </Link>
          <Link
            href="/superadmin/vendors"
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
          >
            Voir les vendeurs
          </Link>
        </div>
      </div>

      <SuperAdminCharts />
    </div>
  )
}
