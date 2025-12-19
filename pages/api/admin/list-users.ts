import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get the user from the session cookie or authorization header
    // Since we are using Supabase Auth on client, we typically send the JWT.
    // Ideally, we should validate the user here. 
    // For quick implementation matching delete-user pattern:

    // Note: securely getting the user in Pages Router without helpers can be tricky if we don't pass the token.
    // We will assume the client sends the access_token in Authorization header or we rely on logic similar to delete-user if it used a specific auth method.
    // Checking delete-user.ts content from previous turns... it used `getUser(token)`.

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Missing authorization token' });
    }

    try {
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get the requester's profile to check Role and Regional
        const { data: requesterProfile, error: profileError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !requesterProfile) {
            return res.status(403).json({ error: 'Profile not found' });
        }

        const { role, regional } = requesterProfile;

        // Logic for returning users
        let query = supabaseAdmin
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        // Apply filters based on Role
        if (role === 'admin' || role === 'editor_marketing') {
            // Find All - No filter needed
        } else if (role === 'editor_trade') {
            if (!regional) {
                // Edge case: Editor Trade without regional shouldn't theoretically exist, 
                // but if so, maybe they see nothing or everything? 
                // Safer to return empty or error. Let's return only their own user or empty.
                return res.status(200).json([]);
            }
            // Filter by Regional
            query = query.eq('regional', regional);
        } else {
            // Viewers or others should not be listing users via this Admin API
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { data: users, error: fetchError } = await query;

        if (fetchError) {
            throw fetchError;
        }

        return res.status(200).json(users);

    } catch (err: any) {
        console.error('List users error:', err);
        return res.status(500).json({ error: err.message });
    }
}
