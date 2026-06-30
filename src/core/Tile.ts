/**
 * Tile — the atomic unit of the world.
 *
 * Composition-first: terrain and features are attached as separate fields (added
 * in later build steps), never via subclassing. A tile's `id` is its stable
 * identity for the whole run; it currently equals its render `faceIndex` (the
 * authoritative faceIndex <-> tileId map is the identity map — see GlobeMesh).
 *
 * Pure data: no Babylon, no DOM. Lives under core/.
 */
import type { TerrainType } from "./terrain/TerrainType";
import type { Feature } from "./features/Feature";

export interface Tile {
  /** Stable identity for the lifetime of the world. Index into HexGrid.tiles. */
  readonly id: number;
  /** Index of the Goldberg face this tile is rendered as. */
  readonly faceIndex: number;
  /** True for the 12 pentagons. Excluded from the simulation. */
  readonly isPoleCap: boolean;
  /** Owning kingdom id, or null if unowned. */
  ownerId: number | null;
  /** Accumulated points (drives spread). */
  points: number;
  /** Terrain attached by composition; mutable so it can change at runtime. */
  terrain: TerrainType;
  /** Optional overlay (capital, settlement, ...) attached by composition. */
  feature: Feature | null;
}
