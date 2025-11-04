import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../types/supabase";

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
    return res.status(400).json({ error: "id is required" });
  }

  if (id === requesterAuth.user.id) {
    return res.status(400).json({ error: "You cannot delete your own account" });
  }

  const {
    data: targetProfile,
    error: targetProfileError,
  } = await supabaseAdmin
    .from("users")
    .select("role, regional, viewer_access_to_all")
    .eq("id", id)
    .maybeSingle();

  if (targetProfileError) {
    return res.status(500).json({ error: targetProfileError.message });
  }

  if (!targetProfile) {
    return res.status(404).json({ error: "Usuario nao encontrado" });
  }

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

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (deleteError) {
    return res.status(400).json({ error: deleteError.message });
  }

  const { error: tableDeleteError } = await supabaseAdmin.from("users").delete().eq("id", id);
  if (tableDeleteError) {
    return res.status(500).json({ error: tableDeleteError.message });
  }

  return res.status(200).json({ success: true });
}
