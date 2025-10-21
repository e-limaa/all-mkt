'use client';

import { supabase } from '../supabase';

export const createClient = () => {
  if (!supabase) {
    throw new Error('Supabase environment variables are not set.');
  }
  return supabase;
};

