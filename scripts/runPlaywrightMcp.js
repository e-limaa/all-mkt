#!/usr/bin/env node
/**
 * Helper script to interact with the Playwright MCP server.
 * Examples:
 *   node scripts/runPlaywrightMcp.js list-tools
 *   node scripts/runPlaywrightMcp.js call-tool navigate url=http://127.0.0.1:3000
 *   node scripts/runPlaywrightMcp.js call-tool evaluate_script '{"expression":"window.location.href"}'
 *   node scripts/runPlaywrightMcp.js list-tools -- --browser chrome --headless
 *
 * Use `--` to pass arguments directly to the underlying MCP server.
 */

const path = require('path');

function splitServerArgs(argv) {
  const delimiterIndex = argv.indexOf('--');
  if (delimiterIndex === -1) {
    return {
      commandArgs: argv.slice(2),
      serverArgs: [],
    };
  }

  return {
    commandArgs: argv.slice(2, delimiterIndex),
    serverArgs: argv.slice(delimiterIndex + 1),
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

async function withClient(serverArgs, callback) {
  const extraArgs =
    process.env.PLAYWRIGHT_MCP_ARGS?.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  const normalizedExtraArgs = extraArgs.map((token) =>
    token.startsWith('"') && token.endsWith('"')
      ? token.slice(1, -1)
      : token,
  );

  const transport = new StdioClientTransport({
    command: 'npx',
    args: [
      '@playwright/mcp@latest',
      ...normalizedExtraArgs,
      ...serverArgs,
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

async function listTools(serverArgs) {
  await withClient(serverArgs, async (client) => {
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
    console.error(
      'Usage: node scripts/runPlaywrightMcp.js call-tool <toolName> [jsonArgs|key=value ...] [-- <server args>]',
    );
    process.exit(1);
  }

  let parsedArgs = {};

  if (rawArgs.length > 0) {
    const argsString = rawArgs.join(' ').trim();
    const potentialJson =
      (argsString.startsWith("'") && argsString.endsWith("'")) ||
      (argsString.startsWith('"') && argsString.endsWith('"'))
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

  parsedArgs = Object.fromEntries(
    Object.entries(parsedArgs).map(([key, value]) => {
      if (key.endsWith('_b64') && typeof value === 'string') {
        const normalizedKey = key.replace(/_b64$/, '');
        return [normalizedKey, Buffer.from(value, 'base64').toString('utf8')];
      }
      return [key, value];
    }),
  );

  await withClient(serverArgs, async (client) => {
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

function tokenizeCommand(commandString) {
  const tokens = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < commandString.length; i += 1) {
    const char = commandString[i];

    if (inQuotes) {
      if (char === "'") {
        inQuotes = false;
      } else {
        current += char;
      }
      continue;
    }

    if (char === "'") {
      inQuotes = true;
      continue;
    }

    if (/\s/.test(char)) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

async function runSequence(serverArgs, actionStrings) {
  if (!actionStrings.length) {
    console.error(
      'Usage: node scripts/runPlaywrightMcp.js sequence "<toolName arg=value ...>" [...actions] [-- <server args>]',
    );
    process.exit(1);
  }

  await withClient(serverArgs, async (client) => {
    for (const action of actionStrings) {
      const tokens = tokenizeCommand(action);
      if (tokens.length === 0) {
        continue;
      }

      const [toolName, ...rawArgs] = tokens;
      let parsedArgs = {};

      if (rawArgs.length > 0) {
        const argsString = rawArgs.join(' ').trim();
        const potentialJson =
          (argsString.startsWith('{') && argsString.endsWith('}')) ||
          (argsString.startsWith('[') && argsString.endsWith(']'))
            ? argsString
            : argsString;

        try {
          parsedArgs = JSON.parse(potentialJson);
        } catch (jsonError) {
          try {
            parsedArgs = parseKeyValueArgs(rawArgs);
          } catch (kvError) {
            console.error(
              `Invalid arguments for sequence action "${action}". JSON error: ${jsonError.message}. key=value error: ${kvError.message}`,
            );
            process.exit(1);
          }
        }
      }

      parsedArgs = Object.fromEntries(
        Object.entries(parsedArgs).map(([key, value]) => {
          if (key.endsWith('_b64') && typeof value === 'string') {
            const normalizedKey = key.replace(/_b64$/, '');
            return [normalizedKey, Buffer.from(value, 'base64').toString('utf8')];
          }
          return [key, value];
        }),
      );

      const response = await client.callTool({
        name: toolName,
        arguments: parsedArgs,
      });

      if (response.isError) {
        throw new Error(
          `Tool call failed for "${toolName}": ${JSON.stringify(
            response,
            null,
            2,
          )}`,
        );
      }

      console.log(
        JSON.stringify(
          { action, content: response.content ?? response },
          null,
          2,
        ),
      );
    }
  });
}

async function listResources(serverArgs) {
  await withClient(serverArgs, async (client) => {
    const response = await client.listResources();
    console.table(
      response.resources.map((resource) => ({
        uri: resource.uri,
        name: resource.name ?? '',
      })),
    );
  });
}

async function readResource(serverArgs, uri) {
  if (!uri) {
    console.error(
      'Usage: node scripts/runPlaywrightMcp.js read-resource <resourceUri>',
    );
    process.exit(1);
  }

  await withClient(serverArgs, async (client) => {
    const response = await client.readResource(uri);
    console.log(JSON.stringify(response, null, 2));
  });
}

async function main() {
  const { commandArgs, serverArgs } = splitServerArgs(process.argv);
  const [command, ...rest] = commandArgs;

  if (!command || command === 'help') {
    console.log(`Usage:
  node scripts/runPlaywrightMcp.js list-tools [-- <server args>]
  node scripts/runPlaywrightMcp.js call-tool <toolName> [jsonArgs|key=value ...] [-- <server args>]
  node scripts/runPlaywrightMcp.js sequence "<toolName arg=value ...>" [...actions] [-- <server args>]
  node scripts/runPlaywrightMcp.js list-resources [-- <server args>]
  node scripts/runPlaywrightMcp.js read-resource <resourceUri> [-- <server args>]

Examples:
  node scripts/runPlaywrightMcp.js list-tools
  node scripts/runPlaywrightMcp.js call-tool navigate url=http://127.0.0.1:3000
  node scripts/runPlaywrightMcp.js sequence "browser_navigate url=http://127.0.0.1:3000" "browser_wait_for text=Login"
  node scripts/runPlaywrightMcp.js call-tool wait_for '{"text":"Login"}'
  node scripts/runPlaywrightMcp.js call-tool take_screenshot target=page -- --browser chrome --headless
`);
    process.exit(0);
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

  if (command === 'sequence') {
    await runSequence(serverArgs, rest);
    return;
  }

  if (command === 'list-resources') {
    await listResources(serverArgs);
    return;
  }

  if (command === 'read-resource') {
    const [uri] = rest;
    await readResource(serverArgs, uri);
    return;
  }

  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
