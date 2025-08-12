// githubOAuth.ts
// GitHub OAuth flow utility for Teams AI agent
// Usage: import and use in your Teams AI logic to authenticate users and retrieve their GitHub access token.

import express from 'express';
import axios from 'axios';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '<YOUR_CLIENT_ID>';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '<YOUR_CLIENT_SECRET>';
const GITHUB_OAUTH_REDIRECT_URI = process.env.GITHUB_OAUTH_REDIRECT_URI || 'http://localhost:3978/auth/github/callback';

// Simple in-memory store for demo - in production, use proper session management
const pendingOAuthStates = new Map<string, { userId: string; timestamp: number }>();

export interface GitHubTokenInfo {
  access_token: string;
  token_type: string;
  scope: string;
  obtained_at: number;
}

export function registerGitHubOAuthRoutes(app: express.Express, tokenStore: Map<string, GitHubTokenInfo>) {
  // Step 1: Redirect user to GitHub OAuth
  app.get('/auth/github', (req, res) => {
    const userId = req.query.userId as string || 'default-user';
    const state = Math.random().toString(36).substring(2);
    
    // Store state with user ID for validation (expires in 10 minutes)
    pendingOAuthStates.set(state, { 
      userId, 
      timestamp: Date.now() 
    });

    // Clean up expired states (older than 10 minutes)
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    for (const [key, value] of pendingOAuthStates.entries()) {
      if (value.timestamp < tenMinutesAgo) {
        pendingOAuthStates.delete(key);
      }
    }

    const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_OAUTH_REDIRECT_URI)}&scope=repo%20read:user&state=${state}`;
    res.redirect(url);
  });

  // Step 2: GitHub redirects back with code
  app.get('/auth/github/callback', async (req, res) => {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).send('❌ OAuth Error: Missing authorization code');
    }

    if (!state || typeof state !== 'string') {
      return res.status(400).send('❌ OAuth Error: Invalid or missing state parameter');
    }

    // Validate state and get user ID
    const stateData = pendingOAuthStates.get(state);
    if (!stateData) {
      return res.status(400).send('❌ OAuth Error: Invalid or expired state. Please try again.');
    }

    // Clean up used state
    pendingOAuthStates.delete(state);

    try {
      // Step 3: Exchange code for access token
      const tokenRes = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: GITHUB_OAUTH_REDIRECT_URI,
        },
        {
          headers: { Accept: 'application/json' },
          timeout: 10000, // 10 second timeout
        }
      );

      const { access_token, token_type, scope } = tokenRes.data;
      
      if (!access_token) {
        return res.status(400).send('❌ OAuth Error: Failed to obtain access token from GitHub');
      }

      // Store token info
      const tokenInfo: GitHubTokenInfo = {
        access_token,
        token_type: token_type || 'bearer',
        scope: scope || '',
        obtained_at: Date.now()
      };

      // Store in provided token store (for cross-request access)
      tokenStore.set(stateData.userId, tokenInfo);

      // Get user info to show success message
      let userInfo = null;
      try {
        const userRes = await axios.get('https://api.github.com/user', {
          headers: { 
            Authorization: `Bearer ${access_token}`,
            'User-Agent': 'ElfTeamsAgent'
          },
          timeout: 5000
        });
        userInfo = userRes.data;
      } catch (userError) {
        console.warn('Could not fetch user info:', userError);
      }

      const successMessage = userInfo 
        ? `✅ **GitHub Authentication Successful!**\n\nWelcome, **${userInfo.name || userInfo.login}**!\n\nYou can now use GitHub tools in your Teams chat. Try asking:\n• "List my repositories"\n• "Show pull requests for my-repo"\n• "What GitHub tools are available?"\n\nYou can close this window and return to Teams.`
        : `✅ **GitHub Authentication Successful!**\n\nYou can now use GitHub tools in Teams. You can close this window and return to Teams.`;

      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>GitHub OAuth Success</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
            .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 20px; border-radius: 8px; }
            pre { background: #f8f9fa; padding: 10px; border-radius: 4px; white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <div class="success">
            <pre>${successMessage}</pre>
          </div>
          <script>
            // Auto-close after 5 seconds
            setTimeout(() => window.close(), 5000);
          </script>
        </body>
        </html>
      `);

    } catch (err) {
      console.error('OAuth error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      res.status(500).send(`❌ OAuth Error: ${errorMessage}`);
    }
  });
}

/**
 * Helper function to check if a stored token is still valid (not expired)
 */
export function isTokenValid(tokenInfo: GitHubTokenInfo): boolean {
  // GitHub tokens don't expire, but we can check if it's reasonably recent
  // For security, we might want to refresh tokens older than 30 days
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return tokenInfo.obtained_at > thirtyDaysAgo;
}

/**
 * Helper function to get user ID from Teams context
 */
export function getUserIdFromContext(context: any): string {
  // Extract user ID from Teams context
  return context.activity?.from?.id || context.activity?.from?.aadObjectId || 'unknown-user';
}
