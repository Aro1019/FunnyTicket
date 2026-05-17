'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/components/CartProvider'
import { formatPrice, formatDuration } from '@/lib/utils'

interface PaymentMethod {
  id: string
  method_type: string
  phone_number: string
  account_name: string
}

const METHOD_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  mvola: { label: 'Mvola', icon: '📱', color: 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700' },
  orange_money: { label: 'Orange Money', icon: '🟠', color: 'border-orange-300 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700' },
  airtel_money: { label: 'Airtel Money', icon: '🔴', color: 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700' },
}

export function CheckoutForm({ methods }: { methods: PaymentMethod[] }) {
  const { items, totalItems, totalPrice, clearCart } = useCart()
  const router = useRouter()

  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
  const [selectedMethodId, setSelectedMethodId] = useState<string>('')
  const [reference, setReference] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)

  const isCash = selectedMethod === 'cash'
  const vendorMethod = methods.find((m) => m.id === selectedMethodId)

  useEffect(() => {
    if (items.length === 0 && !orderPlaced) {
      router.replace('/client/cart')
    }
  }, [items.length, router, orderPlaced])

  if (items.length === 0 && !orderPlaced) {
    return null
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      if (f.size > 5 * 1024 * 1024) {
        alert('La taille du fichier ne doit pas dépasser 5 Mo.')
        e.target.value = ''
        return
      }
      setFile(f)
      setPreview(URL.createObjectURL(f))
    } else {
      setFile(null)
      setPreview(null)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedMethod) {
      setError('Veuillez choisir un mode de paiement.')
      return
    }
    if (!isCash && !reference.trim()) {
      setError('Veuillez entrer la référence de transaction.')
      return
    }
    if (!isCash && !file) {
      setError('Veuillez fournir une capture d\'écran de la transaction.')
      return
    }

    setError(null)
    setSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('cartItems', JSON.stringify(items))
      formData.append('method', selectedMethod)
      formData.append('methodId', selectedMethodId)
      if (!isCash) {
        formData.append('reference', reference.trim())
        if (file) {
          formData.append('screenshot', file)
        }
      }

      const res = await fetch('/api/orders/create', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erreur lors de la commande.')
        setSubmitting(false)
        return
      }

      clearCart()
      setOrderPlaced(true)
      router.push('/client/tickets?success=order_placed')
    } catch {
      setError('Erreur de connexion. Réessayez.')
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link href="/client" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Packs</Link>
        <span>›</span>
        <Link href="/client/cart" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Panier</Link>
        <span>›</span>
        <span className="text-indigo-600 dark:text-indigo-400">Paiement</span>
      </div>

      {/* Order summary */}
      <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-5 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">
          Récapitulatif — {totalItems} ticket{totalItems > 1 ? 's' : ''}
        </h2>
        <div className="space-y-1 mb-3">
          {items.map((item) => (
            <div key={item.packId} className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {item.packName} ({formatDuration(item.durationHours)}) × {item.quantity}
              </span>
              <span className="font-medium text-gray-800 dark:text-gray-100">
                {formatPrice(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>
        <div className="flex justify-between pt-2 border-t border-indigo-200 dark:border-indigo-700">
          <span className="font-semibold text-gray-800 dark:text-gray-100">Total</span>
          <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{formatPrice(totalPrice)}</span>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Mode de paiement</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        Sélectionnez votre mode de paiement et confirmez.
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Payment method selector */}
      <div className="grid gap-3 md:grid-cols-2 mb-6">
        {methods.map((method) => {
          const meta = METHOD_LABELS[method.method_type] || METHOD_LABELS.mvola
          const isSelected = selectedMethodId === method.id
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => {
                setSelectedMethod(method.method_type)
                setSelectedMethodId(method.id)
              }}
              className={`rounded-2xl border-2 p-4 text-left transition-all cursor-pointer ${
                isSelected
                  ? 'ring-2 ring-indigo-500 ' + meta.color
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{meta.icon}</span>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-100">{meta.label}</p>
                  <p className="text-sm font-mono text-gray-600 dark:text-gray-300">{method.phone_number}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{method.account_name}</p>
                </div>
              </div>
            </button>
          )
        })}

        {/* Cash */}
        <button
          type="button"
          onClick={() => {
            setSelectedMethod('cash')
            setSelectedMethodId('')
          }}
          className={`rounded-2xl border-2 p-4 text-left transition-all cursor-pointer ${
            isCash
              ? 'ring-2 ring-indigo-500 border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">💵</span>
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-100">Espèces</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Payez chez le vendeur</p>
            </div>
          </div>
        </button>
      </div>

      {/* Payment details after selection */}
      {selectedMethod && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Show vendor info for mobile money */}
          {!isCash && vendorMethod && (
            <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Effectuez le paiement</h3>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-700 p-4 space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Envoyez <strong className="text-indigo-600 dark:text-indigo-400">{formatPrice(totalPrice)}</strong> au :
                </p>
                <p className="text-lg font-mono font-bold text-gray-900 dark:text-gray-100">{vendorMethod.phone_number}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Titulaire : <strong>{vendorMethod.account_name}</strong>
                </p>
              </div>
            </div>
          )}

          {/* Cash info */}
          {isCash && (
            <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-5">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">💵 Paiement en espèces</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Vos tickets sont activés <strong>immédiatement</strong>. Pensez à régler{' '}
                <strong>{formatPrice(totalPrice)}</strong> auprès du vendeur le plus rapidement
                possible.
              </p>
              <p className="mt-2 text-xs text-yellow-700 dark:text-yellow-300">
                ⚠️ Limite : 2 ventes en espèces non encaissées maximum à la fois.
              </p>
            </div>
          )}

          {/* Proof section for mobile money */}
          {!isCash && (
            <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 space-y-4">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">Preuve de paiement</h3>

              <div>
                <label htmlFor="reference" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Référence de transaction <span className="text-red-500">*</span>
                </label>
                <input
                  id="reference"
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ex: TXN123456789"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Entrez la référence reçue par SMS après votre transfert.
                </p>
              </div>

              <div>
                <label htmlFor="screenshot" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Capture d&apos;écran de la transaction <span className="text-red-500">*</span>
                </label>
                <label
                  htmlFor="screenshot"
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-6 transition-colors hover:border-indigo-400 hover:bg-indigo-50 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/20"
                >
                  {preview ? (
                    <img src={preview} alt="Aperçu" className="max-h-48 rounded-lg object-contain" />
                  ) : (
                    <>
                      <svg className="h-10 w-10 text-gray-400 dark:text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 0l-3 3m3-3l3 3M3 16.5V18a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 18v-1.5m-18 0V7.875c0-.621.504-1.125 1.125-1.125H6.75m12 9.75V7.875c0-.621-.504-1.125-1.125-1.125H17.25" />
                      </svg>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Cliquez pour sélectionner</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">PNG, JPG ou JPEG (max. 5 Mo)</p>
                    </>
                  )}
                </label>
                <input
                  id="screenshot"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleFileChange}
                  className="sr-only"
                />
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  La capture doit contenir la référence de transaction.
                </p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-indigo-600 py-3 text-center text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Validation...
              </span>
            ) : isCash ? 'Confirmer la commande' : 'Confirmer le paiement'}
          </button>
        </form>
      )}
    </div>
  )
}
