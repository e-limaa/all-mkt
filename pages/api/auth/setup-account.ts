import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { inviteToken, userId, name, regional } = req.body;

    if (!inviteToken || !userId || !name) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // 1. Validate Invite and Get Role
        const { data: invite, error: inviteError } = await supabaseAdmin
            .from('user_invites')
            .select('*')
            .eq('token', inviteToken)
            .single();

        if (inviteError || !invite) {
            return res.status(400).json({ error: 'Convite inválido ou não encontrado.' });
        }

        if (invite.used_at) {
            // Invite already used? Maybe retry scenario?
            // Check if matched user is same? 
            // For now, proceed but log.
            console.warn('Setup account called with used invite:', inviteToken);
        }

        // 2. Upsert Public Profile (Use upsert to handle if trigger already created row)
        // We use the ROLE from the invite, and Name from the form.
        const { error: profileError } = await supabaseAdmin
            .from('users')
            .upsert({
                id: userId,
                email: invite.email,
                name: name,
                role: invite.role, // FORCE role from invite
                regional: regional || null,
                viewer_access_to_all: invite.role === 'admin' || invite.role === 'editor_marketing' ? true : false,
                created_at: new Date().toISOString()
            }, { onConflict: 'id' }); // Update if exists

        if (profileError) {
            console.error('Error creating profile:', profileError);
            return res.status(500).json({ error: 'Erro ao criar perfil de usuário.' });
        }

        // 3. Mark invite as used
        await supabaseAdmin
            .from('user_invites')
            .update({ used_at: new Date().toISOString() })
            .eq('id', invite.id);

        return res.status(200).json({ success: true });

    } catch (err: any) {
        console.error('Setup account error:', err);
        return res.status(500).json({ error: err.message });
    }
}
