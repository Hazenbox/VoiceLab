#!/bin/bash
# =============================================================================
# Voice Designer - Full Deployment Script
# =============================================================================
# This script deploys both Convex functions and the frontend (via Git push).
#
# Usage:
#   ./scripts/deploy.sh              # Deploy with auto-generated commit message
#   ./scripts/deploy.sh "message"    # Deploy with custom commit message
#
# What it does:
#   1. Deploys Convex functions to production
#   2. Stages all changes
#   3. Commits with message
#   4. Pushes to origin/main (triggers Vercel deployment)
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Voice Designer Deployment ===${NC}"
echo ""

# Step 1: Deploy Convex functions
echo -e "${YELLOW}[1/4] Deploying Convex functions to production...${NC}"
npx convex deploy -y
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Convex functions deployed successfully${NC}"
else
    echo -e "${RED}✗ Convex deployment failed${NC}"
    exit 1
fi
echo ""

# Step 2: Check for changes
echo -e "${YELLOW}[2/4] Checking for changes...${NC}"
if git diff --quiet && git diff --cached --quiet; then
    echo -e "${GREEN}No changes to commit. Convex deployment complete.${NC}"
    exit 0
fi

# Step 3: Stage and commit
echo -e "${YELLOW}[3/4] Staging and committing changes...${NC}"
git add -A

# Use provided message or generate one
if [ -n "$1" ]; then
    COMMIT_MSG="$1"
else
    COMMIT_MSG="deploy: update $(date '+%Y-%m-%d %H:%M')"
fi

git commit -m "$COMMIT_MSG"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Changes committed${NC}"
else
    echo -e "${RED}✗ Commit failed${NC}"
    exit 1
fi
echo ""

# Step 4: Push to trigger Vercel deployment
echo -e "${YELLOW}[4/4] Pushing to origin/main...${NC}"
git push origin main
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Pushed to origin/main${NC}"
else
    echo -e "${RED}✗ Push failed${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo "• Convex functions: deployed to production"
echo "• Frontend: deploying via Vercel (check dashboard for status)"
echo ""
