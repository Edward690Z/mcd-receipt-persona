# MCP 集成说明

## 使用的 MCP Server

| 项 | 内容 |
|---|---|
| Server | 麦当劳中国 MCP Server（官方托管，`mcd-mcp` 1.0.0） |
| 地址 | `https://mcp.mcd.cn` |
| 协议 | Streamable HTTP（JSON-RPC：`initialize` → `notifications/initialized` → `tools/call`，协议版本 `2025-03-26`） |
| 认证 | `Authorization: Bearer <MCP Token>`。Token 通过环境变量 `MCD_MCP_TOKEN` 或本地、被忽略的配置文件提供，仓库内不含任何真实 Token |
| 配置示例 | 见 [`mcp-config.example.json`](./mcp-config.example.json) |

## 使用的 Tool

本项目是纯只读 Skill，**成品只调用以下 2 个工具**（均已在真实账号上验证）：

| Tool | 用途 | 入参 | 备注 |
|---|---|---|---|
| `order-list` | 查询历史订单，是所有统计的数据来源 | 无 | 实测固定返回**最近 10 单**，无分页、无时间参数 |
| `query-order` | 按订单号补充优惠金额（`totalDiscountAmount`） | `orderId` | `order-list` 不含优惠信息，"精打细算"维度依赖它 |

**明确不使用**任何会产生真实操作的工具：`create-order`、`cancel-order`、`mall-create-order`、`draw-lottery`、`party-order-create`、`auto-bind-coupons` 等。`skills/mcd-receipt-persona/SKILL.md` 中把这条写成了硬性规则。

## 调用流程

```
用户："帮我看看我的麦当劳点餐人格"
   │
   ▼
① fetch-orders.mjs ── order-list ──────────────► 最近 10 单（含套餐子项、实付金额、就餐类型）
   │
   ├── query-order（逐单，串行，间隔 150ms，≤30 单）─► 总优惠金额
   │      ※ 该返回含收件人手机号、地址、骑手电话，脚本只取金额字段，其余立即丢弃
   ▼
② 脱敏 + 与本地历史合并去重 ──► output/history.json
   │      订单号、门店编码只存哈希；不存手机号、地址、骑手信息；Token 不落盘
   ▼
③ wrapped.mjs（不联网）
   │   解析订单 → 展开套餐子项 → 统计 → 推导 4 维人格
   ▼
④ 渲染（纯代码生成的 SVG，无外部资源）
   │   pages/*.svg（7 页故事卡）· card.svg · report.html · long.html · summary.md / summary.json
   │   加 --png：调用本机 Edge / Chrome 无头截图 → pages/*.png · long.png
   ▼
⑤ Agent 读取 summary.md，用自然语言转述（不需要、也不应该打开图片）
```

由于 `order-list` 只提供最近 10 单，每次运行都会把新订单**合并进本地历史**，过一段时间再运行，样本会逐步累积，人格也会更准确。

## 数据字段与处理

| 来源字段 | 用途 |
|---|---|
| `createTime` | 时段分布、星期分布、最晚下单、连续下单天数 |
| `beType` / `orderType` | 就餐方式：`beType` 1 到店取餐、4 甜品站、2 麦乐送、5 得来速、6 团餐；缺失时用 `orderType`（1 到店、2 外送） |
| `orderProductList[]` + `comboItemList[]` | 餐品统计。套餐名（如"人气经典随心配"）不是真正的餐品，因此展开子项统计，并忽略蘸酱等配料 |
| `realTotalAmount` | 累计消费、单均 |
| `totalDiscountAmount`（`query-order`） | 用券订单占比、累计省下 |
| `storeCode` | 仅哈希后用于统计光顾过几家餐厅，不展示 |
| `orderStatus` | 含"取消 / 关闭 / 退款"的订单不参与统计 |

## 人格规则

四个维度都由订单数据直接计算，规则公开透明：

| 维度 | 判定 | 数据来源 |
|---|---|---|
| 时段 | 05:00–16:59 下单占比 ≥ 50% 为 D，否则为 N | `createTime` |
| 场景 | 外送订单占已标注就餐方式订单的比例 ≥ 50% 为 H，否则为 S | `beType` / `orderType` |
| 口味 | 最常点的餐品出现在 ≥ 35% 的订单中为 L，否则为 X | 订单餐品明细（按"出现在多少单里"排序） |
| 价格 | 用券订单占比 ≥ 40%，或优惠总额占比 ≥ 12% 为 B，否则为 F | `totalDiscountAmount` |

组合出 16 种人格，名称与描述在 `skills/mcd-receipt-persona/scripts/lib/personas.mjs` 里。时段按 早餐 05:00–10:29 / 午餐 10:30–13:59 / 下午茶 14:00–16:59 / 晚餐 17:00–20:59 / 夜宵 21:00–04:59 划分；并列第一时会如实列出所有并列项，而不是悄悄只取第一个。

## 开发期的数据覆盖调查

用户最关心的问题是"能不能拿到全年的数据"。开发期间，除了反复验证 `order-list` 没有可用的分页或时间参数外，还只读探测过另外几个接口的返回结构（只看字段和条数，不展示、不保存个人内容）：

| 接口 | 返回的是什么 | 结论 |
|---|---|---|
| `mall-order-list` | 麦麦商城的兑换订单，不是点餐订单，也没有下单时间字段 | 不适用 |
| `query-my-prizes` | 抽奖 / 奖品记录，与点餐习惯无关，且涉及随机奖励 | 不适合做画像，不纳入 |
| `query-my-account` | 积分汇总（累计 / 已用 / 过期） | 与点餐习惯无关 |

结论：没有任何接口能提供超过最近 10 单的点餐记录，所以成品只使用 `order-list` + `query-order`，并用"本地历史累积"来弥补。上表中的接口均**未纳入成品**，成品代码里不会调用它们。

## 稳健性与限流

- **401：** 提示 Token 无效或已过期，并立即停止；不会重试。
- **429：** 自动退避重试，最多 3 次，间隔 2 秒、4 秒、6 秒。
- **超时：** 单次请求 30 秒超时。
- **限流：** MCP 每个 Token 每分钟最多 600 次请求。脚本全部串行，`query-order` 之间间隔 150ms，且每次最多补 30 单，远低于上限。
- **返回格式：** MCP 的返回是"说明文字 + `## Original Response` + JSON"的 Markdown，脚本会识别字符串内的括号并忽略前后的说明文字，解析失败时给出明确的错误。

## 业务价值

- **对用户：** 把枯燥的订单列表变成一套有场景、有梗、可以晒的故事卡（小票、餐盘、薯条盒、终端、叫号屏），借程序员节形成社交传播，让更多人了解并使用麦当劳 MCP。
- **对麦当劳 MCP：** 展示 `order-list` / `query-order` 这类用户数据能力的一种轻量、安全的玩法：只读、本地处理、数据脱敏、不触发任何交易。
- **对开发者社区：** 提供了处理 MCP"Markdown 包 JSON"返回格式、展开套餐子项、隐私字段脱敏、用纯 SVG 生成可导出 PNG 的卡片这几件事的可复用代码（零依赖），其他 Skill 作者可以直接参考。

## 已知限制

- `order-list` 只提供最近 10 单，因此本项目是"近期点餐人格"，而不是"年度报告"。通过本地合并历史来弥补。
- `order-list` 不含优惠金额，需要额外调用 `query-order`；订单很多时只补充最近 30 单的优惠信息。
- 订单少于 5 单时，人格揭晓页会标注"样本较少，仅供参考"。
- 导出 PNG 需要本机安装 Edge / Chrome / Chromium；没有浏览器时仍可得到 SVG、`report.html` 和文字摘要。
