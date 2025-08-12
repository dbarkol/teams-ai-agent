// tokenStore.ts
// Centralized token storage for GitHub OAuth tokens

import { GitHubTokenInfo } from "./githubOAuth";

// In-memory token store (in production, use database or proper session storage)
export const tokenStore = new Map<string, GitHubTokenInfo>();

export function getStoredToken(userId: string): GitHubTokenInfo | null {
  return tokenStore.get(userId) || null;
}

export function storeToken(userId: string, tokenInfo: GitHubTokenInfo): void {
  tokenStore.set(userId, tokenInfo);
}

export function removeToken(userId: string): void {
  tokenStore.delete(userId);
}

export function hasValidToken(userId: string): boolean {
  const tokenInfo = getStoredToken(userId);
  if (!tokenInfo) return false;
  
  // Simple validation - GitHub tokens don't expire but check if reasonably recent
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return tokenInfo.obtained_at > thirtyDaysAgo;
}
