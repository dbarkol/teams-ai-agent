// Import required packages
import express from "express";

// This bot's adapter
import adapter from "./adapter";

// This bot's main dialog.
import app from "./app/app";

import { registerGitHubOAuthRoutes } from "./githubOAuth";
import { tokenStore } from "./tokenStore";

// Create express application.
const expressApp = express();
expressApp.use(express.json());

// Register GitHub OAuth routes with token store
registerGitHubOAuthRoutes(expressApp, tokenStore);

// Debug endpoint to check GitHub configuration
expressApp.get('/debug/config', (req, res) => {
  res.json({
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID ? 
      `${process.env.GITHUB_CLIENT_ID.substring(0, 12)}...` : 'NOT SET',
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET ? 
      'SET (hidden)' : 'NOT SET',
    GITHUB_OAUTH_REDIRECT_URI: process.env.GITHUB_OAUTH_REDIRECT_URI || 'NOT SET',
    GITHUB_DEFAULT_OWNER: process.env.GITHUB_DEFAULT_OWNER || 'NOT SET',
    GITHUB_DEFAULT_REPO: process.env.GITHUB_DEFAULT_REPO || 'NOT SET',
    timestamp: new Date().toISOString()
  });
});

// Test GitHub OAuth URL generation
expressApp.get('/debug/github-url', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_OAUTH_REDIRECT_URI;
  const state = 'test-state-123';
  
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo%20read:user&state=${state}`;
  
  res.json({
    url,
    clientId,
    redirectUri,
    message: 'Try clicking this URL to test GitHub OAuth'
  });
});

// Test endpoint for GitHub MCP tools
expressApp.get('/debug/test-github/:query', async (req, res) => {
  try {
    const query = decodeURIComponent(req.params.query);
    const { GitHubToolParser } = await import('./githubToolParser');
    
    const invocations = GitHubToolParser.parseUserIntent(query);
    
    res.json({
      query,
      invocations,
      message: 'GitHub tool parsing result',
      note: 'This only shows the parsing result. Actual MCP tool execution would require authentication.'
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      query: req.params.query
    });
  }
});

// Debug endpoint to list actual GitHub MCP tools
expressApp.get('/debug/github-mcp-tools', async (req, res) => {
  try {
    const { GitHubMcpService } = await import('./githubMcpService');
    
    // Use anonymous access (no token) to test tool discovery
    const githubService = new GitHubMcpService();
    await githubService.initialize();
    
    const tools = await githubService.getAvailableTools();
    const toolsContext = await githubService.getToolsContext();
    
    res.json({
      toolCount: tools.length,
      tools: tools,
      toolsContext: toolsContext,
      message: 'Available GitHub MCP tools'
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to connect to GitHub MCP server'
    });
  }
});

const server = expressApp.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`\nAgent started, ${expressApp.name} listening to`, server.address());
});

// Listen for incoming requests.
expressApp.post("/api/messages", async (req, res) => {
  // Route received a request to adapter for processing
  await adapter.process(req, res as any, async (context) => {
    // Dispatch to application for routing
    await app.run(context);
  });
});
