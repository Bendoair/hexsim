import { describe, expect, it } from "vitest";
import { HexGrid, type GlobeTopology } from "./HexGrid";
import { World } from "./World";
import { DEFAULT_CONFIG, type SimConfig } from "../config/SimConfig";
import { SEA } from "./terrain/terrains";

/**
 * Ring-of-rings topology: a connected graph big enough that region-growth can
 * actually reach a sea fraction. Tile 0 is a pentagon (pole cap); the rest are
 * land-eligible hexes wired into a simple connected chain plus a hub.
 */
function ringTopology(n: number): GlobeTopology {
  const adjacency: number[][] = [];
  const isPentagon: boolean[] = [];
  for (let i = 0; i < n; i++) {
    const neighbors: number[] = [];
    if (i > 0) neighbors.push(i - 1);
    if (i < n - 1) neighbors.push(i + 1);
    if (i !== 0) neighbors.push(0); // hub through tile 0... but tile 0 is a pole cap
    adjacency.push(neighbors);
    isPentagon.push(i === 0);
  }
  return { faceCount: n, adjacency, isPentagon };
}

function makeWorld(overrides: Partial<SimConfig["world"]>, seed = 1): World {
  const config: SimConfig = {
    ...DEFAULT_CONFIG,
    seed,
    world: { ...DEFAULT_CONFIG.world, ...overrides },
  };
  return new World(new HexGrid(ringTopology(60)), config);
}

describe("World terrain generation", () => {
  it("never turns pole caps into sea", () => {
    const world = makeWorld({ seaFraction: 0.9, oceanSeeds: 4 });
    expect(world.grid.tile(0).terrain).not.toBe(SEA);
  });

  it("produces all land when seaFraction is 0", () => {
    const world = makeWorld({ seaFraction: 0 });
    expect(world.seaTileCount).toBe(0);
  });

  it("approximates the requested sea fraction", () => {
    const world = makeWorld({ seaFraction: 0.5, oceanSeeds: 4 });
    const landEligible = world.grid.tiles.filter((t) => !t.isPoleCap).length;
    // Region-growth on a connected graph should hit the target closely.
    expect(world.seaTileCount).toBe(Math.floor(landEligible * 0.5));
  });

  it("is deterministic for a given seed", () => {
    const a = makeWorld({ seaFraction: 0.4, oceanSeeds: 3 }, 42);
    const b = makeWorld({ seaFraction: 0.4, oceanSeeds: 3 }, 42);
    const seaA = a.grid.tiles.filter((t) => t.terrain === SEA).map((t) => t.id);
    const seaB = b.grid.tiles.filter((t) => t.terrain === SEA).map((t) => t.id);
    expect(seaA).toEqual(seaB);
  });

  it("varies with seed", () => {
    const a = makeWorld({ seaFraction: 0.4, oceanSeeds: 3 }, 1);
    const b = makeWorld({ seaFraction: 0.4, oceanSeeds: 3 }, 2);
    const seaA = a.grid.tiles.filter((t) => t.terrain === SEA).map((t) => t.id);
    const seaB = b.grid.tiles.filter((t) => t.terrain === SEA).map((t) => t.id);
    expect(seaA).not.toEqual(seaB);
  });
});
