import type { SimConfig } from "../config/SimConfig";
import { HexGrid } from "./HexGrid";
import { Kingdom, KINGDOM_PALETTE } from "./Kingdom";
import { Capital } from "./features/Capital";
import { Settlement } from "./features/Settlement";
import { createRng } from "./rng";
import { FARMLAND, GRASS, MOUNTAIN, RIVER, SEA } from "./terrain/terrains";

/** Why an addCapital attempt failed (for UI/console feedback). */
export type AddCapitalResult =
  | { ok: true; kingdom: Kingdom }
  | { ok: false; reason: "cap-reached" | "pole-cap" | "not-land" | "occupied" };

/** Result of trying to found a settlement on an owned tile. */
export type AddSettlementResult =
  | { ok: true }
  | { ok: false; reason: "not-owned" | "has-feature" };

/**
 * World — top-level container for the simulation state: the grid (tiles +
 * adjacency) plus terrain layout (and, in later steps, kingdoms). Pure data and
 * logic, no Babylon. The render layer reads this and never writes to it.
 */
export class World {
  readonly grid: HexGrid;
  readonly config: SimConfig;
  readonly kingdoms: Kingdom[] = [];

  constructor(grid: HexGrid, config: SimConfig) {
    this.grid = grid;
    this.config = config;
    this.generateTerrain();
  }

  kingdomById(id: number): Kingdom | undefined {
    return this.kingdoms[id];
  }

  /**
   * Place a capital on a tile, founding a new kingdom. Enforces Open Q#3: capped
   * at config.maxCapitals, land only, one owner per tile. Returns a tagged
   * result so the caller can report why a click did nothing.
   */
  addCapital(tileId: number): AddCapitalResult {
    if (this.kingdoms.length >= this.config.maxCapitals) {
      return { ok: false, reason: "cap-reached" };
    }
    const tile = this.grid.tile(tileId);
    if (tile.isPoleCap) {
      return { ok: false, reason: "pole-cap" };
    }
    if (!tile.terrain.passable) {
      return { ok: false, reason: "not-land" };
    }
    if (tile.ownerId !== null) {
      return { ok: false, reason: "occupied" };
    }

    const id = this.kingdoms.length;
    const color = KINGDOM_PALETTE[id % KINGDOM_PALETTE.length] ?? { r: 1, g: 1, b: 1 };
    const kingdom = new Kingdom(id, color, tileId);
    tile.ownerId = id;
    tile.feature = new Capital(id);
    this.kingdoms.push(kingdom);
    return { ok: true, kingdom };
  }

  /** Found a settlement (a secondary gain source) on an already-owned tile. */
  addSettlement(tileId: number): AddSettlementResult {
    const tile = this.grid.tile(tileId);
    if (tile.ownerId === null) {
      return { ok: false, reason: "not-owned" };
    }
    if (tile.feature !== null) {
      return { ok: false, reason: "has-feature" };
    }
    tile.feature = new Settlement(tile.ownerId);
    return { ok: true };
  }

  /**
   * Seeded land/sea layout via graph region-growth: drop a few ocean seeds, then
   * randomly flood outward across active-neighbor edges until the target sea
   * fraction is met. Uses only adjacency (no positions), so it stays engine-free
   * and produces blobby continents rather than salt-and-pepper noise.
   */
  private generateTerrain(): void {
    const rng = createRng(this.config.seed);
    const landIds = this.grid.tiles.filter((t) => !t.isPoleCap).map((t) => t.id);
    const targetSea = Math.floor(landIds.length * clamp01(this.config.world.seaFraction));

    const sea = new Set<number>();
    const frontier: number[] = [];

    const seedCount = Math.max(1, Math.floor(this.config.world.oceanSeeds));
    for (let i = 0; i < seedCount && sea.size < targetSea; i++) {
      const id = landIds[rng.int(landIds.length)];
      if (id !== undefined && !sea.has(id)) {
        sea.add(id);
        frontier.push(id);
      }
    }

    while (sea.size < targetSea && frontier.length > 0) {
      const fi = rng.int(frontier.length);
      const current = frontier[fi];
      if (current === undefined) {
        break;
      }
      const candidates = this.grid.activeNeighbors(current).filter((n) => !sea.has(n));
      if (candidates.length === 0) {
        frontier.splice(fi, 1);
        continue;
      }
      const pick = candidates[rng.int(candidates.length)];
      if (pick !== undefined) {
        sea.add(pick);
        frontier.push(pick);
      }
    }

    const farmlandFraction = clamp01(this.config.world.farmlandFraction);
    const mountainFraction = clamp01(this.config.world.mountainFraction);
    for (const tile of this.grid.tiles) {
      if (tile.isPoleCap) {
        continue;
      }
      if (sea.has(tile.id)) {
        tile.terrain = SEA;
        continue;
      }
      // Sprinkle terrain variety onto land. Mountain takes precedence over farmland.
      const roll = rng.next();
      if (roll < mountainFraction) {
        tile.terrain = MOUNTAIN;
      } else if (roll < mountainFraction + farmlandFraction) {
        tile.terrain = FARMLAND;
      } else {
        tile.terrain = GRASS;
      }
    }

    // Rivers: seed along coasts (land tiles touching sea). Tile-based, so they
    // just carry the river gain mod; adjacency is unchanged.
    const riverChance = clamp01(this.config.world.riverChance);
    for (const tile of this.grid.tiles) {
      if (tile.isPoleCap || sea.has(tile.id)) {
        continue;
      }
      const coastal = this.grid.neighbors(tile.id).some((n) => sea.has(n));
      if (coastal && rng.next() < riverChance) {
        tile.terrain = RIVER;
      }
    }
  }

  get seaTileCount(): number {
    return this.grid.tiles.reduce((acc, t) => acc + (t.terrain === SEA ? 1 : 0), 0);
  }

  get landTileCount(): number {
    return this.grid.tiles.reduce(
      (acc, t) => acc + (!t.isPoleCap && t.terrain.passable ? 1 : 0),
      0,
    );
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
