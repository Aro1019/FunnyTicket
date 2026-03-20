import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { updateProfile, changePassword } from './actions'
import { PasswordInput } from '@/components/PasswordInput'
import { SubmitButton } from '@/components/SubmitButton'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const hasRealEmail = profile.email && !profile.email.endsWith('@funnyticket.local')

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Paramètres</h1>

      {params?.success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-700 dark:text-green-300 animate-fade-in-down">
          {decodeURIComponent(params.success)}
        </div>
      )}

      {params?.error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300 animate-fade-in-down">
          {decodeURIComponent(params.error)}
        </div>
      )}

      {/* Profile section */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 p-6 animate-fade-in-up">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
          Mon profil
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Consultez et modifiez vos informations personnelles.
        </p>

        {/* Read-only info */}
        <div className="grid gap-4 sm:grid-cols-2 mb-6">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Identifiant
            </p>
            <p className="mt-1 text-sm font-mono font-medium text-gray-800 dark:text-gray-100">
              {profile.identifiant}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Email
            </p>
            <p className="mt-1 text-sm text-gray-800 dark:text-gray-100">
              {hasRealEmail ? profile.email : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Rôle
            </p>
            <p className="mt-1 text-sm text-gray-800 dark:text-gray-100">
              {profile.role === 'admin' ? 'Administrateur' : 'Client'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Inscrit le
            </p>
            <p className="mt-1 text-sm text-gray-800 dark:text-gray-100">
              {new Date(profile.created_at).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>

        <hr className="border-gray-100 dark:border-gray-700 mb-6" />

        {/* Editable fields */}
        <form action={updateProfile} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="full_name"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Nom complet
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                defaultValue={profile.full_name}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="phone"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Téléphone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={profile.phone}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 focus:outline-none"
                placeholder="034 00 000 00"
              />
            </div>
          </div>
          <SubmitButton pendingText="Enregistrement...">
            Enregistrer
          </SubmitButton>
        </form>
      </div>

      {/* Password change section */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 p-6 animate-fade-in-up">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
          Modifier le mot de passe
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Pour des raisons de sécurité, saisissez votre mot de passe actuel.
        </p>

        <form action={changePassword} className="space-y-4">
          <PasswordInput
            id="currentPassword"
            name="currentPassword"
            label="Mot de passe actuel"
          />
          <PasswordInput
            id="newPassword"
            name="newPassword"
            label="Nouveau mot de passe"
            showStrength
            minLength={8}
          />
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            label="Confirmer le nouveau mot de passe"
          />
          <SubmitButton pendingText="Modification...">
            Modifier le mot de passe
          </SubmitButton>
        </form>
      </div>
    </div>
  )
}
