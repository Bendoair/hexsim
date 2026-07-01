import { NO_OWNER, type SimState } from "../SimState";
import type { Rule, RuleContext } from "../Rule";
import {
  buildOffer,
  collectKingdomPairs,
  proposerAndReceiver,
  selectTransferTiles,
  shouldAccept,
} from "../borderExchangeLogic";

/**
 * Border exchange — when combined frontier pressure between two adjacent
 * kingdoms exceeds a threshold, the stronger side proposes a bulk tile deal.
 * Huge point gaps force acceptance; moderate gaps roll for acceptance.
 */
export function createBorderExchangeRule(): Rule {
  return {
    name: "borderExchange",

    apply(): void {
      // Global pair scan runs in finalize after all tiles have accumulated.
    },

    finalize(_read: SimState, write: SimState, ctx: RuleContext): void {
      const pairs = collectKingdomPairs(ctx.grid, write);

      for (const pair of pairs) {
        const pressure = pair.sumA + pair.sumB;
        if (pressure < ctx.config.exchangeFrontierSumThreshold) {
          continue;
        }

        const { proposer, receiver, proposerSum, receiverSum } = proposerAndReceiver(pair);
        const advantage = proposerSum / Math.max(receiverSum, 1);
        const forced = advantage >= ctx.config.exchangeForcedRatio;

        if (!shouldAccept(advantage, ctx.config, ctx.rng)) {
          continue;
        }

        const offer = buildOffer(advantage, ctx.config);
        const excluded = new Set<number>();

        const toProposer = selectTransferTiles(
          ctx.grid,
          write,
          receiver,
          proposer,
          offer.tilesToProposer,
          excluded,
        );
        if (toProposer.length < ctx.config.exchangeMinTiles) {
          continue;
        }

        let toReceiver: number[] = [];
        if (offer.tilesToReceiver > 0) {
          for (const id of toProposer) {
            excluded.add(id);
          }
          toReceiver = selectTransferTiles(
            ctx.grid,
            write,
            proposer,
            receiver,
            offer.tilesToReceiver,
            excluded,
          );
        }

        for (const id of toProposer) {
          write.ownerId[id] = proposer;
          write.points[id] = ctx.config.newTileSeedPoints;
        }
        for (const id of toReceiver) {
          write.ownerId[id] = receiver;
          write.points[id] = ctx.config.newTileSeedPoints;
        }

        deductFrontierCost(ctx, write, proposer, receiver, ctx.config.exchangePointCost);

        ctx.recordEvent({
          kind: "borderExchange",
          tick: ctx.tick,
          proposerId: proposer,
          receiverId: receiver,
          tilesToProposer: toProposer.length,
          tilesToReceiver: toReceiver.length,
          forced,
        });
      }
    },
  };
}

function deductFrontierCost(
  ctx: RuleContext,
  write: SimState,
  proposer: number,
  receiver: number,
  cost: number,
): void {
  if (cost <= 0) {
    return;
  }
  const frontier = collectFrontierIds(ctx, write, proposer, receiver);
  const sorted = [...frontier].sort((a, b) => {
    const pa = write.points[a] ?? 0;
    const pb = write.points[b] ?? 0;
    if (pa !== pb) {
      return pb - pa;
    }
    return a - b;
  });
  let remaining = cost;
  for (const id of sorted) {
    if (remaining <= 0) {
      break;
    }
    const current = write.points[id] ?? 0;
    const take = Math.min(current, remaining);
    write.points[id] = current - take;
    remaining -= take;
  }
}

function collectFrontierIds(
  ctx: RuleContext,
  state: SimState,
  owner: number,
  enemy: number,
): number[] {
  const result: number[] = [];
  for (const tile of ctx.grid.tiles) {
    if (tile.isPoleCap || !tile.terrain.passable) {
      continue;
    }
    if ((state.ownerId[tile.id] ?? NO_OWNER) !== owner) {
      continue;
    }
    for (const nb of ctx.grid.neighbors(tile.id)) {
      const neighbor = ctx.grid.tile(nb);
      if (neighbor.isPoleCap || !neighbor.terrain.passable) {
        continue;
      }
      if ((state.ownerId[nb] ?? NO_OWNER) === enemy) {
        result.push(tile.id);
        break;
      }
    }
  }
  return result;
}
