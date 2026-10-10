---
name: mcd-receipt-persona
description: 读取用户在麦当劳中国的近期订单，生成「麦味人格」：7 页小票风故事卡、16 型图鉴和翻页报告（16 种程序员风格人格，含时段/品类/用券/连续下单等统计）。当用户想看自己的麦当劳点餐习惯、点餐人格、点餐报告、吃货报告、Wrapped，或想要一张可以晒的麦当劳卡片时使用。只读，不会下单。
---

# mcd-receipt-persona：麦味人格（麦当劳点餐人格）

把麦当劳近期订单变成一套 7 页小票风故事卡，并告诉用户是 16 种点餐人格里的哪一种。

人格由 4 个维度组成，共 16 种，用开发者熟悉的概念命名：

| 维度 | 取值 |
|---|---|
| 时段 | D 日间派 / N 夜间派 |
| 场景 | H 外送派 / S 到店派 |
| 口味 | L 专一派 / X 尝鲜派 |
| 价格 | B 精打细算派 / F 随心派 |

例如 `NHXB`「凌晨调试型」、`DSLF`「长期支持版」。

## 重要事实（已用真实账号验证）

- MCP 的 `order-list` **只返回最近 10 单，没有任何分页或时间参数**，其他只读接口也拿不到更长的点餐记录。所以这是"近期"点餐人格，不是年度报告。不要向用户承诺"年度"或"全年"。
- 脚本会把每次拉到的订单合并进本地历史 `output/history.json`（按订单去重）。用户隔一阵再运行一次，样本就会越积越多，人格越来越准。
- 订单少于 5 单时，结果仅供参考，要如实告诉用户。

## 硬性规则（必须遵守）

1. **只读。** 只允许使用 `order-list`、`query-order`。绝不调用 `create-order`、`cancel-order`、`mall-create-order`、`draw-lottery`、`party-order-create`、`auto-bind-coupons` 等会产生真实操作的工具。
2. **隐私。** `query-order` 的原始返回含收件人手机号、地址、骑手电话。**不要自己直接调用 `query-order` 并把结果放进对话**；统一用 `fetch-orders.mjs`，它会在本地取回后只保留统计字段（订单号、门店编码只存哈希）。聊天回复里不要出现地址、手机号、门店名、订单号。
3. **Token 安全。** 不要让用户把 Token 贴到聊天里，也不要把 Token 写进仓库任何文件、日志或回复。Token 通过环境变量 `MCD_MCP_TOKEN` 或用户本地的、已被 `.gitignore` 忽略的配置文件提供。
4. **仅供娱乐。** 不给营养、健康或饮食建议；不对比其他品牌；不评价"吃得多/吃得少"；不鼓励多点或夜间多吃。语气轻松，当作"点餐习惯画像"。
5. **限流。** MCP 每个 Token 每分钟最多 600 次请求。脚本已串行并带间隔，每次最多补 30 单优惠信息。
6. **不要用图片读取工具打开生成的 PNG / SVG。** 单页是 1080×1920，`long.png` 是 1080×13440，`atlas.png` 是 1760×2386。多图对话里模型接口要求每张图宽、高都不超过 2000px，超限的图一旦进入对话历史，这个会话之后的每条消息都会报 `image dimensions exceed max allowed size`，而且无法恢复。结果请读 `output/summary.md` 来转述，只把文件路径告诉用户，让用户自己打开。确实需要看图时，先缩成 1200px 以内的缩略图再读。

## 工作流程

### 1. 确认 Token
检查环境变量 `MCD_MCP_TOKEN` 是否已设置，或用户是否有本地 MCP 配置文件。都没有时，告诉用户：先到 https://open.mcd.cn/mcp 申请 Token，然后在自己的终端里设置：

```powershell
# Windows PowerShell
$env:MCD_MCP_TOKEN = "你的Token"
```
```bash
# macOS / Linux
export MCD_MCP_TOKEN="你的Token"
```

Agent 的终端不一定继承用户设置的环境变量。这时可以让用户在**当前工作目录**放一个 `mcp-config.local.json`（格式同 `mcp-config.example.json`，文件名必须以 `.local.json` 结尾以免被提交），脚本会自动读取。没有 Token 时，可以跳到下面的"演示模式"。

### 2. 拉取并合并订单

> 下面命令里的 <Skill目录> 指本 SKILL.md 所在的目录（安装后通常是 ~/.kiro/skills/mcd-receipt-persona）。output/ 写在当前工作目录下。

```bash
node <Skill目录>/scripts/fetch-orders.mjs --out output/history.json
```

可选参数：`--config <本地MCP配置文件>`（环境变量没设置时从这里读取 Token）、`--detail 30`（最多为多少单补充优惠信息，设为 0 则跳过）。

脚本做的事：调用 `order-list` 取最近 10 单，用 `query-order` 补上优惠金额，脱敏后与本地历史合并。屏幕上只会显示数量，不会显示订单内容。

### 3. 生成故事卡

```bash
node <Skill目录>/scripts/wrapped.mjs --input output/history.json --out output --name "<用户昵称，可省略>" --png
```

可选参数：`--since 2026-01-01 --until 2026-10-08` 限定范围，`--repo <名字>` 修改每页底部署名。`--png` 会调用本机的 Edge / Chrome / Chromium 导出 PNG；没有浏览器时脚本会给出提示，SVG 和 HTML 仍然会生成（可用环境变量 `MCD_BROWSER` 指定浏览器路径）。

### 4. 向用户展示
**读取 `output/summary.md`**（不要打开图片，见规则 6），用轻松的语气回复：

- 人格代码和名称，以及一句话描述。
- 4 个维度各自的结果。
- 2 到 3 条最有意思的发现。
- 文件位置：`output/pages/` 里的 7 张 PNG（第 7 页最适合直接分享）、`output/report.html`（单文件翻页版，浏览器打开）、`output/long.png`（竖向长图）。
- 说明样本量（共几单、什么时间范围），订单少于 5 单时提醒"仅供参考"，并建议过些天再运行一次来累积。
- 提醒分享前自己看一眼：卡片里不会有门店、地址、手机号、订单号，但会有餐品名、下单日期时间（第 5 页）和金额汇总。

### 5. 收尾
提醒用户：`output/` 已被 `.gitignore` 忽略；如果要分享，只发卡片截图，不要发 `history.json`。

## 演示模式（没有 Token 也能体验）

```bash
node <Skill目录>/scripts/wrapped.mjs --demo --out output --png
```

演示数据是脚本生成的虚构订单，要向用户说明这一点。

## 16 型图鉴

```bash
node <Skill目录>/scripts/wrapped.mjs --atlas --out output --png
```

生成 `atlas.svg` / `atlas.png`：16 个人格角色一图集齐，可以让用户对照自己的代码。

## 输入格式

`wrapped.mjs` 也能直接读取 MCP 的原始返回（包含「说明 + `## Original Response` + JSON」的 Markdown 文本）和标准格式，详见 `references/input-schema.md`。解析不出订单时，整理成标准格式再试，**只能搬运和改名字段，不能编造订单、金额或餐品**。

## 输出文件

| 文件 | 说明 |
|---|---|
| `pages/01-封面` … `pages/07-分享` | 7 页 9:16 故事卡，`.svg`，加 `--png` 后还有 `.png`（1080×1920） |
| `card.svg` | 最适合直接分享的一页（等于第 7 页） |
| `report.html` | 单文件翻页报告，每页有"保存本页 PNG"按钮，可离线打开 |
| `long.html` / `long.png` | 7 页竖向拼成的长图（1080×13440，`long.png` 需要 `--png`） |
| `summary.md` | 文字版摘要，**适合在对话里转述** |
| `summary.json` | 结构化统计数据 |
| `history.json` | 脱敏后的本地订单历史（仅本机使用，不要分享） |
