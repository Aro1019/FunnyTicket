'use client'

import { useState } from 'react'
import { useCart, canAddToCart } from '@/components/CartProvider'
import { formatPrice, formatDuration } from '@/lib/utils'

interface Pack {
  id: string
  name: string
  description: string
  duration_hours: number
  price: number
}

export function PackCard({ pack, isPopular }: { pack: Pack; isPopular: boolean }) {
  const { items, addItem, updateQuantity, removeItem } = useCart()
  const cartItem = items.find((i) => i.packId === pack.id)
  const quantity = cartItem?.quantity ?? 0
  const [warning, setWarning] = useState<string | null>(null)

  const { allowed: canAdd } = canAddToCart(items, pack.price)

  function handleAdd() {
    const msg = addItem({
      packId: pack.id,
      packName: pack.name,
      price: pack.price,
      durationHours: pack.duration_hours,
    })
    if (msg) {
      setWarning(msg)
      setTimeout(() => setWarning(null), 3000)
    } else {
      setWarning(null)
    }
  }

  function handleIncrease() {
    const msg = updateQuantity(pack.id, quantity + 1)
    if (msg) {
      setWarning(msg)
      setTimeout(() => setWarning(null), 3000)
    } else {
      setWarning(null)
    }
  }

  return (
    <div
      className={`relative rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
        isPopular
          ? 'border-indigo-200 dark:border-indigo-500 ring-2 ring-indigo-500'
          : 'border-gray-100 dark:border-gray-700'
      }`}
    >
      {isPopular && (
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

      {/* Warning toast */}
      {warning && (
        <div className="mb-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-2.5 text-xs text-amber-700 dark:text-amber-300 animate-fade-in-down">
          ⚠️ {warning}
        </div>
      )}

      {/* Cart controls */}
      {quantity === 0 ? (
        <button
          onClick={handleAdd}
          disabled={!canAdd && quantity === 0}
          className={`block w-full rounded-lg py-2.5 text-center text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            isPopular
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Ajouter au panier
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateQuantity(pack.id, quantity - 1)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            {quantity === 1 ? (
              <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            ) : (
              '−'
            )}
          </button>
          <span className="flex-1 text-center text-lg font-bold text-gray-800 dark:text-gray-100">
            {quantity}
          </span>
          <button
            onClick={handleIncrease}
            disabled={!canAdd}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            +
          </button>
          <button
            onClick={() => removeItem(pack.id)}
            className="ml-1 text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 cursor-pointer"
          >
            Retirer
          </button>
        </div>
      )}
    </div>
  )
}
