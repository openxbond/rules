/**
 * Dual-upstream declarative builder for openxbond/rules.
 * Reads manifest.json, resolves dlc / bm7 / ip / custom / include sources,
 * applies mutual-exclusion excludes, cleans stale artifacts, and writes:
 *   clash/{id}.list
 *   clash-yaml/{id}.yaml
 *   singbox/{id}.json
 *   index.json
 */

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const upstreamDir = join(root, ".upstream");
const dlcDataDir = join(upstreamDir, "dlc", "data");
const bm7ClashDir = join(upstreamDir, "bm7", "rule", "Clash");
const ipDir = join(upstreamDir, "ip");
const customDir = join(root, "custom");
const clashDir = join(root, "clash");
const yamlDir = join(root, "clash-yaml");
const singboxDir = join(root, "singbox");

for (const dir of [clashDir, yamlDir, singboxDir]) {
  mkdirSync(dir, { recursive: true });
}

if (!existsSync(dlcDataDir)) {
  throw new Error(`Missing DLC upstream at ${dlcDataDir}; run scripts/sync.sh`);
}
if (!existsSync(bm7ClashDir)) {
  throw new Error(`Missing bm7 upstream at ${bm7ClashDir}; run scripts/sync.sh`);
}

const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) {
  throw new Error("manifest.json: entries must be a non-empty array");
}

const entryMap = new Map();
for (const entry of manifest.entries) {
  if (!entry.id || typeof entry.id !== "string") {
    throw new Error("manifest.json: entry missing string id");
  }
  if (entryMap.has(entry.id)) {
    throw new Error(`manifest.json: duplicate entry id "${entry.id}"`);
  }
  entryMap.set(entry.id, entry);
}

function normalizeClashRule(raw) {
  const line = raw.trim();
  if (!line || line.startsWith("#") || line.startsWith("//")) return null;
  const parts = line.split(",").map((s) => s.trim());
  if (parts.length < 2) return null;
  const type = parts[0];
  let value = parts[1];
  if (type === "IP-ASN") return null;
  if (type === "DOMAIN-SUFFIX" && value.startsWith(".")) {
    value = value.slice(1);
  }
  if (!value) return null;
  return parts.length > 2 ? `${type},${value},${parts.slice(2).join(",")}` : `${type},${value}`;
}

function parseDlcSpec(spec) {
  const rest = spec.slice("dlc:".length);
  const atIdx = rest.indexOf("@");
  if (atIdx === -1) return { name: rest, attr: null };
  return { name: rest.slice(0, atIdx), attr: rest.slice(atIdx + 1) };
}

function matchesDlcAttr(attrs, filterAttr) {
  if (!filterAttr) return true;
  if (filterAttr === "!cn") return !attrs.includes("cn");
  return attrs.includes(filterAttr);
}

function loadDlc(name, filterAttr = null, visited = new Set()) {
  const key = `${name}@${filterAttr ?? ""}`;
  if (visited.has(key)) return [];
  visited.add(key);

  const file = join(dlcDataDir, name);
  if (!existsSync(file)) {
    throw new Error(`DLC file not found: ${file}`);
  }
  const out = [];
  const raw = readFileSync(file, "utf8");
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const tokens = line.split(/\s+/);
    const head = tokens[0];
    const attrs = tokens
      .slice(1)
      .filter((t) => t.startsWith("@"))
      .map((t) => t.slice(1));

    if (head.startsWith("include:")) {
      const target = head.slice("include:".length);
      if (filterAttr === "cn" && attrs.includes("!cn")) continue;
      if (filterAttr === "!cn" && attrs.includes("cn")) continue;
      out.push(...loadDlc(target, filterAttr, visited));
      continue;
    }

    if (!matchesDlcAttr(attrs, filterAttr)) continue;

    if (head.startsWith("regexp:")) {
      continue;
    } else if (head.startsWith("full:")) {
      const domain = head.slice("full:".length).trim();
      if (domain) out.push(`DOMAIN,${domain}`);
    } else if (head.startsWith("keyword:")) {
      const kw = head.slice("keyword:".length).trim();
      if (kw) out.push(`DOMAIN-KEYWORD,${kw}`);
    } else if (head.startsWith("domain:")) {
      const domain = head.slice("domain:".length).trim();
      if (domain) out.push(`DOMAIN-SUFFIX,${domain}`);
    } else {
      out.push(`DOMAIN-SUFFIX,${head}`);
    }
  }
  return out;
}

function loadBm7(spec) {
  const parts = spec.slice("bm7:".length).split(":");
  const name = parts[0];
  const mode = parts[1] ?? "all";
  const file = join(bm7ClashDir, name, `${name}.list`);
  if (!existsSync(file)) {
    throw new Error(`bm7 rule file not found: ${file}`);
  }
  const out = [];
  for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
    const rule = normalizeClashRule(rawLine);
    if (!rule) continue;
    const type = rule.split(",")[0];
    if (mode === "ip") {
      if (type === "IP-CIDR" || type === "IP-CIDR6" || type === "SRC-IP-CIDR") {
        out.push(rule);
      }
    } else if (mode === "domain") {
      if (type === "DOMAIN" || type === "DOMAIN-SUFFIX" || type === "DOMAIN-KEYWORD") {
        out.push(rule);
      }
    } else {
      out.push(rule);
    }
  }
  return out;
}

function loadIp(cc) {
  const v4File = join(ipDir, `${cc}-ipv4.txt`);
  const v6File = join(ipDir, `${cc}-ipv6.txt`);
  if (!existsSync(v4File) || !existsSync(v6File)) {
    throw new Error(`Missing IP files for country "${cc}" in ${ipDir}`);
  }
  const out = [];
  for (const [file, prefix] of [
    [v4File, "IP-CIDR"],
    [v6File, "IP-CIDR6"],
  ]) {
    for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      out.push(`${prefix},${line}`);
    }
  }
  return out;
}

function loadCustom(name) {
  const file = join(customDir, `${name}.list`);
  if (!existsSync(file)) {
    throw new Error(`Custom rule file not found: ${file}`);
  }
  const out = [];
  for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
    const rule = normalizeClashRule(rawLine);
    if (rule) out.push(rule);
  }
  return out;
}

const resolvedCache = new Map();

function resolveEntry(id, stack = new Set()) {
  if (resolvedCache.has(id)) return resolvedCache.get(id);
  if (stack.has(id)) {
    throw new Error(`Circular include detected for "${id}"`);
  }
  const entry = entryMap.get(id);
  if (!entry) {
    throw new Error(`Unknown manifest entry "${id}"`);
  }
  stack.add(id);

  const collected = [];
  for (const src of entry.sources ?? []) {
    if (src.startsWith("dlc:")) {
      const { name, attr } = parseDlcSpec(src);
      collected.push(...loadDlc(name, attr));
    } else if (src.startsWith("bm7:")) {
      collected.push(...loadBm7(src));
    } else if (src.startsWith("ip:")) {
      collected.push(...loadIp(src.slice("ip:".length)));
    } else if (src.startsWith("custom:")) {
      collected.push(...loadCustom(src.slice("custom:".length)));
    } else if (src.startsWith("include:")) {
      collected.push(...resolveEntry(src.slice("include:".length), stack));
    } else {
      throw new Error(`Unknown source spec "${src}" in "${id}"`);
    }
  }

  const excludedRules = new Set();
  const excludedDomains = new Set();
  for (const exc of entry.exclude ?? []) {
    let excLines = [];
    if (exc.startsWith("dlc:")) {
      const { name, attr } = parseDlcSpec(exc);
      excLines = loadDlc(name, attr);
    } else if (exc.startsWith("bm7:")) {
      excLines = loadBm7(exc);
    } else if (exc.startsWith("custom:")) {
      excLines = loadCustom(exc.slice("custom:".length));
    } else if (exc.startsWith("include:")) {
      excLines = resolveEntry(exc.slice("include:".length), stack);
    } else if (exc.startsWith("domain:")) {
      excludedDomains.add(exc.slice("domain:".length).trim().toLowerCase());
    } else if (exc.startsWith("rule:")) {
      const norm = normalizeClashRule(exc.slice("rule:".length));
      if (norm) excludedRules.add(norm);
    } else {
      throw new Error(`Unknown exclude spec "${exc}" in "${id}"`);
    }
    for (const line of excLines) {
      excludedRules.add(line);
      const [type, val] = line.split(",");
      if (type === "DOMAIN" || type === "DOMAIN-SUFFIX") {
        excludedDomains.add(val.toLowerCase());
      }
    }
  }

  const seen = new Set();
  const finalLines = [];
  for (const line of collected) {
    if (excludedRules.has(line)) continue;
    const [type, val] = line.split(",");
    if (
      (type === "DOMAIN" || type === "DOMAIN-SUFFIX") &&
      excludedDomains.has(val.toLowerCase())
    ) {
      continue;
    }
    if (seen.has(line)) continue;
    seen.add(line);
    finalLines.push(line);
  }

  if (finalLines.length === 0) {
    throw new Error(`Entry "${id}" resolved to 0 rules`);
  }

  stack.delete(id);
  resolvedCache.set(id, finalLines);
  return finalLines;
}

function countPrefix(lines, prefix) {
  return lines.filter((line) => line.startsWith(`${prefix},`)).length;
}

function writeList(id, lines) {
  writeFileSync(join(clashDir, `${id}.list`), `${lines.join("\n")}\n`);
}

function writeYaml(id, lines) {
  const counts = ["DOMAIN", "DOMAIN-SUFFIX", "DOMAIN-KEYWORD", "IP-CIDR", "IP-CIDR6"]
    .map((prefix) => `# ${prefix}: ${countPrefix(lines, prefix)}`)
    .join("\n");
  const header = [
    `# NAME: ${id}`,
    "# REPO: https://github.com/openxbond/rules",
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
    else if (type === "IP-CIDR" || type === "IP-CIDR6" || type === "SRC-IP-CIDR") {
      groups.ip_cidr.push(value);
    }
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

function cleanStale(dir, validIds, ext) {
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(ext)) continue;
    const id = file.slice(0, -ext.length);
    if (!validIds.has(id)) {
      rmSync(join(dir, file), { force: true });
    }
  }
}

const validIds = new Set(manifest.entries.map((e) => e.id));
cleanStale(clashDir, validIds, ".list");
cleanStale(yamlDir, validIds, ".yaml");
cleanStale(singboxDir, validIds, ".json");

const catalog = [];
for (const entry of manifest.entries) {
  const lines = resolveEntry(entry.id);
  writeList(entry.id, lines);
  writeYaml(entry.id, lines);
  writeSingBox(entry.id, lines);

  const clashFile = join(yamlDir, `${entry.id}.yaml`);
  const singboxFile = join(singboxDir, `${entry.id}.json`);
  catalog.push({
    id: entry.id,
    kind: entry.kind,
    group: entry.group,
    featured: Boolean(entry.featured),
    formats: {
      clash: { path: `clash-yaml/${entry.id}.yaml`, sha256: sha256(clashFile) },
      singbox: { path: `singbox/${entry.id}.json`, sha256: sha256(singboxFile) },
    },
  });
}

const index = {
  version: 1,
  generated_at: new Date().toISOString(),
  upstream: "v2fly/domain-list-community + blackmatrix7/ios_rule_script",
  categories: catalog,
};
writeFileSync(join(root, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
console.log(`index.json: ${catalog.length} categories`);
