'use client'

import { useState } from 'react'

export function PasswordInput({
  id,
  name,
  label,
  placeholder = '••••••••',
  required = true,
  minLength,
  showStrength = false,
  darkMode = true,
}: {
  id: string
  name: string
  label: string
  placeholder?: string
  required?: boolean
  minLength?: number
  showStrength?: boolean
  darkMode?: boolean
}) {
  const [show, setShow] = useState(false)
  const [value, setValue] = useState('')

  const strength = getPasswordStrength(value)

  return (
    <div>
      <label htmlFor={id} className={`mb-1 block text-sm font-medium text-gray-700 ${darkMode ? 'dark:text-gray-300' : ''}`}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={show ? 'text' : 'password'}
          required={required}
          minLength={minLength}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-11 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none placeholder:text-gray-400 ${darkMode ? 'dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-indigo-800 dark:placeholder:text-gray-500' : ''}`}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
          tabIndex={-1}
          aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {show ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>

      {showStrength && value.length > 0 && (
        <div className="mt-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  level <= strength.level
                    ? strength.level <= 1
                      ? 'bg-red-500'
                      : strength.level === 2
                        ? 'bg-orange-500'
                        : strength.level === 3
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                    : darkMode ? 'bg-gray-200 dark:bg-gray-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className={`mt-1 text-xs ${
            strength.level <= 1
              ? 'text-red-600'
              : strength.level === 2
                ? 'text-orange-600'
                : strength.level === 3
                  ? 'text-yellow-600'
                  : 'text-green-600'
          }`}>
            {strength.label}
          </p>
          {strength.tips.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {strength.tips.map((tip, i) => (
                <li key={i} className={`text-xs text-gray-500 ${darkMode ? 'dark:text-gray-400' : ''}`}>• {tip}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function getPasswordStrength(password: string): {
  level: number
  label: string
  tips: string[]
} {
  if (!password) return { level: 0, label: '', tips: [] }

  const tips: string[] = []
  let score = 0

  if (password.length >= 8) score++
  else tips.push('Au moins 8 caractères')

  if (password.length >= 12) score++

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  else tips.push('Mélangez majuscules et minuscules')

  if (/\d/.test(password)) score++
  else tips.push('Ajoutez au moins un chiffre')

  if (/[^A-Za-z0-9]/.test(password)) score++
  else tips.push('Ajoutez un caractère spécial (!@#$...)')

  const level = Math.min(4, Math.max(1, Math.ceil(score * 0.8)))

  const labels: Record<number, string> = {
    1: 'Très faible',
    2: 'Faible',
    3: 'Correct',
    4: 'Fort',
  }

  return { level, label: labels[level] || '', tips }
}
