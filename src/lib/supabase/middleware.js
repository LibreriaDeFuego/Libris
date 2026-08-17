import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// Refreshes the Supabase auth session on every request so server components
// always see a valid (non-expired) session. Called from src/middleware.js.
export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  // Do not remove — refreshes the session and is required for the cookies
  // above to actually get written back to the response.
  await supabase.auth.getUser();

  return supabaseResponse;
}
