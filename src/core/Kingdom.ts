/** Plain RGB (0..1) so core/ stays Babylon-free; render uses it directly. */
export interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/**
 * Distinct, reasonably colorblind-friendly kingdom colors, assigned in order as
 * capitals are placed. Plain data — not Babylon Color3 — so it lives in core/.
 */
export const KINGDOM_PALETTE: ReadonlyArray<RgbColor> = [
  { r: 0.9, g: 0.25, b: 0.21 }, // red
  { r: 0.2, g: 0.5, b: 0.92 }, // blue
  { r: 0.95, g: 0.77, b: 0.06 }, // yellow
  { r: 0.4, g: 0.78, b: 0.35 }, // green
  { r: 0.6, g: 0.32, b: 0.78 }, // purple
  { r: 0.95, g: 0.55, b: 0.13 }, // orange
  { r: 0.18, g: 0.74, b: 0.72 }, // teal
  { r: 0.92, g: 0.45, b: 0.7 }, // pink
];

export class Kingdom {
  readonly id: number;
  readonly color: RgbColor;
  readonly capitalTileId: number;
  readonly ownedTileIds: Set<number>;

  constructor(id: number, color: RgbColor, capitalTileId: number) {
    this.id = id;
    this.color = color;
    this.capitalTileId = capitalTileId;
    this.ownedTileIds = new Set<number>([capitalTileId]);
  }
}
