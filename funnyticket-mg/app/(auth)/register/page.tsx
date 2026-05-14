import Link from 'next/link'
import { register } from './actions'
import { PasswordInput } from '@/components/PasswordInput'
import { SubmitButton } from '@/components/SubmitButton'

export default function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  return <RegisterContent searchParams={searchParams} />
}

async function RegisterContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  return (
    <div className="rounded-2xl bg-white p-8 shadow-lg animate-scale-in">
      <h2 className="mb-2 text-2xl font-semibold text-gray-800">Créer un compte</h2>

      <div className="mb-6 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 p-3 flex items-center gap-2">
        <span className="text-xl">🎁</span>
        <p className="text-sm text-amber-800 font-medium">
          Inscrivez-vous et recevez un <span className="font-bold">ticket WiFi 12h gratuit</span> !
        </p>
      </div>

      {params?.error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 animate-fade-in-down">
          {decodeURIComponent(params.error)}
        </div>
      )}

      <form action={register} className="space-y-4">
        <div>
          <label htmlFor="identifiant" className="mb-1 block text-sm font-medium text-gray-700">
            Identifiant <span className="text-red-500">*</span>
          </label>
          <input
            id="identifiant"
            name="identifiant"
            type="text"
            required
            minLength={3}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none placeholder:text-gray-400"
            placeholder="votre_identifiant"
          />
          <p className="mt-1 text-xs text-gray-400">Unique, min. 3 caractères (lettres, chiffres, _ ou -)</p>
        </div>
        <div>
          <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-gray-700">
            Nom complet <span className="text-red-500">*</span>
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none placeholder:text-gray-400"
            placeholder="Jean Dupont"
          />
        </div>
        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">
            Téléphone <span className="text-red-500">*</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none placeholder:text-gray-400"
            placeholder="034 00 000 00"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
            Email <span className="text-xs text-gray-400">(optionnel)</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none placeholder:text-gray-400"
            placeholder="votre@email.com"
          />
        </div>
        <PasswordInput
          id="password"
          name="password"
          label="Mot de passe"
          minLength={8}
          showStrength={true}
          darkMode={false}
        />
        <SubmitButton pendingText="Inscription..." className="w-full">
          S&apos;inscrire
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Déjà un compte ?{' '}
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
          Se connecter
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
