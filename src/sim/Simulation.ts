import type { World } from "../core/World";
import type { HexGrid } from "../core/HexGrid";
import { createRng, type Rng } from "../core/rng";
import { NO_OWNER, cloneState, createState, type SimState } from "./SimState";
import type { Rule, RuleContext } from "./Rule";
import type { SimEvent } from "./SimEvent";

/**
 * Caches BFS distances from each capital tile. Distances depend only on terrain
 * topology, which is static within a run for now, so results are memoized and
 * only cleared if terrain changes (a future feature).
 */
class DistanceCache {
  private readonly cache = new Map<number, number[]>();
  constructor(private readonly grid: HexGrid) {}

  to(tileId: number, capitalTileId: number): number {
    let dist = this.cache.get(capitalTileId);
    if (dist === undefined) {
      dist = this.grid.distancesFrom(capitalTileId);
      this.cache.set(capitalTileId, dist);
    }
    return dist[tileId] ?? -1;
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Simulation — owns the tick loop, the double buffer and the seeded RNG.
 *
 * step() snapshots the current tile state into an immutable read buffer, clones
 * it into a write buffer, runs every rule (in order) over every tile reading the
 * snapshot and writing deltas, then commits the write buffer back onto the tiles.
 * The render layer reads the committed tiles. Cardinal rule: a rule never reads
 * its own writes within a tick.
 */
export class Simulation {
  tick = 0;
  /** Events recorded during the most recent step (read-only snapshot). */
  events: ReadonlyArray<SimEvent> = [];
  private readonly world: World;
  private readonly grid: HexGrid;
  private readonly rules: ReadonlyArray<Rule>;
  private readonly distances: DistanceCache;
  private rng: Rng;
  private readonly eventsBuffer: SimEvent[] = [];
  private readonly ctx: RuleContext;

  constructor(world: World, rules: ReadonlyArray<Rule>) {
    this.world = world;
    this.grid = world.grid;
    this.rules = rules;
    this.distances = new DistanceCache(this.grid);
    this.rng = createRng(world.config.seed);
    const self = this;
    this.ctx = {
      grid: this.grid,
      world: this.world,
      config: this.world.config,
      rng: { next: () => this.rng.next(), int: (m) => this.rng.int(m) },
      get tick() {
        return self.tick;
      },
      distanceToCapital: (tileId, capitalTileId) => this.distances.to(tileId, capitalTileId),
      recordEvent: (event) => {
        self.eventsBuffer.push(event);
      },
    };
  }

  /** Advance exactly one discrete tick. */
  step(): void {
    this.eventsBuffer.length = 0;
    const read = this.readFromTiles();
    const write = cloneState(read);

    for (const rule of this.rules) {
      for (const tile of this.grid.tiles) {
        rule.apply(tile.id, read, write, this.ctx);
      }
      rule.finalize?.(read, write, this.ctx);
    }

    this.commit(write);
    this.events = [...this.eventsBuffer];
    this.tick += 1;
  }

  /** Clear accumulated points and reset tick + RNG; keeps terrain and capitals. */
  reset(): void {
    for (const tile of this.grid.tiles) {
      tile.points = 0;
    }
    this.tick = 0;
    this.events = [];
    this.eventsBuffer.length = 0;
    this.rng = createRng(this.world.config.seed);
  }

  /** Terrain changed: drop cached capital distances so they recompute. */
  invalidateDistances(): void {
    this.distances.clear();
  }

  private readFromTiles(): SimState {
    const state = createState(this.grid.tiles.length);
    for (const tile of this.grid.tiles) {
      state.ownerId[tile.id] = tile.ownerId ?? NO_OWNER;
      state.points[tile.id] = tile.points;
    }
    return state;
  }

  private commit(state: SimState): void {
    for (const tile of this.grid.tiles) {
      const owner = state.ownerId[tile.id] ?? NO_OWNER;
      const previousOwner = tile.ownerId;
      const nextOwner = owner === NO_OWNER ? null : owner;
      if (nextOwner !== previousOwner) {
        if (previousOwner !== null) {
          this.world.kingdomById(previousOwner)?.ownedTileIds.delete(tile.id);
        }
        if (nextOwner !== null) {
          this.world.kingdomById(nextOwner)?.ownedTileIds.add(tile.id);
        }
        tile.ownerId = nextOwner;
      }
      tile.points = state.points[tile.id] ?? 0;
    }
  }
}
