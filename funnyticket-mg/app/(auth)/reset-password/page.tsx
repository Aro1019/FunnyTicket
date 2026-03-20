import Link from 'next/link'
import { resetPassword } from './actions'
import { PasswordInput } from '@/components/PasswordInput'
import { SubmitButton } from '@/components/SubmitButton'

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  return (
    <div className="rounded-2xl bg-white p-8 shadow-lg animate-scale-in">
      <h2 className="mb-2 text-2xl font-semibold text-gray-800">
        Nouveau mot de passe
      </h2>
      <p className="mb-6 text-sm text-gray-500">
        Choisissez un nouveau mot de passe sécurisé.
      </p>

      {params?.error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 animate-fade-in-down">
          {decodeURIComponent(params.error)}
        </div>
      )}

      <form action={resetPassword} className="space-y-4">
        <PasswordInput
          id="password"
          name="password"
          label="Nouveau mot de passe"
          showStrength
          minLength={8}
          darkMode={false}
        />
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          label="Confirmer le mot de passe"
          darkMode={false}
        />
        <SubmitButton pendingText="Modification..." className="w-full">
          Modifier le mot de passe
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        <Link
          href="/login"
          className="font-medium text-indigo-600 hover:text-indigo-500"
        >
          ← Retour à la connexion
        </Link>
      </p>
    </div>
  )
}
