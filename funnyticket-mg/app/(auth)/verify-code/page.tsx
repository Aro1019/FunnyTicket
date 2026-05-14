'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function VerifyCodePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const successMsg = searchParams.get('success') || ''

  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value.slice(-1)
    setCode(newCode)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setCode(pasted.split(''))
      inputRefs.current[5]?.focus()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = code.join('')

    if (token.length !== 6) {
      setError('Veuillez saisir le code complet à 6 chiffres.')
      return
    }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'recovery',
    })

    if (verifyError) {
      setLoading(false)
      setError('Code invalide ou expiré. Veuillez réessayer.')
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
      return
    }

    router.push('/reset-password')
  }

  if (!email) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-lg animate-scale-in text-center">
        <p className="text-gray-600 mb-4">Aucun email spécifié.</p>
        <Link href="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
          ← Retour
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white p-8 shadow-lg animate-scale-in">
      <h2 className="mb-2 text-2xl font-semibold text-gray-800">
        Vérification du code
      </h2>
      <p className="mb-2 text-sm text-gray-500">
        Saisissez le code à 6 chiffres envoyé à
      </p>
      <p className="mb-6 text-sm font-medium text-indigo-600">{email}</p>

      {successMsg && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 animate-fade-in-down">
          {successMsg}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 animate-fade-in-down">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center gap-3" onPaste={handlePaste}>
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="h-14 w-12 rounded-xl border-2 border-gray-300 bg-white text-center text-2xl font-bold text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || code.some((d) => !d)}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Vérification...' : 'Vérifier le code'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Vous n'avez pas reçu le code ?{' '}
        <Link href="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
          Renvoyer
        </Link>
      </p>

      <p className="mt-3 text-center text-sm text-gray-500">
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
          ← Retour à la connexion
        </Link>
      </p>
    </div>
  )
}
