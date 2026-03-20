'use client'

import { useEffect, useState, useCallback } from 'react'

interface TicketStatus {
  id: string
  login_hotspot: string
  password_hotspot: string
  status: string
  pack_name: string
  duration_hours: number
  activated_at: string | null
  expires_at: string | null
  created_at: string
  session: {
    isOnline: boolean
    uptime?: string
    uptimeSeconds?: number
    address?: string
    bytesIn?: number
    bytesOut?: number
  }
  progress: number
  elapsedSeconds: number
  remainingSeconds: number
  totalSeconds: number
  usageStatus: 'pending' | 'not_started' | 'in_use' | 'paused' | 'expired'
  // Admin fields
  user_name?: string
  user_identifiant?: string
}

function formatTimeLeft(seconds: number): string {
  if (seconds <= 0) return 'Expiré'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  if (d > 0) return `${d}j ${h}h ${m}min`
  if (h > 0) return `${h}h ${m}min ${s}s`
  if (m > 0) return `${m}min ${s}s`
  return `${s}s`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`
  return `${(bytes / 1073741824).toFixed(2)} GB`
}

const usageStatusConfig = {
  pending: {
    label: 'En attente de validation',
    color: 'text-yellow-700 dark:text-yellow-300',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    dot: 'bg-yellow-500',
  },
  not_started: {
    label: 'Pas encore connecté',
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    dot: 'bg-blue-500',
  },
  in_use: {
    label: 'En cours d\'utilisation',
    color: 'text-green-700 dark:text-green-300',
    bg: 'bg-green-100 dark:bg-green-900/30',
    dot: 'bg-green-500 animate-pulse',
  },
  paused: {
    label: 'Hors ligne',
    color: 'text-orange-700 dark:text-orange-300',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    dot: 'bg-orange-500',
  },
  expired: {
    label: 'Expiré',
    color: 'text-gray-700 dark:text-gray-300',
    bg: 'bg-gray-100 dark:bg-gray-700',
    dot: 'bg-gray-500',
  },
}

function TicketCard({ ticket, showUser }: { ticket: TicketStatus; showUser?: boolean }) {
  const config = usageStatusConfig[ticket.usageStatus]
  const [localRemaining, setLocalRemaining] = useState(ticket.remainingSeconds)
  const [localProgress, setLocalProgress] = useState(ticket.progress)

  // Live countdown: tick every second for active tickets
  useEffect(() => {
    setLocalRemaining(ticket.remainingSeconds)
    setLocalProgress(ticket.progress)
  }, [ticket.remainingSeconds, ticket.progress])

  useEffect(() => {
    if (ticket.usageStatus !== 'in_use' && ticket.usageStatus !== 'not_started') return
    if (localRemaining <= 0) return

    const interval = setInterval(() => {
      setLocalRemaining((prev) => {
        const next = prev - 1
        if (next <= 0) {
          clearInterval(interval)
          return 0
        }
        return next
      })
      if (ticket.totalSeconds > 0) {
        setLocalProgress((prev) => Math.min(100, prev + 100 / ticket.totalSeconds))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [ticket.usageStatus, ticket.totalSeconds, localRemaining])

  const progressBarColor =
    ticket.usageStatus === 'expired'
      ? 'bg-gray-400'
      : ticket.usageStatus === 'in_use'
        ? 'bg-green-500'
        : 'bg-indigo-500'

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            {showUser && ticket.user_name && (
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">
                {ticket.user_name} ({ticket.user_identifiant})
              </p>
            )}
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {ticket.pack_name}
              </h3>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.color}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                {config.label}
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Acheté le {new Date(ticket.created_at).toLocaleDateString('fr-FR')}
            </p>
          </div>

          {/* WiFi credentials for active tickets */}
          {ticket.status === 'active' && (
            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/30 p-3 text-center min-w-[180px]">
              <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1.5">
                Identifiants WiFi
              </p>
              <p className="text-sm">
                <span className="text-gray-500 dark:text-gray-400">Login:</span>{' '}
                <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                  {ticket.login_hotspot}
                </span>
              </p>
              <p className="text-sm">
                <span className="text-gray-500 dark:text-gray-400">MDP:</span>{' '}
                <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                  {ticket.password_hotspot}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Progress section - only for active tickets */}
      {ticket.status === 'active' && (
        <div className="px-5 pb-5">
          {/* Progress bar */}
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              <span>Progression</span>
              <span>{Math.round(localProgress)}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-linear ${progressBarColor}`}
                style={{ width: `${Math.min(100, localProgress)}%` }}
              />
            </div>
          </div>

          {/* Time info */}
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-500 dark:text-gray-400">
              {ticket.activated_at && (
                <span>
                  Début: {new Date(ticket.activated_at).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
            <div className={`font-medium ${localRemaining <= 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-100'}`}>
              {localRemaining > 0 ? (
                <>⏱ {formatTimeLeft(localRemaining)} restant</>
              ) : (
                <>⏱ Expiré</>
              )}
            </div>
          </div>

          {/* Live session details */}
          {ticket.session.isOnline && (
            <div className="mt-3 rounded-lg bg-green-50 dark:bg-green-900/20 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-green-700 dark:text-green-300">
                  Session active
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {ticket.session.address && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">IP:</span>{' '}
                    <span className="font-mono text-gray-800 dark:text-gray-100">{ticket.session.address}</span>
                  </div>
                )}
                {ticket.session.uptime && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Connecté:</span>{' '}
                    <span className="text-gray-800 dark:text-gray-100">{ticket.session.uptime}</span>
                  </div>
                )}
                {ticket.session.bytesIn != null && ticket.session.bytesOut != null && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Trafic:</span>{' '}
                    <span className="text-gray-800 dark:text-gray-100">
                      ↓{formatBytes(ticket.session.bytesIn)} ↑{formatBytes(ticket.session.bytesOut)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Expiration date */}
          {ticket.expires_at && localRemaining > 0 && (
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              Expire le {new Date(ticket.expires_at).toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      )}

      {/* Pending ticket info */}
      {ticket.status === 'pending' && (
        <div className="px-5 pb-5">
          <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/20 p-4 text-center">
            <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
              En attente de validation
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
              Votre paiement est en cours de vérification
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TicketStatusTracker({ showUser = false }: { showUser?: boolean }) {
  const [tickets, setTickets] = useState<TicketStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/tickets/status')
      if (!res.ok) return
      const data = await res.json()
      setTickets(data.tickets ?? [])
      setLastUpdate(new Date())
    } catch {
      // silent fail — will retry on next poll
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    // Poll every 30 seconds
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4" />
            <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (tickets.length === 0) {
    return (
      <div className="rounded-2xl bg-white dark:bg-gray-800 p-8 text-center shadow-sm border border-gray-100 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400">Aucun ticket en cours de suivi.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Suivi en temps réel
        </h2>
        {lastUpdate && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Mis à jour à {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        )}
      </div>
      <div className="space-y-4">
        {tickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} showUser={showUser} />
        ))}
      </div>
    </div>
  )
}
