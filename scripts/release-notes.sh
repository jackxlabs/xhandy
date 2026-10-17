#!/usr/bin/env bash
# Fills docs/release-template.md for one release and prints it.
# Usage: scripts/release-notes.sh <version> "<what's new, Chinese>" "<what's new, English>"
set -euo pipefail
cd "$(dirname "$0")/.."
[ $# -eq 3 ] || { echo "usage: $0 <version> <changes_zh> <changes_en>" >&2; exit 1; }
VERSION="$1" ZH="$2" EN="$3" node -e '
  const fs = require("fs");
  const t = fs.readFileSync("docs/release-template.md", "utf8");
  process.stdout.write(t.replaceAll("{{version}}", process.env.VERSION)
    .replaceAll("{{changes_zh}}", process.env.ZH).replaceAll("{{changes_en}}", process.env.EN));
'
