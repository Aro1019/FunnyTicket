'use client'

import { useEffect, useState } from 'react'

type PermState = 'prompt' | 'granted' | 'denied' | 'unsupported'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function NotificationPrompt() {
  const [permState, setPermState] = useState<PermState>('prompt')
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setPermState('unsupported')
      return
    }

    setPermState(Notification.permission as PermState)

    // If already granted, ensure subscription exists
    if (Notification.permission === 'granted') {
      ensureSubscription()
    }
  }, [])

  async function ensureSubscription() {
    try {
      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      if (existing) return // Already subscribed

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      })

      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      })
    } catch {
      // Silently fail
    }
  }

  async function handleEnable() {
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      setPermState(permission as PermState)

      if (permission === 'granted') {
        await ensureSubscription()
      }
    } catch {
      // Browser blocked
    } finally {
      setLoading(false)
    }
  }

  // Don't show if unsupported, already granted, or dismissed
  if (permState === 'unsupported' || permState === 'granted' || dismissed) {
    return null
  }

  // Don't show if hard-denied (user blocked in browser settings)
  if (permState === 'denied') {
    return null
  }

  return (
    <div className="mb-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 p-4 flex items-start gap-3">
      <span className="text-2xl flex-shrink-0">🔔</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
          Recevoir des notifications
        </p>
        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
          Soyez alerté avant l&apos;expiration de vos tickets WiFi
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => setDismissed(true)}
          className="text-xs text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors cursor-pointer"
        >
          Plus tard
        </button>
        <button
          onClick={handleEnable}
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-60 cursor-pointer"
        >
          {loading ? 'Activation...' : 'Activer'}
        </button>
      </div>
    </div>
  )
}
