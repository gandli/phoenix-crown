# 审计白皮书 · phoenix-crown（新鲜复扫 · #39 闭环后）

> 方法：手动执行 `fuck-my-shit-mountain` 全量方法论（Deep Scan：代码质量 / 安全 / 架构 / 依赖 / 文档）
> 基准：`origin/main` @ `5c94039`（含 #40 移除跟随冠 / #41 桌面适配 / #42 README 重构）
> 日期：2026-07-14
> 上一轮：#39 闭环 88/A，P0/P1/P2=0

## 综合评分

**88 / 100 · A**（与 #39 持平；本轮针对 #40/#41/#42 增量 + 全仓复扫，无新 P0/P1 引入，原 88/A 维持）

技术债估算：≈ 0.1 人日（仅 P3 配置级噪声，非代码缺陷）

## TL;DR（执行摘要表）

| 维度 | 分 | 关键结论 |
|---|---|---|
| 架构 | 9 | Scene/Gallery/Header/Curtain 单一职责，无循环依赖；`auto` 主题模式已彻底移除（`App.tsx:37` `effectiveDark = theme === "dark"`），无死代码残留 |
| 安全 | 9 | 纯客户端静态 SPA，无后端/密钥/用户输入；`_headers` CSP 已声明；`bun audit` 0 漏洞 |
| 稳定性 | 8 | rAF 空闲停止 + visibilitychange + resize 防抖已落；StrictMode 双调用无害 |
| 性能 | 8 | 图集预栅格化、transform/opacity、dt 步进、空闲停 RAF；#41 桌面适配为纯 CSS clamp，零 JS 开销 |
| 测试 | 8 | #36 补 vitest + 10 测试 + CI 门禁（当前 `bun run test` 全绿）|
| 可维护性 | 9 | TS 严格、token 化、无 dead code；i18n 轻量字典；#42 README 视觉层级清晰 |
| 文档 | 9 | README 含 hero SVG / 效果预览 / 两版对比 / 主题语言 / IA 决策；SECURITY/LICENSE/CI 齐全 |

## P0/P1/P2 清单

**无 P0 / 无 P1 / 无 P2。**

| ID | 严重度 | 维度 | 文件:行 | 问题 | 状态 |
|---|---|---|---|---|---|
| P3-MD013 | P3 | 文档 lint | `README.md:66,95,96,112,118` | markdownlint MD013 行宽 >80（GitHub 渲染无视，非阻断）| 待配置级修复（见下）|
| P3-CONSOLE | P3 | 可维护性 | `TextCurtain.tsx:299/304/311` | 3 处 `console.warn` 为 pretext 回退诊断，前缀清晰无泄密 | 合规，可保留 |

## 增量专项核查（#40/#41/#42）

- **#40 移除跟随冠**：`App.tsx` `theme` 初值改 `dark`，`onCycleTheme` 改 `dark↔light`；`i18n.ts` `ThemeMode` 去 `auto`；`SiteHeader` aria-label 去 `themeAuto`。grep 确认无 `auto`/`themeAuto`/`跟随冠` 残留。✅
- **#41 桌面适配**：`DestinationScene` 冠图 clamp 上限 440→640(dark)/560→760(light)，帘幕/光晕同步放大，左右胶囊 `lg` 内移 7vw；`SiteHeader` `max-w-[1600px] mx-auto`；`GalleryView` 网格 `max-w-[1500px] mx-auto`。纯 CSS，CDP 实测 1920 冠宽占视口 28%、390 移动端无横向溢出。✅
- **#42 README 重构**：新增 `docs/readme-hero.svg`（GitHub 安全，无 script/foreignObject，含 viewBox+title）；README 重排；`audit_readme.py` 通过（6 本地图 OK）。✅

## 验证命令（real）

```
bun run build   → ✓ built in 102ms
bun run test    → 10 passed
bun audit       → No vulnerabilities found
grep console.   → 仅 3 处已知 pretext 回退诊断（P3-CONSOLE，合规）
```

## 闭环结论

评分 **88/A ≥ 85 达标线**，且 **P0/P1/P2 = 0**，审计闭环维持。唯一开放项为 P3 级噪声（MD013 行宽 + 已知 console.warn），不构成缺陷，不强制修复。
