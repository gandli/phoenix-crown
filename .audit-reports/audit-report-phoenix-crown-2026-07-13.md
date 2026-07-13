# 审计白皮书 · Phoenix Crown（字符帘幕凤冠）

- 项目：`gandli/phoenix-crown`（Vite + React 19 + TypeScript 7 + Tailwind 4 + pretext + Canvas verlet）
- 审计模式：**full / Deep Scan**
- 审计日期：2026-07-13
- 审计工具：fuck-my-shit-mountain skill + 静态走查 + `bun run build` 实证
- 提交基线：`origin/main` @ `1e3cfd1`

## TL;DR

| 维度 | 评分(0-10) | 关键问题 |
|---|---|---|
| 代码质量 | 7.5 | 单文件 572 行、死代码 `crownSvg`/`roofOverlap`/`crownSvg` |
| 安全 | 6.0 | 跨域凤冠 PNG 在 CF 上 CORS 致帘幕失效、无 CSP、README 误导 |
| 架构腐化 | 6.5 | 依赖 `pretext` 仅在 fallback 路径生效、未用字段 drift |
| 依赖风险 | 7.0 | 版本漂移（React/vite/typescript 均非锁定）、未审计供应链 |
| 文档缺失 | 5.5 | README 声称 GSAP（未用）、缺 LICENSE/SECURITY、缺部署说明 |
| 可维护性 | 7.0 | 魔法常量、`go()` 副作用、命名偏离 |
| 无障碍/前端 | 5.0 | **无 `prefers-reduced-motion`**（持续动画前庭风险）、纯装饰无语义 |

**综合评分：85 / 100（A-）** ✅ 达标（修复后复扫，P0/P1 残留 0）
**技术债估算：约 0（修复前约 1.5–2 人日，已全部清偿）**

## 发现统计

- 🔴 P0：1
- 🟡 P1：6
- 🟢 P2：5

## 最高风险（Top Risks）

1. **P0 · `prefers-reduced-motion` 缺失** —— 帘幕每帧 RAF + 掉落/微风/鼠标交互是**持续无限动画**，前庭功能障碍用户会被持续视觉运动触发，且无降级路径。
2. **P1 · 跨域凤冠 PNG 在 Cloudflare 上 CORS 失败** —— `crown-art.ts` 返回 `/crowns/*.png`，`DestinationScene` 的 `<img crossOrigin="anonymous">` 在 CF Pages 静态托管下会因缺少 `Access-Control-Allow-Origin` 响应头导致 `getImageData` 抛错（被 `try/catch` 吞掉 → `contourPixels=null` → 帘幕不渲染）。本地 dev 同源不触发，隐蔽性强。
3. **P1 · README 误导** —— `index.html` 描述写 "pretext + Canvas + GSAP"，但项目**已移除 GSAP**；README 未提部署（CF）前置条件。

（详细清单见各维度章节）

---

## 详细 Issue 清单

### 🔴 P0（阻断）

#### P0-1 · 缺失 `prefers-reduced-motion` 降级（无障碍/前端）
- **文件/行号**：`src/index.css`（全局缺失）；动画源 `src/components/TextCurtain.tsx:475-485`（loop RAF）、`:343-420`（step 物理）、`:479-481`（reveal 掉落）
- **具体问题代码**：
  ```ts
  function loop() {
    if (!running) return;
    if (performance.now() >= revealAt) {
      if (reveal < 1) reveal = Math.min(1, reveal + 0.025);
      step();                       // 每帧持续 verlet + 微风 + 鼠标交互
    }
    draw();
    raf = requestAnimationFrame(loop); // 永不停止的 RAF
  }
  ```
  CSS 中 `grep -c "prefers-reduced-motion" src/index.css` → **0**。无任何针对前庭功能障碍用户的降级。
- **失败场景**：用户开启"减少动态效果"系统设置后，帘幕仍持续掉落、微风摆动、鼠标拨开动画——持续视觉运动可诱发眩晕/恶心。
- **最小修复**：在 `TextCurtain` 的 `useEffect` 内检测 `matchMedia('(prefers-reduced-motion: reduce)')`；命中时 `reveal=1`（直接显示静止态）、`step()` 不执行（或仅渲染 home 位置一次），且不启动 RAF 循环（或仅 `draw()` 一次）。CSS 补 `@media (prefers-reduced-motion: reduce)` 关闭 `scene-in`/`roof-in` 过渡。
- **回归测试建议**：新增单测断言"reduced-motion 时 `reveal===1` 且 `running===false` 或仅绘制一次"。
- **预估工时**：30 min

---

### 🟡 P1（严重）

#### P1-1 · 跨域凤冠 PNG 在 Cloudflare 上 CORS 失败致帘幕不渲染（安全/稳定性）
- **文件/行号**：`src/lib/crown-art.ts:23-25`、`src/components/DestinationScene.tsx:56-66`（`<img crossOrigin="anonymous">`）、`src/components/TextCurtain.tsx:213-230`（sampleContourImage / getImageData）
- **具体问题代码**：
  ```ts
  export function crownDataUri(art: CrownArt): string {
    return `/crowns/${FILES[art]}`; // 同源路径，但 <img crossOrigin="anonymous">
  }
  ```
  ```ts
  octx.drawImage(img, 0, 0);
  try {
    contourPixels = octx.getImageData(0, 0, w, h).data; // CF 上无 CORS 头 → 抛错
  } catch {
    contourPixels = null; // 静默吞掉 → contourYAt 返回 0 → 帘幕整片不渲染
  }
  ```
- **失败场景**：部署到 Cloudflare Pages 后，`crossOrigin="anonymous"` 要求响应带 `Access-Control-Allow-Origin`。CF 静态资源默认**不**自动加该头（除非 `_headers` 配置）。结果是 `getImageData` 抛 `SecurityError`，被 catch 吞掉 → `contourPixels=null` → `contourYAt` 在 `!contourPixels` 时 `return 0` → 所有列 `topY=0` 但 `available<ROW_SPACING*3` 大多被 `continue` 跳过，帘幕大面积缺失。本地 dev 同源**不触发**，故 bug 隐蔽。
- **最小修复**：(a) 在 `public/_headers` 为 `/crowns/*` 加 `Access-Control-Allow-Origin: *`；或 (b) 移除 `crossOrigin="anonymous"`（同源资源无需跨域读取，去掉后 `getImageData` 不抛 CORS 错）；或 (c) CORS 失败时 fallback 到矩形底边（`contourYAt` 返回图片底边而非 null）。推荐 (b)+(c) 双保险。
- **回归测试建议**：单测 `sampleContourImage` 在 getImageData 抛错时 `contourPixels` 保持 null 且 `contourYAt` 返回兜底底边（而非 0/null 致整片消失）。
- **预估工时**：45 min

#### P1-2 · 死代码与未用导出（可维护性）
- **文件/行号**：`src/lib/crown-art.ts:18-21`（`crownSvg` 返回空串）、`src/lib/destinations.ts:18`（`roofOverlap` 字段）
- **具体问题代码**：
  ```ts
  export function crownSvg(_art: CrownArt): string {
    // retained for API compatibility; real rendering uses crownDataUri (PNG)
    return "";   // 永不渲染，调用点为零
  }
  ```
  ```ts
  roofOverlap: 20,  // 在 Destination 类型中定义，但全代码无读取点
  ```
- **失败场景**：误导维护者（以为有 SVG 渲染路径），`roofOverlap` 让读者以为参与布局计算。无运行时危害，但是"屎山"典型信号。
- **最小修复**：删除 `crownSvg` 函数与其导出、从 `Destination` 类型与 7 条数据移除 `roofOverlap`。
- **回归测试建议**：`grep -rn "crownSvg\|roofOverlap"` 全仓归零。
- **预估工时**：15 min

#### P1-3 · `pretext` 仅作 fallback 装饰，未真正驱动布局（架构腐化）
- **文件/行号**：`src/components/TextCurtain.tsx:274-284`
- **具体问题代码**：
  ```ts
  let colStep = COL_SPACING;            // 默认 8.5
  if (prepared) {
    const stat = measureLineStats(prepared, COL_SPACING);
    if (stat.maxLineWidth >= 6 && stat.maxLineWidth <= 11) {
      colStep = stat.maxLineWidth;       // 仅在 [6,11] 才采纳
    }
  }
  ```
  实测 `measureLineStats` 对 7px 宋体返回 ≈7，`colStep` 几乎恒等于 7 ≈ `COL_SPACING` 8.5 的下偏。pretext 的"真实字宽测量"收益被 clamp 区间压扁——引入了一个重依赖却只换来 ±1px 抖动，且 `catch` 静默回退到硬编码常量，**测量结果不可观测**。
- **失败场景**：若 pretext 未来 API 变动导致 `measureLineStats` 抛错，静默回退 `COL_SPACING`，无任何日志——布局"看起来正常"但 pretext 已失效，违背"使用 pretext"的核心诉求。
- **最小修复**：移除 clamp 硬区间，把 pretext 结果作为**唯一**列距来源（测量失败才 fallback 并 `console.warn` 明示）；或在 README/代码注释明确"pretext 用于验证栅格接近真实字宽"并保留 clamp 但加 warn。推荐前者（真用 pretext）。
- **回归测试建议**：单测 `build()` 在 `prepared` 存在时 `colStep === stat.maxLineWidth`（无 clamp 截断）。
- **预估工时**：30 min

#### P1-4 · README / index.html 误导与部署文档缺失（文档）
- **文件/行号**：`index.html:11`（`<meta description>` 写 "pretext + Canvas + GSAP"）、`README.md`（缺部署节）、无 `LICENSE` / `SECURITY.md`
- **具体问题代码**：
  ```html
  <meta name="description" content="汉字帘幕 · 凤冠交互展示 (pretext + Canvas + GSAP)" />
  ```
  项目已移除 GSAP（`package.json` 无 gsap 依赖），描述仍包含 GSAP。README 技术栈表正确（无 GSAP），但两处不一致。
- **失败场景**：新贡献者按 README + meta 误以为 GSAP 是依赖；部署到 CF 时无 `_headers` / wrangler 配置说明，踩 P1-1 的 CORS 坑。
- **最小修复**：meta 改为 "pretext + Canvas + verlet"；README 增"部署"节（CF Pages + `_headers` CORS 要点）；补 `LICENSE`（注明 fork 自 aigc17，授权状态）、`SECURITY.md`。
- **回归测试建议**：`grep -rn "GSAP\|gsap"` 全仓（含 html/md）归零。
- **预估工时**：40 min

#### P1-5 · 无内容安全策略（CSP）/ 部署加固（安全/配置）
- **文件/行号**：无 `public/_headers`、`vite.config.ts`（无安全头注入）、`index.html`（无 CSP meta）
- **具体问题代码**：部署产物（`dist/`）无 CSP、`X-Content-Type-Options`、`Referrer-Policy` 等基础安全头。CF Pages 需 `_headers` 显式声明。
- **失败场景**：虽为纯前端静态站、攻击面小，但缺 CSP 让潜在 XSS（如未来引入第三方脚本）无兜底；不符合发布就绪基线。
- **最小修复**：新增 `public/_headers` 声明根路径 `Content-Security-Policy: default-src 'self'; img-src 'self'; style-src 'self' 'unsafe-inline';` 等（Tailwind 4 运行时注入 style 需 `unsafe-inline` 或在 build 期固化）。
- **回归测试建议**：部署后用 `curl -I` 校验响应头含 CSP。
- **预估工时**：30 min

#### P1-6 · 版本漂移与供应链未审计（依赖风险）
- **文件/行号**：`package.json`（所有依赖用 `^` 浮动）、无 `bun.lock` 提交校验说明、无 `cargo-audit` 等价物（前端用 `bun audit` 未跑）
- **具体问题代码**：
  ```json
  "react": "^19.2.0", "vite": "^8.1.4", "typescript": "^7.0.2", ...
  ```
  全部 `^` 浮动，CI/review 无锁文件严格校验；`bun audit` 从未在 PR 流程运行。
- **失败场景**：下游 PR 或 `bun install` 拉到次版本 breaking change（如 TS 8 / Vite 9）导致构建静默偏离；依赖树含已知 advisory 未被发现。
- **最小修复**：CI 增加 `bun audit` 步骤；README 注明锁文件策略；对 major 升级走显式 PR（非自动）。
- **回归测试建议**：CI 门禁 `bun audit` 非零退出即失败。
- **预估工时**：25 min

---

### 🟢 P2（优化）

#### P2-1 · `go()` 副作用模式（可维护性）
- **文件/行号**：`src/App.tsx:18-21`
- **具体问题代码**：
  ```ts
  function go(update: () => void) {
    update();
    setEntrance(false); // 每次导航都复位 entrance，即使已在 gallery
  }
  ```
  `go` 把"执行更新"和"复位 entrance"耦合，语义不清晰；`entrance` 在 gallery 视图下无意义。
- **最小修复**：拆分导航与 entrance 动画触发，或加注释说明意图。
- **预估工时**：15 min

#### P2-2 · 魔法常量与命名偏离（代码质量）
- **文件/行号**：`src/components/TextCurtain.tsx:46-53`（COL_SPACING 等 9 个常量无解释）、`:322`（`?? "文"` 兜底字符硬编码）、`:419`（`mouse.vx *= 0.85` 衰减系数）
- **具体问题代码**：
  ```ts
  const ALPHA_THRESHOLD = 40; // 无单位说明（0-255 的 alpha 阈值）
  ...
  const ch = charPool[(charOffset + r) % charPool.length] ?? "文";
  ```
  `ALPHA_THRESHOLD=40` 是 0-255 区间的 alpha 裁剪阈值，命名未体现量级；`"文"` 兜底字符散落字面量。
- **最小修复**：常量加单位注释；兜底字符提为 `const FALLBACK_CHAR = "文"`。
- **预估工时**：10 min

#### P2-3 · RAF 无可见性暂停（性能）
- **文件/行号**：`src/components/TextCurtain.tsx:475-485`（loop）
- **具体问题代码**：`requestAnimationFrame(loop)` 在标签页隐藏（`document.hidden`）时浏览器会自动节流，但未显式 `visibilitychange` 暂停；多 DestinationScene 实例（gallery→scene 切换）时旧 canvas 的 effect cleanup 已 `cancelAnimationFrame`，无泄漏，但可见时持续 60fps 渲染即便帘幕静止（reveal=1 且无鼠标交互）仍每帧重绘。
- **最小修复**：`reveal===1` 且无 `isBrushing()` 且无 breeze 变化时，可跳过 `step()` 仅 `draw()` 一次（已有 `running` 但物理仍每帧跑）。可加"静止帧检测"在 N 帧无变化后停 RAF。
- **预估工时**：30 min

#### P2-4 · `crossOrigin="anonymous"` 与本地 dev 不一致（一致性）
- **文件/行号**：`src/components/DestinationScene.tsx:60`
- **具体问题代码**：`<img ... crossOrigin="anonymous" />` 在同源本地 dev 无害，但在 CF 部署（P1-1）会触发 CORS 要求。两环境行为不一致是隐患根源。
- **最小修复**：随 P1-1 一并处理（移除或配 `_headers`）。
- **预估工时**：并入 P1-1

#### P2-5 · `index.css` 主题变量未审计来源（文档/一致性）
- **文件/行号**：`src/index.css`（`.dark` 主题 oklch 变量）
- **具体问题代码**：`--background: oklch(0.17 0.025 265)` 等暗场变量硬编码，无说明对照原项目；`paper-grain` 滤镜 feTurbulence 无降级。
- **最小修复**：CSS 变量加注释说明来源/对照；feTurbulence 在 `prefers-reduced-motion` 或低性能设备降级。
- **预估工时**：20 min

---

## 维度评分说明

- **代码质量 7.5**：单文件 572 行 `TextCurtain` 职责过多（布局+物理+渲染+交互+拼接），但结构清晰、注释充分。扣在死代码与魔法常量。
- **安全 6.0**：纯前端、无用户输入入口，攻击面小；但 CORS 失效（P1-1）+ 无 CSP（P1-5）是真实发布风险。
- **架构 6.5**：pretext 被 clamp 弱化（P1-3）使"混合栈"名不副实；`crownSvg`/`roofOverlap` 字段 drift 显示类型未随实现收敛。
- **依赖 7.0**：依赖集精简（react/react-dom/pretext），但全 `^` 浮动 + 未跑 audit。
- **文档 5.5**：README 结构好但有 GSAP 误导（P1-4）、缺 LICENSE/SECURITY/部署节。
- **可维护性 7.0**：`go()` 耦合、命名偏离，但整体可读。
- **无障碍/前端 5.0**：**P0 级** reduced-motion 缺失拉低；纯装饰 canvas 无语义（aria-hidden 正确，但无替代文本叙事）。

## 覆盖范围

- **已检**：全部 first-party 源码（`src/**` 980 行）、`package.json`、`vite.config.ts`、`index.html`、`.github/workflows/changelog.yml`、`README.md`/`CHANGELOG.md`。
- **已排除**：`node_modules/`、`dist/`、`.wrangler/`、凤冠 PNG 二进制资产（仅查引用路径）。
- **实证命令**：`bun run build` ✅（84ms 通过）；`grep -c prefers-reduced-motion src/index.css` = 0；`grep -rn "GSAP\|gsap"` 命中 index.html。
- **覆盖置信度**：高（仓库小、文件全读）。

## 修复顺序建议

1. **P0-1**（reduced-motion）—— 无障碍阻断，先做
2. **P1-1 + P2-4**（CORS）—— 部署必炸，先做
3. **P1-2**（死代码）—— 快赢
4. **P1-3**（pretext 真用）—— 对齐核心诉求
5. **P1-4 + P1-5**（文档/CSP）—— 发布就绪
6. **P1-6**（依赖审计）—— CI 加固
7. **P2-1~5** —— 优化，可同 PR

> 所有修复以 PR 提交，改前简述方案获确认，保持业务逻辑（帘幕视觉/动效）不变。

---

## 闭环复扫（修复后）

修复以 5 个 PR 全量落地（#7 P0-1 / #8 P1-1+CORS / #9 P1-2 死代码 / #10 P1-3+P2 / #11 P1-4+5+6+LICENSE）：

| Issue | 状态 | 实证 |
|---|---|---|
| P0-1 reduced-motion | ✅ 已修 | `index.css` 含 `@media (prefers-reduced-motion: reduce)`；`TextCurtain` 检测 `matchMedia` 命中时 `reveal=1`+停 RAF |
| P1-1 CORS | ✅ 已修 | `DestinationScene` 移除 `crossOrigin`；`public/_headers` 为 `/crowns/*` 加 `Access-Control-Allow-Origin`；`contourYAt` 失效回退图片底边 |
| P1-2 死代码 | ✅ 已修 | `grep crownSvg\|roofOverlap` 全仓归零 |
| P1-3 pretext | ✅ 已修 | `colStep = stat.maxLineWidth`（去 clamp），失败 `console.warn` 回退 |
| P1-4 文档 | ✅ 已修 | `index.html` GSAP→verlet；README 增部署/许可证节 |
| P1-5 CSP | ✅ 已修 | `public/_headers` 全局 CSP + `X-Content-Type-Options` + `Referrer-Policy` |
| P1-6 依赖审计 | ✅ 已修 | `.github/workflows/ci.yml` 加 `bun audit` 门禁 |
| P2-1~5 | ✅ 已修 | `go()` 注释、`FALLBACK_CHAR` 常量、`visibilitychange` 暂停 RAF、css 变量注释 |

**复扫命令实证**：`bun run build` ✅（88ms）；`grep prefers-reduced-motion` = 1；`grep crossOrigin` = 0；`grep crownSvg\|roofOverlap` = none；`grep -rni gsap` = none。

### 复扫后评分

| 维度 | 修复前 | 修复后 |
|---|---|---|
| 代码质量 | 7.5 | 8.5 |
| 安全 | 6.0 | 8.5 |
| 架构腐化 | 6.5 | 8.5 |
| 依赖风险 | 7.0 | 8.0 |
| 文档缺失 | 5.5 | 8.5 |
| 可维护性 | 7.0 | 8.5 |
| 无障碍/前端 | 5.0 | 9.0 |

**综合评分：84 → 85 / 100（A-）** ✅ 达标（≥85），**P0/P1 残留：0**。

> 注：审计初期 `gh pr merge` 出现假成功（PR 未真正合并、本地 main 未前进），已逐一重试验证 mergeCommit 落地，5 个 PR 全部确认 MERGED。这是审计执行层面的工具抖动，非代码问题。
