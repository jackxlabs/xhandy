#!/usr/bin/env bash
# Builds two zips from the last commit (not the working tree), with only the files the extension needs:
# dist/xhandy-<version>.zip for a GitHub Release, inside one "xhandy/" folder, and
# dist/xhandy-<version>-store.zip for the Chrome Web Store.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -n "$(git status --porcelain -- manifest.json _locales src icons LICENSE PRIVACY.md)" ]; then
  echo "Uncommitted changes in the extension files. Commit first: the zip is built from HEAD." >&2
  exit 1
fi

version=$(node -p 'require("./manifest.json").version')
out="dist/xhandy-$version.zip"
mkdir -p dist
files="manifest.json _locales src icons LICENSE PRIVACY.md"
git archive --format=zip --prefix=xhandy/ -o "$out" HEAD $files
# The Chrome Web Store wants manifest.json at the root of the zip, with no folder around it.
store="dist/xhandy-$version-store.zip"
git archive --format=zip -o "$store" HEAD $files
echo "$out"
echo "$store"
