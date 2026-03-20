'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart, canAddToCart } from '@/components/CartProvider'
import { formatPrice, formatDuration } from '@/lib/utils'

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart, totalItems, totalPrice, cartLimit } = useCart()
  const [warning, setWarning] = useState<string | null>(null)
  const [navigating, setNavigating] = useState(false)
  const router = useRouter()

  function handleIncrease(packId: string, currentQty: number, price: number) {
    const { allowed, max, rule } = canAddToCart(items, price)
    if (!allowed) {
      setWarning(`Limite atteinte (${max} tickets max). ${rule}`)
      setTimeout(() => setWarning(null), 3000)
      return
    }
    setWarning(null)
    updateQuantity(packId, currentQty + 1)
  }

  if (items.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Mon panier</h1>
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-8 text-center shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-4xl mb-4">🛒</p>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Votre panier est vide.</p>
          <Link
            href="/client"
            className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Voir les offres
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          Mon panier ({totalItems} ticket{totalItems > 1 ? 's' : ''})
        </h1>
        <button
          onClick={clearCart}
          className="text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors cursor-pointer"
        >
          Vider le panier
        </button>
      </div>

      {warning && (
        <div className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          ⚠️ {warning}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.packId}
              className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                    {item.packName}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDuration(item.durationHours)} · {formatPrice(item.price)} / ticket
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.packId, item.quantity - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer text-sm"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-gray-800 dark:text-gray-100">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => handleIncrease(item.packId, item.quantity, item.price)}
                    disabled={!canAddToCart(items, item.price).allowed}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>

                <div className="text-right min-w-[80px]">
                  <p className="font-semibold text-gray-800 dark:text-gray-100">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                  {item.quantity > 1 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {item.quantity} × {formatPrice(item.price)}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => removeItem(item.packId)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                  aria-label="Supprimer"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700 sticky top-24">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              Récapitulatif
            </h2>

            <div className="space-y-2 mb-4">
              {items.map((item) => (
                <div key={item.packId} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {item.packName} × {item.quantity}
                  </span>
                  <span className="text-gray-800 dark:text-gray-100 font-medium">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <hr className="border-gray-100 dark:border-gray-700 my-4" />

            <div className="flex justify-between mb-6">
              <span className="text-base font-semibold text-gray-800 dark:text-gray-100">Total</span>
              <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                {formatPrice(totalPrice)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 mb-4">
              <span>{totalItems} ticket{totalItems > 1 ? 's' : ''} · Identifiants WiFi uniques</span>
              <span className={`font-semibold ${totalItems >= cartLimit.max ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'}`}>
                {totalItems}/{cartLimit.max}
              </span>
            </div>

            <button
              onClick={() => { setNavigating(true); router.push('/client/checkout') }}
              disabled={navigating}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {navigating && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {navigating ? 'Chargement…' : 'Procéder au paiement'}
            </button>

            <Link
              href="/client"
              className="block w-full mt-2 text-center text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              ← Continuer les achats
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
