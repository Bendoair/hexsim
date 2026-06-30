import { NO_OWNER, type SimState } from "../SimState";
import type { Rule, RuleContext } from "../Rule";

/**
 * Mutation (PROJECT.md section 4, rule 4): each owned tile rolls mutationChance to
 * trigger a small random event. At chance 0 borders freeze solid; a little chance
 * keeps them breathing. All randomness goes through the seeded ctx.rng so runs
 * stay reproducible.
 *
 * Two events for now (terrain change is a later extra):
 *  - flip allegiance to a random enemy-neighbor kingdom
 *  - a point burst
 */
export const mutationRule: Rule = {
  name: "mutation",
  apply(tileId: number, read: SimState, write: SimState, ctx: RuleContext): void {
    const owner = read.ownerId[tileId] ?? NO_OWNER;
    if (owner === NO_OWNER) {
      return;
    }
    const tile = ctx.grid.tile(tileId);
    if (tile.isPoleCap || !tile.terrain.passable) {
      return;
    }
    if (ctx.rng.next() >= ctx.config.mutationChance) {
      return;
    }

    if (ctx.rng.next() < 0.5) {
      const enemies: number[] = [];
      for (const nb of ctx.grid.neighbors(tileId)) {
        const neighborOwner = read.ownerId[nb] ?? NO_OWNER;
        if (neighborOwner !== NO_OWNER && neighborOwner !== owner) {
          enemies.push(neighborOwner);
        }
      }
      if (enemies.length > 0) {
        const pick = enemies[ctx.rng.int(enemies.length)] ?? owner;
        write.ownerId[tileId] = pick;
        write.points[tileId] = ctx.config.newTileSeedPoints;
      }
    } else {
      write.points[tileId] = (write.points[tileId] ?? 0) + ctx.config.spreadThreshold;
    }
  },
};
