// src/app/auth/callback/route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.delete(name, options);
        },
      },
    }
  );

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/', request.url));

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('Errore login:', error.message);
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.redirect(new URL('/home', request.url));
}
