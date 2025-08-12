import {
  Application,
  ActionPlanner,
  OpenAIModel,
  PromptManager,
  TurnContext,
} from "@microsoft/teams-ai";
import path from "path";
import { tokenStore } from "../tokenStore";
import { GitHubMcpService } from "../githubMcpService";

// Create AI components
const model = new OpenAIModel({
  // Use OpenAI
  apiKey: process.env.OPENAI_API_KEY!,
  defaultModel: "gpt-4o",

  // Uncomment to use Azure OpenAI
  // azureApiKey: process.env.AZURE_OPENAI_API_KEY!,
  // azureDefaultDeployment: "gpt-35-turbo",
  // azureEndpoint: process.env.AZURE_OPENAI_ENDPOINT!,
  // azureApiVersion: "2024-02-15-preview",

  // Request logging
  logRequests: true,
});

const prompts = new PromptManager({
  promptsFolder: path.join(__dirname, "../prompts"),
});

const planner = new ActionPlanner({
  model,
  prompts,
  defaultPrompt: "chat",
});

// Define the application
const app = new Application({
  ai: {
    planner,
  },
});

// GitHub OAuth Adaptive Card Template
const createOAuthCard = (authUrl: string) => ({
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
  type: "AdaptiveCard",
  version: "1.4",
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
              width: "auto",
              items: [
                {
                  type: "Image",
                  url: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
                  size: "Small",
                  style: "Person"
                }
              ]
            },
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "TextBlock",
                  text: "GitHub Integration",
                  weight: "Bolder",
                  size: "Medium"
                },
                {
                  type: "TextBlock",
                  text: "Connect your GitHub account to access repositories and manage issues, pull requests, and more.",
                  wrap: true,
                  spacing: "Small"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "ActionSet",
      actions: [
        {
          type: "Action.OpenUrl",
          title: "🔗 Connect to GitHub",
          url: authUrl,
          style: "positive"
        }
      ]
    },
    {
      type: "TextBlock",
      text: "💡 After connecting, return here and try your GitHub request again.",
      wrap: true,
      size: "Small",
      color: "Accent",
      spacing: "Medium"
    }
  ]
});

// Listen for user to say "/github" and handle GitHub operations
app.message(/github/i, async (context: TurnContext, state: any) => {
  const text = context.activity.text?.toLowerCase() || '';
  
  // Skip if it's just the word "github" without any action
  if (text.trim() === 'github' || text.trim() === '/github') {
    await context.sendActivity(
      "🐙 **GitHub Assistant Ready!**\n\n" +
      "I can help you with GitHub operations. Try asking:\n" +
      "• \"Show issue #68\"\n" +
      "• \"List my repositories\"\n" +
      "• \"What GitHub tools are available?\"\n" +
      "• \"Create a new issue in my-repo\"\n\n" +
      "💡 I'll automatically connect to GitHub when needed."
    );
    return;
  }

  try {
    // Get user ID for token storage
    const userId = context.activity.from?.id || 'unknown';
    const tokenInfo = tokenStore.getToken(userId);

    // Check if user needs to authenticate
    if (!tokenInfo) {
      // Generate GitHub OAuth URL
      const clientId = process.env.GITHUB_CLIENT_ID;
      const redirectUri = process.env.GITHUB_OAUTH_REDIRECT_URI;
      const state = `user_${userId}_${Date.now()}`;
      
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri!)}&scope=repo%20read:user&state=${state}`;
      
      // Store the state for verification
      tokenStore.storeState(state, userId);
      
      // Send OAuth card
      const oauthCard = createOAuthCard(authUrl);
      await context.sendActivity({
        type: 'message',
        attachments: [{
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: oauthCard
        }]
      });
      return;
    }

    // Initialize GitHub MCP service
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
    
    // Use the AI model to understand intent and select tools
    const prompt = `${systemPrompt}

User Request: "${userRequest}"

Please analyze this request and determine:
1. Which GitHub MCP tool(s) to use
2. What parameters are needed
3. How to extract parameters from the user request

Respond with a JSON object in this format:
{
  "toolCalls": [
    {
      "toolName": "exact_tool_name",
      "parameters": {
        "param1": "value1",
        "param2": "value2"
      },
      "reasoning": "Why this tool was chosen"
    }
  ],
  "needsMoreInfo": false,
  "missingInfo": "Description of what info is needed if needsMoreInfo is true"
}

If the user request is unclear or missing required parameters, set needsMoreInfo to true.`;

    // Get AI response for tool selection
    const aiResponse = await model.completePrompt(
      context,
      [],
      { prompt, max_tokens: 1000 }
    );

    let aiDecision;
    try {
      // Extract JSON from AI response
      const jsonMatch = aiResponse.message?.content?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiDecision = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in AI response');
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
    console.error('GitHub operation error:', error);
    await context.sendActivity(
      `❌ **Error:** ${error instanceof Error ? error.message : 'Unknown error occurred'}\n\n` +
      "Please try again or check your GitHub connection."
    );
  }
});

export default app;
