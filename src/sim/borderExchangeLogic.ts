import type { SimConfig } from "../config/SimConfig";
import type { HexGrid } from "../core/HexGrid";
import type { Rng } from "../core/rng";
import { NO_OWNER, type SimState } from "./SimState";

export interface ExchangeOffer {
  readonly tilesToProposer: number;
  readonly tilesToReceiver: number;
}

export interface KingdomPairPressure {
  readonly kingdomA: number;
  readonly kingdomB: number;
  readonly sumA: number;
  readonly sumB: number;
  readonly frontierA: readonly number[];
  readonly frontierB: readonly number[];
}

/** All adjacent kingdom pairs with frontier tile lists and point sums. */
export function collectKingdomPairs(
  grid: HexGrid,
  state: SimState,
): KingdomPairPressure[] {
  const seen = new Set<string>();
  const pairs: KingdomPairPressure[] = [];

  for (const tile of grid.tiles) {
    if (tile.isPoleCap || !tile.terrain.passable) {
      continue;
    }
    const owner = state.ownerId[tile.id] ?? NO_OWNER;
    if (owner === NO_OWNER) {
      continue;
    }
    for (const nb of grid.neighbors(tile.id)) {
      const neighbor = grid.tile(nb);
      if (neighbor.isPoleCap || !neighbor.terrain.passable) {
        continue;
      }
      const neighborOwner = state.ownerId[nb] ?? NO_OWNER;
      if (neighborOwner === NO_OWNER || neighborOwner === owner) {
        continue;
      }
      const lo = Math.min(owner, neighborOwner);
      const hi = Math.max(owner, neighborOwner);
      const key = `${lo}:${hi}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const frontierA = frontierTiles(grid, state, lo, hi);
      const frontierB = frontierTiles(grid, state, hi, lo);
      pairs.push({
        kingdomA: lo,
        kingdomB: hi,
        sumA: sumPoints(state, frontierA),
        sumB: sumPoints(state, frontierB),
        frontierA,
        frontierB,
      });
    }
  }

  return pairs.sort((a, b) => a.kingdomA - b.kingdomA || a.kingdomB - b.kingdomB);
}

/** Tiles owned by `owner` that border at least one tile owned by `enemy`. */
export function frontierTiles(
  grid: HexGrid,
  state: SimState,
  owner: number,
  enemy: number,
): number[] {
  const result: number[] = [];
  for (const tile of grid.tiles) {
    if (tile.isPoleCap || !tile.terrain.passable) {
      continue;
    }
    if ((state.ownerId[tile.id] ?? NO_OWNER) !== owner) {
      continue;
    }
    for (const nb of grid.neighbors(tile.id)) {
      const neighbor = grid.tile(nb);
      if (neighbor.isPoleCap || !neighbor.terrain.passable) {
        continue;
      }
      if ((state.ownerId[nb] ?? NO_OWNER) === enemy) {
        result.push(tile.id);
        break;
      }
    }
  }
  return result.sort((a, b) => a - b);
}

export function buildOffer(advantage: number, config: SimConfig): ExchangeOffer {
  const range = config.exchangeMaxTiles - config.exchangeMinTiles;
  const t = clamp01((advantage - 1) / Math.max(config.exchangeForcedRatio - 1, 0.01));
  const tilesToProposer = Math.round(config.exchangeMinTiles + t * range);

  let tilesToReceiver = 0;
  if (advantage < config.exchangeOneWayRatio) {
    const swapT = clamp01(
      (config.exchangeOneWayRatio - advantage) / Math.max(config.exchangeOneWayRatio - 1, 0.01),
    );
    tilesToReceiver = Math.max(1, Math.round(swapT * 2));
    tilesToReceiver = Math.min(tilesToReceiver, Math.max(0, tilesToProposer - 1));
  }

  return {
    tilesToProposer: clamp(tilesToProposer, config.exchangeMinTiles, config.exchangeMaxTiles),
    tilesToReceiver,
  };
}

export function shouldAccept(advantage: number, config: SimConfig, rng: Rng): boolean {
  if (advantage >= config.exchangeForcedRatio) {
    return true;
  }
  const chance = clamp(
    config.exchangeBaseAcceptChance + config.exchangeAdvantageSlope * (advantage - 1),
    0,
    1,
  );
  return rng.next() < chance;
}

/**
 * Select up to `count` connected tiles owned by `fromOwner`, starting from the
 * weakest frontier tile facing `toOwner` and growing inward through `fromOwner`
 * territory (BFS). Prefer lowest points when breaking ties.
 */
export function selectTransferTiles(
  grid: HexGrid,
  state: SimState,
  fromOwner: number,
  toOwner: number,
  count: number,
  excluded: ReadonlySet<number> = new Set(),
): number[] {
  if (count <= 0) {
    return [];
  }

  const seeds = frontierTiles(grid, state, fromOwner, toOwner).filter((id) => !excluded.has(id));
  if (seeds.length === 0) {
    return [];
  }

  const start = pickWeakestTile(seeds, state);
  const selected = new Set<number>([start]);
  const queue = [start];

  while (selected.size < count && queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) {
      break;
    }
    const neighbors = grid
      .neighbors(current)
      .filter((nb) => {
        if (excluded.has(nb)) {
          return false;
        }
        const tile = grid.tile(nb);
        if (tile.isPoleCap || !tile.terrain.passable) {
          return false;
        }
        return (state.ownerId[nb] ?? NO_OWNER) === fromOwner && !selected.has(nb);
      })
      .sort((a, b) => compareWeakest(a, b, state));

    for (const nb of neighbors) {
      selected.add(nb);
      queue.push(nb);
      if (selected.size >= count) {
        break;
      }
    }
  }

  return [...selected].sort((a, b) => a - b).slice(0, count);
}

function pickWeakestTile(tileIds: readonly number[], state: SimState): number {
  const sorted = [...tileIds].sort((a, b) => compareWeakest(a, b, state));
  const first = sorted[0];
  if (first === undefined) {
    throw new Error("pickWeakestTile called with empty list");
  }
  return first;
}

function compareWeakest(a: number, b: number, state: SimState): number {
  const pa = state.points[a] ?? 0;
  const pb = state.points[b] ?? 0;
  if (pa !== pb) {
    return pa - pb;
  }
  return a - b;
}

export function proposerAndReceiver(
  pair: KingdomPairPressure,
): { proposer: number; receiver: number; proposerSum: number; receiverSum: number } {
  if (pair.sumA > pair.sumB) {
    return { proposer: pair.kingdomA, receiver: pair.kingdomB, proposerSum: pair.sumA, receiverSum: pair.sumB };
  }
  if (pair.sumB > pair.sumA) {
    return { proposer: pair.kingdomB, receiver: pair.kingdomA, proposerSum: pair.sumB, receiverSum: pair.sumA };
  }
  return { proposer: pair.kingdomA, receiver: pair.kingdomB, proposerSum: pair.sumA, receiverSum: pair.sumB };
}

function sumPoints(state: SimState, tileIds: readonly number[]): number {
  let total = 0;
  for (const id of tileIds) {
    total += state.points[id] ?? 0;
  }
  return total;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}
