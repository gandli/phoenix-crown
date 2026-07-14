import { describe, it, expect } from "vitest";
import { crownDataUri } from "./crown-art";
import type { CrownArt } from "./destinations";

const CASES: Array<[CrownArt, string]> = [
  ["fengguan", "/crowns/crown-fengguan.png"],
  ["xifeng", "/crowns/crown-opera.png"],
  ["cuiyu", "/crowns/crown-jade.png"],
  ["bingluan", "/crowns/crown-ice.png"],
  ["jinluan", "/crowns/crown-gold.png"],
  ["jinzan", "/crowns/crown-bridal.png"],
  ["fenghou", "/crowns/crown-empress.png"],
];

describe("crownDataUri", () => {
  it.each(CASES)("maps %s -> %s", (art, expected) => {
    expect(crownDataUri(art)).toBe(expected);
  });
});
