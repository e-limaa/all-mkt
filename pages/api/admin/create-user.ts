import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../types/supabase";

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

const normalizeOriginScope = (value: unknown): 'house' | 'ev' | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed === "house" || trimmed === "ev" ? (trimmed as 'house' | 'ev') : null;
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

interface CreateUserPayload {
  email?: string;
  password?: string;
  name?: string;
  role?: AllowedRole;
  regional?: string | null;
  viewerAccessToAll?: boolean;
  originScope?: 'house' | 'ev' | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing auth token" });
  }

  const {
    data: requesterAuth,
    error: requesterAuthError,
  } = await supabaseAdmin.auth.getUser(token);

  if (requesterAuthError || !requesterAuth?.user) {
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
  const requesterRegional =
    effectiveRequesterProfile?.regional ?? fallbackRegional ?? null;
  const isAdminRequester = requesterRole === "admin";
  const isEditorTradeRequester = requesterRole === "editor_trade";
  const isEditorMarketingRequester = requesterRole === "editor_marketing";

  if (!isAdminRequester && !isEditorTradeRequester && !isEditorMarketingRequester) {
    return res
      .status(403)
      .json({ error: "Voce nao possui permissao para criar usuarios" });
  }

  const {
    email,
    password,
    name,
    role,
    regional,
    viewerAccessToAll,
    originScope,
  } = req.body as CreateUserPayload;

  if (!email || !password || !name) {
    return res
      .status(400)
      .json({ error: "Email, senha provisória e nome são obrigatórios" });
  }

  let normalizedRole: AllowedRole = ALLOWED_ROLES.includes(role as AllowedRole)
    ? (role as AllowedRole)
    : "viewer";

  let normalizedRegional =
    regional?.trim().toUpperCase() ?? null;
  let normalizedViewerGlobal = Boolean(viewerAccessToAll);
  let normalizedOriginScope = normalizeOriginScope(originScope);

  if (requesterRole === "editor_trade") {
    normalizedRole = "viewer";
    normalizedViewerGlobal = false;
    if (!requesterRegional) {
      return res
        .status(400)
        .json({ error: "Editor Trade sem regional definida" });
    }
    normalizedRegional = requesterRegional;
  }

  if (
    requesterRole === "editor_marketing" &&
    (normalizedRole === "admin" || normalizedRole === "editor_marketing")
  ) {
    return res
      .status(403)
      .json({ error: "Editor Marketing nao pode criar este perfil" });
  }

  if (normalizedRole === "editor_trade" && !normalizedRegional) {
    return res
      .status(400)
      .json({ error: "Regional é obrigatória para o perfil selecionado" });
  }

  if (normalizedRole === "editor_trade") {
    normalizedViewerGlobal = false;
    normalizedOriginScope = null;
  } else if (normalizedRole === "viewer") {
    if (normalizedViewerGlobal) {
      normalizedRegional = null;
      normalizedOriginScope = null;
    } else if (!normalizedRegional) {
      return res
        .status(400)
        .json({ error: "Viewer restrito precisa de regional" });
    } else if (!normalizedOriginScope) {
      return res
        .status(400)
        .json({ error: "Viewer restrito precisa da origem (House ou EV)" });
    }
  } else {
    normalizedViewerGlobal = false;
    normalizedOriginScope = null;
  }

  const userMetadata = {
    name,
    role: normalizedRole,
    regional: normalizedRegional,
    viewer_access_to_all: normalizedViewerGlobal,
    created_by: requesterAuth.user.id,
    material_origin_scope: normalizedOriginScope,
  };

  const {
    data: createdUser,
    error: createError,
  } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: userMetadata,
  });

  if (createError) {
    return res.status(400).json({ error: createError.message });
  }

  if (!createdUser?.user) {
    return res
      .status(500)
      .json({ error: "Failed to create Supabase auth user" });
  }

  const now = new Date().toISOString();
  const upsertPayload = {
    id: createdUser.user.id,
    email,
    name,
    role: normalizedRole,
    avatar_url: extractAvatarUrl(createdUser.user.user_metadata as Record<string, unknown> | null | undefined),
    regional: normalizedRegional,
    material_origin_scope: normalizedOriginScope,
    viewer_access_to_all: normalizedViewerGlobal,
    created_by: requesterAuth.user.id,
    created_at: createdUser.user.created_at || now,
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

  return res.status(200).json({ userId: createdUser.user.id });
}
