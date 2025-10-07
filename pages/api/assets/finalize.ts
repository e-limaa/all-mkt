import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { v4 as uuidv4 } from 'uuid';

interface FinalizeItem {
  tempPath: string;
  originalName: string;
  baseName: string;
  extension: string;
  mimeType: string;
  size: number;
  assetType: 'image' | 'video' | 'document' | 'archive';
}

interface FinalizeRequest {
  categoryType: 'project' | 'campaign';
  categoryId: string;
  projectPhase?: string | null;
  items: FinalizeItem[];
}

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
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

  const { data: authResult, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authResult?.user) {
    return res.status(401).json({ message: 'Sessão inválida' });
  }

  const { user } = authResult;
  const { categoryType, categoryId, projectPhase, items }: FinalizeRequest = req.body;

  if (!categoryType || !categoryId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Payload inválido' });
  }

  const bucket = 'assets';

  let categoryName = '';
  if (categoryType === 'project') {
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('name')
      .eq('id', categoryId)
      .maybeSingle();
    if (error) {
      return res.status(400).json({ message: 'Empreendimento inválido' });
    }
    categoryName = data?.name ?? '';
  } else {
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select('name')
      .eq('id', categoryId)
      .maybeSingle();
    if (error) {
      return res.status(400).json({ message: 'Campanha inválida' });
    }
    categoryName = data?.name ?? '';
  }

  try {
    for (const item of items) {
      if (!item.tempPath) {
        throw new Error(`Arquivo temporário ausente para ${item.originalName}`);
      }

      const safeBase = sanitizeName(item.baseName || item.originalName || 'arquivo');
      const safeExtension = item.extension ? item.extension.toLowerCase() : 'bin';
      const finalPath = `${categoryType}/${categoryId}/${uuidv4()}-${safeBase}.${safeExtension}`;

      const { error: moveError } = await supabaseAdmin.storage.from(bucket).move(item.tempPath, finalPath);
      if (moveError) {
        throw new Error(moveError.message);
      }

      const { data: publicData } = supabaseAdmin.storage.from(bucket).getPublicUrl(finalPath);
      const publicUrl = publicData.publicUrl;
      const thumbnailUrl = item.assetType === 'image' ? publicUrl : null;

      const { error: insertError } = await supabaseAdmin.from('assets').insert({
        name: item.baseName || item.originalName,
        description: null,
        type: item.assetType,
        format: safeExtension,
        size: item.size,
        url: publicUrl,
        thumbnail_url: thumbnailUrl,
        tags: [],
        category_type: categoryType,
        category_id: categoryId,
        category_name: categoryName,
        project_phase: categoryType === 'project' ? projectPhase || null : null,
        is_public: false,
        metadata: {
          originalName: item.originalName,
          mimeType: item.mimeType,
          storagePath: finalPath,
        },
        uploaded_by: user.id,
      });

      if (insertError) {
        throw new Error(insertError.message);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[API] erro ao finalizar materiais', error);
    return res.status(500).json({ message: error?.message || 'Erro ao finalizar materiais' });
  }
}
