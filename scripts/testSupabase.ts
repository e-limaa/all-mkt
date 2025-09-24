// @ts-nocheck
// Register ts-node when running via `node scripts/testSupabase.ts`
// @ts-ignore
require('ts-node').register({ transpileOnly: true });

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const envPath = process.env.SUPABASE_ENV_PATH
  ? path.resolve(process.env.SUPABASE_ENV_PATH)
  : path.resolve(process.cwd(), '.env.local');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn(`[warn] Environment file not found at ${envPath}. Using process variables only.`);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('[x] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL is missing.');
  process.exit(1);
}

if (!serviceRoleKey && !anonKey) {
  console.error('[x] Provide SUPABASE_SERVICE_ROLE_KEY (recommended) or NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  process.exit(1);
}

const authKey = serviceRoleKey || anonKey;
const client = createClient(supabaseUrl, authKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TABLES = {
  users: {
    columns: ['id', 'email', 'name', 'avatar_url', 'role', 'created_at', 'updated_at'],
    createSql: `
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  avatar_url text,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin','editor','viewer')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
`,
  },
  campaigns: {
    columns: ['id', 'name', 'description', 'color', 'status', 'start_date', 'end_date', 'created_at', 'updated_at', 'created_by'],
    createSql: `
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES public.users (id)
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
`,
  },
  projects: {
    columns: ['id', 'name', 'description', 'image', 'color', 'status', 'location', 'created_at', 'updated_at', 'created_by'],
    createSql: `
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image text,
  color text NOT NULL,
  status text NOT NULL DEFAULT 'vem-ai' CHECK (status IN ('vem-ai','breve-lancamento','lancamento')),
  location text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES public.users (id)
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
`,
  },
  assets: {
    columns: [
      'id','name','description','type','format','size','url','thumbnail_url','tags','category_type','category_id','category_name','project_phase','is_public','download_count','metadata','created_at','updated_at','uploaded_by'
    ],
    createSql: `
CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('image','video','document','archive')),
  format text NOT NULL,
  size bigint NOT NULL,
  url text NOT NULL,
  thumbnail_url text,
  tags text[] DEFAULT ARRAY[]::text[],
  category_type text NOT NULL CHECK (category_type IN ('campaign','project')),
  category_id uuid NOT NULL,
  category_name text,
  project_phase text CHECK (project_phase IN ('vem-ai','breve-lancamento','lancamento')),
  is_public boolean NOT NULL DEFAULT false,
  download_count integer NOT NULL DEFAULT 0,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  uploaded_by uuid REFERENCES public.users (id)
);
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
`,
  },
  shared_links: {
    columns: ['id','asset_id','token','expires_at','download_count','max_downloads','is_active','created_at','created_by'],
    createSql: `
CREATE TABLE public.shared_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets (id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz,
  download_count integer NOT NULL DEFAULT 0,
  max_downloads integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid REFERENCES public.users (id)
);
ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;
`,
  },
};

async function checkTable(table, meta) {
  try {
    const columnList = meta.columns.join(',');
    const { error, data } = await client.from(table).select(columnList).limit(1);

    if (error) {
      if (error.code === '42P01' || /relation \".*\" does not exist/i.test(error.message)) {
        return { table, status: 'missing_table', error: error.message };
      }

      if (/column .* does not exist/i.test(error.message)) {
        const match = error.message.match(/column \"?(.*?)\"? does not exist/i);
        const column = match ? match[1] : 'unknown';
        return { table, status: 'missing_columns', missingColumns: [column], error: error.message };
      }

      return { table, status: 'error', error: error.message };
    }

    const sampleCount = Array.isArray(data) ? data.length : 0;
    console.log(`[ok] ${table}: structure verified (sample rows returned: ${sampleCount}).`);
    return { table, status: 'ok' };
  } catch (err) {
    return { table, status: 'error', error: err && err.message ? err.message : String(err) };
  }
}

async function run() {
  console.log('Supabase URL:', supabaseUrl);
  console.log('Using key:', (authKey || '').slice(0, 6) + '...');
  console.log('---');

  const results = [];
  for (const [table, meta] of Object.entries(TABLES)) {
    console.log(`Checking table ${table}...`);
    const result = await checkTable(table, meta);
    results.push(result);
  }

  console.log('\nSummary:');
  for (const result of results) {
    if (result.status === 'ok') {
      console.log(`  [ok] ${result.table} ready.`);
    } else if (result.status === 'missing_table') {
      console.log(`  [x] ${result.table} does not exist.`);
    } else if (result.status === 'missing_columns') {
      console.log(`  [warn] ${result.table} missing columns: ${result.missingColumns.join(', ')}`);
    } else {
      console.log(`  [warn] ${result.table} error: ${result.error}`);
    }
  }

  const missing = results.filter(r => r.status === 'missing_table');
  const columnIssues = results.filter(r => r.status === 'missing_columns');

  if (missing.length > 0) {
    console.log('\nSQL suggested to create missing tables:');
    for (const item of missing) {
      console.log(`\n-- ${item.table}\n${TABLES[item.table].createSql}`);
    }
  }

  if (columnIssues.length > 0) {
    console.log('\nReview missing columns manually and adjust the tables.');
  }

  if (missing.length === 0 && columnIssues.length === 0) {
    console.log('\nAll required tables match the expected schema.');
  }

  process.exit(0);
}

run().catch((err) => {
  console.error('[x] Unexpected error while validating schema:', err);
  process.exit(1);
});
