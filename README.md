# ElfTeamsAgent - Teams AI with GitHub MCP Integration

A Microsoft Teams AI agent built with the Teams AI library that integrates with GitHub through Model Context Protocol (MCP) for intelligent repository management and GitHub operations.

## 🚀 Features

### Core Teams AI Capabilities

- **AI-Powered Chat**: Conversational interface using GPT-4o via Azure OpenAI
- **Microsoft 365 Integration**: Seamless Teams integration with Microsoft 365 Agents Playground
- **Adaptive Cards**: Professional UI components for authentication and interactions

### GitHub MCP Integration

- **🔗 OAuth Authentication**: Secure GitHub login flow with persistent token storage
- **🧠 LLM-Driven Tool Selection**: Intelligent GitHub operation matching using AI
- **🔍 Dynamic Tool Discovery**: Real-time discovery of available GitHub MCP tools
- **📊 Smart Result Formatting**: User-friendly display of GitHub data (issues, PRs, repos)
- **⚙️ Default Repository Support**: Configure default owner/repo for seamless UX

### GitHub Operations Supported

- Issue management (view, create, update)
- Pull request operations
- Repository browsing and management
- User and organization queries
- Dynamic tool availability based on MCP server capabilities

## 🏗️ Architecture

### LLM-Driven Approach

Unlike traditional rigid tool mapping, this agent uses an intelligent approach:

1. **Dynamic Discovery**: Connects to GitHub MCP server to discover available tools
2. **AI Intent Understanding**: Uses LLM to understand user requests and match to appropriate tools
3. **Flexible Execution**: Adapts to actual MCP server capabilities rather than assumptions
4. **Smart Defaults**: Automatically applies configured repository settings

### Key Components

- **`GitHubMcpService`**: Core service for MCP integration and tool management
- **Teams AI Application**: Main bot logic with conversation handling
- **OAuth Flow**: Secure GitHub authentication with dev tunnel support
- **Token Management**: Persistent storage of GitHub access tokens

## 🛠️ Setup

### Prerequisites

- Node.js (18, 20, or 22)
- [Microsoft 365 Agents Toolkit](https://aka.ms/teams-toolkit)
- Azure OpenAI resource
- GitHub OAuth App

### Environment Configuration

1. **Azure OpenAI**: Configure in `env/.env.playground.user`:

   ```env
   SECRET_AZURE_OPENAI_API_KEY=your-key
   AZURE_OPENAI_ENDPOINT=your-endpoint
   AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment
   ```

2. **GitHub OAuth**: Set up in `.localConfigs.playground`:

   ```env
   GITHUB_CLIENT_ID=your-client-id
   GITHUB_CLIENT_SECRET=your-client-secret
   GITHUB_OAUTH_REDIRECT_URI=your-redirect-uri
   GITHUB_DEFAULT_OWNER=default-owner
   GITHUB_DEFAULT_REPO=default-repository
   ```

### Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start in development mode
npm run dev:teamsfx:testtool

# Launch Microsoft 365 Agents Playground
npm run dev:teamsfx:launch-testtool
```

## 🎯 Usage

### In Microsoft 365 Agents Playground

1. Start the application and playground
2. Open http://localhost:56150
3. Try GitHub commands:
   - "Show issue #68"
   - "What GitHub tools are available?"
   - "List my repositories"
   - "Create a new issue"

### Authentication Flow

1. Agent detects GitHub operation request
2. If not authenticated, displays Adaptive Card with OAuth link
3. User completes GitHub OAuth flow
4. Agent stores token and executes requested operation
5. Returns formatted results with actionable links

### Example Interactions

**User**: "Show me issue #68"

**Agent**:

- Authenticates with GitHub if needed
- Discovers available MCP tools
- Uses LLM to select appropriate issue retrieval tool
- Formats and displays issue details with GitHub link

**User**: "What GitHub tools are available?"

**Agent**:

- Lists all available GitHub MCP tools dynamically
- Provides descriptions and usage examples

## 🔧 Development

### Debug Endpoints

- `/debug/config` - View GitHub OAuth configuration
- `/debug/github-mcp-tools` - List available MCP tools
- `/debug/test-github/:query` - Test tool parsing logic

### Project Structure

```
src/
├── app/
│   └── app.ts              # Main Teams AI application
├── prompts/
│   └── chat/               # AI prompts and configuration
├── githubMcpService.ts     # GitHub MCP integration service
├── mcpClient.ts            # MCP protocol client
├── tokenStore.ts           # OAuth token management
├── githubOAuth.ts          # GitHub OAuth flow
└── index.ts                # Express server setup
```

## 🔒 Security

- **OAuth 2.0**: Secure GitHub authentication
- **Token Storage**: Session-based token management
- **Environment Variables**: Sensitive data in environment files
- **Dev Tunnel**: Secure public endpoint for OAuth callbacks

## 📚 Technical Details

### GitHub MCP Integration

This agent implements a sophisticated approach to GitHub MCP integration:

1. **Context7 Compliance**: Uses official MCP SDK for GitHub integration
2. **Dynamic Tool Discovery**: Queries MCP server for available tools instead of hardcoded assumptions
3. **LLM-Guided Selection**: Uses AI to understand user intent and select appropriate tools
4. **Flexible Parameter Extraction**: Intelligently extracts parameters from natural language requests

### Error Handling

- Graceful handling of missing tools
- Clear user feedback for authentication issues
- Helpful suggestions for unclear requests
- Automatic retry mechanisms for transient failures

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Microsoft 365 Agents Playground
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Microsoft Teams AI Library](https://aka.ms/teams-ai-library)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Microsoft 365 Agents Toolkit](https://docs.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)

---

**Built with ❤️ using Microsoft Teams AI and GitHub MCP**
