import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (myProfile?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await params
  const { role } = await request.json()

  // Only allow promoting/demoting to user or admin
  if (role !== 'user' && role !== 'admin') {
    return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })
  }

  // Don't allow changing own role
  if (id === user.id) {
    return NextResponse.json({ error: 'Impossible de modifier votre propre rôle' }, { status: 400 })
  }

  // Don't allow changing another superadmin's role
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', id)
    .single()

  if (!targetProfile) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  }

  if (targetProfile.role === 'superadmin') {
    return NextResponse.json({ error: 'Impossible de modifier un super admin' }, { status: 403 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 })
  }

  return NextResponse.json({ success: true, role })
}
