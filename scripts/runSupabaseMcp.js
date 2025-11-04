#!/usr/bin/env node
/**
 * Helper script to interact with the Supabase MCP server.
 * Usage:
 *   node scripts/runSupabaseMcp.js list-tools
 *   node scripts/runSupabaseMcp.js apply-migration <migrationName> <sqlFilePath>
 */

const path = require('path');
const { resolve } = path;
const { readFileSync } = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: resolve(__dirname, '..', '.env.local') });

const sdkPackagePath = require.resolve('@modelcontextprotocol/sdk/package.json');
const sdkDir = path.resolve(path.dirname(sdkPackagePath), '..', '..');
const sdkCjsDir = path.join(sdkDir, 'dist', 'cjs');
const { Client } = require(path.join(sdkCjsDir, 'client', 'index.js'));
const { StdioClientTransport } = require(path.join(
  sdkCjsDir,
  'client',
  'stdio.js',
));

const PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF ||
  process.env.SUPABASE_PROJECT_ID ||
  'xrnglprzyivxqtidfgrc';

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('Missing SUPABASE_ACCESS_TOKEN in environment (.env.local)');
  process.exit(1);
}

async function withClient(callback) {
  const transport = new StdioClientTransport({
    command: 'npx',
    args: [
      '-y',
      '@supabase/mcp-server-supabase@dev',
      `--project-ref=${PROJECT_REF}`,
    ],
    env: {
      SUPABASE_ACCESS_TOKEN,
    },
  });

  const client = new Client(
    { name: 'dam-mcp-script', version: '1.0.0' },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  await client.connect(transport);

  try {
    await callback(client);
  } finally {
    await client.close();
  }
}

async function listTools() {
  await withClient(async (client) => {
    const result = await client.listTools();
    console.table(
      result.tools.map((tool) => ({
        name: tool.name,
        description: tool.description?.slice(0, 80) ?? '',
      })),
    );
  });
}

async function applyMigration(name, filePath) {
  if (!name || !filePath) {
    console.error(
      'Usage: node scripts/runSupabaseMcp.js apply-migration <migrationName> <sqlFile>',
    );
    process.exit(1);
  }

  const absolutePath = resolve(process.cwd(), filePath);
  const sql = readFileSync(absolutePath, 'utf8');

  await withClient(async (client) => {
    const response = await client.callTool({
      name: 'apply_migration',
      arguments: {
        name,
        query: sql,
      },
    });

    if (response.isError) {
      throw new Error(
        `Supabase applyMigration failed: ${JSON.stringify(response)}`,
      );
    }

    console.log('Migration applied successfully.');
  });
}

async function executeSql(sql) {
  if (!sql) {
    console.error(
      'Usage: node scripts/runSupabaseMcp.js exec-sql "<SQL statement>"',
    );
    process.exit(1);
  }

  await withClient(async (client) => {
    console.log(`Executing SQL: ${sql}`);
    const response = await client.callTool({
      name: 'execute_sql',
      arguments: {
        query: sql,
      },
    });

    if (response.isError) {
      throw new Error(
        `Supabase execute_sql failed: ${JSON.stringify(response)}`,
      );
    }

    console.log(JSON.stringify(response, null, 2));
  });
}

async function getLogs(service = 'postgres') {
  await withClient(async (client) => {
    const response = await client.callTool({
      name: 'get_logs',
      arguments: {
        service,
        iso_timestamp_start: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
    });

    if (response.isError) {
      throw new Error(`Supabase get_logs failed: ${JSON.stringify(response)}`);
    }

    console.log(JSON.stringify(response, null, 2));
  });
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === 'help') {
    console.log(`Usage:
  node scripts/runSupabaseMcp.js list-tools
  node scripts/runSupabaseMcp.js apply-migration <migrationName> <sqlFilePath>
  node scripts/runSupabaseMcp.js exec-sql "<SQL statement>"
  node scripts/runSupabaseMcp.js exec-sql-file <path-to-sql>
  node scripts/runSupabaseMcp.js get-logs [service]
`);
    process.exit(0);
  }

  if (command === 'list-tools') {
    await listTools();
    return;
  }

  if (command === 'apply-migration') {
    const [migrationName, sqlFile] = args;
    await applyMigration(migrationName, sqlFile);
    return;
  }

  if (command === 'exec-sql') {
    const sql = args.join(' ');
    await executeSql(sql);
    return;
  }

  if (command === 'exec-sql-file') {
    const filePath = args[0];
    if (!filePath) {
      console.error(
        'Usage: node scripts/runSupabaseMcp.js exec-sql-file <path-to-sql>',
      );
      process.exit(1);
    }
    const sql = readFileSync(resolve(process.cwd(), filePath), 'utf8');
    await executeSql(sql);
    return;
  }

  if (command === 'get-logs') {
    const service = args[0] || 'postgres';
    await getLogs(service);
    return;
  }

  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
