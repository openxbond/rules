#!/usr/bin/env bash
# Sync curated categories from upstream (blackmatrix7/ios_rule_script) into
# clash/*.list, apply custom-rules.txt, then derive everything else via
# scripts/build.mjs. Scope = categories.txt — new categories are added there,
# never by widening the sync.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UPSTREAM="$ROOT/.upstream"
REPO_URL="https://github.com/blackmatrix7/ios_rule_script.git"

mkdir -p "$ROOT/clash"

# Sparse clone or refresh; only rule/Clash is needed.
if [ -d "$UPSTREAM/.git" ]; then
  git -C "$UPSTREAM" pull --ff-only --quiet
else
  git clone --depth 1 --filter=blob:none --sparse --quiet "$REPO_URL" "$UPSTREAM"
  git -C "$UPSTREAM" sparse-checkout set rule/Clash
fi

while IFS= read -r category; do
  [ -z "$category" ] && continue
  src="$UPSTREAM/rule/Clash/$category/$category.list"
  if [ -f "$src" ]; then
    cp "$src" "$ROOT/clash/$category.list"
  else
    echo "WARN: upstream no longer has $category" >&2
  fi
done < "$ROOT/categories.txt"

node "$ROOT/scripts/build.mjs"
