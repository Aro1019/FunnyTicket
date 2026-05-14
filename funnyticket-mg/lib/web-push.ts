import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:contact@funnyticket.mg',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export interface PushPayload {
  title: string
  body: string
  tag?: string
  url?: string
}

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
) {
  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  }

  return webpush.sendNotification(pushSubscription, JSON.stringify(payload))
}

/**
 * Send push notification to a specific user (all their subscriptions).
 * Silently cleans up expired subscriptions (410 Gone).
 */
export async function notifyUser(
  supabase: { from: (table: string) => any },
  userId: string,
  payload: PushPayload
) {
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subscriptions?.length) return

  const results = await Promise.allSettled(
    subscriptions.map((sub: any) => sendPushNotification(sub, payload))
  )

  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'rejected') {
      const reason = (results[i] as PromiseRejectedResult).reason
      if (reason?.statusCode === 410) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscriptions[i].endpoint)
      }
    }
  }
}

/**
 * Send push notification to all admins.
 */
export async function notifyAdmins(
  supabase: { from: (table: string) => any },
  payload: PushPayload
) {
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'superadmin'])

  if (!admins?.length) return

  await Promise.allSettled(
    admins.map((admin: any) => notifyUser(supabase, admin.id, payload))
  )
}
