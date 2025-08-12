// mcpClient.ts
// MCP/Context7-compliant client for connecting to the GitHub MCP server and invoking tools.
// See: https://modelcontextprotocol.io/introduction/specification/2025-03-26/client

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const GITHUB_MCP_URL = 'https://api.githubcopilot.com/mcp';

export class MCPClient {
  private client: Client;
  private transport: StreamableHTTPClientTransport;
  private connected: boolean = false;

  constructor(token?: string) {
    this.transport = new StreamableHTTPClientTransport(
      new URL(GITHUB_MCP_URL),
      token ? { requestInit: { headers: { Authorization: `Bearer ${token}` } } } : undefined
    );
    this.client = new Client({
      name: 'elfteamsagent-mcp-client',
      version: '1.0.0',
    });
  }

  async connect(): Promise<void> {
    try {
      if (!this.connected) {
        await this.client.connect(this.transport);
        this.connected = true;
      }
    } catch (error) {
      throw new Error(`Failed to connect to GitHub MCP server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listTools() {
    try {
      await this.ensureConnected();
      return await this.client.listTools();
    } catch (error) {
      throw new Error(`Failed to list tools: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async callTool(toolName: string, args: Record<string, any>) {
    try {
      await this.ensureConnected();
      return await this.client.callTool({ name: toolName, arguments: args });
    } catch (error) {
      throw new Error(`Failed to call tool '${toolName}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.connected) {
        await this.client.close();
        this.connected = false;
      }
    } catch (error) {
      console.warn('Error disconnecting MCP client:', error);
    }
  }
}

// Example usage (uncomment to test):
// const mcp = new MCPClient('<GITHUB_OAUTH_TOKEN>');
// await mcp.connect();
// const tools = await mcp.listTools();
// console.log(tools);
// const result = await mcp.callTool('some_tool', { param: 'value' });
// console.log(result);
