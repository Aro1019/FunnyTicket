'use client'

import { useFormStatus } from 'react-dom'

export function SubmitButton({
  children,
  pendingText,
  className = '',
  variant = 'primary',
}: {
  children: React.ReactNode
  pendingText?: string
  className?: string
  variant?: 'primary' | 'success' | 'danger' | 'outline'
}) {
  const { pending } = useFormStatus()

  const baseClasses = 'relative inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer disabled:cursor-not-allowed'

  const variantClasses = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-400',
    success: 'bg-green-600 text-white hover:bg-green-700 disabled:bg-green-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400',
    outline: 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400',
  }

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {pending && (
        <svg
          className="h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      <span className={pending ? 'opacity-70' : ''}>
        {pending ? (pendingText ?? children) : children}
      </span>
    </button>
  )
}
