import Link from 'next/link'
import { login } from './actions'
import { PasswordInput } from '@/components/PasswordInput'
import { SubmitButton } from '@/components/SubmitButton'

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  return (
    <LoginContent searchParams={searchParams} />
  )
}

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const params = await searchParams

  return (
    <div className="rounded-2xl bg-white p-8 shadow-lg animate-scale-in">
      <h2 className="mb-6 text-2xl font-semibold text-gray-800">Connexion</h2>

      {params?.error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 animate-fade-in-down">
          {decodeURIComponent(params.error)}
        </div>
      )}

      {params?.message && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 animate-fade-in-down">
          {decodeURIComponent(params.message)}
        </div>
      )}

      <form action={login} className="space-y-4">
        <div>
          <label htmlFor="identifier" className="mb-1 block text-sm font-medium text-gray-700">
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
        <PasswordInput
          id="password"
          name="password"
          label="Mot de passe"
          darkMode={false}
        />
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            Mot de passe oublié ?
          </Link>
        </div>
        <SubmitButton pendingText="Connexion..." className="w-full">
          Se connecter
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Pas encore de compte ?{' '}
        <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
          S&apos;inscrire
        </Link>
      </p>

      <p className="mt-3 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← Retour à l&apos;accueil
        </Link>
      </p>
    </div>
  )
}
