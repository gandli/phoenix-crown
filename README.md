# 字符帘幕凤冠 · Phoenix Crown

汉字帘幕凤冠可视化站点 —— 对标 [`aigc17/Chinese-PhoenixCrown`](https://github.com/aigc17/Chinese-PhoenixCrown) 的混合栈重构。

## 技术栈

| 层 | 实现 |
|---|---|
| 布局 | **pretext**（`measureLineStats` 在浏览器运行时测量真实 CJK 字宽，据此定列距，而非固定栅格）|
| 渲染 | Canvas atlas 图集（`drawImage` stamp，避免每帧 `fillText` 瓶颈）|
| 物理 / 动效 | 原项目 verlet 链：掉落淡入（reveal）、idle breeze 微风、鼠标拨开、松手回弹（home 弹簧）|
| 拼接 | 采样凤冠 PNG 的真实 alpha 轮廓，帘幕沿冠形垂挂 |
| 框架 | Vite + React 19 + TypeScript |
| 部署 | Cloudflare（`@cloudflare/vite-plugin` 自动产出 `wrangler.json`）|

## 开发

```bash
bun install
bun run dev        # http://localhost:5173
bun run build      # 产出 dist/，含 wrangler.json
```

> 字体使用具名 `'Songti SC', 'Noto Serif SC', serif`。macOS 上 pretext 测量依赖真实字体，
> 缺失时回退到固定 `COL_SPACING = 8.5` 栅格。

## 目录

```
src/
  components/
    TextCurtain.tsx     # 帘幕核心：pretext 测宽 + verlet + Canvas
    DestinationScene.tsx# 单冠场景：帘幕 + 冠图 + 文案
    GalleryView.tsx     # 集藏视图
    SiteHeader.tsx      # 页头
  lib/
    destinations.ts     # 七顶冠数据（文案 / charPool / 配色 / 冠型）
    crown-art.ts        # 凤冠 PNG 资源映射
public/crowns/          # 凤冠图（对齐原项目，已获授权）
```

## 对齐说明

文案、`charPool`、凤冠图资源来自对标项目（已获授权用于本仓库发布）。
帘幕的**布局引擎（pretext）** 与**交互物理**为本仓库重构实现，视觉/动效对齐原项目。

## 自动 Changelog

每次 push 到 `main`，GitHub Actions（`.github/workflows/changelog.yml`）
会将本次包含的 commits 追加进 `CHANGELOG.md`。
