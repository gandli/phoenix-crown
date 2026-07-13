// Crown art resolution — uses the real PNG assets cloned from
// aigc17/Chinese-PhoenixCrown (local dev testing). Maps each `CrownArt` key
// to its file under /public/crowns.

import type { CrownArt } from "./destinations";

// art key -> original filename in public/crowns
const FILES: Record<CrownArt, string> = {
  fengguan: "crown-fengguan.png",
  xifeng: "crown-opera.png",
  cuiyu: "crown-jade.png",
  bingluan: "crown-ice.png",
  jinluan: "crown-gold.png",
  jinzan: "crown-bridal.png",
  fenghou: "crown-empress.png",
};

export function crownSvg(_art: CrownArt): string {
  // retained for API compatibility; real rendering uses crownDataUri (PNG)
  return "";
}

export function crownDataUri(art: CrownArt): string {
  return `/crowns/${FILES[art]}`;
}
