// githubToolParser.ts
// Utility for parsing user messages and determining appropriate GitHub MCP tools to invoke

export interface ToolInvocation {
  toolName: string;
  arguments: Record<string, any>;
  description: string;
}

export class GitHubToolParser {
  /**
   * Analyze user message and determine which GitHub MCP tools to invoke
   */
  static parseUserIntent(message: string): ToolInvocation[] {
    const text = message.toLowerCase().trim();
    const invocations: ToolInvocation[] = [];

    // Repository operations
    if (this.matchesPattern(text, ['list repos', 'show repositories', 'my repos', 'repositories'])) {
      invocations.push({
        toolName: 'github_repo_list',
        arguments: { type: 'owner' },
        description: 'Listing your repositories'
      });
    }

    if (this.matchesPattern(text, ['create repo', 'new repository'])) {
      const repoName = this.extractRepoName(text);
      if (repoName) {
        invocations.push({
          toolName: 'github_repo_create',
          arguments: { name: repoName, private: false },
          description: `Creating repository '${repoName}'`
        });
      }
    }

    // Pull request operations
    if (this.matchesPattern(text, ['list prs', 'pull requests', 'show prs', 'open prs'])) {
      const repo = this.extractRepoReference(text);
      if (repo) {
        invocations.push({
          toolName: 'github_pr_list',
          arguments: { owner: repo.owner, repo: repo.name, state: 'open' },
          description: `Listing pull requests for ${repo.owner}/${repo.name}`
        });
      }
    }

    if (this.matchesPattern(text, ['create pr', 'new pull request', 'open pr'])) {
      const repo = this.extractRepoReference(text);
      if (repo) {
        invocations.push({
          toolName: 'github_pr_create',
          arguments: { 
            owner: repo.owner, 
            repo: repo.name,
            title: 'New Pull Request',
            head: 'feature-branch',
            base: 'main'
          },
          description: `Creating pull request for ${repo.owner}/${repo.name}`
        });
      }
    }

    // Issue operations
    if (this.matchesPattern(text, ['list issues', 'show issues', 'open issues'])) {
      const repo = this.extractRepoReference(text);
      if (repo) {
        invocations.push({
          toolName: 'github_issues_list',
          arguments: { owner: repo.owner, repo: repo.name, state: 'open' },
          description: `Listing issues for ${repo.owner}/${repo.name}`
        });
      }
    }

    // Get specific issue by number
    if (this.matchesPattern(text, ['issue #', 'issue number', 'show issue', 'get issue'])) {
      const issueNumber = this.extractIssueNumber(text);
      const repo = this.extractRepoReference(text);
      if (issueNumber && repo) {
        invocations.push({
          toolName: 'github_issue_get',
          arguments: { owner: repo.owner, repo: repo.name, issue_number: issueNumber },
          description: `Getting issue #${issueNumber} from ${repo.owner}/${repo.name}`
        });
      }
    }

    if (this.matchesPattern(text, ['create issue', 'new issue', 'report bug'])) {
      const repo = this.extractRepoReference(text);
      const title = this.extractIssueTitle(text);
      if (repo) {
        invocations.push({
          toolName: 'github_issue_create',
          arguments: { 
            owner: repo.owner, 
            repo: repo.name,
            title: title || 'New Issue',
            body: 'Created via Teams AI agent'
          },
          description: `Creating issue in ${repo.owner}/${repo.name}`
        });
      }
    }

    // File operations
    if (this.matchesPattern(text, ['show file', 'get file', 'read file'])) {
      const repo = this.extractRepoReference(text);
      const filePath = this.extractFilePath(text);
      if (repo && filePath) {
        invocations.push({
          toolName: 'github_file_get',
          arguments: { owner: repo.owner, repo: repo.name, path: filePath },
          description: `Getting file ${filePath} from ${repo.owner}/${repo.name}`
        });
      }
    }

    // User/profile operations
    if (this.matchesPattern(text, ['my profile', 'user info', 'who am i'])) {
      invocations.push({
        toolName: 'github_user_get',
        arguments: {},
        description: 'Getting your GitHub profile information'
      });
    }

    // Default: list available tools if no specific intent detected
    if (invocations.length === 0 && this.matchesPattern(text, ['github', 'tools', 'help', 'what can you do'])) {
      invocations.push({
        toolName: '_list_tools',
        arguments: {},
        description: 'Listing available GitHub tools'
      });
    }

    return invocations;
  }

  private static matchesPattern(text: string, patterns: string[]): boolean {
    return patterns.some(pattern => text.includes(pattern));
  }

  private static extractRepoName(text: string): string | null {
    const match = text.match(/(?:repo|repository)\s+(?:named?\s+)?['""]?([a-zA-Z0-9-_]+)['""]?/);
    return match ? match[1] : null;
  }

  private static extractRepoReference(text: string): { owner: string; name: string } | null {
    // Look for owner/repo pattern
    const fullMatch = text.match(/([a-zA-Z0-9-_]+)\/([a-zA-Z0-9-_]+)/);
    if (fullMatch) {
      return { owner: fullMatch[1], name: fullMatch[2] };
    }

    // Look for just repo name (will default to authenticated user)
    const repoMatch = text.match(/(?:repo|repository)\s+(?:named?\s+)?['""]?([a-zA-Z0-9-_]+)['""]?/);
    if (repoMatch) {
      return { owner: 'CURRENT_USER', name: repoMatch[1] };
    }

    // If no specific repo mentioned, use default values from environment
    const defaultOwner = process.env.GITHUB_DEFAULT_OWNER;
    const defaultRepo = process.env.GITHUB_DEFAULT_REPO;
    
    if (defaultOwner && defaultRepo) {
      return { owner: defaultOwner, name: defaultRepo };
    }

    return null;
  }

  private static extractFilePath(text: string): string | null {
    const match = text.match(/(?:file|path)\s+['""]?([a-zA-Z0-9-_/.]+)['""]?/);
    return match ? match[1] : null;
  }

  private static extractIssueTitle(text: string): string | null {
    const match = text.match(/(?:issue|bug)\s+['""]([^'"]+)['"]/);
    return match ? match[1] : null;
  }

  private static extractIssueNumber(text: string): number | null {
    const match = text.match(/#(\d+)|issue\s+(\d+)|number\s+(\d+)/i);
    if (match) {
      const number = match[1] || match[2] || match[3];
      return parseInt(number, 10);
    }
    return null;
  }

  /**
   * Format tool results for user-friendly display
   */
  static formatToolResult(toolName: string, result: any): string {
    try {
      switch (toolName) {
        case 'github_repo_list':
          return this.formatRepoList(result);
        case 'github_pr_list':
          return this.formatPullRequestList(result);
        case 'github_issues_list':
          return this.formatIssuesList(result);
        case 'github_issue_get':
          return this.formatSingleIssue(result);
        case 'github_user_get':
          return this.formatUserProfile(result);
        case '_list_tools':
          return this.formatToolsList(result);
        default:
          return `✅ Tool '${toolName}' executed successfully:\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``;
      }
    } catch (error) {
      return `⚠️ Tool '${toolName}' completed but result formatting failed: ${JSON.stringify(result)}`;
    }
  }

  private static formatRepoList(result: any): string {
    if (!result || !Array.isArray(result)) return 'No repositories found.';
    
    const repos = result.slice(0, 10); // Limit to first 10
    const repoList = repos.map(repo => 
      `• **${repo.name}** ${repo.private ? '🔒' : '🌍'}\n  ${repo.description || 'No description'}\n  ${repo.html_url}`
    ).join('\n\n');
    
    return `📚 **Your Repositories** (showing ${repos.length}${result.length > 10 ? ' of ' + result.length : ''}):\n\n${repoList}`;
  }

  private static formatPullRequestList(result: any): string {
    if (!result || !Array.isArray(result)) return 'No pull requests found.';
    
    const prs = result.slice(0, 5); // Limit to first 5
    const prList = prs.map(pr => 
      `• **#${pr.number}** ${pr.title}\n  👤 ${pr.user?.login} • ${pr.state} • ${new Date(pr.created_at).toLocaleDateString()}\n  ${pr.html_url}`
    ).join('\n\n');
    
    return `🔄 **Pull Requests** (showing ${prs.length}${result.length > 5 ? ' of ' + result.length : ''}):\n\n${prList}`;
  }

  private static formatIssuesList(result: any): string {
    if (!result || !Array.isArray(result)) return 'No issues found.';
    
    const issues = result.slice(0, 5); // Limit to first 5
    const issueList = issues.map(issue => 
      `• **#${issue.number}** ${issue.title}\n  👤 ${issue.user?.login} • ${issue.state} • ${new Date(issue.created_at).toLocaleDateString()}\n  ${issue.html_url}`
    ).join('\n\n');
    
    return `🐛 **Issues** (showing ${issues.length}${result.length > 5 ? ' of ' + result.length : ''}):\n\n${issueList}`;
  }

  private static formatSingleIssue(result: any): string {
    if (!result) return 'Could not retrieve issue.';
    
    const issue = result;
    const createdDate = new Date(issue.created_at).toLocaleDateString();
    const updatedDate = new Date(issue.updated_at).toLocaleDateString();
    
    let formattedIssue = `🐛 **Issue #${issue.number}**\n\n`;
    formattedIssue += `**${issue.title}**\n\n`;
    formattedIssue += `📝 **Description:**\n${issue.body || 'No description provided'}\n\n`;
    formattedIssue += `👤 **Author:** ${issue.user?.login}\n`;
    formattedIssue += `📊 **State:** ${issue.state}\n`;
    formattedIssue += `📅 **Created:** ${createdDate}\n`;
    formattedIssue += `🔄 **Updated:** ${updatedDate}\n`;
    
    if (issue.labels && issue.labels.length > 0) {
      const labels = issue.labels.map(label => `\`${label.name}\``).join(' ');
      formattedIssue += `🏷️ **Labels:** ${labels}\n`;
    }
    
    if (issue.assignees && issue.assignees.length > 0) {
      const assignees = issue.assignees.map(assignee => `@${assignee.login}`).join(', ');
      formattedIssue += `👥 **Assignees:** ${assignees}\n`;
    }
    
    formattedIssue += `\n🔗 [View on GitHub](${issue.html_url})`;
    
    return formattedIssue;
  }

  private static formatUserProfile(result: any): string {
    if (!result) return 'Could not retrieve user profile.';
    
    return `👤 **GitHub Profile**\n\n` +
           `**${result.name || result.login}**\n` +
           `@${result.login}\n` +
           `${result.bio || 'No bio'}\n\n` +
           `📍 ${result.location || 'Location not specified'}\n` +
           `📊 ${result.public_repos || 0} public repos • ${result.followers || 0} followers • ${result.following || 0} following\n` +
           `🔗 ${result.html_url}`;
  }

  private static formatToolsList(result: any): string {
    if (!result || !result.tools || !Array.isArray(result.tools)) {
      return '🛠️ **Available GitHub Tools**: Could not retrieve tool list.';
    }
    
    const tools = result.tools.slice(0, 10); // Limit display
    const toolList = tools.map(tool => 
      `• **${tool.name}**: ${tool.description || 'No description'}`
    ).join('\n');
    
    return `🛠️ **Available GitHub Tools** (${tools.length}${result.tools.length > 10 ? ' of ' + result.tools.length : ''}):\n\n${toolList}`;
  }
}
