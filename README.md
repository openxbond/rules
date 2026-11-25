# openxbond/rules

[Searchable Rules Catalog (EN)](https://www.xbond.net/en/rules/) | [在线分流规则目录 (简体中文)](https://www.xbond.net/zh/rules/) | [繁體中文目錄](https://www.xbond.net/rules/) | [XBond Client](https://github.com/openxbond/xbond) | [Official Website](https://www.xbond.net/en/)

Curated proxy routing rules aggregated from [blackmatrix7/ios_rule_script](https://github.com/blackmatrix7/ios_rule_script) plus custom rules across **89 categories** (including `OpenAI`, `Claude`, `Cursor`, `GitHub`, `Docker`, `YouTube`, `Netflix`, `Telegram`, `Cloudflare`, and `Tailscale`), built in dual formats for **Clash / mihomo (`rule-providers` YAML)** and **sing-box (`rule_set` JSON)** with a SHA-256 manifest (`index.json`) and pinned releases.

## Browse Online

Browse all 89 categories, search domains/CIDRs, and copy CDN links directly from the [XBond Routing Rules Catalog](https://www.xbond.net/en/rules/) ([简体中文](https://www.xbond.net/zh/rules/) | [繁體中文](https://www.xbond.net/rules/)), built for the [XBond](https://github.com/openxbond/xbond) dual-core client ([xbond.net](https://www.xbond.net/en/)).

## Quick Usage (jsDelivr CDN)

Always pin a release tag (such as `v2026.11.4` — see [Releases](https://github.com/openxbond/rules/releases)) rather than tracking `main`:

```yaml
# Clash / mihomo rule-providers
rule-providers:
  OpenAI:
    type: http
    behavior: classical
    format: yaml
    url: https://cdn.jsdelivr.net/gh/openxbond/rules@v2026.11.4/clash-yaml/OpenAI.yaml
    path: ./ruleset/OpenAI.yaml
    interval: 86400
```

```json
{
  "route": {
    "rule_set": [
      {
        "tag": "OpenAI",
        "type": "remote",
        "format": "source",
        "url": "https://cdn.jsdelivr.net/gh/openxbond/rules@v2026.11.4/singbox/OpenAI.json"
      }
    ]
  }
}
```

## Repository Layout

- `clash/*.list`: Working source rule lines (upstream sync merged with `custom-rules.txt`, written back by `scripts/build.mjs`).
- `clash-yaml/{id}.yaml`: Clash / mihomo `rule-providers` artifacts (`behavior: classical`, `format: yaml`).
- `singbox/{id}.json`: sing-box `rule_set` artifacts (`type: remote`, `format: source`).
- `index.json`: Category manifest mapping each category ID to artifact paths and SHA-256 digests.
- `categories.txt`: Sync scope across all 89 curated categories.
- `custom-rules.txt`: Custom additions/removals (`<id>.list + <rule>` / `- <rule>`).

## Update & License

- Local rebuild: `bash scripts/sync.sh` (pulls upstream, applies `custom-rules.txt`, regenerates `clash-yaml/`, `singbox/`, and `index.json`).
- Automated sync: `.github/workflows/sync.yml` runs upstream syncs and tags `vYYYY.M.D` releases when rules change.
- Repository code is licensed under MIT. Rule data comes from upstream open-source projects (MIT); attribution and redistribution details live in [NOTICE.md](NOTICE.md).

---

## 简体中文说明

代理订阅的分流规则库：聚合 [blackmatrix7/ios_rule_script](https://github.com/blackmatrix7/ios_rule_script) 的规则，按 `categories.txt` 精选 **89 个分类**同步并叠加自有自定义规则，派生 Clash/mihomo（YAML）与 sing-box（JSON）双格式产物并生成 SHA-256 索引（`index.json`）。配套官网在线检索目录：[https://www.xbond.net/zh/rules/](https://www.xbond.net/zh/rules/)，双核心开源客户端见 [openxbond/xbond](https://github.com/openxbond/xbond)（[官方网站](https://www.xbond.net/zh/)）。**我们并不生产规则，我们只是开源规则的搬运工。**

### 布局

- `clash/*.list`：工作源（上游同步 + `custom-rules.txt` 应用后的经典规则行，由 `scripts/build.mjs` 写回），派生物由它生成
- `clash-yaml/{id}.yaml`：Clash / mihomo rule-providers 产物（`behavior: classical, format: yaml`）
- `singbox/{id}.json`：sing-box rule_set 产物（`type: remote, format: source`）
- `index.json`：自建索引——分类到各格式路径与 SHA-256 校验值，由 `scripts/build.mjs` 生成
- `categories.txt`：同步范围（共 89 个精选分类；新增分类加一行，不扩全量）
- `custom-rules.txt`：自有规则增删（`<id>.list + <rule>` / `- <rule>`）

### 产物消费方式

客户端配置中的 URL 钉住 release tag（如 `v2026.11.4`，不追 `main`），经 jsDelivr 分发（也可在[分流规则目录](https://www.xbond.net/zh/rules/)直接搜索分类并复制链接）：

```
https://cdn.jsdelivr.net/gh/openxbond/rules@<tag>/clash-yaml/OpenAI.yaml
https://cdn.jsdelivr.net/gh/openxbond/rules@<tag>/singbox/OpenAI.json
```

常用热门分类示例：`OpenAI`、`Claude`、`Cursor`、`GitHub`、`Docker`、`YouTube`、`Netflix`、`Telegram`、`Cloudflare`、`Tailscale`。

### 更新流程

- 本地：`bash scripts/sync.sh`（拉上游 → 应用自定义规则 → 派生全部产物 + 索引）
- CI：`.github/workflows/sync.yml` 定期自动同步；有变更时提交并发 `vYYYY.M.D` release tag

### 许可

本仓库代码采用 MIT 许可；规则数据来自上游开源项目（MIT，允许再分发），署名与来源见 [NOTICE.md](NOTICE.md)。
