#!/usr/bin/env bash
# Builds dist/xhandy-<version>.zip for a GitHub Release: only the files the extension needs,
# from the last commit (not the working tree), inside one "xhandy/" folder.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -n "$(git status --porcelain -- manifest.json _locales src icons LICENSE)" ]; then
  echo "Uncommitted changes in the extension files. Commit first: the zip is built from HEAD." >&2
  exit 1
fi

version=$(node -p 'require("./manifest.json").version')
out="dist/xhandy-$version.zip"
mkdir -p dist
git archive --format=zip --prefix=xhandy/ -o "$out" HEAD manifest.json _locales src icons LICENSE PRIVACY.md
echo "$out"
