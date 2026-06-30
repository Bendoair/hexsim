import { describe, expect, it } from "vitest";
import { HexGrid, type GlobeTopology } from "../core/HexGrid";
import { World } from "../core/World";
import { Simulation } from "./Simulation";
import { accumulationRule } from "./rules/accumulation";
import { DEFAULT_CONFIG, type SimConfig } from "../config/SimConfig";
import { FARMLAND, MOUNTAIN } from "../core/terrain/terrains";

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

function bareWorld(overrides: Partial<SimConfig> = {}): World {
  const config: SimConfig = {
    ...DEFAULT_CONFIG,
    world: { ...DEFAULT_CONFIG.world, seaFraction: 0, farmlandFraction: 0, mountainFraction: 0 },
    ...overrides,
  };
  return new World(new HexGrid(lineTopology(6)), config);
}

describe("terrain gain mods", () => {
  it("farmland accumulates faster than grass; mountain slower", () => {
    const world = bareWorld();
    world.addCapital(0);
    // Own three same-distance tiles with different terrain (all at distance 1).
    for (const id of [1, 2, 3]) {
      world.grid.tile(id).ownerId = 0;
      world.kingdoms[0]?.ownedTileIds.add(id);
    }
    world.grid.tile(2).terrain = FARMLAND;
    world.grid.tile(3).terrain = MOUNTAIN;
    // Make them equidistant from the capital so only terrain differs.
    // (tile 1 grass, tile 2 farmland, tile 3 mountain are at distances 1,2,3 on a
    // line, so instead compare each against grass at its own distance via ratio.)
    const sim = new Simulation(world, [accumulationRule]);
    sim.step();
    const k = DEFAULT_CONFIG.distanceK;
    const falloff = (d: number) => 1 / (1 + k * d);
    expect(world.grid.tile(2).points).toBeCloseTo(
      DEFAULT_CONFIG.baseGain * DEFAULT_CONFIG.terrain.farmland * falloff(2),
      10,
    );
    expect(world.grid.tile(3).points).toBeCloseTo(
      DEFAULT_CONFIG.baseGain * DEFAULT_CONFIG.terrain.mountain * falloff(3),
      10,
    );
    // Farmland multiplier > grass > mountain.
    expect(DEFAULT_CONFIG.terrain.farmland).toBeGreaterThan(DEFAULT_CONFIG.terrain.grass);
    expect(DEFAULT_CONFIG.terrain.grass).toBeGreaterThan(DEFAULT_CONFIG.terrain.mountain);
  });
});

describe("settlement feature", () => {
  it("adds its flat bonus to accumulation", () => {
    const withSettlement = bareWorld({ settlementBonus: 2 });
    withSettlement.addCapital(0);
    withSettlement.grid.tile(1).ownerId = 0;
    withSettlement.kingdoms[0]?.ownedTileIds.add(1);
    withSettlement.addSettlement(1);

    const without = bareWorld({ settlementBonus: 2 });
    without.addCapital(0);
    without.grid.tile(1).ownerId = 0;
    without.kingdoms[0]?.ownedTileIds.add(1);

    const a = new Simulation(withSettlement, [accumulationRule]);
    const b = new Simulation(without, [accumulationRule]);
    a.step();
    b.step();

    const diff = withSettlement.grid.tile(1).points - without.grid.tile(1).points;
    expect(diff).toBeCloseTo(2, 10);
  });

  it("refuses a settlement on an unowned tile, and on a tile that already has one", () => {
    const world = bareWorld();
    expect(world.addSettlement(2)).toEqual({ ok: false, reason: "not-owned" });
    world.addCapital(0); // tile 0 now has a capital feature
    expect(world.addSettlement(0)).toEqual({ ok: false, reason: "has-feature" });
  });
});
