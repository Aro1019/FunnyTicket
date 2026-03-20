import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from './actions'
import { SubmitButton } from '@/components/SubmitButton'
import { NavLinks } from '@/components/NavLinks'
import { ThemeToggle } from '@/components/ThemeToggle'
import { CartProvider } from '@/components/CartProvider'
import { CartBadge } from '@/components/CartBadge'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // If profile doesn't exist yet (trigger delay or RLS issue), create it
  if (!profile) {
    const { data: newProfile } = await supabase.from('profiles').upsert({
      id: user.id,
      identifiant: user.user_metadata?.identifiant || user.email || user.id.slice(0, 8),
      full_name: user.user_metadata?.full_name || '',
      phone: user.user_metadata?.phone || '',
      email: user.user_metadata?.email || user.email || null,
      role: 'user',
    }).select().single()
    profile = newProfile
  }

  if (!profile) {
    // Last resort — still no profile, sign out to avoid loop
    await supabase.auth.signOut()
    redirect('/login?error=' + encodeURIComponent('Erreur de profil. Veuillez réessayer.'))
  }

  const isAdmin = profile.role === 'admin'
  const isSuperAdmin = profile.role === 'superadmin'

  const superAdminLinks = [
    { href: '/superadmin', label: 'Vue d\'ensemble' },
    { href: '/superadmin/users', label: 'Utilisateurs' },
    { href: '/superadmin/vendors', label: 'Vendeurs' },
    { href: '/settings', label: 'Paramètres' },
  ]

  const adminLinks = [
    { href: '/admin', label: 'Tableau de bord' },
    { href: '/admin/tickets', label: 'Suivi tickets' },
    { href: '/admin/payments', label: 'Paiements' },
    { href: '/admin/payment-methods', label: 'Config paiement' },
    { href: '/settings', label: 'Paramètres' },
  ]

  const clientLinks = [
    { href: '/client', label: 'Acheter un ticket' },
    { href: '/client/tickets', label: 'Mes tickets' },
    { href: '/settings', label: 'Paramètres' },
  ]

  const navLinks = isSuperAdmin ? superAdminLinks : isAdmin ? adminLinks : clientLinks

  return (
    <CartProvider>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navbar */}
      <nav className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link
                href={isSuperAdmin ? '/superadmin' : isAdmin ? '/admin' : '/client'}
                className="text-xl font-bold text-indigo-600 dark:text-indigo-400"
              >
                🎫 FunnyTicket
              </Link>
              <div className="hidden sm:flex items-center gap-1">
                <NavLinks links={navLinks} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!isAdmin && !isSuperAdmin && <CartBadge />}
              <ThemeToggle />
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{profile.full_name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isSuperAdmin ? 'Super Admin' : isAdmin ? 'Administrateur' : 'Client'}
                </p>
              </div>
              <form action={signOut}>
                <SubmitButton variant="outline" pendingText="Déconnexion..." className="px-3 py-1.5">
                  Déconnexion
                </SubmitButton>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile nav */}
      <div className="sm:hidden border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 flex gap-2 overflow-x-auto">
        <NavLinks links={navLinks} mobile />
      </div>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
    </CartProvider>
  )
}
