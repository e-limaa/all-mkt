import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase/admin';

type LookupResponse = Array<{
  id: string;
  name: string | null;
}>;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LookupResponse | { error: string }>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ids } = req.body ?? {};

  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: 'Invalid payload: ids must be an array' });
  }

  const uniqueIds = Array.from(
    new Set(
      ids
        .filter((id): id is string => typeof id === 'string')
        .map((id) => id.trim())
        .filter((id) => id.length > 0),
    ),
  );

  if (uniqueIds.length === 0) {
    return res.status(200).json([]);
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .in('id', uniqueIds);

    if (error) {
      throw error;
    }

    return res.status(200).json(
      (data ?? []).map((user) => ({
        id: user.id,
        name: user.name,
      })),
    );
  } catch (error) {
    console.error('[users.lookup] Failed to fetch user names', error);
    return res.status(500).json({ error: 'Failed to fetch user names' });
  }
}
