import { describe, expect, it } from "vitest";
import { HexGrid, type GlobeTopology } from "./HexGrid";

/**
 * A tiny hand-built topology: a central hex (0) ringed by 6 tiles, one of which
 * (tile 1) is flagged as a pentagon / pole cap. Adjacency here is only meaningful
 * for tile 0; the ring tiles just point back at the center for the test.
 */
function mockTopology(): GlobeTopology {
  const adjacency: number[][] = [
    [1, 2, 3, 4, 5, 6], // center hex
    [0],
    [0],
    [0],
    [0],
    [0],
    [0],
  ];
  const isPentagon = [false, true, false, false, false, false, false];
  return { faceCount: 7, adjacency, isPentagon };
}

describe("HexGrid", () => {
  it("creates one tile per face with identity faceIndex", () => {
    const grid = new HexGrid(mockTopology());
    expect(grid.tileCount).toBe(7);
    expect(grid.tile(0).id).toBe(0);
    expect(grid.tile(0).faceIndex).toBe(0);
    expect(grid.tile(3).faceIndex).toBe(3);
  });

  it("tags pentagons as pole caps", () => {
    const grid = new HexGrid(mockTopology());
    expect(grid.tile(1).isPoleCap).toBe(true);
    expect(grid.tile(0).isPoleCap).toBe(false);
    expect(grid.poleCapCount).toBe(1);
  });

  it("returns topological neighbors", () => {
    const grid = new HexGrid(mockTopology());
    expect([...grid.neighbors(0)]).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("excludes pole caps from active neighbors", () => {
    const grid = new HexGrid(mockTopology());
    expect(grid.activeNeighbors(0)).toEqual([2, 3, 4, 5, 6]);
  });

  it("throws on out-of-range tile access", () => {
    const grid = new HexGrid(mockTopology());
    expect(() => grid.tile(99)).toThrow(RangeError);
  });
});
