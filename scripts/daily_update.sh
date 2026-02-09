#!/bin/bash
set -e

# Define paths
REPO_DIR="/home/psiesta11/repositories/subastas-casas-pi-agent"
PUBLIC_DIR="$REPO_DIR/public"

# 1. Scraping and Geocoding (Update DB and generate JSON)
echo "Starting Scraping..."
cd "$REPO_DIR/backend"
npm run build
node dist/task.js

# 2. Push to GitHub
echo "Pushing updates to GitHub..."
cd "$PUBLIC_DIR"

# Ensure we are on main
git checkout main || git checkout -b main

git add api/auctions.json
# Only commit and push if there are changes
if ! git diff-index --quiet HEAD --; then
    git commit -m "Daily auction update: $(date +'%Y-%m-%d')"
    git push origin main
    echo "Changes pushed to GitHub."
else
    echo "No new auction data to push."
fi

echo "Update completed at $(date)"
