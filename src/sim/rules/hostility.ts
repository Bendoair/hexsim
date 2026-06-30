import { NO_OWNER, type SimState } from "../SimState";
import type { Rule, RuleContext } from "../Rule";

/**
 * Hostility drain (PROJECT.md section 4, rule 2): for each neighbor owned by a
 * DIFFERENT kingdom, subtract hostilityCost, capped at maxHostility per tile per
 * tick. This is what keeps contested frontiers from ever clearing the spread
 * threshold, so borders between kingdoms stabilize.
 */
export const hostilityRule: Rule = {
  name: "hostility",
  apply(tileId: number, read: SimState, write: SimState, ctx: RuleContext): void {
    const owner = read.ownerId[tileId] ?? NO_OWNER;
    if (owner === NO_OWNER) {
      return;
    }
    const tile = ctx.grid.tile(tileId);
    if (tile.isPoleCap || !tile.terrain.passable) {
      return;
    }

    let enemies = 0;
    for (const nb of ctx.grid.neighbors(tileId)) {
      const neighborOwner = read.ownerId[nb] ?? NO_OWNER;
      if (neighborOwner !== NO_OWNER && neighborOwner !== owner) {
        enemies += 1;
      }
    }
    if (enemies === 0) {
      return;
    }

    const drain = Math.min(ctx.config.hostilityCost * enemies, ctx.config.maxHostility);
    write.points[tileId] = (write.points[tileId] ?? 0) - drain;
  },
};
