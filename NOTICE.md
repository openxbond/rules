# NOTICE — 规则数据来源与署名

本仓库的规则数据聚合自以下上游开源项目，感谢原作者与社区贡献者：

## v2fly/domain-list-community

- 仓库：<https://github.com/v2fly/domain-list-community>
- 覆盖范围：`manifest.json` 中引用的 `dlc:*` 域名列表与 `@cn`/`@!cn`/`@ads` 属性切片
- 许可：MIT

## blackmatrix7/ios_rule_script

- 仓库：<https://github.com/blackmatrix7/ios_rule_script>
- 覆盖范围：`manifest.json` 中引用的 `bm7:*` IP-CIDR 与专项规则
- 许可：MIT

## ipverse/rir-ip

- 仓库：<https://github.com/ipverse/rir-ip>
- 覆盖范围：伊朗（`ir`）与俄罗斯（`ru`）聚合 IPv4/IPv6 网段
- 许可：CC0-1.0

## 自有修改

- `custom/*.list` 与 `manifest.json` 的场景编排、互斥切片及补充域名，随本仓库 MIT 许可发布。
- `scripts/` 派生管线为本仓库原创。
