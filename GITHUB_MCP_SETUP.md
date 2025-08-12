# GitHub MCP Integration - Environment Setup

## Required Environment Variables

To use the GitHub MCP integration, you need to set up the following environment variables:

### GitHub OAuth Configuration

1. **GITHUB_CLIENT_ID**: Your GitHub OAuth App's Client ID
   - Create a GitHub OAuth App at: https://github.com/settings/applications/new
   - Set Homepage URL: `http://localhost:3978`
   - Set Authorization callback URL: `http://localhost:3978/auth/github/callback`

2. **GITHUB_CLIENT_SECRET**: Your GitHub OAuth App's Client Secret
   - Available after creating the OAuth App

3. **GITHUB_OAUTH_REDIRECT_URI**: OAuth callback URL (optional, defaults to `http://localhost:3978/auth/github/callback`)

### Teams AI Configuration

Make sure you also have your existing Teams AI environment variables configured:
- **AZURE_OPENAI_API_KEY**
- **AZURE_OPENAI_ENDPOINT** 
- **AZURE_OPENAI_DEPLOYMENT_NAME**
- **BOT_ID**
- **BOT_PASSWORD**
- **BOT_TYPE**
- **BOT_TENANT_ID**

## Example .env file

```env
# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_OAUTH_REDIRECT_URI=http://localhost:3978/auth/github/callback

# Azure OpenAI (existing)
AZURE_OPENAI_API_KEY=your_key_here
AZURE_OPENAI_ENDPOINT=https://your-endpoint.openai.azure.com
AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment_name

# Bot Framework (existing)
BOT_ID=your_bot_id
BOT_PASSWORD=your_bot_password
BOT_TYPE=MultiTenant
BOT_TENANT_ID=your_tenant_id
```

## GitHub OAuth App Setup

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: "Your Teams AI Agent"
   - **Homepage URL**: `http://localhost:3978`
   - **Authorization callback URL**: `http://localhost:3978/auth/github/callback`
4. Copy the Client ID and Client Secret to your environment variables

## Testing the Integration

Once configured, users can:

1. **Authenticate**: Visit `/auth/github` or get prompted in Teams chat
2. **Use GitHub tools** by typing messages like:
   - "List my repositories"
   - "Show pull requests for my-repo" 
   - "Create a new issue"
   - "What GitHub tools are available?"

## Features Implemented

✅ **OAuth Authentication**: Secure GitHub login flow
✅ **Persistent Token Storage**: Tokens stored per user session
✅ **Enhanced Tool Invocation**: Parse user intent and call specific tools
✅ **Error Handling**: Graceful error handling and user feedback
✅ **Tool Result Formatting**: User-friendly display of GitHub data
✅ **Teams AI Integration**: Seamless integration with Teams AI middleware

## Architecture

- **MCPClient**: Context7-compliant client for GitHub MCP server
- **GitHubToolParser**: Intent parsing and result formatting
- **OAuth Flow**: Secure authentication with persistent storage
- **Teams AI Middleware**: Message interception and tool routing
