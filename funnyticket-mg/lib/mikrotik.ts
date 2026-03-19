// MikroTik RouterOS REST API client (RouterOS 7+)

const MIKROTIK_URL = process.env.MIKROTIK_API_URL
const MIKROTIK_USER = process.env.MIKROTIK_API_USER
const MIKROTIK_PASS = process.env.MIKROTIK_API_PASSWORD

function getAuthHeader(): string {
  return 'Basic ' + Buffer.from(`${MIKROTIK_USER}:${MIKROTIK_PASS}`).toString('base64')
}

export async function createHotspotUser(
  name: string,
  password: string,
  profile: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${MIKROTIK_URL}/rest/ip/hotspot/user`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify({ name, password, profile }),
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur de connexion au routeur MikroTik',
    }
  }
}

export async function removeHotspotUser(
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // First find the user by name
    const findResponse = await fetch(
      `${MIKROTIK_URL}/rest/ip/hotspot/user?name=${encodeURIComponent(name)}`,
      {
        headers: { Authorization: getAuthHeader() },
      }
    )

    if (!findResponse.ok) {
      return { success: false, error: 'Utilisateur non trouvé' }
    }

    const users = await findResponse.json()
    if (!users.length) {
      return { success: false, error: 'Utilisateur non trouvé' }
    }

    const userId = users[0]['.id']

    const deleteResponse = await fetch(
      `${MIKROTIK_URL}/rest/ip/hotspot/user/${userId}`,
      {
        method: 'DELETE',
        headers: { Authorization: getAuthHeader() },
      }
    )

    if (!deleteResponse.ok) {
      return { success: false, error: 'Erreur lors de la suppression' }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur de connexion au routeur MikroTik',
    }
  }
}
