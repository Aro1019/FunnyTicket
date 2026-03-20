import { createClient } from '@/lib/supabase/server'
import { PackCard } from '@/components/PackCard'
import { CartLimitLegend } from '@/components/CartLimitLegend'
import { NotificationPrompt } from '@/components/NotificationPrompt'

export default async function ClientDashboard() {
  const supabase = await createClient()

  const { data: packs } = await supabase
    .from('packs')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true })

  // Find the middle pack for "popular" badge
  const popularIndex = packs && packs.length >= 3 ? 1 : -1

  return (
    <div>
      <NotificationPrompt />

      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Nos offres WiFi</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        Choisissez le pack qui correspond à vos besoins et ajoutez-le au panier.
      </p>

      <CartLimitLegend />

      <div className="grid gap-6 md:grid-cols-3">
        {packs?.map((pack, index) => (
          <PackCard
            key={pack.id}
            pack={pack}
            isPopular={index === popularIndex}
          />
        ))}
      </div>
    </div>
  )
}
