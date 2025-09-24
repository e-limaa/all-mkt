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

const ALLOWED_ROLES = ["admin", "editor", "viewer"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", "PUT");
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
    return res.status(403).json({ error: "Only administrators can update users" });
  }

  const { id, email, name, role, password } = req.body as {
    id?: string;
    email?: string;
    name?: string;
    role?: AllowedRole;
    password?: string;
  };

  if (!id || !email || !name) {
    return res.status(400).json({ error: "id, email and name are required" });
  }

  const normalizedRole: AllowedRole = ALLOWED_ROLES.includes(role as AllowedRole)
    ? (role as AllowedRole)
    : "viewer";

  const { data: targetUser, error: targetError } = await supabaseAdmin.auth.admin.getUserById(id);
  if (targetError || !targetUser?.user) {
    return res.status(404).json({ error: "User not found" });
  }

  const updatePayload: Record<string, any> = {
    email,
    user_metadata: {
      ...(targetUser.user.user_metadata || {}),
      role: normalizedRole,
      name,
    },
  };

  if (password && password.length > 0) {
    updatePayload.password = password;
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(id, updatePayload);
  if (updateError) {
    return res.status(400).json({ error: updateError.message });
  }

  const now = new Date().toISOString();
  const { data: existingProfile } = await supabaseAdmin
    .from("users")
    .select("created_at")
    .eq("id", id)
    .maybeSingle();

  const createdAt = existingProfile?.created_at || targetUser.user.created_at || now;

  const { error: upsertError } = await supabaseAdmin.from("users").upsert({
    id,
    email,
    name,
    role: normalizedRole,
    avatar_url: (targetUser.user.user_metadata as any)?.avatar_url || null,
    created_at: createdAt,
    updated_at: now,
  });

  if (upsertError) {
    return res.status(500).json({ error: upsertError.message });
  }

  return res.status(200).json({ userId: id });
}

