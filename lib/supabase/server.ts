import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';

const defaultCookieOptions = (options?: CookieOptions) => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    path: options?.path ?? '/',
    domain: options?.domain,
    sameSite: options?.sameSite ?? 'lax',
    httpOnly: true,
    secure: options?.secure ?? isProduction,
    maxAge: options?.maxAge,
    expires: options?.expires,
    priority: options?.priority,
  } satisfies CookieOptions;
};

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? null;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? null;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not set.');
  }

  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        const cookieOptions = defaultCookieOptions(options);
        cookieStore.set({ name, value, ...cookieOptions });
      },
      remove(name, options) {
        const cookieOptions = defaultCookieOptions(options);
        cookieStore.set({ name, value: '', ...cookieOptions, maxAge: 0 });
      },
    },
  });
};
