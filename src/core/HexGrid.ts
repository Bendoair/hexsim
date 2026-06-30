import type { Tile } from "./Tile";
import { GRASS } from "./terrain/terrains";

/**
 * GlobeTopology — plain, engine-agnostic description of the hex globe.
 *
 * The render layer (GlobeMesh) extracts this from the Babylon Goldberg mesh and
 * hands it to core as plain numbers/arrays. Nothing in core/ knows about Babylon.
 */
export interface GlobeTopology {
  /** Total number of faces (hexagons + 12 pentagons). */
  readonly faceCount: number;
  /** adjacency[faceIndex] = indices of faces sharing an edge with it. */
  readonly adjacency: ReadonlyArray<ReadonlyArray<number>>;
  /** isPentagon[faceIndex] = true for the 12 pentagonal faces. */
  readonly isPentagon: ReadonlyArray<boolean>;
}

/**
 * HexGrid — owns the tile array plus neighbor adjacency and (later) hex-distance.
 *
 * The graph is the single source of truth for adjacency and distance; there are
 * no analytic axial coordinates on a sphere. Hex distance (BFS) arrives in a
 * later step when distance falloff needs it.
 */
export class HexGrid {
  readonly tiles: ReadonlyArray<Tile>;
  private readonly adjacency: ReadonlyArray<ReadonlyArray<number>>;

  constructor(topology: GlobeTopology) {
    this.adjacency = topology.adjacency;
    const tiles: Tile[] = [];
    for (let i = 0; i < topology.faceCount; i++) {
      tiles.push({
        id: i,
        faceIndex: i,
        isPoleCap: topology.isPentagon[i] ?? false,
        ownerId: null,
        points: 0,
        terrain: GRASS,
        feature: null,
      });
    }
    this.tiles = tiles;
  }

  get tileCount(): number {
    return this.tiles.length;
  }

  tile(id: number): Tile {
    const t = this.tiles[id];
    if (t === undefined) {
      throw new RangeError(`No tile with id ${id}`);
    }
    return t;
  }

  /** All topological neighbors of a tile (may include pole caps). */
  neighbors(id: number): ReadonlyArray<number> {
    const n = this.adjacency[id];
    if (n === undefined) {
      throw new RangeError(`No tile with id ${id}`);
    }
    return n;
  }

  /** Neighbors that participate in the simulation (pole caps excluded). */
  activeNeighbors(id: number): number[] {
    return this.neighbors(id).filter((nid) => !this.tile(nid).isPoleCap);
  }

  /** Count of pole-cap (pentagon) tiles. Should always be 12 on a Goldberg. */
  get poleCapCount(): number {
    return this.tiles.reduce((acc, t) => acc + (t.isPoleCap ? 1 : 0), 0);
  }

  /**
   * Hex distance (BFS) from a tile to every other tile, returned as an array
   * indexed by tile id. Unreachable tiles (and the origin if it is a wall) are
   * -1. Sea and pole caps are walls: distance routes around them and never
   * enters them, matching the resolved "sea is a hard wall" decision.
   */
  distancesFrom(originId: number): number[] {
    const n = this.tiles.length;
    const dist = new Array<number>(n).fill(-1);
    const origin = this.tile(originId);
    if (origin.isPoleCap || !origin.terrain.passable) {
      return dist;
    }

    dist[originId] = 0;
    const queue: number[] = [originId];
    let head = 0;
    while (head < queue.length) {
      const current = queue[head];
      head += 1;
      if (current === undefined) {
        break;
      }
      const currentDist = dist[current] ?? 0;
      for (const nb of this.neighbors(current)) {
        const t = this.tile(nb);
        if (t.isPoleCap || !t.terrain.passable) {
          continue;
        }
        if ((dist[nb] ?? -1) === -1) {
          dist[nb] = currentDist + 1;
          queue.push(nb);
        }
      }
    }
    return dist;
  }
}
