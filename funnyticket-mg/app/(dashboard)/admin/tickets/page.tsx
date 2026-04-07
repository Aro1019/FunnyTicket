import AdminTicketsTable from '@/components/AdminTicketsTable'

export default function AdminTicketsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
        Suivi des tickets
      </h1>
      <AdminTicketsTable />
    </div>
  )
}
