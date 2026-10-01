# NOTICE — 规则数据来源与署名

本仓库的规则数据聚合自以下上游项目，感谢原作者的辛勤付出：

## blackmatrix7/ios_rule_script

- 仓库：<https://github.com/blackmatrix7/ios_rule_script>
- 覆盖范围：`categories.txt` 全部分类的原始规则（`rule/Clash/*/*.list`）
- 许可：MIT（随上游仓库分发）

## 自有修改

- `custom-rules.txt` 记录的自有规则增删（如 Tailscale / Cloudflare Tunnel / ChatGLM / Claude 的补充域名与网段），随本仓库 MIT 许可发布。
- `scripts/` 派生管线为本仓库原创。

## 再分发状态

上游为 MIT 许可，署名义务由本文件与各产物头部的 AUTHOR/REPO 注释履行。再分发许可已核实（2026-10-01）：允许商业产品再分发；xbond 仓库 `docs/specs/subscription-rendering.md` 对应未决决策已关闭。
