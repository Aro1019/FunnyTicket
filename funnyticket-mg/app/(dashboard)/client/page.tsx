import { createClient } from '@/lib/supabase/server'
import { PackCard } from '@/components/PackCard'
import { CartLimitLegend } from '@/components/CartLimitLegend'
import { NotificationPrompt } from '@/components/NotificationPrompt'
import { GiftProgress } from '@/components/GiftProgress'

export default async function ClientDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: packs } = await supabase
    .from('packs')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true })

  // Gift progress: count 1000 Ar tickets this week
  let giftCount = 0
  if (user) {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    monday.setHours(0, 0, 0, 0)

    const { count } = await supabase
      .from('tickets')
      .select('id, pack:packs!inner(price)', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .lte('pack.price', 1000)
      .in('status', ['active', 'pending'])
      .gte('created_at', monday.toISOString())

    giftCount = (count ?? 0) % 6
  }

  // Find the middle pack for "popular" badge
  const popularIndex = packs && packs.length >= 3 ? 1 : -1

  return (
    <div>
      <NotificationPrompt />

      <GiftProgress count={giftCount} target={6} />

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
