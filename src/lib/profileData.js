// Todo lo que necesita la pantalla de Perfil, para un profileId puntual —
// compartido entre "mi perfil" (/perfil) y "el perfil de otra persona"
// (/perfil/[profileId]) para no duplicar las cuatro consultas.
export async function getProfileData(supabase, viewerId, targetProfileId) {
  const isOwn = targetProfileId === viewerId;

  const [{ data: profile }, { data: stats }, { data: activity }, followRow] = await Promise.all([
    supabase.from('profiles').select('id, display_name, avatar_url, bio').eq('id', targetProfileId).maybeSingle(),
    supabase.rpc('profile_stats', { target_profile_id: targetProfileId }).maybeSingle(),
    supabase.rpc('profile_activity', { target_profile_id: targetProfileId, limit_count: 20 }),
    isOwn
      ? Promise.resolve({ data: null })
      : supabase.from('follows').select('follower_id').eq('follower_id', viewerId).eq('followed_id', targetProfileId).maybeSingle(),
  ]);

  return {
    profile,
    isOwn,
    isFollowing: Boolean(followRow?.data),
    stats: stats ?? { book_count: 0, follower_count: 0, following_count: 0 },
    activity: activity ?? [],
  };
}
