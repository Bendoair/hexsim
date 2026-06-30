import { describe, expect, it } from "vitest";
import { HexGrid, type GlobeTopology } from "./HexGrid";
import { World } from "./World";
import { DEFAULT_CONFIG, type SimConfig } from "../config/SimConfig";
import { SEA } from "./terrain/terrains";

/** A simple line of hexes (no pole caps), so most tiles are land-eligible. */
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

function makeWorld(overrides: Partial<SimConfig>): World {
  const config: SimConfig = {
    ...DEFAULT_CONFIG,
    world: { ...DEFAULT_CONFIG.world, seaFraction: 0 },
    ...overrides,
  };
  return new World(new HexGrid(lineTopology(10)), config);
}

describe("World.addCapital", () => {
  it("founds a kingdom on a land tile and marks the capital", () => {
    const world = makeWorld({ maxCapitals: 4 });
    const result = world.addCapital(3);
    expect(result.ok).toBe(true);
    const tile = world.grid.tile(3);
    expect(tile.ownerId).toBe(0);
    expect(tile.feature?.kind).toBe("capital");
    expect(world.kingdoms).toHaveLength(1);
  });

  it("refuses a second capital on an owned tile", () => {
    const world = makeWorld({ maxCapitals: 4 });
    world.addCapital(3);
    const again = world.addCapital(3);
    expect(again).toEqual({ ok: false, reason: "occupied" });
  });

  it("refuses to exceed maxCapitals", () => {
    const world = makeWorld({ maxCapitals: 2 });
    expect(world.addCapital(0).ok).toBe(true);
    expect(world.addCapital(2).ok).toBe(true);
    expect(world.addCapital(4)).toEqual({ ok: false, reason: "cap-reached" });
  });

  it("refuses to place on sea", () => {
    const world = makeWorld({ maxCapitals: 4 });
    world.grid.tile(5).terrain = SEA;
    expect(world.addCapital(5)).toEqual({ ok: false, reason: "not-land" });
  });

  it("assigns distinct colors to successive kingdoms", () => {
    const world = makeWorld({ maxCapitals: 4 });
    world.addCapital(0);
    world.addCapital(5);
    expect(world.kingdoms[0]?.color).not.toEqual(world.kingdoms[1]?.color);
  });
});

describe("HexGrid.distancesFrom", () => {
  it("measures BFS distance along land", () => {
    const world = makeWorld({});
    const dist = world.grid.distancesFrom(0);
    expect(dist[0]).toBe(0);
    expect(dist[1]).toBe(1);
    expect(dist[9]).toBe(9);
  });

  it("treats sea as a wall and leaves the far side unreachable", () => {
    const world = makeWorld({});
    world.grid.tile(5).terrain = SEA; // cut the line in two
    const dist = world.grid.distancesFrom(0);
    expect(dist[4]).toBe(4);
    expect(dist[5]).toBe(-1); // the wall itself
    expect(dist[6]).toBe(-1); // beyond the wall, unreachable
  });
});
