/**
 * SimState — the double-buffered dynamic state, stored as parallel typed arrays
 * indexed by tile id (Struct-of-Arrays for cheap clone/commit).
 *
 * ownerId uses -1 to mean "unowned" (null on the Tile). points is the running
 * accumulator. Topology, terrain and features are NOT here: they live on Tile and
 * are read through the grid.
 */
export interface SimState {
  readonly ownerId: Int32Array;
  readonly points: Float64Array;
}

export const NO_OWNER = -1;

export function createState(tileCount: number): SimState {
  return { ownerId: new Int32Array(tileCount).fill(NO_OWNER), points: new Float64Array(tileCount) };
}

export function cloneState(state: SimState): SimState {
  return { ownerId: state.ownerId.slice(), points: state.points.slice() };
}
