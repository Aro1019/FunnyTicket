export function generateHotspotCredentials() {
  const crypto = require('crypto')
  const login = 'FT-' + crypto.randomBytes(3).toString('hex').toUpperCase()
  const password = crypto.randomBytes(4).toString('hex').toUpperCase()
  return { login, password }
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-MG').format(price) + ' Ar'
}

export function formatDuration(hours: number): string {
  if (hours < 24) return `${hours}h`
  if (hours < 168) return `${Math.floor(hours / 24)} jour(s)`
  if (hours < 720) return `${Math.floor(hours / 168)} semaine(s)`
  return `${Math.floor(hours / 720)} mois`
}
