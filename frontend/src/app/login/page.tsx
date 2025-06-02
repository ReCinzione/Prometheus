'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import supabase from '@/lib/supabase/client';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={['google', 'github']}
        redirectTo={typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined}
      />
    </div>
  );
}

