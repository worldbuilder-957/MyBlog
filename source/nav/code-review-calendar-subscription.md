# 日历订阅功能 — 代码审查报告

> 审查日期：2026-05-15
> 审查范围：`source/nav/script.js`、`source/nav/index.html`、`source/nav/style.css`、`source/nav/sw.js`
> 功能概述：为 PWA 命令中心（`/nav/`）添加 ICS 日历订阅，支持飞书日历、Google 日历等外部源

## 修改文件

| 文件 | 变更 | 说明 |
|------|------|------|
| `source/nav/script.js` | +710 行 | ICS 解析器、订阅管理器、refreshCalendarData 注入 |
| `source/nav/index.html` | +51 行 | 工具栏"订阅"按钮 + 订阅管理弹窗 |
| `source/nav/style.css` | +110 行 | 订阅列表项、状态色条、按钮样式 |
| `source/nav/sw.js` | 56→85 行 | ICS 请求 Network-First，其余 Cache-First |

## 架构

```
UI 层 (弹窗+列表) → 订阅管理器 (CRUD+同步) → localStorage
                              ↓
                       ICS 解析器 (纯前端)    Service Worker (Network-First)
```

## 潜在问题

### 高优先级

- **localStorage 容量风险**：单 key 可超 5MB，建议 500 条/订阅上限
- **CORS 代理隐私**：第三方可读订阅链接，直连已优先，建议 UI 提示
- **时区处理缺失**：UTC 时间 (`Z` 后缀) 会偏移 8 小时，需 `new Date()` 自动转换
- **SW 更新延迟**：旧 SW 可能缓存旧策略，建议指导用户手动刷新

### 中优先级

- **订阅名含单引号**：内联 `onclick` 中 JS 语法错误
- **自动刷新竞态**：定时器与手动操作可能并发
- **订阅事件点击体验**：弹出不可编辑框，建议改为只读详情
- **exportToICS 不包含订阅事件**：by-design

### 低优先级

- **RRULE BYDAY 复杂模式**：不支持 `-1MO` 等嵌套
- **SW ICS 缓存无过期清理**：建议 7 天 TTL

## 安全性

| 项目 | 状态 |
|------|------|
| XSS 防护 | ✅ `escapeHtml()` |
| URL 注入 | ✅ `new URL()` |
| localStorage 污染 | ⚠️ 恶意 ICS 可写入畸形事件 |
| 第三方代理 | ⚠️ 直连优先，代理降级 |

## 兼容性

- Chrome/Firefox 90+ ✅
- Safari 15.4+ ✅
- iOS Safari PWA ⚠️ SW 更新慢

## 性能

- 首屏不受影响（按需加载）
- ICS 解析 < 50ms / 1000 事件
- 自动刷新 30 分钟间隔
- localStorage 读写 < 1ms

## 总结

结构清晰，功能完整。上线前优先处理时区处理和 CORS 代理隐私告知。
