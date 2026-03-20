import Link from 'next/link'
import { forgotPassword } from './actions'
import { SubmitButton } from '@/components/SubmitButton'


export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const params = await searchParams

  return (
    <div className="rounded-2xl bg-white p-8 shadow-lg animate-scale-in">
      <h2 className="mb-2 text-2xl font-semibold text-gray-800">
        Mot de passe oublié
      </h2>
      <p className="mb-6 text-sm text-gray-500">
        Saisissez votre identifiant ou email pour recevoir un lien de réinitialisation.
      </p>

      {params?.error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 animate-fade-in-down">
          {decodeURIComponent(params.error)}
        </div>
      )}

      {params?.success && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 animate-fade-in-down">
          {decodeURIComponent(params.success)}
        </div>
      )}

      <form action={forgotPassword} className="space-y-4">
        <div>
          <label
            htmlFor="identifier"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Identifiant ou Email
          </label>
          <input
            id="identifier"
            name="identifier"
            type="text"
            required
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none placeholder:text-gray-400"
            placeholder="votre_identifiant ou email"
          />
        </div>
        <SubmitButton pendingText="Envoi en cours..." className="w-full">
          Envoyer le lien
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
