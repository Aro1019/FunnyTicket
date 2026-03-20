'use client'

import { useCart } from '@/components/CartProvider'

export function CartLimitLegend() {
  const { cartLimit, totalItems } = useCart()

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 mb-8">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
        <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Limites d&apos;achat par commande
      </h3>
      <div className="grid gap-2 sm:grid-cols-3 text-xs">
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 border border-blue-100 dark:border-blue-800">
          <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1">Pack 1 000 Ar seul</p>
          <p className="text-blue-600 dark:text-blue-400">Maximum <strong>4 tickets</strong></p>
        </div>
        <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 p-3 border border-purple-100 dark:border-purple-800">
          <p className="font-semibold text-purple-800 dark:text-purple-300 mb-1">Packs 5 000 / 20 000 Ar</p>
          <p className="text-purple-600 dark:text-purple-400">Maximum <strong>2 tickets</strong></p>
        </div>
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 border border-amber-100 dark:border-amber-800">
          <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1">Combiné (mix de packs)</p>
          <p className="text-amber-600 dark:text-amber-400">Maximum <strong>3 tickets</strong></p>
        </div>
      </div>
      {totalItems > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-2.5 py-0.5 font-medium text-indigo-700 dark:text-indigo-300">
            {totalItems} / {cartLimit.max}
          </span>
          {cartLimit.rule && (
            <span className="text-gray-500 dark:text-gray-400">{cartLimit.rule}</span>
          )}
        </div>
      )}
    </div>
  )
}
