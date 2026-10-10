# 输入格式

`wrapped.mjs` 接受三种输入。

## 1. fetch-orders.mjs 生成的 `history.json`（默认路径）

```json
{ "updatedAt": "...", "orders": [ { "orderId": "<哈希>", "createTime": "2026-09-12 12:47:48", "orderType": "1", "beType": "4",
  "orderStatus": "订单已完成", "realTotalAmount": "23.25", "totalDiscountAmount": "5",
  "orderProductList": [ { "productName": "...", "quantity": 1, "comboItemList": [ { "name": "...", "quantity": 1 } ] } ] } ] }
```

## 2. 麦当劳 MCP 的原始返回

`order-list` 和 `query-order` 返回的是一段 Markdown：先是字段说明，然后是 `## Original Response` 加完整 JSON。脚本会自动提取这段 JSON，也兼容外面再包一层 MCP 的 `content[].text`。可以直接把每次的原始返回按数组存成一个文件喂给脚本。

### 已验证的真实字段（`order-list`）

| 字段 | 含义 | 脚本如何使用 |
|---|---|---|
| `orderId` | 订单编码 | 去重 |
| `createTime` | 下单时间（北京时间，`yyyy-MM-dd HH:mm:ss`） | 时段、星期、连续天数 |
| `orderType` | 订单类型：`1` 到店（含得来速），`2` 外送（含团餐） | 就餐方式（无 `beType` 时） |
| `beType` | 门店类型：`1` 到店取餐，`2` 麦乐送，`5` 得来速，`6` 企业团餐，`4` 为甜品站等 | 就餐方式（优先） |
| `storeName` / `storeCode` | 门店 | 仅用于统计光顾过几家，不展示 |
| `orderStatus` | 订单状态，如"订单已完成" | 含"取消/关闭/退款"的订单会被跳过 |
| `orderProductList[]` | 商品：`productName`、`quantity`、`comboItemList[]` | 有子项时展开子项统计（套餐名不是真正的餐品） |
| `realTotalAmount` | 实付金额（元，字符串） | 累计消费 |

### `query-order` 额外提供

`totalDiscountAmount`（总优惠金额）、`couponList[]`。它同时包含收件人手机号、地址、骑手电话等隐私字段，**不要直接保存或展示**，用 `fetch-orders.mjs` 提取需要的字段。

## 3. 标准格式（兜底）

```json
{
  "orders": [
    {
      "id": "A001",
      "time": "2026-09-12 21:35:00",
      "type": "麦乐送",
      "amount": 38.5,
      "discount": 6,
      "store": "示例餐厅",
      "items": [
        { "name": "巨无霸套餐", "qty": 1, "price": 29.9 },
        { "name": "苹果派", "qty": 2 }
      ]
    }
  ]
}
```

- `time` 必填，其余字段缺失时对应的统计会自动降级（例如没有 `discount`，"精打细算"维度按"随心派"计）。
- 金额单位是元；如果手头是分，运行时加 `--amount-unit cents`。
- 只做字段搬运和改名，不要编造任何内容。
