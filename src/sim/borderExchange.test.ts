import { describe, expect, it } from "vitest";
import { HexGrid, type GlobeTopology } from "../core/HexGrid";
import { World } from "../core/World";
import { Simulation } from "./Simulation";
import { accumulationRule } from "./rules/accumulation";
import { hostilityRule } from "./rules/hostility";
import { createSpreadRule } from "./rules/spread";
import { createBorderExchangeRule } from "./rules/borderExchange";
import { DEFAULT_CONFIG, type SimConfig } from "../config/SimConfig";
import {
  buildOffer,
  collectKingdomPairs,
  frontierTiles,
  shouldAccept,
} from "./borderExchangeLogic";
import { createRng } from "../core/rng";

function lineTopology(n: number): GlobeTopology {
  const adjacency: number[][] = [];
  for (let i = 0; i < n; i++) {
    const neighbors: number[] = [];
    if (i > 0) neighbors.push(i - 1);
    if (i < n - 1) neighbors.push(i + 1);
    adjacency.push(neighbors);
  }
  return { faceCount: n, adjacency, isPentagon: new Array<boolean>(n).fill(false) };
}

function lineWorld(n: number, configOverrides: Partial<SimConfig> = {}): World {
  const config: SimConfig = {
    ...DEFAULT_CONFIG,
    ...configOverrides,
    world: { ...DEFAULT_CONFIG.world, seaFraction: 0, ...configOverrides.world },
  };
  return new World(new HexGrid(lineTopology(n)), config);
}

function exchangeRules() {
  return [accumulationRule, hostilityRule, createSpreadRule(), createBorderExchangeRule()];
}

function makeSim(world: World): Simulation {
  return new Simulation(world, exchangeRules());
}

function seedSplitLine(world: World, lastTileKingdom0: number): void {
  world.addCapital(0);
  world.addCapital(world.grid.tileCount - 1);
  for (let i = 0; i < world.grid.tileCount; i++) {
    const owner = i <= lastTileKingdom0 ? 0 : 1;
    const tile = world.grid.tile(i);
    tile.ownerId = owner;
    world.kingdoms[owner]?.ownedTileIds.add(i);
  }
}

describe("borderExchangeLogic", () => {
  it("buildOffer scales X with advantage and drops Y for one-way ratios", () => {
    const low = buildOffer(1.2, DEFAULT_CONFIG);
    expect(low.tilesToProposer).toBeGreaterThanOrEqual(DEFAULT_CONFIG.exchangeMinTiles);
    expect(low.tilesToReceiver).toBeGreaterThan(0);

    const high = buildOffer(3, DEFAULT_CONFIG);
    expect(high.tilesToProposer).toBeGreaterThanOrEqual(low.tilesToProposer);
    expect(high.tilesToReceiver).toBe(0);
  });

  it("shouldAccept is always true when advantage exceeds forced ratio", () => {
    const rng = createRng(99);
    expect(shouldAccept(DEFAULT_CONFIG.exchangeForcedRatio, DEFAULT_CONFIG, rng)).toBe(true);
  });
});

describe("border exchange rule", () => {
  it("lets frontier tiles accumulate when hostility defaults are zero", () => {
    const world = lineWorld(11);
    seedSplitLine(world, 4);
    const sim = makeSim(world);
    for (let t = 0; t < 20; t++) sim.step();
    const borderTile = world.grid.tile(4);
    expect(borderTile.ownerId).toBe(0);
    expect(borderTile.points).toBeGreaterThan(0);
  });

  it("executes a forced one-way exchange when frontier pressure is high", () => {
    const world = lineWorld(11, {
      spreadThreshold: 1000,
      exchangeFrontierSumThreshold: 30,
      exchangeForcedRatio: 1.5,
      exchangeMinTiles: 2,
      exchangeMaxTiles: 4,
      exchangeOneWayRatio: 1.2,
      mutationChance: 0,
    });
    seedSplitLine(world, 4);
    world.grid.tile(4).points = 80;
    world.grid.tile(5).points = 5;
    world.grid.tile(6).points = 5;

    const ownedBefore = world.kingdoms[0]?.ownedTileIds.size ?? 0;
    const sim = makeSim(world);
    sim.step();

    const ownedAfter = world.kingdoms[0]?.ownedTileIds.size ?? 0;
    expect(ownedAfter).toBeGreaterThan(ownedBefore);
    expect(sim.events.some((e) => e.kind === "borderExchange")).toBe(true);
    const event = sim.events.find((e) => e.kind === "borderExchange");
    expect(event?.kind).toBe("borderExchange");
    if (event?.kind === "borderExchange") {
      expect(event.forced).toBe(true);
      expect(event.tilesToProposer).toBeGreaterThanOrEqual(2);
      expect(event.tilesToReceiver).toBe(0);
    }
  });

  it("can execute a mutual swap when advantage is moderate", () => {
    const world = lineWorld(11, {
      spreadThreshold: 1000,
      exchangeFrontierSumThreshold: 20,
      exchangeForcedRatio: 5,
      exchangeOneWayRatio: 2.5,
      exchangeBaseAcceptChance: 1,
      exchangeMinTiles: 2,
      exchangeMaxTiles: 3,
      mutationChance: 0,
      seed: 42,
    });
    seedSplitLine(world, 4);
    world.grid.tile(4).points = 25;
    world.grid.tile(5).points = 20;

    const sim = makeSim(world);
    sim.step();

    const event = sim.events.find((e) => e.kind === "borderExchange");
    expect(event).toBeDefined();
    if (event?.kind === "borderExchange") {
      expect(event.tilesToProposer).toBeGreaterThan(0);
      expect(event.tilesToReceiver).toBeGreaterThan(0);
      expect(event.forced).toBe(false);
    }
  });

  it("is deterministic for the same seed and setup", () => {
    const run = (): string => {
      const world = lineWorld(15, {
        exchangeFrontierSumThreshold: 25,
        exchangeForcedRatio: 2,
        mutationChance: 0,
        seed: 7,
      });
      world.addCapital(0);
      world.addCapital(14);
      const sim = makeSim(world);
      for (let t = 0; t < 80; t++) sim.step();
      return world.grid.tiles.map((t) => `${t.ownerId ?? "-"}:${t.points.toFixed(2)}`).join("|");
    };
    expect(run()).toBe(run());
  });

  it("records border exchange events with tile counts", () => {
    const world = lineWorld(9, {
      spreadThreshold: 1000,
      exchangeFrontierSumThreshold: 20,
      exchangeForcedRatio: 1.2,
      exchangeMinTiles: 2,
      mutationChance: 0,
    });
    seedSplitLine(world, 3);
    world.grid.tile(3).points = 50;
    world.grid.tile(4).points = 10;

    const sim = makeSim(world);
    sim.step();
    const evt = sim.events.find((e) => e.kind === "borderExchange");
    expect(evt?.kind).toBe("borderExchange");
    if (evt?.kind === "borderExchange") {
      expect(evt.proposerId).toBe(0);
      expect(evt.receiverId).toBe(1);
      expect(evt.tilesToProposer).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("frontier helpers", () => {
  it("collects kingdom pairs and frontier tiles on a line border", () => {
    const world = lineWorld(5);
    seedSplitLine(world, 2);
    const state = {
      ownerId: new Int32Array(world.grid.tileCount),
      points: new Float64Array(world.grid.tileCount),
    };
    for (const tile of world.grid.tiles) {
      state.ownerId[tile.id] = tile.ownerId ?? -1;
      state.points[tile.id] = tile.points;
    }
    const pairs = collectKingdomPairs(world.grid, state);
    expect(pairs).toHaveLength(1);
    const frontier = frontierTiles(world.grid, state, 0, 1);
    expect(frontier).toContain(2);
  });
});
