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

const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const normalizeRegional = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.toUpperCase();
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE");
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
    data: requesterProfile,
    error: requesterProfileError,
  } = await supabaseAdmin
    .from("users")
    .select("role, regional")
    .eq("id", requesterAuth.user.id)
    .single();

  if (requesterProfileError || !requesterProfile) {
    return res.status(403).json({ error: "Access denied" });
  }

  const requesterRole = requesterProfile.role;
  const requesterRegional = normalizeRegional(requesterProfile.regional);

  if (
    requesterRole !== "admin" &&
    requesterRole !== "editor_trade" &&
    requesterRole !== "editor_marketing"
  ) {
    return res.status(403).json({
      error: "Voce nao possui permissao para excluir usuarios",
    });
  }

  const { id } = req.body as { id?: string };

  if (!id) {
    console.error("[delete-user] ID nao fornecido no body:", req.body);
    return res.status(400).json({ error: "id is required" });
  }

  if (id === requesterAuth.user.id) {
    console.error("[delete-user] Tentativa de deletar a propria conta.");
    return res.status(400).json({ error: "You cannot delete your own account" });
  }

  const {
    data: targetProfile,
    error: targetProfileError,
  } = await supabaseAdmin
    .from("users")
    .select("role, regional, viewer_access_to_all, email")
    .eq("id", id)
    .maybeSingle();

  if (targetProfileError) {
    return res.status(500).json({ error: targetProfileError.message });
  }

  if (!targetProfile) {
    return res.status(404).json({ error: "Usuario nao encontrado" });
  }

  const targetEmail = (targetProfile as any).email; // Cast if type definition is outdated

  if (requesterRole === "editor_trade") {
    if (!requesterRegional) {
      return res
        .status(400)
        .json({ error: "Editor Trade sem regional configurada" });
    }

    if (targetProfile.role !== "viewer") {
      return res
        .status(403)
        .json({ error: "Editor Trade so pode excluir viewers" });
    }

    if (targetProfile.viewer_access_to_all) {
      return res.status(403).json({
        error: "Editor Trade nao pode excluir viewer com acesso total",
      });
    }

    const targetRegional = normalizeRegional(targetProfile.regional);
    if (!targetRegional || targetRegional !== requesterRegional) {
      return res.status(403).json({
        error: "Editor Trade so pode excluir viewers da sua regional",
      });
    }
  }

  if (requesterRole === "editor_marketing") {
    if (targetProfile.role === "admin" || targetProfile.role === "editor_marketing") {
      return res.status(403).json({
        error: "Editor Marketing nao pode excluir este usuario",
      });
    }
    if (targetProfile.role !== "viewer" && targetProfile.role !== "editor_trade") {
      return res.status(403).json({
        error: "Editor Marketing so pode excluir viewers ou editores Trade",
      });
    }
  }

  console.log(`[delete-user] Preparando para excluir user: ${id}. Requester: ${requesterAuth.user.id}`);

  // 1. Reassign ownership of critical business objects to the requester (Admin/Editor)
  const tablesToReassignCreatedBy = ["campaigns", "projects", "useful_links", "shared_links"];

  for (const table of tablesToReassignCreatedBy) {
    const { error: reassignError } = await supabaseAdmin
      .from(table as any)
      .update({ created_by: requesterAuth.user.id })
      .eq("created_by", id);

    if (reassignError) {
      console.error(`[delete-user] Erro ao reatribuir ${table}:`, reassignError);
      return res.status(500).json({ error: `Erro ao reatribuir ${table}: ${reassignError.message}` });
    }
  }

  // Assets usage 'uploaded_by' instead of 'created_by'
  const { error: reassignAssetsError } = await supabaseAdmin
    .from("assets")
    .update({ uploaded_by: requesterAuth.user.id })
    .eq("uploaded_by", id);

  if (reassignAssetsError) {
    console.error(`[delete-user] Erro ao reatribuir assets:`, reassignAssetsError);
    return res.status(500).json({ error: `Erro ao reatribuir assets: ${reassignAssetsError.message}` });
  }

  // 2. Set nullable fields to NULL
  const { error: nullifySettingsError } = await supabaseAdmin
    .from("system_settings")
    .update({ updated_by: null })
    .eq("updated_by", id);

  if (nullifySettingsError) {
    console.error(`[delete-user] Erro ao limpar system_settings:`, nullifySettingsError);
    // Non-critical, verify if we should silently continue
  }

  const { error: nullifyUsersError } = await supabaseAdmin
    .from("users")
    .update({ created_by: null })
    .eq("created_by", id);

  if (nullifyUsersError) {
    console.error(`[delete-user] Erro ao limpar users.created_by:`, nullifyUsersError);
  }

  // 3. Delete non-essential data owned by user

  // User Invites (Clean up invites created BY the user AND invites sent TO the user)
  const { error: deleteCreatedInvitesError } = await supabaseAdmin
    .from("user_invites" as any)
    .delete()
    .eq("created_by", id);

  if (deleteCreatedInvitesError) {
    console.error(`[delete-user] Erro ao limpar user_invites criados pelo user:`, deleteCreatedInvitesError);
  }

  if (targetEmail) {
    const { error: deleteReceivedInvitesError } = await supabaseAdmin
      .from("user_invites" as any)
      .delete()
      .eq("email", targetEmail);

    if (deleteReceivedInvitesError) {
      console.error(`[delete-user] Erro ao limpar convites recebidos pelo user:`, deleteReceivedInvitesError);
    }
  }

  // Activity Logs - Reassign logs to the requester to preserve history
  // Instead of deleting, we transfer ownership so the "record of actions" remains in the system,
  // albeit attributed to the admin now (or we could set to a placeholder if desired, but here we transfer).
  const { error: reassignLogsError } = await supabaseAdmin
    .from("activity_logs" as any)
    .update({ user_id: requesterAuth.user.id })
    .eq("user_id", id);

  if (reassignLogsError) {
    console.error(`[delete-user] Erro ao reatribuir activity_logs:`, reassignLogsError);
    // If update fails, we might still try to delete to ensure user removal? 
    // Let's stick to the reassign attempt first.
  }

  // 4. Delete user from public.users table FIRST (to handle public.users -> auth.users dependency if any)
  // Usually public.users references auth.users. If it's ON DELETE CASCADE, deleting auth removes public.
  // But if it's RESTRICT, we must delete public first.
  console.log(`[delete-user] Excluindo perfil público (public.users)...`);
  const { error: tableDeleteError } = await supabaseAdmin.from("users").delete().eq("id", id);
  if (tableDeleteError) {
    console.error("[delete-user] Erro ao deletar user da tabela:", tableDeleteError);
    return res.status(500).json({ error: `Erro Tabela: ${tableDeleteError.message}` });
  }

  // 5. Delete user from auth.users
  console.log(`[delete-user] Excluindo usuário da autenticação (auth.users)...`);
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (deleteError) {
    console.error("[delete-user] Erro ao deletar auth user:", deleteError);
    // Be careful: if we deleted public profile but auth failed, we have inconsistent state.
    // However, without transactions (which client lib doesn't support easily across schemas), this is best effort.
    return res.status(500).json({ error: `Erro Auth: ${deleteError.message}` });
  }

  // Log activity (using system/admin ID since user is gone)
  await logActivity(supabaseAdmin, {
    action: 'delete_user',
    entityType: 'user',
    entityId: id,
    userId: requesterAuth.user.id,
    metadata: {
      deletedUserId: id
    }
  });

  return res.status(200).json({ success: true });
}
