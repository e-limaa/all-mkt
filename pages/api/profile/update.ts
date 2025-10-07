import type { NextApiRequest, NextApiResponse } from 'next';
import { Buffer } from 'node:buffer';
import { supabaseAdmin } from '../../../lib/supabase/admin';

interface UpdateProfileRequest {
  name?: string;
  email?: string;
  newPassword?: string;
  removeAvatar?: boolean;
  avatar?: {
    name: string;
    data: string; // base64
  } | undefined;
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

function guessContentType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '').trim();

  if (!token) {
    return res.status(401).json({ message: 'Token ausente' });
  }

  const { data: userResult, error: userError } = await supabaseAdmin.auth.getUser(token);

  if (userError || !userResult?.user) {
    return res.status(401).json({ message: 'Sessão inválida' });
  }

  const userId = userResult.user.id;
  const { name, email, newPassword, removeAvatar, avatar }: UpdateProfileRequest = req.body;

  try {
    let publicAvatarUrl: string | null | undefined;

    if (avatar) {
      const buffer = Buffer.from(avatar.data, 'base64');
      const extension = avatar.name.split('.').pop() || 'jpg';
      const filePath = `avatars/${userId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${extension}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('avatars')
        .upload(filePath, buffer, {
          contentType: guessContentType(avatar.name),
          upsert: true,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data } = supabaseAdmin.storage.from('avatars').getPublicUrl(filePath);
      publicAvatarUrl = data.publicUrl;
    } else if (removeAvatar) {
      publicAvatarUrl = null;
    }

    const adminUpdatePayload: Parameters<typeof supabaseAdmin.auth.admin.updateUserById>[1] = {};

    if (name) {
      adminUpdatePayload.user_metadata = {
        ...userResult.user.user_metadata,
        name,
        avatar_url: publicAvatarUrl ?? userResult.user.user_metadata?.avatar_url ?? null,
      };
    } else if (typeof publicAvatarUrl !== 'undefined') {
      adminUpdatePayload.user_metadata = {
        ...userResult.user.user_metadata,
        avatar_url: publicAvatarUrl,
      };
    }

    if (email) {
      adminUpdatePayload.email = email;
    }

    if (newPassword) {
      adminUpdatePayload.password = newPassword;
    }

    if (Object.keys(adminUpdatePayload).length > 0) {
      const { error: adminError } = await supabaseAdmin.auth.admin.updateUserById(userId, adminUpdatePayload);
      if (adminError) {
        throw new Error(adminError.message);
      }
    }

    const mergedMetadata = {
      ...userResult.user.user_metadata,
      ...(adminUpdatePayload.user_metadata ?? {}),
    };

    const updates: Record<string, any> = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (typeof publicAvatarUrl !== 'undefined') {
      updates.avatar_url = publicAvatarUrl;
    }
    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update(updates)
        .eq('id', userId);
      if (updateError) {
        throw new Error(updateError.message);
      }
    }

    return res.status(200).json({
      user: {
        name: name ?? mergedMetadata.name ?? userResult.user.email ?? 'Usuário',
        email: email ?? userResult.user.email,
        avatarUrl: typeof publicAvatarUrl !== 'undefined' ? publicAvatarUrl : mergedMetadata.avatar_url ?? null,
      },
      supabaseUser: {
        email: email ?? userResult.user.email,
        user_metadata: mergedMetadata,
      },
    });
  } catch (error: any) {
    console.error('[API] update profile error:', error);
    return res.status(500).json({ message: error?.message || 'Erro ao atualizar perfil' });
  }
}
