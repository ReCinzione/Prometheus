'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import supabase from '@/lib/supabase/client';

export default function LoginPage() {
  const customTheme = {
    ...ThemeSupa,
    variables: {
      ...ThemeSupa.variables,
      colors: {
        ...ThemeSupa.variables?.colors,
        brand: '#7C3AED', // purple-600
        brandAccent: '#4F46E5', // indigo-600
        // You could also customize other colors like:
        // brandButtonText: 'white',
        // defaultButtonBackground: '#F3F4F6', // gray-100
        // defaultButtonBackgroundHover: '#E5E7EB', // gray-200
        // ...etc.
      },
      // You can also customize other aspects like fonts, radii, borders, etc.
      // e.g., fonts: { ...ThemeSupa.variables?.fonts, bodyFontFamily: '"Inter", sans-serif' }
    },
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="p-8 bg-white shadow-xl rounded-lg w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Prometheus Login
          </h1>
        </div>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: customTheme }}
          providers={['google', 'github']}
          redirectTo={typeof window !== 'undefined' ? `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback` : undefined}
          localization={{
            variables: {
              sign_in: {
                email_label: 'Email address',
                password_label: 'Password',
                button_label: 'Sign in',
                social_provider_text: 'Sign in with {{provider}}',
                link_text: 'Already have an account? Sign in',
              },
              sign_up: {
                email_label: 'Email address',
                password_label: 'Password',
                button_label: 'Sign up',
                social_provider_text: 'Sign up with {{provider}}',
                link_text: 'Don\'t have an account? Sign up',
              },
              // ... other localization options if needed
            },
          }}
        />
      </div>
    </div>
  );
}

