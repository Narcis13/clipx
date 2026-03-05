import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { TOOL_DEFINITIONS } from "./tools.js";
import {
  handleClipboardRead,
  handleClipboardWrite,
  handleClipboardPeek,
  handleClipboardType,
  handleClipboardHistory,
  handleClipboardStackPush,
  handleClipboardStackPop,
} from "./handlers.js";

export async function startMcpServer(): Promise<void> {
  const server = new Server(
    {
      name: "clipx",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOL_DEFINITIONS };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "clipboard_read":
        return handleClipboardRead((args ?? {}) as { format?: string });

      case "clipboard_write":
        return handleClipboardWrite(
          args as { content: string; restore?: boolean }
        );

      case "clipboard_peek":
        return handleClipboardPeek();

      case "clipboard_type":
        return handleClipboardType();

      case "clipboard_history":
        return handleClipboardHistory(
          (args ?? {}) as { limit?: number; type?: string; search?: string }
        );

      case "clipboard_stack_push":
        return handleClipboardStackPush();

      case "clipboard_stack_pop":
        return handleClipboardStackPop();

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
