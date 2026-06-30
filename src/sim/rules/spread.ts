import { NO_OWNER, type SimState } from "../SimState";
import type { Rule, RuleContext } from "../Rule";

interface Claim {
  attacker: number;
  strength: number;
}

/**
 * Spread (PROJECT.md section 4, rule 3) with the resolved Open Questions:
 *  - Sea is a HARD WALL: impassable tiles are never spreadable neighbors (Q#2).
 *  - Conflicts resolve by CONTEST: when several tiles target the same neighbor in
 *    one tick, the attacker with the most points wins; ties break on lowest tile
 *    id for determinism (Q#1).
 *
 * A source tile may convert one eligible neighbor if its points (from the read
 * snapshot) reach spreadThreshold. Eligible = unowned land, or an enemy tile with
 * fewer points than the attacker. Only the winning attacker pays spreadCost; the
 * converted tile starts at newTileSeedPoints.
 *
 * Implemented as a factory so each Simulation gets its own claim scratch (no
 * shared mutable singleton state).
 */
export function createSpreadRule(): Rule {
  let claims = new Map<number, Claim>();

  return {
    name: "spread",

    apply(tileId: number, read: SimState, _write: SimState, ctx: RuleContext): void {
      const owner = read.ownerId[tileId] ?? NO_OWNER;
      if (owner === NO_OWNER) {
        return;
      }
      const strength = read.points[tileId] ?? 0;
      if (strength < ctx.config.spreadThreshold) {
        return;
      }
      const tile = ctx.grid.tile(tileId);
      if (tile.isPoleCap || !tile.terrain.passable) {
        return;
      }

      let bestTarget = -1;
      let bestTargetPoints = Number.POSITIVE_INFINITY;
      for (const nb of ctx.grid.neighbors(tileId)) {
        const neighbor = ctx.grid.tile(nb);
        if (neighbor.isPoleCap || !neighbor.terrain.passable) {
          continue; // pole caps excluded; sea is a hard wall
        }
        const neighborOwner = read.ownerId[nb] ?? NO_OWNER;
        const neighborPoints = read.points[nb] ?? 0;
        const eligible =
          neighborOwner === NO_OWNER || (neighborOwner !== owner && neighborPoints < strength);
        if (!eligible) {
          continue;
        }
        if (
          neighborPoints < bestTargetPoints ||
          (neighborPoints === bestTargetPoints && nb < bestTarget)
        ) {
          bestTargetPoints = neighborPoints;
          bestTarget = nb;
        }
      }
      if (bestTarget < 0) {
        return;
      }

      const existing = claims.get(bestTarget);
      if (
        existing === undefined ||
        strength > existing.strength ||
        (strength === existing.strength && tileId < existing.attacker)
      ) {
        claims.set(bestTarget, { attacker: tileId, strength });
      }
    },

    finalize(read: SimState, write: SimState, ctx: RuleContext): void {
      for (const [target, claim] of claims) {
        const attackerOwner = read.ownerId[claim.attacker] ?? NO_OWNER;
        if (attackerOwner === NO_OWNER) {
          continue;
        }
        write.ownerId[target] = attackerOwner;
        write.points[target] = ctx.config.newTileSeedPoints;
        write.points[claim.attacker] = (write.points[claim.attacker] ?? 0) - ctx.config.spreadCost;
      }
      claims = new Map();
    },
  };
}
