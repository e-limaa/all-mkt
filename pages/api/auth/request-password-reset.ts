import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Supabase environment variables are not configured.');
}

const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body as { email?: string };

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Informe um e-mail válido.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const { data: existingUser, error: fetchError } = await supabaseAdmin.auth.admin.getUserByEmail(normalizedEmail);

    if (fetchError) {
      console.error('[password-reset] Falha ao buscar usuário:', fetchError.message);
      return res.status(500).json({ error: 'Não foi possível verificar o usuário. Tente novamente.' });
    }

    if (!existingUser?.user) {
      return res.status(404).json({ error: 'Não encontramos uma conta com este e-mail.' });
    }

    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${appUrl.replace(/\/$/, '')}/reset-password`,
    });

    if (resetError) {
      console.error('[password-reset] Falha ao solicitar link de recuperação:', resetError.message);
      return res.status(500).json({ error: 'Não foi possível enviar o link de recuperação. Tente novamente.' });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[password-reset] Erro inesperado:', error);
    return res.status(500).json({ error: 'Esse e-mail não existe na nossa base de dados. Insira um e-mail válido.' });
  }
}
