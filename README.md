# openxbond/rules

[Searchable Rules Catalog (EN)](https://www.xbond.net/en/rules/) | [在线分流规则目录 (简体中文)](https://www.xbond.net/zh/rules/) | [繁體中文目錄](https://www.xbond.net/rules/) | [XBond Client](https://github.com/openxbond/xbond) | [Official Website](https://www.xbond.net/en/)

Curated dual-upstream proxy routing rules declared in `manifest.json` — combining [v2fly/domain-list-community](https://github.com/v2fly/domain-list-community) (domain lists with `@cn`/`@!cn` slicing) and [blackmatrix7/ios_rule_script](https://github.com/blackmatrix7/ios_rule_script) (IP-CIDRs and specialized rules), plus regional IP lists and modular `custom/*.list` overlays — built in dual formats for **Clash / mihomo (`rule-providers` YAML)** and **sing-box (`rule_set` JSON)** with a SHA-256 manifest (`index.json`) and pinned releases.

## Repository Layout

- `manifest.json`: Declarative source of truth (`kind`, `group`, `featured`, `sources`, `exclude`).
- `custom/*.list`: Modular custom rule overlays.
- `clash/*.list`: Generated working classical rule lines.
- `clash-yaml/{id}.yaml`: Clash / mihomo `rule-providers` artifacts (`behavior: classical`, `format: yaml`).
- `singbox/{id}.json`: sing-box `rule_set` artifacts (`type: remote`, `format: source`).
- `index.json`: Category manifest with `kind`, `group`, `featured`, artifact paths, and SHA-256 digests.

## Update & License

- Local rebuild: `bash scripts/sync.sh` (syncs upstreams, resolves `manifest.json`, cleans stale artifacts, and regenerates `clash/`, `clash-yaml/`, `singbox/`, and `index.json`).
- Automated sync: `.github/workflows/sync.yml`.
- Licensed under MIT; upstream attribution in [NOTICE.md](NOTICE.md).
