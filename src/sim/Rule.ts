import type { SimConfig } from "../config/SimConfig";
import type { HexGrid } from "../core/HexGrid";
import type { World } from "../core/World";
import type { Rng } from "../core/rng";
import type { SimState } from "./SimState";

/**
 * RuleContext — everything a rule may read while applying. This bundles the
 * (grid, config, rng) from the spec plus the world (kingdom lookup) and a cached
 * capital-distance accessor that the accumulation falloff needs. See PROJECT.md
 * section 6.
 */
export interface RuleContext {
  readonly grid: HexGrid;
  readonly world: World;
  readonly config: SimConfig;
  readonly rng: Rng;
  /** Cached hex distance from a tile to a capital tile (-1 if unreachable). */
  distanceToCapital(tileId: number, capitalTileId: number): number;
}

/**
 * A single simulation rule. Reads the immutable `read` buffer (this tick's
 * snapshot) and writes deltas into `write`. Never read your own writes within a
 * tick. Rules run in the fixed order documented in PROJECT.md section 4.
 */
export interface Rule {
  readonly name: string;
  apply(tileId: number, read: SimState, write: SimState, ctx: RuleContext): void;
  /**
   * Optional pass that runs once after apply() has visited every tile this tick.
   * Used by rules whose outcome is global (e.g. spread contest resolution, where
   * the winner among rival attackers of one target can only be known after all
   * claims are collected).
   */
  finalize?(read: SimState, write: SimState, ctx: RuleContext): void;
}
