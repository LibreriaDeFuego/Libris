import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Aterrizaje de los links que manda Supabase por mail (confirmar cuenta,
// recuperar contraseña, magic link). Soporta los dos formatos según cómo
// esté configurado el proyecto:
//   - PKCE: llega ?code=... y hay que canjearlo por una sesión.
//   - OTP:  llega ?token_hash=...&type=... y hay que verificarlo.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/';

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
