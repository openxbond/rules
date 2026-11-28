#!/usr/bin/env bash
# Sync dual upstreams (v2fly/domain-list-community + blackmatrix7/ios_rule_script)
# plus RIR country IP lists into .upstream/, then build clash/, clash-yaml/,
# singbox/, and index.json from manifest.json via scripts/build.mjs.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UPSTREAM="$ROOT/.upstream"
DLC_DIR="$UPSTREAM/dlc"
BM7_DIR="$UPSTREAM/bm7"
IP_DIR="$UPSTREAM/ip"

DLC_REPO="https://github.com/v2fly/domain-list-community.git"
BM7_REPO="https://github.com/blackmatrix7/ios_rule_script.git"

mkdir -p "$UPSTREAM" "$IP_DIR"

if [ -d "$DLC_DIR/.git" ]; then
  git -C "$DLC_DIR" pull --ff-only --quiet
else
  git clone --depth 1 --filter=blob:none --sparse --quiet "$DLC_REPO" "$DLC_DIR"
  git -C "$DLC_DIR" sparse-checkout set data
fi

if [ -d "$BM7_DIR/.git" ]; then
  git -C "$BM7_DIR" pull --ff-only --quiet
else
  git clone --depth 1 --filter=blob:none --sparse --quiet "$BM7_REPO" "$BM7_DIR"
  git -C "$BM7_DIR" sparse-checkout set rule/Clash
fi

for cc in ir ru; do
  curl -fsSL "https://raw.githubusercontent.com/ipverse/rir-ip/master/country/$cc/ipv4-aggregated.txt" -o "$IP_DIR/$cc-ipv4.txt"
  curl -fsSL "https://raw.githubusercontent.com/ipverse/rir-ip/master/country/$cc/ipv6-aggregated.txt" -o "$IP_DIR/$cc-ipv6.txt"
done

node "$ROOT/scripts/build.mjs"
