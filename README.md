# openxbond/rules

代理订阅的分流规则库：聚合 [blackmatrix7/ios_rule_script](https://github.com/blackmatrix7/ios_rule_script) 的规则，按 `categories.txt` 精选同步，加自有自定义规则，派生双格式产物并生成自建索引。**我们并不生产规则，我们只是开源规则的搬运工。**

## 布局

- `clash/*.list` — 工作源（上游同步 + `custom-rules.txt` 应用后的经典规则行），派生物由它生成
- `clash-yaml/{id}.yaml` — Clash/mihomo rule-providers 产物（`behavior: classical, format: yaml`）
- `singbox/{id}.json` — sing-box rule_set 产物（`type: remote, format: source`）
- `index.json` — 自建索引：分类 → 各格式路径 + sha256，由 `scripts/build.mjs` 生成
- `categories.txt` — 同步范围（新增分类加一行，不扩全量）
- `custom-rules.txt` — 自有规则增删（`<id>.list + <rule>` / `- <rule>`）

## 产物消费方式

客户端配置中的 URL 钉 release tag（不追 main），经 jsDelivr 分发：

```
https://cdn.jsdelivr.net/gh/openxbond/rules@<tag>/clash-yaml/OpenAI.yaml
https://cdn.jsdelivr.net/gh/openxbond/rules@<tag>/singbox/OpenAI.json
```

升库 = 发新 tag，消费方（xbond API 的渲染管线）更新钉定值并重录 golden。

## 更新流程

- 本地：`bash scripts/sync.sh`（拉上游 → 应用自定义规则 → 派生全部产物 + 索引）
- CI：`.github/workflows/sync.yml` 每周自动同步；有变更时提交并发 `vYYYY.M.D` release tag

## 许可

本仓库代码 MIT。规则数据来自上游开源项目，署名与来源见 `NOTICE.md`；再分发许可的正式审查进行中（见 xbond 仓库 `docs/specs/subscription-rendering.md` 未决决策）。
