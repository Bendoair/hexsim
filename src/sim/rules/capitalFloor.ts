import { NO_OWNER, type SimState } from "../SimState";
import type { Rule, RuleContext } from "../Rule";

/**
 * Capital floor: a capital tile can never end a tick below config.capitalMinPoints.
 *
 * Runs LAST so it clamps the result of accumulation, hostility drain, spread and
 * mutation — a capital that would otherwise be starved or drained to zero is kept
 * at the floor, so a kingdom always has a strong, durable heart.
 */
export const capitalFloorRule: Rule = {
  name: "capitalFloor",
  apply(tileId: number, read: SimState, write: SimState, ctx: RuleContext): void {
    if ((read.ownerId[tileId] ?? NO_OWNER) === NO_OWNER) {
      return;
    }
    if (ctx.grid.tile(tileId).feature?.kind !== "capital") {
      return;
    }
    const floor = ctx.config.capitalMinPoints;
    if ((write.points[tileId] ?? 0) < floor) {
      write.points[tileId] = floor;
    }
  },
};
