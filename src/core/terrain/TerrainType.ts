import type { SimConfig } from "../../config/SimConfig";

/** Terrain ids line up 1:1 with the gain multipliers in SimConfig.terrain. */
export type TerrainId = keyof SimConfig["terrain"];

/**
 * TerrainType — a behavioral tag attached to a Tile by COMPOSITION (Tile has a
 * `terrain` field; we never subclass Tile). Terrain itself uses a small class
 * hierarchy, which is fine.
 *
 * The gain multiplier is NOT stored here: it lives in SimConfig.terrain (the
 * single source of tunables) and is looked up by id, so a slider can retune it
 * live without touching terrain code.
 */
export abstract class TerrainType {
  abstract readonly id: TerrainId;
  /** Whether a tile of this terrain can be owned / entered by a kingdom. */
  abstract readonly passable: boolean;

  /** Gain modifier for this terrain, read from config by id. */
  gainMod(config: SimConfig): number {
    return config.terrain[this.id];
  }
}
