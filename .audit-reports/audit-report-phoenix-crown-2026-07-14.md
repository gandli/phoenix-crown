# 审计白皮书 · phoenix-crown（全量复扫）

> 方法：`fuck-my-shit-mountain` full 模式 · 语言：中文 · 输出：`.audit-reports/`
> 基准：`origin/main` @ `abfb849`（含 #34 主题/语言切换）
> 日期：2026-07-14
> 上一轮：2026-07-13 首扫 63/D → 修复 85/A-；本轮为代码大幅演进后的**复扫**（新增 ~20 PR：UI 体检、prev/next、集藏升级、redesign 变体、IA 文档、i18n、主题/语言切换）。

## 综合评分

**85 / 100 · A-**（初扫 63/D → 修复 85/A-；本轮复扫在新增主题/语言/i18n 后仍为 85/A-，P2-GLOW 经 CDP 核实为非问题已撤回，无新增 P0/P1 残留）

技术债估算：≈ 0.5 人日（P1×2 + P2×1 + P3×2，均为低风险局部修复）。

## TL;DR（执行摘要表）

| 维度 | 分 | 关键结论 |
|---|---|---|
| 架构 | 9 | 组件边界清晰（Scene/Gallery/Header/Curtain 单一职责），无循环依赖 |
| 安全 | 9 | 纯客户端静态 SPA，无后端/密钥/用户输入；`_headers` CSP 已声明；`bun audit` 无漏洞 |
| 稳定性 | 8 | rAF 空闲停止 + visibilitychange 暂停 + resize 防抖已落；StrictMode 双调用已无害 |
| 性能 | 8 | 图集预栅格化、transform/opacity、dt 步进、空闲停 RAF；主题切换仅 CSS 变量无重排 |
| 测试 | 6 | **零自动化测试**（P1，阻断级风险：重构无回归护网）|
| 可维护性 | 8 | TS 严格、token 化、无 dead code；i18n 轻量字典清晰 |
| 文档 | 9 | README 含效果预览/两版对比/主题语言/IA 决策；SECURITY/LICENSE/CI 齐全 |

## P0/P1/P2 清单（摘要）

| ID | 严重度 | 维度 | 文件:行 | 问题 |
|---|---|---|---|---|
| P1-TEST | P1 | 测试 | 全仓 | 无单测/E2E，CI 仅 tsc+build+audit，重构无回归护网 |
| P1-THEME | P1 | 架构/状态 | `App.tsx:11-17` | 主题/语言 state 未持久化（刷新即丢），且 `?pro` 也丢失；破坏用户选择 |
| P2-EN-NOOP | P2 | i18n 完整性 | `SiteHeader.tsx` / `DestinationScene.tsx` | 英文模式仅翻 UI 标签，底部 phraseNote/caption 仍中文且无英文对照，info 架构上"半翻译" |
| P3-REDUCE | P3 | 动效 | `index.css` reduced-motion 块 | 已覆盖；`fade-in-up` 用 `motion-safe:` 前缀，天然尊重偏好（合规）|
| P3-CONSOLE | P3 | 可维护性 | `TextCurtain.tsx:299/304/311` | 3 处 `console.warn` 为 pretext 回退诊断，前缀清晰无泄密，可保留 |

## 剩余项（非阻断）
- 无开放 P0。
- IA 文档 Q1（集藏内直接对比）/ Q4（冠图加载失败表面反馈）为已知开放项，不计入审计缺陷。

---

## 详细 Findings

### P1-TEST · 测试覆盖缺失（阻断级风险）

- **证据**：全仓无 `*.test.ts(x)`、`vitest`/`jest` 配置缺失；`package.json` scripts 仅 `dev/build/preview`；CI `.github/workflows/ci.yml` 只跑 `tsc` + `bun audit` + `bun run build`。
- **确认/疑似**：Confirmed（已 `find` 确认无测试文件）。
- **真实失败场景**：`?pro` 的 `GalleryViewPro` 与默认 `GalleryView` 已分化；`i18n.ts` 键若重命名/拼写错，tsc 能抓类型但**运行时标签串**无保护；任何后续重构（如把主题状态抽 hook）无回归护网。本会话多轮 P1/P2 修复均"靠人工验证+PR 合并"，无自动红绿信号——正是测试缺失的典型代价。
- **最小修复**：引入 `vitest`（devDep），补 2 个纯函数测试：
  1. `crownDataUri('fengguan')` → `'/crowns/crown-fengguan.png'`（映射不回归）
  2. `t('gallery','en')` → `'Collection'`、`t('scene','zh')` → `'展陈'`（i18n 键不漂移）
- **回归测试建议**：上述 2 例即锁定 `crown-art` 映射与 `i18n` 字典；后续加 `destinations` 字段校验（如每冠必含 `theme`）。
- **工作量**：≈ 30 min。

### P1-THEME · 主题/语言状态未持久化

- **证据**：`src/App.tsx:11-17` —— `theme`/`lang` 仅 `useState`，无 `localStorage` 读写；`?pro` 亦未持久化。
- **确认/疑似**：Confirmed。
- **真实失败场景**：用户选「亮场 + EN」做演示/分享，F5 刷新或他人打开链接 → 回到 `auto/zh`，首屏印象每次重置。对"推广"站点，语言切换的实用价值被刷新清零。
- **最小修复**：初始化时从 `localStorage` 读取（`useState(() => localStorage.getItem('theme') as ThemeMode ?? 'auto')`），`useEffect` 内 `localStorage.setItem` 写回；`?pro` 同理或并入持久化 key。
- **回归测试建议**：测试初始化器在 `localStorage` 有值时优先采用（可用 `localStorage` mock）。
- **工作量**：≈ 20 min。

### ~~P2-GLOW · 亮场 hover 光晕色调不协调~~ → **已核实：非问题，撤回**

- **核实动作**：CDP 实测亮场 `--crown-glow` 计算值为 `rgba(180,140,70,0.18)`（暖金），卡片 glow span 背景同为 `rgba(180,140,70,0.18)`。
- **结论**：`[data-theme="light"]` 已重定义 `--crown-glow` 为暖金，卡片 hover 引用 `var(--crown-glow)` 随令牌层叠自动切换，**无蓝晕浮暖纸底的冲突**。原假设（内联 `style` 不被层叠影响）不成立——CSS 自定义属性在内联 `var()` 引用时仍受祖先 `[data-theme]` 选择器覆盖。撤回本项，不计入缺陷。

### P2-EN-NOOP · 英文模式"半翻译"需文档化

- **证据**：`src/components/SiteHeader.tsx` / `DestinationScene.tsx` 英文模式仅翻 UI 标签（导航/按钮/aria）；底部 `phraseNote`/`caption`（`destinations.ts`）仍中文，无英文对照。
- **确认/疑似**：Confirmed（设计取舍，非 bug）。
- **风险**：易被视为"翻译没做完"的缺陷；INFO 架构上 UI 与内容语言不一致。
- **最小修复（二选一）**：
  (a) **文档化**：README/IA 文档明确"英文模式仅 UI 本地化，冠名诗句保留中文（内容不译）"——零代码改动，消除歧义；
  (b) **补全**：`destinations.ts` 给 7 顶各补 `phraseEn`/`captionEn`，英文模式渲染对照。工作量大（7×2 文案）但完整。
- **建议**：采用 (a) 本轮落地（成本低），(b) 留作后续内容增强。
- **工作量**：(a) 5 min / (b) 1–2 h。

### P3-REDUCE · reduced-motion 已覆盖（低风险）

- `index.css` 的 `@media (prefers-reduced-motion: reduce)` 块存在；入场动画 `fade-in-up` 用 `motion-safe:` 前缀（仅 `prefers-reduced-motion: no-preference` 时播放），已天然尊重偏好。无需改动，记录为已合规。

### P3-CONSOLE · pretext 回退诊断日志（可保留）

- `src/components/TextCurtain.tsx:299/304/311` 三处 `console.warn` 前缀 `[TextCurtain]`，仅 pretext 测量失败/回退时输出，无敏感数据。属合理诊断日志，建议保留；若追求零生产日志可降级为 `import.meta.env.DEV` 守卫。非阻断。

---

## 闭环状态（2026-07-14 复扫后修复）

| 顺序 | ID | PR | 状态 |
|---|---|---|---|
| 1 | P1-TEST | #36 | ✅ 已合并 · vitest + 10 测试 + CI 门禁 |
| 2 | P1-THEME | #37 | ✅ 已合并 · localStorage 持久化 |
| 3 | P2-EN-NOOP | #38 | ✅ 已合并 · README 文档化 |

**复扫结果：P0=0, P1=0, P2=0**（P2-GLOW 经 CDP 核实为非问题已撤回）。综合 **88/A**（原 85/A-，+3 因补测试护网 + 状态持久化）。

剩余 P3（reduced-motion 已合规 / pretext 回退日志可保留）非阻断，不计入缺陷。

