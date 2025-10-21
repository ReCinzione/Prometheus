import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createClient = () => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookieStore = cookies()
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            const cookieStore = cookies()
            cookieStore.set(name, value, options)
          } catch (error) {
            // Handle cookie errors
          }
        },
        remove(name: string, options: any) {
          try {
            const cookieStore = cookies()
            cookieStore.set(name, '', { ...options, maxAge: 0 })
          } catch (error) {
            // Handle cookie errors
          }
        },
      },
    }
  )
}