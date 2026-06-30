import { describe, expect, it } from "vitest";
import { HexGrid, type GlobeTopology } from "./HexGrid";
import { World } from "./World";
import { DEFAULT_CONFIG, type SimConfig } from "../config/SimConfig";
import { RIVER, SEA } from "./terrain/terrains";

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

function makeWorld(world: Partial<SimConfig["world"]>): World {
  const config: SimConfig = {
    ...DEFAULT_CONFIG,
    world: { ...DEFAULT_CONFIG.world, farmlandFraction: 0, mountainFraction: 0, ...world },
  };
  return new World(new HexGrid(lineTopology(20)), config);
}

describe("river terrain", () => {
  it("only ever seeds rivers on land tiles adjacent to sea", () => {
    const w = makeWorld({ seaFraction: 0.4, oceanSeeds: 3, riverChance: 1 });
    for (const tile of w.grid.tiles) {
      if (tile.terrain !== RIVER) {
        continue;
      }
      const coastal = w.grid.neighbors(tile.id).some((n) => w.grid.tile(n).terrain === SEA);
      expect(coastal).toBe(true);
      expect(tile.terrain.passable).toBe(true);
    }
  });

  it("places no rivers when riverChance is 0", () => {
    const w = makeWorld({ seaFraction: 0.4, oceanSeeds: 3, riverChance: 0 });
    expect(w.grid.tiles.some((t) => t.terrain === RIVER)).toBe(false);
  });

  it("river carries the configured gain mod", () => {
    expect(RIVER.gainMod(DEFAULT_CONFIG)).toBe(DEFAULT_CONFIG.terrain.river);
  });
});
