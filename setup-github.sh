#!/bin/bash

# GitHub Repository Setup Script
# Run this after creating your repository on GitHub

echo "🚀 Setting up GitHub repository for TeamsAgent..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository. Please run from the project root."
    exit 1
fi

# Check if user has provided GitHub username
if [ -z "$1" ]; then
    echo "❌ Error: Please provide your GitHub username"
    echo "Usage: ./setup-github.sh YOUR_USERNAME"
    echo "Example: ./setup-github.sh johndoe"
    exit 1
fi

USERNAME=$1
REPO_NAME="TeamsAgent"

echo "📡 Adding remote repository..."
git remote add origin https://github.com/$USERNAME/$REPO_NAME.git

echo "🌟 Setting default branch to main..."
git branch -M main

echo "⬆️ Pushing to GitHub..."
git push -u origin main

echo "✅ Success! Your repository is now available at:"
echo "🔗 https://github.com/$USERNAME/$REPO_NAME"

echo ""
echo "📋 Next steps:"
echo "1. Visit your repository on GitHub"
echo "2. Add topics: teams-ai, github-mcp, microsoft-365, chatbot, typescript"
echo "3. Customize the description and add a website URL if desired"
echo "4. Consider adding branch protection rules"
echo ""
echo "🎉 Happy coding!"
