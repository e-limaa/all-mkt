import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase environment variables are not configured.");
}

const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: "Missing auth token" });
    }

    const {
        data: { user },
        error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check role
    const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    if (userError || !userData || !['admin', 'editor_marketing'].includes(userData.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const {
        page = '1',
        limit = '20',
        startDate,
        endDate,
        action,
        userId,
        regional,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const startRange = (pageNum - 1) * limitNum;
    const endRange = startRange + limitNum - 1;

    // Use inner join if filtering by user properties (regional), otherwise left join
    const userJoinType = regional ? '!inner' : '';

    // @ts-ignore
    let query = supabaseAdmin
        .from('activity_logs')
        .select(
            `
      *,
      user:user_id${userJoinType} (
        name,
        avatar_url,
        email,
        regional
      )
    `,
            { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(startRange, endRange);

    if (startDate) {
        query = query.gte('created_at', startDate);
    }

    if (endDate) {
        query = query.lte('created_at', endDate);
    }

    if (action) {
        // Handle multi-select action filter (comma separated)
        const actions = (action as string).split(',');
        if (actions.length > 0) {
            query = query.in('action', actions);
        }
    }

    if (userId) {
        query = query.eq('user_id', userId);
    }

    if (regional) {
        query = query.eq('user.regional', regional);
    }

    const { data, error, count } = await query;

    if (error) {
        console.error('Error fetching activity logs:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }

    return res.status(200).json({
        data,
        meta: {
            total: count,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil((count || 0) / limitNum),
        },
    });
}
