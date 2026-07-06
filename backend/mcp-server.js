const readline = require("readline");
const { buildDispatchPlan } = require("./agents/worknetAgent");

const serverInfo = {
  name: "worknet-dispatch-mcp",
  version: "1.0.0",
};

const tools = [
  {
    name: "worknet_dispatch_plan",
    description: "Create a safe service dispatch plan for a home-service request.",
    inputSchema: {
      type: "object",
      properties: {
        issue: {
          type: "string",
          description: "Customer problem description.",
        },
        address: {
          type: "string",
          description: "Service address or locality.",
        },
        category: {
          type: "string",
          description: "Optional service category override.",
        },
      },
      required: ["issue", "address"],
    },
  },
];

function jsonRpcResult(id, result) {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

function jsonRpcError(id, code, message) {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
    },
  };
}

function handleRequest(message) {
  if (message.method === "initialize") {
    return jsonRpcResult(message.id, {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {},
      },
      serverInfo,
    });
  }

  if (message.method === "tools/list") {
    return jsonRpcResult(message.id, { tools });
  }

  if (message.method === "tools/call") {
    const { name, arguments: args = {} } = message.params || {};

    if (name !== "worknet_dispatch_plan") {
      return jsonRpcError(message.id, -32602, `Unknown tool: ${name}`);
    }

    const plan = buildDispatchPlan(args);

    return jsonRpcResult(message.id, {
      content: [
        {
          type: "text",
          text: JSON.stringify(plan, null, 2),
        },
      ],
    });
  }

  if (message.method === "notifications/initialized") {
    return null;
  }

  return jsonRpcError(message.id, -32601, `Unknown method: ${message.method}`);
}

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

rl.on("line", (line) => {
  if (!line.trim()) {
    return;
  }

  try {
    const response = handleRequest(JSON.parse(line));

    if (response) {
      process.stdout.write(`${JSON.stringify(response)}\n`);
    }
  } catch (error) {
    process.stdout.write(`${JSON.stringify(jsonRpcError(null, -32700, "Invalid JSON-RPC message"))}\n`);
  }
});
