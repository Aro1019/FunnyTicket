'use client'

import { useState } from 'react'
import { confirmPurchase } from './actions'
import { SubmitButton } from '@/components/SubmitButton'

export function ConfirmForm({
  packId,
  method,
  methodId,
  isCash,
  price,
}: {
  packId: string
  method: string
  methodId: string
  isCash: boolean
  price: number
}) {
  const [preview, setPreview] = useState<string | null>(null)
  const [reference, setReference] = useState('')

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('La taille du fichier ne doit pas dépasser 5 Mo.')
        e.target.value = ''
        return
      }
      const url = URL.createObjectURL(file)
      setPreview(url)
    } else {
      setPreview(null)
    }
  }

  return (
    <form action={confirmPurchase} className="space-y-4">
      <input type="hidden" name="packId" value={packId} />
      <input type="hidden" name="method" value={method} />
      <input type="hidden" name="methodId" value={methodId} />

      {!isCash && (
        <>
          <div>
            <label htmlFor="reference" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Référence de transaction <span className="text-red-500">*</span>
            </label>
            <input
              id="reference"
              name="reference"
              type="text"
              required
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
            <div className="mt-1">
              <label
                htmlFor="screenshot"
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-6 transition-colors hover:border-indigo-400 hover:bg-indigo-50 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/20"
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="Aperçu"
                    className="max-h-48 rounded-lg object-contain"
                  />
                ) : (
                  <>
                    <svg className="h-10 w-10 text-gray-400 dark:text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 0l-3 3m3-3l3 3M3 16.5V18a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 18v-1.5m-18 0V7.875c0-.621.504-1.125 1.125-1.125H6.75m12 9.75V7.875c0-.621-.504-1.125-1.125-1.125H17.25" />
                    </svg>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Cliquez pour sélectionner une image
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">PNG, JPG ou JPEG (max. 5 Mo)</p>
                  </>
                )}
              </label>
              <input
                id="screenshot"
                name="screenshot"
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                required
                onChange={handleFileChange}
                className="sr-only"
              />
            </div>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              La capture doit contenir la référence de transaction.
            </p>
          </div>
        </>
      )}

      {isCash && (
        <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 text-sm text-yellow-700 dark:text-yellow-300">
          <strong>Note :</strong> En choisissant le paiement en espèces, votre ticket ne sera activé
          qu&apos;après confirmation du vendeur. Aucune référence n&apos;est nécessaire.
        </div>
      )}

      <SubmitButton pendingText="Validation en cours..." className="w-full">
        {isCash ? 'Confirmer la demande' : 'Confirmer le paiement'}
      </SubmitButton>
    </form>
  )
}
