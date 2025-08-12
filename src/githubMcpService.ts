// githubMcpService.ts
// LLM-driven GitHub MCP service that dynamically discovers tools and uses AI for intent understanding

import { MCPClient } from './mcpClient';

export interface GitHubTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface GitHubToolResult {
  success: boolean;
  data?: any;
  error?: string;
  toolName: string;
  formattedResult?: string;
}

export class GitHubMcpService {
  private mcpClient: MCPClient;
  private availableTools: GitHubTool[] = [];
  private toolsLoaded: boolean = false;

  constructor(token?: string) {
    this.mcpClient = new MCPClient(token);
  }

  /**
   * Connect to MCP and discover available tools
   */
  async initialize(): Promise<void> {
    try {
      await this.mcpClient.connect();
      await this.loadAvailableTools();
    } catch (error) {
      throw new Error(`Failed to initialize GitHub MCP service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all available GitHub MCP tools
   */
  async getAvailableTools(): Promise<GitHubTool[]> {
    if (!this.toolsLoaded) {
      await this.loadAvailableTools();
    }
    return this.availableTools;
  }

  /**
   * Get tools list as a formatted string for LLM context
   */
  async getToolsContext(): Promise<string> {
    const tools = await this.getAvailableTools();
    
    if (tools.length === 0) {
      return "No GitHub MCP tools are currently available.";
    }

    let context = "Available GitHub MCP tools:\n\n";
    
    for (const tool of tools) {
      context += `**${tool.name}**\n`;
      context += `Description: ${tool.description}\n`;
      
      if (tool.inputSchema?.properties) {
        context += "Parameters:\n";
        for (const [param, schema] of Object.entries(tool.inputSchema.properties)) {
          const paramSchema = schema as any;
          const required = tool.inputSchema.required?.includes(param) ? " (required)" : " (optional)";
          context += `  - ${param}${required}: ${paramSchema.description || paramSchema.type || 'No description'}\n`;
        }
      }
      context += "\n";
    }

    return context;
  }

  /**
   * Execute a GitHub MCP tool
   */
  async executeTool(toolName: string, args: Record<string, any>): Promise<GitHubToolResult> {
    try {
      const result = await this.mcpClient.callTool(toolName, args);
      
      return {
        success: true,
        data: result,
        toolName,
        formattedResult: this.formatToolResult(toolName, result)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        toolName
      };
    }
  }

  /**
   * Format tool result for user-friendly display
   */
  private formatToolResult(toolName: string, result: any): string {
    try {
      // Handle different result types
      if (result?.content && Array.isArray(result.content)) {
        // MCP standard format
        return result.content.map((item: any) => {
          if (item.type === 'text') {
            return item.text;
          }
          return JSON.stringify(item, null, 2);
        }).join('\n\n');
      }

      if (typeof result === 'string') {
        return result;
      }

      if (typeof result === 'object') {
        // Format JSON results nicely
        if (Array.isArray(result)) {
          if (result.length === 0) {
            return "No results found.";
          }
          if (result.length === 1) {
            return this.formatSingleItem(result[0]);
          }
          return result.map((item, index) => 
            `**Item ${index + 1}:**\n${this.formatSingleItem(item)}`
          ).join('\n\n');
        }

        return this.formatSingleItem(result);
      }

      return String(result);
    } catch (error) {
      console.error('Error formatting tool result:', error);
      return `Raw result: ${JSON.stringify(result, null, 2)}`;
    }
  }

  /**
   * Format a single item (issue, PR, repo, etc.)
   */
  private formatSingleItem(item: any): string {
    if (!item || typeof item !== 'object') {
      return String(item);
    }

    // GitHub issue format
    if (item.number && item.title) {
      let formatted = `**#${item.number}: ${item.title}**\n`;
      if (item.state) formatted += `Status: ${item.state}\n`;
      if (item.user?.login) formatted += `Author: ${item.user.login}\n`;
      if (item.created_at) formatted += `Created: ${new Date(item.created_at).toLocaleDateString()}\n`;
      if (item.body) {
        const preview = item.body.length > 200 ? item.body.substring(0, 200) + '...' : item.body;
        formatted += `\nDescription:\n${preview}`;
      }
      if (item.html_url) formatted += `\n\n🔗 [View on GitHub](${item.html_url})`;
      return formatted;
    }

    // GitHub repository format
    if (item.name && item.full_name) {
      let formatted = `**${item.full_name}**\n`;
      if (item.description) formatted += `${item.description}\n`;
      if (item.language) formatted += `Language: ${item.language}\n`;
      if (item.stargazers_count !== undefined) formatted += `⭐ ${item.stargazers_count} stars\n`;
      if (item.html_url) formatted += `🔗 [View on GitHub](${item.html_url})`;
      return formatted;
    }

    // GitHub pull request format
    if (item.number && item.title && item.head) {
      let formatted = `**PR #${item.number}: ${item.title}**\n`;
      if (item.state) formatted += `Status: ${item.state}\n`;
      if (item.user?.login) formatted += `Author: ${item.user.login}\n`;
      if (item.head?.ref && item.base?.ref) formatted += `${item.head.ref} → ${item.base.ref}\n`;
      if (item.created_at) formatted += `Created: ${new Date(item.created_at).toLocaleDateString()}\n`;
      if (item.html_url) formatted += `🔗 [View on GitHub](${item.html_url})`;
      return formatted;
    }

    // Fallback: show key-value pairs
    const keyValue = Object.entries(item)
      .filter(([key, value]) => value !== null && value !== undefined && value !== '')
      .slice(0, 10) // Limit to prevent overwhelming output
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    return keyValue || JSON.stringify(item, null, 2);
  }

  /**
   * Load available tools from MCP server
   */
  private async loadAvailableTools(): Promise<void> {
    try {
      const toolsResponse = await this.mcpClient.listTools();
      
      if (toolsResponse?.tools && Array.isArray(toolsResponse.tools)) {
        this.availableTools = toolsResponse.tools.map((tool: any) => ({
          name: tool.name,
          description: tool.description || 'No description available',
          inputSchema: tool.inputSchema || {}
        }));
      } else {
        this.availableTools = [];
      }
      
      this.toolsLoaded = true;
      console.log(`Loaded ${this.availableTools.length} GitHub MCP tools`);
    } catch (error) {
      console.error('Failed to load GitHub MCP tools:', error);
      this.availableTools = [];
      this.toolsLoaded = true;
    }
  }

  /**
   * Get default repository configuration
   */
  getDefaultRepository(): { owner?: string; repo?: string } {
    return {
      owner: process.env.GITHUB_DEFAULT_OWNER,
      repo: process.env.GITHUB_DEFAULT_REPO
    };
  }

  /**
   * Create system prompt for LLM to understand GitHub operations
   */
  async createSystemPrompt(): Promise<string> {
    const toolsContext = await this.getToolsContext();
    const defaultRepo = this.getDefaultRepository();
    
    let prompt = `You are a GitHub assistant that helps users interact with GitHub repositories using available MCP tools.

${toolsContext}

Default Repository Settings:`;
    
    if (defaultRepo.owner && defaultRepo.repo) {
      prompt += `
- Owner: ${defaultRepo.owner}
- Repository: ${defaultRepo.repo}

When users don't specify a repository, use these defaults.`;
    } else {
      prompt += `
- No default repository configured. Users must specify owner/repo explicitly.`;
    }

    prompt += `

Guidelines for tool usage:
1. Always choose the most appropriate tool based on user intent
2. Use default repository when not specified by user
3. Extract relevant parameters from user messages (issue numbers, PR numbers, etc.)
4. If multiple tools could work, choose the most specific one
5. Provide helpful error messages if required parameters are missing
6. Format responses in a user-friendly way

When responding about tool execution:
- Be conversational and helpful
- Include relevant details from the results
- Provide links when available
- Suggest related actions when appropriate`;

    return prompt;
  }
}
