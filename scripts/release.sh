#!/bin/bash
set -e

# Usage: ./scripts/release.sh patch|minor|major

BUMP_TYPE="${1:-patch}"

if [[ "$BUMP_TYPE" != "patch" && "$BUMP_TYPE" != "minor" && "$BUMP_TYPE" != "major" ]]; then
  echo "Usage: $0 patch|minor|major"
  exit 1
fi

CURRENT=$(jq -r .version package.json)
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case "$BUMP_TYPE" in
  patch) PATCH=$((PATCH + 1)) ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"

# Update package.json
jq --arg v "$NEW_VERSION" '.version = $v' package.json > tmp.json && mv tmp.json package.json

# Update tauri.conf.json
jq --arg v "$NEW_VERSION" '.version = $v' src-tauri/tauri.conf.json > tmp.json && mv tmp.json src-tauri/tauri.conf.json

# Update Cargo.toml
sed -i '' "s/^version = \".*\"/version = \"$NEW_VERSION\"/" src-tauri/Cargo.toml

echo "Bumped $CURRENT → $NEW_VERSION"

git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml
git commit -m "release: v$NEW_VERSION"
git push

echo "Pushed v$NEW_VERSION — GitHub Actions will build and publish the release."
