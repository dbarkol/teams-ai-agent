import { MemoryStorage, MessageFactory, TurnContext } from "botbuilder";
import * as path from "path";
import config from "../config";

// See https://aka.ms/teams-ai-library to learn more about the Teams AI library.
import { Application, ActionPlanner, OpenAIModel, PromptManager } from "@microsoft/teams-ai";
import { GitHubMcpService } from "../githubMcpService";
import { getUserIdFromContext } from "../githubOAuth";
import { getStoredToken, hasValidToken, storeToken } from "../tokenStore";

// Create AI components
const model = new OpenAIModel({
  azureApiKey: config.azureOpenAIKey,
  azureDefaultDeployment: config.azureOpenAIDeploymentName,
  azureEndpoint: config.azureOpenAIEndpoint,

  useSystemMessages: true,
  logRequests: true,
  // The agent is currently not working in any Teams group chats or Teams channels
  // when the stream response is enabled.
  stream: true,
});
const prompts = new PromptManager({
  promptsFolder: path.join(__dirname, "../prompts"),
});
const planner = new ActionPlanner({
  model,
  prompts,
  defaultPrompt: "chat",
  startStreamingMessage: 'Loading stream results...',
});

// Define storage and application
const storage = new MemoryStorage();

const app = new Application({
  storage,
  ai: {
    planner,
    enable_feedback_loop: true,
  },
});

// Enhanced GitHub MCP tool middleware - Custom selector for GitHub-related messages
app.message(async (context) => {
  const text = context.activity.text?.toLowerCase() || "";
  // Check if this is a GitHub-related request
  return text.includes("github") || text.includes("repo") || 
         text.includes("pull request") || text.includes("mcp") || 
         text.includes("tool") || text.includes("issue");
}, async (context, state) => {
  const text = context.activity.text?.toLowerCase() || "";

  try {
    // Get user ID from Teams context
    const userId = getUserIdFromContext(context);
    
    // Check if user has a valid GitHub token
    if (!hasValidToken(userId)) {
      // Generate absolute URL for GitHub OAuth (works in playground and production)
      const baseUrl = process.env.BOT_ENDPOINT || 'http://localhost:3978';
      const loginUrl = `${baseUrl}/auth/github?userId=${encodeURIComponent(userId)}`;
      
      // Create Adaptive Card for GitHub authentication
      const authCard = {
        type: "AdaptiveCard",
        body: [
          {
            type: "Container",
            style: "emphasis",
            items: [
              {
                type: "ColumnSet",
                columns: [
                  {
                    type: "Column",
                    items: [
                      {
                        type: "Image",
                        style: "Person",
                        url: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
                        size: "Small"
                      }
                    ],
                    width: "auto"
                  },
                  {
                    type: "Column",
                    items: [
                      {
                        type: "TextBlock",
                        size: "Medium",
                        weight: "Bolder",
                        text: "GitHub Authentication Required",
                        wrap: true
                      }
                    ],
                    width: "stretch"
                  }
                ]
              }
            ]
          },
          {
            type: "TextBlock",
            text: "To use GitHub tools and access your repositories, you need to authenticate with GitHub.",
            wrap: true,
            spacing: "Medium"
          },
          {
            type: "TextBlock",
            text: "**After authentication, you can:**",
            weight: "Bolder",
            spacing: "Medium"
          },
          {
            type: "TextBlock",
            text: "• List your repositories\n• View pull requests and issues\n• Create new repos and issues\n• Access file contents and search code",
            wrap: true,
            spacing: "Small"
          },
          {
            type: "TextBlock",
            text: "*Your GitHub token will be securely stored for this session.*",
            isSubtle: true,
            size: "Small",
            spacing: "Medium"
          }
        ],
        actions: [
          {
            type: "Action.OpenUrl",
            title: "🔗 Sign in to GitHub",
            url: loginUrl,
            style: "positive"
          }
        ],
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        version: "1.3"
      };

      await context.sendActivity({
        type: "message",
        attachments: [
          {
            contentType: "application/vnd.microsoft.card.adaptive",
            content: authCard
          }
        ]
      });
      return;
    }

    // Get stored token
    const tokenInfo = getStoredToken(userId);
    if (!tokenInfo) {
      await context.sendActivity("❌ Authentication error. Please try logging in again.");
      return;
    }

    // Initialize GitHub MCP service with LLM-driven approach
    const githubService = new GitHubMcpService(tokenInfo.access_token);
    await githubService.initialize();

    // Get available tools for LLM context
    const availableTools = await githubService.getAvailableTools();
    
    if (availableTools.length === 0) {
      await context.sendActivity(
        "⚠️ No GitHub tools are currently available from the MCP server.\n" +
        "This might be a temporary issue. Please try again later."
      );
      return;
    }

    // Special case: if user asks about available tools
    if (text.includes('available') && text.includes('tool')) {
      const toolsList = availableTools.map(tool => 
        `• **${tool.name}**: ${tool.description}`
      ).join('\n');
      
      await context.sendActivity(
        `🛠️ **Available GitHub Tools:**\n\n${toolsList}\n\n` +
        "You can use natural language to request GitHub operations, and I'll choose the best tool automatically!"
      );
      return;
    }

    // Create enhanced prompt with tools context and user request
    const systemPrompt = await githubService.createSystemPrompt();
    const userRequest = context.activity.text || '';
    
    // Use LLM to understand intent and select tools
    let aiDecision;
    try {
      // For now, use a simplified approach that chooses tools based on keywords
      // This can be enhanced later with proper LLM integration
      const normalizedRequest = userRequest.toLowerCase();
      aiDecision = { toolCalls: [], needsMoreInfo: false };

      // Simple keyword-based tool selection 
      if (normalizedRequest.includes('issue') && normalizedRequest.includes('#')) {
        const issueMatch = normalizedRequest.match(/#(\d+)/);
        if (issueMatch) {
          const defaultRepo = githubService.getDefaultRepository();
          aiDecision.toolCalls.push({
            toolName: availableTools.find(t => t.name.includes('issue') && t.name.includes('get'))?.name || 'get_issue',
            parameters: {
              owner: defaultRepo.owner,
              repo: defaultRepo.repo,
              issue_number: parseInt(issueMatch[1])
            },
            reasoning: `Getting issue #${issueMatch[1]}`
          });
        }
      } else if (normalizedRequest.includes('available') && normalizedRequest.includes('tool')) {
        // This is handled above, so skip
        aiDecision.toolCalls = [];
      } else if (normalizedRequest.includes('list') && normalizedRequest.includes('repo')) {
        aiDecision.toolCalls.push({
          toolName: availableTools.find(t => t.name.includes('repo') && t.name.includes('list'))?.name || 'list_repos',
          parameters: {},
          reasoning: 'Listing repositories'
        });
      } else {
        // Try to find the most relevant tool based on available tools
        const relevantTool = availableTools.find(tool => {
          const toolWords = tool.name.toLowerCase().split('_');
          const requestWords = normalizedRequest.split(/\s+/);
          return toolWords.some(word => requestWords.some(rword => rword.includes(word)));
        });

        if (relevantTool) {
          const defaultRepo = githubService.getDefaultRepository();
          const params: any = {};
          if (defaultRepo.owner && defaultRepo.repo) {
            params.owner = defaultRepo.owner;
            params.repo = defaultRepo.repo;
          }
          
          aiDecision.toolCalls.push({
            toolName: relevantTool.name,
            parameters: params,
            reasoning: `Using ${relevantTool.name} based on your request`
          });
        }
      }

      if (aiDecision.toolCalls.length === 0) {
        aiDecision.needsMoreInfo = true;
        aiDecision.missingInfo = 'I need more specific information about what GitHub operation you want to perform.';
      }
    } catch (error) {
      console.error('Failed to parse AI decision:', error);
      await context.sendActivity(
        "🤔 I'm having trouble understanding your request. Could you be more specific?\n\n" +
        "Try something like:\n" +
        "• \"Show me issue #68\"\n" +
        "• \"List repositories for microsoft\"\n" +
        "• \"Create an issue in my-repo\""
      );
      return;
    }

    // Handle case where more information is needed
    if (aiDecision.needsMoreInfo) {
      await context.sendActivity(
        `🤔 I need more information to help you.\n\n${aiDecision.missingInfo}\n\n` +
        "Please provide the missing details and try again."
      );
      return;
    }

    // Execute the tool calls
    if (!aiDecision.toolCalls || aiDecision.toolCalls.length === 0) {
      await context.sendActivity(
        "🤔 I couldn't determine which GitHub tool to use for your request.\n\n" +
        "Try being more specific about what you'd like to do."
      );
      return;
    }

    // Show what we're doing
    const actionDescriptions = aiDecision.toolCalls.map((call: any) => 
      `${call.reasoning || `calling ${call.toolName}`}`
    ).join(', ');
    
    await context.sendActivity(`🔄 ${actionDescriptions}...`);

    // Execute each tool call
    const results = [];
    for (const toolCall of aiDecision.toolCalls) {
      const result = await githubService.executeTool(toolCall.toolName, toolCall.parameters);
      results.push(result);
    }

    // Format and send results
    for (const result of results) {
      if (result.success) {
        if (result.formattedResult) {
          await context.sendActivity(`✅ **${result.toolName}**\n\n${result.formattedResult}`);
        } else {
          await context.sendActivity(`✅ **${result.toolName}** completed successfully.`);
        }
      } else {
        await context.sendActivity(
          `❌ **${result.toolName}** failed: ${result.error}\n\n` +
          "This might be due to permissions, network issues, or the tool not being available."
        );
      }
    }

  } catch (error) {
    console.error('GitHub MCP middleware error:', error);
    await context.sendActivity(
      `❌ **Error processing GitHub request**: ${error instanceof Error ? error.message : 'Unknown error occurred'}\n\n` +
      `Please try again or contact support if the issue persists.`
    );
  }
});

app.feedbackLoop(async (context, state, feedbackLoopData) => {
  //add custom feedback process logic here
  console.log("Your feedback is " + JSON.stringify(context.activity.value));
});

export default app;