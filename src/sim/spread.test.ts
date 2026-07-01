import { describe, expect, it } from "vitest";
import { HexGrid, type GlobeTopology } from "../core/HexGrid";
import { World } from "../core/World";
import { Simulation } from "./Simulation";
import { accumulationRule } from "./rules/accumulation";
import { hostilityRule } from "./rules/hostility";
import { createSpreadRule } from "./rules/spread";
import { DEFAULT_CONFIG, type SimConfig } from "../config/SimConfig";
import { SEA } from "../core/terrain/terrains";

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

function makeSim(world: World): Simulation {
  return new Simulation(world, [accumulationRule, hostilityRule, createSpreadRule()]);
}

describe("spread + hostility", () => {
  it("expands a lone kingdom outward from its capital", () => {
    const world = lineWorld(10);
    world.addCapital(0);
    const sim = makeSim(world);
    for (let t = 0; t < 200; t++) sim.step();
    // The capital's immediate neighbor is conquered well before the far end.
    expect(world.grid.tile(1).ownerId).toBe(0);
    expect(world.kingdoms[0]?.ownedTileIds.size ?? 0).toBeGreaterThan(1);
  });

  it("decelerates: a lone kingdom conquers far less per tick as it grows", () => {
    const world = lineWorld(60);
    world.addCapital(0);
    const sim = makeSim(world);
    const ownedAt = (target: number): number => {
      while (sim.tick < target) sim.step();
      return world.kingdoms[0]?.ownedTileIds.size ?? 0;
    };
    const o500 = ownedAt(500);
    const o1500 = ownedAt(1500);
    const o2000 = ownedAt(2000);
    const growthEarly = o500 - 1;
    const growthLate = o2000 - o1500;
    expect(o2000).toBeLessThan(60); // still expanding, not saturated
    expect(growthEarly).toBeGreaterThan(growthLate);
  });

  it("never spreads across sea (hard wall) and leaves the far shore untouched", () => {
    const world = lineWorld(10);
    world.grid.tile(5).terrain = SEA; // wall between tiles 4 and 6
    world.addCapital(0);
    const sim = makeSim(world);
    for (let t = 0; t < 400; t++) sim.step();
    expect(world.grid.tile(4).ownerId).toBe(0); // reached the near shore
    expect(world.grid.tile(5).ownerId).toBeNull(); // sea is never owned
    expect(world.grid.tile(6).ownerId).toBeNull(); // far shore unreachable
    expect(world.grid.tile(9).ownerId).toBeNull();
  });

  it("two adjacent kingdoms grow then settle on a stable border", () => {
    const world = lineWorld(21, { hostilityCost: 0.4, maxHostility: 1.5, mutationChance: 0 });
    world.addCapital(0);
    world.addCapital(20);
    const sim = makeSim(world);

    const snapshot = (): string => world.grid.tiles.map((t) => t.ownerId ?? "-").join(",");
    while (sim.tick < 1000) sim.step();
    const atThousand = snapshot();
    while (sim.tick < 1500) sim.step();
    const atFifteenHundred = snapshot();

    // Converged: no mutation in this step, so the border is a fixed point.
    expect(atFifteenHundred).toBe(atThousand);
    // Both kingdoms survived and grew; neither swallowed the whole line.
    expect(world.grid.tile(0).ownerId).toBe(0);
    expect(world.grid.tile(20).ownerId).toBe(1);
    const ownedA = world.kingdoms[0]?.ownedTileIds.size ?? 0;
    const ownedB = world.kingdoms[1]?.ownedTileIds.size ?? 0;
    // Both coexist with a border; neither conquered the whole line.
    expect(ownedA).toBeGreaterThan(1);
    expect(ownedB).toBeGreaterThan(1);
    expect(ownedA).toBeLessThan(21);
    expect(ownedB).toBeLessThan(21);
  });

  it("resolves same-target contests in favor of the stronger attacker", () => {
    // Tiles 0 and 2 both border the unowned tile 1; tile 0 is stronger and wins.
    const world = lineWorld(3);
    world.addCapital(0);
    world.addCapital(2);
    world.grid.tile(0).points = DEFAULT_CONFIG.spreadThreshold + 20;
    world.grid.tile(2).points = DEFAULT_CONFIG.spreadThreshold + 1;
    const sim = makeSim(world);
    sim.step();
    expect(world.grid.tile(1).ownerId).toBe(0);
  });
});
