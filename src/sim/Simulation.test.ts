import { describe, expect, it } from "vitest";
import { HexGrid, type GlobeTopology } from "../core/HexGrid";
import { World } from "../core/World";
import { Simulation } from "./Simulation";
import { accumulationRule } from "./rules/accumulation";
import { DEFAULT_CONFIG, type SimConfig } from "../config/SimConfig";

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

/** A kingdom (capital at tile 0) that already owns a contiguous run of tiles. */
function lineWorld(ownedCount: number): World {
  const config: SimConfig = {
    ...DEFAULT_CONFIG,
    world: { ...DEFAULT_CONFIG.world, seaFraction: 0, farmlandFraction: 0, mountainFraction: 0 },
  };
  const world = new World(new HexGrid(lineTopology(10)), config);
  world.addCapital(0);
  for (let i = 1; i < ownedCount; i++) {
    world.grid.tile(i).ownerId = 0;
    world.kingdoms[0]?.ownedTileIds.add(i);
  }
  return world;
}

describe("Simulation accumulation", () => {
  it("gives near-capital tiles more points than far ones after N ticks", () => {
    const world = lineWorld(4);
    const sim = new Simulation(world, [accumulationRule]);
    for (let t = 0; t < 25; t++) {
      sim.step();
    }
    const p = world.grid.tiles.map((tile) => tile.points);
    expect(p[0]).toBeGreaterThan(p[1] ?? 0);
    expect(p[1]).toBeGreaterThan(p[2] ?? 0);
    expect(p[2]).toBeGreaterThan(p[3] ?? 0);
    expect(sim.tick).toBe(25);
  });

  it("leaves unowned tiles at zero points", () => {
    const world = lineWorld(4);
    const sim = new Simulation(world, [accumulationRule]);
    for (let t = 0; t < 25; t++) {
      sim.step();
    }
    expect(world.grid.tile(7).points).toBe(0);
    expect(world.grid.tile(9).points).toBe(0);
  });

  it("applies the documented falloff exactly on the first tick", () => {
    const world = lineWorld(3);
    const sim = new Simulation(world, [accumulationRule]);
    sim.step();
    const k = DEFAULT_CONFIG.distanceK;
    const gain = (dist: number) => DEFAULT_CONFIG.baseGain * 1 * (1 / (1 + k * dist));
    expect(world.grid.tile(0).points).toBeCloseTo(gain(0), 10);
    expect(world.grid.tile(1).points).toBeCloseTo(gain(1), 10);
    expect(world.grid.tile(2).points).toBeCloseTo(gain(2), 10);
  });

  it("is deterministic and resettable", () => {
    const run = (): number[] => {
      const world = lineWorld(4);
      const sim = new Simulation(world, [accumulationRule]);
      for (let t = 0; t < 10; t++) sim.step();
      return world.grid.tiles.map((tile) => tile.points);
    };
    expect(run()).toEqual(run());

    const world = lineWorld(4);
    const sim = new Simulation(world, [accumulationRule]);
    for (let t = 0; t < 10; t++) sim.step();
    sim.reset();
    expect(sim.tick).toBe(0);
    expect(world.grid.tiles.every((tile) => tile.points === 0)).toBe(true);
  });
});
