import { createClient } from '@/lib/supabase/server'
import { formatPrice, formatDuration } from '@/lib/utils'
import Link from 'next/link'

export default async function ClientDashboard() {
  const supabase = await createClient()

  const { data: packs } = await supabase
    .from('packs')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true })

  // Find the middle pack for "popular" badge
  const popularIndex = packs && packs.length >= 3 ? 1 : -1

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Nos offres WiFi</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Choisissez le pack qui correspond à vos besoins et connectez-vous au réseau Starlink.
      </p>

      <div className="grid gap-6 md:grid-cols-3">
        {packs?.map((pack, index) => (
          <div
            key={pack.id}
            className={`relative rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border transition-all duration-300 hover:-translate-y-1 hover:shadow-md animate-card-${index + 1} ${
              index === popularIndex
                ? 'border-indigo-200 dark:border-indigo-500 ring-2 ring-indigo-500'
                : 'border-gray-100 dark:border-gray-700'
            }`}
          >
            {index === popularIndex && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white">
                Populaire
              </span>
            )}

            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{pack.name}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{pack.description}</p>

            <div className="mt-6 mb-6">
              <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                {formatPrice(pack.price)}
              </span>
              <span className="text-gray-400 dark:text-gray-500 text-sm">
                {' / '}{formatDuration(pack.duration_hours)}
              </span>
            </div>

            <ul className="space-y-2 mb-6 text-sm text-gray-600 dark:text-gray-300">
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Connexion WiFi Starlink
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Durée : {formatDuration(pack.duration_hours)}
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Identifiants instantanés
              </li>
            </ul>

            <Link
              href={`/client/purchase/${pack.id}`}
              className={`block w-full rounded-lg py-2.5 text-center text-sm font-medium transition-colors ${
                index === popularIndex
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Choisir ce pack
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
