#!/usr/bin/env bash
# VoltWise repo setup script.
# Run this from INSIDE the voltwise-scaffold folder after you've:
#   1. Created a NEW EMPTY repo on github.com (no README, no .gitignore, no license)
#   2. Copied its remote URL (SSH or HTTPS)
#
# Usage:
#   chmod +x setup.sh
#   ./setup.sh git@github.com:your-org/voltwise.git

set -e

REMOTE_URL="$1"
if [ -z "$REMOTE_URL" ]; then
  echo "Usage: ./setup.sh <your-github-repo-url>"
  echo "Example: ./setup.sh git@github.com:your-org/voltwise.git"
  exit 1
fi

git init
git branch -M main
git add .
git commit -m "Initial commit: repo scaffold, API contract, and PRDs"
git remote add origin "$REMOTE_URL"
git push -u origin main

for b in dhanya vanshi tanvi rutvi; do
  git checkout -b "$b" main
  git push -u origin "$b"
done

git checkout main

echo ""
echo "Done. Branches pushed:"
git branch -a
echo ""
echo "Next: add your 3 teammates as collaborators on GitHub"
echo "(Settings -> Collaborators, on your repo page), then each"
echo "person runs:"
echo ""
echo "  git clone $REMOTE_URL"
echo "  cd voltwise"
echo "  git checkout <their-name>   # dhanya / vanshi / tanvi / rutvi"
echo ""
echo "They can now push directly to their own branch."
