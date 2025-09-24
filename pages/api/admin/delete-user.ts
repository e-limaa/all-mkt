import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../types/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
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

  const { data: requester, error: requesterError } = await supabaseAdmin.auth.getUser(token);
  if (requesterError || !requester?.user) {
    return res.status(401).json({ error: "Invalid auth token" });
  }

  const { data: roleRow, error: roleError } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", requester.user.id)
    .single();

  if (roleError || roleRow?.role !== "admin") {
    return res.status(403).json({ error: "Only administrators can delete users" });
  }

  const { id } = req.body as { id?: string };

  if (!id) {
    return res.status(400).json({ error: "id is required" });
  }

  if (id === requester.user.id) {
    return res.status(400).json({ error: "You cannot delete your own account" });
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
