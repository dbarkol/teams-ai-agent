# GitHub Repository Setup Guide

## Quick Setup

### 1. Create Repository on GitHub

1. Go to [GitHub](https://github.com) and sign in
2. Click the **"+"** icon → **"New repository"**
3. Configure repository:
   - **Name**: `TeamsAgent` (or your preferred name)
   - **Description**: `Teams AI agent with GitHub MCP integration for intelligent repository management`
   - **Visibility**: Public or Private (your choice)
   - **DO NOT** check "Add a README file", "Add .gitignore", or "Choose a license" (we already have these)
4. Click **"Create repository"**

### 2. Connect and Push

Replace `YOUR_USERNAME` with your actual GitHub username and run:

```bash
# Option 1: Use the setup script
./setup-github.sh YOUR_USERNAME

# Option 2: Manual commands
git remote add origin https://github.com/YOUR_USERNAME/TeamsAgent.git
git branch -M main
git push -u origin main
```

### 3. Repository Enhancements

After pushing, enhance your repository:

#### Add Topics
Go to your repository → gear icon next to "About" → add these topics:
- `teams-ai`
- `github-mcp`
- `microsoft-365`
- `chatbot`
- `typescript`
- `azure-openai`
- `model-context-protocol`

#### Update About Section
- **Description**: "Teams AI agent with GitHub MCP integration for intelligent repository management"
- **Website**: Your deployed URL (if applicable)
- **Topics**: (added above)

## Repository Features

### What's Included

✅ **Complete source code** with GitHub MCP integration  
✅ **Comprehensive README** with setup and usage instructions  
✅ **MIT License** for open-source compatibility  
✅ **Professional .gitignore** excluding sensitive files  
✅ **Environment examples** for easy setup  
✅ **Debug tools** and development utilities  

### Repository Structure

```
TeamsAgent/
├── src/                    # Source code
│   ├── app/               # Teams AI application
│   ├── githubMcpService.ts # GitHub MCP integration
│   ├── mcpClient.ts       # MCP protocol client
│   └── ...                # Other components
├── env/                   # Environment configurations
├── appPackage/           # Teams app manifest
├── infra/                # Azure deployment templates
├── README.md             # Project documentation
├── LICENSE               # MIT License
├── .gitignore           # Git ignore rules
└── package.json         # Dependencies and scripts
```

## Security Considerations

### Environment Variables
The following files are automatically excluded from Git:
- `.localConfigs*` (your actual credentials)
- `.env*` (environment files)
- `node_modules/` (dependencies)
- `lib/` (build outputs)

### What's Safe to Commit
✅ Source code  
✅ Configuration templates  
✅ Documentation  
✅ Package definitions  
✅ Infrastructure templates  

### What's Protected
❌ OAuth secrets  
❌ API keys  
❌ Tokens  
❌ Local configurations  
❌ Build outputs  

## Next Steps After GitHub Setup

1. **Clone on other machines**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ElfTeamsAgent.git
   cd ElfTeamsAgent
   npm install
   ```

2. **Set up environment** (see README.md for details):
   - Copy `.env.example` to `.localConfigs.playground`
   - Fill in your Azure OpenAI and GitHub OAuth credentials

3. **Start development**:
   ```bash
   npm run dev:teamsfx:testtool
   npm run dev:teamsfx:launch-testtool
   ```

4. **Collaborate**:
   - Invite collaborators
   - Set up branch protection rules
   - Configure GitHub Actions (if needed)

## Troubleshooting

### Common Issues

**Remote already exists**:
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/ElfTeamsAgent.git
```

**Authentication issues**:
- Use GitHub CLI: `gh auth login`
- Or use personal access token instead of password

**Push rejected**:
```bash
git pull origin main --rebase
git push origin main
```

## Support

If you encounter issues:
1. Check the main README.md for detailed setup instructions
2. Review GITHUB_MCP_SETUP.md for GitHub integration specifics
3. Use debug endpoints to troubleshoot authentication
4. Open an issue on GitHub for community support

---

**Happy coding! 🚀**
