'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function signIn(prevState, formData) {
  const email = formData.get('email');
  const password = formData.get('password');
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  redirect('/');
}

export async function signUp(prevState, formData) {
  const email = formData.get('email');
  const password = formData.get('password');
  const displayName = formData.get('displayName');
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) return { error: error.message };

  // Con "Confirm email" activado (default de Supabase) signUp no devuelve
  // sesión: la cuenta existe pero recién queda usable al abrir el link del
  // mail. Sin este chequeo redirigíamos a "/" y el usuario rebotaba al login
  // sin ninguna explicación.
  if (!data.session) return { error: null, needsConfirmation: true };

  redirect('/');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
