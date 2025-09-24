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
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing auth token" });
  }

  const { data: currentUser, error: currentUserError } = await supabaseAdmin.auth.getUser(token);

  if (currentUserError || !currentUser?.user) {
    return res.status(401).json({ error: "Invalid auth token" });
  }

  const { data: roleRow, error: roleError } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", currentUser.user.id)
    .single();

  if (roleError || roleRow?.role !== "admin") {
    return res.status(403).json({ error: "Only administrators can create users" });
  }

  const { email, password, name, role } = req.body as {
    email?: string;
    password?: string;
    name?: string;
    role?: AllowedRole;
  };

  if (!email || !password || !name) {
    return res.status(400).json({ error: "Email, password and name are required" });
  }

  const normalizedRole: AllowedRole = ALLOWED_ROLES.includes(role as AllowedRole)
    ? (role as AllowedRole)
    : "viewer";

  const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      role: normalizedRole,
    },
  });

  if (createError) {
    return res.status(400).json({ error: createError.message });
  }

  if (!createdUser?.user) {
    return res.status(500).json({ error: "Failed to create Supabase auth user" });
  }

  const now = new Date().toISOString();
  const { error: upsertError } = await supabaseAdmin.from("users").upsert({
    id: createdUser.user.id,
    email,
    name,
    role: normalizedRole,
    avatar_url: createdUser.user.user_metadata?.avatar_url || null,
    created_at: createdUser.user.created_at || now,
    updated_at: now,
  });

  if (upsertError) {
    return res.status(500).json({ error: upsertError.message });
  }

  return res.status(200).json({ userId: createdUser.user.id });
}

