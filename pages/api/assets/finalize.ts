import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { v4 as uuidv4 } from 'uuid';
import { logActivity } from '../../../lib/activity-logger';

const buildSharePath = (params: {
  categoryType?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  assetId: string;
}) => {
  const query = new URLSearchParams();
  if (params.categoryType) {
    query.set('categoryType', params.categoryType);
  }
  if (params.categoryId) {
    query.set('categoryId', params.categoryId);
  }
  if (params.categoryName) {
    query.set('categoryName', params.categoryName);
  }
  query.set('assetId', params.assetId);
  return `materials?${query.toString()}`;
};

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
  origin: 'house' | 'ev' | 'tenda_vendas';
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
    return res.status(401).json({ message: 'Sessao invalida' });
  }

  const { user } = authResult;
  const { categoryType, categoryId, projectPhase, origin, items }: FinalizeRequest = req.body;

  if (!categoryType || !categoryId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Payload invalido' });
  }


  if (origin !== 'house' && origin !== 'ev' && origin !== 'tenda_vendas') {
    return res.status(400).json({ message: 'Origem invalida' });
  }

  const bucket = 'assets';

  let categoryName = '';
  let categoryRegional: string | null = null;
  if (categoryType === 'project') {
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('name, regional')
      .eq('id', categoryId)
      .maybeSingle();
    if (error) {
      return res.status(400).json({ message: 'Empreendimento invalido' });
    }
    categoryName = data?.name ?? '';
    categoryRegional = data?.regional ?? null;
  } else {
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select('name, regional')
      .eq('id', categoryId)
      .maybeSingle();
    if (error) {
      return res.status(400).json({ message: 'Campanha invalida' });
    }
    categoryName = data?.name ?? '';
    categoryRegional = data?.regional ?? null;
  }

  if (!categoryRegional || typeof categoryRegional !== 'string' || !categoryRegional.trim()) {
    return res.status(400).json({ message: 'Regional nao configurada para a categoria selecionada' });
  }

  const normalizedCategoryRegional = categoryRegional.trim().toUpperCase();
  try {
    for (const item of items) {
      if (!item.tempPath) {
        throw new Error(`Arquivo temporario ausente para ${item.originalName}`);
      }

      const safeBase = sanitizeName(item.baseName || item.originalName || 'arquivo');
      const safeExtension = item.extension ? item.extension.toLowerCase() : 'bin';
      const assetId = uuidv4();
      const finalPath = `${categoryType}/${categoryId}/${assetId}-${safeBase}.${safeExtension}`;
      const sharePath = buildSharePath({
        categoryType,
        categoryId,
        categoryName,
        assetId,
      });

      const { error: moveError } = await supabaseAdmin.storage.from(bucket).move(item.tempPath, finalPath);
      if (moveError) {
        throw new Error(moveError.message);
      }

      const { data: publicData } = supabaseAdmin.storage.from(bucket).getPublicUrl(finalPath);
      const publicUrl = publicData.publicUrl;
      const thumbnailUrl = item.assetType === 'image' ? publicUrl : null;

      const { error: insertError } = await supabaseAdmin.from('assets').insert({
        id: assetId,
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
        share_path: sharePath,
        project_phase: categoryType === 'project' ? projectPhase || null : null,
        regional: normalizedCategoryRegional,
        is_public: false,
        metadata: {
          originalName: item.originalName,
          mimeType: item.mimeType,
          storagePath: finalPath,
        },
        origin,
        uploaded_by: user.id,
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      // Log activity
      await logActivity(supabaseAdmin, {
        action: 'upload_asset',
        entityType: 'asset',
        entityId: assetId,
        userId: user.id,
        metadata: {
          fileName: item.originalName,
          categoryType,
          categoryName,
          regional: normalizedCategoryRegional
        }
      });
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[API] erro ao finalizar materiais', error);
    return res.status(500).json({ message: error?.message || 'Erro ao finalizar materiais' });
  }
}

