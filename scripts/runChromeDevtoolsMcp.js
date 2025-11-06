#!/usr/bin/env node
/**
 * Helper script to interact with the Chrome DevTools MCP server.
 * Usage examples:
 *   node scripts/runChromeDevtoolsMcp.js list-tools
 *   node scripts/runChromeDevtoolsMcp.js call-tool take_screenshot "{\"url\":\"http://localhost:3000\"}"
 */

const path = require('path');

const sdkPackagePath = require.resolve('@modelcontextprotocol/sdk/package.json');
const sdkDir = path.resolve(path.dirname(sdkPackagePath), '..', '..');
const sdkCjsDir = path.join(sdkDir, 'dist', 'cjs');
const { Client } = require(path.join(sdkCjsDir, 'client', 'index.js'));
const { StdioClientTransport } = require(path.join(
  sdkCjsDir,
  'client',
  'stdio.js',
));

async function withClient(callback) {
  const transport = new StdioClientTransport({
    command: 'npx',
    args: [
      'chrome-devtools-mcp@latest',
      '--channel',
      'stable',
      '--isolated',
    ],
  });

  const client = new Client(
    { name: 'dam-mcp-script', version: '1.0.0' },
    {
      capabilities: {
        tools: {},
        resources: {},
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

function parseKeyValueArgs(tokens) {
  return tokens.reduce((acc, token) => {
    const [key, ...rest] = token.split('=');
    if (!key || rest.length === 0) {
      throw new Error(`Invalid key=value argument: ${token}`);
    }
    acc[key] = rest.join('=');
    return acc;
  }, {});
}

async function callTool(name, rawArgs) {
  if (!name) {
    console.error(
      'Usage: node scripts/runChromeDevtoolsMcp.js call-tool <toolName> [jsonArgs|key=value ...]',
    );
    process.exit(1);
  }

  let parsedArgs = {};

  if (rawArgs.length > 0) {
    const argsString = rawArgs.join(' ').trim();
    const potentialJson =
      argsString.startsWith("'") && argsString.endsWith("'")
        ? argsString.slice(1, -1)
        : argsString;

    try {
      parsedArgs = JSON.parse(potentialJson);
    } catch (jsonError) {
      try {
        parsedArgs = parseKeyValueArgs(rawArgs);
      } catch (kvError) {
        console.error(
          `Invalid arguments. JSON error: ${jsonError.message}. key=value error: ${kvError.message}`,
        );
        process.exit(1);
      }
    }
  }

  await withClient(async (client) => {
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

async function listResources() {
  await withClient(async (client) => {
    const response = await client.listResources();
    console.table(
      response.resources.map((resource) => ({
        uri: resource.uri,
        name: resource.name ?? '',
      })),
    );
  });
}

async function readResource(uri) {
  if (!uri) {
    console.error(
      'Usage: node scripts/runChromeDevtoolsMcp.js read-resource <resourceUri>',
    );
    process.exit(1);
  }

  await withClient(async (client) => {
    const response = await client.readResource(uri);
    console.log(JSON.stringify(response, null, 2));
  });
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === 'help') {
    console.log(`Usage:
  node scripts/runChromeDevtoolsMcp.js list-tools
  node scripts/runChromeDevtoolsMcp.js call-tool <toolName> [jsonArgs]
  node scripts/runChromeDevtoolsMcp.js list-resources
  node scripts/runChromeDevtoolsMcp.js read-resource <resourceUri>
`);
    process.exit(0);
  }

  if (command === 'list-tools') {
    await listTools();
    return;
  }

  if (command === 'call-tool') {
    const [toolName, ...rawArgs] = args;
    await callTool(toolName, rawArgs);
    return;
  }

  if (command === 'list-resources') {
    await listResources();
    return;
  }

  if (command === 'read-resource') {
    const [uri] = args;
    await readResource(uri);
    return;
  }

  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
