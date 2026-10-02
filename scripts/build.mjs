/**
 * Derives everything from clash/*.list (the working source of truth):
 *   clash-yaml/{id}.yaml  — header + payload (clash classical rule provider)
 *   singbox/{id}.json     — sing-box rule_set source (version 2)
 *   index.json            — the catalog consumers pin against
 *
 * custom-rules.txt (`<id>.list + <rule>` / `- <rule>`) is applied to the .list
 * first, so every derived artifact carries the additions. Idempotent: rerunning
 * produces identical bytes for identical inputs.
 *
 * Conversion scope matches upstream-compatible semantics: DOMAIN, DOMAIN-SUFFIX,
 * DOMAIN-KEYWORD, IP-CIDR/IP-CIDR6/SRC-IP-CIDR survive into sing-box; other
 * rule types (GEOIP, ports, process names) are clash-only and dropped there.
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const clashDir = join(root, "clash");
const yamlDir = join(root, "clash-yaml");
const singboxDir = join(root, "singbox");

const categories = readFileSync(join(root, "categories.txt"), "utf8")
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

function applyCustomRules(id, lines) {
  const ops = readFileSync(join(root, "custom-rules.txt"), "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const match = line.match(/^(?<file>\S+\.list)\s+(?<op>[+-])\s+(?<rule>\S+)$/);
      if (!match) throw new Error(`custom-rules.txt: unparseable line: ${line}`);
      return match.groups;
    })
    .filter((op) => op.file === `${id}.list`);

  let result = [...lines];
  for (const { op, rule } of ops) {
    if (op === "+") {
      if (!result.includes(rule)) result.push(rule);
    } else {
      result = result.filter((line) => line !== rule);
    }
  }
  return result;
}

// .list → clash classical payload lines (comments and blanks dropped). The
// custom-rules result is written back so the .list itself carries it; header
// comments are kept, and reapplying is a no-op (adds dedupe).
function payloadLines(id) {
  const file = join(clashDir, `${id}.list`);
  const all = readFileSync(file, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const comments = all.filter((line) => line.startsWith("#"));
  const lines = applyCustomRules(
    id,
    all.filter((line) => !line.startsWith("#")),
  );
  writeFileSync(file, `${[...comments, ...lines].join("\n")}\n`);
  return lines;
}

function countPrefix(lines, prefix) {
  return lines.filter((line) => line.startsWith(`${prefix},`)).length;
}

function writeYaml(id, lines) {
  const counts = ["DOMAIN", "DOMAIN-SUFFIX", "DOMAIN-KEYWORD", "IP-CIDR", "IP-CIDR6"]
    .map((prefix) => `# ${prefix}: ${countPrefix(lines, prefix)}`)
    .join("\n");
  const updated = new Date()
    .toISOString()
    .replace("T", " ")
    .replace(/\..+/, "");
  const header = [
    `# NAME: ${id}`,
    "# AUTHOR: blackmatrix7",
    "# REPO: https://github.com/blackmatrix7/ios_rule_script",
    `# UPDATED: ${updated}`,
    counts,
    `# TOTAL: ${lines.length}`,
    "",
  ].join("\n");
  const body = lines.map((line) => `  - ${line}`).join("\n");
  writeFileSync(join(yamlDir, `${id}.yaml`), `${header}payload:\n${body}\n`);
}

function writeSingBox(id, lines) {
  const groups = { domain: [], domain_suffix: [], domain_keyword: [], ip_cidr: [] };
  for (const line of lines) {
    const [type, value] = line.split(",");
    if (type === "DOMAIN") groups.domain.push(value);
    else if (type === "DOMAIN-SUFFIX") groups.domain_suffix.push(value);
    else if (type === "DOMAIN-KEYWORD") groups.domain_keyword.push(value);
    else if (type === "IP-CIDR" || type === "IP-CIDR6" || type === "SRC-IP-CIDR")
      groups.ip_cidr.push(value);
    // Other clash rule types have no sing-box rule_set equivalent; dropped.
  }
  const rules = Object.entries(groups)
    .filter(([, values]) => values.length > 0)
    .map(([key, values]) => ({ [key]: values }));
  writeFileSync(
    join(singboxDir, `${id}.json`),
    `${JSON.stringify({ version: 2, rules }, null, 2)}\n`,
  );
}

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

if (!existsSync(yamlDir)) throw new Error("clash-yaml/ missing");
if (!existsSync(singboxDir)) throw new Error("singbox/ missing");

const catalog = [];
const warnings = [];
for (const id of categories) {
  if (!existsSync(join(clashDir, `${id}.list`))) {
    warnings.push(`no clash/${id}.list — category skipped`);
    continue;
  }
  const lines = payloadLines(id);
  writeYaml(id, lines);
  writeSingBox(id, lines);

  const clashFile = join(yamlDir, `${id}.yaml`);
  const singboxFile = join(singboxDir, `${id}.json`);
  catalog.push({
    id,
    formats: {
      clash: { path: `clash-yaml/${id}.yaml`, sha256: sha256(clashFile) },
      singbox: { path: `singbox/${id}.json`, sha256: sha256(singboxFile) },
    },
  });
}

const index = {
  version: 1,
  generated_at: new Date().toISOString(),
  upstream: "blackmatrix7/ios_rule_script",
  categories: catalog,
};
writeFileSync(join(root, "index.json"), `${JSON.stringify(index, null, 2)}\n`);

for (const warning of warnings) console.warn(`WARN: ${warning}`);
console.log(`index.json: ${catalog.length} categories`);
