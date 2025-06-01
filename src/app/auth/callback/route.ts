// src/app/auth/callback/route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name) {
          const cookie = await cookieStore.get(name);
          return cookie?.value;
        },
        async set(name, value, options) {
          await cookieStore.set({ name, value, ...options });
        },
        async remove(name, options) {
          await cookieStore.set({ name, value: '', ...options });
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
