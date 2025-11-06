#!/usr/bin/env node
/**
 * Helper script to interact with the PostHog MCP server.
 *
 * Examples:
 *   node scripts/runPosthogMcp.js list-tools
 *   node scripts/runPosthogMcp.js call-tool set_session_recording '{"project_id": 1, "recording": true}'
 *
 * Provide JSON arguments or key=value pairs. Use -- to pass additional
 * arguments to the underlying MCP command (rarely needed).
 */

const path = require('path');

function splitServerArgs(argv) {
  const delimiter = argv.indexOf('--');
  if (delimiter === -1) {
    return { commandArgs: argv.slice(2), serverArgs: [] };
  }

  return {
    commandArgs: argv.slice(2, delimiter),
    serverArgs: argv.slice(delimiter + 1),
  };
}

const sdkPackagePath = require.resolve('@modelcontextprotocol/sdk/package.json');
const sdkDir = path.resolve(path.dirname(sdkPackagePath), '..', '..');
const sdkCjsDir = path.join(sdkDir, 'dist', 'cjs');

const { Client } = require(path.join(sdkCjsDir, 'client', 'index.js'));
const { StdioClientTransport } = require(path.join(
  sdkCjsDir,
  'client',
  'stdio.js',
));

function parseKeyValueArgs(tokens) {
  return tokens.reduce((acc, token) => {
    const [key, ...rest] = token.split('=');
    if (!key || rest.length === 0) {
      throw new Error(`Invalid key=value argument: ${token}`);
    }

    const valueString = rest.join('=');

    let value;
    if (/^-?\d+(\.\d+)?$/.test(valueString)) {
      value = Number(valueString);
    } else if (valueString === 'true' || valueString === 'false') {
      value = valueString === 'true';
    } else if (
      (valueString.startsWith('{') && valueString.endsWith('}')) ||
      (valueString.startsWith('[') && valueString.endsWith(']'))
    ) {
      try {
        value = JSON.parse(valueString);
      } catch (error) {
        throw new Error(
          `Invalid JSON for argument ${key}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    } else {
      value = valueString;
    }

    acc[key] = value;
    return acc;
  }, {});
}

function normalizeArgs(rawArgs) {
  if (rawArgs.length === 0) {
    return {};
  }

  if (rawArgs.length === 1 && rawArgs[0].startsWith('@')) {
    const filePath = rawArgs[0].slice(1);
    const absolute = path.resolve(process.cwd(), filePath);
    const fileContents = require('fs').readFileSync(absolute, 'utf8');
    return JSON.parse(fileContents);
  }

  const argsString = rawArgs.join(' ').trim();
  const potentialJson =
    (argsString.startsWith("'") && argsString.endsWith("'")) ||
    (argsString.startsWith('"') && argsString.endsWith('"'))
      ? argsString.slice(1, -1)
      : argsString;

  const looksJson =
    (potentialJson.startsWith('{') && potentialJson.endsWith('}')) ||
    (potentialJson.startsWith('[') && potentialJson.endsWith(']'));

  if (looksJson) {
    return JSON.parse(potentialJson);
  }

  if (potentialJson === argsString) {
    return parseKeyValueArgs(rawArgs);
  }

  return parseKeyValueArgs([potentialJson]);
}

async function withClient(serverArgs, callback) {
  const defaultAuthHeader =
    'Bearer phx_ZXIm8gll64QqM9fuqwS0qhtV2JzO3jZ5CUTMPCz5tW1jIMW';

  const transport = new StdioClientTransport({
    command: 'npx',
    args: [
      '-y',
      'mcp-remote@latest',
      'https://mcp.posthog.com/sse',
      '--header',
      `Authorization:${
        process.env.POSTHOG_AUTH_HEADER ?? defaultAuthHeader
      }`,
      ...serverArgs,
    ],
  });

  const client = new Client(
    { name: 'dam-posthog-tool', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  await client.connect(transport);

  try {
    return await callback(client);
  } finally {
    await client.close();
  }
}

async function listTools(serverArgs) {
  return withClient(serverArgs, async (client) => {
    const result = await client.listTools();
    console.table(
      result.tools.map((tool) => ({
        name: tool.name,
        description: tool.description?.slice(0, 80) ?? '',
      })),
    );
  });
}

async function callTool(serverArgs, name, rawArgs) {
  if (!name) {
    throw new Error(
      'Usage: node scripts/runPosthogMcp.js call-tool <toolName> [args]',
    );
  }

  const parsedArgs = normalizeArgs(rawArgs);

  return withClient(serverArgs, async (client) => {
    const response = await client.callTool({
      name,
      arguments: parsedArgs,
    });

    if (response.isError) {
      throw new Error(
        `Tool call failed: ${JSON.stringify(response, null, 2)}`,
      );
    }

    console.log(JSON.stringify(response, null, 2));
  });
}

async function main() {
  const { commandArgs, serverArgs } = splitServerArgs(process.argv);
  const [command, ...rest] = commandArgs;

  if (!command || command === 'help') {
    console.log(`Usage:
  node scripts/runPosthogMcp.js list-tools [-- <server args>]
  node scripts/runPosthogMcp.js call-tool <toolName> [jsonArgs|key=value ...] [-- <server args>]

Examples:
  node scripts/runPosthogMcp.js list-tools
  node scripts/runPosthogMcp.js call-tool toggle_session_recording project_id=1 enabled=true
`);
    return;
  }

  if (command === 'list-tools') {
    await listTools(serverArgs);
    return;
  }

  if (command === 'call-tool') {
    const [toolName, ...rawArgs] = rest;
    await callTool(serverArgs, toolName, rawArgs);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
