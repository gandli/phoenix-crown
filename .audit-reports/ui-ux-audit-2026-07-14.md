# UI/UX 专项体检报告 — phoenix-crown

> 方法：`impeccable audit`（5 维度技术质量）+ `fixing-motion-performance`（动效性能规则）
> 基准：`origin/main` @ `12cb640` · 审阅文件：`src/**`、`src/index.css`
> 日期：2026-07-14

## 审计健康分

| # | 维度 | 分数 | 关键发现 |
|---|---|---|---|
| 1 | 无障碍 (A11y) | 3/4 | 对比度达标，但**无 `:focus-visible` 焦点样式**（键盘用户看不见焦点）|
| 2 | 性能 (Perf) | 2/4 | 字形图集优化好，但 **rAF 无空闲停止**（breeze 永不停 → 60fps 常驻）；步进用固定 `1/60` |
| 3 | 响应式 (Responsive) | 3/4 | clamp 流式布局好；导航按钮 ~40px 略小于 44px 触控目标 |
| 4 | 主题 (Theming) | 3/4 | 设计令牌体系健全，但场景页硬写 `rgba()` 光晕/投影未走令牌 |
| 5 | 反模式 (Anti-Pattern) | 4/4 | 设计独特（汉字帘幕），无 AI slop 痕迹 |
| **总分** | | **15/20** | **Good（处理弱维度即可）** |

## 反模式裁定（先看这条）
**通过**。无渐变文字、无玻璃拟态卡片、无侧条边框、无 hero-metric、无每节 eyebrow、无 01/02/03 编号脚手架。动效仅用 transform/opacity。视觉语言独特，非 AI 生成感。

## 对比度实测（已验证，非估算）
| 文本 | 颜色 | 背景 `oklch(0.17 0.025 265)` | 比值 | 判定 |
|---|---|---|---|---|
| 正文 `--foreground` | ≈#E5D4DD | | **13.46:1** | AAA ✅ |
| 次要 `--muted-foreground` (11px) | ≈#6497B6 | | **6.05:1** | AA ✅ |
| 强调 `--accent` | ≈#E4A18C | | **8.89:1** | AAA ✅ |

## 详细发现（按严重度）

### [P1] 缺少键盘焦点样式
- **位置**：全局（无 `:focus-visible` 规则）；`SiteHeader.tsx:9-38`、`GalleryView.tsx:17-33` 的 `<button>` 均无焦点环
- **类别**：无障碍
- **影响**：纯键盘用户（Tab 切换展陈/集藏、集藏卡片）无法看见当前焦点，违反 WCAG 2.4.7
- **WCAG**：2.4.7 (AA)
- **建议**：在 `index.css` 加 `:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }`；导航/卡片按钮已用 `var(--ring)` 令牌（已定义未用），正好接上
- **建议命令**：`/impeccable harden`

### [P1] rAF 循环无空闲停止条件
- **位置**：`TextCurtain.tsx:368-445`（step）、`:500-515`（loop）、`:374-375`（breeze 常驻）
- **类别**：性能（动效）
- **影响**：`step()` 每帧给每个节点注入 `Math.sin(time*0.7+c*0.35)*0.012` 微风，**节点永不静止** → `requestAnimationFrame` 在无人交互时也 60fps 空转（GPU/CPU/电池常驻消耗）。`fixing-motion-performance` 明确禁止"no requestAnimationFrame loops without a stop condition"
- **标准**：`fixing-motion-performance` 规则 #1（never patterns: no rAF loops without a stop condition）
- **建议**：当 `reveal>=1` 且 `!isBrushing()` 且所有节点位移低于阈值（如 <0.05px，含 breeze 量级）时 `running=false` 停 RAF；`onPointerMove`/`onPointerLeave` 时若 `!running` 则重启 `loop()`。breeze 仅在"最近 2.5s 有交互 或 reveal 进行中"时非零，纯空闲则节点停 home、RAF 停
- **建议命令**：`/impeccable optimize`

### [P2] 物理步进与刷新率绑定
- **位置**：`TextCurtain.tsx:369` `time += 1/60`
- **类别**：性能（动效）
- **影响**：120Hz 屏上帘幕摆动/掉落速度是 60Hz 的 2 倍，动效不一致
- **建议**：用 `deltaTime` 累加（基于 `performance.now()` 两帧差），归一化到 60fps 基准
- **建议命令**：`/impeccable optimize`

### [P2] ResizeObserver 重建未防抖
- **位置**：`TextCurtain.tsx:574-578` `ro.observe(canvas)` → `build()`
- **类别**：性能
- **影响**：拖拽窗口连续 resize 时 `build()`（含 pretext 测量 + 建链）频繁触发，卡顿
- **建议**：`build()` 用 `requestAnimationFrame` 或 `setTimeout` 防抖（~150ms）
- **建议命令**：`/impeccable optimize`

### [P2] 场景页硬写颜色未走令牌
- **位置**：`DestinationScene.tsx:28,29,62,63`（`rgba(96,126,204,0.16)` 光晕、`drop-shadow rgba(96,126,204,0.35)`、`rgba(74,58,40,0.22)`）
- **类别**：主题
- **影响**：暗场光晕/投影硬编码，切换主题或调色板时需改多处，违反令牌化原则
- **建议**：把光晕色/投影色提为 `--crown-glow`、`--crown-shadow` 令牌（或复用 `--accent` 派生）；亮/暗两套
- **建议命令**：`/impeccable colorize`

### [P3] `--ring` 令牌未用 + 组件用字面 `border-white/10`
- **位置**：`index.css:12`（`--ring` 定义未引用）；`SiteHeader.tsx:21,33`、`GalleryView.tsx:23` 用 `border-white/10`
- **类别**：主题
- **影响**：令牌体系不完整，暗场边框色与 `--border` 令牌（`oklch(0.6 0.06 262/35%)`）不一致
- **建议**：按钮/卡片边框改用 `var(--border)`；顺带接 P1 的 `:focus-visible` 用 `var(--ring)`
- **建议命令**：`/impeccable colorize`

### [P3] 导航触控目标 ~40px
- **位置**：`SiteHeader.tsx:9`（`py-5` 头 + `text-xs`）→ 按钮高约 40px
- **类别**：响应式
- **影响**：低于 WCAG 2.5.8 建议的 44×44px 触控目标
- **建议**：导航按钮加 `min-h-[44px]` 或 `px` 留白；或 header `py-5`→`py-6`
- **建议命令**：`/impeccable adapt`

## 系统性问题
1. **动效常驻空转**：breeze 设计让帘幕永不静止，导致 rAF 无法停。应区分"入场微风 + 交互微风"与"纯空闲静止"。
2. **令牌覆盖不全**：核心文本色走了令牌，但装饰光晕/边框仍字面写死。

## 正向发现（保持）
- 字形图集（atlas）预栅格化，draw 循环零 `fillText`、零布局抖动（transform/opacity only）— 性能基底优秀
- `prefers-reduced-motion` 双保险（CSS + JS 静态渲染）已就位
- 语义结构好：`sr-only h1`、prev/next `aria-label`、画廊 `aria-current`、帘幕 `aria-hidden`
- 响应式 clamp 流式宽度，无横向溢出
- 视觉语言独特，无 AI slop

## 建议执行顺序（P0→P1→P2→P3）
1. **[P1] `/impeccable harden`** — 全局 `:focus-visible` 焦点环（接 `--ring`）
2. **[P1] `/impeccable optimize`** — rAF 空闲停止 + breeze 门控（仅交互/入场时微风）
3. **[P2] `/impeccable optimize`** — `deltaTime` 步进 + ResizeObserver 防抖
4. **[P2/P3] `/impeccable colorize`** — 光晕/投影/边框走令牌（`--crown-glow`/`--crown-shadow`/`--border`/`--ring`）
5. **[P3] `/impeccable adapt`** — 导航 `min-h-[44px]`

> 你可让我逐个跑、一次性全跑、或任意顺序。修复后重跑 `/impeccable audit` 看分数提升。
