import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../types/supabase";
import { logActivity } from "../../../lib/activity-logger";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase environment variables are not configured.");
}

type UserTableRow = Database["public"]["Tables"]["users"]["Row"];

const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const ALLOWED_ROLES = [
  "admin",
  "editor_marketing",
  "editor_trade",
  "viewer",
] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

const ROLES_REQUIRE_REGIONAL: AllowedRole[] = [
  "editor_trade",
];

const normalizeRegional = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.toUpperCase();
};

const normalizeOriginScope = (value: unknown): "house" | "ev" | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed === "house" || trimmed === "ev" ? (trimmed as "house" | "ev") : null;
};

const extractAvatarUrl = (metadata: Record<string, unknown> | null | undefined): string | null => {
  const value = metadata && typeof metadata === 'object' ? metadata['avatar_url'] : undefined;
  return typeof value === 'string' ? value : null;
};

const isMissingOriginColumn = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const source = error as { message?: string; details?: string; hint?: string };
  const payload = `${source.message ?? ""} ${source.details ?? ""} ${source.hint ?? ""}`.toLowerCase();
  return payload.includes("material_origin_scope") && payload.includes("column");
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", "PUT");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing auth token" });
  }

  const {
    data: requesterAuth,
    error: requesterError,
  } = await supabaseAdmin.auth.getUser(token);
  if (requesterError || !requesterAuth?.user) {
    return res.status(401).json({ error: "Invalid auth token" });
  }

  const {
    data: requesterProfileData,
    error: requesterProfileError,
  } = await supabaseAdmin
    .from("users")
    .select("role, regional, material_origin_scope")
    .eq("id", requesterAuth.user.id)
    .maybeSingle();

  let effectiveRequesterProfile = requesterProfileData as Partial<UserTableRow> | null;
  let effectiveRequesterError = requesterProfileError;

  if (
    effectiveRequesterError &&
    isMissingOriginColumn(effectiveRequesterError)
  ) {
    const fallbackProfile = await supabaseAdmin
      .from("users")
      .select("role, regional")
      .eq("id", requesterAuth.user.id)
      .maybeSingle();
    effectiveRequesterProfile = fallbackProfile.data as Partial<UserTableRow> | null;
    effectiveRequesterError = fallbackProfile.error;
  }

  if (effectiveRequesterError && effectiveRequesterError.code !== "PGRST116") {
    return res.status(500).json({ error: effectiveRequesterError.message });
  }

  const requesterMetadata = requesterAuth.user.user_metadata || {};
  const requesterAppMetadata = requesterAuth.user.app_metadata || {};
  const fallbackRoleValue =
    (requesterMetadata.role as string | undefined) ??
    (requesterAppMetadata.role as string | undefined);
  const normalizedFallbackRole = (fallbackRoleValue || "").toLowerCase();
  const fallbackRole: AllowedRole = ALLOWED_ROLES.includes(
    normalizedFallbackRole as AllowedRole
  )
    ? (normalizedFallbackRole as AllowedRole)
    : "viewer";
  const fallbackRegional =
    typeof requesterMetadata.regional === "string"
      ? requesterMetadata.regional.trim().toUpperCase()
      : typeof requesterAppMetadata.regional === "string"
        ? (requesterAppMetadata.regional as string).trim().toUpperCase()
        : null;
  const requesterRole =
    (effectiveRequesterProfile?.role as AllowedRole) ?? fallbackRole;
  const requesterRegional = normalizeRegional(
    effectiveRequesterProfile?.regional ?? fallbackRegional
  );
  const isAdminRequester = requesterRole === "admin";
  const isEditorTradeRequester = requesterRole === "editor_trade";
  const isEditorMarketingRequester = requesterRole === "editor_marketing";
  if (!isAdminRequester && !isEditorTradeRequester && !isEditorMarketingRequester) {
    return res.status(403).json({
      error: "Voce nao possui permissao para atualizar usuarios",
    });
  }

  const {
    id,
    email,
    name,
    role,
    password,
    regional,
    viewerAccessToAll,
    originScope,
  } = req.body as {
    id?: string;
    email?: string;
    name?: string;
    role?: AllowedRole;
    password?: string;
    regional?: string | null;
    viewerAccessToAll?: boolean;
    originScope?: "house" | "ev" | null;
  };

  if (!id || !email || !name) {
    return res
      .status(400)
      .json({ error: "Id, e-mail e nome sao obrigatorios" });
  }

  const normalizedRequestedRegional = normalizeRegional(regional);
  let normalizedViewerGlobal = Boolean(viewerAccessToAll);
  let normalizedOriginScope = normalizeOriginScope(originScope);

  const {
    data: targetProfile,
    error: targetProfileError,
  } = await supabaseAdmin
    .from("users")
    .select(
      "role, regional, material_origin_scope, viewer_access_to_all, created_at, created_by"
    )
    .eq("id", id)
    .maybeSingle();

  let effectiveTargetProfile = targetProfile as Partial<UserTableRow> | null;
  let effectiveTargetError = targetProfileError;

  if (
    effectiveTargetError &&
    isMissingOriginColumn(effectiveTargetError)
  ) {
    const fallback = await supabaseAdmin
      .from("users")
      .select(
        "role, regional, viewer_access_to_all, created_at, created_by"
      )
      .eq("id", id)
      .maybeSingle();
    effectiveTargetProfile = fallback.data as Partial<UserTableRow> | null;
    effectiveTargetError = fallback.error;
  }

  if (effectiveTargetError) {
    return res.status(500).json({ error: effectiveTargetError.message });
  }

  const finalTargetProfile = effectiveTargetProfile as (
    Partial<UserTableRow> & { viewer_access_to_all?: boolean | null; created_at?: string | null; created_by?: string | null }
  ) | null;

  if (!finalTargetProfile) {
    return res.status(404).json({ error: "Usuario nao encontrado" });
  }

  const targetOriginScope = normalizeOriginScope(
    finalTargetProfile.material_origin_scope
  );
  if (normalizedOriginScope === null) {
    normalizedOriginScope = targetOriginScope;
  }

  let normalizedRole: AllowedRole = finalTargetProfile.role as AllowedRole;
  if (role && ALLOWED_ROLES.includes(role)) {
    normalizedRole = role;
  }

  if (requesterRole === "editor_trade") {
    normalizedRole = "viewer";
    normalizedViewerGlobal = false;
  }

  let normalizedRegional = normalizedRequestedRegional;

  const { data: targetUser, error: targetError } =
    await supabaseAdmin.auth.admin.getUserById(id);
  if (targetError || !targetUser?.user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (requesterRole === "editor_trade") {
    if (!requesterRegional) {
      return res
        .status(400)
        .json({ error: "Editor Trade sem regional configurada" });
    }

    if (finalTargetProfile.role !== "viewer") {
      return res
        .status(403)
        .json({ error: "Editor Trade so pode atualizar viewers" });
    }

    if (finalTargetProfile.viewer_access_to_all) {
      return res.status(403).json({
        error: "Editor Trade nao pode atualizar viewer com acesso total",
      });
    }

    const targetRegional = normalizeRegional(finalTargetProfile.regional);
    if (!targetRegional || targetRegional !== requesterRegional) {
      return res.status(403).json({
        error: "Editor Trade so pode atualizar viewers da sua regional",
      });
    }

    normalizedRegional = requesterRegional;
  }

  if (requesterRole === "editor_marketing") {
    if (finalTargetProfile.role === "admin" || finalTargetProfile.role === "editor_marketing") {
      return res.status(403).json({
        error: "Editor Marketing nao pode atualizar este usuario",
      });
    }
    if (normalizedRole === "admin" || normalizedRole === "editor_marketing") {
      return res.status(403).json({
        error: "Editor Marketing nao pode atribuir este perfil",
      });
    }
  }
  if (normalizedRole === "viewer") {
    if (normalizedViewerGlobal) {
      normalizedRegional = null;
      normalizedOriginScope = null;
    } else {
      normalizedRegional =
        normalizedRegional ?? normalizeRegional(finalTargetProfile.regional);
      if (!normalizedRegional) {
        return res.status(400).json({
          error: "Viewer restrito precisa de uma regional vinculada",
        });
      }
      if (!normalizedOriginScope) {
        normalizedOriginScope = targetOriginScope;
      }
      if (!normalizedOriginScope) {
        return res.status(400).json({
          error: "Viewer restrito precisa da origem (House ou EV)",
        });
      }
    }
  } else if (normalizedRole === "editor_trade") {
    normalizedViewerGlobal = false;
    normalizedRegional =
      normalizedRegional ?? normalizeRegional(finalTargetProfile.regional);
    if (!normalizedRegional) {
      return res.status(400).json({
        error: "Editor Trade precisa de uma regional vinculada",
      });
    }
    normalizedOriginScope = null;
  } else {
    normalizedViewerGlobal = false;
    normalizedOriginScope = null;
    if (ROLES_REQUIRE_REGIONAL.includes(normalizedRole)) {
      normalizedRegional =
        normalizedRegional ?? normalizeRegional(finalTargetProfile.regional);
      if (!normalizedRegional) {
        return res.status(400).json({
          error: "Regional e obrigatoria para o perfil selecionado",
        });
      }
    } else {
      normalizedRegional = null;
    }
  }

  const updatePayload: Record<string, unknown> = {
    email,
    user_metadata: {
      ...(targetUser.user.user_metadata || {}),
      role: normalizedRole,
      name,
      regional: normalizedRegional,
      viewer_access_to_all: normalizedViewerGlobal,
      material_origin_scope: normalizedOriginScope,
    },
  };

  if (password && password.length > 0) {
    updatePayload.password = password;
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    id,
    updatePayload
  );
  if (updateError) {
    return res.status(400).json({ error: updateError.message });
  }

  const now = new Date().toISOString();
  const createdAt =
    finalTargetProfile.created_at || targetUser.user.created_at || now;

  const upsertPayload = {
    id,
    email,
    name,
    role: normalizedRole,
    avatar_url: extractAvatarUrl(targetUser.user.user_metadata as Record<string, unknown> | null | undefined),
    regional: normalizedRegional,
    material_origin_scope: normalizedOriginScope,
    viewer_access_to_all: normalizedViewerGlobal,
    created_by: finalTargetProfile.created_by ?? null,
    created_at: createdAt,
    updated_at: now,
  };

  let { error: upsertError } = await supabaseAdmin.from("users").upsert(upsertPayload);

  if (upsertError && isMissingOriginColumn(upsertError)) {
    const fallbackPayload = { ...upsertPayload };
    delete (fallbackPayload as Partial<typeof upsertPayload>).material_origin_scope;
    const fallback = await supabaseAdmin
      .from("users")
      .upsert(fallbackPayload);
    upsertError = fallback.error;
  }

  if (upsertError) {
    return res.status(500).json({ error: upsertError.message });
  }

  // Log activity
  await logActivity(supabaseAdmin, {
    action: 'update_user',
    entityType: 'user',
    entityId: id,
    userId: requesterAuth.user.id,
    metadata: {
      email,
      role: normalizedRole,
      name,
      regional: normalizedRegional
    }
  });

  return res.status(200).json({ userId: id });
}
