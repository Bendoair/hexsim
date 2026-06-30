import { NO_OWNER, type SimState } from "../SimState";
import type { Rule, RuleContext } from "../Rule";

/**
 * Accumulation (PROJECT.md section 4, rule 1):
 *   points += baseGain * terrainMod * distanceFalloff
 *   distanceFalloff = 1 / (1 + k * hexDistanceToCapital)
 *
 * Far frontier tiles gain less, which is what eventually starves expansion and
 * produces the equilibrium. Unowned, pole-cap and impassable tiles gain nothing.
 */
export const accumulationRule: Rule = {
  name: "accumulation",
  apply(tileId: number, read: SimState, write: SimState, ctx: RuleContext): void {
    const owner = read.ownerId[tileId] ?? NO_OWNER;
    if (owner === NO_OWNER) {
      return;
    }
    const tile = ctx.grid.tile(tileId);
    if (tile.isPoleCap || !tile.terrain.passable) {
      return;
    }
    const kingdom = ctx.world.kingdomById(owner);
    if (kingdom === undefined) {
      return;
    }

    const dist = ctx.distanceToCapital(tileId, kingdom.capitalTileId);
    const effectiveDist = dist < 0 ? Number.POSITIVE_INFINITY : dist;
    const falloff = 1 / (1 + ctx.config.distanceK * effectiveDist);
    const terrainMod = tile.terrain.gainMod(ctx.config);

    let gain = ctx.config.baseGain * terrainMod * falloff;
    if (tile.feature?.kind === "settlement") {
      gain += ctx.config.settlementBonus;
    }
    write.points[tileId] = (write.points[tileId] ?? 0) + gain;
  },
};
