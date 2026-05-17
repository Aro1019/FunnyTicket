'use client'

import { useEffect, useState } from 'react'

// Increment this version each time the changelog entries below change.
// Clients who have already seen the current version won't be re-prompted.
const CHANGELOG_VERSION = '2026-05-17'
const STORAGE_KEY = 'funnyticket:changelog:lastSeen'

interface ChangelogItem {
  icon: string
  title: string
  description: string
  tone?: 'info' | 'warning'
}

const ENTRIES: ChangelogItem[] = [
  {
    icon: '🎁',
    title: 'Ticket bonus offert au 1er achat',
    description:
      'Le ticket WiFi 12h gratuit n\u2019est plus remis à l\u2019inscription mais dès votre tout premier achat confirmé. Vous le recevez automatiquement en bonus.',
  },
  {
    icon: '💵',
    title: 'Paiement en espèces — tickets immédiats',
    description:
      'Lorsque vous choisissez le paiement en espèces, vos tickets sont désormais activés immédiatement, sans attendre la validation d\u2019un vendeur. Pensez à régler rapidement le montant dû auprès du vendeur.',
  },
  {
    icon: '⚠️',
    title: 'Pénalités en cas de non-paiement',
    description:
      'Vous pouvez avoir au maximum 2 ventes en espèces non réglées simultanément. Au-delà, toute nouvelle commande sera bloquée tant que vous n\u2019aurez pas régularisé les ventes précédentes auprès du vendeur.',
    tone: 'warning',
  },
  {
    icon: '📧',
    title: 'Email désormais obligatoire',
    description:
      'L\u2019adresse email est maintenant requise à l\u2019inscription. Elle permet de récupérer votre compte et de recevoir les notifications importantes.',
  },
  {
    icon: '📝',
    title: 'Inscription : vos infos sont conservées',
    description:
      'En cas d\u2019erreur dans le formulaire d\u2019inscription, vos informations restent pré-remplies. Vous n\u2019avez plus à tout ressaisir, seul le mot de passe doit être retapé pour des raisons de sécurité.',
  },
]

export function ChangelogModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      const lastSeen = window.localStorage.getItem(STORAGE_KEY)
      if (lastSeen !== CHANGELOG_VERSION) {
        setOpen(true)
      }
    } catch {
      // localStorage indisponible : on n\u2019affiche pas pour ne pas g\u00ealer.
    }
  }, [])

  function close() {
    try {
      window.localStorage.setItem(STORAGE_KEY, CHANGELOG_VERSION)
    } catch {
      // ignore
    }
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="changelog-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col animate-scale-in"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2
              id="changelog-modal-title"
              className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2"
            >
              <span aria-hidden>✨</span> Quoi de neuf ?
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Mises à jour importantes — merci de prendre un instant pour les lire.
            </p>
          </div>
          <button
            onClick={close}
            aria-label="Fermer"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer p-1 -mr-1"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Entries */}
        <div className="overflow-y-auto p-5 space-y-4">
          {ENTRIES.map((entry, i) => (
            <div
              key={i}
              className={`rounded-xl p-3 border ${
                entry.tone === 'warning'
                  ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                  : 'bg-gray-50 dark:bg-gray-700/40 border-gray-100 dark:border-gray-700'
              }`}
            >
              <div className="flex gap-3">
                <span className="text-2xl flex-shrink-0" aria-hidden>
                  {entry.icon}
                </span>
                <div className="min-w-0">
                  <h3
                    className={`text-sm font-semibold ${
                      entry.tone === 'warning'
                        ? 'text-orange-800 dark:text-orange-200'
                        : 'text-gray-800 dark:text-gray-100'
                    }`}
                  >
                    {entry.title}
                  </h3>
                  <p
                    className={`text-xs mt-1 leading-relaxed ${
                      entry.tone === 'warning'
                        ? 'text-orange-700 dark:text-orange-300'
                        : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {entry.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={close}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            J&apos;ai compris
          </button>
        </div>
      </div>
    </div>
  )
}
