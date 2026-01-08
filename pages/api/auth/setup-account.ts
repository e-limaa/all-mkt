import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const debugLogs: string[] = [];
    const log = (msg: string, data?: any) => {
        const line = `${new Date().toISOString()} - ${msg} ${data ? JSON.stringify(data) : ''}`;
        console.log(line);
        debugLogs.push(line);
    };

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed', debugLogs });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        log('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing');
        return res.status(500).json({ error: 'Server misconfiguration', debugLogs });
    }

    const { inviteToken, userId, name, regional, avatarUrl, avatarBase64, avatarFileName } = req.body;

    log('Received request', {
        inviteToken: inviteToken?.substring(0, 5) + '...',
        userId,
        name,
        hasAvatarBase64: !!avatarBase64,
        avatarBase64Len: avatarBase64?.length,
        avatarFileName
    });

    if (!inviteToken || !userId || !name) {
        return res.status(400).json({ error: 'Missing required fields', debugLogs });
    }

    try {
        // 1. Validate Invite
        const { data: invite, error: inviteError } = await supabaseAdmin
            .from('user_invites')
            .select('*')
            .eq('token', inviteToken)
            .single();

        if (inviteError || !invite) {
            log('Invite validation failed', inviteError);
            return res.status(400).json({ error: 'Convite inválido', debugLogs });
        }

        log('Invite validated', { role: invite.role, email: invite.email });

        if (invite.used_at) {
            log('Setup account called with used invite', inviteToken);
        }

        let finalAvatarUrl = avatarUrl || null;

        // 1.5 Server-Side Upload
        if (avatarBase64 && avatarFileName) {
            try {
                const buffer = Buffer.from(avatarBase64, 'base64');
                const filePath = `${userId}/${avatarFileName}`;

                const ext = avatarFileName.split('.').pop()?.toLowerCase();
                let contentType = 'image/png';
                if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
                if (ext === 'gif') contentType = 'image/gif';
                if (ext === 'webp') contentType = 'image/webp';

                log('Starting upload', { filePath, contentType, size: buffer.length });

                const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
                    .from('avatars')
                    .upload(filePath, buffer, {
                        contentType: contentType,
                        upsert: true
                    });

                if (uploadError) {
                    log('Upload failed', uploadError);
                } else {
                    log('Upload success', uploadData);
                    const { data: publicUrlData } = supabaseAdmin.storage
                        .from('avatars')
                        .getPublicUrl(filePath);

                    if (publicUrlData.publicUrl) {
                        finalAvatarUrl = publicUrlData.publicUrl;
                        log('Public URL generated', finalAvatarUrl);
                    }
                }
            } catch (err: any) {
                log('Upload exception', err.message);
            }
        }

        log('Final Avatar URL to save:', finalAvatarUrl); // Debug log

        // 2. Upsert Profile
        const upsertPayload = {
            id: userId,
            email: invite.email,
            name: name,
            avatar_url: finalAvatarUrl,
            role: invite.role,
            regional: regional || null,
            material_origin_scope: invite.material_origin_scope,
            viewer_access_to_all: ['admin', 'editor_marketing'].includes(invite.role),
            created_at: new Date().toISOString()
        };

        log('Upserting user', upsertPayload);

        const { error: profileError } = await supabaseAdmin
            .from('users')
            .upsert(upsertPayload, { onConflict: 'id' });

        if (profileError) {
            log('Profile upsert failed', profileError);
            return res.status(500).json({ error: 'Erro ao criar perfil', debugLogs });
        }

        log('Profile upsert success');

        // 2.5 VERIFICATION: Read back
        const { data: verifyUser, error: verifyError } = await supabaseAdmin
            .from('users')
            .select('id, name, avatar_url')
            .eq('id', userId)
            .single();

        log('Verification read', { verifyUser, verifyError });

        // 3. Close Invite
        await supabaseAdmin
            .from('user_invites')
            .update({ used_at: new Date().toISOString() })
            .eq('id', invite.id);

        return res.status(200).json({ success: true, debugLogs, verifiedUser: verifyUser });

    } catch (err: any) {
        log('Unhandled exception', err.message);
        return res.status(500).json({ error: err.message, debugLogs });
    }
}

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '20mb',
        },
    },
};
